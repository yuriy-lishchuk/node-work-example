import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("flagger_consumer_idx", ["flaggerId"], {})
@Index("consumer_poster_idx", ["posterId"], {})
@Entity("comment")
export class Comment {
  @PrimaryGeneratedColumn({ type: "int", name: "commentId" })
  commentId: number;

  @Column("text", { name: "comment", nullable: true })
  comment: string | null;

  @Column("int", { name: "posterId" })
  posterId: number;

  @Column("int", { name: "consumerId" })
  consumerId: number;

  @Column("int", { name: "flaggerId", nullable: true })
  flaggerId: number | null;

  @Column("int", { name: "parentCommentId", nullable: true })
  parentCommentId: number | null;

  @Column("timestamp", { name: "flaggedByUserDate", nullable: true })
  flaggedByUserDate: Date | null;

  @Column("timestamp", { name: "hiddenByAdminDate", nullable: true })
  hiddenByAdminDate: Date | null;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;

  @Column("timestamp", { name: "deleteDate", nullable: true })
  deleteDate: Date | null;
}
