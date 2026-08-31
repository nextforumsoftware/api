import { Request, Response } from "express";
import { BackofficeEmpresasService } from "../services/BackofficeEmpresasService";
import { S3Service } from "../../../core/services/S3Service";
import { Empresa } from "../models/Empresa";

function toS3Key(value: string): string {
  if (value.startsWith("http")) return new URL(value).pathname.slice(1);
  return value;
}

async function resolveLogoUrl(empresa: Empresa): Promise<Empresa> {
  if (empresa.logo) {
    empresa.logo = await S3Service.getPresignedUrl(toS3Key(empresa.logo));
  }
  return empresa;
}

export const BackofficeEmpresasController = {
  async list(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const rpp = parseInt(req.query.rpp as string) || 20;
      const term = (req.query.term as string) || undefined;
      const result = await BackofficeEmpresasService.list(page, rpp, term);
      result.list = await Promise.all(result.list.map(resolveLogoUrl));
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Erro ao listar escritórios" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { fantasia, razaoSocial, cnpj, usuarioAdmin } = req.body;
      const result = await BackofficeEmpresasService.create({ fantasia, razaoSocial, cnpj, usuarioAdmin });
      return res.status(201).json(result);
    } catch (err: any) {
      const status = ["CNPJ já cadastrado", "E-mail do usuário administrador já cadastrado"].includes(err?.message) ? 409 : 500;
      return res.status(status).json({ message: err?.message ?? "Erro ao criar escritório" });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { fantasia, razaoSocial, cnpj } = req.body;
      const empresa = await BackofficeEmpresasService.update(id, { fantasia, razaoSocial, cnpj });
      return res.json(await resolveLogoUrl(empresa));
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Erro ao atualizar escritório" });
    }
  },

  async updateLogo(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!req.file) return res.status(400).json({ message: "Arquivo não enviado" });

      const ext = req.file.mimetype.split("/")[1] || req.file.originalname.split(".").pop() || "png";
      const key = `escritorios/${id}/logo.${ext}`;
      await S3Service.upload({
        key,
        contentType: req.file.mimetype,
        buffer: req.file.buffer,
      });

      const empresa = await BackofficeEmpresasService.updateLogo(id, key);
      return res.json(await resolveLogoUrl(empresa));
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Erro ao atualizar logo" });
    }
  },

  async removeLogo(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const empresa = await BackofficeEmpresasService.updateLogo(id, null);
      return res.json(empresa);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? "Erro ao remover logo" });
    }
  },
};
