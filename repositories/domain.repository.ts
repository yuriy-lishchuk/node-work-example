import { EntityRepository, Repository } from 'typeorm';
import { Domain } from '../entities/Domain';

@EntityRepository(Domain)
export class DomainRepository extends Repository<Domain> {
}
