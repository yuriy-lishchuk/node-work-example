import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EventEmail } from "./EventEmail";
import { PreApprovedEventEmail } from "./PreApprovedEventEmail";
import {Presentation} from "./Presentation";

@Entity("event")
export class Event {
  @PrimaryGeneratedColumn({ type: "int", name: "eventId" })
  eventId: number;

  @Column("text", { name: "name" })
  name: string;

  @Column("text", { name: "organizedBy" })
  organizedBy: string;

  @Column("varchar", { name: "eventCode", length: 45 })
  eventCode: string;

  @Column("int", { name: "subscriptionId" })
  subscriptionId: number;

  @Column("text", { name: "validEmails", nullable: true })
  validEmails: string | null;

  @Column("tinyint", {
    name: "allowAllDomains",
    nullable: true,
    default: () => "'0'",
  })
  allowAllDomains: number | null;

  @Column("enum", {
    name: "privacyLevel",
    enum: [
      "private",
      "institutionHash",
      "eventHash",
      "presentationHash",
      "public",
    ],
    default: () => "'private'",
  })
  privacyLevel:
    | "private"
    | "institutionHash"
    | "eventHash"
    | "presentationHash"
    | "public";

  @Column("varchar", { name: "hash", nullable: true, length: 128 })
  hash: string | null;

  @Column("varchar", { name: "logoImgName", nullable: true, length: 255 })
  logoImgName: string | null;

  @Column("varchar", { name: "coverImgName", nullable: true, length: 255 })
  coverImgName: string | null;

  @Column("varchar", {
    name: "splashCoverImgName",
    nullable: true,
    length: 255,
  })
  splashCoverImgName: string | null;

  @Column("varchar", { name: "splashVideoLink", nullable: true, length: 255 })
  splashVideoLink: string | null;

  @Column("text", { name: "splashContent", nullable: true })
  splashContent: string | null;

  @Column("int", { name: "institutionId", nullable: true })
  institutionId: number | null;

  @Column("json", { name: "presentationFormConfig", nullable: true })
  presentationFormConfig: object | null;

  @Column("tinyint", {
    name: "isActivated",
    nullable: true,
    default: () => "'1'",
  })
  isActivated: number | null;

  @Column("timestamp", { name: "startDate", nullable: true })
  startDate: Date | null;

  @Column("timestamp", { name: "endDate", nullable: true })
  endDate: Date | null;

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

  @Column("timestamp", { name: "archiveDate", nullable: true })
  archiveDate: Date | null;

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;

  @OneToMany(() => EventEmail, (eventEmail) => eventEmail.event)
  eventEmails: EventEmail[];

  @OneToMany(
    () => PreApprovedEventEmail,
    (preApprovedEventEmail) => preApprovedEventEmail.event
  )
  preApprovedEventEmails: PreApprovedEventEmail[];

  @OneToMany(() => Presentation, (presentation) => presentation.event)
  presentations: Presentation[];
}
