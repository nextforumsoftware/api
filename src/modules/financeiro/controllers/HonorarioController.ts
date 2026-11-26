import { NextFunction, Request, Response } from "express";
import { HonorarioService } from "../services/HonorarioService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";
import { paginacaoDaQuery } from "../../../core/utils/paginacaoDaQuery";

export const HonorarioController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const { page, rpp } = paginacaoDaQuery(req.query);
      const filters = {
        ...(req.query.term !== undefined && { term: req.query.term as string }),
        ...(req.query.clienteId !== undefined && { clienteId: req.query.clienteId as string }),
        ...(req.query.processoId !== undefined && { processoId: req.query.processoId as string }),
        ...(req.query.tipo !== undefined && { tipo: req.query.tipo as string }),
      };

      res.json(await HonorarioService.list(tenantId, page, rpp, filters));
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await HonorarioService.get(id, tenantId));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const userId = req.user!.id;

      const honorario = await HonorarioService.create(req.body, tenantId, userId);
      res.status(201).json(honorario);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await HonorarioService.update(id, tenantId, req.body));
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      await HonorarioService.remove(id, tenantId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
}
