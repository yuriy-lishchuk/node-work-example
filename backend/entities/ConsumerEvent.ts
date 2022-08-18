import { Column, Entity } from "typeorm";

@Entity("consumerEvent")
export class ConsumerEvent {
  @Column("int", { primary: true, name: "consumerId" })
  consumerId: number;

  @Column("int", { primary: true, name: "eventId" })
  eventId: number;

  @Column("tinyint", { name: "isAdmin", width: 1, default: () => "'0'" })
  isAdmin: boolean;

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
}
