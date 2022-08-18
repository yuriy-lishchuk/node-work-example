import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("eventId_UNIQUE", ["eventId"], { unique: true })
@Index("idx_eventFeatureFlag_eventId", ["eventId"], {})
@Entity("eventFeatureFlag")
export class EventFeatureFlag {
  @PrimaryGeneratedColumn({ type: "int", name: "eventFeatureFlagId" })
  eventFeatureFlagId: number;

  @Column("int", { name: "eventId", unique: true })
  eventId: number;

  @Column("tinyint", {
    name: "useLatestSubmission",
    width: 1,
    default: () => "'1'",
  })
  useLatestSubmission: boolean;

  @Column("tinyint", {
    name: "accessCustomSubmissionFormEditor",
    width: 1,
    default: () => "'1'",
  })
  accessCustomSubmissionFormEditor: boolean;

  @Column("tinyint", { name: "editCoverPhoto", default: () => "'1'" })
  editCoverPhoto: boolean;

  @Column("tinyint", { name: "editEventLogo", default: () => "'1'" })
  editEventLogo: boolean;

  @Column("tinyint", { name: "editSplashScreen", default: () => "'1'" })
  editSplashScreen: boolean;

  @Column("tinyint", { name: "editPresentation", default: () => "'1'" })
  editPresentation: boolean;
}
