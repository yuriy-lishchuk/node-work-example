import db from './database';
import { firstOrDefault, rowsToArray } from './functions';
import {
    LiveSession,
    Consumer,
    Event,
    EventEmail,    
    Institution,
    Presentation,
    Subscription,
    SubscriptionAdmin,
    SubscriptionWithTier
} from './models';

export const saveComments = async function (queryObj: any): Promise<any> {
    return db.queryAsync(
        `INSERT INTO contactUsMessage
        SET name = :name,
        email = :email,
        organizationName = :organizationName,
        pricingPlan = :pricingPlan,
        comments = :comments`,
        queryObj
    ); 
};

export const getIsValidPresentationHash = async function (
    presentationHash: number
): Promise<number> {
    return db
        .queryAsync<number[]>(
            `
    SELECT p.presentationId
    FROM presentation p
    WHERE 
      p.hash = :presentationHash
      AND p.deleteDate IS NULL
    `,
            { presentationHash }
        )
        .then(firstOrDefault);
};

export const getPresentationIdByHashAndEventId = async function (
    presentationHash: string,
    eventId: number
): Promise<any> {
    return db
        .queryAsync<number[]>(
            `
    SELECT p.presentationId
    FROM presentation p
    WHERE p.hash = :presentationHash AND p.eventId = :eventId AND p.deleteDate IS NULL
    `,
            { presentationHash: presentationHash, eventId: eventId }
        )
        .then(firstOrDefault);
};

export const insertPresentation = async function (
    title: string, abstract: string, subjects: string,
    debugPresentationType: string,
    voiceoverId: string, originalVoiceoverLink: string,
    presentationVideoId: string, originalPresentationVideoLink: string,
    hash: string, posterId: string, slidesId: string,
    eventId: number, institutionId: number,
    submissionFormExtraValues: any, //JSON data type in DB
    presenters: Array<any>
) {
    let addlPresentersQuery = presenters.slice(1).map((presenter, idx) => {
        return `,
        presenter${idx+2}FirstName = :presenter${idx+2}FirstName,
        presenter${idx+2}LastName = :presenter${idx+2}LastName,
        presenter${idx+2}Email = :presenter${idx+2}Email,
        presenter${idx+2}Year = :presenter${idx+2}Year,
        presenter${idx+2}Major = :presenter${idx+2}Major`;
    }).join('');

    let addlPresentersObj = {};
    for (let i = 1; i < presenters.length; i++) {
        const presenter = presenters[i];
        addlPresentersObj[`presenter${i+1}FirstName`] = presenter.firstName;
        addlPresentersObj[`presenter${i+1}LastName`] = presenter.lastName;
        addlPresentersObj[`presenter${i+1}Email`] = presenter.email;
        addlPresentersObj[`presenter${i+1}Year`] = presenter.level ? presenter.level : 'NULL';
        addlPresentersObj[`presenter${i+1}Major`] = presenter.major ? presenter.major : 'NULL';
    }

    let query = `INSERT INTO presentation SET title = :title,
        abstract = :abstract,
        subjects = :subjects,
        debugPresentationType = :debugPresentationType,
        ${voiceoverId ? 'voiceoverId = :voiceoverId,' : ''}
        ${originalVoiceoverLink ? 'originalVoiceoverLink = :originalVoiceoverLink,' : ''}
        ${presentationVideoId ? 'presentationVideoId = :presentationVideoId,' : ''}
        ${originalPresentationVideoLink ? 'originalPresentationVideoLink = :originalPresentationVideoLink,' : ''}
        ${posterId ? 'posterId = :posterId,' : ''}
        ${slidesId ? 'slidesId = :slidesId,' : ''}
        hash = :hash,
        institutionId = :institutionId,
        eventId = :eventId,
        submissionFormExtraValues = :submissionFormExtraValues,
        presenterFirstName = :firstName,
        presenterLastName = :lastName,
        presenterEmail = :email,
        presenterYear = :level,
        presenterMajor = :major` + (addlPresentersQuery ? addlPresentersQuery : '');

    return db.queryAsync(query, {
        title: title,
        abstract: abstract,
        subjects: subjects,
        debugPresentationType: debugPresentationType,
        voiceoverId: voiceoverId,
        originalVoiceoverLink: originalVoiceoverLink,
        presentationVideoId: presentationVideoId,
        originalPresentationVideoLink: originalPresentationVideoLink,
        posterId: posterId,
        slidesId: slidesId,
        hash: hash,
        institutionId: institutionId,
        eventId: eventId,
        firstName: presenters[0].firstName,
        lastName: presenters[0].lastName,
        email: presenters[0].email,
        level: presenters[0].level,
        major: presenters[0].major,
        submissionFormExtraValues: JSON.stringify(submissionFormExtraValues),
        ...addlPresentersObj,
    });
};

export const updatePresentation = async function (
    presentationId: number, title: string, abstract: string, subjects: string,
    submissionFormExtraValues: any, //JSON data type in DB
    presenters: Array<any>
) {
    // Hard setting that we'll be providing 8 values
    let addlPresentersQuery = [0, 1, 2, 3, 4, 5, 6].map((_empty, idx) => {
        return `,
        presenter${idx+2}FirstName = :presenter${idx+2}FirstName,
        presenter${idx+2}LastName = :presenter${idx+2}LastName,
        presenter${idx+2}Email = :presenter${idx+2}Email,
        presenter${idx+2}Year = :presenter${idx+2}Year,
        presenter${idx+2}Major = :presenter${idx+2}Major`;
    }).join('');

    // fill out all 8 presenters even if blank
    if (presenters.length < 8) {
        for (let i = presenters.length; i < 8; i++) {
            presenters.push({
                firstName: null,
                lastName: null,
                email: null,
                level: null,
                major: null
            })
        }
    }

    let addlPresentersObj = {};
    for (let i = 1; i < presenters.length; i++) {
        const presenter = presenters[i];
        addlPresentersObj[`presenter${i+1}FirstName`] = presenter.firstName;
        addlPresentersObj[`presenter${i+1}LastName`] = presenter.lastName;
        addlPresentersObj[`presenter${i+1}Email`] = presenter.email;
        addlPresentersObj[`presenter${i+1}Year`] = presenter.level ? presenter.level : 'NULL';
        addlPresentersObj[`presenter${i+1}Major`] = presenter.major ? presenter.major : 'NULL';
    }

    let query = `UPDATE presentation SET title = :title,
        abstract = :abstract,
        subjects = :subjects,
        submissionFormExtraValues = :submissionFormExtraValues,
        presenterFirstName = :firstName,
        presenterLastName = :lastName,
        presenterEmail = :email,
        presenterYear = :level,
        presenterMajor = :major` + (addlPresentersQuery ? addlPresentersQuery : '') +
        ` WHERE presentationId = :presentationId`;

    return db.queryAsync(query, {
        presentationId: presentationId,
        title: title,
        abstract: abstract,
        subjects: subjects,
        firstName: presenters[0].firstName,
        lastName: presenters[0].lastName,
        email: presenters[0].email,
        level: presenters[0].level,
        major: presenters[0].major,
        submissionFormExtraValues: JSON.stringify(submissionFormExtraValues),
        ...addlPresentersObj,
    });
};

export const deletePresentation = async function (presentationId: number): Promise<any> {
    return db.queryAsync(
        `UPDATE presentation
      SET deleteDate = current_timestamp()
      WHERE presentationId = :presentationId AND deleteDate IS NULL`,
        {
            presentationId: presentationId,
        }
    );
};

//used only for rollback when upload fails for create presentation (TODO: transaction rollback)
export const hardDeletePresentation = async function (presentationId: number): Promise<any> {
    return db.queryAsync(
        `DELETE FROM presentation WHERE presentationId = :presentationId`,
        {
            presentationId: presentationId,
        }
    );
};

export const getEventFieldTagId = async function (
    eventId: string, tagName: string, tagFieldLabel: string
) {
    return db
        .queryAsync(
            `
      SELECT
       tagId
      FROM tag
      WHERE eventId = :eventId AND name = :name AND type = :type`,
            {
                eventId: eventId,
                name: tagName,
                type: tagFieldLabel
            }
        )
        .then(firstOrDefault);
};

export const getTagIDsFromNames = async function (tagNames: Array<string>) {
    return db.queryAsync(
        `
      SELECT
       tagId
      FROM tag
      WHERE name IN (:tagNames)`,
        { tagNames: tagNames }
    );
};

export const getExistingTags = async function (eventId: number): Promise<Array<any>> {
    return db.queryAsync(`
        SELECT tagId, name, type, eventId, createDate, lastUpdated
        FROM tag
        WHERE tag.eventId = :eventId`,
        { eventId: eventId }
    );
};

export const saveTag = async function (name: string, type: string, eventId: number) {
    return db.queryAsync(`
        INSERT INTO tag SET name = :name,
        type = :type,
        eventId = :eventId`,
        {
            name: name,
            type: type,
            eventId: eventId
        }
    );
};

export const getPresentationFieldTags = async function (presentationId: number) {
    return db.queryAsync(
        `
      SELECT tag.tagId, name, type
      FROM tag
        JOIN presentationTag ON tag.tagId = presentationTag.tagId
      WHERE presentationId = :presentationId`,
        { presentationId: presentationId }
    );
};

export const savePresentationTag = async function (queryObj) {
    return db.queryAsync(
        `INSERT INTO presentationTag
      SET presentationId = :presentationId,
      tagId = :tagId`,
        {
            presentationId: queryObj.presentationId,
            tagId: queryObj.tagId,
        }
    );
};


export const savePresentationTagByName = async function (
    presentationId: number,
    tagName: string,
    eventId: number,
) {
    return db.queryAsync(
        `
      INSERT INTO presentationTag SET 
      presentationId = :presentationId,
      tagId = (SELECT tagId FROM tag WHERE tag.name = :tagName AND tag.eventId = :eventId)
      `,
        {
            presentationId: presentationId,
            tagName: tagName,
            eventId: eventId,
        }
    );
};

export const deletePresentationTagsById = async function (
    presentationId: number,
    tagIds: Array<number>
) {
    return db.queryAsync(
        `DELETE FROM presentationTag
      WHERE presentationId = :presentationId AND tagId IN (:tagIds)`,
        {
            presentationId: presentationId,
            tagIds: tagIds,
        }
    );
};

export const getLiveSessionId = async function (
    eventId: number
): Promise<LiveSession[]> {
    return db.queryAsync<any[]>(
        `
    SELECT  
      liveSessionId,
      liveSessionOrder,
      b.name,
      description,
      sessionStartDateTime AS sessionStartTime,
      sessionEndDateTime AS sessionEndTime,
      sessionLinkType,
      zoomUrl,
      b.institutionId
    FROM liveSession b
    WHERE eventId=:eventId AND b.deleteDate IS NULL
    `,
        { eventId }
    );
};

export const getLiveSessionSessionsHash = async function (hash: string): Promise<any[]> {
    return db.queryAsync<any[]>(
        `
    SELECT  
      liveSessionId,
      liveSessionOrder,
      b.name,
      description,
      sessionStartDateTime AS sessionStartTime,
      sessionEndDateTime AS sessionEndTime,
      sessionLinkType,
      zoomUrl,
      b.institutionId
    FROM liveSession b
    JOIN deprecatedEvent de ON b.eventId = de.institutionId
    WHERE hash=:hash AND b.deleteDate IS NULL
    `,
        { hash }
    );
};

export const getSinglePresentationFromId = async function (
    presentationId: number
): Promise<Presentation> {
    return db
        .queryAsync<any[]>(
            `
    SELECT  
      presentationId,
      institutionSetUniquePresentationId,
      hash,
      createDate,
      title,
      abstract,
      voiceoverId,
      originalVoiceoverLink,
      presentationVideoId,
      originalPresentationVideoLink,
      posterId,
      slidesId,
      debugPresentationType as presentationType,
      posterType,
      primaryPresenterBiography,

      presenterFirstName,
      presenterLastName,
      presenterEmail,
      presenterYear,
      presenterMajor,

      presenter2FirstName, 
      presenter2LastName,
      presenter2Email,
      presenter2Major,
      presenter2Year,

      presenter3FirstName,
      presenter3LastName,
      presenter3Email,
      presenter3Major,
      presenter3Year,

      presenter4FirstName,
      presenter4LastName,
      presenter4Email,
      presenter4Major,
      presenter4Year,

      presenter5FirstName,
      presenter5LastName,
      presenter5Email,
      presenter5Major,
      presenter5Year,

      presenter6FirstName,
      presenter6LastName,
      presenter6Email,
      presenter6Major,
      presenter6Year,

      presenter7FirstName,
      presenter7LastName,
      presenter7Email,
      presenter7Major,
      presenter7Year,

      presenter8FirstName,
      presenter8LastName,
      presenter8Email,
      presenter8Major,
      presenter8Year,

      submissionFormExtraValues,

      customFields,
      institutionId,
      eventId
    FROM presentation p
    WHERE 
      presentationId = :presentationId
      AND CHAR_LENGTH(presentationId) = CHAR_LENGTH(:presentationId)
      AND p.deleteDate IS NULL
    `,
            { presentationId }
        )
        .then(firstOrDefault);
};

export const hasTags = async function (queryObj) {
    return db
        .queryAsync(
            `
      SELECT
       tagId
      FROM tag
      WHERE eventId = :eventId`,
            queryObj
        )
        .then(firstOrDefault);
};

export const getTag = async function (queryObj) {
    return db
        .queryAsync(
            `
      SELECT
       tagId
      FROM tag
      WHERE name = :name`,
            queryObj
        )
        .then(firstOrDefault);
};

export const getTagForEvent = async function (queryObj) {
    return db
        .queryAsync(
            `
      SELECT
       tagId
      FROM tag
      WHERE name = :name
      AND eventId = :eventId`,
            queryObj
        )
        .then(firstOrDefault);
};


export const savePresentation = async function (queryObj) {
    // TODO: Make queryObject work (for some reason couldn't get this to work so had to remap it below)
    return db.queryAsync(
        `INSERT INTO presentation
      SET institutionSetUniquePresentationId = :institutionSetUniquePresentationId,
      title = :title,
      abstract = :abstract,
      voiceoverId = :voiceoverId,
      originalVoiceoverLink = :originalVoiceoverLink,
      posterId = :posterId,
      originalPosterLink = :originalPosterLink,
      slidesId = :slidesId,
      presentationVideoId = :presentationVideoId,
      originalPresentationVideoLink = :originalPresentationVideoLink,
      institutionId = :institutionId,
      eventId = :institutionId,
      posterType = :presentationType,
      metadataInstitutionName = :metadataInstitutionName,
      internalSymposiumTitle = :internalSymposiumTitle,
      customPresentationType = :customPresentationType,
      customFields = :customFields,
      voiceoverType = 'youtube',
      hash = :hash,
      presenterFirstName = :firstName,
      presenterLastName = :lastName,
      presenterEmail = :email,
      presenterYear = :year,
      presenterMajor = :major,
      primaryPresenterBiography = :primaryPresenterBiography,
      debugPresentationType = :debugPresentationType,
      presenter2FirstName = :presenter2FirstName,
      presenter2LastName = :presenter2LastName,
      presenter2Email = :presenter2Email,
      presenter2Year = :presenter2Year,
      presenter2Major = :presenter2Major,
      presenter3FirstName = :presenter3FirstName,
      presenter3LastName = :presenter3LastName,
      presenter3Email = :presenter3Email,
      presenter3Year = :presenter3Year,
      presenter3Major = :presenter3Major,
      presenter4FirstName = :presenter4FirstName,
      presenter4LastName = :presenter4LastName,
      presenter4Email = :presenter4Email,
      presenter4Year = :presenter4Year,
      presenter4Major = :presenter4Major,
      presenter5FirstName = :presenter5FirstName,
      presenter5LastName = :presenter5LastName,
      presenter5Email = :presenter5Email,
      presenter5Year = :presenter5Year,
      presenter5Major = :presenter5Major,
      presenter6FirstName = :presenter6FirstName,
      presenter6LastName = :presenter6LastName,
      presenter6Email = :presenter6Email,
      presenter6Year = :presenter6Year,
      presenter6Major = :presenter6Major,
      presenter7FirstName = :presenter7FirstName,
      presenter7LastName = :presenter7LastName,
      presenter7Email = :presenter7Email,
      presenter7Year = :presenter7Year,
      presenter7Major = :presenter7Major,
      presenter8FirstName = :presenter8FirstName,
      presenter8LastName = :presenter8LastName,
      presenter8Email = :presenter8Email,
      presenter8Year = :presenter8Year,
      presenter8Major = :presenter8Major,
      supervisorConsentText = :supervisorConsentText,
      subjects = :subjects,
      submissionFormExtraValues = :submissionFormExtraValues`,
        {
            institutionId: queryObj.institution,
            institutionSetUniquePresentationId:
                queryObj.institutionSetUniquePresentationId,
            title: queryObj.presentationTitle,
            abstract: queryObj.presentationDescription,
            hash: queryObj.hash,
            metadataInstitutionName: queryObj.presentationMetadataInstitutionName,
            internalSymposiumTitle: queryObj.oralSymposiumTitle,
            customPresentationType: queryObj.customPresentationType,
            voiceoverId: queryObj.voiceOverId,
            originalVoiceoverLink: queryObj.originalVoiceOverLink,
            customFields: queryObj.customFields,
            posterId: queryObj.posterId,
            originalPosterLink: queryObj.originalPosterLink,
            slidesId: queryObj.slidesId,
            presentationVideoId: queryObj.presentationVideoId,
            originalPresentationVideoLink: queryObj.originalPresentationVideoLink,
            firstName: queryObj.firstName,
            lastName: queryObj.lastName,
            email: queryObj.email,
            year: queryObj.year,
            major: queryObj.majorOrDepartment,
            primaryPresenterBiography: queryObj.primaryPresenterBiography,
            debugPresentationType: queryObj.debugPresentationType,
            presenter2FirstName: queryObj.presenter2FirstName,
            presenter2LastName: queryObj.presenter2LastName,
            presenter2Email: queryObj.presenter2Email,
            presenter2Year: queryObj.presenter2Year,
            presenter2Major: queryObj.presenter2Major,
            presenter3FirstName: queryObj.presenter3FirstName,
            presenter3LastName: queryObj.presenter3LastName,
            presenter3Email: queryObj.presenter3Email,
            presenter3Year: queryObj.presenter3Year,
            presenter3Major: queryObj.presenter3Major,
            presenter4FirstName: queryObj.presenter4FirstName,
            presenter4LastName: queryObj.presenter4LastName,
            presenter4Email: queryObj.presenter4Email,
            presenter4Year: queryObj.presenter4Year,
            presenter4Major: queryObj.presenter4Major,
            presenter5FirstName: queryObj.presenter5FirstName,
            presenter5LastName: queryObj.presenter5LastName,
            presenter5Email: queryObj.presenter5Email,
            presenter5Year: queryObj.presenter5Year,
            presenter5Major: queryObj.presenter5Major,
            presenter6FirstName: queryObj.presenter6FirstName,
            presenter6LastName: queryObj.presenter6LastName,
            presenter6Email: queryObj.presenter6Email,
            presenter6Year: queryObj.presenter6Year,
            presenter6Major: queryObj.presenter6Major,
            presenter7FirstName: queryObj.presenter7FirstName,
            presenter7LastName: queryObj.presenter7LastName,
            presenter7Email: queryObj.presenter7Email,
            presenter7Year: queryObj.presenter7Year,
            presenter7Major: queryObj.presenter7Major,
            presenter8FirstName: queryObj.presenter8FirstName,
            presenter8LastName: queryObj.presenter8LastName,
            presenter8Email: queryObj.presenter8Email,
            presenter8Year: queryObj.presenter8Year,
            presenter8Major: queryObj.presenter8Major,
            presentationType: queryObj.presentationType,
            supervisorConsentText: queryObj.supervisorConsentText,
            subjects : JSON.stringify(queryObj.presentationSubject),
            submissionFormExtraValues: JSON.stringify(queryObj.submissionFormExtraValues),
        }
    );
};

export const getSinglePresentationWithEmailFromId = async function (
    presentationId: number
): Promise<Presentation> {
    return db
        .queryAsync<Presentation[]>(
            `
    SELECT  
      presentationId,
      institutionSetUniquePresentationId,
      hash,
      createDate,
      title,
      abstract,
      voiceoverId,
      originalVoiceoverLink,
      presentationVideoId,
      originalPresentationVideoLink,
      posterId,
      slidesId,
      debugPresentationType as presentationType,
      posterType,

      presenterFirstName,
      presenterLastName,
      presenterEmail,
      presenterYear,
      presenterMajor,

      presenter2FirstName, 
      presenter2LastName,
      presenter2Email,
      presenter2Major,
      presenter2Year,

      presenter3FirstName,
      presenter3LastName,
      presenter3Email,
      presenter3Major,
      presenter3Year,

      presenter4FirstName,
      presenter4LastName,
      presenter4Email,
      presenter4Major,
      presenter4Year,

      presenter5FirstName,
      presenter5LastName,
      presenter5Email,
      presenter5Major,
      presenter5Year,

      presenter6FirstName,
      presenter6LastName,
      presenter6Email,
      presenter6Major,
      presenter6Year,

      presenter7FirstName,
      presenter7LastName,
      presenter7Email,
      presenter7Major,
      presenter7Year,

      presenter8FirstName,
      presenter8LastName,
      presenter8Email,
      presenter8Major,
      presenter8Year,

      customFields,
      institutionId,
      eventId
    FROM presentation p
    WHERE presentationId = :presentationId
    `,
            { presentationId }
        )
        .then(firstOrDefault);
};

export const getSinglePresentationFromHash = async function (
    presentationHash: number
): Promise<any> {
    return db
        .queryAsync<any[]>(
            `
    SELECT  
      presentationId,
      institutionSetUniquePresentationId,
      title,
      abstract,
      voiceoverId,
      posterId,
      posterType,
      voiceoverType,
      primaryPresenterBiography,
      presentationVideoId,
      debugPresentationType as presentationType,

      presenterFirstName,
      presenterLastName,
      presenterMajor,

      presenter2FirstName, 
      presenter2LastName,
      presenter2Major,

      presenter3FirstName,
      presenter3LastName,
      presenter3Major,

      presenter4FirstName,
      presenter4LastName,
      presenter4Major,

      presenter5FirstName,
      presenter5LastName,
      presenter5Major,

      presenter6FirstName,
      presenter6LastName,
      presenter6Major,

      presenter7FirstName,
      presenter7LastName,
      presenter7Major,

      presenter8FirstName,
      presenter8LastName,
      presenter8Major,

      submissionFormExtraValues,

      customFields,
      institutionId,
      eventId
    FROM presentation p
    WHERE 
      hash = :presentationHash
      AND CHAR_LENGTH(hash) = CHAR_LENGTH(:presentationHash)
      AND p.deleteDate IS NULL
    `,
            { presentationHash }
        )
        .then(firstOrDefault);
};

export const getConsumerByConsumerId = function (queryObj : {consumerId:number}):Promise<Consumer> {
    return db
        .queryAsync<Consumer[]>(
            `SELECT 
            consumer.*,
            consumerEmail.email AS email  
      FROM consumer
      JOIN consumerEmail ON consumer.primaryEmailId = consumerEmail.consumerEmailId
      WHERE consumer.consumerId = :consumerId`,
            queryObj
        )
        .then(firstOrDefault);
};

export const getConsumerByStripeId = function (stripeId :string):Promise<Consumer> {
    return db
        .queryAsync<Consumer[]>( `SELECT * FROM consumer WHERE stripeId = :stripeId`, { stripeId })
        .then(firstOrDefault);
};

export const getEventByCode = function (eventCode: string | number):Promise<Event | Event[]> {
    return db
        .queryAsync<Event[]>(`
            SELECT 
            event.eventId,
            event.subscriptionId,
            event.name,
            eventCode,
            subscriptionId,
            event.validEmails,
            event.allowAllDomains,
            event.privacyLevel,
            event.hash,
            logoImgName,
            coverImgName,
            thumbnailImgName,
            splashCoverImgName,
            splashVideoLink,
            splashContent,
            de.institutionId,
            de.name as institutionFullName,
            presentationFormConfig,
            isActivated,
            startDate,
            endDate,
            event.createDate,
            event.archiveDate,
            ef.useLatestSubmission,
            ef.accessCustomSubmissionFormEditor,
            ef.editEventLogo,
            ef.editSplashScreen,
            ef.editCoverPhoto,
            ef.editPresentation
            FROM event JOIN deprecatedEvent as de ON event.institutionId = de.institutionId
            LEFT JOIN eventFeatureFlag ef ON event.eventId = ef.eventId
            WHERE eventCode = :eventCode AND event.deleteDate IS NULL`,
            { eventCode }
        )
        .then(firstOrDefault);
};

export const getEventByID = function (eventId: number)  {
    return db
        .queryAsync(`
            SELECT 
            event.eventId,
            event.name,
            eventCode,
            subscriptionId,
            event.validEmails,
            event.privacyLevel,
            event.hash,
            logoImgName,
            coverImgName,
            thumbnailImgName,
            splashCoverImgName,
            splashVideoLink,
            splashContent,
            allowAllDomains,
            de.institutionId,
            de.name as institutionFullName,
            presentationFormConfig,
            isActivated,
            startDate,
            endDate,
            event.createDate,
            event.archiveDate,
            ef.useLatestSubmission,
            ef.accessCustomSubmissionFormEditor,
            ef.editEventLogo,
            ef.editSplashScreen,
            ef.editCoverPhoto,
            ef.editPresentation
            FROM event JOIN deprecatedEvent as de ON event.institutionId = de.institutionId
            LEFT JOIN eventFeatureFlag ef ON event.eventId = ef.eventId
            WHERE event.eventId = :eventId AND event.deleteDate IS NULL`,
            { eventId }
        )
        .then(firstOrDefault);
};

export const getGlobalEventCount = function () {
    return db
        .queryAsync(`SELECT COUNT(*) as total FROM event WHERE eventCode NOT LIKE '%demo%' AND deleteDate IS NULL`)
        .then((rows: any[]) => rows[0].total);
};

export const getEventIdsByConsumerId = function (queryObj) {
    return db
        .queryAsync(
            `SELECT eventId
    FROM consumerEvent
    WHERE consumerId = :consumerId`,
            queryObj
        )
        .then((rows: any[]) => {
            if (rows && rows.length === 0) {
                return [];
            } else {
                return rowsToArray(rows, 'eventId');
            }
        });
};

export const getEventsBySubscriptionId = function (subscriptionId:number):Promise<Event[]> {
    return db
        .queryAsync<Event[]>(
            ` SELECT *
                    FROM event
                        WHERE subscriptionId = :subscriptionId
                    AND (deleteDate IS NULL OR (deleteDate IS NOT NULL AND deleteDate > startDate))`,
            { subscriptionId },
        )

};

export const getSubscriptionByEventId = function (eventId:number):Promise<SubscriptionWithTier> {
    return db
        .queryAsync<SubscriptionWithTier[]>(`
                SELECT e.eventId,
                       s.subscriptionId,
                       tiers.numAdminAccounts,
                       tiers.eventUptimeInDays,
                       tiers.eventsNumberLimit,
                       tiers.liveSessionsLimit,
                       tiers.presentationsLimit
                FROM event e
                         join subscription s on e.subscriptionId = s.subscriptionId
                         join subscriptionTiers tiers on s.subscriptionTierId = tiers.subscriptionTiersId
                WHERE eventId = :eventId AND e.deleteDate is NULL`,
            { eventId },
        ).then(firstOrDefault)

};

export const getSubscriptionAdminAccounts = function (subscriptionId:number):Promise<SubscriptionAdmin[]> {
    return db
        .queryAsync<SubscriptionAdmin[]>(
            `SELECT * from subscriptionAdmin where subscriptionId=:subscriptionId AND deleteDate IS NULL`,
            { subscriptionId },
        )

};

export const getPresentationsByEventIds = async  (eventIds:number[]):Promise<Presentation[]>=> {
    if (eventIds.length===0) {
        return [];
    }
    return db
        .queryAsync<Presentation[]>(
            `select * from presentation where eventId in (:eventIds) AND deleteDate is NULL`,
            { eventIds },
        )

}

export const getLiveSessionByEventIds = async (eventIds:number[]):Promise<LiveSession[]> => {
    if (eventIds.length ===0){
        return []
    }
    return db
        .queryAsync<LiveSession[]>(
            `select * from liveSession  where eventId in (:eventIds) AND deleteDate is NULL`,
            { eventIds },
        )

};

export const updateLiveSessionsOrderByEventId = async (
    eventId: number,
    liveSessionIds: number[],
): Promise<LiveSession[]> => {
    return Promise.all(liveSessionIds.map((id, index) => updateLiveSessionOrder(eventId, id, index)));
};

const updateLiveSessionOrder = async (eventId: number, liveSessionId: number, order: number): Promise<LiveSession> => {
    return db
        .queryAsync<LiveSession>(
            `UPDATE liveSession SET liveSessionOrder = :order WHERE eventId = :eventId AND liveSessionId = :liveSessionId`,
            { eventId, liveSessionId, order },
        );
};

export const getAdminEventIdsByConsumerId = function (queryObj):Promise<number[]>  {
    return db
        .queryAsync(
            `SELECT eventId
    FROM consumerEvent
    WHERE consumerId = :consumerId AND isAdmin = 1`,
            queryObj
        )
        .then((rows: any[]) => rowsToArray(rows, 'eventId') || []);
};

export const getBlockedEventIdsByConsumerId = function (queryObj : {consumerId:number}):Promise<number[]> {
    return db
        .queryAsync(
            `SELECT eventId
    FROM blockedConsumerEvent
    WHERE consumerId = :consumerId`,
            queryObj
        )
        .then((rows: any[]) => rowsToArray(rows, 'eventId') || []);
};

export const allowAllDomainsForEvent=(eventId:number,allowAllDomains:boolean)=>{
    const query = `UPDATE event 
                   SET allowAllDomains=:allowAllDomains
                   where eventId=:eventId`
    return db.queryAsync(query, {eventId,allowAllDomains});
}

export const updateEvent = function (queryObj) {
    let query = `UPDATE event SET `;

    Object.keys(queryObj).forEach((key) => {
        switch (key) {
            case 'privacyLevel':
                query += `privacyLevel = :privacyLevel`;
                break;
            case 'validEmails':
                query += `validEmails = :validEmails`;
                break;
            case 'startDate':
                query += `startDate = :startDate`;
                break;
            case 'endDate':
                query += `endDate = :endDate`;
                break;
            case 'archiveDate':
                query += `archiveDate = :archiveDate`;
                break;
            case 'logoImgName':
                query += `logoImgName = :logoImgName`;
                break;
            case 'coverImgName':
                query += `coverImgName = :coverImgName`;
                break;
            case 'thumbnailImgName':
                query += `thumbnailImgName = :thumbnailImgName`;
                break;
            case 'splashCoverImgName':
                query += queryObj.splashCoverImgName === 'NULL' ? `splashCoverImgName = NULL` : `splashCoverImgName = :splashCoverImgName`;
                break;
            case 'splashVideoLink':
                query += queryObj.splashVideoLink === 'NULL' ? `splashVideoLink = NULL` : `splashVideoLink = :splashVideoLink`;
                break;
            case 'splashContent':
                query += queryObj.splashContent === 'NULL' ? `splashContent = NULL` : `splashContent = :splashContent`;
                break;
            case 'presentationFormConfig':
                query += `presentationFormConfig = :presentationFormConfig`;
                break;
            default:
                //skip to next key
                return;
        }

        query += `, `;
    });

    //remove final comma-space
    query = query.slice(0, -2);

    query += ` WHERE eventId = :eventId AND deleteDate IS NULL`;

    return db.queryAsync(query, queryObj);
};

export const isEventExist = ({ condition }: { condition: string }) => {
    const query = `SELECT COUNT(eventId) FROM event WHERE ${ condition } AND deleteDate IS NULL`;
    return db.queryAsync(query);
};

export const archive = function (queryObj) {
    const query = `UPDATE event SET archiveDate = NOW() WHERE eventCode = :eventCode AND deleteDate IS NULL`;
    return db.queryAsync(query, queryObj);
};

export const unarchive = function (queryObj) {
    const query = `UPDATE event SET archiveDate = NULL WHERE eventCode = :eventCode AND deleteDate IS NULL`;
    return db.queryAsync(query, queryObj);
};

export const updateDeprecatedEvent = function (queryObj) {
    if (queryObj.privacyLevel) {
        let query = `UPDATE deprecatedEvent SET `;

        Object.keys(queryObj).forEach((key) => {
            switch (key) {
                case 'privacyLevel':
                    query += `privacyLevel = :privacyLevel`;
                    break;
                default:
                    //skip to next key
                    return;
            }

            query += `, `;
        });

        //remove final comma-space
        query = query.slice(0, -2);

        query += ` WHERE institutionId = :eventId AND deleteDate IS NULL`;

        return db.queryAsync(query, queryObj);
    }
};

export const getConsumerIsEventAdminByEventIdAndConsumerId = function (
    eventId: number,
    consumerId: number
) {
    return db
        .queryAsync(
            `SELECT isAdmin
    FROM consumerEvent
    WHERE eventId = :eventId AND consumerId = :consumerId`,
            { eventId: eventId, consumerId: consumerId }
        )
        .then(firstOrDefault);
};

export const getConsumerIsEventAdminByEventCodeAndConsumerId = function (
    eventCode: string,
    consumerId: number
) {
    return db
        .queryAsync(
            `SELECT isAdmin
    FROM consumerEvent
      JOIN event ON consumerEvent.eventId = event.eventId
    WHERE eventCode = :eventCode AND consumerId = :consumerId`,
            { eventCode, consumerId }
        )
        .then(firstOrDefault);
};

export const getConsumerSubscriptionsIdsByConsumerId = function (consumerId: number) {
    return db
        .queryAsync(
            `SELECT 
                    subscriptionAdmin.subscriptionId
                    FROM subscriptionAdmin
                    JOIN subscription ON subscriptionAdmin.subscriptionId = subscription.subscriptionId
                    WHERE subscriptionAdmin.consumerId = :consumerId
                    AND subscription.deleteDate IS NULL
                    AND subscriptionAdmin.deleteDate IS NULL`,
            { consumerId }
        )
        .then((rows: any[]) => rowsToArray(rows, 'subscriptionId'));
};

export const getConsumerSubscriptionsByConsumerId = function (consumerId: number) {
    return db
        .queryAsync<Subscription[]>(
            `SELECT 
                    subscriptionAdmin.subscriptionId,
                    subscription.subscriptionTierId
                    FROM subscriptionAdmin
                    JOIN subscription ON subscriptionAdmin.subscriptionId = subscription.subscriptionId
                    WHERE subscriptionAdmin.consumerId = :consumerId
                    AND subscription.deleteDate IS NULL
                    AND subscriptionAdmin.deleteDate IS NULL`,
            { consumerId }
        );
};

export const getConsumerByEmail = function (queryObj):Promise<Consumer> {
    return db
        .queryAsync<Consumer[]>(
            `SELECT 
            consumer.*,
            consumerEmail.email AS email
        FROM consumer
        JOIN consumerEmail ON consumer.primaryEmailId = consumerEmail.consumerEmailId
        WHERE consumerEmail.email = :email`,
            queryObj
        )
        .then(firstOrDefault);
};

/**
 * TODO - When this is deployed and database is updated
 * do not insert email in consumer table too, since it's redundant*/

export const insertConsumer = async function (queryObj) {
    await db.beginTransactionAsync();

    try {
        // Insert consumer email
        const result1: any = await db.queryAsync(
            `INSERT INTO consumerEmail(email, consumerId)
            VALUES(:email, NULL);`,
            queryObj
        );

        // Insert consumer referenced to the new consumer email
        const consumerInsertResult: any = await db.queryAsync(
            `INSERT INTO consumer(primaryEmailId, firstName, lastName, email, institutionId) 
            VALUES(:consumerEmailId, :firstName, :lastName, :email, :institutionId);`,
            { ...queryObj, consumerEmailId: result1.insertId }
        );

        // Update consumer email to reference to the new consumer
        await db.queryAsync(
            `UPDATE consumerEmail 
            SET consumerId = :consumerId
            WHERE consumerEmailId = :consumerEmailId;`,
            {
                ...queryObj,
                consumerEmailId: result1.insertId,
                consumerId: consumerInsertResult.insertId,
            }
        );
        await db.commitAsync();

        return consumerInsertResult;
    } catch (error) {
        // If any error happened during above transactions then rollback
        await db.rollbackAsync();
        throw error;
    }
};

export const  updateConsumerStripeId = async (consumerId:number,stripeId)=>{
    return db.queryAsync(
        `UPDATE consumer
        SET 
          stripeId = :stripeId
        WHERE
          consumerId = :consumerId
        `,
        { consumerId, stripeId }
    );
}


export const updateConsumer = async function ({
    firstName,
    lastName,
    primaryEmailId,
    profileImgName,
    ...rest
}: any): Promise<any> {
    return db.queryAsync(
        `UPDATE consumer
        SET 
        ${firstName ? 'firstName = :firstName,' : ''}
        ${lastName ? 'lastName = :lastName,' : ''}
        ${primaryEmailId ? 'primaryEmailId = :primaryEmailId,' : ''}
        ${profileImgName ? 'profileImgName = :profileImgName,' : ''}
        lastUpdated = current_timestamp()
        WHERE consumerId = :consumerId`,
        {
            firstName,
            lastName,
            primaryEmailId,
            profileImgName,
            ...rest,
        }
    );
};

export const insertConsumerEvent = function (queryObj) {
    return db.queryAsync(
        `INSERT INTO consumerEvent(consumerId, isAdmin, eventId) VALUES(:consumerId, :isAdmin, :eventId)`,
        queryObj
    );
};

export const getLiveSessionByIdAndEventId = async function (
    liveSessionId: number,
    eventId: number
): Promise<any> {
    return db
        .queryAsync<any>(
            `
    SELECT *
    FROM liveSession b
    WHERE liveSessionId = :liveSessionId AND eventId = :eventId AND deleteDate IS NULL
    `,
            { liveSessionId: liveSessionId, eventId: eventId }
        )
        .then(firstOrDefault);
};

export const insertLiveSession = function (queryObj): Promise<any> {
    let query = `INSERT INTO liveSession
    SET eventId = :eventId, sessionLinkType = :sessionLinkType, zoomUrl = :zoomUrl, name = :name, 
    sessionStartDateTime = :sessionStartDateTime, description = :description, liveSessionOrder = (
        IFNULL((
            SELECT MAX(ls.liveSessionOrder)
            FROM liveSession ls
            WHERE eventId = :eventId
        ), 0
    ) + 1)`;

    if (queryObj.sessionEnd) {
        query += `, sessionEndDateTime = :sessionEndDateTime`;
    }

    return db.queryAsync(query, {
        eventId: queryObj.eventId,
        sessionLinkType: queryObj.sessionLinkType,
        zoomUrl: queryObj.link,
        name: queryObj.title,
        sessionStartDateTime: queryObj.sessionStart,
        sessionEndDateTime: queryObj.sessionEnd,
        description: queryObj.description,
    });
};

export const updateLiveSession = async function (queryObj) {
    let query = `UPDATE liveSession SET `;

    Object.keys(queryObj).forEach((key, idx) => {
        switch (key) {
            case 'sessionLinkType':
                query += `sessionLinkType = :sessionLinkType`;
                break;
            case 'link':
                query += `zoomUrl = :zoomUrl`;
                break;
            case 'title':
                query += `name = :name`;
                break;
            case 'sessionStart':
                query += `sessionStartDateTime = :sessionStartDateTime`;
                break;
            case 'sessionEnd':
                query += `sessionEndDateTime = :sessionEndDateTime`;
                break;
            case 'description':
                query += `description = :description`;
                break;
            default:
                //skip to next key
                return;
        }

        if (idx < Object.keys(queryObj).length - 1) {
            query += `, `;
        }
    });

    query += ` WHERE liveSessionId = :liveSessionId AND deleteDate IS NULL`;

    return db.queryAsync(query, {
        sessionLinkType: queryObj.sessionLinkType,
        zoomUrl: queryObj.link,
        name: queryObj.title,
        sessionStartDateTime: queryObj.sessionStart,
        sessionEndDateTime: queryObj.sessionEnd,
        description: queryObj.description,
        liveSessionId: queryObj.liveSessionId,
    });
};

export const deleteLiveSession = async function (liveSessionId: number) {
    return db.queryAsync(
        `UPDATE liveSession
      SET deleteDate = current_timestamp()
      WHERE liveSessionId = :liveSessionId AND deleteDate IS NULL`,
        {
            liveSessionId: liveSessionId,
        }
    );
};

export const insertComment = function (queryObj) {
    return db.queryAsync(
        `INSERT INTO comment
        SET comment = :comment,
        posterId = :posterId,
        consumerId = :consumerId`,
        queryObj
    );
};

export const flagComment = function (flaggerId: number, commentId: number) {
    return db.queryAsync(
        `UPDATE comment
        SET 
          flaggedByUserDate = CURRENT_TIMESTAMP,
          flaggerId = :flaggerId
        WHERE
          commentId = :commentId
        `,
        { flaggerId, commentId }
    );
};

export const insertReply = function (queryObj) {
    return db.queryAsync(
        `INSERT INTO comment
        SET comment = :comment,
        posterId = :posterId,
        consumerId = :consumerId,
        parentCommentId = :parentCommentId`,
        queryObj
    );
};

export const getGlobalFeatureFlags = function () {
    return db.queryAsync(
        `SELECT *
        FROM globalFeatureFlag`
    );
};

export const getDeprecatedEvents = function () {
    return db.queryAsync(
        `SELECT *
        FROM deprecatedEvent
        WHERE deleteDate IS NULL
        ORDER BY name`
    );
};

export const getNewInstitutions = function () {
    return db.queryAsync<any[]>(
        `SELECT
            i.institutionId,
            i.name,
            ssoEnabled,
            allowSSOSubdomains
        FROM institution i
        JOIN subscription sc ON i.institutionId = sc.institutionId
        JOIN event e ON sc.subscriptionId = e.subscriptionId
        WHERE
            i.deleteDate IS NULL
            AND e.deleteDate IS NULL
            AND e.archiveDate IS NULL
        GROUP BY 1
        ORDER BY i.name`
    );
};

export const getDeprecatedEventById = function (queryObj : {institutionId:number}):Promise<Institution | Institution[]> {
    return db
        .queryAsync<Institution[]>(
            `SELECT *
      FROM deprecatedEvent
      WHERE institutionId = :institutionId`,
            queryObj
        )
        .then(firstOrDefault);
};

export const getInstitutionFromSSOInstitutionCode = function (queryObj: {ssoInstitutionCode:string}):Promise<Institution | Institution[]> {
    return db
        .queryAsync<Institution[]>(
            `SELECT *
      FROM deprecatedEvent
      WHERE ssoInstitutionCode = :ssoInstitutionCode`,
            queryObj
        )
        .then(firstOrDefault);
};

export const getAllowedEventEmails = async function (eventId: number): Promise<string> {
    return db
        .queryAsync<{ validEmails: string }[]>(
            `SELECT validEmails
                FROM event
                WHERE eventId = :eventId`,
            { eventId }
        )
        .then(firstOrDefault)
        .then(result => result.validEmails);
};

export const getAllowedSpecifiedEventEmails = function (
    eventId: number
): Promise<string[]> {
    return db
        .queryAsync(
            `SELECT email
            FROM eventEmail
            WHERE eventId = :eventId`,
            {
                eventId,
            }
        )
        .then((rows: any[]) => rowsToArray(rows, 'email'));
};

export const getPreApprovedEventEmails = function (
    eventId: number
): Promise<string[]> {
    return db
        .queryAsync(
            `SELECT email
            FROM preApprovedEventEmail
            WHERE eventId = :eventId`,
            { eventId,}
        )
        .then((rows: any[]) => rowsToArray(rows, 'email') || []);
};

export const getTopLevelComments = function (queryObj) {
    return db.queryAsync(
        `SELECT
            comment.*,
            consumer.firstName,
            consumer.lastName,
            consumer.consumerId
        FROM comment
        JOIN consumer ON comment.consumerId = consumer.consumerId
        WHERE posterId = :posterId
        AND parentCommentId IS NULL`,
        queryObj
    );
};

export const getComments = function (queryObj) {
    return db.queryAsync(
        `SELECT
            comment.*,
            consumer.firstName,
            consumer.lastName,
            consumer.consumerId
        FROM comment
        JOIN consumer ON comment.consumerId = consumer.consumerId
        WHERE parentCommentId = :parentCommentId`,
        queryObj
    );
};

export const getCommentFromId = function (queryObj) {
    return db
        .queryAsync(
            `SELECT
          comment.*,
          consumer.firstName,
          consumer.lastName,
          consumer.consumerId
      FROM comment
      JOIN consumer ON comment.consumerId = consumer.consumerId
      WHERE commentId = :commentId`,
            queryObj
        )
        .then(firstOrDefault);
};

export const deleteComment = function (queryObj) {
    return db.queryAsync(
        `UPDATE comment
        SET deleteDate = CURRENT_TIMESTAMP
        WHERE commentId = :commentId
        LIMIT 1`,
        queryObj
    );
};

export const getEventsByDeprecatedEventId = function (institutionId, query): Promise<any[]> {
    return db.queryAsync(
        `SELECT
            event.eventId,
            event.subscriptionId,
            tiers.eventUptimeInDays,
            event.name,
            event.validEmails,
            event.institutionId,
            event.startDate,
            event.archiveDate,
            event.eventCode,            
            event.splashContent,
            event.splashCoverImgName,
            event.splashVideoLink,
            event.allowAllDomains,
            event.privacyLevel,
            event.coverImgName,
            event.thumbnailImgName,
            event.logoImgName,
            it.name AS institutionName,
            ef.useLatestSubmission,
            ef.accessCustomSubmissionFormEditor,
            ef.editEventLogo,
            ef.editSplashScreen,
            ef.editCoverPhoto,
            ef.editPresentation
        FROM event
        LEFT JOIN subscription sc ON sc.subscriptionId = event.subscriptionId
        LEFT JOIN subscriptionTiers tiers on sc.subscriptionTierId = tiers.subscriptionTiersId
        LEFT JOIN institution it ON it.institutionId = sc.institutionId
        LEFT JOIN eventFeatureFlag ef ON event.eventId = ef.eventId
        WHERE (event.archiveDate IS NULL) ${
            institutionId ? 'AND (it.institutionId = :institutionId)' : ''
        }
        AND (
            event.name LIKE CONCAT('%', :query, '%')
            OR it.name LIKE CONCAT('%', :query, '%')
        )
        ORDER BY event.name`,
        { institutionId, query }
    )
};

export const getConsumerEvents = function (
    consumerId: string,
    isAdmin: 0 | 1
): Promise<any[]> {
    return db.queryAsync(
        `SELECT 
            event.*,
            deprecatedEvent.name AS institutionName
        FROM consumerEvent
        JOIN event ON consumerEvent.eventId = event.eventId
        JOIN deprecatedEvent ON event.institutionId = deprecatedEvent.institutionId
        WHERE consumerId = :consumerId 
        AND isAdmin = :isAdmin 
        `,
        { isAdmin, consumerId }
    );
};

export const getConsumerEmails = function (consumerId: string): Promise<any> {
    return db.queryAsync(
        `SELECT 
            consumerEmailId,
            email,
            verifiedAt
        FROM consumerEmail
        WHERE consumerId = :consumerId`,
        { consumerId }
    );
};

export const getConsumerEmailByEmail = function (email: string): Promise<any> {
    return db
        .queryAsync(
            `SELECT 
            consumerEmailId,
            email,
            consumerId,
            verifiedAt
        FROM consumerEmail
        WHERE email = :email`,
            { email }
        )
        .then(firstOrDefault);
};

export const getConsumerEmailById = function (consumerEmailId): Promise<any> {
    return db
        .queryAsync(
            `SELECT 
            consumerEmail.consumerEmailId,
            consumerEmail.email,
            consumerEmail.consumerId,
            consumerEmail.verifiedAt,
            consumer.primaryEmailId as consumerPrimaryEmailId
        FROM consumerEmail
        JOIN consumer ON consumerEmail.consumerId = consumer.consumerId
        WHERE consumerEmailId = :consumerEmailId`,
            { consumerEmailId }
        )
        .then(firstOrDefault);
};

export const saveConsumerEmail = async function (queryObj: any): Promise<any> {
    return db.queryAsync(
        `INSERT INTO consumerEmail
        SET consumerId = :consumerId,
        email = :email`,
        queryObj
    );
};

export const updateConsumerEmailByEmail = async function ({
    isVerified,
    consumerId,
    ...rest
}: any): Promise<any> {
    return db.queryAsync(
        `UPDATE consumerEmail
        SET 
        ${isVerified ? (consumerId ? 'verifiedAt = current_timestamp(),' : 'verifiedAt = current_timestamp()') : ''}
        ${consumerId ? 'consumerId = :consumerId' : ''}
        WHERE email = :email`,
        {
            isVerified,
            consumerId,
            ...rest,
        }
    );
};

export const deleteConsumerEmail = async function (
    consumerEmailId: string
): Promise<any> {
    return db.queryAsync(
        `DELETE FROM consumerEmail
        WHERE consumerEmailId = :consumerEmailId`,
        {
            consumerEmailId,
        }
    );
};

export const getEmailsForEvent = (eventId: number):Promise<EventEmail[]>=>{
    return db.queryAsync( `SELECT eventEmailId,
                                email,
                                eventId 
                                FROM eventEmail
                                WHERE eventId=:eventId`, { eventId });
}

export const getEmailForEvent = (eventId: number, email :string ):Promise<EventEmail>=>{
    return db. queryAsync<EventEmail[]>(
        `SELECT eventEmailId, 
                    email, 
                    eventId 
                    FROM eventEmail
                    WHERE eventId=:eventId AND email=:email`, { email,eventId })
        .then(results=> results.length >0 ? results[0]:null)
}

export const insertEmailForEvent = ( eventId: number, email :string ): Promise<any>=> {
    return db.queryAsync( `INSERT INTO eventEmail(email, eventId) VALUES(:email, :eventId)`, {
        email,
        eventId
    });
};

export const deleteEmailFromEvent = ( eventEmailId: number ): Promise<any>=> {
    return db.queryAsync( `DELETE from eventEmail
                                WHERE eventEmailId=:eventEmailId`, { eventEmailId });
};

export const checkEventCodeExists = function (
    eventCode: string,
): Promise<any[]> {
    return db.queryAsync(
        `SELECT 
            COUNT(1)
        FROM event
        WHERE eventCode = :eventCode
        `,
        { eventCode }
    );
};

export interface EventInput {
    name: string;
    organizedBy: string;
    eventCode :string;
    startDate: string;
    endDate: string;
    institutionId: string,
    subscriptionId: number;
    validEmails: string;
    privacyLevel: string;
};

export const insertEvent = (
    {
        name,
        organizedBy,
        eventCode,
        startDate,
        endDate,
        institutionId,
        validEmails,
        subscriptionId,
        privacyLevel
    }: EventInput): Promise<any> => {

    const sql = `INSERT INTO event(name, organizedBy, eventCode, startDate, endDate, institutionId, validEmails, subscriptionId, privacyLevel)
                VALUES(:name, :organizedBy, :eventCode, :startDate, :endDate , :institutionId, :validEmails, :subscriptionId, :privacyLevel);`;
    const args = {
        name,
        organizedBy,
        eventCode,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        institutionId,
        validEmails: validEmails,
        subscriptionId: subscriptionId,
        privacyLevel: privacyLevel || 'private'
    };

    return db.queryAsync(sql, args);
};

export const insertEventTags = (eventId: string): Promise<any> => {
    const defaultTags = ['Arts, Design, and Performing Arts', 'Biological & Life Sciences', 'Business & Economics', 'Chemical Sciences', 'Computational Sciences', 'Cultural & Language Studies', 'Environmental Sciences', 'Engineering', 'Humanities', 'Medical & Health Sciences', 'Physical Sciences & Astronomy', 'Social & Behavioral Sciences', 'Communication & Journalism', 'Education', 'Mathematics & Quantitative Studies'];

    const query = `INSERT INTO tag(name, type, eventId) VALUES (:tag, 'Subject', :eventId)`;

    return Promise.all(defaultTags.map(tag => {
        return db.queryAsync(query, {
            tag,
            eventId
        });
    }));
}

export const insertEventFeatureFlag = (eventId: string, accessCustomSubmissionFormEditor: boolean = false): Promise<any> => {
    return db.queryAsync(`INSERT INTO eventFeatureFlag (eventId, accessCustomSubmissionFormEditor) VALUES (:eventId, :accessCustomSubmissionFormEditor)`, {
        eventId,
        accessCustomSubmissionFormEditor: accessCustomSubmissionFormEditor ? 1 : 0,
    });
};

export const insertDeprecatedEvent = (deprecatedEventName: string, eventCode: string, validEmails: string = '*', ssoEnabled: boolean = false, privacyLevel: string = 'private', showWelcomePage: boolean = false): Promise<any> => {
    return db.queryAsync(`INSERT INTO deprecatedEvent (name, institutionCode, validEmails, ssoEnabled, privacyLevel, showWelcomePage) VALUES (:deprecatedEventName, :eventCode, :validEmails, :ssoEnabled, :privacyLevel, :showWelcomePage)`, {
        deprecatedEventName,
        eventCode,
        validEmails,
        ssoEnabled: ssoEnabled ? 1 : 0,
        privacyLevel,
        showWelcomePage: showWelcomePage ? 1: 0,
    });
};


export const getInstitutionById = (institutionId: string): Promise<Institution> => {
    return db.queryAsync<Institution[]>(`SELECT * FROM institution WHERE institutionId=:institutionId`, { institutionId }).then(firstOrDefault);
};

export const getFAQs = async (): Promise<any> => {
    return db.queryAsync(`SELECT * FROM faq ORDER BY zIndex DESC, lastUpdated`);
}
