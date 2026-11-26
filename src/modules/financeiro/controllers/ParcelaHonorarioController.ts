import { NextFunction, Request, Response } from "express";
import { ParcelaHonorarioService } from "../services/ParcelaHonorarioService";
import { tenantIdOrThrow } from "../../../core/utils/tenantIdOrThrow";
import { paginacaoDaQuery } from "../../../core/utils/paginacaoDaQuery";

export const ParcelaHonorarioController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const { page, rpp } = paginacaoDaQuery(req.query);
      const filters = {
        ...(req.query.term !== undefined && { term: req.query.term as string }),
        ...(req.query.situacao !== undefined && { situacao: req.query.situacao as string }),
        ...(req.query.clienteId !== undefined && { clienteId: req.query.clienteId as string }),
        ...(req.query.vencimentoDe !== undefined && { vencimentoDe: req.query.vencimentoDe as string }),
        ...(req.query.vencimentoAte !== undefined && { vencimentoAte: req.query.vencimentoAte as string }),
      };

      res.json(await ParcelaHonorarioService.list(tenantId, page, rpp, filters));
    } catch (err) { next(err); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const honorarioId = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      const parcela = await ParcelaHonorarioService.create(honorarioId, tenantId, req.body);
      res.status(201).json(parcela);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await ParcelaHonorarioService.update(id, tenantId, req.body));
    } catch (err) { next(err); }
  },

  async registrarPagamento(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await ParcelaHonorarioService.registrarPagamento(id, tenantId, req.body));
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);
      const status = req.body.status;

      res.json(await ParcelaHonorarioService.alterarStatus(id, tenantId, status));
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      await ParcelaHonorarioService.remove(id, tenantId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);

      res.json(await ParcelaHonorarioService.dashboard(tenantId));
    } catch (err) { next(err); }
  },
}
