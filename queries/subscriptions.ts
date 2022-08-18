import db from '../database';
import { Event, Subscription, SubscriptionQuota, SubscriptionTier, SubscriptionWithTier } from '../models';
import { firstOrDefault } from '../functions';
import {
    getLiveSessionByEventIds,
    getEventsBySubscriptionId,
    getPresentationsByEventIds,
    getSubscriptionAdminAccounts,
} from '../shared-queries';

export const getSubscriptionBySubscriptionId = (subscriptionId: number): Promise<SubscriptionWithTier> => db
    .queryAsync<SubscriptionWithTier[]>(
        `SELECT subscription.subscriptionId,
                       subscription.startDate,
                       subscription.endDate,
                       tiers.billingType,
                       tiers.eventsNumberLimit,
                       tiers.liveSessionsLimit,
                       tiers.eventUptimeInDays,
                       tiers.planType,
                       tiers.numAdminAccounts,
                       tiers.presentationsLimit
                  FROM subscription
                        JOIN subscriptionTiers tiers on subscription.subscriptionTierId = tiers.subscriptionTiersId
                  WHERE subscription.subscriptionId = :subscriptionId
                      AND subscription.deleteDate IS NULL`,
        { subscriptionId },
    ).then(firstOrDefault);

export const getSubscriptionsByConsumerId = (consumerId: number): Promise<SubscriptionWithTier[]> => {
    return db
        .queryAsync<SubscriptionWithTier[]>(
            `SELECT  subscriptionAdmin.subscriptionId,
                       subscription.startDate,
                       subscription.endDate,
                       tiers.billingType,
                       tiers.name,
                       tiers.eventsNumberLimit,
                       tiers.liveSessionsLimit,
                       tiers.eventUptimeInDays,
                       tiers.planType,
                       tiers.numAdminAccounts,
                       tiers.presentationsLimit,
                       i.name as organization,
                       i.institutionId as organizationId
                  FROM subscriptionAdmin
                        JOIN subscription ON subscriptionAdmin.subscriptionId = subscription.subscriptionId
                        JOIN subscriptionTiers tiers on subscription.subscriptionTierId = tiers.subscriptionTiersId
                        JOIN institution i on subscription.institutionId = i.institutionId
                  WHERE subscriptionAdmin.consumerId = :consumerId
                      AND subscription.deleteDate IS NULL
                      AND subscriptionAdmin.deleteDate IS NULL`,
            { consumerId },
        );
};

export const getSubscriptionUsage = async (subscriptionId: number) => {
    const events = await db.queryAsync<SubscriptionWithTier[]>(`SELECT  *  from event where subscriptionId=:subscriptionId and deleteDate is null`, { subscriptionId });
    const subscription = await getSubscriptionBySubscriptionId(subscriptionId);
    const eventsAvailable = subscription.eventsNumberLimit - events.length < 0 ? 0 : subscription.eventsNumberLimit - events.length;
    return {
        events: eventsAvailable,
        liveSessions: 0, // @todo implement in the future
    };
};

export const updateSubscriptionStartAndEndDates = (subscriptionId: number, startDate: string, endDate: string) => {
    return db
        .queryAsync(`UPDATE subscription
                            SET endDate = :endDate, 
                            startDate= :startDate
                            WHERE subscriptionId = :subscriptionId`,
            { subscriptionId, startDate, endDate },
        );
};

export const getSubscriptionQuotaUsageBySubscriptionId = async (subscriptionId: number): Promise<{ subscription: SubscriptionWithTier, current: SubscriptionQuota, left: SubscriptionQuota }> => {

    const subscription: SubscriptionWithTier = await getSubscriptionBySubscriptionId(subscriptionId);
    const events: Event[] = await getEventsBySubscriptionId(subscription.subscriptionId);
    const eventIds: number[] = events.map(e => e.eventId);

    const [admins, presentations, liveSessions] = await Promise.all([
        getSubscriptionAdminAccounts(subscription.subscriptionId),
        getPresentationsByEventIds(eventIds),
        getLiveSessionByEventIds(eventIds),
    ]);

    const current: SubscriptionQuota = {
        events: events.length,
        presentations: presentations.length,
        liveSessions: liveSessions.length,
        adminAccounts: admins.length,
    };
    const left: SubscriptionQuota = calculateRemainingSubscriptionUsage(subscription, current);

    return {
        subscription,
        current,
        left,
    };
};

const calculateRemainingSubscriptionUsage = (subscription: SubscriptionWithTier, current: SubscriptionQuota): SubscriptionQuota => {
    const liveSessions = subscription.liveSessionsLimit - current.liveSessions;
    const adminAccounts = subscription.numAdminAccounts - current.adminAccounts;
    const presentations = subscription.presentationsLimit - current.presentations;
    const events = subscription.eventsNumberLimit - current.events;

    return {
        liveSessions: liveSessions > 0 ? liveSessions : 0,
        adminAccounts: adminAccounts > 0 ? adminAccounts : 0,
        presentations: presentations > 0 ? presentations : 0,
        events: events > 0 ? events : 0,
    };
};

export const createSubscription = async (tier: SubscriptionTier, startDate: string, endDate: string, institutionId: number, stripeSubscriptionId: string): Promise<number> => {
    const subscription = {
        subscriptionTierId: tier.subscriptionTiersId,
        institutionId,
        startDate,
        endDate,
        stripeSubscriptionId,
    };
    const entry: any = await db.queryAsync(`INSERT INTO subscription (subscriptionTierId, institutionId, stripeSubscriptionId, startDate, endDate) VALUES (:subscriptionTierId, :institutionId, :stripeSubscriptionId, :startDate, :endDate)`, subscription);
    return entry.insertId;
};

export const createConsumerAdminSubscription = async (consumerId: number, subscriptionId: number): Promise<number> => {
    const adminSubscription = {
        consumerId,
        subscriptionId,
        isSuperAdmin: true,
    };
    const entry: any = await db.queryAsync(`INSERT INTO subscriptionAdmin (consumerId, subscriptionId, isSuperAdmin) VALUES (:consumerId, :subscriptionId, :isSuperAdmin)`, adminSubscription);
    return entry.insertId;
};

export const getSubscriptionTierByStripeId = (priceId: string): Promise<SubscriptionTier> => {
    return db
        .queryAsync<SubscriptionTier[]>(`SELECT * FROM subscriptionTiers where priceId=:priceId`, { priceId }).then(firstOrDefault);
};

export const getSubscriptionByStripeSubscriptionId = (stripeSubscriptionId: string): Promise<Subscription> => {
    return db.queryAsync<Subscription[]>(`SELECT * FROM subscription WHERE stripeSubscriptionId=:stripeSubscriptionId`, { stripeSubscriptionId }).then(firstOrDefault);
};
