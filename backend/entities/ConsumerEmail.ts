import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("consumerEmail")
export class ConsumerEmail {
  @PrimaryGeneratedColumn({ type: "int", name: "consumerEmailId" })
  consumerEmailId: number;

  @Column("varchar", { name: "email", length: 255 })
  email: string;

  @Column("int", { name: "consumerId", nullable: true })
  consumerId: number | null;

  @Column("timestamp", { name: "verifiedAt", nullable: true })
  verifiedAt: Date | null;

  @Column("timestamp", {
    name: "createDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  createDate: Date;

  @Column("timestamp", {
    name: "updateDate",
    default: () => "CURRENT_TIMESTAMP",
  })
  updateDate: Date;
}
