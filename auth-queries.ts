import db from './database';
import { firstOrDefault } from './functions';
import { Event } from './models';


export const getOneEventByHashCodeOrID = async function(
    id: string | number,
): Promise<Event> {
    return db.queryAsync<Event[]>(`
        SELECT
            event.*,
            ef.useLatestSubmission,
            ef.accessCustomSubmissionFormEditor,
            ef.editEventLogo,
            ef.editSplashScreen,
            ef.editCoverPhoto,
            ef.editPresentation
        FROM event
        LEFT JOIN eventFeatureFlag ef ON event.eventId = ef.eventId
        WHERE
            event.eventId = :id
            OR eventCode = :id
            OR hash = :id
        LIMIT 1    
        `,
        { id },
    ).then(firstOrDefault);
};
