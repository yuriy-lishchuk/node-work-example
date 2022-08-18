import * as sgMail from '@sendgrid/mail';

export const getSendGridClient = function () {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'beta') {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    return sgMail;
};


export const RESET_EMAIL_TEMPLATE_ID = 'd-88ac82df8c7f4311bb830dcbc61c0cfd';
