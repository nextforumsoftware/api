import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Processo } from "../../processos/models/Processo";
import { MovimentoProcesso } from "../../processos/models/MovimentoProcesso";
import { TipoEventoEnum } from "./TipoEventoEnum";
import { Empresa } from "../../empresas/models/Empresa";

@Entity('timeline_eventos')
@Index(["movimentoId"], { unique: true, where: '"movimentoId" IS NOT NULL' })
export class TimelineEvento {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Processo)
  @JoinColumn({ name: "processoId" })
  processo!: Processo;

  @Column({ type: "uuid" })
  processoId!: string;

  @Column({ type: "text" })
  titulo!: string;

  @Column({ type: "text", nullable: true })
  descricao?: string;

  @Column({
    type: "enum",
    enum: TipoEventoEnum,
    default: TipoEventoEnum.OUTROS,
  })
  tipo!: TipoEventoEnum;

  @Column({ type: "date" })
  data!: Date;

  @ManyToOne(() => MovimentoProcesso, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "movimentoId" })
  movimento?: MovimentoProcesso;

  @Column({ type: "uuid", nullable: true })
  movimentoId?: string | null;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @CreateDateColumn()
  createdAt!: Date;
}
