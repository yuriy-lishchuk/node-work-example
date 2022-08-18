import * as sharedQueries from '../shared-queries';
import { getSendGridClient } from '../lib/sendgrid';

var express = require('express');
var router = express.Router();
var cors = require('cors');
router.use(cors());

// Get FAQs:
// No Authorization Required
router.get('/faqs', async function (req, res, next) {
    try {
        const faqs = await sharedQueries.getFAQs();

        res.json(faqs);
    } catch (err) {
        console.log('Error during querying', err);
        res.status(500).json({
            message: 'Internal server error',
        });
    }
});

router.post('/sendemail', async function (req, res, next) {
    const sgMail = getSendGridClient();

    const name = req.body.name;
    const email = req.body.email;
    const organizationName = req.body.organizationName;
    const pricingPlan = req.body.pricingPlan;
    const comments = req.body.comments;
    console.log(req)
    try {
        const sendEmail = {
            to: 'team@foragerone.com',
            from: {
                email: email,
                name: name,
            },
            templateId: 'd-ed9845c81cb4455db954baba88bffb51',
            dynamicTemplateData: {
                name: name,
                pricingPlan: pricingPlan,
                organizationName: organizationName,
                comment: comments,
            }
        };
        await sgMail.send(sendEmail);
        await sharedQueries.saveComments({ name, email, organizationName, pricingPlan, comments });
        res.json({
            message: 'Success'
        });

        
        const replyEmail = {
            to: email,
            from: {
                email: 'no-reply@foragerone.com',
                name: 'Symposium by ForagerOne',
            },
            templateId: 'd-68733d8ef9b84878a45d10a34f4e7916',
        };
        return sgMail.send(replyEmail);
    } catch(error) {
        next(error);
    }
});

module.exports = router;
