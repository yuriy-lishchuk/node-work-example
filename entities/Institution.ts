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

@Index("dates", ["archiveDate", "deleteDate"], {})
@Index("institution_consumer_consumerId_fk", ["createdBy"], {})
@Index("name", ["name"], {})
@Entity("institution")
export class Institution {
  @PrimaryGeneratedColumn({ type: "int", name: "institutionId" })
  institutionId: number;

  @Column("text", { name: "name" })
  name: string;

  @Column("tinyint", {
    name: "allowSSOSubdomains",
    nullable: true,
    default: () => "'1'",
  })
  allowSsoSubdomains: number | null;

  @Column("varchar", { name: "ssoInstitutionCode", nullable: true, length: 45 })
  ssoInstitutionCode: string | null;

  @Column("text", { name: "validEmails", nullable: true })
  validEmails: string;

  @Column("tinyint", { name: "ssoEnabled", width: 1, default: () => "'0'" })
  ssoEnabled: boolean;


  @Column("tinyint", { name: "hasPurchasedSubscription", width: 1, default: () => "'0'" })
  hasPurchasedSubscription: boolean;

  @Column("text", { name: "ssoConnectionName", nullable: true })
  ssoConnectionName: string | null;

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

  @ManyToOne(() => Consumer, (consumer) => consumer.organizations)
  @JoinColumn([{ name: "createdBy", referencedColumnName: "consumerId" }])
  createdBy: Consumer;

  @OneToMany(() => Subscription, (subscription) => subscription.institution)
  subscriptions: Subscription[];
}
