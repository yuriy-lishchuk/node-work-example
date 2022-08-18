import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("liveSession_institution_idx", ["institutionId"], {})
@Entity("liveSession")
export class LiveSession {
  @PrimaryGeneratedColumn({ type: "int", name: "liveSessionId" })
  liveSessionId: number;

  @Column("int", { name: "institutionId", nullable: true })
  institutionId: number | null;

  @Column("int", { name: "eventId", nullable: true })
  eventId: number | null;

  @Column("enum", {
    name: "sessionLinkType",
    enum: ["link", "description"],
    default: () => "'link'",
  })
  sessionLinkType: "link" | "description";

  @Column("text", { name: "zoomUrl" })
  zoomUrl: string;

  @Column("text", { name: "name" })
  name: string;

  @Column("timestamp", { name: "sessionStartDateTime", nullable: true })
  sessionStartDateTime: Date | null;

  @Column("timestamp", { name: "sessionEndDateTime", nullable: true })
  sessionEndDateTime: Date | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("text", { name: "insertRun", nullable: true })
  insertRun: string | null;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;

  @Column("timestamp", {
    name: "lastUpdated",
    default: () => "CURRENT_TIMESTAMP",
  })
  lastUpdated: Date;

  @Column({ type: "int", name: "liveSessionOrder", default: 0 })
  liveSessionOrder: number;
}
