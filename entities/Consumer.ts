import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BlockedConsumerEvent } from "./BlockedConsumerEvent";
import { DeprecatedEvent } from "./DeprecatedEvent";
import { ConsumerSubscription } from "./ConsumerSubscription";
import { SubscriptionAdmin } from "./SubscriptionAdmin";
import { Institution } from './Institution';

@Index("consumer_stripeId_uindex", ["stripeId"], { unique: true })
@Index("institutionId_fk_idx_idx", ["institutionId"], {})
@Index("institutionId_fk_idx", ["institutionId"], {})
@Entity("consumer")
export class Consumer {
  @PrimaryGeneratedColumn({ type: "int", name: "consumerId" })
  consumerId: number;

  @Column("varchar", { name: "samlUniversityId", nullable: true, length: 45 })
  samlUniversityId: string | null;

  @Column("varchar", { name: "firstName", length: 45 })
  firstName: string;

  @Column("varchar", { name: "lastName", length: 45 })
  lastName: string;

  @Column("int", { name: "primaryEmailId", nullable: true })
  primaryEmailId: number | null;

  @Column("varchar", { name: "email", length: 255 })
  email: string;

  @Column("varchar", { name: "profileImgName", nullable: true, length: 255 })
  profileImgName: string | null;

  @Column("varchar", { name: "major", nullable: true, length: 45 })
  major: string | null;

  @Column("varchar", { name: "year", nullable: true, length: 45 })
  year: string | null;

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

  @Column("timestamp", { name: "lastLoginDate", nullable: true })
  lastLoginDate: Date | null;

  @Column("timestamp", { name: "signedUpDate", nullable: true })
  signedUpDate: Date | null;

  @Column("varchar", {
    name: "stripeId",
    nullable: true,
    unique: true,
    length: 255,
  })
  stripeId: string | null;

  @OneToMany(
    () => BlockedConsumerEvent,
    (blockedConsumerEvent) => blockedConsumerEvent.consumer
  )
  blockedConsumerEvents: BlockedConsumerEvent[];

  @ManyToOne(
    () => DeprecatedEvent,
    (deprecatedEvent) => deprecatedEvent.consumers,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([
    { name: "institutionId", referencedColumnName: "institutionId" },
  ])
  institution: DeprecatedEvent;

  @OneToMany(
    () => ConsumerSubscription,
    (consumerSubscription) => consumerSubscription.consumer
  )
  consumerSubscriptions: ConsumerSubscription[];

  @OneToMany(
    () => SubscriptionAdmin,
    (subscriptionAdmin) => subscriptionAdmin.consumer
  )
  subscriptionAdmins: SubscriptionAdmin[];

  @OneToMany(() => Institution, (institution) => institution.createdBy)
  organizations: Institution[];
}
