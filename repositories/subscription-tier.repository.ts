import { EntityRepository, Repository } from 'typeorm';
import { SubscriptionTiers } from '../entities/SubscriptionTiers';

@EntityRepository(SubscriptionTiers)
export class SubscriptionTierRepository extends Repository<SubscriptionTiers> {
}

