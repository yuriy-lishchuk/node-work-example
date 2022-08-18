import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("rolloutFeatureFlags")
export class RolloutFeatureFlags {
  @PrimaryGeneratedColumn({ type: "int", name: "rolloutId" })
  rolloutId: number;

  @Column("varchar", { name: "name", length: 45 })
  name: string;

  @Column("int", { name: "consumerId", nullable: true })
  consumerId: number | null;

  @Column("varchar", { name: "visitorId", nullable: true, length: 100 })
  visitorId: string | null;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;
}
