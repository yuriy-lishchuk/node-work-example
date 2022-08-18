import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Consumer } from "./Consumer";
import { Subscription } from "./Subscription";
import { SubscriptionEmail } from "./SubscriptionEmail";

@Index("table_name_consumer_consumerId_fk", ["consumerId"], {})
@Index("table_name_subscription_subscriptionId_fk", ["subscriptionId"], {})
@Entity("subscriptionAdmin")
export class SubscriptionAdmin {
  @PrimaryGeneratedColumn({ type: "int", name: "subscriptionAdminId" })
  subscriptionAdminId: number;

  @Column("int", { name: "consumerId" })
  consumerId: number;

  @Column("int", { name: "subscriptionId" })
  subscriptionId: number;

  @Column("tinyint", {
    name: "isSuperAdmin",
    nullable: true,
    default: () => "'0'",
  })
  isSuperAdmin: number | null;

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

  @ManyToOne(() => Consumer, (consumer) => consumer.subscriptionAdmins, {
    onDelete: "CASCADE",
    onUpdate: "RESTRICT",
  })
  @JoinColumn([{ name: "consumerId", referencedColumnName: "consumerId" }])
  consumer: Consumer;

  @ManyToOne(
    () => Subscription,
    (subscription) => subscription.subscriptionAdmins,
    { onDelete: "CASCADE", onUpdate: "RESTRICT" }
  )
  @JoinColumn([
    { name: "subscriptionId", referencedColumnName: "subscriptionId" },
  ])
  subscription: Subscription;

  @OneToMany(
    () => SubscriptionEmail,
    (subscriptionEmail) => subscriptionEmail.subscriptionAdmin
  )
  subscriptionEmails: SubscriptionEmail[];
}
