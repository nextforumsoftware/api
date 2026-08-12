import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Empresa } from "../../empresas/models/Empresa";
import { User } from "../../users/models/User";
import { TipoAcaoJurisprudenciaEnum } from "./TipoAcaoJurisprudenciaEnum";
import { OrigemJurisprudenciaEnum } from "./OrigemJurisprudenciaEnum";

@Entity('jurisprudencias')
export class Jurisprudencia{
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false })
  tenantId!: string;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: "tenantId" })
  empresa?: Empresa;

  @Column({ type: "uuid", nullable: false })
  createdByUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdByUserId" })
  createdByUser?: User;

  @Column({ type: "text" })
  titulo!: string;

  @Column({ type: "text", nullable: true })
  tribunal?: string;

  @Column({ type: "text", nullable: true })
  numeroProcesso?: string;

  @Column({ type: "text", nullable: true })
  ementa?: string;

  @Column({ type: "text", nullable: true })
  tema?: string;

  @Column({ type: "date", nullable: true })
  dataJulgamento?: Date;

  @Column({ type: "text", nullable: true })
  relator?: string;

  @Column({ type: "text", nullable: true })
  orgaoJulgador?: string;

  @Column({
    type: "enum",
    enum: TipoAcaoJurisprudenciaEnum,
    default: TipoAcaoJurisprudenciaEnum.OUTROS
  })
  tipoAcao!: TipoAcaoJurisprudenciaEnum;

  @Column({ type: "text", nullable: true })
  anotacaoPessoal?: string;

  @Column({ type: "boolean", default: false })
  favorito!: boolean;

  @Column({ type: "enum", enum: OrigemJurisprudenciaEnum })
  origem!: OrigemJurisprudenciaEnum;

  @Column({ type: "text", nullable: true })
  link?: string;

  @Column({ type: "text", nullable: true })
  arquivoUrl?: string;

  @Column({ type: "text", nullable: true })
  arquivoChaveS3?: string;

  @Column({ type: "text", nullable: true })
  arquivoNomeOriginal?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
