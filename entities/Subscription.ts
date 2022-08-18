import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Institution } from "./Institution";
import { SubscriptionTiers } from "./SubscriptionTiers";
import { SubscriptionAddOns } from "./SubscriptionAddOns";
import { SubscriptionAdmin } from "./SubscriptionAdmin";

@Index("subscription_subscriptionTiers_id_fk", ["subscriptionTierId"], {})
@Index("subscription_institution_id_fk_idx", ["institutionId"], {})
@Entity("subscription")
export class Subscription {
  @PrimaryGeneratedColumn({ type: "int", name: "subscriptionId" })
  subscriptionId: number;

  @Column("varchar", { name: "description", nullable: true, length: 128 })
  description: string | null;

  @Column("int", { name: "subscriptionTierId" })
  subscriptionTierId: number;

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

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;

  @Column("timestamp", {
    name: "startDate",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  startDate: Date | null;

  @Column("timestamp", { name: "endDate", nullable: true })
  endDate: Date | null;

  @Column("varchar", {
    name: "stripeSubscriptionId",
    nullable: true,
    length: 255,
  })
  stripeSubscriptionId: string | null;

  @ManyToOne(() => Institution, (institution) => institution.subscriptions, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([
    { name: "institutionId", referencedColumnName: "institutionId" },
  ])
  institution: Institution;

  @ManyToOne(
    () => SubscriptionTiers,
    (subscriptionTiers) => subscriptionTiers.subscriptions,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscriptionTierId", referencedColumnName: "subscriptionTiersId" },
  ])
  subscriptionTier: SubscriptionTiers;

  @OneToMany(
    () => SubscriptionAddOns,
    (subscriptionAddOns) => subscriptionAddOns.subscription
  )
  subscriptionAddOns: SubscriptionAddOns[];

  @OneToMany(
    () => SubscriptionAdmin,
    (subscriptionAdmin) => subscriptionAdmin.subscription
  )
  subscriptionAdmins: SubscriptionAdmin[];
}
