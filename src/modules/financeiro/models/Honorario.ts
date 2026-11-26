import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { TipoHonorarioEnum } from "./TipoHonorarioEnum";
import { ParcelaHonorario } from "./ParcelaHonorario";
import { Cliente } from "../../clientes/models/Cliente";
import { Processo } from "../../processos/models/Processo";
import { Empresa } from "../../empresas/models/Empresa";
import { numericTransformer } from "../../../core/utils/numericTransformer";

@Entity('honorarios')
export class Honorario {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: "clienteId" })
  cliente!: Cliente;

  @Column({ type: "uuid" })
  clienteId!: string;

  @ManyToOne(() => Processo, { nullable: true })
  @JoinColumn({ name: "processoId" })
  processo?: Processo | null;

  @Column({ type: "uuid", nullable: true })
  processoId?: string | null;

  @Column({ type: "text" })
  descricao!: string;

  @Column({
    type: "enum",
    enum: TipoHonorarioEnum,
    default: TipoHonorarioEnum.CONTRATUAL,
  })
  tipo!: TipoHonorarioEnum;

  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true, transformer: numericTransformer })
  percentualExito?: number | null;

  @Column({ type: "text", nullable: true })
  observacoes?: string | null;

  @OneToMany(() => ParcelaHonorario, (parcela) => parcela.honorario, { cascade: ["insert"] })
  parcelas?: ParcelaHonorario[];

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
