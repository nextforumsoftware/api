import { NextFunction, Request, Response } from "express";
import { UsuariosService } from "../services/UsuariosService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";

export const UsuariosController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const term = (req.query.term as string) || undefined;
      res.json(await UsuariosService.list(tenantId, page, rpp, term));
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const id = String(req.params.id);
      res.json(await UsuariosService.getById(id, tenantId));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const { nome, email, password } = req.body;
      res.status(201).json(await UsuariosService.create(tenantId, { nome, email, password }));
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const id = String(req.params.id);
      const { nome, email, ativo } = req.body;
      res.json(await UsuariosService.update(id, tenantId, req.user!.id, { nome, email, ativo }));
    } catch (err) { next(err); }
  },

  async changeSenha(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const id = String(req.params.id);
      const { novaSenha } = req.body;
      await UsuariosService.changeSenha(id, tenantId, novaSenha);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
