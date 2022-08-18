import { Router } from 'express';
import { getStripeSubscription, stripe, updateSubscriptionPaymentMethod } from '../helpers';
import { getConsumerByStripeId } from '../shared-queries';
import Stripe from 'stripe';
import {
    createConsumerAdminSubscription,
    createSubscription,
    getSubscriptionByStripeSubscriptionId,
    getSubscriptionTierByStripeId,
    updateSubscriptionStartAndEndDates,
} from '../queries';
import { formatISO9075, fromUnixTime } from 'date-fns';
import { getInstitutionRepository } from '../repositories';

const router = Router();


const stripeRawBodyMiddleware = (req, res, next) => {
    var data_stream = '';

    // Readable streams emit 'data' events once a listener is added
    req.setEncoding('utf-8')
        .on('data', function(data) {
            data_stream += data;
        })
        .on('end', function() {
            // @ts-ignore
            req.rawBody;
            // @ts-ignore
            req.rawBody = data_stream;
            next();
        });
};


// Authorization None
router.post('/webhook', stripeRawBodyMiddleware, async (request: any, response) => {

    const signature = request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    try {
        let { data, type }: Stripe.Event = stripe.webhooks.constructEvent(request.rawBody, signature, webhookSecret);

        const event: any = data.object;

        const consumer = await getConsumerByStripeId(event.customer);
        const stripeSubscription = event.subscription ? await getStripeSubscription(event.subscription) : null;
        const subscriptionId = stripeSubscription ? stripeSubscription.id : null;

        // const consumer = await getConsumerByStripeId('cus_IIEbqVaTwWcEeR');
        // const stripeSubscription =  await getStripeSubscription('sub_IKRdf3s1UvB2X5')
        const { start, end } = getSubscriptionStartAndEndDates(stripeSubscription);


        switch (type) {
            // Payment is successful and the subscription is created.
            // We should provision the subscription.
            case 'checkout.session.completed':

                // set subscription payment to send_invoice after the first successful payment
                if (stripeSubscription) {
                    await updateSubscriptionPaymentMethod(subscriptionId);
                }

                const institutionId = event.metadata.institutionId
                const tier = await getSubscriptionTierByStripeId(event.metadata.priceId);
                const subscription = await createSubscription(tier, start, end, event.metadata.institutionId, subscriptionId);
                await createConsumerAdminSubscription(consumer.consumerId, subscription);
                await getInstitutionRepository().update({ institutionId }, { hasPurchasedSubscription : true });
                console.log(`[Checkout Successful] [ConsumerID] ${consumer.consumerId} [SubscriptionID] ${subscriptionId}`);
                break;

            // Continue to provision the subscription as payments continue to be made.
            case 'invoice.payment_succeeded':
                const existingSubscription = await getSubscriptionByStripeSubscriptionId(subscriptionId);
                if (existingSubscription) {
                    await updateSubscriptionStartAndEndDates(existingSubscription.subscriptionId, start, end);
                }
                console.log(`[Invoice paid] [ConsumerID] ${consumer.consumerId} [SubscriptionID] ${subscriptionId}`);
                break;


            // The payment failed or the customer does not have a valid payment method.
            case 'invoice.payment_failed':
                console.log('Invoice Payment Failed');
                break;
            default:
                console.log(`Unhandled event type ${type}`);
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    } catch (err) {
        console.log('[webhook error]', err);
        response.status(400).send(`Webhook Error: ${err.message}`);
    }
});

const getSubscriptionStartAndEndDates = (subscription: Stripe.Subscription) => {
    const start = subscription && subscription.current_period_start ? formatISO9075(fromUnixTime(subscription.current_period_start)) : null;
    const end = subscription && subscription.current_period_end ? formatISO9075(fromUnixTime(subscription.current_period_end)) : null;
    return {
        start,
        end,
    };
};
export default router;
