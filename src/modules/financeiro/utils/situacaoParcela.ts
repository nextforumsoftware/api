import { ParcelaHonorario } from "../models/ParcelaHonorario";
import { StatusParcelaEnum } from "../models/StatusParcelaEnum";
import { SituacaoParcelaEnum } from "../models/SituacaoParcelaEnum";

export type ParcelaComSituacao = ParcelaHonorario & { situacao: SituacaoParcelaEnum };

export function situacaoDaParcela(parcela: ParcelaHonorario, today: string): SituacaoParcelaEnum {
  if (parcela.status === StatusParcelaEnum.PAGA) return SituacaoParcelaEnum.PAGA;
  if (parcela.status === StatusParcelaEnum.CANCELADA) return SituacaoParcelaEnum.CANCELADA;
  return parcela.vencimento < today ? SituacaoParcelaEnum.ATRASADA : SituacaoParcelaEnum.A_VENCER;
}

export function comSituacao(parcela: ParcelaHonorario, today: string): ParcelaComSituacao {
  return { ...parcela, situacao: situacaoDaParcela(parcela, today) };
}
