import { Request } from "express";

const RPP_PADRAO = 20;
const RPP_MAXIMO = 100;

export function paginacaoDaQuery(query: Request["query"]): { page: number; rpp: number } {
  const page = Number.parseInt(String(query.page), 10);
  const rpp = Number.parseInt(String(query.rpp), 10);

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    rpp: Number.isInteger(rpp) && rpp > 0 ? Math.min(rpp, RPP_MAXIMO) : RPP_PADRAO,
  };
}
