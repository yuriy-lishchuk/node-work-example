import { EntityRepository, Repository } from 'typeorm';
import { PreApprovedEventEmail } from '../entities/PreApprovedEventEmail';

@EntityRepository(PreApprovedEventEmail)
export class PreApprovedEventEmailRepository extends Repository<PreApprovedEventEmail> {
}
