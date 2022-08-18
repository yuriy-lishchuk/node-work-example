export interface Consumer {
    consumerId: number,
    firstName: string,
    lastName: string,
    email: string,
    major: string,
    year: number,
    institutionId: number,
    institutionCode: string,
    profileImgName: string,
    adminEventIds: Array<number>,
    createDate: string,
    lastUpdated: string,
    lastLoginDate: string,
    signedUpDate: string,
    stripeId: string,
}

export function getConsumerNames(consumers: Consumer[]): string[] {
    return consumers.map(consumer => `${consumer.firstName} ${consumer.lastName}`);
}
