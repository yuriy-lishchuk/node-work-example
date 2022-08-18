import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Event } from "./Event";

@Index("preApprovedEventEmail_event_eventId_fk", ["eventId"], {})
@Entity("preApprovedEventEmail")
export class PreApprovedEventEmail {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("int", { name: "eventId", nullable: true })
  eventId: number | null;

  @Column("text", { name: "email", nullable: true })
  email: string | null;

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

  @ManyToOne(() => Event, (event) => event.preApprovedEventEmails, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "eventId", referencedColumnName: "eventId" }])
  event: Event;
}
