import { EntityRepository, Repository } from 'typeorm';
import { EventFeatureFlag } from '../entities/EventFeatureFlag';
import { SubscriptionTiers } from '../entities/SubscriptionTiers';
import { isNull } from 'lodash'
@EntityRepository(EventFeatureFlag)
export class EventFeatureFlagRepository extends Repository<EventFeatureFlag> {


    /**
     * @description get EventFeatureFlag feature flags by event id
     * @return {Promise<EventFeatureFlag>} EventFeatureFlag Object with joined relations
     * @param eventId
     */
    public getEventFeatureFlagsByEventId(eventId: number): Promise<EventFeatureFlag> {
        return this.findOne({
            where: { eventId },
        });
    }

    public createEventFeatureFlags(eventId: number, tier: SubscriptionTiers) {
        const { editSplashScreen, editCoverPhoto, editEventLogo, editPresentation, accessCustomSubmissionFormEditor } = tier;
        return this.insert({
            eventId,
            editEventLogo: isNull(editEventLogo) || Boolean(editEventLogo)  ,
            editPresentation: isNull(editPresentation) || Boolean(editPresentation),
            editCoverPhoto: isNull(editCoverPhoto) || Boolean(editCoverPhoto),
            accessCustomSubmissionFormEditor: isNull(accessCustomSubmissionFormEditor) || Boolean(accessCustomSubmissionFormEditor),
            editSplashScreen: isNull(editSplashScreen) || Boolean(editSplashScreen),
            useLatestSubmission: true,
        });
    }

}
