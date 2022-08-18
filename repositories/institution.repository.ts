import { EntityRepository, Repository } from 'typeorm';
import { Institution } from '../entities/Institution';

@EntityRepository(Institution)
export class InstitutionRepository extends Repository<Institution> {

    public getInstitutions() {
        return this.find({ order: { name: 'ASC' } });
    }

    public createInstitution(institution: Partial<Institution>) {
        return this.insert(institution);
    }

    public getInstitutionById(institutionId: number) {
        return this.findOne({ institutionId });
    }
}
