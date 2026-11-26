import { EntityManager } from "typeorm";
import { Honorario } from "../models/Honorario";
import { NotFoundException } from "../../../core/exceptions/HttpException";

export async function bloquearHonorario(manager: EntityManager, honorarioId: string, tenantId: string): Promise<Honorario> {
  const honorario = await manager.getRepository(Honorario).findOne({
    where: { id: honorarioId, tenantId },
    lock: { mode: "pessimistic_write" },
  });
  if (!honorario) throw new NotFoundException("Honorário não encontrado");
  return honorario;
}
