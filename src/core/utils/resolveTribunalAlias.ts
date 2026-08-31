import { AppError } from "../exceptions/HttpException";
import { DATAJUD_TRIBUNAIS, DATAJUD_SEGMENTOS } from "../constants/datajudTribunais";
import { normalizarNumeroProcesso } from "./normalizarNumeroProcesso";

export function resolveTribunalAlias(numeroProcesso: string): string {
  const numeroNormalizado = normalizarNumeroProcesso(numeroProcesso);
  const segmento = numeroNormalizado.slice(13, 14);
  const tribunal = numeroNormalizado.slice(14, 16);
  const alias = DATAJUD_TRIBUNAIS[`${segmento}.${tribunal}`] ?? DATAJUD_SEGMENTOS[segmento];

  if (!alias) {
    throw new AppError("Tribunal não disponível para consulta ao DataJud.");
  }

  return alias;
}
