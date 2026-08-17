import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne } from "typeorm";
import { TipoAcaoProcessoEnum } from "./TipoAcaoProcessoEnum";
import { StatusProcessoEnum } from "./StatusProcessoEnum";
import { InstanciaProcessoEnum } from "./InstanciaProcessoEnum";
import { EsferaProcessoEnum } from "./EsferaProcessoEnum";
import { Cliente } from "../../clientes/models/Cliente";
import { Empresa } from "../../empresas/models/Empresa";

@Entity('processos')
export class Processo{
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", nullable: false})
  numeroProcesso!: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.processos)
  @JoinColumn({ name: "clienteId" })
  cliente!: Cliente;

  @Column({ type: 'uuid' })
  clienteId?: string;

  @Column({ 
    type:"enum", 
    enum: TipoAcaoProcessoEnum,
    default: TipoAcaoProcessoEnum.OUTROS
  })
  tipoAcaoProcesso!: TipoAcaoProcessoEnum

  @Column({
    type:"enum",
    enum: StatusProcessoEnum,
    default: StatusProcessoEnum.ANDAMENTO
  })
  status!: StatusProcessoEnum

  @Column({
    type: "enum",
    enum: InstanciaProcessoEnum,
    nullable: true
  })
  instancia?: InstanciaProcessoEnum

  @Column({type: "text", nullable: true })
  parteContraria?: string;

  @Column({type: "text", nullable: true })
  vara?: string

  @Column({type: "text", nullable: true })
  comarca?: string

  @Column({ type: "date", nullable: true })
  dataDistribuicao?: Date;

  @Column({ type: "numeric", precision: 15, scale: 2, nullable: true })
  valorCausa?: number

  @Column({ type: "text", nullable: true })
  descricao?: string;

  @Column({type: "text", nullable: true})
  observacoes?: string

  @Column({type: "text", nullable: true })
  caso?: string

  @Column({ type: "text", nullable: true })
  createdByUser!: string;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({
    type: "enum",
    enum: EsferaProcessoEnum,
    default: EsferaProcessoEnum.JUDICIAL
  })
  esferaProcesso?: EsferaProcessoEnum
}