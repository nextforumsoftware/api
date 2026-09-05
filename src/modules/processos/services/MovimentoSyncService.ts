import { randomUUID } from "crypto";
import { AppDataSource } from "../../../data";
import { NotFoundException } from "../../../core/exceptions/HttpException";
import { DatajudService, MovimentoDatajud } from "../../../core/services/DatajudService";
import { ProcessoRepository } from "../repositories/ProcessoRepository";
import { MovimentoProcessoRepository } from "../repositories/MovimentoProcessoRepository";
import { DetalhesMovimentoRepository } from "../repositories/DetalhesMovimentoRepository";
import { MovimentoProcesso } from "../models/MovimentoProcesso";
import { DetalhesMovimento } from "../models/DetalhesMovimento";

export const MovimentoSyncService = {
  async sincronizar(processoId: string, tenantId: string): Promise<{ inseridos: number }> {
    const processo = await ProcessoRepository.findOneBy({ id: processoId, tenantId });
    if (!processo) throw new NotFoundException("Processo não encontrado");

    const resultado = await importarMovimentos(processo.id, processo.numeroProcesso, tenantId);
    await ProcessoRepository.update(processo.id, { ultimaSincronizacao: new Date() });

    return resultado;
  },
};

type MovimentoPreparado = { id: string; movimento: MovimentoDatajud };

async function importarMovimentos(
  processoId: string,
  numeroProcesso: string,
  tenantId: string
): Promise<{ inseridos: number }> {
  const dadosDatajud = await DatajudService.consultarProcesso(numeroProcesso);
  const movimentos = (dadosDatajud.movimentos ?? []).filter(temDadosMinimos);
  if (movimentos.length === 0) return { inseridos: 0 };

  const preparados = movimentos.map((movimento) => ({ id: randomUUID(), movimento }));

  return AppDataSource.transaction(async (manager) => {
    const movimentoRepository = manager.withRepository(MovimentoProcessoRepository);
    const detalhesRepository = manager.withRepository(DetalhesMovimentoRepository);

    const resultado = await movimentoRepository
      .createQueryBuilder()
      .insert()
      .into(MovimentoProcesso)
      .values(preparados.map((preparado) => montarMovimento(preparado, processoId, tenantId)))
      .orIgnore()
      .returning("id")
      .execute();

    const idsInseridos = new Set<string>(resultado.raw.map((linha: { id: string }) => linha.id));
    if (idsInseridos.size === 0) return { inseridos: 0 };

    const detalhes = preparados
      .filter((preparado) => idsInseridos.has(preparado.id))
      .flatMap((preparado) => montarDetalhes(preparado, tenantId));

    if (detalhes.length > 0) {
      await detalhesRepository
        .createQueryBuilder()
        .insert()
        .into(DetalhesMovimento)
        .values(detalhes)
        .execute();
    }

    return { inseridos: idsInseridos.size };
  });
}

function temDadosMinimos(movimento: MovimentoDatajud): boolean {
  return Number.isInteger(movimento?.codigo) && !Number.isNaN(new Date(movimento?.dataHora).getTime());
}

function montarMovimento(preparado: MovimentoPreparado, processoId: string, tenantId: string) {
  const { id, movimento } = preparado;

  return {
    id,
    processoId,
    tenantId,
    codigo: movimento.codigo,
    nome: movimento.nome,
    dataHora: new Date(movimento.dataHora),
    ...(movimento.orgaoJulgador
      ? {
          orgaoJulgadorCodigo: movimento.orgaoJulgador.codigo,
          orgaoJulgadorNome: movimento.orgaoJulgador.nome,
        }
      : {}),
  };
}

function montarDetalhes(preparado: MovimentoPreparado, tenantId: string) {
  const complementos = preparado.movimento.complementosTabelados ?? [];

  return complementos.map((complemento) => ({
    movimentoId: preparado.id,
    tenantId,
    codigo: complemento.codigo,
    valor: complemento.valor,
    nome: complemento.nome,
    descricao: complemento.descricao,
  }));
}
