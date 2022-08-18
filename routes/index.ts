import { getOneEventByHashCodeOrID } from '../auth-queries';

const path = require('path');

var express = require('express');
var router = express.Router();
var cors = require('cors')
router.use(cors());

import * as _ from 'lodash';

import * as libSendGrid from '../lib/sendgrid';

// Sendgrid
const sgMail = libSendGrid.getSendGridClient();

import * as sharedQueries from '../shared-queries';
import {
  checkIsAuthenticated,
  checkIsUserOwner,
  checkCommentPosterAuthorized,
  checkParentCommentNotDeleted,
  checkIsUserOwnerOfComment,
  checkPosterAuthorized,
  softCheckIsAuthenticated
} from '../authentication-middleware';
import { Consumer, Event, Presentation } from '../models';
import { BadRequestException } from '../helpers';

// Authorization: None
router.get('/global-feature-flags', async function (req, res, next) {
  try {
    const featureFlags: any = await sharedQueries.getGlobalFeatureFlags();

    res.json(featureFlags);
  } catch(err) {
    next(err);
  }
});

// Authorization: None
router.get('/institutions', async function (req, res, next) {
  try {
    let institutions: any = await sharedQueries.getDeprecatedEvents();
    institutions.allowedSubmissionTypes = institutions.allowedSubmissionTypes &&
      JSON.parse(institutions.allowedSubmissionTypes);

    // TODO: Remove this once email validation is done on backend
    institutions = await Promise.all(institutions.map(async institution => {
      institution.validSpecifiedEmails = await sharedQueries.getAllowedSpecifiedEventEmails(institution.institutionId);

      return institution;
    }));



    res.json(institutions);
  } catch (err) {
    next(err);
  }
});

router.get('/new-institutions', async function (req, res, next) {
  try {
    const institutions = await sharedQueries.getNewInstitutions();
 
    res.json(institutions);
  } catch(err) {
    next(err);
  }
});


// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in or have a hash
// If poster is in a private university, then user must belong to that institution
// If hash, that hash must be associated with this presentation
router.get('/comments', checkPosterAuthorized, /*checkValidHash,*/ async function (req, res, next) {
  const posterId = req.query.posterId;
  let topLevelComments: any = await sharedQueries.getTopLevelComments({ posterId: posterId });

  for (let topLevelComment of topLevelComments) {
    topLevelComment.comments = await sharedQueries.getComments({ parentCommentId: topLevelComment.commentId });
  }

  // Hide deleted comments
  topLevelComments = topLevelComments.map(topLevelComment => {
    // Clean replies
    topLevelComment.comments = topLevelComment.comments.map(comment => {
        // Clean comment
        if (comment.deleteDate || comment.hiddenByAdminDate) {
            comment.comment = '';
            comment.consumerId = -1;
            comment.firstName = '';
            comment.lastName = '';
        }
        return comment;
    });

    // Clean topLevelComment
    if (topLevelComment.deleteDate || topLevelComment.hiddenByAdminDate) {
        topLevelComment.comment = '';
        topLevelComment.consumerId = -1;
        topLevelComment.firstName = '';
        topLevelComment.lastName = '';
    }
    return topLevelComment;
  });

  res.json(topLevelComments);
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User's consumerId must match consumerId passed in
// If poster is in a private university, then user must belong to that institution
router.post('/postComment', checkIsAuthenticated, checkIsUserOwner, checkCommentPosterAuthorized, async function (req, res, next) {
  const comment = req.body.comment;
  const posterId = req.body.posterId;
  const consumerId = req.body.consumerId;

  await sharedQueries.insertComment({
    comment: comment,
    posterId: posterId,
    consumerId: consumerId
  });

  const presentation = await sharedQueries.getSinglePresentationWithEmailFromId(posterId);

  const commenter: any = await sharedQueries.getConsumerByConsumerId({consumerId: consumerId});

  const event: Event = await getOneEventByHashCodeOrID(presentation.eventId);

  try {
    const email = {
    	to: presentation.presenterEmail,
    	from: {
        email: 'no-reply@foragerone.com',
        name: 'Symposium by ForagerOne'
      },
    	templateId: 'd-df0802f2e8c2456cb4d464cb7c1c777a',
    	dynamicTemplateData: {
        'firstName': commenter.firstName,
        'lastName': commenter.lastName,
        'content': comment,
        'buttonURL': `https://symposium.foragerone.com/${event.eventCode}/project/${presentation.presentationId}`
    	}
    };

    await sgMail.send(email);

    for (let x = 2; x <= 8; x++) {
      const altPresenterEmail = presentation[`presenter${x}Email`];
      if (!_.isEmpty(altPresenterEmail)) {
        const email = {
          to: altPresenterEmail,
          from: {
            email: 'no-reply@foragerone.com',
            name: 'Symposium by ForagerOne'
          },
          templateId: 'd-df0802f2e8c2456cb4d464cb7c1c777a',
          dynamicTemplateData: {
            'firstName': commenter.firstName,
            'lastName': commenter.lastName,
            'content': comment,
            'buttonURL': `https://symposium.foragerone.com/${event.eventCode}/project/${presentation.presentationId}`
          }
        };

        await sgMail.send(email);
      }
    }
  } catch(error) {
    console.log(error);
  }

  res.json({});
});

router.post('/flagComment', async function (req, res, next) {
  const commentId = req.body.commentId;
  const flaggerId = req.body.consumerId;
  await sharedQueries.flagComment(flaggerId, commentId);
  res.json({});
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User must be logged in
// User's consumerId must match consumerId passed in
// Check if parent comment is already deleted
router.post('/postReply', checkIsAuthenticated, checkIsUserOwner, checkCommentPosterAuthorized, checkParentCommentNotDeleted, async function (req, res, next) {
  const comment = req.body.comment;
  const posterId = req.body.posterId;
  const consumerId = req.body.consumerId;
  const parentCommentId = req.body.parentCommentId;

  await sharedQueries.insertReply({
    comment: comment,
    posterId: posterId,
    consumerId: consumerId,
    parentCommentId: parentCommentId
  });

  const consumer: Consumer = await sharedQueries.getConsumerByConsumerId({consumerId: consumerId});

  const parentComment: any = await sharedQueries.getCommentFromId({commentId: parentCommentId});

  const parentConsumer: Consumer = await sharedQueries.getConsumerByConsumerId({consumerId: parentComment.consumerId});

  const presentation: Presentation  = await sharedQueries.getSinglePresentationFromId(posterId);

  const event : Event = await getOneEventByHashCodeOrID(presentation.eventId);

  try {
    const email = {
      to: parentConsumer.email,
      from: {
      email: 'no-reply@foragerone.com',
      name: 'Symposium by ForagerOne'
    },
    templateId: 'd-cbce748f65364433a5a946bdeb4a6791',
    dynamicTemplateData: {
      'firstName': consumer.firstName,
      'lastName': consumer.lastName,
      'content': comment,
      'buttonURL': `https://symposium.foragerone.com/${event.eventCode}/project/${posterId}`
    }
    };

    await sgMail.send(email);
  }catch (e){
    console.log('[error sending email]',e)
  }


  res.json({});
});

// Authorization:
// User must be logged in
// User's consumerId must be owner of comment
router.post('/deleteComment', checkIsAuthenticated, checkIsUserOwnerOfComment, async function (req, res, next) {
  const commentId = req.body.commentId;

  await sharedQueries.deleteComment({
    commentId: commentId
  });

  res.json({});
});

module.exports = router;
