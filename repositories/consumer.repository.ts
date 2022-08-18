import { EntityRepository, Repository } from 'typeorm';
import { Consumer } from '../entities/Consumer';

@EntityRepository(Consumer)
export class ConsumerRepository extends Repository<Consumer> {

    // example of custom repository function
    createAndSave(consumer: Consumer) {
        const user = this.create(consumer);
        return this.manager.save(user);
    }

    /**
     * get one consumer by consumer id
     * @param consumerId
     * @return Consumer
     */
    getConsumerById(consumerId:number){
        return this.findOne( { consumerId })
    }

}
