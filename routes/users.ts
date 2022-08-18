import { RESET_EMAIL_TEMPLATE_ID } from '../lib/sendgrid';

var express = require('express');
var router = express.Router();
var Joi = require('@hapi/joi');
var createError = require('http-errors');
var mime = require('mime-types');

import * as firebase from 'firebase';
import * as libSendGrid from '../lib/sendgrid';
import * as admin from 'firebase-admin';

import { FIREBASE_CONFIG } from '../firebase-service-account-key';
import { emailSchema, passwordComplexitySchema } from '../schemas';

import { checkIsAuthenticated } from '../authentication-middleware';
import { encodeData, decodeToken } from '../functions';
import { getConsumerEmails } from '../shared-queries';
import {
    updateConsumer,
    deleteConsumerEmail,
    updateConsumerEmailByEmail,
    saveConsumerEmail,
    getConsumerEmailByEmail,
    getConsumerEmailById,
} from '../shared-queries';
import { upload, gcStorageUpload } from '../google-cloud-upload';
import { BadRequestException, ForbiddenException, NotFoundException } from '../helpers';

const gCloudStorageUserAssetsBucketName = 'fg1-user-assets';

// Sendgrid
const sgMail = libSendGrid.getSendGridClient();

const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
};

router.use(function (req, res, next) {
    if (!firebase.apps.length) {
        firebase.initializeApp(config);
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(FIREBASE_CONFIG as any),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
    }

    next();
});

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

/**
 * Update current user
 * User must be authenticatd.
 */
router.put('/me', checkIsAuthenticated, async function (req, res, next) {
    try {
        const { consumerId } = res.locals.userClaims;

        // validate body
        const { firstName, lastName } = await Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
        })
            .validateAsync(req.body)
            .catch((err) => {
                // create http error with validation error message
                throw createError(400, err.message);
            });

        await updateConsumer({ firstName, lastName, consumerId });

        res.json({});
    } catch (error) {
        next(error);
    }
});

/**
 * Update current user
 * TODO - Require current password before update
 * User must be authenticatd.
 */
router.put('/password', checkIsAuthenticated, async function (req, res, next) {
    try {
        const { email } = res.locals.userClaims;

        // validate body
        const { oldPassword, newPassword } = await Joi.object({
            oldPassword: Joi.required(),
            newPassword: passwordComplexitySchema,
        })
            .validateAsync(req.body)
            .catch((err) => {
                // create http error with validation error message
                throw createError(400, err.message);
            });

        let credential: firebase.auth.UserCredential;
        try {
            credential = await firebase
                .auth()
                .signInWithEmailAndPassword(email, oldPassword);
        } catch (e) {
            throw createError(400, 'The provided password is not correct.');
        }

        await credential.user.updatePassword(newPassword);

        res.json({});
    } catch (error) {
        next(error);
    }
});

/**
 * Update current user profile photo
 * User must be authenticatd.
 */
router.put('/photo', checkIsAuthenticated, upload.single('photo'), async function (
    req,
    res,
    next
) {
    const { consumerId } = res.locals.userClaims;

    try {
        const { file } = req;
        if (!file) throw createError('Image file is not provided');
        const fileName = `${consumerId}_profile_photo.${mime.extension(file.mimetype)}`;

        const profileImgName = await gcStorageUpload(
            gCloudStorageUserAssetsBucketName,
            file.buffer,
            fileName,
            file.mimetype
        );

        await updateConsumer({ consumerId, profileImgName });
        return res.send({ profileImgName: profileImgName });
    } catch (err) {
        next(err);
    }
    next();
});

/**
 * Get user emails
 * User must be authenticatd.
 */
router.get('/my-emails', checkIsAuthenticated, async function (req, res, next) {
    try {
        const { consumerId } = res.locals.userClaims;
        const primaryEmail = res.locals.userClaims.email;

        const consumerEmails = [];
        (await getConsumerEmails(consumerId)).map(
            ({ email, verifiedAt, consumerEmailId }) => {
                let item = {
                    email,
                    consumerEmailId,
                    isPrimary: primaryEmail === email,
                    isVerified: !!verifiedAt,
                };
                // If it is primary then make it first in the list
                if (primaryEmail === email) consumerEmails.unshift(item);
                else consumerEmails.push(item);
            }
        );

        res.json(consumerEmails);
    } catch (error) {
        next(error);
    }
});

/**
 * Add additonal email to the list.
 * User must be authenticatd.
 */
router.post('/emails', checkIsAuthenticated, async function (req, res, next) {
    try {
        const { consumerId } = res.locals.userClaims;

        // validate body
        const { email } = await Joi.object({
            email: emailSchema,
        })
            .validateAsync(req.body)
            .catch((err) => {
                // create http error with validation error message
                throw new BadRequestException(err.message)
            });

        const user = await admin.auth().getUserByEmail(email).catch(e=>{})
        const anotherConsumerEmail = await getConsumerEmailByEmail(email);
        if (user || anotherConsumerEmail && anotherConsumerEmail.verifiedAt)
            throw new ForbiddenException('The specified email is already in use');

        /**
         * Update the table to override the previous consuemr id
         * with the current logged in consumer, if there is already such email
         * but hasn't been verified yet and the consumer ids are different.
         */
        if (anotherConsumerEmail && anotherConsumerEmail.consumerId !== consumerId)
            await updateConsumerEmailByEmail({
                consumerId,
                email: anotherConsumerEmail.email,
            });

        // If there is no such email then create new
        if (!anotherConsumerEmail) await saveConsumerEmail({ consumerId, email });

        // Generate verification token with expiration
        const expiresInHours: any = process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 2;
        const token = await encodeData({ email, consumerId }, expiresInHours * 60 * 60);
        await sendVerificationEmail(token, email);

        res.json({});
    } catch (error) {
        next(error);
    }
});

/**
 * Make the specified email primary. Note that any email that is added
 * by this consumer can be made primary regardless the verification status.
 * If it's not verified Firbase will send the verification.
 * User must be authenticatd.
 */
router.put('/emails/:consumerEmailId/set-primary', checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    try {
        const { consumerId, uid } = res.locals.userClaims;
        const { consumerEmailId } = req.params;

        const consumerEmail = await getConsumerEmailById(consumerEmailId);
        if (!consumerEmail) throw new NotFoundException('Could not find such email');

        if (consumerEmail.consumerId != consumerId)
            throw new ForbiddenException( 'Email does not belong to the user');

        if (!consumerEmail.verifiedAt)
            throw new BadRequestException('Email should be verified first');

        const customToken = await admin.auth().createCustomToken(uid);
        const credential = await firebase.auth().signInWithCustomToken(customToken);

        const currentUser = credential.user;

        // Update the email in firebase
        try {
            await currentUser.updateEmail(consumerEmail.email);
        }catch (e){
            throw new BadRequestException(e.message)
        }

        // Update consumer email
        await updateConsumer({
            consumerId,
            primaryEmailId: consumerEmail.consumerEmailId,
        });

        await admin.auth().updateUser(uid, {
            emailVerified: true,
        });

        // Get new token for the given updated email
        const token = await currentUser.getIdToken(true);

        res.json({ newToken: token });
    } catch (error) {
        next(error);
    }
});

/**
 * Resend verification code
 * User must be authenticatd.
 */
router.put('/emails/:consumerEmailId/send-code', checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    try {
        const { consumerId, uid } = res.locals.userClaims;
        const { consumerEmailId } = req.params;

        const consumerEmail = await getConsumerEmailById(consumerEmailId);
        if (!consumerEmail) throw createError(404, 'Could not find such email');

        if (consumerEmail.consumerId != consumerId)
            throw createError(403, 'Email does not belong to the user');

        if (!consumerEmail.verifiedAt) {
            // Generate verification token with expiration
            const expiresInHours: any =
                process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS || 2;
            const token = await encodeData(
                { email: consumerEmail.email, consumerId },
                expiresInHours * 60 * 60
            );
            await sendVerificationEmail(token, consumerEmail.email);
        }

        res.json({});
    } catch (error) {
        next(error);
    }
});

/**
 * Add additonal email to the list.
 * User must be authenticatd.
 */
router.post('/emails/verify', async function (req, res, next) {
    try {
        // validate body
        const { token } = await Joi.object({
            token: Joi.string().required(),
        })
            .validateAsync(req.body)
            .catch((err) => {
                // create http error with validation error message
                throw createError(400, err.message);
            });

        const { email, consumerId } = await decodeToken(token).catch((err) => {
            console.log(err);
            throw createError(400, 'The provided token is not valid');
        });

        await updateConsumerEmailByEmail({ email, consumerId, isVerified: true });
        res.json({});
    } catch (error) {
        next(error);
    }
});

/**
 * Add additonal email to the list.
 * User must be authenticatd.
 */
router.delete('/emails/:consumerEmailId', checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    try {
        const { consumerId } = res.locals.userClaims;
        const { consumerEmailId } = req.params;

        const consumerEmail = await getConsumerEmailById(consumerEmailId);
        if (!consumerEmail) throw createError(404, 'Could not find such email');

        // Do not allow to delete if this deosn't belong to the user
        if (consumerEmail.consumerId != consumerId)
            throw createError(403, 'The specified email does not belong to the user');

        // Do not allow if this is primary email
        if (consumerEmail.consumerEmailId === consumerEmail.consumerPrimaryEmailId)
            throw createError(400, 'The specified email is primary');

        await deleteConsumerEmail(consumerEmailId);
        res.json({});
    } catch (error) {
        next(error);
    }
});

async function sendVerificationEmail(token: string, email: string): Promise<any> {
    const link = `https://symposium.foragerone.com/authentication-handler?mode=verifyEmail&localVerifToken=${token}`;

    const mail = {
        to: email,
        from: {
            email: 'no-reply@foragerone.com',
            name: 'Symposium by ForagerOne',
        },
        templateId: RESET_EMAIL_TEMPLATE_ID,
        dynamicTemplateData: {
            verifyEmailLink: link,
        },
    };

    await sgMail.send(mail);
}

module.exports = router;
