import { Claims, Event, SubscriptionWithTier } from '../models';
import { addDays, endOfDay, isAfter } from 'date-fns';
import { SubscriptionTiers } from '../entities/SubscriptionTiers'

export const isEventPrivate = (event: Event) => event && event.privacyLevel !== 'public';

export const isUserAuthorizedForEvent = (claims: Partial<Claims>, event: Event): boolean => {
    if (!claims || !claims.eventIds || !event) {
        return false;
    }
    return claims.eventIds.includes(event.eventId);
};

// takes an event start date and add subscription uptime to return the max event date
export const getMaxEventDate = (start: Date, subscription: SubscriptionWithTier | SubscriptionTiers) => {
    return addDays(start, subscription.eventUptimeInDays);
};


// checks whether event is expired by comparing start date + subscription uptime against today's date
export const isEventExpiredByUptime =  (event: Event, subscription: SubscriptionWithTier) => {
    const maxDate = getMaxEventDate(endOfDay(event.startDate), subscription);
    const today = endOfDay(new Date());
    return isAfter(today, maxDate);
};
