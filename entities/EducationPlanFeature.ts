import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EducationPlan } from "./EducationPlan";
import { PlanFeature } from "./PlanFeature";

@Index("educationPlanId_educationPlan_fk_idx", ["educationPlanId"], {})
@Index("planFeatureId_planFeature_fk_idx", ["planFeatureId"], {})
@Entity("educationPlanFeature")
export class EducationPlanFeature {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("int", { name: "educationPlanId" })
  educationPlanId: number;

  @Column("int", { name: "planFeatureId" })
  planFeatureId: number;

  @Column("varchar", { name: "amount", nullable: true, length: 45 })
  amount: string | null;

  @Column("tinyint", { name: "ability", nullable: true, width: 1 })
  ability: boolean | null;

  @ManyToOne(
    () => EducationPlan,
    (educationPlan) => educationPlan.educationPlanFeatures,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([
    { name: "educationPlanId", referencedColumnName: "educationPlanId" },
  ])
  educationPlan: EducationPlan;

  @ManyToOne(
    () => PlanFeature,
    (planFeature) => planFeature.educationPlanFeatures,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([{ name: "planFeatureId", referencedColumnName: "featureId" }])
  planFeature: PlanFeature;
}
