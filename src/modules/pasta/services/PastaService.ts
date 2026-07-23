import { Pasta } from '../models/Pasta';
import { PastaRepository } from '../repositories/PastaRepository';
import { ILike, IsNull } from "typeorm";

export const PastaService = {

  async list(
    tenantId: string,
    page: number = 1,
    rpp: number = 20,
    term?: string
  ): Promise<{ list: Pasta[], more: boolean, page: number, rpp: number }> {
    const where: any = term
      ? { tenantId, parentId: IsNull(), nome: ILike(`%${term}%`) }
      : { tenantId, parentId: IsNull() };

    const [list, total] = await PastaRepository.findAndCount({
      where,
      skip: (page - 1) * rpp,
      take: rpp,
      order: { nome: 'ASC' },
    });

    return { list, more: page * rpp < total, page, rpp };
  },

  async get(id: string, tenantId: string): Promise<Pasta> {
    if(id == null) throw { status: 404, message: "Erro ao buscar pasta" };

    const pasta = await PastaRepository.findOne({
      where: { id, tenantId },
      relations: ['subpastas', 'arquivos', 'parent']
     });

    if (!pasta) throw { status: 404, message: "Pasta não encontrado" };

    return pasta;
  },
};