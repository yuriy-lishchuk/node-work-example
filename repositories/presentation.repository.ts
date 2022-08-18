import { EntityRepository, Repository } from 'typeorm';
import { Presentation } from '../entities/Presentation';

@EntityRepository(Presentation)
export class PresentationRepository extends Repository<Presentation> {
}
