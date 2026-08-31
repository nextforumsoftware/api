import { NextFunction, Request, Response } from "express";
import { ClienteService } from "../services/ClienteService";

export const ClienteController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const filters = {
        ...(req.query.term !== undefined && { term: req.query.term as string }),
        ...(req.query.tipoCliente !== undefined && { tipoCliente: req.query.tipoCliente as string }),
      };
      res.json(await ClienteService.list(tenantId, page, rpp, filters));
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      res.json(await ClienteService.get(id, req.user!.tenantId!));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await ClienteService.create({
        ...req.body,
        createdByUser: req.user!.id,
        tenantId: req.user!.tenantId
      }));
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      res.json(await ClienteService.update(id, req.user!.tenantId!, req.body));
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      if (!id) {
        return res.status(400).json({ message: "ID do cliente é obrigatório" });
      }
      await ClienteService.remove(id, req.user!.tenantId!);
      res.status(204).send();
    } catch (err) { next(err); }
  },
}