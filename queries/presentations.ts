import { GetPresentationsQueryParams, Presentation } from '../models';
import db from '../database';

export const getPresentations = async function(params: Partial<GetPresentationsQueryParams>): Promise<Presentation[]> {
    let query = `SELECT  
      p.presentationId,
      p.institutionSetUniquePresentationId,
      p.hash,
      p.createDate,
      title,
      abstract,
      subjects,
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
      p.presenterEmail,
      p.presenterYear,
      p.presenterMajor,

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

      p.institutionId,
      p.eventId,
      CONCAT(
        '[',
        GROUP_CONCAT(
          CONCAT(
            '{\"name\": \"',
            t.name,
            '\", ',
            '\"type\": \"',
            t.type,
            '\", ',
            '\"tagId\": ',
            t.tagId,
            ' }'
          )
          SEPARATOR ','
        ),
        ']'
      ) AS tags
    FROM presentation p
    JOIN deprecatedEvent i ON p.institutionId = i.institutionId
    LEFT JOIN presentationTag pt ON p.presentationId = pt.presentationId
    LEFT JOIN tag t ON pt.tagId = t.tagId
    WHERE 
     (p.eventId = :eventId
      OR p.hash = :hash)
      AND (
        title LIKE CONCAT('%', :query, '%')
        OR abstract LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenterFirstName, ' ', presenterLastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter2FirstName, ' ', presenter2LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter3FirstName, ' ', presenter3LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter4FirstName, ' ', presenter4LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter5FirstName, ' ', presenter5LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter6FirstName, ' ', presenter6LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter7FirstName, ' ', presenter7LastName) LIKE CONCAT('%', :query, '%')
        OR CONCAT(presenter8FirstName, ' ', presenter8LastName) LIKE CONCAT('%', :query, '%')
      )
      AND p.deleteDate IS NULL
    GROUP BY 1
    ORDER BY createDate desc`;

    if (params.limit) {
        query = query.concat(` LIMIT :limit`);
    }

    return db.queryAsync<Presentation[]>(query, params);
};
