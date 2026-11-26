import { randomUUID } from "node:crypto";
import {
  And,
  Between,
  DeleteResult,
  EntityManager,
  FindOperator,
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  UpdateResult,
} from "typeorm";
import { AppDataSource } from "../../../data";
import { ParcelaHonorario } from "../models/ParcelaHonorario";
import { StatusParcelaEnum } from "../models/StatusParcelaEnum";
import { FormaPagamentoEnum } from "../models/FormaPagamentoEnum";
import { SituacaoParcelaEnum } from "../models/SituacaoParcelaEnum";
import { ParcelaHonorarioRepository } from "../repositories/ParcelaHonorarioRepository";
import { AppError, NotFoundException } from "../../../core/exceptions/HttpException";
import { adicionarDias, fimDoMes, todayIso, inicioDoMes, isDataIso } from "../utils/dataIso";
import { centavosValidos, deCentavos, paraCentavos } from "../utils/centavos";
import { comSituacao, ParcelaComSituacao } from "../utils/situacaoParcela";
import { textoOpcional } from "../utils/texto";
import { isUuid } from "../utils/uuid";
import { bloquearHonorario } from "../utils/bloquearHonorario";

type ListFilters = {
  term?: string;
  situacao?: string;
  clienteId?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
};

export type DadosParcela = {
  valor?: unknown;
  vencimento?: unknown;
  observacoes?: unknown;
};

export type DadosPagamento = {
  dataPagamento?: unknown;
  valorPago?: unknown;
  formaPagamento?: unknown;
};

export type DashboardFinanceiro = {
  emAberto: number;
  emAtraso: number;
  quantidadeEmAtraso: number;
  aVencer30Dias: number;
  recebidoNoMes: number;
};

const RELATIONS = ["honorario", "honorario.cliente", "honorario.processo"];

const FILTRO_EM_ABERTO = "EM_ABERTO";

type FiltroSituacao = { status?: StatusParcelaEnum; vencimento?: FindOperator<string> };

function filtroDaSituacao(situacao: string | undefined, today: string): FiltroSituacao {
  if (situacao === FILTRO_EM_ABERTO) return { status: StatusParcelaEnum.PENDENTE };
  if (situacao === SituacaoParcelaEnum.A_VENCER) return { status: StatusParcelaEnum.PENDENTE, vencimento: MoreThanOrEqual(today) };
  if (situacao === SituacaoParcelaEnum.ATRASADA) return { status: StatusParcelaEnum.PENDENTE, vencimento: LessThan(today) };
  if (situacao === SituacaoParcelaEnum.PAGA) return { status: StatusParcelaEnum.PAGA };
  if (situacao === SituacaoParcelaEnum.CANCELADA) return { status: StatusParcelaEnum.CANCELADA };
  return {};
}

const STATUS_EDITAVEIS = [StatusParcelaEnum.PENDENTE, StatusParcelaEnum.CANCELADA];

function validarCentavos(valor: unknown): number {
  const valorEmCentavos = centavosValidos(valor);
  if (valorEmCentavos === null) throw new AppError("Valor inválido");
  return valorEmCentavos;
}

function validarValor(valor: unknown): number {
  return deCentavos(validarCentavos(valor));
}

function garantirAlteracao(response: UpdateResult | DeleteResult, mensagem: string): void {
  if (!response.affected) throw new AppError(mensagem);
}

async function proximoNumero(manager: EntityManager, honorarioId: string, tenantId: string): Promise<number> {
  const ultimoNumero = await manager.getRepository(ParcelaHonorario).maximum("numero", { honorarioId, tenantId });
  return (ultimoNumero ?? 0) + 1;
}

function validarVencimento(valor: unknown): string {
  if (!isDataIso(valor)) throw new AppError("Vencimento inválido");
  return valor;
}

function validarFormaPagamento(valor: unknown): FormaPagamentoEnum | null {
  if (valor === null || valor === undefined || valor === "") return null;

  const formasValidas: string[] = Object.values(FormaPagamentoEnum);
  if (typeof valor !== "string" || !formasValidas.includes(valor)) throw new AppError("Forma de pagamento inválida");
  return valor as FormaPagamentoEnum;
}

async function buscarParcela(id: string, tenantId: string): Promise<ParcelaHonorario> {
  if (!isUuid(id)) throw new NotFoundException("Parcela não encontrada");

  const parcela = await ParcelaHonorarioRepository.findOneBy({ id, tenantId });
  if (!parcela) throw new NotFoundException("Parcela não encontrada");
  return parcela;
}

async function buscarComSituacao(id: string, tenantId: string): Promise<ParcelaComSituacao> {
  const parcela = await ParcelaHonorarioRepository.findOne({ where: { id, tenantId }, relations: RELATIONS });
  if (!parcela) throw new NotFoundException("Parcela não encontrada");
  return comSituacao(parcela, todayIso());
}

async function somarValorPendente(where: FindOptionsWhere<ParcelaHonorario>): Promise<number> {
  const total = await ParcelaHonorarioRepository.sum("valor", { ...where, status: StatusParcelaEnum.PENDENTE });
  return Number(total ?? 0);
}

async function somarRecebidoEntre(tenantId: string, inicio: string, fim: string): Promise<number> {
  const response = await ParcelaHonorarioRepository.createQueryBuilder("parcela")
    .select("COALESCE(SUM(COALESCE(parcela.valorPago, parcela.valor)), 0)", "total")
    .where("parcela.tenantId = :tenantId", { tenantId })
    .andWhere("parcela.status = :status", { status: StatusParcelaEnum.PAGA })
    .andWhere("parcela.dataPagamento BETWEEN :inicio AND :fim", { inicio, fim })
    .getRawOne<{ total: string }>();

  return Number(response?.total ?? 0);
}

export const ParcelaHonorarioService = {
  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filters: ListFilters = {}
  ): Promise<{ list: ParcelaComSituacao[], more: boolean, page: number, rpp: number }> {
    const { term, situacao, clienteId, vencimentoDe, vencimentoAte } = filters;
    const today = todayIso();

    const filtroSituacao = filtroDaSituacao(situacao, today);

    const condicoesVencimento: FindOperator<string>[] = [
      ...(isDataIso(vencimentoDe) ? [MoreThanOrEqual(vencimentoDe)] : []),
      ...(isDataIso(vencimentoAte) ? [LessThanOrEqual(vencimentoAte)] : []),
      ...(filtroSituacao.vencimento ? [filtroSituacao.vencimento] : []),
    ];

    const baseWhere: FindOptionsWhere<ParcelaHonorario> = {
      tenantId,
      ...(filtroSituacao.status ? { status: filtroSituacao.status } : {}),
      ...(condicoesVencimento.length > 0 ? { vencimento: And(...condicoesVencimento) } : {}),
    };

    const filtroCliente = isUuid(clienteId) ? { clienteId } : {};

    const where: FindOptionsWhere<ParcelaHonorario>[] = term
      ? [
          { ...baseWhere, honorario: { ...filtroCliente, descricao: ILike(`%${term}%`) } },
          { ...baseWhere, honorario: { ...filtroCliente, cliente: { nome: ILike(`%${term}%`) } } },
        ]
      : [{ ...baseWhere, honorario: filtroCliente }];

    const order: FindOptionsOrder<ParcelaHonorario> = situacao === SituacaoParcelaEnum.PAGA
      ? { dataPagamento: "DESC", numero: "ASC" }
      : { vencimento: "ASC", numero: "ASC" };

    const [parcelas, total] = await ParcelaHonorarioRepository.findAndCount({
      where,
      relations: RELATIONS,
      skip: (page - 1) * rpp,
      take: rpp,
      order,
    });

    const list = parcelas.map((parcela) => comSituacao(parcela, today));

    return { list, more: page * rpp < total, page, rpp };
  },

  async create(honorarioId: string, tenantId: string, dados: DadosParcela): Promise<ParcelaComSituacao> {
    if (!isUuid(honorarioId)) throw new NotFoundException("Honorário não encontrado");

    const valor = validarValor(dados.valor);
    const vencimento = validarVencimento(dados.vencimento);
    const parcelaId = randomUUID();

    await AppDataSource.transaction(async (manager) => {
      const honorario = await bloquearHonorario(manager, honorarioId, tenantId);
      const numero = await proximoNumero(manager, honorario.id, tenantId);

      await manager.getRepository(ParcelaHonorario).insert({
        id: parcelaId,
        honorarioId: honorario.id,
        numero,
        valor,
        vencimento,
        status: StatusParcelaEnum.PENDENTE,
        observacoes: textoOpcional(dados.observacoes),
        tenantId,
      });
    });

    return buscarComSituacao(parcelaId, tenantId);
  },

  async update(id: string, tenantId: string, dados: DadosParcela): Promise<ParcelaComSituacao> {
    const parcela = await buscarParcela(id, tenantId);
    if (parcela.status === StatusParcelaEnum.PAGA) throw new AppError("Parcela paga não pode ser editada");

    const valor = validarValor(dados.valor);
    const vencimento = validarVencimento(dados.vencimento);

    const response = await ParcelaHonorarioRepository.update(
      { id: parcela.id, tenantId, status: In(STATUS_EDITAVEIS) },
      { valor, vencimento, observacoes: textoOpcional(dados.observacoes) }
    );
    garantirAlteracao(response, "Parcela paga não pode ser editada");

    return buscarComSituacao(parcela.id, tenantId);
  },

  async registrarPagamento(id: string, tenantId: string, dados: DadosPagamento): Promise<ParcelaComSituacao> {
    const { honorarioId } = await buscarParcela(id, tenantId);

    const dataPagamento = dados.dataPagamento;
    if (!isDataIso(dataPagamento)) throw new AppError("Data de pagamento inválida");
    if (dataPagamento > todayIso()) throw new AppError("Data de pagamento não pode ser futura");

    const isValorPagoVazio = dados.valorPago === null || dados.valorPago === undefined || dados.valorPago === "";
    const valorPagoInformado = isValorPagoVazio ? null : validarCentavos(dados.valorPago);
    const formaPagamento = validarFormaPagamento(dados.formaPagamento);

    await AppDataSource.transaction(async (manager) => {
      await bloquearHonorario(manager, honorarioId, tenantId);

      const parcelaRepository = manager.getRepository(ParcelaHonorario);
      const parcela = await parcelaRepository.findOne({
        where: { id, tenantId },
        lock: { mode: "pessimistic_write" },
      });
      if (!parcela) throw new NotFoundException("Parcela não encontrada");
      if (parcela.status !== StatusParcelaEnum.PENDENTE) throw new AppError("Parcela não está em aberto");

      const valorDaParcelaEmCentavos = paraCentavos(parcela.valor);
      const valorPagoEmCentavos = valorPagoInformado ?? valorDaParcelaEmCentavos;
      const saldoEmCentavos = valorDaParcelaEmCentavos - valorPagoEmCentavos;
      const isPagamentoParcial = saldoEmCentavos > 0;

      await parcelaRepository.update(
        { id: parcela.id, tenantId },
        {
          status: StatusParcelaEnum.PAGA,
          dataPagamento,
          valorPago: deCentavos(valorPagoEmCentavos),
          formaPagamento,
          ...(isPagamentoParcial ? { valor: deCentavos(valorPagoEmCentavos) } : {}),
        }
      );

      if (!isPagamentoParcial) return;

      const numero = await proximoNumero(manager, parcela.honorarioId, tenantId);
      await parcelaRepository.insert({
        id: randomUUID(),
        honorarioId: parcela.honorarioId,
        numero,
        valor: deCentavos(saldoEmCentavos),
        vencimento: parcela.vencimento,
        status: StatusParcelaEnum.PENDENTE,
        observacoes: `Saldo da parcela ${parcela.numero}`,
        tenantId,
      });
    });

    return buscarComSituacao(id, tenantId);
  },

  async alterarStatus(id: string, tenantId: string, novoStatus: unknown): Promise<ParcelaComSituacao> {
    const parcela = await buscarParcela(id, tenantId);

    if (novoStatus === StatusParcelaEnum.CANCELADA) {
      const response = await ParcelaHonorarioRepository.update(
        { id: parcela.id, tenantId, status: StatusParcelaEnum.PENDENTE },
        { status: StatusParcelaEnum.CANCELADA }
      );
      garantirAlteracao(response, "Apenas parcelas em aberto podem ser canceladas");

      return buscarComSituacao(parcela.id, tenantId);
    }

    if (novoStatus === StatusParcelaEnum.PENDENTE) {
      if (parcela.status === StatusParcelaEnum.PENDENTE) throw new AppError("Parcela já está em aberto");

      const response = await ParcelaHonorarioRepository.update(
        { id: parcela.id, tenantId, status: parcela.status },
        { status: StatusParcelaEnum.PENDENTE, dataPagamento: null, valorPago: null, formaPagamento: null }
      );
      garantirAlteracao(response, "Parcela já foi alterada");

      return buscarComSituacao(parcela.id, tenantId);
    }

    throw new AppError("Status inválido");
  },

  async remove(id: string, tenantId: string): Promise<void> {
    const parcela = await buscarParcela(id, tenantId);
    if (parcela.status === StatusParcelaEnum.PAGA) throw new AppError("Parcela paga não pode ser excluída");

    const response = await ParcelaHonorarioRepository.delete({
      id: parcela.id,
      tenantId,
      status: In(STATUS_EDITAVEIS),
    });
    garantirAlteracao(response, "Parcela paga não pode ser excluída");
  },

  async dashboard(tenantId: string): Promise<DashboardFinanceiro> {
    const today = todayIso();
    const em30Dias = adicionarDias(today, 30);

    const [emAberto, emAtraso, quantidadeEmAtraso, aVencer30Dias, recebidoNoMes] = await Promise.all([
      somarValorPendente({ tenantId }),
      somarValorPendente({ tenantId, vencimento: LessThan(today) }),
      ParcelaHonorarioRepository.countBy({ tenantId, status: StatusParcelaEnum.PENDENTE, vencimento: LessThan(today) }),
      somarValorPendente({ tenantId, vencimento: Between(today, em30Dias) }),
      somarRecebidoEntre(tenantId, inicioDoMes(today), fimDoMes(today)),
    ]);

    return { emAberto, emAtraso, quantidadeEmAtraso, aVencer30Dias, recebidoNoMes };
  },
};
