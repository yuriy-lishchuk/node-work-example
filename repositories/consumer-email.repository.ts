import { EntityRepository, Repository } from 'typeorm';
import { ConsumerEmail } from '../entities/ConsumerEmail';

@EntityRepository(ConsumerEmail)
export class ConsumerEmailRepository extends Repository<ConsumerEmail> {
}
