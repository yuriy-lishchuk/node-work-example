import db from '../database';

export const getRolloutShowsByVisitorOrConsumerId = async (visitorId: string, consumerId: number): Promise<any> => {
    return db.queryAsync(`SELECT * FROM rolloutFeatureFlags WHERE visitorId = :visitorId ${isNaN(consumerId) ? '' : 'OR consumerId = :consumerId'}`, { visitorId, consumerId });
}

export const addRolloutShowRecord = async (visitorId: string, name: string, consumerId: number) => {
    return db.queryAsync(`INSERT INTO rolloutFeatureFlags (visitorId, name, consumerId) VALUES (:visitorId, :name, :consumerId)`, {
        consumerId,
        name,
        visitorId
    });
}
