import {
    getSubscriptionBySubscriptionId,
    getSubscriptionQuotaUsageBySubscriptionId,
} from '../queries';
import { getClaimsFromResponse } from './event.middleware';
import { BadRequestException, ForbiddenException, getMaxEventDate, isSubscriptionExpired, NotFoundException, parseDate } from '../helpers';
import {  CreateEventPayload } from '../models';
import { endOfDay, isAfter } from 'date-fns';
import { getEventsRepository } from '../repositories';

export enum SubscriptionLimitType {
    EVENTS = 'events',
    ADMIN_ACCOUNTS = 'adminAccounts',
    LIVE_SESSIONS = 'liveSessions'
}

/**
 * Middleware for checking whether the subscription limits are exceeded
 * @param {SubscriptionLimitType} limit -  type of limit to check
 * @param {number} subscriptionId - The Subscription id
 */
export function subscriptionLimitMiddleware(limit: SubscriptionLimitType, subscriptionId: number) {
    return async (req: any, res: any, next: any) => {
        try {
            const { consumerId } = getClaimsFromResponse(res);
            const subscription = await getSubscriptionBySubscriptionId(subscriptionId);

            if (!subscription) {
                throw new NotFoundException(`Consumer doesn't have a subscription`);
            }

            // check if the subscription  is expired
            if (isSubscriptionExpired(subscription)) {
                throw new ForbiddenException('Subscription Expired.');
            }

            if (await isSubscriptionLimitExceeded(limit, consumerId)) {
                throw new ForbiddenException(`Unauthorized, Exceeded ${limit} limit for this subscription.`);
            }

            next();
        } catch (error) {
            next(error);
        }

    };
}

export const createEventGuard = async (req, res, next) => {

    try {
        const { eventLaunchDate, eventEndDate, eventCode, subscriptionId } = req.body as CreateEventPayload;
        const subscription = await getSubscriptionBySubscriptionId(subscriptionId);

        if (!subscription) {
            throw new NotFoundException(`Subscription Not Found`);
        }

        //@todo temporary guard against creating events with subscription 0. this can be deleted in the future
        if (+subscriptionId === 0){
            throw new ForbiddenException('Cannot create an event with this subscription')
        }

        // check if the subscription  is expired
        if (isSubscriptionExpired(subscription)) {
            throw new ForbiddenException('Subscription Expired. Please contact Symposium support');
        }

        if (await isSubscriptionLimitExceeded(SubscriptionLimitType.EVENTS, subscriptionId)){
            throw new ForbiddenException('Events limit for this subscription is exceeded.');
        }

        // find event by eventCode or event name
        const event = await getEventsRepository().findOne({
            where: [
                { eventCode },
                { name: req.body.eventName },
            ],
        });

        if (event) {
            throw new BadRequestException('Event code or event name is not unique');
        }

        const startDate = parseDate(eventLaunchDate);
        const endDate = parseDate(eventEndDate);
        const maxEventDate = getMaxEventDate(startDate, subscription);

        // check if the start date is after the end date
        if (isAfter(startDate, endDate)) {
            throw new BadRequestException('Event start date is after event end date');
        }

        // check if the event end date exceeds the subscription uptime limit
        if (isAfter(endOfDay(endDate),endOfDay(maxEventDate))) {
            throw new ForbiddenException(`The Event end date exceeds the subscription event uptime`);
        }


        return next();

    } catch (error) {
        next(error);
    }
};

export const isSubscriptionLimitExceeded = async (limit: SubscriptionLimitType, subscriptionId: number) => {

    const { current, subscription } = await getSubscriptionQuotaUsageBySubscriptionId(subscriptionId);

    if (limit === SubscriptionLimitType.EVENTS) {
        if (subscription.eventsNumberLimit === null) {
            return false;
        }
        return current.events >= subscription.eventsNumberLimit;
    }

    if (limit === SubscriptionLimitType.ADMIN_ACCOUNTS) {
        if (subscription.numAdminAccounts === null) {
            return false;
        }
        return current.adminAccounts >= subscription.numAdminAccounts;
    }

    //@todo uncomment if we want to put back live sessions limit
    // if (limit === SubscriptionLimitType.LIVE_SESSIONS) {
    //     if (subscription.liveSessionsLimit === null) {
    //         return false;
    //     }
    //     return current.liveSessions >= subscription.liveSessionsLimit;
    // }

    // todo if new types of limits are added they need to be accounted for in this function
    return false;
};
