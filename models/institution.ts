import { PrivacyLevel } from './privacyLevel';

export interface Institution {
    id: number;
    institutionId: number;
    institutionCode: string;
    code: string;
    fullName: string;
    privacyLevel: PrivacyLevel;
    validEmails: string;
    ssoInstitutionCode: string;
    ssoEnabled: number;
    samlIssuer: string;
    ssoSamlCertFilename: string;
    ssoNameIdFormat: string;
    ssoLoginUrl: string;
    ssoLogoutUrl: string;
    ssoUniversityId: string;
    ssoEmail: string;
    ssoFirstName: string;
    ssoLastName: string;
    validSpecifiedEmails: string[];
    hash: string;
    isHash: boolean;
    customSubmissionInstructions: string;
    allowedSubmissionTypes: string[];
    requiredConsentText: string;
    uniquePresentationIdName?: string;
    presenterTitle?: string;
    archiveDate: Date;
}
