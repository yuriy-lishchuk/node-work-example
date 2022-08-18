import { Router } from 'express';
import { BadRequestException } from '../helpers';
import { addRolloutShowRecord, getRolloutShowsByVisitorOrConsumerId } from '../queries';

const router = Router();
router.get('/rollout/:visitorId/:consumerId', async function (req, res, next) {
    const { visitorId, consumerId } = req.params;

    try {
        if (!visitorId) {
            throw new BadRequestException('visitorId is required');
        } else {
            const rollouts = await getRolloutShowsByVisitorOrConsumerId(visitorId, Number(consumerId));

            res.json(rollouts);
        }
    } catch (err) {
        next(err);
    }
});

router.post('/rollout', async function (req, res, next) {
    const { name, visitorId, consumerId } = req.body;

    try {
        if (!name || !visitorId || consumerId && isNaN(consumerId)) {
            throw new BadRequestException(
                'name, visitorId, or consumerId is missing or invalid'
            );
        } else {
            await addRolloutShowRecord(visitorId, name, consumerId);

            res.json({});
        }
    } catch (err) {
        next(err);
    }
});

export default router;