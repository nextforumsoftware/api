import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Honorario } from "./Honorario";
import { StatusParcelaEnum } from "./StatusParcelaEnum";
import { FormaPagamentoEnum } from "./FormaPagamentoEnum";
import { Empresa } from "../../empresas/models/Empresa";
import { numericTransformer } from "../../../core/utils/numericTransformer";

@Entity('parcelas_honorario')
@Index(["tenantId", "status", "vencimento"])
@Index(["honorarioId", "numero"], { unique: true })
export class ParcelaHonorario {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Honorario, (honorario) => honorario.parcelas, { onDelete: "CASCADE" })
  @JoinColumn({ name: "honorarioId" })
  honorario!: Honorario;

  @Column({ type: "uuid" })
  honorarioId!: string;

  @Column({ type: "int" })
  numero!: number;

  @Column({ type: "numeric", precision: 15, scale: 2, transformer: numericTransformer })
  valor!: number;

  @Column({ type: "date" })
  vencimento!: string;

  @Column({
    type: "enum",
    enum: StatusParcelaEnum,
    default: StatusParcelaEnum.PENDENTE,
  })
  status!: StatusParcelaEnum;

  @Column({ type: "date", nullable: true })
  dataPagamento?: string | null;

  @Column({ type: "numeric", precision: 15, scale: 2, nullable: true, transformer: numericTransformer })
  valorPago?: number | null;

  @Column({ type: "enum", enum: FormaPagamentoEnum, nullable: true })
  formaPagamento?: FormaPagamentoEnum | null;

  @Column({ type: "text", nullable: true })
  observacoes?: string | null;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @CreateDateColumn()
  createdAt!: Date;
}
