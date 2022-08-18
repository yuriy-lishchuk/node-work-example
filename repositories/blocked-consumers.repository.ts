import { EntityRepository, Repository } from 'typeorm';
import { BlockedConsumerEvent } from '../entities/BlockedConsumerEvent';

@EntityRepository(BlockedConsumerEvent)
export class BlockedConsumerEventRepository extends Repository<BlockedConsumerEvent> {

}
