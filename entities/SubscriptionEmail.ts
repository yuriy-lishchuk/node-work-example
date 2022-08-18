import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SubscriptionAdmin } from "./SubscriptionAdmin";

@Index("subscriptionAdminId_fk_idx", ["subscriptionAdminId"], {})
@Entity("subscriptionEmail")
export class SubscriptionEmail {
  @PrimaryGeneratedColumn({ type: "int", name: "subscriptionEmailId" })
  subscriptionEmailId: number;

  @Column("int", { name: "subscriptionAdminId" })
  subscriptionAdminId: number;

  @Column("varchar", { name: "email", length: 45 })
  email: string;

  @Column("int", { name: "adminConsumerId", nullable: true })
  adminConsumerId: number | null;

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

  @Column("timestamp", { name: "verifiedAt", nullable: true })
  verifiedAt: Date | null;

  @ManyToOne(
    () => SubscriptionAdmin,
    (subscriptionAdmin) => subscriptionAdmin.subscriptionEmails,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([
    {
      name: "subscriptionAdminId",
      referencedColumnName: "subscriptionAdminId",
    },
  ])
  subscriptionAdmin: SubscriptionAdmin;
}
