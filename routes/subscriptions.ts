import { checkIsAuthenticated, softCheckIsAuthenticated } from '../authentication-middleware';
import * as express from 'express';
import { getSubscriptionsByConsumerId, getSubscriptionUsage } from '../queries';

const router = express.Router();

router.get('/', softCheckIsAuthenticated, checkIsAuthenticated, async (req, res, next) => {
    try {
        const { consumerId } = res.locals.userClaims;

        const subscriptions = await getSubscriptionsByConsumerId(consumerId);
        for (const subscription of subscriptions){
            const { events } = await getSubscriptionUsage(subscription.subscriptionId)
            subscription.eventsLeft = events;
        }

        return res.status(200).json(subscriptions);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
