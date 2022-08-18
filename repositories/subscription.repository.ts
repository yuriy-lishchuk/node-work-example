import { EntityRepository, Repository } from 'typeorm';
import { Subscription } from '../entities/Subscription';

@EntityRepository(Subscription)
export class SubscriptionRepository extends Repository<Subscription> {

    /**
     * @description returns one subscription by subscriptionId
     * @param {number} subscriptionId.
     * @param {string} [relations="subscriptionTier"] - array of relationships to auto join, default ['subscriptionTier]
     * @return {Promise<Subscription>} Subscription Object with joined relations
     */
    public getSubscriptionById(subscriptionId: number, relations: string[] = ['subscriptionTier']): Promise<Subscription> {
        return this.findOne({
            where: { subscriptionId },
            relations,
        });
    }

}
