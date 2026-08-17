import { v4 as uuidv4 } from 'uuid';
import { Between, ILike, LessThan } from 'typeorm';
import { Prazo } from '../models/Prazo';
import { StatusPrazoEnum } from '../models/StatusPrazoEnum';
import { PrazoRepository } from '../repositories/PrazoRepository';
import { AppError, NotFoundException } from '../../../core/exceptions/HttpException';

type ListFilters = {
  term?: string;
  status?: string;
  processoId?: string;
}

const RELATIONS = ['processo', 'responsavel'];

function hojeSemHora(): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

export const PrazoService = {
  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filters: ListFilters = {}
  ): Promise<{ list: Prazo[], more: boolean, page: number, rpp: number }> {
    const { term, status, processoId } = filters;

    const baseWhere: any = {
      tenantId,
      ...(status && { status }),
      ...(processoId && { processoId }),
      ...(term && { titulo: ILike(`%${term}%`) }),
    };

    const [list, total] = await PrazoRepository.findAndCount({
      where: baseWhere,
      relations: RELATIONS,
      skip: (page - 1) * rpp,
      take: rpp,
      order: { data: 'ASC' },
    });

    return { list, more: page * rpp < total, page, rpp };
  },

  async get(id: string, tenantId: string): Promise<Prazo> {
    if (id == null) throw new NotFoundException("Erro ao buscar prazo");

    const prazo = await PrazoRepository.findOne({ where: { id, tenantId }, relations: RELATIONS });
    if (!prazo) throw new NotFoundException("Prazo não encontrado");
    return prazo;
  },

  async create(data: Partial<Prazo>): Promise<Prazo> {
    if (!data.processoId) throw new AppError("Processo não informado");
    if (!data.titulo) throw new AppError("Título do prazo não informado");
    if (!data.data) throw new AppError("Data do prazo não informada");

    data.id = uuidv4();
    const newPrazo = PrazoRepository.create(data);
    return PrazoRepository.save(newPrazo);
  },

  async update(id: string, tenantId: string, data: Partial<Prazo>): Promise<Prazo> {
    const prazo = await PrazoRepository.findOneBy({ id, tenantId });
    if (!prazo) throw new NotFoundException("Prazo não encontrado");

    PrazoRepository.merge(prazo, data);
    await PrazoRepository.save(prazo);

    return PrazoRepository.findOne({ where: { id, tenantId }, relations: RELATIONS }) as Promise<Prazo>;
  },

  async updateStatus(id: string, tenantId: string, status: StatusPrazoEnum): Promise<Prazo> {
    const prazo = await PrazoRepository.findOneBy({ id, tenantId });
    if (!prazo) throw new NotFoundException("Prazo não encontrado");

    prazo.status = status;
    await PrazoRepository.save(prazo);

    return PrazoRepository.findOne({ where: { id, tenantId }, relations: RELATIONS }) as Promise<Prazo>;
  },

  async remove(id: string, tenantId: string): Promise<void> {
    const prazo = await PrazoRepository.findOneBy({ id, tenantId });
    if (!prazo) throw new NotFoundException("Prazo não encontrado");

    await PrazoRepository.remove(prazo);
  },

  async dashboard(tenantId: string): Promise<{
    pendentes: number;
    vencidos: number;
    proximos7Dias: number;
    proximosPrazos: Prazo[];
  }> {
    const hoje = hojeSemHora();
    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);

    const [pendentes, vencidos, proximos7Dias, proximosPrazos] = await Promise.all([
      PrazoRepository.count({ where: { tenantId, status: StatusPrazoEnum.PENDENTE } }),
      PrazoRepository.count({
        where: { tenantId, status: StatusPrazoEnum.PENDENTE, data: LessThan(hoje) },
      }),
      PrazoRepository.count({
        where: { tenantId, status: StatusPrazoEnum.PENDENTE, data: Between(hoje, em7Dias) },
      }),
      PrazoRepository.find({
        where: { tenantId, status: StatusPrazoEnum.PENDENTE },
        relations: RELATIONS,
        order: { data: 'ASC' },
        take: 10,
      }),
    ]);

    return { pendentes, vencidos, proximos7Dias, proximosPrazos };
  },
};
