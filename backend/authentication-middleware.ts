// TODO: How can this page refactored?
import { getClaimsFromResponse, isConsumerBlockedFromEvent } from './middlewares';
import admin from './firebase-service';
import * as sharedQueries from './shared-queries';
import * as authQueries from './auth-queries';
import { Claims, Consumer, Event, Institution, Presentation } from './models';
import { isEventPrivate, isUserAuthorizedForEvent } from './helpers';
import { getOneEventByHashCodeOrID } from './auth-queries';

const debug = require('debug')('server:server');

const UNAUTHORIZED_MSG = 'You are not authorized to make this request';

export const checkIsAuthenticated = async (req, res, next) => {
  try {
    const authToken = getBearerAuthTokenFromHeader(req.headers.authorization);
    if (!authToken) {
      return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
    }

    const userInfo = await admin.auth().verifyIdToken(authToken);
    res.locals.token = authToken;
    res.locals.userClaims = userInfo;

    const consumer: any = await sharedQueries.getConsumerByConsumerId({ consumerId: res.locals.userClaims.consumerId });
    res.locals.userClaims.institutionId = consumer.institutionId;
    res.locals.userClaims.institutionCode = consumer.institutionCode;
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

export const softCheckIsAuthenticated = async (req, res, next) => {
  //check req.headers.authorization
  if (!req.headers?.authorization) {
    return next();
  }

  try {
    const authToken = getBearerAuthTokenFromHeader(req.headers.authorization);
    if (!authToken) {
      return next();
    }

    const userInfo = await admin.auth().verifyIdToken(authToken);
    res.locals.token = authToken;
    res.locals.userClaims = userInfo;


    const consumer = await sharedQueries.getConsumerByConsumerId({ consumerId: res.locals.userClaims.consumerId });
    res.locals.userClaims.institutionId = consumer.institutionId;
    res.locals.userClaims.institutionCode = consumer.institutionCode;
  } catch (e) {
    console.log(e)
  }

  return next();
};

export const checkIsEventAdmin = async (req, res, next) => {
  //check via eventId (if present)
  let eventId = req.body.eventId || req.query.eventId;

  //check via eventCode param (if present)
  let eventCode = req.params.eventCode;

  //check if no eventId OR eventCode
  if (!eventId && !eventCode) {
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  let queryPromise;
  if (eventId) {
    queryPromise = sharedQueries.getConsumerIsEventAdminByEventIdAndConsumerId(eventId, res.locals.userClaims.consumerId);
  } else {
    queryPromise = sharedQueries.getConsumerIsEventAdminByEventCodeAndConsumerId(eventCode, res.locals.userClaims.consumerId);
  }

  //run query
  try {
    const isAdminResult = (await queryPromise)?.isAdmin === 1;
    if (!isAdminResult) {
      return res
        .status(401)
        .send({ error: UNAUTHORIZED_MSG });
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  //authorized
  return next();
};

export const softCheckIsEventAdmin = async (req, res, next) => {
  //check res.locals.userClaims.consumerId
  if (!res.locals.userClaims?.consumerId) {
    return next();
  }

  //check via eventId (if present)
  let eventId = req.body.eventId || req.query.eventId;

  //check via eventCode param (if present)
  let eventCode = req.params.eventCode;

  //check if no eventId OR eventCode
  if (!eventId && !eventCode) {
    return next();
  }

  let queryPromise;
  if (eventId) {
    queryPromise = sharedQueries.getConsumerIsEventAdminByEventIdAndConsumerId(eventId, res.locals.userClaims.consumerId);
  } else {
    queryPromise = sharedQueries.getConsumerIsEventAdminByEventCodeAndConsumerId(eventCode, res.locals.userClaims.consumerId);
  }

  //run query
  try {
    const isAdminResult = (await queryPromise)?.isAdmin === 1;
    res.locals.isEventAdmin = isAdminResult;
  } catch (e) {
    console.log(e);
  }

  return next();
};

// Checks if liveSession belongs to the registered events user is in
export const checkLiveSessionAgainstRegisteredEvents = async (req, res, next) => {
  try {
    const { eventCodeOrHash } = req.query
    const event : Event  = await authQueries.getOneEventByHashCodeOrID(eventCodeOrHash);
    let eventIds: number[] = [];

    const authToken = getBearerAuthTokenFromHeader(req.headers.authorization);
    if (authToken) {
        const userInfo = await admin.auth().verifyIdToken(authToken);
        res.locals.token = authToken;
        res.locals.userClaims = userInfo;
        eventIds= await sharedQueries.getEventIdsByConsumerId({ consumerId: res.locals.userClaims.consumerId });
    }
    if (!eventIds.includes(Number(event.eventId))) {
      const sessions = await sharedQueries.getLiveSessionId(event.eventId);
      return res
      .status(401)
      .send({
        hasLiveSessions: sessions.length > 0,
        error: 'You must register for this event to view live sessions.'
      });
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({
        error: UNAUTHORIZED_MSG
      });
  }

  return next();
};

// Checks if presentations belongs to the institution user is in
export const checkIsAuthenticatedPresentations = async (req, res, next) => {
  try {
      const { eventCodeOrHash } = req.query
      const event: Event  = await authQueries.getOneEventByHashCodeOrID(eventCodeOrHash);
      const claims: Claims = getClaimsFromResponse(res);

    // if the event is private and user is not authorized to view it
    if (isEventPrivate(event) && !isUserAuthorizedForEvent(claims,event)) {
        throw new Error(UNAUTHORIZED_MSG)
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Authorization:
// User must be logged in or have a hash
// If logged in, that user must be associated by institution with this presentation's institution
// If hash, that hash must be associated with this presentation
export const checkIsAuthenticatedSinglePresentation = async (req, res, next) => {
  try {
    const { presentationIdOrHash } = req.query
    let presentation = await sharedQueries.getSinglePresentationFromId(presentationIdOrHash);
    if (!presentation) {
      presentation = await sharedQueries.getSinglePresentationFromHash(presentationIdOrHash);

      if (!presentation) {
        throw new Error('Presentation not found');
      }
      const event: Event = await getOneEventByHashCodeOrID(presentation.eventId)
      if (presentation && event.privacyLevel === 'presentationHash'){
        return next()
      }
    }

    const event: Event = await getOneEventByHashCodeOrID(presentation.eventId)

    if (isEventPrivate(event)) {
      // User is logged into that university
      const authToken = getBearerAuthTokenFromHeader(req.headers.authorization);
      if (!authToken) {
        throw new Error(UNAUTHORIZED_MSG);
      }

      const userInfo:Partial<Claims> = await admin.auth().verifyIdToken(authToken);
      res.locals.token = authToken;
      res.locals.userClaims = userInfo;

      // Add institutionId temporarily to userInfo
      const consumer: Consumer = await sharedQueries.getConsumerByConsumerId({ consumerId: res.locals.userClaims.consumerId });
      res.locals.userClaims.institutionId = consumer.institutionId;
      res.locals.userClaims.institutionCode = consumer.institutionCode;

      // Add events temporarily to userInfo (TODO: Can we simplify this?)
      if (!isUserAuthorizedForEvent(userInfo,event)) {
        throw new Error(UNAUTHORIZED_MSG);
      }
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Checks if user is making changes to their own data
export const checkIsUserOwner = async (req, res, next) => {
  try {
    // Check to make sure consumerId matches token consumerId
    if (Number(req.body.consumerId) !== Number(res.locals.userClaims.consumerId)) {
      throw new Error();
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Checks if user is making changes to their own data
export const checkIsUserOwnerOfComment = async (req, res, next) => {
  try {
    const comment: any = await sharedQueries.getCommentFromId({ commentId: req.body.commentId });

    // Check to make sure consumerId matches token consumerId
    if (Number(comment.consumerId) !== Number(res.locals.userClaims.consumerId)) {
      throw new Error();
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Checks if user is making changes to their own data
export const checkIsUserCommentOwner = async (req, res, next) => {
  try {
    // Check to make sure consumerId matches token consumerId
    if (req.body.consumerId !== res.locals.userClaims.consumerId) {
      throw new Error();
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// If poster is in a private university, then user must belong to that institution
export const checkPosterAuthorized = async (req, res, next) => {
  try {
    const event : Event = await getOneEventByHashCodeOrID(req.query.eventCodeOrHash);
    if (event && event.privacyLevel === 'institutionHash') {
      const presentation : Presentation = await sharedQueries.getSinglePresentationFromId(req.query.posterId);
      if (presentation.eventId !== event.eventId) {
        throw new Error();
      }
      res.locals.userClaims = { institutionId: event.institutionId };
      return next();
    }

    if (req.query.hash === req.query.posterId) {
      if (event.privacyLevel === 'private') {
        const authToken = getBearerAuthTokenFromHeader(req.headers.authorization);

        const userInfo = await admin.auth().verifyIdToken(authToken);
        res.locals.token = authToken;
        res.locals.userClaims = userInfo;

        // Add institutionId temporarily to userInfo
        const consumer: any = await sharedQueries.getConsumerByConsumerId({ consumerId: res.locals.userClaims.consumerId });
        res.locals.userClaims.institutionId = consumer.institutionId;
        res.locals.userClaims.institutionCode = consumer.institutionCode;

        const eventIds: number[] = await sharedQueries.getEventIdsByConsumerId({ consumerId: res.locals.userClaims.consumerId });

        if (!eventIds.includes(Number(event.eventId))) {
          throw new Error();
        }
      }
    } else {
      const presentationFromHash: Presentation = await sharedQueries.getSinglePresentationFromHash(req.query.hash);
      const presentation: Presentation = await sharedQueries.getSinglePresentationFromId(req.query.posterId);
      res.locals.userClaims = {
        institutionId: presentation.institutionId
      }

      if ((Number(presentationFromHash.eventId) !== Number(presentation.eventId))) {
        throw new Error();
      }
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// If poster is in a private university, then user must belong to that institution
export const checkCommentPosterAuthorized = async (req, res, next) => {
  try {
    const presentation: Presentation = await sharedQueries.getSinglePresentationFromId(req.body.posterId);
    const event: Event = await getOneEventByHashCodeOrID(presentation.eventId)
    const claims: Claims = getClaimsFromResponse(res);
    const isConsumerBlocked = await isConsumerBlockedFromEvent(claims.consumerId,event.eventId);

    if (isConsumerBlocked || ( event.privacyLevel === 'private' && !isUserAuthorizedForEvent(claims,event)) ||
      (event.privacyLevel === 'institutionHash' && ( event.hash !== req.body.eventCodeOrHash))
    ) {
      throw new Error(UNAUTHORIZED_MSG);
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Checks if user is replying to a valid comment
export const checkParentCommentNotDeleted = async (req, res, next) => {
  try {
    const comment: any = await sharedQueries.getCommentFromId({ commentId: req.body.parentCommentId });

    if (comment.deleteDate) {
      throw new Error();
    }
  } catch (e) {
    console.log(e)
    return res
      .status(401)
      .send({ error: UNAUTHORIZED_MSG });
  }

  return next();
};

// Pulls token out of Bearer auth header
const getBearerAuthTokenFromHeader = (authHeader: string): string => {
  if (!authHeader || !authHeader.match(/^bearer\s.+$/i) || authHeader.split(' ').length !== 2) {
    return '';
  }

  return authHeader.split(' ')[1];
}
