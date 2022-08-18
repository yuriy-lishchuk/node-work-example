import { EntityRepository, Repository } from 'typeorm';
import { PresentationTag } from '../entities/PresentationTag';

@EntityRepository(PresentationTag)
export class PresentationTagRepository extends Repository<PresentationTag> {
}
