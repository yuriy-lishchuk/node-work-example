import { Router } from 'express';
import { createStripeSession, createStripeUser, getStripePlan } from '../helpers';
import { checkIsAuthenticated, softCheckIsAuthenticated } from '../authentication-middleware';
import { getClaimsFromResponse } from '../middlewares';
import { getConsumerByConsumerId, updateConsumerStripeId } from '../shared-queries';
import Stripe from 'stripe';

const router = Router();

router.post('/create-session', softCheckIsAuthenticated, checkIsAuthenticated, async (req, res , next) => {
    try {
        const { priceId, fee, quantity, institutionId } = req.body;
        const { consumerId } = getClaimsFromResponse(res);
        const consumer = await getConsumerByConsumerId({ consumerId });

        let user: Stripe.Customer;

        if (!consumer.stripeId) {
            user = await createStripeUser(consumer);
            await updateConsumerStripeId(consumerId, user.id);
        }

        const stripeId = consumer.stripeId ? consumer.stripeId : user.id;
        const session = await createStripeSession({ quantity, priceId, fee, stripeId, consumerId , institutionId });
        res.json({ id: session.id });
    } catch (err) {
      next(err)
    }
});

// Authorization None, Plans should display for a non-logged in user
router.get('/plans/:id', async (req, res, next) => {
  try {
      const plan = await getStripePlan(req.params.id);
      res.json(plan);
  }catch (err){
      next(err)
  }
});



export default router;
