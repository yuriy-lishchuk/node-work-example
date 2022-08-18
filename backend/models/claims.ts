import {auth} from 'firebase-admin';

export interface Claims extends auth.DecodedIdToken {
    email: string;
    email_verified: boolean;
    consumerId: number;
    eventIds: number[];
    institutionCode: string, // @todo should be deprecated
    eventCode: string,
    institutionId: number
}
