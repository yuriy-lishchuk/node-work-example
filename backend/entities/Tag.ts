import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PresentationTag } from "./PresentationTag";

@Entity("tag")
export class Tag {
  @PrimaryGeneratedColumn({ type: "int", name: "tagId" })
  tagId: number;

  @Column("text", { name: "name" })
  name: string;

  @Column("text", { name: "type" })
  type: string;

  @Column("int", { name: "eventId", nullable: true })
  eventId: number | null;

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

  @OneToMany(() => PresentationTag, (presentationTag) => presentationTag.tag)
  presentationTags: PresentationTag[];
}
