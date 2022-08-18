import * as express from 'express';
import { institutionSchema } from '../schemas';
import { BadRequestException, ForbiddenException } from '../helpers';
import { getInstitutionRepository } from '../repositories';
import { getClaimsFromResponse } from '../middlewares';
import { checkIsAuthenticated, softCheckIsAuthenticated } from '../authentication-middleware';

const router = express.Router();

router.post('/', softCheckIsAuthenticated, checkIsAuthenticated, async (req, res, next) => {
    try {

        const repository = getInstitutionRepository();
        const { name } = await institutionSchema
            .validateAsync(req.body).catch(err => {
                throw new BadRequestException(err.message);
            });

        const organization = await repository.findOne({ name });

        if (organization) {
            throw new ForbiddenException('Organization name is already taken.');
        }

        const { consumerId } = getClaimsFromResponse(res);
        const institution = await repository.save({ name , createdBy : { consumerId } });

        return res.status(200).json(institution);
    } catch (err) {
        console.log('[e]',err)
        next(err);
    }
});


router.get('/', async (req, res, next) => {
    try {
        const institutions = await getInstitutionRepository().getInstitutions()
        return res.status(200).json(institutions);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const institutions = await getInstitutionRepository().getInstitutionById(+req.params.id);
        return res.status(200).json(institutions);
    } catch (err) {
        next(err);
    }
});


export default router;
