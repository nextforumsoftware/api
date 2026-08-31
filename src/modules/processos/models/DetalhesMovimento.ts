import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { MovimentoProcesso } from "./MovimentoProcesso";
import { Empresa } from "../../empresas/models/Empresa";

@Entity('detalhes_movimento')
export class DetalhesMovimento {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => MovimentoProcesso, (movimento) => movimento.detalhes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "movimentoId" })
  movimento!: MovimentoProcesso;

  @Column({ type: "uuid" })
  movimentoId!: string;

  @Column({ type: "int" })
  codigo!: number;

  @Column({ type: "int" })
  valor!: number;

  @Column({ type: "text" })
  nome!: string;

  @Column({ type: "text" })
  descricao!: string;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;
}
