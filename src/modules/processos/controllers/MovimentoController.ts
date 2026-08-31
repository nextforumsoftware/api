import { NextFunction, Request, Response } from "express";
import { MovimentoSyncService } from "../services/MovimentoSyncService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";

export const MovimentoController = {
  async sincronizar(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await MovimentoSyncService.sincronizar(id, tenantId));
    } catch (err) { next(err); }
  },
}
