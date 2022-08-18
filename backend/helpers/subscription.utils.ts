import { Subscription, SubscriptionWithTier } from '../models';
import { parseDate } from './date.utils';
import { isAfter } from 'date-fns';

/**
 * Check whether a subscription is expired
 * @param {Subscription} subscription
 * @returns {boolean}
 */
export const isSubscriptionExpired = (subscription: Subscription) => {
    const today = new Date();
    return subscription.endDate && isAfter(today, parseDate(subscription.endDate));
};

/**
 *  checks whether the user can purchase a new event package or subscription
 * @param {SubscriptionWithTier[]} subscriptions
 * @returns {boolean}
 */
export const canPurchaseNewSubscriptionOrEvent = (subscriptions: SubscriptionWithTier[]) => {
    return subscriptions.filter(s => s.billingType === 'recurring').length === 0;
};
