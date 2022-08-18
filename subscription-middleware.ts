import * as sharedQueries from './shared-queries';

export const isConsumerHasSubscription = async ( req, res, next) => {
  const { consumerId } = res.locals.userClaims;
  try {
    const subscriptions = await sharedQueries.getConsumerSubscriptionsByConsumerId(consumerId);
    
    if(subscriptions && subscriptions.length > 0) {
      res.locals.subscriptions = subscriptions;
      next();
    } else {
      return res.status(403).json({ message: 'You are unauthorized to access this.' });
    }

  } catch (err) {
    console.log('Error while performing Query.', err);
    return res.status(500).json({ message: 'Unknown error' });
  }
};

