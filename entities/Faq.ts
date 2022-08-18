import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("faq")
export class Faq {
  @PrimaryGeneratedColumn({ type: "int", name: "faqId" })
  faqId: number;

  @Column("text", { name: "question" })
  question: string;

  @Column("text", { name: "answer" })
  answer: string;

  @Column("int", {
    name: "zIndex",
    comment:
      "Similar to CSS's zIndex property. Question with higher zIndex shows on the higher level. Should make you easier when you want to put a certain question on the top level",
    default: () => "'1'",
  })
  zIndex: number;

  @Column("varchar", {
    name: "section",
    length: 45,
    default: () => "'general'",
  })
  section: string;

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
}
