import { NextFunction, Request, Response } from "express";
import { PrazoService } from "../services/PrazoService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";

export const PrazoController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const filters = {
        ...(req.query.term !== undefined && { term: req.query.term as string }),
        ...(req.query.status !== undefined && { status: req.query.status as string }),
        ...(req.query.processoId !== undefined && { processoId: req.query.processoId as string }),
      };
      res.json(await PrazoService.list(tenantId, page, rpp, filters));
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await PrazoService.get(id, tenantId));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);

      const prazo = await PrazoService.create({
        ...req.body,
        createdByUser: req.user!.id,
        tenantId,
      });

      res.status(201).json(prazo);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await PrazoService.update(id, tenantId, req.body));
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);
      const status = req.body.status;

      res.json(await PrazoService.updateStatus(id, tenantId, status));
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      await PrazoService.remove(id, tenantId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);

      res.json(await PrazoService.dashboard(tenantId));
    } catch (err) { next(err); }
  },
}
