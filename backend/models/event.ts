import { PrivacyLevel } from './privacyLevel';
import { Institution } from './institution';
import { PresentationFormConfig } from './presentationFormConfig';
import { EventFeatureFlags } from './eventFeatureFlags';

export interface Event {
    eventId: number;
    name: string;
    eventCode: string;
    validEmails: string;
    privacyLevel: PrivacyLevel;
    validSpecifiedEmails?: string[];
    hash: string;
    isHash: boolean;
    logoImgName: string;
    coverImgName: string;
    allowAllDomains: boolean;
    presentationFormConfig: PresentationFormConfig;
    institutionId: number;
    institutionFullName: string;
    institution?: Institution;
    subscriptionId: number;
    organizerName: string;
    preApprovedEmails: string[];
    fee: number;
    isActivated: number;
    startDate: Date;
    endDate: Date;
    eventFeatureFlags: EventFeatureFlags;
    createDate: Date;
    lastUpdated: Date;
    archiveDate: Date;
    deleteDate: Date;
}

export interface EventEmail {
    eventEmailId: number;
    email: string;
    eventId: number
}

export interface ConsumerEvent {
    consumerId: number;
    eventId: number;
    isAdmin: boolean;
    createDate: string;
    lastUpdated: string
}


export interface CreateEventPayload {
    eventCode: string,
    eventName: string,
    subscriptionId: number,
    eventLaunchDate: string
    eventEndDate: string
}
