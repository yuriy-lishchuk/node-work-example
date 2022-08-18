import { Institution } from '../models';
import db from '../database';
import { firstOrDefault } from '../functions';

export const getNewInstitutionByName = (name: string): Promise<Institution> => {
    return db.queryAsync<Institution[]>(`SELECT  * from  institution WHERE name=:name`, { name }).then(firstOrDefault);
};

export const getNewInstitutionById = (institutionId: number | string): Promise<Institution> => {
    return db.queryAsync<Institution[]>(`SELECT  * from  institution WHERE institutionId=:institutionId`, { institutionId }).then(firstOrDefault);
};

export const createNewInstitution = (name: string): Promise<any> => {
    return db.queryAsync(`INSERT INTO institution (name) VALUES (:name)`, {
        name,
    });
};
