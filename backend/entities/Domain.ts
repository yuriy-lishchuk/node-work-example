import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeprecatedEvent } from "./DeprecatedEvent";

@Index("institutionId_fk_idx_idx", ["institutionId"], {})
@Entity("domain")
export class Domain {
  @PrimaryGeneratedColumn({ type: "int", name: "domainId" })
  domainId: number;

  @Column("varchar", { name: "name", nullable: true, length: 45 })
  name: string | null;

  @Column("int", { name: "institutionId", nullable: true })
  institutionId: number | null;

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

  @ManyToOne(
    () => DeprecatedEvent,
    (deprecatedEvent) => deprecatedEvent.domains,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([
    { name: "institutionId", referencedColumnName: "institutionId" },
  ])
  institution: DeprecatedEvent;
}
