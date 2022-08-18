import { EntityRepository, Repository } from 'typeorm';
import { ConsumerSubscription } from '../entities/ConsumerSubscription';

@EntityRepository(ConsumerSubscription)
export class ConsumerSubscriptionRepository extends Repository<ConsumerSubscription> {
}
