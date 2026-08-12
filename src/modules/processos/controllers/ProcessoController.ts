import { NextFunction, Request, Response } from "express";
import { ProcessoService } from "../services/ProcessoService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";

export const ProcessoController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const filters = {
        ...(req.query.term !== undefined && { term: req.query.term as string }),
        ...(req.query.status !== undefined && { status: req.query.status as string }),
        ...(req.query.tipoAcaoProcesso !== undefined && { tipoAcaoProcesso: req.query.tipoAcaoProcesso as string }),
      };
      res.json(await ProcessoService.list(tenantId, page, rpp, filters));
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await ProcessoService.get(id, tenantId));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const { clienteId, ...rest } = req.body;

      const processo = await ProcessoService.create({
        ...rest,
        createdByUser: req.user!.id,
        tenantId,
        cliente: { id: clienteId }
      });

      res.status(201).json(processo);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await ProcessoService.update(id, tenantId, req.body));
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      await ProcessoService.remove(id, tenantId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);

      res.json(await ProcessoService.dashboard(tenantId));
    } catch (err) { next(err); }
  },
}