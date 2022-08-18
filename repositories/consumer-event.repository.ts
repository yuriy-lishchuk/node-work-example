import { EntityRepository, Repository } from 'typeorm';
import { ConsumerEvent } from '../entities/ConsumerEvent';

@EntityRepository(ConsumerEvent)
export class ConsumerEventRepository extends Repository<ConsumerEvent> {

    /**
     * get consumer events by consumer id
     * @param consumerId
     * @return ConsumerEvent[]
     */
    public getConsumerEvents(consumerId: number) {
        return this.find({
            consumerId,
        });
    }

    /**
     * Get one consumer event by consumerId and eventId
     * @param eventId
     * @param consumerId
     * @returns ConsumerEvent
     */
    public getConsumerEvent({ eventId, consumerId }: { consumerId: number, eventId: number }) {
        return this.findOne({ eventId, consumerId });
    }
}
