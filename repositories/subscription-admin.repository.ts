import { EntityRepository, Repository } from 'typeorm';
import { SubscriptionAdmin } from '../entities/SubscriptionAdmin';

@EntityRepository(SubscriptionAdmin)
export class SubscriptionAdminRepository extends Repository<SubscriptionAdmin> {
}

