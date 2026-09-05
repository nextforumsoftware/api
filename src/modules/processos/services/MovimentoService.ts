import { In, IsNull, Not } from "typeorm";
import { NotFoundException } from "../../../core/exceptions/HttpException";
import { TimelineEventoRepository } from "../../timelines/repositories/TimelineEventoRepository";
import { ProcessoRepository } from "../repositories/ProcessoRepository";
import { MovimentoProcessoRepository } from "../repositories/MovimentoProcessoRepository";
import { MovimentoProcesso } from "../models/MovimentoProcesso";

export type MovimentoComTimeline = MovimentoProcesso & { naTimeline: boolean };

type FiltrosMovimento = {
  processoId?: string;
  clienteId?: string;
  naTimeline?: boolean;
};

type ListaPaginada = {
  list: MovimentoComTimeline[];
  more: boolean;
  page: number;
  rpp: number;
};

export const MovimentoService = {
  async listByProcesso(processoId: string, tenantId: string): Promise<MovimentoComTimeline[]> {
    const processo = await ProcessoRepository.findOneBy({ id: processoId, tenantId });
    if (!processo) throw new NotFoundException("Processo não encontrado");

    const movimentos = await MovimentoProcessoRepository.find({
      where: { processoId, tenantId },
      relations: { detalhes: true },
      order: { dataHora: "DESC" },
    });

    const idsPromovidos = await buscarIdsPromovidos(tenantId);

    return marcarPromovidos(movimentos, idsPromovidos);
  },

  async listByTenant(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filtros: FiltrosMovimento = {}
  ): Promise<ListaPaginada> {
    const { processoId, clienteId, naTimeline } = filtros;
    const idsPromovidos = await buscarIdsPromovidos(tenantId);

    if (naTimeline === true && idsPromovidos.length === 0) {
      return { list: [], more: false, page, rpp };
    }

    const [movimentos, total] = await MovimentoProcessoRepository.findAndCount({
      where: {
        tenantId,
        ...(processoId && { processoId }),
        ...(clienteId && { processo: { clienteId } }),
        ...(naTimeline === true && { id: In(idsPromovidos) }),
        ...(naTimeline === false && idsPromovidos.length > 0 && { id: Not(In(idsPromovidos)) }),
      },
      relations: { detalhes: true, processo: { cliente: true } },
      order: { dataHora: "DESC" },
      skip: (page - 1) * rpp,
      take: rpp,
    });

    return {
      list: marcarPromovidos(movimentos, idsPromovidos),
      more: page * rpp < total,
      page,
      rpp,
    };
  },
};

async function buscarIdsPromovidos(tenantId: string): Promise<string[]> {
  const promovidos = await TimelineEventoRepository.find({
    where: { tenantId, movimentoId: Not(IsNull()) },
    select: { movimentoId: true },
  });

  return promovidos.map((evento) => evento.movimentoId as string);
}

function marcarPromovidos(
  movimentos: MovimentoProcesso[],
  idsPromovidos: string[]
): MovimentoComTimeline[] {
  const promovidos = new Set(idsPromovidos);

  return movimentos.map((movimento) => ({
    ...movimento,
    naTimeline: promovidos.has(movimento.id),
  }));
}
