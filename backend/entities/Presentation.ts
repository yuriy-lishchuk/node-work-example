import {
  Column,
  Entity,
  Index, JoinColumn, ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PresentationTag } from "./PresentationTag";
import {Event} from "./Event";

@Index("hash_UNIQUE", ["hash"], { unique: true })
@Index("idx_presentation_eventId", ["eventId"], {})
@Entity("presentation")
export class Presentation {
  @PrimaryGeneratedColumn({ type: "int", name: "presentationId" })
  presentationId: number;

  @Column("mediumtext", {
    name: "institutionSetUniquePresentationId",
    nullable: true,
  })
  institutionSetUniquePresentationId: string | null;

  @Column("mediumtext", { name: "title" })
  title: string;

  @Column("text", { name: "abstract", nullable: true })
  abstract: string | null;

  @Column("text", { name: "subjects", nullable: true })
  subjects: string | null;

  @Column("mediumtext", { name: "voiceoverId", nullable: true })
  voiceoverId: string | null;

  @Column("mediumtext", { name: "originalVoiceoverLink", nullable: true })
  originalVoiceoverLink: string | null;

  @Column("varchar", {
    name: "presentationVideoId",
    nullable: true,
    length: 255,
  })
  presentationVideoId: string | null;

  @Column("varchar", {
    name: "originalPresentationVideoLink",
    nullable: true,
    length: 255,
  })
  originalPresentationVideoLink: string | null;

  @Column("mediumtext", { name: "posterId", nullable: true })
  posterId: string | null;

  @Column("varchar", { name: "slidesId", nullable: true, length: 255 })
  slidesId: string | null;

  @Column("mediumtext", { name: "originalPosterLink", nullable: true })
  originalPosterLink: string | null;

  @Column("int", { name: "eventId", nullable: true })
  eventId: number | null;

  @Column("int", { name: "institutionId" })
  institutionId: number;

  @Column("enum", { name: "posterType", enum: ["pdf", "video"] })
  posterType: "pdf" | "video";

  @Column("enum", {
    name: "voiceoverType",
    enum: ["drive", "youtube"],
    default: () => "'youtube'",
  })
  voiceoverType: "drive" | "youtube";

  @Column("varchar", {
    name: "hash",
    nullable: true,
    unique: true,
    length: 128,
  })
  hash: string | null;

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

  @Column("varchar", { name: "insertRun", nullable: true, length: 128 })
  insertRun: string | null;

  @Column("enum", {
    name: "debugPresentationType",
    nullable: true,
    enum: ["poster", "oral", "exhibition"],
  })
  debugPresentationType: "poster" | "oral" | "exhibition" | null;

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;

  @Column("mediumtext", { name: "metadataInstitutionName", nullable: true })
  metadataInstitutionName: string | null;

  @Column("text", { name: "internalSymposiumTitle", nullable: true })
  internalSymposiumTitle: string | null;

  @Column("text", { name: "customPresentationType", nullable: true })
  customPresentationType: string | null;

  @Column("json", { name: "customFields", nullable: true })
  customFields: object | null;

  @Column("mediumtext", { name: "primaryPresenterBiography", nullable: true })
  primaryPresenterBiography: string | null;

  @Column("mediumtext", { name: "presenterFirstName" })
  presenterFirstName: string;

  @Column("mediumtext", { name: "presenterLastName" })
  presenterLastName: string;

  @Column("mediumtext", { name: "presenterEmail" })
  presenterEmail: string;

  @Column("mediumtext", { name: "presenterYear", nullable: true })
  presenterYear: string | null;

  @Column("mediumtext", { name: "presenterMajor", nullable: true })
  presenterMajor: string | null;

  @Column("mediumtext", { name: "presenter2FirstName", nullable: true })
  presenter2FirstName: string | null;

  @Column("mediumtext", { name: "presenter2LastName", nullable: true })
  presenter2LastName: string | null;

  @Column("mediumtext", { name: "presenter2Email", nullable: true })
  presenter2Email: string | null;

  @Column("mediumtext", { name: "presenter2Year", nullable: true })
  presenter2Year: string | null;

  @Column("mediumtext", { name: "presenter2Major", nullable: true })
  presenter2Major: string | null;

  @Column("mediumtext", { name: "presenter3FirstName", nullable: true })
  presenter3FirstName: string | null;

  @Column("mediumtext", { name: "presenter3LastName", nullable: true })
  presenter3LastName: string | null;

  @Column("mediumtext", { name: "presenter3Email", nullable: true })
  presenter3Email: string | null;

  @Column("mediumtext", { name: "presenter3Year", nullable: true })
  presenter3Year: string | null;

  @Column("mediumtext", { name: "presenter3Major", nullable: true })
  presenter3Major: string | null;

  @Column("mediumtext", { name: "presenter4FirstName", nullable: true })
  presenter4FirstName: string | null;

  @Column("mediumtext", { name: "presenter4LastName", nullable: true })
  presenter4LastName: string | null;

  @Column("mediumtext", { name: "presenter4Email", nullable: true })
  presenter4Email: string | null;

  @Column("mediumtext", { name: "presenter4Year", nullable: true })
  presenter4Year: string | null;

  @Column("mediumtext", { name: "presenter4Major", nullable: true })
  presenter4Major: string | null;

  @Column("mediumtext", { name: "presenter5FirstName", nullable: true })
  presenter5FirstName: string | null;

  @Column("mediumtext", { name: "presenter5LastName", nullable: true })
  presenter5LastName: string | null;

  @Column("mediumtext", { name: "presenter5Email", nullable: true })
  presenter5Email: string | null;

  @Column("mediumtext", { name: "presenter5Year", nullable: true })
  presenter5Year: string | null;

  @Column("mediumtext", { name: "presenter5Major", nullable: true })
  presenter5Major: string | null;

  @Column("mediumtext", { name: "presenter6FirstName", nullable: true })
  presenter6FirstName: string | null;

  @Column("mediumtext", { name: "presenter6LastName", nullable: true })
  presenter6LastName: string | null;

  @Column("mediumtext", { name: "presenter6Email", nullable: true })
  presenter6Email: string | null;

  @Column("mediumtext", { name: "presenter6Year", nullable: true })
  presenter6Year: string | null;

  @Column("mediumtext", { name: "presenter6Major", nullable: true })
  presenter6Major: string | null;

  @Column("mediumtext", { name: "presenter7FirstName", nullable: true })
  presenter7FirstName: string | null;

  @Column("mediumtext", { name: "presenter7LastName", nullable: true })
  presenter7LastName: string | null;

  @Column("mediumtext", { name: "presenter7Email", nullable: true })
  presenter7Email: string | null;

  @Column("mediumtext", { name: "presenter7Year", nullable: true })
  presenter7Year: string | null;

  @Column("mediumtext", { name: "presenter7Major", nullable: true })
  presenter7Major: string | null;

  @Column("mediumtext", { name: "presenter8FirstName", nullable: true })
  presenter8FirstName: string | null;

  @Column("mediumtext", { name: "presenter8LastName", nullable: true })
  presenter8LastName: string | null;

  @Column("mediumtext", { name: "presenter8Email", nullable: true })
  presenter8Email: string | null;

  @Column("mediumtext", { name: "presenter8Year", nullable: true })
  presenter8Year: string | null;

  @Column("mediumtext", { name: "presenter8Major", nullable: true })
  presenter8Major: string | null;

  @Column("mediumtext", { name: "additionalPresenters", nullable: true })
  additionalPresenters: string | null;

  @Column("mediumtext", { name: "posterVideoId", nullable: true })
  posterVideoId: string | null;

  @Column("mediumtext", { name: "thumbnailPic", nullable: true })
  thumbnailPic: string | null;

  @Column("mediumtext", { name: "posterPdfId", nullable: true })
  posterPdfId: string | null;

  @Column("mediumtext", { name: "zoomUrl", nullable: true })
  zoomUrl: string | null;

  @Column("json", { name: "presenters", nullable: true })
  presenters: object | null;

  @Column("timestamp", { name: "presentationDate", nullable: true })
  presentationDate: Date | null;

  @Column("tinyint", {
    name: "isCommentsPrivate",
    width: 1,
    default: () => "'0'",
  })
  isCommentsPrivate: boolean;

  @Column("tinyint", {
    name: "supervisorConsentText",
    nullable: true,
    width: 1,
  })
  supervisorConsentText: boolean | null;

  @Column("json", { name: "submissionFormExtraValues", nullable: true })
  submissionFormExtraValues: object | null;

  @ManyToOne(() => Event, (event) => event.presentations)
  @JoinColumn([{ name: "eventId", referencedColumnName: "eventId" }])
  event: Event;

  @OneToMany(
    () => PresentationTag,
    (presentationTag) => presentationTag.presentation
  )
  presentationTags: PresentationTag[];
}
