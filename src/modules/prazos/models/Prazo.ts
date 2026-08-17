import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { TipoPrazoEnum } from "./TipoPrazoEnum";
import { StatusPrazoEnum } from "./StatusPrazoEnum";
import { Processo } from "../../processos/models/Processo";
import { User } from "../../users/models/User";
import { Empresa } from "../../empresas/models/Empresa";

@Entity('prazos')
export class Prazo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Processo)
  @JoinColumn({ name: "processoId" })
  processo!: Processo;

  @Column({ type: "uuid" })
  processoId!: string;

  @Column({ type: "text", nullable: false })
  titulo!: string;

  @Column({
    type: "enum",
    enum: TipoPrazoEnum,
    default: TipoPrazoEnum.OUTROS,
  })
  tipo!: TipoPrazoEnum;

  @Column({ type: "date" })
  data!: Date;

  @Column({
    type: "enum",
    enum: StatusPrazoEnum,
    default: StatusPrazoEnum.PENDENTE,
  })
  status!: StatusPrazoEnum;

  @ManyToOne(() => User)
  @JoinColumn({ name: "responsavelId" })
  responsavel?: User;

  @Column({ type: "uuid", nullable: true })
  responsavelId?: string;

  @Column({ type: "text", nullable: true })
  observacoes?: string;

  @Column({ type: "text", nullable: true })
  createdByUser!: string;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @CreateDateColumn()
  createdAt!: Date;
}
