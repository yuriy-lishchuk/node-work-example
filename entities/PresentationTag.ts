import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Presentation } from "./Presentation";
import { Tag } from "./Tag";

@Index("tagId_fk_idx", ["tagId"], {})
@Entity("presentationTag")
export class PresentationTag {
  @Column("int", { primary: true, name: "presentationId" })
  presentationId: number;

  @Column("int", { primary: true, name: "tagId" })
  tagId: number;

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

  @ManyToOne(
    () => Presentation,
    (presentation) => presentation.presentationTags,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([
    { name: "presentationId", referencedColumnName: "presentationId" },
  ])
  presentation: Presentation;

  @ManyToOne(() => Tag, (tag) => tag.presentationTags, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "tagId", referencedColumnName: "tagId" }])
  tag: Tag;
}
