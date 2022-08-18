import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("featureFlag")
export class FeatureFlag {
  @PrimaryGeneratedColumn({ type: "int", name: "featureFlagId" })
  featureFlagId: number;

  @Column("varchar", { name: "name", length: 45 })
  name: string;

  @Column("varchar", { name: "consumers", nullable: true, length: 45 })
  consumers: string | null;
}
