import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Subscription } from "./Subscription";

@Entity("subscriptionTiers",  )
export class SubscriptionTiers {
  @PrimaryGeneratedColumn({ type: "int", name: "subscriptionTiersId" })
  subscriptionTiersId: number;

  @Column("text", { name: "name" })
  name: string;


  @Column("enum", { name: "billingType", enum: ["recurring", "single"] })
  billingType: "recurring" | "single";


  @Column("enum", { name: "clientSector", enum: ["corporation", "education"] })
  clientSector: "corporation" | "education";

  @Column("text", { name: "planType" })
  planType: string;

  @Column("varchar", { name: "description", nullable: true, length: 128 })
  description: string | null;

  @Column("int", { name: "eventsNumberLimit", nullable: true })
  eventsNumberLimit: number | null;

  @Column("int", { name: "numAdminAccounts", nullable: true })
  numAdminAccounts: number | null;

  @Column("int", { name: "eventUptimeInDays", nullable: true })
  eventUptimeInDays: number | null;

  @Column("int", { name: "presentationsLimit", nullable: true })
  presentationsLimit: number | null;

  @Column("int", { name: "liveSessionsLimit", nullable: true })
  liveSessionsLimit: number | null;

  @Column("varchar", { name: "priceId", nullable: true, length: 255 })
  priceId: string | null;

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


  @Column("tinyint", { name: "editCoverPhoto", nullable: true })
  editCoverPhoto: boolean;

  @Column("tinyint", { name: "editEventLogo", nullable: true })
  editEventLogo: boolean;

  @Column("tinyint", { name: "editSplashScreen", nullable: true })
  editSplashScreen: boolean;

  @Column("tinyint", { name: "editPresentation", nullable: true })
  editPresentation: boolean;

  @Column("tinyint", { name: "accessCustomSubmissionFormEditor"})
  accessCustomSubmissionFormEditor: boolean;

  @OneToMany(
    () => Subscription,
    (subscription) => subscription.subscriptionTier
  )
  subscriptions: Subscription[];
}
