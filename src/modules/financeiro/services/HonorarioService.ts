import { randomUUID } from "node:crypto";
import { FindOptionsWhere, ILike } from "typeorm";
import { AppDataSource } from "../../../data";
import { Honorario } from "../models/Honorario";
import { ParcelaHonorario } from "../models/ParcelaHonorario";
import { TipoHonorarioEnum } from "../models/TipoHonorarioEnum";
import { StatusParcelaEnum } from "../models/StatusParcelaEnum";
import { SituacaoParcelaEnum } from "../models/SituacaoParcelaEnum";
import { HonorarioRepository } from "../repositories/HonorarioRepository";
import { ParcelaHonorarioRepository } from "../repositories/ParcelaHonorarioRepository";
import { ClienteRepository } from "../../clientes/repositories/ClienteRepository";
import { ProcessoRepository } from "../../processos/repositories/ProcessoRepository";
import { AppError, NotFoundException } from "../../../core/exceptions/HttpException";
import { adicionarMeses, todayIso, isDataIso } from "../utils/dataIso";
import { centavosValidos, deCentavos, dividirEmParcelas, somarEmCentavos } from "../utils/centavos";
import { bloquearHonorario } from "../utils/bloquearHonorario";
import { comSituacao, ParcelaComSituacao } from "../utils/situacaoParcela";
import { textoOpcional } from "../utils/texto";
import { isUuid } from "../utils/uuid";

type ListFilters = {
  term?: string;
  clienteId?: string;
  processoId?: string;
  tipo?: string;
};

export type DadosHonorario = {
  clienteId?: unknown;
  processoId?: unknown;
  descricao?: unknown;
  tipo?: unknown;
  percentualExito?: unknown;
  observacoes?: unknown;
};

export type DadosNovoHonorario = DadosHonorario & {
  valorTotal?: unknown;
  numeroParcelas?: unknown;
  primeiroVencimento?: unknown;
};

export type ResumoHonorario = {
  valorTotal: number;
  valorRecebido: number;
  valorEmAberto: number;
  valorEmAtraso: number;
  quantidadeParcelas: number;
  quantidadePagas: number;
  quantidadeAtrasadas: number;
};

export type HonorarioComResumo = Omit<Honorario, "parcelas"> & {
  parcelas: ParcelaComSituacao[];
  resumo: ResumoHonorario;
};

const RELATIONS = ["cliente", "processo", "parcelas"];
const MAXIMO_PARCELAS = 120;

function calcularResumo(parcelas: ParcelaComSituacao[]): ResumoHonorario {
  const parcelasAtivas = parcelas.filter((parcela) => parcela.situacao !== SituacaoParcelaEnum.CANCELADA);
  const parcelasPagas = parcelasAtivas.filter((parcela) => parcela.situacao === SituacaoParcelaEnum.PAGA);
  const parcelasEmAberto = parcelasAtivas.filter((parcela) => parcela.situacao !== SituacaoParcelaEnum.PAGA);
  const parcelasAtrasadas = parcelasAtivas.filter((parcela) => parcela.situacao === SituacaoParcelaEnum.ATRASADA);

  return {
    valorTotal: deCentavos(somarEmCentavos(parcelasAtivas.map((parcela) => parcela.valor))),
    valorRecebido: deCentavos(somarEmCentavos(parcelasPagas.map((parcela) => parcela.valorPago ?? parcela.valor))),
    valorEmAberto: deCentavos(somarEmCentavos(parcelasEmAberto.map((parcela) => parcela.valor))),
    valorEmAtraso: deCentavos(somarEmCentavos(parcelasAtrasadas.map((parcela) => parcela.valor))),
    quantidadeParcelas: parcelasAtivas.length,
    quantidadePagas: parcelasPagas.length,
    quantidadeAtrasadas: parcelasAtrasadas.length,
  };
}

function comResumo(honorario: Honorario, today: string): HonorarioComResumo {
  const parcelas = (honorario.parcelas ?? [])
    .sort((parcelaA, parcelaB) => parcelaA.numero - parcelaB.numero)
    .map((parcela) => comSituacao(parcela, today));

  return { ...honorario, parcelas, resumo: calcularResumo(parcelas) };
}

function validarDescricao(valor: unknown): string {
  const descricao = textoOpcional(valor);
  if (!descricao) throw new AppError("Descrição não informada");
  return descricao;
}

function validarTipo(valor: unknown): TipoHonorarioEnum {
  const tiposValidos: string[] = Object.values(TipoHonorarioEnum);
  if (typeof valor !== "string" || !tiposValidos.includes(valor)) throw new AppError("Tipo de honorário inválido");
  return valor as TipoHonorarioEnum;
}

function validarPercentualExito(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;

  const percentual = Number(valor);
  if (!Number.isFinite(percentual) || percentual <= 0 || percentual > 100) {
    throw new AppError("Percentual de êxito inválido");
  }
  return percentual;
}

async function validarVinculos(
  tenantId: string,
  clienteIdInformado: unknown,
  processoIdInformado: unknown
): Promise<{ clienteId: string; processoId: string | null }> {
  if (!isUuid(clienteIdInformado)) throw new AppError("Cliente não informado");

  const cliente = await ClienteRepository.findOneBy({ id: clienteIdInformado, tenantId });
  if (!cliente) throw new NotFoundException("Cliente não encontrado");

  const processoId = textoOpcional(processoIdInformado);
  if (!processoId) return { clienteId: cliente.id, processoId: null };
  if (!isUuid(processoId)) throw new NotFoundException("Processo não encontrado");

  const processo = await ProcessoRepository.findOneBy({ id: processoId, tenantId });
  if (!processo) throw new NotFoundException("Processo não encontrado");
  if (processo.clienteId !== cliente.id) throw new AppError("Processo não pertence ao cliente");

  return { clienteId: cliente.id, processoId: processo.id };
}

async function buscarHonorario(id: string, tenantId: string): Promise<Honorario> {
  if (!isUuid(id)) throw new NotFoundException("Honorário não encontrado");

  const honorario = await HonorarioRepository.findOne({ where: { id, tenantId }, relations: RELATIONS });
  if (!honorario) throw new NotFoundException("Honorário não encontrado");
  return honorario;
}

function montarParcelas(dados: DadosNovoHonorario, tenantId: string): ParcelaHonorario[] {
  const totalCentavos = centavosValidos(dados.valorTotal);
  if (totalCentavos === null) throw new AppError("Valor total inválido");

  const numeroParcelas = Number(dados.numeroParcelas);
  if (!Number.isInteger(numeroParcelas) || numeroParcelas < 1 || numeroParcelas > MAXIMO_PARCELAS) {
    throw new AppError("Número de parcelas inválido");
  }
  if (totalCentavos < numeroParcelas) throw new AppError("Valor total inválido");

  const primeiroVencimento = dados.primeiroVencimento;
  if (!isDataIso(primeiroVencimento)) throw new AppError("Primeiro vencimento inválido");

  const valoresEmCentavos = dividirEmParcelas(totalCentavos, numeroParcelas);

  return valoresEmCentavos.map((valorEmCentavos, indice) =>
    ParcelaHonorarioRepository.create({
      id: randomUUID(),
      numero: indice + 1,
      valor: deCentavos(valorEmCentavos),
      vencimento: adicionarMeses(primeiroVencimento, indice),
      status: StatusParcelaEnum.PENDENTE,
      tenantId,
    })
  );
}

export const HonorarioService = {
  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filters: ListFilters = {}
  ): Promise<{ list: HonorarioComResumo[], more: boolean, page: number, rpp: number }> {
    const { term, clienteId, processoId, tipo } = filters;
    const tiposValidos: string[] = Object.values(TipoHonorarioEnum);

    const baseWhere: FindOptionsWhere<Honorario> = {
      tenantId,
      ...(isUuid(clienteId) ? { clienteId } : {}),
      ...(isUuid(processoId) ? { processoId } : {}),
      ...(tipo && tiposValidos.includes(tipo) ? { tipo: tipo as TipoHonorarioEnum } : {}),
    };

    const where = term
      ? [
          { ...baseWhere, descricao: ILike(`%${term}%`) },
          { ...baseWhere, cliente: { nome: ILike(`%${term}%`) } },
        ]
      : [baseWhere];

    const [honorarios, total] = await HonorarioRepository.findAndCount({
      where,
      relations: RELATIONS,
      skip: (page - 1) * rpp,
      take: rpp,
      order: { createdAt: "DESC" },
    });

    const today = todayIso();
    const list = honorarios.map((honorario) => comResumo(honorario, today));

    return { list, more: page * rpp < total, page, rpp };
  },

  async get(id: string, tenantId: string): Promise<HonorarioComResumo> {
    const honorario = await buscarHonorario(id, tenantId);
    return comResumo(honorario, todayIso());
  },

  async create(dados: DadosNovoHonorario, tenantId: string, userId: string): Promise<HonorarioComResumo> {
    const descricao = validarDescricao(dados.descricao);
    const tipo = validarTipo(dados.tipo);
    const percentualExito = validarPercentualExito(dados.percentualExito);
    const vinculos = await validarVinculos(tenantId, dados.clienteId, dados.processoId);
    const parcelas = montarParcelas(dados, tenantId);

    const honorario = HonorarioRepository.create({
      id: randomUUID(),
      ...vinculos,
      descricao,
      tipo,
      percentualExito,
      observacoes: textoOpcional(dados.observacoes),
      createdByUser: userId,
      tenantId,
      parcelas,
    });

    await HonorarioRepository.save(honorario);

    return HonorarioService.get(honorario.id, tenantId);
  },

  async update(id: string, tenantId: string, dados: DadosHonorario): Promise<HonorarioComResumo> {
    const honorario = await buscarHonorario(id, tenantId);
    const descricao = validarDescricao(dados.descricao);
    const tipo = validarTipo(dados.tipo);
    const percentualExito = validarPercentualExito(dados.percentualExito);
    const vinculos = await validarVinculos(tenantId, dados.clienteId, dados.processoId);

    await HonorarioRepository.update(
      { id: honorario.id, tenantId },
      {
        ...vinculos,
        descricao,
        tipo,
        percentualExito,
        observacoes: textoOpcional(dados.observacoes),
      }
    );

    return HonorarioService.get(honorario.id, tenantId);
  },

  async remove(id: string, tenantId: string): Promise<void> {
    if (!isUuid(id)) throw new NotFoundException("Honorário não encontrado");

    await AppDataSource.transaction(async (manager) => {
      const honorario = await bloquearHonorario(manager, id, tenantId);
      const parcelaRepository = manager.withRepository(ParcelaHonorarioRepository);

      const hasParcelaPaga = await parcelaRepository.existsBy({
        honorarioId: honorario.id,
        tenantId,
        status: StatusParcelaEnum.PAGA,
      });
      if (hasParcelaPaga) throw new AppError("Honorário com parcelas pagas não pode ser excluído");

      await parcelaRepository.delete({ honorarioId: honorario.id, tenantId });
      await manager.withRepository(HonorarioRepository).delete({ id: honorario.id, tenantId });
    });
  },
};
