import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../../config/awsConfig';
import { JurisprudenciaService } from '../services/JurisprudenciaService';
import { tenantIdOrThrow } from '../../../core/utils/tenantIdOrThrow';

export const JurisprudenciaController = {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const filters = {
        ...(req.query.termo !== undefined && { termo: req.query.termo as string }),
        ...(req.query.tribunal !== undefined && { tribunal: req.query.tribunal as string }),
        ...(req.query.tipoAcao !== undefined && { tipoAcao: req.query.tipoAcao as string }),
        ...(req.query.favorito !== undefined && { favorito: req.query.favorito === 'true' }),
      };
      res.json(await JurisprudenciaService.list(tenantId, page, rpp, filters));
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await JurisprudenciaService.get(tenantId, id));
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = tenantIdOrThrow(req);
      const { favorito, ...rest } = req.body;

      const data = {
        ...rest,
        ...(favorito !== undefined && { favorito: favorito === 'true' || favorito === true }),
      };

      const novaJurisprudencia = await JurisprudenciaService.create(
        tenantId,
        req.user!.id,
        data,
        req.file
      );

      res.status(201).json(novaJurisprudencia);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      res.json(await JurisprudenciaService.update(tenantId, id, req.body));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      await JurisprudenciaService.remove(tenantId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const tenantId = tenantIdOrThrow(req);

      const jurisprudencia = await JurisprudenciaService.get(tenantId, id);

      if (!jurisprudencia.arquivoChaveS3) {
        return res.status(400).json({ message: "Esta jurisprudência não possui arquivo anexado" });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: jurisprudencia.arquivoChaveS3,
      });

      const s3Response = await s3Client.send(command);

      res.setHeader('Content-Type', s3Response.ContentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(jurisprudencia.arquivoNomeOriginal ?? 'arquivo')}"`);

      (s3Response.Body as Readable).pipe(res);
    } catch (err) {
      next(err);
    }
  },
};
