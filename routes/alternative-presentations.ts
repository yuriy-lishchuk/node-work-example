import * as path from 'path';
import * as fs from 'fs';
import { getSendGridClient } from '../lib/sendgrid';

var express = require('express');
var router = express.Router();
var cors = require('cors')
router.use(cors());
const debug = require('debug')('server:server');

const upload = require('multer')();
const PDF2Pic = require('pdf2pic');
const uniqueString = require('unique-string');
import * as _ from 'lodash';

// Google Cloud Storage
const Cloud = require('@google-cloud/storage');
const serviceKey = path.join(__dirname, './keys.json');
const { Storage } = Cloud;
const storage = new Storage({
  keyFilename: serviceKey,
  projectId: 'green-network-233421',
})
const bucket = storage.bucket('fg1-submissions');

const decode = require('decode-html');

import * as sharedQueries from '../shared-queries';


async function sendConfirmationEmail(presenterEmails: string[], title: string) {
  const sgMail = getSendGridClient();
  try {
    const email = {
    	to: presenterEmails[0],
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

    for (let x = 0; x < presenterEmails.length; x++) {
      const email = {
        to: presenterEmails[x + 1],
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

// Authorization:
// None
router.post('/', upload.single('file'), async function (req, res, next) {
  async function handleDatabaseInsert(hash, req) {
    // Preprocess presentation object before saving
    let presentation = req.body;

    // Map any null string values to actual null values
    presentation = _.mapValues(presentation, value => value === 'null' ? null : value);

    // Map presentation debug types
    presentation.debugPresentationType = presentation.presentationType.toLowerCase();
    if (presentation.debugPresentationType === 'exhibit, performance, or demonstration') {
      presentation.debugPresentationType = 'exhibit';
    }
    // Map presentation types
    if (presentation.debugPresentationType === 'poster') {
      presentation.presentationType = 'pdf';
    } else if (presentation.debugPresentationType === 'exhibit') {
      presentation.presentationType = 'video';
    } else if (presentation.debugPresentationType === 'oral') {
      if (req.file) {
        presentation.presentationType = 'pdf';
      } else {
        presentation.presentationType = 'video';
      }
    }
    // Map posterId
    if (presentation.presentationType === 'pdf') {
      presentation.posterId = hash;
      presentation.slidesId = hash;
      presentation.originalPosterLink = null;
    } else {
      let youTubeLink = '';
      if (presentation.debugPresentationType === 'exhibit') {
        youTubeLink = presentation.exhibitYouTubeLink1;
      } else {
        youTubeLink = presentation.oralYouTubeLink;
      }

      presentation.posterId = parseYouTubeLink(youTubeLink);
      presentation.originalPosterLink = youTubeLink;
      presentation.presentationVideoId = parseYouTubeLink(youTubeLink);
      presentation.originalPresentationVideoLink = youTubeLink;
    }
    // Map voiceOverId
    if (presentation.debugPresentationType === 'poster' && presentation.posterYouTubeLink) {
      presentation.voiceOverId = parseYouTubeLink(presentation.posterYouTubeLink);
      presentation.originalVoiceOverLink = presentation.posterYouTubeLink;
    } else if (presentation.debugPresentationType === 'oral' && req.file) {
      presentation.presentationVideoId = parseYouTubeLink(presentation.oralYouTubeLink);
      presentation.originalPresentationVideoLink = presentation.oralYouTubeLink;
    } else if (presentation.debugPresentationType === 'exhibit' && presentation.exhibitYouTubeLink2) {
      presentation.voiceOverId = parseYouTubeLink(presentation.exhibitYouTubeLink2);
      presentation.originalVoiceOverLink = presentation.exhibitYouTubeLink2;
    }

    presentation.hash = hash;
    presentation.presentationSubject = JSON.parse(presentation.presentationSubject);
    presentation.additionalPresenters = JSON.parse(presentation.additionalPresenters);
    if (presentation.debugPresentationType === 'exhibit') {
      presentation.debugPresentationType = 'exhibition';
    }

    // Add all presenter emails to an array for sending confirmation email later on
    const presenterEmails = [];
    presenterEmails.push(presentation.email);

    // Parse additionalPresenters
    presentation.additionalPresenters.forEach((additionalPresenter, index) => {
      presentation['presenter' + (index + 2) + 'FirstName'] = additionalPresenter.firstName;
      presentation['presenter' + (index + 2) + 'LastName'] = additionalPresenter.lastName;
      presentation['presenter' + (index + 2) + 'Email'] = additionalPresenter.email;
      presentation['presenter' + (index + 2) + 'Year'] = additionalPresenter['year' + (index + 2)];
      presentation['presenter' + (index + 2) + 'Major'] = additionalPresenter.majorOrDepartment;

      // 2nd presenter is null because it's not a required field in the form
      if (additionalPresenter.email) {
        presenterEmails.push(additionalPresenter.email);
      }
    });
    delete presentation.additionalPresenters;

    // Map custom fields
    if (presentation.supervisorConsentText) {
      presentation.supervisorConsentText = presentation.supervisorConsentText === "true" ? 1 : 0;
    }

    const submissionFormExtraValues = {
      'presenters': [],
      'presentation': {},
    };
    if (presentation.swacsmPresentationType) {
      submissionFormExtraValues['presentation']['1b95386fabd7c11a97e08cbe07cdbc48'] = JSON.parse(presentation.swacsmPresentationType);
    }

    if (presentation.presentationSwacsmSymposiumTopic) {
      submissionFormExtraValues['presentation']['5cfa18c29164509f680e32fbbb6a853f'] = JSON.parse(presentation.presentationSwacsmSymposiumTopic);
    }

    presentation.submissionFormExtraValues = submissionFormExtraValues;

    const presentationResult: any = await sharedQueries.savePresentation(presentation);

    // Get tags for this specific event, if they exist
    const hasTags = await sharedQueries.hasTags({ eventId: presentation.institution });

    // Loop through all selected tags and save to database
    for (const element of presentation.presentationSubject) {
      let tag: any;
      if (hasTags) {
        tag = await sharedQueries.getTagForEvent({ name: element, eventId: presentation.institution })
      } else {
        tag = await sharedQueries.getTag({ name: element });
      }

      await sharedQueries.savePresentationTag({
        presentationId: presentationResult.insertId,
        tagId: tag.tagId
      });
    }

    if (presentation.swacsmPresentationType) {
      for (const element of JSON.parse(presentation.swacsmPresentationType)) {
        let tag: any;
        if (hasTags) {
          tag = await sharedQueries.getTagForEvent({ name: element, eventId: presentation.institution })
        } else {
          tag = await sharedQueries.getTag({ name: element });
        }

        await sharedQueries.savePresentationTag({
          presentationId: presentationResult.insertId,
          tagId: tag.tagId
        });
      }
    }

    if (presentation.presentationSwacsmSymposiumTopic) {
      for (const element of JSON.parse(presentation.presentationSwacsmSymposiumTopic)) {
        let tag: any;
        if (hasTags) {
          tag = await sharedQueries.getTagForEvent({ name: element, eventId: presentation.institution })
        } else {
          tag = await sharedQueries.getTag({ name: element });
        }

        await sharedQueries.savePresentationTag({
          presentationId: presentationResult.insertId,
          tagId: tag.tagId
        });
      }
    }

    sendConfirmationEmail(presenterEmails, decode(presentation.presentationTitle.replace(/<[^>]+>|&nbsp;/g, ' ').replace(/\s\s+/g, ' ')));
  }

  function parseYouTubeLink(youTubeLink: string) {
    // Parse out YouTube videoId
    let videoId = '';
    if (youTubeLink.includes('https://youtu.be')) {
      const linkArray = youTubeLink.split('be/');
      videoId = linkArray[linkArray.length - 1];
    } else {
      const linkArray = youTubeLink.split('v=');
      videoId = linkArray[linkArray.length - 1];
    }
    if (videoId) {
      const ampersandPosition = videoId.indexOf('&');
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
    }
    return videoId;
  }

  try {
    // Generate a unique string
    // TODO: There technically could be a collision that same exact unique string is generated at the same time as
    // another upload request.
    let hash = uniqueString();
    let result = await sharedQueries.getSinglePresentationFromHash(hash);
    while (result !== null) {
      hash = uniqueString();
      result = await sharedQueries.getSinglePresentationFromHash(hash);
    }

    // TODO: There's got to be a better way to handle file uploads
    if (req.file) {
      // Get buffer
      const { buffer } = req.file;

      // Save file to disk
      fs.writeFileSync(hash + '.pdf', buffer);

      // Convert PDF to JPG
      const pdf2pic = new PDF2Pic({
        savename: hash,
        savedir: "./",
        format: "jpg"
      });

      await pdf2pic.convert(hash + '.pdf');

      // Rename file (for some reason, pdf2pic saves with trailing "_1")
      fs.renameSync(hash + '_1.jpg', hash + '.jpg');

      // Upload JPG to Google Cloud Storage
      await bucket.upload(hash + '.jpg');

      // Upload PDF to Google Cloud Storage
      const blob = bucket.file(hash + '.pdf');
      blob.createWriteStream({
        resumable: false
      })
      .on('finish', async () => {
        // Delete old temporary files
        fs.unlinkSync(hash + '.pdf');
        fs.unlinkSync(hash + '.jpg');

        // Make public (TODO: Don't make public for security reasons)
        await bucket.file(hash + '.jpg').makePublic();
        await bucket.file(hash + '.pdf').makePublic();

        await handleDatabaseInsert(hash, req);

        res.json({});
      })
      .on('error', (error) => {
        console.log('Error:' + error);
      })
      .end(buffer);
    } else {
      handleDatabaseInsert(hash, req);

      res.json({});
    }
  } catch (error) {
    console.log('Error:' + error);
  }
});
 
module.exports = router;
