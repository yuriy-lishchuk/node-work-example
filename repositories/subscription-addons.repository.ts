import { EntityRepository, Repository } from 'typeorm';
import { SubscriptionAddOns } from '../entities/SubscriptionAddOns';

@EntityRepository(SubscriptionAddOns)
export class SubscriptionAddonsRepository extends Repository<SubscriptionAddOns> {
}

