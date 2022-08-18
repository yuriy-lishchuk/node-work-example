import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Subscription } from "./Subscription";

@Index(
  "subscriptionAddOns_subscription_subscriptionId_fk",
  ["subscriptionId"],
  {}
)
@Entity("subscriptionAddOns")
export class SubscriptionAddOns {
  @PrimaryGeneratedColumn({ type: "int", name: "subscriptionAddOnsId" })
  subscriptionAddOnsId: number;

  @Column("int", { name: "subscriptionId" })
  subscriptionId: number;

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

  @ManyToOne(
    () => Subscription,
    (subscription) => subscription.subscriptionAddOns,
    { onDelete: "RESTRICT", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscriptionId", referencedColumnName: "subscriptionId" },
  ])
  subscription: Subscription;
}
