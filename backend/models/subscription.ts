export interface Subscription {
    subscriptionId: number;
    subscriptionTierId: number;
    stripeSubscriptionId: string;
    superAdminId: number;
    institutionId: number;
    createdDate: string;
    lastUpdated: string;
    deleteDate: string;
    eventsLeft:number;
    startDate?: string;
    endDate?: string;
}

export enum BillingType {
    SINGLE_EVENT = 'single',
    RECURRING = 'recurring',
}

export enum ClientSector {
    EDUCATION = 'education',
    CORPORATION = 'corporation',
}

export enum PlanType {
    LITE = 'lite',
    PLUS = 'plus',
    ENTERPRISE = 'enterprise',
}

export type SubscriptionWithTier = SubscriptionTier & Subscription;

export interface SubscriptionTier {
    subscriptionTiersId?: number;
    billingType: BillingType;
    planType: PlanType;
    clientSector: ClientSector;
    name: string;
    eventsNumberLimit: number;
    numAdminAccounts: number;
    eventUptimeInDays: number;
    presentationsLimit: number;
    liveSessionsLimit: number;
    createDate: string;
    lastUpdated: string;
    deleteDate: string;
}

export interface SubscriptionAddOns {
    subscriptionAddOnsId: number;
    subscriptionId: number,
    createDate: string
    lastUpdated: string
    deleteDate: string
}

export interface SubscriptionQuota {
    events: number;
    adminAccounts: number;
    presentations: number;
    liveSessions: number;
}

export interface SubscriptionAdmin {
    subscriptionAdminId?: number;
    consumerId: number;
    subscriptionId: number;
    isSuperAdmin: boolean;
    createDate?: string;
    lastUpdated?: string;
    deleteDate?: string;
}
