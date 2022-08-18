import { Consumer, Event, Institution } from '../models';

const express = require('express');
const validator = require('email-validator');
const createError = require('http-errors');
const Joi = require('@hapi/joi');

import * as rp from 'request-promise';
import * as firebase from 'firebase';
import * as admin from 'firebase-admin';

import { FIREBASE_CONFIG } from '../firebase-service-account-key';

import * as authenticationMiddleware from '../authentication-middleware';

import * as sharedQueries from '../shared-queries';

import * as _ from 'lodash';
import { getInstitutionById, updateConsumerEmailByEmail } from '../shared-queries';
import { addRolloutShowRecord } from '../queries';
import { passwordComplexitySchema, emailSchema } from '../schemas';
import { getOneEventByHashCodeOrID } from '../auth-queries';
import { ForbiddenException, getFirebaseUserByEmail, sendVerificationLink, setUserCustomClaims } from '../helpers';
import { Claims } from '../models/claims';

import * as saml from '../config/saml';
import { createNewInstitution, getNewInstitutionByName } from '../queries';

const router = express.Router();

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

// Authorization: None
router.post('/login', async function (req, res, next) {
    try {
        const email = req.body.email;
        const password = req.body.password;

        // Validate email
        if (!validator.validate(email)) {
            return res.json(
                    createError(
                        400,
                        'Please enter a valid email'
                    )
                );
        }

        const credential: any = await firebase
            .auth()
            .signInWithEmailAndPassword(email, password);

        const user = credential.user;
        if (user) {
            if (!user.emailVerified) {
                await sendVerificationLink(email)

                res.json({
                    message:
                        'Please verify your email first. Another verification email has been sent.',
                });
            } else {
                const consumer: Consumer = await sharedQueries.getConsumerByEmail({
                    email,
                })

                const eventIds: number[] = await sharedQueries.getEventIdsByConsumerId({
                    consumerId: consumer.consumerId,
                });

                const adminEventIds: number[] = await sharedQueries.getAdminEventIdsByConsumerId(
                    { consumerId: consumer.consumerId }
                );

                const subscriptionIds: any = await sharedQueries.getConsumerSubscriptionsIdsByConsumerId(
                    consumer.consumerId,
                );

                const blockedEventIds :number[] = await sharedQueries.getBlockedEventIdsByConsumerId(
                    { consumerId: consumer.consumerId }
                );

                await setUserCustomClaims(user.uid,{
                    consumerId: consumer.consumerId,
                    eventCode: consumer.institutionCode,
                    institutionCode: consumer.institutionCode,
                    eventIds
                })

                const token = await user.getIdToken(true);

                res.json({
                    token,
                    refresh: user.refreshToken,
                    email,
                    firstName: consumer.firstName,
                    lastName: consumer.lastName,
                    userId: consumer.consumerId,
                    profileImgName: consumer.profileImgName,
                    eventIds,
                    adminEventIds,
                    subscriptionIds,
                    blockedEventIds,
                    institutionId: consumer.institutionId,
                    institutionCode: consumer.institutionCode,
                });
            }
        } else {
            res.json({
                message: credential.message,
            });
        }
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            return res.json(
                createError(
                    400,
                    'There is either not an existing account with this email or the password is invalid. Please make sure that you\'ve signed up or press "Forgot Password?" if you\'ve forgotten your password.'
                )
            );
        } else if (error.code === 'auth/too-many-requests') {
            res.json(
                createError(
                    500,
                    `You've attempted to log in with the incorrect password too many times in a row. Please reset your password via the "Forgot Password" link or try again in a few minutes.`
                )
            );    
        }
        
        console.error(error);
        res.json(createError(500));
    }
});

// Authorization:
// User rejected, if university not launched yet (middleware)
// User needs to be logged in
router.post('/register', authenticationMiddleware.checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    try {
        const {eventCode,consumerId } = req.body
        const consumer: any = await sharedQueries.getConsumerByConsumerId({ consumerId });

        const event: Event = await getOneEventByHashCodeOrID(eventCode)

        const validSpecifiedEmails: any = await sharedQueries.getAllowedSpecifiedEventEmails(
            event.eventId
        );
        const isPreApprovedForEvent: boolean = await isEmailPreApprovedForEvent(consumer.email, event.eventId);

        await sharedQueries.insertConsumerEvent({
            consumerId,
            eventId: event.eventId,
            isAdmin: isPreApprovedForEvent,
        });

        const eventIds: any = await sharedQueries.getEventIdsByConsumerId({ consumerId });

        const user = await getFirebaseUserByEmail(consumer.email);

        await setUserCustomClaims(user.uid, {
            consumerId: consumer.consumerId,
            eventCode: event.eventCode,
            institutionCode: event.eventCode,
            eventIds
        })

        const blockedEventIds: number[] = await sharedQueries.getBlockedEventIdsByConsumerId({ consumerId });

        const adminEventIds: number[] = await sharedQueries.getAdminEventIdsByConsumerId({ consumerId });

        res.json({
            firstName: consumer.firstName,
            lastName: consumer.lastName,
            email: consumer.email,
            userId: consumer.consumerId,
            eventIds,
            adminEventIds,
            blockedEventIds,
            institutionId: consumer.institutionId,
            eventCode: event.eventCode,
            fullName: consumer.name,
            privacyLevel: consumer.privacyLevel,
            validEmails: consumer.validEmails,
            validSpecifiedEmails: validSpecifiedEmails,
            registeredInstitutionCode: event.eventCode,
        });
    } catch (error) {
        console.error(error.message);
        res.json(
            createError(
                500,
                'There was an error registering for this event. Please contact support@foragerone.com.'
            )
        );
    }
});

// Authorization: None
router.post('/verify-email', async function (req, res, next) {
    try {
        const oobCode = req.body.oobCode;

        await firebase.auth().applyActionCode(oobCode);

        try {
            const { email } = firebase.auth().currentUser;

            await updateConsumerEmailByEmail({
                isVerified: true,
                email: email,
            });

        }catch (e){
            console.error('[error updating user verification status]')
        }

        res.json({});
    } catch (error) {
        console.error(error);
        next(error)
    }
});
// Authorization: None
router.post('/resend-email', async function (req, res, next) {
    try {
        const { email } = req.body;
        await sendVerificationLink(email);
        res.json({sent: true});
    } catch (error) {
        console.error(error);
        res.status(500).json({message : error.message});
    }
});

// Authorization: None
router.post('/change-password', async function (req, res, next) {
    try {
        const oobCode = req.body.oobCode;
        const newPassword = req.body.newPassword;

        // Validate password
        try {
            await Joi.object({ newPassword: passwordComplexitySchema})
                .validateAsync({ newPassword })
        }catch (err){
            // create http error with validation error message
            // throw createError(400, err.message);
            return res.status(400).json({ message: err.message.replace(/"newPassword"/g, 'Your new password')+'.'});
        }

        await firebase.auth().verifyPasswordResetCode(oobCode);

        await firebase.auth().confirmPasswordReset(oobCode, newPassword);

        res.json({});
    } catch (error) {
        // if the error already handled above let's send the http
        // otherwise create and send a 500 http error
        if (createError.isHttpError(error)) return res.json(error);

        console.error(error);
        res.status(500).json(createError(500,error));
    }
});

// Authorization: None
router.post('/forgot-password', async function (req, res, next) {
    try {
        const email = req.body.email;

        // Validate email
        if (!validator.validate(email)) {
            throw createError(400, 'Invalid email format.');
        }

        await firebase.auth().sendPasswordResetEmail(email);

        res.json({
            message: 'Success',
        });
    } catch (error) {
        // if the error already handled above let's send the http
        // otherwise create and send a 500 http error
        if (createError.isHttpError(error)) return res.json(error);

        console.error(error);
        res.json(createError(500));
    }
});

// Authorization:
// User rejected, if university not launched yet (middleware)
router.post('/signup', async function (req, res, next) {
    const { firstName, lastName, email, password, visitorId } = req.body;

    try {
        await Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            email: emailSchema,
            password: passwordComplexitySchema,
        })
            .unknown(true)
            .validateAsync(req.body)
            .catch((err) => {
                // create http error with validation error message
                throw createError(400, err.message);
            });


        // Check if there is already such email
        const anotherConsumerEmail = await sharedQueries.getConsumerEmailByEmail(email);
        if (anotherConsumerEmail && anotherConsumerEmail.verifiedAt)
            throw createError(403, 'The specified email is already in use');

        const record = await firebaseGetOrCreateUser({
            email,
            password,
            emailVerified: false,
        });

        if (!record.alreadyInserted) {
            const insertResponse: any = await sharedQueries.insertConsumer({
                firstName: firstName,
                lastName: lastName,
                email: email,
                institutionId: null,
            });

            await addRolloutShowRecord(visitorId, 'discover', insertResponse.insertId);
        }

        if (record.emailVerified) {
            throw createError(403, 'User already exists.');
        }

        const customToken = await admin.auth().createCustomToken(record.uid);

        const credential = await firebase.auth().signInWithCustomToken(customToken);

        await sendVerificationLink(email)

        res.json({
            message: 'Please verify email.',
        });
    } catch (error) {
        // if the error already handled above let's send the http
        // otherwise create and send a 500 http error
        if (createError.isHttpError(error)) {
            return res.status(error.status).json(error);
        }

        console.error(error);
        res.json(createError(500, 'Please try again. If this issue repeats, use the chat icon in the bottom right corner or contact your university administrator.'));
    }
})


// User rejected, if university not launched yet (middleware)
router.post('/signup-institution', async (req, res, next) => {
    const { firstName, lastName, email, password, institutionId, institutionName} = req.body;
    try {

        if (institutionName && await getNewInstitutionByName(institutionName)) {
            throw new ForbiddenException('University name is already taken. Please select it from the dropdown list');
        }

        let institution = await getInstitutionById(institutionId);

        if (!institution) {
            await createNewInstitution(institutionName);
        }


        // Check if there is already such email
        const anotherConsumerEmail = await sharedQueries.getConsumerEmailByEmail(email);
        if (anotherConsumerEmail && anotherConsumerEmail.verifiedAt) {
            throw new ForbiddenException('The specified email is already in use');
        }

        const record = await firebaseGetOrCreateUser({
            email,
            password,
            emailVerified: false,
        });

        if (!record.alreadyInserted) {
            await sharedQueries.insertConsumer({
                firstName: firstName,
                lastName: lastName,
                email: email,
                institutionId: null,
            });
        }

        if (record.emailVerified) {
            throw new ForbiddenException('User already exists.')
        }

        try {
            await sendVerificationLink(email);
        }catch (e){
            console.log('[error sending verification link]')
        }

        res.json({
            message: 'Please verify email.',
            success: true
        });
    } catch (err) {
        next(err);
    }
});

router.get('/sso-email', async (req, res) => {
    const { email } = req.query;

    const institutions: any = await sharedQueries.getDeprecatedEvents();

    let hasSSOEmail = false;
    let instId: number;

    // Check which institution has matching ssoEmail
    institutions.forEach((institution: any) => {
        if (institution.ssoEnabled && institution.validEmails) {
            const validEmailsSplit: string[] = institution.validEmails.split(', ');

            for (let validEmail of validEmailsSplit) {
                if (email.toLowerCase().endsWith('@' + validEmail) || (institution.allowSSOSubdomains && email.toLowerCase().split('@')[1].endsWith('.' + validEmail))) {
                    hasSSOEmail = true;
                    instId = institution.institutionId;
                    break;
                }
            }
        }
    });

    res.json({ continueNormalAuthenticationFlow: !hasSSOEmail, institutionId: instId });
});

router.get('/saml-authentication', async (req, res) => {
    const { institutionId } = req.query;

    const idp = await saml.getIdp(institutionId);
    const sp = await saml.getSp(institutionId);
    sp.create_login_request_url(idp, {}, function (err, login_url, request_id) {
        if (err !== null) {
            console.log(JSON.stringify(err, null, 2));
            return res.send(500);
        }
        res.json({ url: login_url });
    });
});

router.post('/:ssoInstitutionCode/assert', async function (req, res, next) {
    const options = { request_body: req.body };
    const ssoInstitutionCode = req.params.ssoInstitutionCode;
    const institution: Institution = await sharedQueries.getInstitutionFromSSOInstitutionCode({ ssoInstitutionCode }) as Institution;
    const idp = await saml.getIdp(institution.institutionId);
    const sp = await saml.getSp(institution.institutionId);
    sp.post_assert(idp, options, async function (err, saml_response) {
        if (err !== null) {
            console.log('err_raw: ' + err);
            console.log('err: ' + JSON.stringify(err, null, 2));
            console.log('saml_response: ' + JSON.stringify(saml_response, null, 2));
            return res.sendStatus(500);
        }
        console.log(JSON.stringify(saml_response, null, 2));

        const universityId = _.get(saml_response, institution.ssoUniversityId);
        const email = _.get(saml_response, institution.ssoEmail);
        const firstName = _.get(saml_response, institution.ssoFirstName);
        const lastName = _.get(saml_response, institution.ssoLastName);

        let institutionId = institution.institutionId;

        if (!institutionId){
            throw new Error( 'Institution not found.');
        }

        const event: Event = await sharedQueries.getEventByID(institutionId) as Event;

        const record = await firebaseGetOrCreateUser({
            email,
            emailVerified: true,
        });

        if (!record.alreadyInserted) {
            await sharedQueries.insertConsumer({
                firstName: firstName,
                lastName: lastName,
                email: email,
                institutionId: institutionId,
            });
        }

        const customToken = await admin.auth().createCustomToken(record.uid);

        const consumer: Consumer = await sharedQueries.getConsumerByEmail({
            email: email,
        })

        const eventIds: any = await sharedQueries.getEventIdsByConsumerId({
            consumerId: consumer.consumerId,
        });

        const blockedEventIds : number[] = await sharedQueries.getBlockedEventIdsByConsumerId(
            { consumerId: consumer.consumerId }
        );

        const adminEventIds: number[] = await sharedQueries.getAdminEventIdsByConsumerId({ consumerId: consumer.consumerId });

        const subscriptionIds: any = await sharedQueries.getConsumerSubscriptionsIdsByConsumerId(
            consumer.consumerId,
        );

        const credential = await firebase.auth().signInWithCustomToken(customToken);

        const user = credential.user;

        await admin.auth().setCustomUserClaims(user.uid, {
            consumerId: String(consumer.consumerId),
            institutionCode: String(event.eventCode),
            eventIds
        });

        let token = await user.getIdToken(true);

        const loginResponse = {
            token,
            refresh: user.refreshToken,
            userId: consumer.consumerId,
            firstName: consumer.firstName,
            lastName: consumer.lastName,
            email,
            eventIds,
            adminEventIds,
            subscriptionIds,
            blockedEventIds,
            institutionId: consumer.institutionId,
            institutionCode: consumer.institutionCode
        };

        let redirectUrl = process.env.CALLBACK_URL;
        res
            .cookie('assert-auth', { ...loginResponse })
            .redirect(redirectUrl);
    });
});

router.get('/:ssoInstitutionCode/metadata.xml', async (req, res, next) => {
    const institution: Institution = await sharedQueries.getInstitutionFromSSOInstitutionCode({ ssoInstitutionCode: req.params.ssoInstitutionCode }) as Institution;

    const sp = await saml.getSp(institution.institutionId);
    res.type('application/xml');
    res.send(sp.create_metadata());
  });

// Identity
router.get('/identity', authenticationMiddleware.checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    res.json(res.locals.userClaims);
});

// Authorization:
// User must be logged in
router.get('/user', authenticationMiddleware.checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    const token = res.locals.token;
    let claims:Partial<Claims> = null;
    if (token) {
        claims = await admin.auth().verifyIdToken(token);

        try {
            const consumer: any = await sharedQueries.getConsumerByConsumerId({
                consumerId: claims.consumerId,
            });

            const eventIds: number[] = await sharedQueries.getEventIdsByConsumerId({
                consumerId: claims.consumerId,
            });

            const subscriptionIds: any = await sharedQueries.getConsumerSubscriptionsIdsByConsumerId(
                claims.consumerId
            );

            const adminEventIds: number[] = await sharedQueries.getAdminEventIdsByConsumerId({
                consumerId: claims.consumerId,
            });
            const blockedEventIds: number[] = await sharedQueries.getBlockedEventIdsByConsumerId({
                consumerId: claims.consumerId,
            });

            let user = {
                email: consumer.email,
                firstName: consumer.firstName,
                lastName: consumer.lastName,
                userId: consumer.consumerId,
                profileImgName: consumer.profileImgName,
                eventIds: eventIds,
                institutionId: consumer.institutionId,
                institutionCode: claims.institutionCode,
            };
            if (adminEventIds && adminEventIds.length > 0) {
                user['adminEventIds'] = adminEventIds;
            }
            if (blockedEventIds && blockedEventIds.length > 0) {
                user['blockedEventIds'] = blockedEventIds;
            }
            if (subscriptionIds && subscriptionIds.length > 0) {
                user['subscriptionIds'] = subscriptionIds;
            }
            res.json(user);

        } catch (error) {
            console.error(error);
            res.json(createError(400));
        }
    }
});

// Authorization: None
router.post('/refresh', async function (req, res, next) {
    try {
        if (req.body.refreshToken) {
            const { id_token: idToken, refresh_token: refreshToken } = await rp({
                method: 'POST',
                url: `https://securetoken.googleapis.com/v1/token?key=${config.apiKey}`,
                body: {
                    refresh_token: req.body.refreshToken,
                    grant_type: 'refresh_token',
                },
                json: true,
            });


            // get user info again, and update userClaims
            const user = await admin.auth().verifyIdToken(idToken);
            const consumer = await sharedQueries.getConsumerByConsumerId({ consumerId: user.consumerId });

            const eventIds: any = await sharedQueries.getEventIdsByConsumerId({
                consumerId: consumer.consumerId,
            });

            // Check if institution has not been deleted
            const institution: any = await sharedQueries.getDeprecatedEventById({
                institutionId: consumer.institutionId,
            });

            //@todo refactor to use setUserCustomClaims
            await admin.auth().setCustomUserClaims(user.uid, {
                consumerId: String(consumer.consumerId),
                institutionCode: institution ? String(institution.institutionCode) : null,
                eventIds
            });

            // Calling again to get latest claims just set on token
            const { id_token: newIdToken, refresh_token: newRefreshToken } = await rp({
                method: 'POST',
                url: `https://securetoken.googleapis.com/v1/token?key=${config.apiKey}`,
                body: {
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                },
                json: true,
            });

            res.json({
                token: newIdToken,
                refresh: newRefreshToken,
            });
        } else {
            res.sendStatus(400);
        }
    } catch (error) {
        console.error(error);
        res.json(createError(400));
    }
});

// Authorization:
// User must be logged in
router.post('/logout', authenticationMiddleware.checkIsAuthenticated, async function (
    req,
    res,
    next
) {
    const token = res.locals.token;
    let claims = null;
    if (token) {
        claims = await admin.auth().verifyIdToken(token);
    }

    if (claims && claims.uid) {
        admin
            .auth()
            .revokeRefreshTokens(claims.uid)
            .then(() => {
                res.json({});
            })
            .catch(function (error) {
                res.send(500);
            });
    }
});

async function firebaseGetOrCreateUser(user) {
    let record = null;
    try {
        record = await admin.auth().getUserByEmail(user && user.email);
        record.alreadyInserted = true;
    } catch {
        record = await admin.auth().createUser(user);
        record.alreadyInserted = false;
    }
    return record;
}

async function isValidInstitutionEmail(email: string, institutionId: string) {
    const validEmails = await sharedQueries.getAllowedEventEmails(+institutionId);
    const event : Event = await sharedQueries.getEventByID(+institutionId) as Event

    if (Boolean(event.allowAllDomains)) return true;

    const specifiedEmails: any = await sharedQueries.getAllowedSpecifiedEventEmails(
        +institutionId
    ); // TODO: Change var name to eventId

    // Check if email is specified
    if (!_.isNil(specifiedEmails)) {
        if (specifiedEmails.includes(email.toLowerCase())) {
            return true;
        }
    }

    // Check if email matches a domain
    const validEmailsSplit: string[] = validEmails ? validEmails.split(', ') : [];

    for (let validEmail of validEmailsSplit) {
            if (email.toLowerCase().endsWith('@' + validEmail)) {
                return true;
            }
        }

    return false;
}

const isEmailPreApprovedForEvent = async (email: string, eventId: number) => {
    if (!email || !eventId){
        return false;
    }
    const preApprovedEmails: string [] = await sharedQueries.getPreApprovedEventEmails(eventId);
    return preApprovedEmails.includes(email);
}

module.exports = router;
