import { v4 as uuidv4 } from 'uuid';
import { ILike } from 'typeorm';
import { Cliente } from '../models/Cliente';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { PastaRepository } from '../../pasta/repositories/PastaRepository';
import { NotFoundException } from '../../../core/exceptions/HttpException';

type ListFilters = {
  term?: string;
  tipoCliente?: string;
}

export const ClienteService = {
  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    filters: ListFilters = {}
  ): Promise<{ list: Cliente[], more: boolean, page: number, rpp: number }> {
    const { term, tipoCliente } = filters;

    const baseWhere: any = {
      tenantId,
      ...(tipoCliente && { tipoCliente }),
    };

    const where = term
      ? [
          { ...baseWhere, nome: ILike(`%${term}%`) },
          { ...baseWhere, email: ILike(`%${term}%`) },
        ]
      : [baseWhere];

    const [list, total] = await ClienteRepository.findAndCount({
      where,
      skip: (page - 1) * rpp,
      take: rpp,
      order: { nome: 'ASC' },
    });

    return { list, more: page * rpp < total, page, rpp };
  },

  async get(id: string, tenantId: string): Promise<Cliente> {
    if (id == null) throw new NotFoundException("Erro ao buscar cliente");

    const cliente = await ClienteRepository.findOneBy({ id, tenantId });
    if (!cliente) throw new NotFoundException("Cliente não encontrado");
    return cliente;
  },

  async create(data: Partial<Cliente>): Promise<Cliente> {
    data.id = uuidv4();
    const newCliente = ClienteRepository.create(data);
    const newPasta = PastaRepository.create({
      id: data.id,
      nome: newCliente.nome,
      ...(data.tenantId ? { tenantId: data.tenantId } : {}),
      dataUltimaModificacao: new Date()
    })

    await PastaRepository.save(newPasta);
    return ClienteRepository.save(newCliente);
  },

  async update(id: string, tenantId: string, data: Partial<Cliente>): Promise<Cliente> {
    const cliente = await ClienteRepository.findOneBy({ id, tenantId });
    if (!cliente) throw new NotFoundException("Cliente não encontrado");

    ClienteRepository.merge(cliente, data);
    await PastaRepository.update(id, {dataUltimaModificacao: new Date(), nome: data.nome!})

    return ClienteRepository.save(cliente);
  },

  async remove(id: string, tenantId: string): Promise<void> {
    const cliente = await ClienteRepository.findOneBy({ id, tenantId });
    if (!cliente) throw new NotFoundException("Cliente não encontrado");

    await ClienteRepository.remove(cliente);
  },
};