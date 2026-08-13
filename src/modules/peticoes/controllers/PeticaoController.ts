import { Request, Response, NextFunction } from 'express';
import { PeticaoService } from '../services/PeticaoService';
import { PeticaoIAService } from '../services/PeticaoIAService';

export const PeticaoController = {
  async gerarComIA(req: Request, res: Response, next: NextFunction) {
    try {
      const { tipo, prompt } = req.body;
      const conteudo = await PeticaoIAService.gerar(tipo, prompt);
      res.json({ conteudo });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const peticoes = await PeticaoService.list(req.user!.tenantId!);
      res.json(peticoes);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const peticaoId = req.params.id as string;
      if (!peticaoId) {
        return res.status(400).json({ message: "ID do arquivo é obrigatório" });
      }

      const arquivo = await PeticaoService.get(req.user!.tenantId!, peticaoId);

      res.json(arquivo);
    } catch (err) {
      next(err);
    }
  },


  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const newPeticao = await PeticaoService.create(req.user!.id, req.user!.tenantId!, req.body);
      res.status(201).json(newPeticao);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const peticaoId = req.params.id as string;
      if (!peticaoId) {
        return res.status(400).json({ message: "Petição não informada" });
      }

      await PeticaoService.remove(req.user!.tenantId!, peticaoId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const peticaoId = req.params.id as string;
      if (!peticaoId) {
        return res.status(400).json({ message: "Petição não informada" });
      }

      const editPedicao = await PeticaoService.update(req.user!.tenantId!, peticaoId, req.body);
      res.status(200).send(editPedicao);
    } catch (err) {
      next(err);
    }
  },
};
