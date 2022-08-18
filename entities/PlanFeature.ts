import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EducationPlanFeature } from "./EducationPlanFeature";

@Entity("planFeature")
export class PlanFeature {
  @PrimaryGeneratedColumn({ type: "int", name: "featureId" })
  featureId: number;

  @Column("varchar", { name: "title", length: 100 })
  title: string;

  @Column("mediumtext", { name: "tip", nullable: true })
  tip: string | null;

  @Column("varchar", { name: "category", nullable: true, length: 45 })
  category: string | null;

  @Column("enum", {
    name: "type",
    enum: ["amount", "ability", "both"],
    default: () => "'amount'",
  })
  type: "amount" | "ability" | "both";

  @Column("int", { name: "categoryOrder", nullable: true })
  categoryOrder: number | null;

  @Column("int", { name: "categoryFeatureOrder", nullable: true })
  categoryFeatureOrder: number | null;

  @OneToMany(
    () => EducationPlanFeature,
    (educationPlanFeature) => educationPlanFeature.planFeature
  )
  educationPlanFeatures: EducationPlanFeature[];
}
