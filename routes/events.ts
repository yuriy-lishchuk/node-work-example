import * as fs from 'fs';
import * as path from 'path';
import * as sharedQueries from '../shared-queries';
import { DEFAULT_PRESENTATION_FROM_CONFIG, Event, PrivacyLevel, Tag } from '../models';
import * as presFormModels from '../models/presentationFormConfig';
import { checkIsEventAdmin, checkIsAuthenticated, softCheckIsEventAdmin, softCheckIsAuthenticated } from '../authentication-middleware';
import { aggregateRowValuesAsObject, isValidYouTubeLink, getMimeTypeExtension } from '../functions';
import { createEventDtoSchema, validateEventEmails } from '../schemas';
import {
  allowAllDomainsForEvent,
  deleteEmailFromEvent,
  EventInput,
  getEmailForEvent,
  getEmailsForEvent,
  insertEmailForEvent
} from '../shared-queries';
import { accessCustomSubmissionFormEditorIsAllowed } from '../event-middleware';
import { createEventGuard, getSingleEventGuard, isUserBlockedFromEvent } from '../middlewares';
import { isConsumerHasSubscription } from '../subscription-middleware';
import { getOneEventByHashCodeOrID } from '../auth-queries';
import {
  archiveEvent,
  unarchiveEvent
} from "../controllers/event.controller";
import {
  currentDateSQLFormat,
  isEventExpiredByUptime,
  generateRandomString,
  getMaxEventDate,
  getFirebaseUserByEmail, setUserCustomClaims,
} from '../helpers';
import {
  getConsumerEventRepository,
  getConsumersRepository,
  getEventFeatureFlagsRepository,
  getEventsRepository,
  getSubscriptionRepository,
} from '../repositories';
import {EventImagesService, UploadWithCompressingResponse} from "../services/eventImages.service";
import { EventImagesRepository } from "../repositories/eventImages.repository";
import { parseISO } from 'date-fns';

var express = require('express');
var router = express.Router();
var cors = require('cors');
router.use(cors());
const debug = require('debug')('server:server');

//formidable form handler
const formidable = require('formidable');

//for creating unique hashes
const uniqueString = require('unique-string');

console.log('EventImagesService', EventImagesService);
// Google Cloud Storage
const eventImageRepository = new EventImagesRepository();
const eventImagesService = new EventImagesService(eventImageRepository);

/**
 * Returns events array. If institution/organization id is provided,
 * then filters based on the provided id.
 * Authorization: User rejected, if is not logged in
 */
router.get('/', async function (req, res, next) {
    try {
        const query = req.query.query || '';

        let rows = await sharedQueries.getEventsByDeprecatedEventId(req.query.institutionId, query);

        rows = rows.map(event=>({...event,subscription : { eventUptimeInDays : event.eventUptimeInDays}}))
        rows = rows.filter(event=> !isEventExpiredByUptime(event,event.subscription));

        // attach institution object to event
        aggregateRowValuesAsObject(rows, 'institution', {
            name: 'institutionName'
        });

        // TODO: Remove this once email validation is done on backend
        const events = await Promise.all(rows.map(async event => {
          event.validSpecifiedEmails = await sharedQueries.getAllowedSpecifiedEventEmails(event.eventId);
          return event;
        }));

        res.json(events);
    } catch (err) {
        console.log(err);
        next(err)
    }
});

/**
 * Creates an event.
 *
 * Authorization: User rejected, if is not logged in
 */
router.post('/',
    softCheckIsAuthenticated,
    isConsumerHasSubscription,
    createEventGuard,
    async (req, res, next) => {
      // validation
      try {
        createEventDtoSchema.validate(req.body);
      } catch(err) {
        res.status(400).send({ message: 'Event code, name, organizedBy or launchDate is not valid'});
      }

      // insert to db
      try {
        const {
          eventCode,
          eventName,
          organizedBy,
          eventLaunchDate,
          eventEndDate,
          subscriptionId
        } = req.body;

    const { email, consumerId } = res.locals.userClaims;

    const deprecatedEvent = await sharedQueries.insertDeprecatedEvent(eventName, eventCode);
    const institutionId = deprecatedEvent.insertId;

        const args = {
          name: eventName,
          organizedBy,
          eventCode,
          startDate: eventLaunchDate,
          endDate: eventEndDate,
          institutionId,
          subscriptionId
        } as EventInput;

        const { insertId: eventId } = await sharedQueries.insertEvent(args);

        const subscription = await getSubscriptionRepository().getSubscriptionById(subscriptionId);

        await Promise.all([
          sharedQueries.insertEmailForEvent(eventId, email.toLowerCase()),
          sharedQueries.insertConsumerEvent({
            consumerId,
            eventId,
            isAdmin: 1
          }),
          sharedQueries.insertEventTags(eventId),
        ]);

        await getEventFeatureFlagsRepository().createEventFeatureFlags(eventId, subscription.subscriptionTier)

        await updatePresFormConfigTagsAndExtraFieldHashes(eventId, DEFAULT_PRESENTATION_FROM_CONFIG);

        const consumer = await getConsumersRepository().getConsumerById(consumerId);
        const user = await getFirebaseUserByEmail(consumer.email);
        const consumerEvents = await  getConsumerEventRepository().getConsumerEvents(consumerId);
        const eventIds = consumerEvents.map(ce=>ce.eventId);
        await setUserCustomClaims(user.uid, {
          consumerId,
          eventIds
        })

        res.status(201).send({
          message: 'Successfully created',
          data: {
            eventId
          }
        });

      } catch (err) {
        console.log('Error while performing Query.', err);
        next(err);
      }
});

/**
 * Returns the events wich are either organized by the user or user is registered.
 */
router.get('/my/:isAdmin', checkIsAuthenticated, async function (req, res, next) {
    try {
        const { isAdmin } = req.params;
        const { consumerId } = res.locals.userClaims;

        const rows = await sharedQueries.getConsumerEvents(consumerId, isAdmin);

        // attach institution object to event
        aggregateRowValuesAsObject(rows, 'institution', {
            name: 'institutionName'
        });

        res.json(rows);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

/**
 * Returns whether proposed eventCode is unique or not.
 */
router.get('/check-eventcode/:eventCode', checkIsAuthenticated, async function (req, res, next) {
  try {
    const count = await sharedQueries.checkEventCodeExists(req.params.eventCode);

    if(Array.isArray(count) && count[0]['COUNT(1)'] === 0) {
      res.status(200).send({ msg: 'Not used'});
    } else {
      res.status(409).send({ msg: 'Already taken'});
    }
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
    next(err);
  }
});

// GET retrieve global event count
router.get('/count', async function (req, res, next) {
  let total: Number;
  try {
    total = await sharedQueries.getGlobalEventCount();
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
    return res.status(500).send({ msg: 'unknown error occurred' });
  }

  res.json({ total: total });
});

// GET retrieve event by eventCode
router.get('/:eventCode', getSingleEventGuard(req => req.params.eventCode), softCheckIsAuthenticated, softCheckIsEventAdmin, isUserBlockedFromEvent, async function (req, res, next) {
  let event: Event;
  try {
    event = await getOneEventByHashCodeOrID(req.params.eventCode);
  } catch (err) {
    return next(err)
  }

  //parse special fields
  try {
    // this is necessary because it's stored as string in the db and PresentationFormConfig when parsed
    const config: any = event.presentationFormConfig;
    let parsedConfig = JSON.parse(config);
    if (typeof parsedConfig !== 'object') {
      throw Error();
    }
    event.presentationFormConfig = parsedConfig;
  } catch(err) {
    //null field if not valid JSON
    event.presentationFormConfig = null;
  }

  //remove non-public fields if not authenticated
  if (!res.locals.userClaims) {
    delete event.validEmails;
  }

  //remove sensitive fields if not event admin
  if (!res.locals.isEventAdmin) {
    delete event.subscriptionId;
    delete event.createDate;
    delete event.lastUpdated;
  }


  event.validSpecifiedEmails = await sharedQueries.getAllowedSpecifiedEventEmails(event.eventId);

  event.preApprovedEmails = await  sharedQueries.getPreApprovedEventEmails(event.eventId)

  //success
  res.json(event);
});

// PUT update event by eventCode (multipart/form-data)
router.put('/:eventCode', checkIsAuthenticated, checkIsEventAdmin, accessCustomSubmissionFormEditorIsAllowed, async function (req, res, next) {
  const fileUploadMBLimit = 10;

  //validate request type
  if (!req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).json({ msg: 'invalid form type' });
  }

  //handle form/files
  const fileForm = formidable({
    maxFileSize: fileUploadMBLimit * 1024 * 1024,
    keepExtensions: true
  });
  let uploadedFiles: any = await new Promise(resolve => {
    fileForm.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ message: `file exceeds limit of ${fileUploadMBLimit}MB`});
      }

      // This wasn't working properly in middleware b/c I believe calling formidable.parse twice on
      // a request causes issues.
      // updating presentation form config, but hasn't upgraded tier.
      const dbEvent: any = await sharedQueries.getEventByCode(req.params.eventCode);
      if (fields.presentationFormConfig && !dbEvent.accessCustomSubmissionFormEditor) {
        return res.status(403).json({ msg: "not authorized to update 'presentationFormConfig' field" });
      }

      //manually set req.body
      req.body = fields;

      //resolve any files
      resolve(files);
    });
  });

  // -- validate request --

  let editedFields = 0;

  // -- privacyLevel
  if (req.body.privacyLevel) {
    if (!Object.keys(PrivacyLevel).map(key => PrivacyLevel[key].toLowerCase()).includes(req.body.privacyLevel.toLowerCase())) {
      return res.status(400).json({ message: "invalid field 'privacyLevel'" });
    }

    //temp -- only allow private/public
    if (!['public', 'private'].includes(req.body.privacyLevel.toLowerCase())) {
      return res.status(400).json({ message: "invalid field 'privacyLevel'" });
    }

    editedFields++;
  }

  // -- validEmails
  if (req.body.validEmails) {
    if (req.body.validEmails.split(/[,\s]+/).filter(email => email.length === 0).length > 0) {
      return res.status(400).json({ message: "invalid field 'validEmails'" });
    }
    editedFields++;
  }

  // -- eventLogo
  if (uploadedFiles.eventLogo) {
    editedFields++;
  }

  // -- eventCoverPhoto
  if (uploadedFiles.eventCoverPhoto) {
    editedFields++;
  }

  // -- splashCoverImg
  if (uploadedFiles.splashCoverImg || req.body.splashCoverImg === 'REMOVE') {
    editedFields++;
  }

  // -- splashVideoLink (allows empty string to delete)
  if (req.body.splashVideoLink !== undefined) {
    if(req.body.splashVideoLink && !isValidYouTubeLink(req.body.splashVideoLink)) {
      return res.status(400).json({ message: "invalid field 'splashVideoLink'" });
    }
    // -- check only one of above 2 fields is set
    if (uploadedFiles.splashCoverImg || req.body.splashCoverImg === 'REMOVE') {
      return res.status(400).json({ message: "must only have 1 splash media field 'splashCoverImg' or 'splashVideoLink'" });
    }
    editedFields++;
  }


  // -- splashContent (allows empty string to delete all content)
  if (req.body.splashContent !== undefined) {
    editedFields++;
  }

  // -- presentation form config
  let presentationFormConfig: presFormModels.PresentationFormConfig;
  if (req.body.presentationFormConfig) {
    //validate config, get errors if any
    try {
      presentationFormConfig = JSON.parse(req.body.presentationFormConfig);
      if (typeof presentationFormConfig !== 'object') {
        throw Error();
      }
      let formErrs = getPresentationFormConfigErrors(presentationFormConfig);
      if (formErrs.length) {
        return res.status(400).json({ msg: "invalid field 'presentationFormConfig'", errors: formErrs });
      }
    } catch(err) {
      return res.status(400).json({ msg: "invalid field 'presentationFormConfig'" });
    }

    editedFields++;
  }

  // -- eventLaunchDate
  let isLaunchNow = false;
  if (req.body.eventLaunchDate) {
    //check if value is 'LAUNCH_NOW'
    if (req.body.eventLaunchDate === 'LAUNCH_NOW') {
      isLaunchNow = true;
    } else {
      //must be valid date and not in the past
      if (isNaN(Date.parse(req.body.eventLaunchDate)) || (new Date(req.body.eventLaunchDate)).valueOf() < (new Date()).valueOf()) {
        if (isNaN(Date.parse(req.body.eventLaunchDate))) {
          res.status(400).json({ message: "invalid field 'eventLaunchDate'" });
        } else {
          res.status(400).json({ message: "invalid field 'eventLaunchDate', launch date/time cannot be in the past" });
        }
        return;
      }
    }
    editedFields++;
  }

  //ensure at least 1 field is being edited
  if (editedFields === 0) {
    res.status(400).json({ message: "no fields provided" });
    return;
  }

  //ensure given presentation exists with given event
  let dbEvent: any;
  dbEvent =  await sharedQueries.getEventByCode(req.params.eventCode);

  const eventId = dbEvent.eventId;
  const { subscriptionTier } = await getSubscriptionRepository().getSubscriptionById(dbEvent.subscriptionId);

  //additional validation on startDate (cannot change if event already started)
  if (req.body.eventLaunchDate && dbEvent.startDate && (new Date(dbEvent.startDate)).valueOf() < (new Date()).valueOf()) {
    return res.status(409).json({ message: "cannot change event start date as event already started", currentLaunchDate: dbEvent.startDate });
  }

  // -- request is VALID --

  // -- file uploads

  // -- eventLogo
  let eventLogoFileName;
  if (uploadedFiles.eventLogo) {
    const { type, path: filePath } = uploadedFiles.eventLogo;
    const fileName = `${req.params.eventCode}_eventLogo${getMimeTypeExtension(uploadedFiles.eventLogo.type)}`;

    try {

      // set if successful
      eventLogoFileName = await eventImagesService.uploadEventLogo({
        fileName,
        type: type,
        filePath
      });

    } catch(err) {

      console.log('err: ' + err);
      return res.status(500).send({ msg: 'unknown error' });

    } finally {

      fs.unlinkSync(uploadedFiles.eventLogo.path);

    }
  }

  // -- eventCoverPhoto
  let eventCoverPhotos: UploadWithCompressingResponse;
  if (uploadedFiles.eventCoverPhoto) {
    let fileName = `${req.params.eventCode}_eventCoverPhoto${getMimeTypeExtension(uploadedFiles.eventCoverPhoto.type)}`;
    try {
      //set if successful
      const { type, path: filePath } = uploadedFiles.eventCoverPhoto;

      eventCoverPhotos = await eventImagesService.uploadEventCoverImage({
        fileName,
        type: type,
        filePath
      });

    } catch(err) {

      next(err);

    } finally {

      fs.unlinkSync(uploadedFiles.eventCoverPhoto.path);

    }
  }

  // -- splashCoverImg
  let splashCoverImgNameFileName;
  if (req.body.splashCoverImg !== 'REMOVE' && uploadedFiles.splashCoverImg) {
    let fileName = `${req.params.eventCode}_eventSplashImage_${generateRandomString()}${getMimeTypeExtension(uploadedFiles.splashCoverImg.type)}`;

    try {
      //set if successful
      const { type, path: filePath } = uploadedFiles.splashCoverImg;

      splashCoverImgNameFileName = await eventImagesService.uploadWithCompression({
        fileName,
        type,
        filePath
      });
    } catch(err) {

      console.log('splashCoverImgNameFileName: ' + err);
      return res.status(500).send({ msg: 'unknown error' });

    } finally {

      fs.unlinkSync(uploadedFiles.splashCoverImg.path);

    }
  }

  let queryObject = { eventId: eventId } as any;
  if (req.body.privacyLevel) {
    queryObject.privacyLevel = req.body.privacyLevel.toLowerCase();
  }
  if (req.body.validEmails) {
    queryObject.validEmails = req.body.validEmails === 'NONE' ? null : req.body.validEmails.split(/[,\s]+/).join(', ');
  }
  if (req.body.eventLaunchDate) {
    const startDate = req.body.eventLaunchDate;
    queryObject.startDate = startDate
    queryObject.endDate = getMaxEventDate(parseISO(startDate), subscriptionTier)
  }
  if (isLaunchNow) {
    const startDate = currentDateSQLFormat();
    queryObject.startDate = startDate
    queryObject.endDate = getMaxEventDate(parseISO(startDate), subscriptionTier)
  }
  if (eventLogoFileName) {
    queryObject.logoImgName = eventLogoFileName;
  }
  if (eventCoverPhotos) {
    queryObject.coverImgName = eventCoverPhotos.coverImgName;
    queryObject.thumbnailImgName = eventCoverPhotos.thumbnailImgName;
  }
  //if setting splash image, remove link
  if (splashCoverImgNameFileName || req.body.splashCoverImg === 'REMOVE') {
    if (splashCoverImgNameFileName) {
      queryObject.splashCoverImgName = splashCoverImgNameFileName;
      queryObject.splashVideoLink = 'NULL';
    } else {
      queryObject.splashCoverImgName = 'NULL';
    }
  }
  //if setting splash link, remove image
  if (req.body.splashVideoLink !== undefined) {
    if (req.body.splashVideoLink) {
      queryObject.splashVideoLink = req.body.splashVideoLink;
      queryObject.splashCoverImgName = 'NULL';
    } else {
      queryObject.splashVideoLink = 'NULL';
    }
  }
  if (req.body.splashContent !== undefined) {
    queryObject.splashContent = req.body.splashContent ? req.body.splashContent : 'NULL';
  }
  if (req.body.presentationFormConfig) {
    queryObject.presentationFormConfig = JSON.stringify(presentationFormConfig);

    //prepare extra fields (assign hashes if necessary) and tags (add/remove as necessary)
    try {
      queryObject.presentationFormConfig = JSON.stringify(await updatePresFormConfigTagsAndExtraFieldHashes(eventId, presentationFormConfig));
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "unknown error" });
    }

    // //assign new hash to any extra field which has no hash
    // presentationFormConfig = assignPresConfigExtraFieldHashes(presentationFormConfig);
    // queryObject.presentationFormConfig = JSON.stringify(presentationFormConfig);

    // //create any new tags from any radio/checkbox field options where field has canFilter
    // let filterTags = getNewPresentationConfigFilterTags(presentationFormConfig);
    // try {
    //   const existingTags: Array<Tag> = await sharedQueries.getExistingTagsFromNames(filterTags.map(tag => tag.tagName), eventId);

    //   //remove existing tag names from addTags
    //   let addTags = filterTags.filter(tag => !existingTags
    //       .filter(existing => existing.type === tag.fieldName)
    //       .map(existing => existing.name)
    //       .includes(tag.tagName)
    //   );

    //   //add new tags to DB
    //   for (let t = 0; t < addTags.length; t++) {
    //     await sharedQueries.saveTag(addTags[t].tagName, addTags[t].fieldName, eventId);
    //   }
    // } catch (err) {
    //   console.log(err);
    //   console.log('Error while performing Query.');
    //   return res.status(500).json({ message: "unknown error" });
    // }
  }

  //update event
  try {
    await sharedQueries.updateEvent(queryObject);
    await sharedQueries.updateDeprecatedEvent(queryObject);
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
    return res.status(500).json({ message: "unknown error" });
  }

  //success
  let successRes = { message: 'success' } as any;
  if (req.body.eventLaunchDate || isLaunchNow) {
    successRes.launchDate = queryObject.startDate + '.000Z';
  }
  if (eventLogoFileName) {
    successRes.logoImgName = eventLogoFileName;
  }
  if (eventCoverPhotos) {
    successRes.coverImgName = eventCoverPhotos.coverImgName;
    successRes.thumbnailImgName = eventCoverPhotos.thumbnailImgName;
  }
  if (splashCoverImgNameFileName) {
    successRes.splashImgName = splashCoverImgNameFileName;

    // remove old splash img file if a new one was set
    await eventImagesService.removeOldEventSplashImgs({
      eventCode: req.params.eventCode,
      fileToKeep: splashCoverImgNameFileName,
    });
  }
  res.json(successRes);
});

// PUT archive event
router.put('/archive/:eventCode',
    checkIsAuthenticated,
    checkIsEventAdmin,
    archiveEvent
);

// PUT unarchive event
router.put('/unarchive/:eventCode',
    checkIsAuthenticated,
    checkIsEventAdmin,
    unarchiveEvent
);

router.put('/:eventId/allowAllDomains', checkIsAuthenticated, async (req, res, next) => {
      const { allowAllDomains } = req.body;
      const { eventId } = req.params;
      const result = await allowAllDomainsForEvent(eventId,allowAllDomains);
      return res.json(result);
});

router.get('/:eventId/emails', checkIsAuthenticated, async (req, res, next) => {
      const { eventId } = req.params
      const emails = await getEmailsForEvent(eventId)
      return res.json(emails);
});

router.post('/:eventId/emails', checkIsAuthenticated, async function (req, res, next) {
      const body = req.body;
      const { eventId } = body
      const result = validateEventEmails(body)
      if (result.error) {
        return res.status(400).json({ message: result.error.message});
      }
      for (const email of body.emails){
        const exists = await getEmailForEvent(eventId,email.toLowerCase())
        if(!exists) await insertEmailForEvent(eventId,email.toLowerCase());
      }
      const event = await getEmailsForEvent(eventId)
      return  res.json(event);
});

router.delete('/:eventId/emails', checkIsAuthenticated, async (req, res, next) => {
  const { eventEmailId } = req.query
  const { eventId } = req.params
  try {
    if (!eventEmailId) return res.status(400).json({message : 'query param eventEmailId is required'});
    await deleteEmailFromEvent(eventEmailId);
    const emails = await getEmailsForEvent(eventId)
    return res.json(emails);
  } catch (e) {
    next(e);
  }
});


const getPresentationFormConfigErrors = function(config: presFormModels.PresentationFormConfig) {
  let formErrs = [];

  // -- general --
  if (!config.general) {
    formErrs.push("missing required field 'general'");
  } else if (!config.general.instructions) {
    formErrs.push("missing required field 'general.instructions'");
  } else if (typeof config.general.instructions !== 'string') {
    formErrs.push("invalid field 'general.instructions'");
  }

  // -- presenterFields --
  if (!config.presenterFields) {
    formErrs.push("missing required field 'presenterFields'");
  }

  // -- presenterTitle
  if (!config?.presenterFields?.presenterTitle) {
    formErrs.push("missing required field 'presenterFields.presenterTitle'");
  } else if (typeof config.presenterFields?.presenterTitle !== 'string') {
    formErrs.push("invalid field 'presenterFields.presenterTitle'");
  }

  // -- maxAddlPresenters --
  if (config.presenterFields.maxAddlPresenters === null ||
    config.presenterFields.maxAddlPresenters === undefined ||
    isNaN(config.presenterFields.maxAddlPresenters) ||
    config.presenterFields.maxAddlPresenters < 0 ||
    config.presenterFields.maxAddlPresenters > 7
  ) {
    formErrs.push(`invalid field 'presenterFields.maxAddlPresenters, must be a number from 0 through 7`);
  }

  // -- level
  if (!config?.presenterFields?.level) {
    formErrs.push("missing required field 'presenterFields.level'");
  } else {
    if (config.presenterFields.level.hash && typeof config.presenterFields.level.hash !== 'string') {
      formErrs.push(`invalid field 'presenterFields.level.hash'`);
    }
    if (config.presenterFields.level.label && typeof config.presenterFields.level.label !== 'string') {
      formErrs.push(`invalid field 'presenterFields.level.label'`);
    }
    if (config.presenterFields.level.description && typeof config.presenterFields.level.description !== 'string') {
      formErrs.push(`invalid field 'presenterFields.level.description'`);
    }
    if(config.presenterFields.level.type && config.presenterFields.level.type !== 'radio') {
      formErrs.push("invalid field 'presenterFields.level.type', must be 'radio'");
    }

    if (config.presenterFields.level.isDisplayed) {
      if (!config.presenterFields.level.label) {
        formErrs.push("invalid field 'presenterFields.level.label', required when field isDisplayed");
      }
      if (!config.presenterFields.level.optionLabels) {
        formErrs.push("missing required field 'presenterFields.level.optionLabels'");
      }
      if (!config.presenterFields.level.optionLabels.length) {
        formErrs.push("invalid field 'presenterFields.level.optionLabels'");
      }
      config.presenterFields.level.optionLabels.forEach((label, idx) => {
        if (typeof label !== 'string') {
          formErrs.push(`invalid field 'presenterFields.level.optionLabels[${idx}]'`);
        }
      })
    }
  }

  // -- major
  if (!config?.presenterFields.major) {
    formErrs.push("missing required field 'presenterFields.major'");
  } else if (config.presenterFields.major.type && config.presenterFields.major.type !== 'text') {
    formErrs.push("invalid field 'presenterFields.major.type', must be 'text'");
  } else if (config.presenterFields.major.isDisplayed) {
    if (!config.presenterFields.major.label) {
      formErrs.push("missing required field 'presenterFields.major.label'");
    } else {
      if (typeof config.presenterFields.major.label !== 'string') {
        formErrs.push("invalid field 'presenterFields.major.label'");
      }
    }
  }

  // -- extraFields
  if (config.presenterFields.extraFields && config.presenterFields.extraFields.length) {
    config.presenterFields.extraFields.forEach((fieldConfig, idx) => {
      if (!fieldConfig.type) {
        formErrs.push(`missing required field 'presenterFields.extraFields[${idx}].type'`);
      } else if (!['text', 'number', 'wysiwyg', 'radio', 'checkbox'].includes(fieldConfig.type)) {
        formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].type'`);
      } else {
        if (fieldConfig.hash && typeof fieldConfig.hash !== 'string') {
          formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].hash`);
        }
        if (fieldConfig.label && typeof fieldConfig.label !== 'string') {
          formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].label`);
        }
        if (fieldConfig.description && typeof fieldConfig.description !== 'string') {
          formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].description`);
        }

        if (['radio', 'checkbox'].includes(fieldConfig.type)) {
          let multiConfig = fieldConfig as presFormModels.CustomMultiSelectFormField;
          if (!multiConfig.optionLabels) {
            formErrs.push(`missing required field 'presenterFields.extraFields[${idx}].optionLabels, required when field is multi-select`);
          } else if (!multiConfig.optionLabels.length) {
            formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].optionLabels`);
          } else {
            multiConfig.optionLabels.forEach((label, opIdx) => {
              if (typeof label !== 'string') {
                formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].optionLabels[${opIdx}]'`);
              }
            });
          }
        }

        if (fieldConfig.isDisplayed && !fieldConfig.label) {
          formErrs.push(`invalid field 'presenterFields.extraFields[${idx}].label, required when field isDisplayed`);
        }
      }
    });
  }

  // -- presentationFields --
  if (!config.presentationFields) {
    formErrs.push("missing required field 'presentationFields'");
  }

  // -- title
  if (!config?.presentationFields?.title) {
    formErrs.push("missing required field 'presentationFields.title'");
  } else {
    if (!config.presentationFields.title.isDisplayed || !config.presentationFields.title.isRequired) {
      formErrs.push("invalid field 'presentationFields.title', isDisplayed and isRequired must be true");
    }
    if (!config.presentationFields.title.label) {
      formErrs.push("missing required field 'presentationFields.title.label'");
    } else {
      if (typeof config.presentationFields.title.label !== 'string') {
        formErrs.push(`invalid field 'presentationFields.title.label'`);
      }
    }
    if (config.presentationFields.title.hash && typeof config.presentationFields.title.hash !== 'string') {
      formErrs.push(`invalid field 'presentationFields.title.hash'`);
    }
    if (config.presentationFields.title.description && typeof config.presentationFields.title.description !== 'string') {
      formErrs.push(`invalid field 'presentationFields.title.description'`);
    }
    if (config.presentationFields.title.type) {
      if (typeof config.presentationFields.title.type !== 'string') {
        formErrs.push(`invalid field 'presentationFields.title.type'`);
      } else if (config.presentationFields.title.type !== 'wysiwyg') {
        formErrs.push(`invalid field 'presentationFields.title.type', must be 'wysiwyg'`);
      }
    }
  }

  // -- abstract
  if (!config?.presentationFields?.abstract) {
    formErrs.push("missing required field 'presentationFields.abstract'");
  } else {
    if (!config.presentationFields.abstract.isDisplayed || !config.presentationFields.abstract.isRequired) {
      formErrs.push("invalid field 'presentationFields.abstract', isDisplayed and isRequired must be true");
    }
    if (!config.presentationFields.abstract.label) {
      formErrs.push("missing required field 'presentationFields.abstract.label'");
    } else {
      if (typeof config.presentationFields.abstract.label !== 'string') {
        formErrs.push(`invalid field 'presentationFields.abstract.label'`);
      }
    }
    if (config.presentationFields.abstract.hash && typeof config.presentationFields.abstract.hash !== 'string') {
      formErrs.push(`invalid field 'presentationFields.abstract.hash'`);
    }
    if (config.presentationFields.abstract.description && typeof config.presentationFields.abstract.description !== 'string') {
      formErrs.push(`invalid field 'presentationFields.abstract.description'`);
    }
    if (config.presentationFields.abstract.type) {
      if (typeof config.presentationFields.abstract.type !== 'string') {
        formErrs.push(`invalid field 'presentationFields.abstract.type'`);
      } else if (config.presentationFields.abstract.type !== 'wysiwyg') {
        formErrs.push(`invalid field 'presentationFields.abstract.type', must be 'wysiwyg'`);
      }
    }
  }

  // -- subjects
  if (!config?.presentationFields?.subjects) {
    formErrs.push("missing required field 'presentationFields.subjects'");
  } else {
    if (config.presentationFields.subjects.hash && typeof config.presentationFields.subjects.hash !== 'string') {
      formErrs.push(`invalid field 'presentationFields.subjects.hash'`);
    }
    if (config.presentationFields.subjects.label && typeof config.presentationFields.subjects.label !== 'string') {
      formErrs.push(`invalid field 'presentationFields.subjects.label'`);
    }
    if (config.presentationFields.subjects.description && typeof config.presentationFields.subjects.description !== 'string') {
      formErrs.push(`invalid field 'presentationFields.subjects.description'`);
    }
    if(config.presentationFields.subjects.type && config.presentationFields.subjects.type !== 'checkbox') {
      formErrs.push("invalid field 'presentationFields.subjects.type', must be 'checkbox'");
    }

    if (config.presentationFields.subjects.isDisplayed) {
      if (!config.presentationFields.subjects.label) {
        formErrs.push("invalid field 'presentationFields.subjects.label', required when field isDisplayed");
      }
      if (!config.presentationFields.subjects.optionLabels) {
        formErrs.push("missing required field 'presentationFields.subjects.optionLabels'");
      }
      if (!config.presentationFields.subjects.optionLabels.length) {
        formErrs.push("invalid field 'presentationFields.subjects.optionLabels'");
      }
      config.presentationFields.subjects.optionLabels.forEach((label, idx) => {
        if (typeof label !== 'string') {
          formErrs.push(`invalid field 'presentationFields.subjects.optionLabels[${idx}]'`);
        }
      })
    }
  }

  // -- extraFields
  if (config.presentationFields.extraFields && config.presentationFields.extraFields.length) {
    config.presentationFields.extraFields.forEach((fieldConfig, idx) => {
      if (!fieldConfig.type) {
        formErrs.push(`missing required field 'presentationFields.extraFields[${idx}].type'`);
      } else if (!['text', 'number', 'wysiwyg', 'radio', 'checkbox'].includes(fieldConfig.type)) {
        formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].type'`);
      } else {
        if (fieldConfig.hash && typeof fieldConfig.hash !== 'string') {
          formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].hash`);
        }
        if (fieldConfig.label && typeof fieldConfig.label !== 'string') {
          formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].label`);
        }
        if (fieldConfig.description && typeof fieldConfig.description !== 'string') {
          formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].description`);
        }

        if (['radio', 'checkbox'].includes(fieldConfig.type)) {
          let multiConfig = fieldConfig as presFormModels.CustomMultiSelectFormField;
          if (!multiConfig.optionLabels) {
            formErrs.push(`missing required field 'presentationFields.extraFields[${idx}].optionLabels, required when field is multi-select`);
          } else if (!multiConfig.optionLabels.length) {
            formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].optionLabels`);
          } else {
            multiConfig.optionLabels.forEach((label, opIdx) => {
              if (typeof label !== 'string') {
                formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].optionLabels[${opIdx}]'`);
              }
            });
          }
        }

        if (fieldConfig.isDisplayed && !fieldConfig.label) {
          formErrs.push(`invalid field 'presentationFields.extraFields[${idx}].label, required when field isDisplayed`);
        }
      }
    });
  }

  // -- mediaFields --
  if (!config.mediaFields) {
    formErrs.push("missing required field 'mediaFields'");
  }

  // -- poster
  if (!config?.mediaFields?.poster) {
    formErrs.push("missing required field 'mediaFields.poster'");
  } else {
    if (config.mediaFields.poster.posterUploadDescription && typeof config.mediaFields.poster.posterUploadDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.poster.uploadDescription'");
    }
    if (config.mediaFields.poster.voiceoverVideoLinkDescription && typeof config.mediaFields.poster.voiceoverVideoLinkDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.poster.videoDescription'");
    }

    if (config.mediaFields.poster.label && typeof config.mediaFields.poster.label !== 'string') {
      formErrs.push("invalid field 'mediaFields.poster.label'");
    }
    if (config.mediaFields.poster.isDisplayed && !config.mediaFields.poster.label) {
      formErrs.push("invalid field 'mediaFields.poster.label', required when poster isDisplayed'");
    }
  }

  // -- oral
  if (!config?.mediaFields?.oral) {
    formErrs.push("missing required field 'mediaFields.oral'");
  } else {
    if (config.mediaFields.oral.presentationVideoLinkDescription && typeof config.mediaFields.oral.presentationVideoLinkDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.oral.presentationVideoLinkDescription'");
    }
    if (config.mediaFields.oral.slidesUploadDescription && typeof config.mediaFields.oral.slidesUploadDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.oral.slidesUploadDescription'");
    }

    if (config.mediaFields.oral.label && typeof config.mediaFields.oral.label !== 'string') {
      formErrs.push("invalid field 'mediaFields.oral.label'");
    }
    if (config.mediaFields.oral.isDisplayed && !config.mediaFields.oral.label) {
      formErrs.push("invalid field 'mediaFields.oral.label', required when oral isDisplayed'");
    }
  }

  // -- exhibition
  if (!config?.mediaFields?.exhibition) {
    formErrs.push("missing required field 'mediaFields.exhibition'");
  } else {
    if (config.mediaFields.exhibition.presentationVideoLinkDescription &&
        typeof config.mediaFields.exhibition.presentationVideoLinkDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.exhibition.videoDescription'");
    }
    if (config.mediaFields.exhibition.voiceoverVideoLinkDescription &&
        typeof config.mediaFields.exhibition.voiceoverVideoLinkDescription !== 'string') {
      formErrs.push("invalid field 'mediaFields.exhibition.videoCommentaryDescription'");
    }

    if (config.mediaFields.exhibition.label && typeof config.mediaFields.exhibition.label !== 'string') {
      formErrs.push("invalid field 'mediaFields.exhibition.label'");
    }
    if (config.mediaFields.exhibition.isDisplayed && !config.mediaFields.exhibition.label) {
      formErrs.push("invalid field 'mediaFields.exhibition.label', required when exhibition isDisplayed'");
    }
  }

  return formErrs;
}

const assignPresConfigExtraFieldHashes = function(config: presFormModels.PresentationFormConfig): presFormModels.PresentationFormConfig {
  //build map/object from any existing extra field hashes
  let currentHashes = {};

  //presenter extra fields
  if (config.presenterFields.extraFields && config.presenterFields.extraFields.length) {
    config.presenterFields.extraFields.forEach(fieldConfig => {
      if (fieldConfig.hash) {
        currentHashes[fieldConfig.hash] = true;
      }
    })
  }

  //presentation extra fields
  if (config.presentationFields.extraFields && config.presentationFields.extraFields.length) {
    config.presentationFields.extraFields.forEach(fieldConfig => {
      if (fieldConfig.hash) {
        currentHashes[fieldConfig.hash] = true;
      }
    })
  }

  // -- add unique hash to extra fields that don't have one --

  //presenter extra fields
  if (config.presenterFields.extraFields && config.presenterFields.extraFields.length) {
    config.presenterFields.extraFields.forEach(fieldConfig => {
      if (!fieldConfig.hash) {
        fieldConfig.hash = uniqueString();
        while (currentHashes[fieldConfig.hash]) {
          fieldConfig.hash = uniqueString();
        }
        currentHashes[fieldConfig.hash] = true;
      }
    })
  }

  //presentation extra fields
  if (config.presentationFields.extraFields && config.presentationFields.extraFields.length) {
    config.presentationFields.extraFields.forEach(fieldConfig => {
      if (!fieldConfig.hash) {
        fieldConfig.hash = uniqueString();
        while (currentHashes[fieldConfig.hash]) {
          fieldConfig.hash = uniqueString();
        }
        currentHashes[fieldConfig.hash] = true;
      }
    })
  }

  return config;
}

const getNewPresentationConfigFilterTags = function(config: presFormModels.PresentationFormConfig) {
  let addTags = [];

  // -- presenter level
  if (config.presenterFields.level.isDisplayed && config.presenterFields.level.canFilter) {
    addTags.push(...config.presenterFields.level.optionLabels.map(option => {
      return { tagName: option, fieldName: config.presenterFields.level.label }
    }));
  }

  // -- presenter extra fields
  addTags.push(...config.presenterFields.extraFields
    .filter(extraField => extraField.isDisplayed && ['radio', 'checkbox'].includes(extraField.type) &&
      (extraField as presFormModels.CustomMultiSelectFormField).canFilter)
    .map((extraField: presFormModels.CustomMultiSelectFormField) => extraField.optionLabels.map(option => {
      return { tagName: option, fieldName: extraField.label }
    }))
    .reduce((vals, labels) => {
      vals.push(...labels);
      return vals;
    }, [])
  );

  // -- presentation subjects
  if (config.presentationFields.subjects.isDisplayed && config.presentationFields.subjects.canFilter) {
    addTags.push(...config.presentationFields.subjects.optionLabels.map(option => {
      return { tagName: option, fieldName: config.presentationFields.subjects.label }
    }));
  }

  // -- presentation extra fields
  addTags.push(...config.presentationFields.extraFields
    .filter(extraField => extraField.isDisplayed && ['radio', 'checkbox'].includes(extraField.type) &&
      (extraField as presFormModels.CustomMultiSelectFormField).canFilter)
    .map((extraField: presFormModels.CustomMultiSelectFormField) => extraField.optionLabels.map(option => {
      return { tagName: option, fieldName: extraField.label }
    }))
    .reduce((vals, labels) => {
      vals.push(...labels);
      return vals;
    }, [])
  );

  return addTags;
}

//can be used on creating an event (passing default config) to prepare tags, also used internally on form config update
export const updatePresFormConfigTagsAndExtraFieldHashes = async function(eventId: number, presentationFormConfig: presFormModels.PresentationFormConfig) {
  //assign new hash to any extra field which has no hash
  presentationFormConfig = assignPresConfigExtraFieldHashes(presentationFormConfig);

  //create any new tags from any radio/checkbox field options where field has canFilter
  let filterTags = getNewPresentationConfigFilterTags(presentationFormConfig);

  const existingTags: Array<Tag> = await sharedQueries.getExistingTags(eventId);

  //remove existing tag names from addTags
  let addTags = filterTags.filter(tag => !existingTags
      .filter(existing => existing.type === tag.fieldName)
      .map(existing => existing.name)
      .includes(tag.tagName)
  );

  //add new tags to DB
  for (let t = 0; t < addTags.length; t++) {
    await sharedQueries.saveTag(addTags[t].tagName, addTags[t].fieldName, eventId);
  }

  return presentationFormConfig;
}

module.exports = router;
