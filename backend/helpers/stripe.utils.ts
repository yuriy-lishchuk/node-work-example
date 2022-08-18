import Stripe from 'stripe';
import { Consumer } from '../models';

export const stripe: Stripe = require('stripe')(process.env.STRIPE_API_KEY);

export interface CreateSessionPayload {
    priceId: string;
    fee : string;
    quantity?: number;
    stripeId: string
    consumerId: number
    institutionId: number
}


export const createStripeSession = async ({ priceId, fee ,quantity, stripeId, consumerId, institutionId }: CreateSessionPayload): Promise<Stripe.Checkout.Session> => {
    const plan: Stripe.Price = await stripe.prices.retrieve(priceId);
    const mode = plan.type === 'one_time' ? 'payment' : 'subscription';
    let domain;
    switch (process.env.NODE_ENV) {
        case 'production' :
            domain = 'https://symposium.foragerone.com';
            break;
        case 'beta' :
            domain = 'http://beta-symposium.foragerone.com'
            break;
        default :
            domain = 'http://localhost:4200'
    }
    const options: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode,
        customer: stripeId,
        metadata: {
            consumerId,
            institutionId,
            priceId,
        },
        client_reference_id: consumerId.toString(),
        line_items: [
            {
                price: plan.id,
                quantity: quantity || 1,
            },
            {
                price : fee,
                quantity : 1
            }
        ],
        success_url: `${domain}/events/admin`,
        cancel_url: `${domain}/pricing`,
    };
    return stripe.checkout.sessions.create(options);
};


export const createStripeUser = (consumer: Consumer): Promise<Stripe.Customer> => {
    const name = `${consumer.firstName} ${consumer.lastName}`;
    return stripe.customers.create({
        email: consumer.email,
        metadata: {
            consumerId: consumer.consumerId,
        },
        name,
    });
};

export const getStripeSubscription = (subscriptionId: string) => {
    return stripe.subscriptions.retrieve(subscriptionId);
};

export const getStripePlan = (priceId: string) => {
    return stripe.prices.retrieve(priceId);
};

export const updateSubscriptionPaymentMethod = (subscriptionId: string, collection_method: Stripe.Subscription.CollectionMethod = 'send_invoice') => {
    return stripe.subscriptions.update(subscriptionId, {
        collection_method,
        days_until_due: 30,
    });
};
