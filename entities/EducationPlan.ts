import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EducationPlanFeature } from "./EducationPlanFeature";

@Entity("educationPlan")
export class EducationPlan {
  @PrimaryGeneratedColumn({ type: "int", name: "educationPlanId" })
  educationPlanId: number;

  @Column("enum", { name: "planType", enum: ["lite", "plus", "enterprise"] })
  planType: "lite" | "plus" | "enterprise";

  @Column("enum", { name: "billingType", enum: ["annual", "evently"] })
  billingType: "annual" | "evently";

  @Column("varchar", { name: "planName", nullable: true, length: 45 })
  planName: string | null;

  @Column("mediumtext", { name: "planDescription", nullable: true })
  planDescription: string | null;

  @Column("varchar", { name: "price", nullable: true, length: 45 })
  price: string | null;

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

  @OneToMany(
    () => EducationPlanFeature,
    (educationPlanFeature) => educationPlanFeature.educationPlan
  )
  educationPlanFeatures: EducationPlanFeature[];
}
