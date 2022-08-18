import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Consumer } from "./Consumer";
import { Domain } from "./Domain";

@Entity("deprecatedEvent")
export class DeprecatedEvent {
  @PrimaryGeneratedColumn({ type: "int", name: "institutionId" })
  institutionId: number;

  @Column("text", { name: "name" })
  name: string;

  @Column("varchar", { name: "institutionCode", length: 45 })
  institutionCode: string;

  @Column("text", { name: "validEmails", nullable: true })
  validEmails: string | null;

  @Column("tinyint", {
    name: "allowSSOSubdomains",
    nullable: true,
    default: () => "'1'",
  })
  allowSsoSubdomains: number | null;

  @Column("varchar", { name: "ssoInstitutionCode", nullable: true, length: 45 })
  ssoInstitutionCode: string | null;

  @Column("tinyint", { name: "ssoEnabled", width: 1, default: () => "'0'" })
  ssoEnabled: boolean;

  @Column("text", { name: "samlIssuer", nullable: true })
  samlIssuer: string | null;

  @Column("text", { name: "ssoSamlCertFilename", nullable: true })
  ssoSamlCertFilename: string | null;

  @Column("text", { name: "ssoNameIdFormat", nullable: true })
  ssoNameIdFormat: string | null;

  @Column("text", { name: "ssoLoginUrl", nullable: true })
  ssoLoginUrl: string | null;

  @Column("text", { name: "ssoLogoutUrl", nullable: true })
  ssoLogoutUrl: string | null;

  @Column("varchar", { name: "ssoUniversityId", nullable: true, length: 255 })
  ssoUniversityId: string | null;

  @Column("varchar", { name: "ssoEmail", nullable: true, length: 255 })
  ssoEmail: string | null;

  @Column("varchar", { name: "ssoFirstName", nullable: true, length: 255 })
  ssoFirstName: string | null;

  @Column("varchar", { name: "ssoLastName", nullable: true, length: 255 })
  ssoLastName: string | null;

  @Column("enum", {
    name: "privacyLevel",
    enum: ["private", "institutionHash", "presentationHash", "public"],
    default: () => "'private'",
  })
  privacyLevel: "private" | "institutionHash" | "presentationHash" | "public";

  @Column("varchar", { name: "hash", nullable: true, length: 128 })
  hash: string | null;

  @Column("tinyint", {
    name: "showWelcomePage",
    width: 1,
    default: () => "'0'",
  })
  showWelcomePage: boolean;

  @Column("text", { name: "customSubmissionInstructions", nullable: true })
  customSubmissionInstructions: string | null;

  @Column("text", { name: "requiredConsentText", nullable: true })
  requiredConsentText: string | null;

  @Column("json", { name: "allowedSubmissionTypes", nullable: true })
  allowedSubmissionTypes: object | null;

  @Column("text", { name: "uniquePresentationIdName", nullable: true })
  uniquePresentationIdName: string | null;

  @Column("text", { name: "presenterTitle", nullable: true })
  presenterTitle: string | null;

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

  @OneToMany(() => Consumer, (consumer) => consumer.institution)
  consumers: Consumer[];

  @OneToMany(() => Domain, (domain) => domain.institution)
  domains: Domain[];
}
