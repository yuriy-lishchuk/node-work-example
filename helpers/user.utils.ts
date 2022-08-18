import * as admin from 'firebase-admin';
import { Claims } from '../models';
import * as libSendGrid from '../lib/sendgrid';
import { RESET_EMAIL_TEMPLATE_ID } from '../lib/sendgrid';

const sgMail = libSendGrid.getSendGridClient();

export const setUserCustomClaims = (uid: string, claims: Partial<Claims>) =>
    admin.auth().setCustomUserClaims(uid, claims);


export const getFirebaseUserByEmail = (email: string) => admin.auth().getUserByEmail(email);

export const sendVerificationLink = async (email: string) => {
    const link = await admin.auth().generateEmailVerificationLink(email);
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

    return sgMail.send(mail);
};
