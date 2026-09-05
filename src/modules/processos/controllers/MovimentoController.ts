import { NextFunction, Request, Response } from "express";
import { MovimentoService } from "../services/MovimentoService";
import { MovimentoSyncService } from "../services/MovimentoSyncService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";

export const MovimentoController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await MovimentoService.listByProcesso(id, tenantId));
    } catch (err) { next(err); }
  },

  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const filtros = {
        ...(req.query.processoId !== undefined && { processoId: req.query.processoId as string }),
        ...(req.query.clienteId !== undefined && { clienteId: req.query.clienteId as string }),
        ...(req.query.naTimeline !== undefined && { naTimeline: req.query.naTimeline === "true" }),
      };

      res.json(await MovimentoService.listByTenant(tenantId, page, rpp, filtros));
    } catch (err) { next(err); }
  },

  async sincronizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await MovimentoSyncService.sincronizar(id, tenantId));
    } catch (err) { next(err); }
  },
}
