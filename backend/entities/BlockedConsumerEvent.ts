import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Consumer } from "./Consumer";

@Index("consumerId_fk_idx", ["consumerId"], {})
@Entity("blockedConsumerEvent")
export class BlockedConsumerEvent {
  @PrimaryGeneratedColumn({ type: "int", name: "blockedConsumerEventId" })
  blockedConsumerEventId: number;

  @Column("int", { name: "consumerId" })
  consumerId: number;

  @Column("int", { name: "eventId" })
  eventId: number;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;

  @Column("timestamp", {
    name: "lastUpdated",
    default: () => "CURRENT_TIMESTAMP",
  })
  lastUpdated: Date;

  @ManyToOne(() => Consumer, (consumer) => consumer.blockedConsumerEvents, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "consumerId", referencedColumnName: "consumerId" }])
  consumer: Consumer;
}
