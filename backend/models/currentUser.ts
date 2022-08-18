export interface CurrentUser {
    userId: number, 
    firstName: string,
    lastName: string,
    email: string,
    eventIds: number[],
    institutionId: number
}
