import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { S3Service } from '../../../core/services/S3Service';
import { ArquivoService } from '../services/ArquivoService';
import { ArquivoRepository } from '../repositories/ArquivoRepository';

export const ArquivoController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pastaId = req.params.pastaId as string;

      if (!pastaId) {
        return res.status(400).json({ message: "ID da pasta é obrigatório" });
      }

      const arquivos = await ArquivoService.list(req.user!.tenantId!, pastaId);
      res.json(arquivos);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = req.params.arquivoId as string;
      if (!arquivoId) {
        return res.status(400).json({ message: "ID do arquivo é obrigatório" });
      }

      const arquivo = await ArquivoService.get(req.user!.tenantId!, arquivoId);
      res.json(arquivo);
    } catch (err) {
      next(err);
    }
  },


  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = String(req.params.arquivoId);
      if (!arquivoId) {
        return res.status(400).json({ message: "ID do arquivo é obrigatório" });
      }

      const arquivo = await ArquivoService.get(req.user!.tenantId!, arquivoId);

      res.json(arquivo);
    } catch (err) {
      next(err);
    }
  },


  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { pastaId } = req.body;
      if (!pastaId) return res.status(400).json({ message: "ID da pasta é obrigatório" });

      if (!req.file) return res.status(400).json({ message: "Nenhum arquivo enviado" });

      const novoArquivo = await ArquivoService.create(req.user!.tenantId!, pastaId, req.file);

      return res.status(201).json(novoArquivo);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = req.params.id as string;
      if (!arquivoId) {
        return res.status(400).json({ message: "ID do arquivo é obrigatório" });
      }

      const arquivoAtualizado = await ArquivoService.update(req.user!.tenantId!, arquivoId, req.body);
      res.json(arquivoAtualizado);
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = req.params.arquivoId as string;
      if (!arquivoId) return res.status(400).json({ message: 'ID do arquivo é obrigatório' });

      const arquivo = await ArquivoRepository.findOneBy({ id: arquivoId, tenantId: req.user!.tenantId! });
      if (!arquivo) return res.status(404).json({ message: 'Arquivo não encontrado' });

      const s3Response = await S3Service.get(arquivo.nomeFisico);

      res.setHeader('Content-Type', s3Response.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);

      (s3Response.body as Readable).pipe(res);
    } catch (err) {
      next(err);
    }
  },

  async presignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = req.params.arquivoId as string;
      if (!arquivoId) return res.status(400).json({ message: 'ID do arquivo é obrigatório' });

      const arquivo = await ArquivoRepository.findOneBy({ id: arquivoId, tenantId: req.user!.tenantId! });
      if (!arquivo) return res.status(404).json({ message: 'Arquivo não encontrado' });

      const url = await S3Service.getPresignedUrl(arquivo.nomeFisico, 900);

      res.json({ url });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const arquivoId = req.params.id as string;
      if (!arquivoId) {
        return res.status(400).json({ message: "ID do arquivo é obrigatório" });
      }

      await ArquivoService.remove(req.user!.tenantId!, arquivoId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
