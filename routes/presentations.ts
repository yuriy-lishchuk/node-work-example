import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

var express = require('express');
var router = express.Router();
var cors = require('cors')
router.use(cors());
const debug = require('debug')('server:server');

//utils
import * as _ from 'lodash';
const PDF2Pic = require('pdf2pic');
const uniqueString = require('unique-string');

//formidable form handler
const formidable = require('formidable');

// Google Cloud Storage
const Cloud = require('@google-cloud/storage');
const { Storage } = Cloud;
// -- upload
const uploadServiceKey = path.join(__dirname, 'google_cloud_sa_uploader_keys.json');
const gCloudStorageBucket = new Storage({
  keyFilename: uploadServiceKey,
  projectId: 'green-network-233421',
}).bucket('fg1-submissions');
// -- download
const downloadServiceKey = path.join(__dirname, 'google_cloud_sa_uploader_keys.json');
const gCloudDownloadBucket = new Storage({
  keyFilename: downloadServiceKey,
  projectId: 'green-network-233421',
}).bucket('fg1-submissions');
const ttlSecondsForSignedURLs = 300;

const decode = require('decode-html');

import * as submissionFormModels from '../models/presentationFormConfig';
import * as submissionDataModels from '../models/presentationFormData';
import * as sharedQueries from '../shared-queries';
import { isValidYouTubeLink, isValidEmail, getYouTubeVideoIDFromLink,
  gcStorageUploadFromFormidableFile, generateReadGCloudBucketFileSignedURL } from '../functions';

import {
  checkIsAuthenticatedPresentations,
  checkIsAuthenticatedSinglePresentation,
  checkIsAuthenticated,
  checkIsEventAdmin,
  softCheckIsEventAdmin,
  softCheckIsAuthenticated
} from '../authentication-middleware';
import { Claims, Event, GetPresentationsQueryParams, Presentation } from '../models';
import { getSendGridClient } from '../lib/sendgrid';
import { getSingleEventGuard, getClaimsFromResponse, isUserBlockedFromPresentation } from '../middlewares';
import { getOneEventByHashCodeOrID } from '../auth-queries';
import { getPresentations } from '../queries';
import { getSubscriptionByEventId } from '../shared-queries';
import { NotFoundException } from '../helpers';
import { gePresentationsRepository, getSubscriptionRepository } from '../repositories';

// Authorization:
// None
router.post('/', async function (req, res, next) {
  const fileUploadMBLimit = 10;

  //validate request type via header
  if (!req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).json({ msg: 'invalid form type' });
  }

  //validate query param(s)
  if (!req.query?.eventId) {
    return res.status(400).json({ msg: "missing required query param 'eventId'" });
  }

  //handle form/files
  const fileForm = formidable({
    maxFileSize: fileUploadMBLimit * 1024 * 1024,
    keepExtensions: true
  });
  let uploadedFiles: any = await new Promise(resolve => {
    fileForm.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({ message: `file exceeds limit of ${fileUploadMBLimit}MB`});
      }

      //manually set req.body
      req.body = fields;

      //resolve any files
      resolve(files);
    });
  });

  //parse submission form data from form field
  let submissionData: submissionDataModels.PresentationFormData;
  try {
    submissionData = JSON.parse(req.body.submissionData);
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission data' });
  }

  //get event presentation config
  let eventFormConfig: submissionFormModels.PresentationFormConfig;
  try {
    const dbEventResponse = (await sharedQueries.getEventByID(req.query.eventId)) as any;
    if (!dbEventResponse || dbEventResponse.presentationFormConfig === undefined) {
      throw Error();
    }
    eventFormConfig = JSON.parse(dbEventResponse.presentationFormConfig);
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission data' });
  }

  //use default config if none provided by event
  if (!eventFormConfig) {
    eventFormConfig = {
      general: { ...submissionFormModels.DEFAULT_GENERAL_CONFIG },
      presenterFields: { ...submissionFormModels.DEFAULT_PRESENTER_FIELDS_CONFIG },
      presentationFields: { ...submissionFormModels.DEFAULT_PRESENTATION_FIELDS_CONFIG },
      mediaFields: { ...submissionFormModels.DEFAULT_MEDIA_FIELDS_CONFIG }
    }
  }

  // validate request
  try {
    let formErrs = await getPresentationFormErrors(submissionData, eventFormConfig, uploadedFiles, req.query.eventId, false);
    if (formErrs.length) {
      console.log(formErrs);
      return res.status(400).json({ msg: 'invalid form submission', errors: formErrs });
    }
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission, unknown error' });
  }

  // -- valid request --

  //get valid extra field values
  let submissionFormExtraValues = getValidSubmissionFormExtraValues(submissionData, eventFormConfig);

  //insert presentation to DB (excluding poster if present)
  let presHash, presId;
  do {
    presHash = uniqueString();
    try {
      let dbResponse: any = await sharedQueries.insertPresentation(
        submissionData.presentationData.title,
        submissionData.presentationData.abstract,
        JSON.stringify(submissionData.presentationData.subjects),
        submissionData.presentationType,
        submissionData.presentationType !== 'oral' && (submissionData.presentationMediaData as any).voiceoverVideoLink ?
          getYouTubeVideoIDFromLink((submissionData.presentationMediaData as any).voiceoverVideoLink) :
          null,
        submissionData.presentationType !== 'oral' ?
          (submissionData.presentationMediaData as any).voiceoverVideoLink : null,
        submissionData.presentationType !== 'poster' ?
          getYouTubeVideoIDFromLink((submissionData.presentationMediaData as any).presentationVideoLink) :
          null,
        submissionData.presentationType !== 'poster' ?
          (submissionData.presentationMediaData as any).presentationVideoLink : null,
        presHash,
        submissionData.presentationType === 'poster' ? presHash : '',  //handle file upload after row inserted and hash is secured
        submissionData.presentationType === 'oral' && uploadedFiles.slides ? presHash : '',  //handle file upload after row inserted and hash is secured
        req.query.eventId,
        req.query.eventId,
        submissionFormExtraValues,
        submissionData.presenterData
      );
      presId = dbResponse.insertId;
    } catch(err) {
      console.log(JSON.stringify(err, null, 2));

      //check for duplicate hash error
      if (err.code === 'ER_DUP_ENTRY' && err.sqlMessage.indexOf('hash_UNIQUE') >= 0) {
        presHash = null;
      } else {
        return res.status(500).json({ msg: 'unknown error' });
      }
    }
  } while (!presHash);

  // -- handle any file upload(s)

  // -- poster
  if (uploadedFiles.poster) {
    try {
      await gcStorageUploadFromFormidableFile(`${presHash}.pdf`, uploadedFiles.poster, gCloudStorageBucket);
    } catch(err) {
      console.log('err: ' + err);
      fs.unlinkSync(uploadedFiles.poster.path);

      //rollback insert
      await sharedQueries.hardDeletePresentation(presId);

      return res.status(500).send({ msg: 'unknown error' });
    }

    // -- poster thumbnail
    let thumbnailFile;
    try {
      // create thumbnail (pdf to jpg)
      const pdf2pic = new PDF2Pic({
        savename: presHash,
        savedir: os.tmpdir(),
        format: "jpg"
      });
      await pdf2pic.convert(uploadedFiles.poster.path);

      //make a pseudo formidable file
      thumbnailFile = {
        type: 'image/jpeg',
        path: `${os.tmpdir()}/${presHash}_1.jpg`
      }

      await gcStorageUploadFromFormidableFile(`${presHash}.jpg`, thumbnailFile, gCloudStorageBucket);
      fs.unlinkSync(uploadedFiles.poster.path);
      fs.unlinkSync(thumbnailFile.path);
    } catch(err) {
      console.log('err: ' + err);
      fs.unlinkSync(uploadedFiles.poster.path);
      fs.unlinkSync(thumbnailFile.path);

      //rollback insert
      await sharedQueries.hardDeletePresentation(presId);

      return res.status(500).send({ msg: 'unknown error' });
    }
  }

  // -- add presentation tags --
  let filterTags = getSubmissionFormFilterFieldTags(submissionData, eventFormConfig);
  let filterTagKeys = Object.keys(filterTags);
  for (let k = 0; k < filterTagKeys.length; k++) {
    let fieldLabel = filterTagKeys[k];
    for (let t = 0; t < filterTags[fieldLabel].length; t++) {
      let tagName = filterTags[fieldLabel][t];
      try {
        const tag: any = await sharedQueries.getEventFieldTagId(req.query.eventId, tagName, fieldLabel);
        if (!tag) {
          throw Error(`tag not found with name '${tagName}'`);
        }

        await sharedQueries.savePresentationTag({
          presentationId: presId,
          tagId: tag.tagId
        });
      } catch(err) {
        console.log('err: ' + err);

        //rollback insert
        await sharedQueries.hardDeletePresentation(presId);

        return res.status(500).send({ msg: 'unknown error' });
      }
    }
  }

  // -- success --

  // -- send confirmation email (without awaiting result)
  let presenterEmails = submissionData.presenterData.filter(presenter => presenter.email).map(presenter => presenter.email);
  let plainTextTitle = decode(submissionData.presentationData.title.replace(/<[^>]+>|&nbsp;/g, ' ').replace(/\s{2,}/g, ' '));
  sendSubmissionConfirmationEmail(presenterEmails, plainTextTitle);

  // -- send response
  res.json({ msg: 'success' });
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// If private university:
// User must be logged in to that university or have a university hash
router.get('/', getSingleEventGuard(req => req.query.eventCodeOrHash), softCheckIsAuthenticated, checkIsAuthenticatedPresentations, softCheckIsEventAdmin, async function (req, res, next) {
  const queryStr = req.query.q || '';
  const { eventCodeOrHash } = req.query

  let presentations;
  try {
    const { eventId , subscriptionId } : Event = await getOneEventByHashCodeOrID(eventCodeOrHash);
    const subscription = await getSubscriptionRepository().getSubscriptionById(subscriptionId)

    const { presentationsLimit } = subscription.subscriptionTier;

    presentations = await getPresentations({
      eventId,
      hash : eventCodeOrHash,
      query : queryStr,
      limit : presentationsLimit
    });

    let outputPresentations = [];
    for (let presentation of presentations) {
      let pres = {
        presentationId: presentation.presentationId,
        institutionId: presentation.institutionId,
        eventId: presentation.eventId,
        institutionSetUniquePresentationId: presentation.institutionSetUniquePresentationId,
        hash: presentation.hash,
        createDate: presentation.createDate,
        title: presentation.title,
        abstract: presentation.abstract,
        subjects: presentation.subjects ? JSON.parse(presentation.subjects) : null,
        voiceoverId: presentation.voiceoverId,
        originalVoiceoverLink: presentation.originalVoiceoverLink,
        presentationVideoId: presentation.presentationVideoId,
        originalPresentationVideoLink: presentation.originalPresentationVideoLink,
        posterId: presentation.posterId,
        slidesId: presentation.slidesId,
        presentationType: presentation.presentationType,
        posterType: presentation.posterType,
        primaryPresenterBiography: presentation.primaryPresenterBiography,
      } as Presentation;

      //tags
      if (presentation.tags) {
        pres.tags = JSON.parse(presentation.tags);
      }

      //extraValues
      if (presentation.submissionFormExtraValues) {
        pres.extraValues = JSON.parse(presentation.submissionFormExtraValues);
      }

      //build presenters
      let presenters = [];
      for (let p = 1; p <= 8; p++) {
        let presenter: any = {};
        if (!presentation[`presenter` + (p > 1 ? p : '') + `FirstName`]) {
          continue;
        }
        presenter.firstName = presentation[`presenter` + (p > 1 ? p : '') + `FirstName`];
        presenter.lastName = presentation[`presenter` + (p > 1 ? p : '') + `LastName`];
        if (!res.locals?.isEventAdmin) {
          presenters.push(presenter);
          continue;
        }
        presenter.email = presentation[`presenter` + (p > 1 ? p : '') + `Email`];
        presenter.level = presentation[`presenter` + (p > 1 ? p : '') + `Year`];
        presenter.major = presentation[`presenter` + (p > 1 ? p : '') + `Major`];
        presenters.push(presenter);
      }
      pres.presenters = presenters;

      //add signed URL(s) for time-bound download access
      switch (pres.presentationType) {
        case 'poster':
          //add signed URL for poster/pdf and thumbnail
          pres.posterFileURL = await generateReadGCloudBucketFileSignedURL(gCloudDownloadBucket, `${pres.posterId}.pdf`, ttlSecondsForSignedURLs);
          pres.posterThumbnailImageURL = await generateReadGCloudBucketFileSignedURL(gCloudDownloadBucket, `${pres.posterId}.jpg`, ttlSecondsForSignedURLs);
          break;
        case 'oral':
          //add signed URL for poster/pdf and thumbnail
          if (pres.slidesId) {
            pres.slidesFileURL = await generateReadGCloudBucketFileSignedURL(gCloudDownloadBucket, `${pres.slidesId}.pdf`, ttlSecondsForSignedURLs);
            pres.posterThumbnailImageURL = await generateReadGCloudBucketFileSignedURL(gCloudDownloadBucket, `${pres.slidesId}.jpg`, ttlSecondsForSignedURLs);
          }
          break;
      }

      //remove sensitive fields if not admin
      if (!res.locals.isEventAdmin) {
      }

      outputPresentations.push(pres);
    }
    res.json(outputPresentations);
  }
  catch (err) {
    next(err);
  }
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in or have a hash
// If logged in, that user must be associated by event with this presentation's event
// If hash, that hash must be associated with this presentation
router.get('/single', softCheckIsAuthenticated, softCheckIsEventAdmin, checkIsAuthenticatedSinglePresentation, isUserBlockedFromPresentation, async function (req, res, next) {
  let dbPres;
  try {
    dbPres = await sharedQueries.getSinglePresentationFromId(req.query.presentationIdOrHash);
    if (!dbPres) {
      dbPres = await sharedQueries.getSinglePresentationFromHash(req.query.presentationIdOrHash);
    }
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
  }

  if (!dbPres) {
    return res.status(404).json({ msg: 'not found'});
  }

  let outputPresentation = {
    presentationId: dbPres.presentationId,
    institutionId: dbPres.institutionId,
    eventId: dbPres.eventId,
    institutionSetUniquePresentationId: dbPres.institutionSetUniquePresentationId,
    hash: dbPres.hash,
    createDate: dbPres.createDate,
    title: dbPres.title,
    abstract: dbPres.abstract,
    subjects: dbPres.subjects ? JSON.parse(dbPres.subjects) : null,
    voiceoverId: dbPres.voiceoverId,
    originalVoiceoverLink: dbPres.originalVoiceoverLink,
    presentationVideoId: dbPres.presentationVideoId,
    originalPresentationVideoLink: dbPres.originalPresentationVideoLink,
    posterId: dbPres.posterId,
    slidesId: dbPres.slidesId,
    presentationType: dbPres.presentationType,
    posterType: dbPres.posterType,
    customFields: dbPres.customFields,
    primaryPresenterBiography: dbPres.primaryPresenterBiography,
  } as Presentation;

  //tags
  if (dbPres.tags) {
    outputPresentation.tags = JSON.parse(dbPres.tags);
  }

  //extraValues
  if (dbPres.submissionFormExtraValues) {
    outputPresentation.extraValues = JSON.parse(dbPres.submissionFormExtraValues);
  }

  //build presenters
  let presenters = [];
  for (let p = 1; p <= 8; p++) {
    let presenter: any = {};
    if (!dbPres[`presenter` + (p > 1 ? p : '') + `FirstName`]) {
      continue;
    }
    presenter.firstName = dbPres[`presenter` + (p > 1 ? p : '') + `FirstName`];
    presenter.lastName = dbPres[`presenter` + (p > 1 ? p : '') + `LastName`];
    if (!res.locals?.isEventAdmin) {
      presenters.push(presenter);
      continue;
    }
    presenter.email = dbPres[`presenter` + (p > 1 ? p : '') + `Email`];
    presenter.level = dbPres[`presenter` + (p > 1 ? p : '') + `Year`];
    presenter.major = dbPres[`presenter` + (p > 1 ? p : '') + `Major`];
    presenters.push(presenter);
  }
  outputPresentation.presenters = presenters;

  //add signed URL(s) for time-bound download access
  switch (outputPresentation.presentationType) {
    case 'poster':
      //add signed URL for poster/pdf and thumbnail
      outputPresentation.posterFileURL = await generateReadGCloudBucketFileSignedURL(
        gCloudDownloadBucket,
        `${outputPresentation.posterId}.pdf`,
        ttlSecondsForSignedURLs
      );
      outputPresentation.posterThumbnailImageURL = await generateReadGCloudBucketFileSignedURL(
        gCloudDownloadBucket,
        `${outputPresentation.posterId}.jpg`,
        ttlSecondsForSignedURLs
      );
      break;
    case 'oral':
      //add signed URL for poster/pdf and thumbnail
      if (outputPresentation.slidesId) {
        outputPresentation.slidesFileURL = await generateReadGCloudBucketFileSignedURL(
          gCloudDownloadBucket,
          `${outputPresentation.slidesId}.pdf`,
          ttlSecondsForSignedURLs
        );
        outputPresentation.posterThumbnailImageURL = await generateReadGCloudBucketFileSignedURL(
          gCloudDownloadBucket,
          `${outputPresentation.slidesId}.pdf`,
          ttlSecondsForSignedURLs
        );
      }

      break;
  }
  res.json(outputPresentation);
});

// Authorization: None
router.get('/is-valid-presentation-hash', async function (req, res, next) {
  try {
    let presentationId = await sharedQueries.getIsValidPresentationHash(req.query.hash);
    if (presentationId) {
      res.json(true);
    } else {
      res.json(false);
    }
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
  }
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User must be admin
// Presentation must exist under admin's institutionId (from JWT)
router.put('/:presentationHash', checkIsAuthenticated, checkIsEventAdmin, async function (req, res, next) {
  const fileUploadMBLimit = 10;

  //validate request type via header
  if (!req.headers['content-type'].startsWith('multipart/form-data')) {
    return res.status(400).json({ msg: 'invalid form type' });
  }

  //validate query param(s)
  if (!req.query?.eventId) {
    return res.status(400).json({ msg: "missing required query param 'eventId'" });
  }

  //handle form fields (files not currently updatable)
  const fileForm = formidable();
  let uploadedFiles: any = await new Promise(resolve => {
    fileForm.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({ message: `file exceeds limit of ${fileUploadMBLimit}MB`});
      }

      //manually set req.body
      req.body = fields;

      //resolve any files
      resolve(files);
    });
  });

  //parse submission form data from form field
  let submissionData: submissionDataModels.PresentationFormData;
  try {
    submissionData = JSON.parse(req.body.submissionData);
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission data' });
  }

  //get event presentation config
  let eventFormConfig: submissionFormModels.PresentationFormConfig;
  try {
    const dbEventResponse = (await sharedQueries.getEventByID(req.query.eventId)) as any;
    if (!dbEventResponse || dbEventResponse.presentationFormConfig === undefined) {
      throw Error();
    }
    eventFormConfig = JSON.parse(dbEventResponse.presentationFormConfig);
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission data' });
  }

  //use default config if none provided by event
  if (!eventFormConfig) {
    eventFormConfig = {
      general: { ...submissionFormModels.DEFAULT_GENERAL_CONFIG },
      presenterFields: { ...submissionFormModels.DEFAULT_PRESENTER_FIELDS_CONFIG },
      presentationFields: { ...submissionFormModels.DEFAULT_PRESENTATION_FIELDS_CONFIG },
      mediaFields: { ...submissionFormModels.DEFAULT_MEDIA_FIELDS_CONFIG }
    }
  }

  //ensure given presentation exists with given event
  let dbResponse;
  try {
    dbResponse = await sharedQueries.getPresentationIdByHashAndEventId(req.params.presentationHash, req.body.eventId || req.query.eventId);
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
    res.status(500).json({ message: "unknown error" });
    return;
  }
  if (!dbResponse?.presentationId) {
    res.status(404).json({ message: "presentation not found" });
    return;
  }
  const presentationId = dbResponse.presentationId;

  // validate request data
  try {
    let formErrs = await getPresentationFormErrors(submissionData, eventFormConfig, uploadedFiles, req.query.eventId, true);
    if (formErrs.length) {
      return res.status(400).json({ msg: 'invalid form submission', errors: formErrs });
    }
  } catch(err) {
    console.log(err);
    return res.status(400).json({ msg: 'invalid form submission, unknown error' });
  }

  // -- valid request --

  //get valid extra field values
  let submissionFormExtraValues = getValidSubmissionFormExtraValues(submissionData, eventFormConfig);

  //update presentation
  try {
    dbResponse = await sharedQueries.updatePresentation(
      presentationId,
      submissionData.presentationData.title,
      submissionData.presentationData.abstract,
      JSON.stringify(submissionData.presentationData.subjects),
      submissionFormExtraValues,
      submissionData.presenterData
    );
  } catch (err) {
    console.log(err);
    console.log('Error while performing Query.');
    res.status(500).json({ message: "unknown error" });
    return;
  }

  // -- update presentation tags --

  //get existing presentation tags
  try {
    dbResponse = await sharedQueries.getPresentationFieldTags(presentationId)
  } catch(err) {
    console.log(err);
    console.log('Error while performing Query.');
    res.status(500).json({ message: "unknown error" });
    return;
  }
  const existingTags = dbResponse;

  //new tags from request submission data
  let filterTags = getSubmissionFormFilterFieldTags(submissionData, eventFormConfig);

  //delete existing tags if now absent
  let deleteTagIds = existingTags
    .filter(existingTag => !filterTags[existingTag.type] || !filterTags[existingTag.type].includes(existingTag.name))
    .map(existingTag => existingTag.tagId);
  if (deleteTagIds.length) {
    try {
      dbResponse = await sharedQueries.deletePresentationTagsById(presentationId, deleteTagIds)
    } catch(err) {
      console.log(err);
      console.log('Error while performing Query.');
      res.status(500).json({ message: "unknown error" });
      return;
    }
  }

  //add tags if new
  let filterTagKeys = Object.keys(filterTags);
  for (let k = 0; k < filterTagKeys.length; k++) {
    let fieldLabel = filterTagKeys[k];
    for (let t = 0; t < filterTags[fieldLabel].length; t++) {
      let tagName = filterTags[fieldLabel][t];
      try {
        const tag: any = await sharedQueries.getEventFieldTagId(req.query.eventId, tagName, fieldLabel);
        if (!tag) {
          throw Error(`tag not found with name '${tagName}' w/type '${fieldLabel}' for event ID ${req.query.eventId}`);
        }

        if (!existingTags.filter(existingTag => existingTag.type === fieldLabel).map(existingTag => existingTag.name).includes(tagName)) {
          await sharedQueries.savePresentationTag({
            presentationId: presentationId,
            tagId: tag.tagId
          });
        }
      } catch(err) {
        console.log('err: ' + err);

        return res.status(500).send({ msg: 'unknown error' });
      }
    }
  }

  //success
  res.json({ message: 'success' });
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User must be admin
router.delete('/:presentationHash', checkIsAuthenticated, checkIsEventAdmin, async function (req, res, next) {
    // -- validate request --

    // -- eventId (request query param)
    if (isNaN(req.query.eventId) || Number(req.query.eventId) < 1) {
      res.status(400).json({ message: "invalid eventId" });
      return;
    }
    //ensure given presentation exists
    let dbResponse = await sharedQueries.getPresentationIdByHashAndEventId(req.params.presentationHash, req.query.eventId);
    if (!dbResponse?.presentationId) {
      res.status(404).json({ message: "presentation not found" });
      return;
    }

    // -- request is VALID --

    //delete presentation
    try {
      await sharedQueries.deletePresentation(dbResponse.presentationId);
    } catch (err) {
      console.log(err);
      console.log('Error while performing Query.');
      res.status(500).json({ message: "unknown error" });
      return;
    }

    //success
    res.json({ message: 'success' });
});

async function sendSubmissionConfirmationEmail(presenterEmails: string[], title: string) {
  const sgMail = getSendGridClient();
  try {
    for (let x = 0; x < presenterEmails.length; x++) {
      const email = {
        to: presenterEmails[x],
        from: {
          email: 'no-reply@foragerone.com',
          name: 'Symposium by ForagerOne'
        },
        templateId: 'd-8ade901834b44f26b2e424cb9332c37a',
        dynamicTemplateData: {
          'title': title
        }
      };

      await sgMail.send(email);
    }
  } catch(error) {
    console.log(error);
  }
}

const getPresentationFormErrors = async function(
  pres: submissionDataModels.PresentationFormData,
  eventFormConfig: submissionFormModels.PresentationFormConfig,
  uploadedFiles: any,
  eventId: number,
  isEditMode: boolean
) {
  let formErrs = [];

  if (!pres || !eventId) {
    formErrs.push('invalid form submission, missing request data');
    return formErrs;
  }

  // -- validate mandatory required field values --

  // -- first presenter
  if (pres.presenterData && pres.presenterData[0]) {
    if (!pres.presenterData[0]?.firstName) {
      formErrs.push("missing required field 'presenterData[0].firstName'");
    } else if(typeof pres.presenterData[0].firstName !== 'string') {
      formErrs.push("invalid field 'presenterData[0].firstName'");
    }

    // -- first presenter last name
    if (!pres.presenterData[0]?.lastName) {
      formErrs.push("missing required field 'presenterData[0].lastName'");
    } else if (typeof pres.presenterData[0].lastName !== 'string') {
      formErrs.push("invalid field 'presenterData[0].lastName'");
    }

    // -- first presenter email
    if (!pres.presenterData[0]?.email) {
      formErrs.push("missing required field 'presenterData[0].email'");
    } else if (typeof pres.presenterData[0].email !== 'string' || !isValidEmail(pres.presenterData[0].email)) {
      formErrs.push("invalid field 'presenterData[0].email'");
    }
  } else {
    formErrs.push("missing required field 'presenterData'");
  }

  // -- title
  if (!pres.presentationData?.title) {
    formErrs.push("missing required field 'presentationData.title'");
  } else if (typeof pres.presentationData.title !== 'string') {
    formErrs.push("invalid field 'presentationData.title'");
  }

  // -- abstract
  if (!pres.presentationData?.abstract) {
    formErrs.push("missing required field 'presentationData.abstract'");
  } else if (typeof pres.presentationData.abstract !== 'string') {
    formErrs.push("invalid field 'presentationData.abstract'");
  }

  // -- presentation media
  if (!isEditMode) {
    if (!pres.presentationType) {
      formErrs.push("missing required field 'presentationType'");
    } else if (!pres.presentationMediaData) {
      formErrs.push("missing required field 'presentationMediaData'");
    } else if (typeof pres.presentationType !== 'string') {
      formErrs.push("invalid field 'presentationType'");
    } else {
      switch(pres.presentationType) {
        case 'poster':
          let posterMedia = pres.presentationMediaData as submissionDataModels.PosterPresentationMediaData;
          if (!uploadedFiles.poster) {
            formErrs.push("missing required file 'poster'");
          }
          if (posterMedia.voiceoverVideoLink &&
                (typeof posterMedia.voiceoverVideoLink !== 'string' || !isValidYouTubeLink(posterMedia.voiceoverVideoLink))) {
            formErrs.push("invalid field 'presentationMediaData.voiceoverVideoLink'");
          }
          break;
        case 'oral':
          let oralMedia = pres.presentationMediaData as submissionDataModels.OralPresentationMediaData;
          if (!oralMedia.presentationVideoLink) {
            formErrs.push("missing required field 'presentationMediaData.presentationVideoLink'");
          } else if (typeof oralMedia.presentationVideoLink !== 'string' || !isValidYouTubeLink(oralMedia.presentationVideoLink)) {
            formErrs.push("invalid field 'presentationMediaData.presentationVideoLink'");
          }
          break;
        case 'exhibition':
          let demoMedia = pres.presentationMediaData as submissionDataModels.ExhibitionPresentationMediaData;
          if (!demoMedia.presentationVideoLink) {
            formErrs.push("missing required field 'presentationMediaData.presentationVideoLink'");
          } else if (typeof demoMedia.presentationVideoLink !== 'string' || !isValidYouTubeLink(demoMedia.presentationVideoLink)) {
            formErrs.push("invalid field 'presentationMediaData.presentationVideoLink'");
          }
          if (demoMedia.voiceoverVideoLink &&
              (typeof demoMedia.voiceoverVideoLink !== 'string' || !isValidYouTubeLink(demoMedia.voiceoverVideoLink))) {
            formErrs.push("invalid field 'presentationMediaData.voiceoverVideoLink'");
          }
          break;
        default:
          formErrs.push("invalid field 'presentationType'");
      }
    }
  }

  // -- short-circuit validation if any errors on above mandatory fields
  if (formErrs.length) {
    return formErrs;
  }

  // -- validate mandatory required fields based on custom configuration --

  // -- presenter data --
  let validPresentersCount = 1;
  if (eventFormConfig.presenterFields.maxAddlPresenters && pres.presenterData.length > 1) {
    validPresentersCount += Math.min(eventFormConfig.presenterFields.maxAddlPresenters, pres.presenterData.length - 1);
  }

  //validate each additional presenter valid for consideration
  for (let p = 0; p < validPresentersCount; p++) {
    let currentPresenter = pres.presenterData[p];

    // -- first name
    if (!currentPresenter?.firstName) {
      formErrs.push(`missing required field 'presenterData[${p}].firstName'`);
    } else if(typeof currentPresenter.firstName !== 'string') {
      formErrs.push(`invalid field 'presenterData[${p}].firstName'`);
    }

    // -- last name
    if (!currentPresenter?.lastName) {
      formErrs.push(`missing required field 'presenterData[${p}].lastName'`);
    } else if(typeof currentPresenter.lastName !== 'string') {
      formErrs.push(`invalid field 'presenterData[${p}].lastName'`);
    }

    // -- email
    if (!currentPresenter?.email) {
      formErrs.push(`missing required field 'presenterData[${p}].email'`);
    } else if (typeof currentPresenter.email !== 'string' || !isValidEmail(currentPresenter.email)) {
      formErrs.push(`invalid field 'presenterData[${p}].email'`);
    }

    // -- level
    if (eventFormConfig.presenterFields.level.isDisplayed) {
      // TODO: Figure out general issue here and deprecate === 'NULL'
      if (!currentPresenter?.level || currentPresenter?.level === 'NULL') {
        if (eventFormConfig.presenterFields.level.isRequired) {
          formErrs.push(`missing required field 'presenterData[${p}].level'`);
        }
      } else if (!eventFormConfig.presenterFields.level.optionLabels.find(label => {
        return typeof currentPresenter.level === 'string' && currentPresenter.level.toLowerCase() === label.toLowerCase();
      })) {
        formErrs.push(`invalid field 'presenterData[${p}].level'`);
      }
    }

    // -- major
    if (eventFormConfig.presenterFields.major.isDisplayed && eventFormConfig.presenterFields.major.isRequired) {
      if (!currentPresenter?.major) {
        formErrs.push(`missing required field 'presenterData[${p}].major'`);
      } else if (typeof currentPresenter.major !== 'string') {
        formErrs.push(`invalid field 'presenterData[${p}].major'`);
      }
    }

    // -- extra values
    eventFormConfig.presenterFields.extraFields.forEach(fieldConfig => {
      if (fieldConfig.isDisplayed) {
        if (!currentPresenter?.extraValues ||
            (!currentPresenter.extraValues[fieldConfig.hash] &&
              (fieldConfig.type !== 'number' || currentPresenter.extraValues[fieldConfig.hash] != '0')) ||
            fieldConfig.type === 'checkbox' && !currentPresenter.extraValues[fieldConfig.hash].length) {
          if (fieldConfig.isRequired) {
            formErrs.push(`missing required field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
          }
        } else {
          //handle type validation
          switch(fieldConfig.type) {
            case 'radio':
              //validate value
              let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                return typeof currentPresenter.extraValues[fieldConfig.hash] === 'string' &&
                    currentPresenter.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
              });
              if (!matchingLabel) {
                formErrs.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
              }
              break;
            case 'checkbox':
              //validate values are an array
              if (currentPresenter.extraValues[fieldConfig.hash].length === undefined) {
                formErrs.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
              } else {
                //validate all values
                for (let i = 0; i < currentPresenter.extraValues[fieldConfig.hash].length; i++) {
                  let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                    return typeof currentPresenter.extraValues[fieldConfig.hash][i] === 'string' &&
                        currentPresenter.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                  });
                  if (!matchingLabel) {
                    formErrs.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                    break;
                  }
                }
              }
              break;
            case 'number':
              if (isNaN(currentPresenter.extraValues[fieldConfig.hash])) {
                formErrs.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
              }
              break;
            default:
              if (typeof currentPresenter.extraValues[fieldConfig.hash] !== 'string') {
                formErrs.push(`invalid field 'presenterData[${p}].extraValues.${fieldConfig.hash}'`);
                break;
              }
          }
        }
      }
    });
  }

  // -- presentation data --

  // -- subjects
  if (eventFormConfig.presentationFields.subjects.isDisplayed) {
    if (!pres.presentationData?.subjects || !pres.presentationData.subjects.length) {
      if (eventFormConfig.presentationFields.subjects.isRequired) {
        formErrs.push(`missing required field 'presentationData.subjects'`);
      }
    } else {
      //ensure all values are valid
      for (let i = 0; i < pres.presentationData.subjects.length; i++) {
        let matchingSubject = eventFormConfig.presentationFields.subjects.optionLabels.find(label => {
          return typeof pres.presentationData.subjects[i] === 'string' &&
              pres.presentationData.subjects[i].toLowerCase() === label.toLowerCase();
        });
        if (!matchingSubject) {
          formErrs.push(`invalid field 'presentationData.subjects'`);
          break;
        }
      }
    }
  }

  // -- extra values
  eventFormConfig.presentationFields.extraFields.forEach(fieldConfig => {
    if (fieldConfig.isDisplayed) {
      if (!pres.presentationData?.extraValues ||
          (!pres.presentationData.extraValues[fieldConfig.hash] &&
            (fieldConfig.type !== 'number' || pres.presentationData.extraValues[fieldConfig.hash] != '0') ||
          fieldConfig.type === 'checkbox' && !pres.presentationData.extraValues[fieldConfig.hash].length)) {
        if (fieldConfig.isRequired) {
          formErrs.push(`missing required field 'presentationData.extraValues.${fieldConfig.hash}'`);
        }
      } else {
        //handle type validation
        switch(fieldConfig.type) {
          case 'radio':
            //validate value
            let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
              return typeof pres.presentationData.extraValues[fieldConfig.hash] === 'string' &&
                  pres.presentationData.extraValues[fieldConfig.hash].toLowerCase() === label.toLowerCase();
            });
            if (!matchingLabel) {
              formErrs.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            }
            break;
          case 'checkbox':
            //validate values are an array
            if (pres.presentationData.extraValues[fieldConfig.hash].length === undefined) {
              formErrs.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            } else {
              //validate all values
              for (let i = 0; i < pres.presentationData.extraValues[fieldConfig.hash].length; i++) {
                let matchingLabel = (fieldConfig as submissionFormModels.CustomMultiSelectFormField).optionLabels.find(label => {
                  return typeof pres.presentationData.extraValues[fieldConfig.hash][i] === 'string' &&
                      pres.presentationData.extraValues[fieldConfig.hash][i].toLowerCase() === label.toLowerCase();
                });
                if (!matchingLabel) {
                  formErrs.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
                  break;
                }
              }
            }
            break;
          case 'number':
            if (isNaN(pres.presentationData.extraValues[fieldConfig.hash])) {
              formErrs.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            }
            break;
          default:
            if (typeof pres.presentationData.extraValues[fieldConfig.hash] !== 'string') {
              formErrs.push(`invalid field 'presentationData.extraValues.${fieldConfig.hash}'`);
            }
        }
      }
    }
  });

  return formErrs;
}

const getValidSubmissionFormExtraValues = function(
  formData: submissionDataModels.PresentationFormData,
  formConfig: submissionFormModels.PresentationFormConfig
): any {
  //presenter extra values (array of objects -- 1 per presenter)
  let validPresenterExtraValues = [];

  //check for valid presenter extra values if present in config
  if (formConfig.presenterFields.extraFields?.length) {
    validPresenterExtraValues = formData.presenterData
      .filter(presenter => presenter.extraValues && Object.keys(presenter.extraValues).length)
      .map(presenter => {
        //find any valid extra values for this presenter based on config
        let validExtraValues = {};
        Object.keys(presenter.extraValues).forEach(fieldHashKey => {
          if (formConfig.presenterFields.extraFields.find(configField => configField.hash === fieldHashKey)) {
            //found valid extra value, add to output
            validExtraValues[fieldHashKey] = typeof presenter.extraValues[fieldHashKey] === 'number' ?
                String(presenter.extraValues[fieldHashKey]) : presenter.extraValues[fieldHashKey];
          }
        });
        return validExtraValues;
      });
  }

  //presentation extra values
  let validPresentationExtraValues = {};

  //check for valid presentation extra values if present in config
  if (formConfig.presentationFields.extraFields?.length && formData.presentationData.extraValues) {
    Object.keys(formData.presentationData.extraValues).forEach(fieldHashKey => {
      if (formConfig.presentationFields.extraFields.find(configField => configField.hash === fieldHashKey)) {
        //found valid extra value, add to output
        validPresentationExtraValues[fieldHashKey] = typeof formData.presentationData.extraValues[fieldHashKey] === 'number' ?
            String(formData.presentationData.extraValues[fieldHashKey]) : formData.presentationData.extraValues[fieldHashKey];
      }
    });
  }

  //return results
  return {
    presenters: validPresenterExtraValues,
    presentation: validPresentationExtraValues
  };
}

const getSubmissionFormFilterFieldTags = function(
  formData: submissionDataModels.PresentationFormData,
  formConfig: submissionFormModels.PresentationFormConfig
): any {
  let fieldTags: any = {};

  // -- presenter level
  if (formConfig.presenterFields.level.isDisplayed && formConfig.presenterFields.level.canFilter) {
    fieldTags[formConfig.presenterFields.level.label] = [...formData.presenterData
      .filter(presenter => presenter.level)
      .map(presenter => formConfig.presenterFields.level.optionLabels.find(label => label.toLowerCase() === presenter.level.toLowerCase()))
    ];
  }

  // -- presenter extra fields
  formConfig.presenterFields.extraFields
    .filter(fieldConfig => ['radio', 'checkbox'].includes(fieldConfig.type))
    .forEach((fieldConfig: submissionFormModels.CustomMultiSelectFormField) => {
      if (fieldConfig.isDisplayed && fieldConfig.canFilter) {
        if (!fieldTags[fieldConfig.label]) {
          fieldTags[fieldConfig.label] = [];
        }
        if (fieldConfig.type === 'radio') {
          fieldTags[fieldConfig.label].push(...formData.presenterData
            .filter(presenter => presenter.extraValues && presenter.extraValues[fieldConfig.hash])
            .map(presenter => fieldConfig.optionLabels.find(label => label.toLowerCase() === presenter.extraValues[fieldConfig.hash].toLowerCase()))
          );
        } else {
          //checkbox
          fieldTags[fieldConfig.label].push(...formData.presenterData
            .filter(presenter => presenter.extraValues && presenter.extraValues[fieldConfig.hash])
            .reduce((vals, presenter) => {
              vals.push(...presenter.extraValues[fieldConfig.hash].map(value => fieldConfig.optionLabels.find(label => label.toLowerCase() === value.toLowerCase())));
              return vals;
            }, [])
          );
        }
      }
    });

  // -- presentation subjects
  if (formConfig.presentationFields.subjects.isDisplayed && formConfig.presentationFields.subjects.canFilter) {
    fieldTags[formConfig.presentationFields.subjects.label] = [...formData.presentationData.subjects
      .map(subject => formConfig.presentationFields.subjects.optionLabels.find(label => label.toLowerCase() === subject.toLowerCase()))
    ];
  }

  // -- presentation extra fields
  formConfig.presentationFields.extraFields
    .filter(fieldConfig => ['radio', 'checkbox'].includes(fieldConfig.type))
    .forEach((fieldConfig: submissionFormModels.CustomMultiSelectFormField) => {
      if (fieldConfig.isDisplayed && fieldConfig.canFilter) {
        if (!fieldTags[fieldConfig.label]) {
          fieldTags[fieldConfig.label] = [];
        }
        if (fieldConfig.type === 'radio' && formData.presentationData.extraValues && formData.presentationData.extraValues[fieldConfig.hash]) {
          fieldTags[fieldConfig.label].push(fieldConfig.optionLabels.find(label => label.toLowerCase() === formData.presentationData.extraValues[fieldConfig.hash].toLowerCase()));
        } else if (formData.presentationData.extraValues && formData.presentationData.extraValues[fieldConfig.hash]) {
          //checkbox
          fieldTags[fieldConfig.label].push(...formData.presentationData.extraValues[fieldConfig.hash]
            .map(value => fieldConfig.optionLabels.find(label => label.toLowerCase() === value.toLowerCase()))
          );
        }
      }
    });


  // remove duplicates from any field
  let uniqueFieldTags = {};
  Object.keys(fieldTags).forEach(key => {
    if (!uniqueFieldTags[key]) {
      uniqueFieldTags[key] = [];
    }
    fieldTags[key].forEach(tagName => {
      if (!uniqueFieldTags[key].includes(tagName)) {
        uniqueFieldTags[key].push(tagName);
      }
    });
  });

  return uniqueFieldTags;
}

module.exports = router;
