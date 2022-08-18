import { EntityRepository, Repository } from 'typeorm';
import { LiveSession } from '../entities/LiveSession';

@EntityRepository(LiveSession)
export class LiveSessionRepository extends Repository<LiveSession> {
}
