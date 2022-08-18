import * as sharedQueries from '../shared-queries';
import { Claims, Event, Institution, Presentation } from '../models';
import { Response } from 'express';
import { getOneEventByHashCodeOrID } from '../auth-queries';
import { ForbiddenException, isEventExpiredByUptime, isSubscriptionExpired, NotFoundException } from '../helpers';
import { getSubscriptionByEventId } from '../shared-queries';
import { getSubscriptionBySubscriptionId } from '../queries';

const BLOCKED_MESSAGE = `You're not Authorized to view this event/presentation`;
const NOT_FOUND_MESSAGE = 'Event not found';
const UNKNOWN_ERROR = 'unknown error';
const EVENT_NOT_FOUND='Event Not Found'
const EVENT_NOT_ASSOCIATED_TO_SUBSCRIPTION=`This Event isn't associated to a subscription. Please contact ForagerOne support.`
const SUBSCRIPTION_EXPIRED = `This Event's subscription is expired. Please contact ForagerOne support.`
const EVENT_UPTIME_EXPIRED = `This Event is expired according to subscription uptime.`

export const isUserBlockedFromEvent = async (req, res, next) => {
    const claims: Claims = getClaimsFromResponse(res);
    if (!claims) {
        return next();
    }
    try {
        const event: Event = await getOneEventByHashCodeOrID(req.params.eventCode) as Event;
        if (!event || !event.eventId) {
            return res.status(404).json({ message: NOT_FOUND_MESSAGE });
        }
        const isConsumerBlocked = await isConsumerBlockedFromEvent(claims.consumerId, event.eventId);

        if (isConsumerBlocked) {
            return res.status(401).json({ message: BLOCKED_MESSAGE });
        }
    } catch (err) {
        console.log('Error while performing Query.', err);
        return res.status(500).json({ message: UNKNOWN_ERROR });
    }

    return next();
};

export const isUserBlockedFromPresentation = async (req, res, next) => {
    const claims: Claims = getClaimsFromResponse(res);
    if (!claims) {
        return next();
    }
    let presentation: Presentation;

    presentation = await sharedQueries.getSinglePresentationFromId(req.query.presentationIdOrHash) as Presentation;
    if (!presentation) {
        presentation = await sharedQueries.getSinglePresentationFromHash(req.query.presentationIdOrHash) as Presentation;
    }
    try {
        const event: Event = await sharedQueries.getEventByID(presentation.eventId) as Event;

        if (!event || !event.eventId) {
            return res.status(404).json({ message: NOT_FOUND_MESSAGE });
        }
        const isConsumerBlocked = await isConsumerBlockedFromEvent(claims.consumerId, event.eventId);
        if (isConsumerBlocked) {
            return res.status(401).json({ message: BLOCKED_MESSAGE });
        }
    } catch (err) {
        console.log('Error while performing Query.', err);
        return res.status(500).json({ message: UNKNOWN_ERROR });
    }

    return next();
};

export const isUserBlockedFromSession = async (req, res, next) => {
    const { eventCodeOrHash } = req.query;
    const claims: Claims = getClaimsFromResponse(res);
    if (!claims) {
        return next();
    }
    const event = await getOneEventByHashCodeOrID(eventCodeOrHash);
    const isConsumerBlocked = await isConsumerBlockedFromEvent(claims.consumerId, event.eventId);
    if (isConsumerBlocked) {
        return res.status(401).json({ message: BLOCKED_MESSAGE });
    }
    next();
};

export const isConsumerBlockedFromEvent = async (consumerId: number, eventId: number): Promise<boolean> => {
    if (!consumerId || !eventId) {
        return true;
    }
    const blockedEventsIds: number[] = await sharedQueries.getBlockedEventIdsByConsumerId({ consumerId }) || [];
    return blockedEventsIds.includes(eventId);
};

export const getClaimsFromResponse = (res: Response): Claims => res.locals.userClaims;


export const getSingleEventGuard = (extractEventID: Function) => async (req, res, next) => {
    try {
        const eventID = extractEventID(req);
        const event = await getOneEventByHashCodeOrID(eventID);

        // event not found in database or has a deleted date
        if (!event || event.deleteDate) {
            throw new NotFoundException(EVENT_NOT_FOUND);
        }

        const subscription = await getSubscriptionBySubscriptionId(event.subscriptionId);

        if (!subscription){
            throw new ForbiddenException(EVENT_NOT_ASSOCIATED_TO_SUBSCRIPTION);

        }
        if (isSubscriptionExpired(subscription)){
            throw new ForbiddenException(SUBSCRIPTION_EXPIRED)
        }

        if (subscription.eventUptimeInDays !== null && isEventExpiredByUptime(event,subscription)){
            throw new ForbiddenException(EVENT_UPTIME_EXPIRED)
        }

        next()
    } catch (err) {
        next(err);
    }
};
