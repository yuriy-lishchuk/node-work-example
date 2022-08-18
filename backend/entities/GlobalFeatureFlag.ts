import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("globalFeatureFlag")
export class GlobalFeatureFlag {
  @PrimaryGeneratedColumn({ type: "int", name: "featureFlagId" })
  featureFlagId: number;

  @Column("varchar", { name: "name", length: 40 })
  name: string;

  @Column("text", { name: "consumers", nullable: true })
  consumers: string | null;
}
