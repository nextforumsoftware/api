import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Unique } from "typeorm";
import { Processo } from "./Processo";
import { DetalhesMovimento } from "./DetalhesMovimento";
import { Empresa } from "../../empresas/models/Empresa";

@Entity('movimentos_processo')
@Unique(['processoId', 'codigo', 'dataHora'])
export class MovimentoProcesso {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Processo, { onDelete: "CASCADE" })
  @JoinColumn({ name: "processoId" })
  processo!: Processo;

  @Column({ type: "uuid" })
  processoId!: string;

  @Column({ type: "int" })
  codigo!: number;

  @Column({ type: "text" })
  nome!: string;

  @Column({ type: "timestamp with time zone" })
  dataHora!: Date;

  @OneToMany(() => DetalhesMovimento, (detalhe) => detalhe.movimento)
  detalhes?: DetalhesMovimento[];

  @Column({ type: "text", nullable: true })
  orgaoJulgadorCodigo?: string;

  @Column({ type: "text", nullable: true })
  orgaoJulgadorNome?: string;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @CreateDateColumn()
  createdAt!: Date;
}
