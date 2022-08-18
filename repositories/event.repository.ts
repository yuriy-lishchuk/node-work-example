import { EntityRepository, Repository } from 'typeorm';
import { Event } from '../entities/Event';

@EntityRepository(Event)
export class EventRepository extends Repository<Event> {


    /**
     * @description returns one event by eventId, eventCode or hash
     * @param {string}  id - eventId, eventCode or hash.
     * @param {string} [relations="presentations"] - array of relationships to auto join, default ['presentations]
     * @return {Promise<Event>} Event Object with joined relations
     */
    public findOneEventByHashCodeOrID(id: string | number, relations: string[] = ['presentations']): Promise<Event> {
        return this.findOne({
            where: [
                { eventCode: id },
                { eventId: id },
                { hash: id },
            ],
            relations,
        });
    }

    /**
     * @description update one event by event id
     * @param eventId - the id of the event
     * @param event - updated event entity
     */
    public updateEvent(eventId: number, event: Partial<Event>) {
        return this.update({ eventId }, event);
    }

}
