import { EntityRepository, Repository } from 'typeorm';
import { EventEmail } from '../entities/EventEmail';

@EntityRepository(EventEmail)
export class EventEmailRepository extends Repository<EventEmail> {
}
