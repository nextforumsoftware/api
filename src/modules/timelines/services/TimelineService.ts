import { ProcessoRepository } from "../../processos/repositories/ProcessoRepository";
import { MovimentoProcessoRepository } from "../../processos/repositories/MovimentoProcessoRepository";
import { TimelineEventoRepository } from "../repositories/TimelineEventoRepository";
import { TimelineEvento } from "../models/TimelineEvento";
import { AppError, NotFoundException } from "../../../core/exceptions/HttpException";

export const TimelineService = {
  async resumo(tenantId: string): Promise<object[]> {
    const processos = await ProcessoRepository.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });

    return Promise.all(
      processos.map(async (processo) => {
        const totalEventos = await TimelineEventoRepository.count({ where: { processoId: processo.id } });
        const ultimo = await TimelineEventoRepository.findOne({
          where: { processoId: processo.id },
          order: { data: "DESC", createdAt: "DESC" },
        });
        return {
          id: processo.id,
          numeroProcesso: processo.numeroProcesso,
          status: processo.status,
          tipoAcaoProcesso: processo.tipoAcaoProcesso,
          parteContraria: processo.parteContraria,
          totalEventos,
          ultimoEvento: ultimo
            ? { titulo: ultimo.titulo, tipo: ultimo.tipo, data: String(ultimo.data) }
            : null,
        };
      })
    );
  },

  async listByProcesso(processoId: string, tenantId: string): Promise<TimelineEvento[]> {
    return TimelineEventoRepository.find({
      where: { processoId, tenantId },
      order: { data: "DESC", createdAt: "DESC" },
    });
  },

  async create(processoId: string, tenantId: string, data: Partial<TimelineEvento>): Promise<TimelineEvento> {
    const processo = await ProcessoRepository.findOneBy({ id: processoId, tenantId });
    if (!processo) throw { status: 404, message: "Processo não encontrado" };

    if (data.movimentoId) await validarMovimento(data.movimentoId, processoId, tenantId);

    const evento = TimelineEventoRepository.create({
      ...data,
      processoId,
      tenantId,
    });
    return TimelineEventoRepository.save(evento);
  },

  async update(id: string, tenantId: string, data: Partial<TimelineEvento>): Promise<TimelineEvento> {
    const evento = await TimelineEventoRepository.findOneBy({ id, tenantId });
    if (!evento) throw { status: 404, message: "Evento não encontrado" };

    TimelineEventoRepository.merge(evento, data);
    return TimelineEventoRepository.save(evento);
  },

  async remove(id: string, tenantId: string): Promise<void> {
    const evento = await TimelineEventoRepository.findOneBy({ id, tenantId });
    if (!evento) throw { status: 404, message: "Evento não encontrado" };

    await TimelineEventoRepository.remove(evento);
  },

  async getPublicTimeline(processoId: string, pin: string): Promise<{
    processo: { numeroProcesso: string; status: string; tipoAcaoProcesso: string; cliente?: string };
    eventos: TimelineEvento[];
  }> {
    const processo = await ProcessoRepository.findOne({
      where: { id: processoId },
      relations: ["cliente"],
    });

    if (!processo) throw new NotFoundException("Processo não encontrado")

    const ultimosQuatro = processo.numeroProcesso.replace(/\D/g, "").slice(-4);
    if (ultimosQuatro !== pin.trim()) {
      throw { status: 401, message: "PIN inválido" };
    }

    const eventos = await TimelineEventoRepository.find({
      where: { processoId },
      order: { data: "ASC", createdAt: "ASC" },
    });

    return {
      processo: {
        numeroProcesso: processo.numeroProcesso,
        status: processo.status,
        tipoAcaoProcesso: processo.tipoAcaoProcesso,
        cliente: (processo as any).cliente?.nome,
      },
      eventos,
    };
  },
};

async function validarMovimento(movimentoId: string, processoId: string, tenantId: string): Promise<void> {
  const movimento = await MovimentoProcessoRepository.findOneBy({ id: movimentoId, processoId, tenantId });
  if (!movimento) throw new NotFoundException("Movimentação não encontrada");

  const jaPromovido = await TimelineEventoRepository.findOneBy({ movimentoId });
  if (jaPromovido) throw new AppError("Movimentação já está na timeline.");
}
