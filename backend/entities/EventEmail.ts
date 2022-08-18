import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Event } from "./Event";

@Index("eventId_event_fk", ["eventId"], {})
@Entity("eventEmail")
export class EventEmail {
  @PrimaryGeneratedColumn({ type: "int", name: "eventEmailId" })
  eventEmailId: number;

  @Column("varchar", { name: "email", length: 255 })
  email: string;

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

  @ManyToOne(() => Event, (event) => event.eventEmails, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "eventId", referencedColumnName: "eventId" }])
  event: Event;
}
