import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Consumer } from "./Consumer";

@Index("consumerId", ["consumerId"], {})
@Entity("consumerSubscription" )
export class ConsumerSubscription {
  @PrimaryGeneratedColumn({ type: "int", name: "consumerSubscriptionId" })
  consumerSubscriptionId: number;

  @Column("int", { name: "subscriptionId" })
  subscriptionId: number;

  @Column("int", { name: "consumerId" })
  consumerId: number;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;

  @ManyToOne(() => Consumer, (consumer) => consumer.consumerSubscriptions, {
    onDelete: "RESTRICT",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "consumerId", referencedColumnName: "consumerId" }])
  consumer: Consumer;
}
