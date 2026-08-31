import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { S3Service } from "../../../core/services/S3Service";

function toS3Key(value: string): string {
  if (value.startsWith('http')) return new URL(value).pathname.slice(1);
  return value;
}

export const AuthController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.status ?? 400).json({ error: err.message });
    }
  },

  async updatePerfil(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Não autorizado" });

      const { nome, email, novaSenha } = req.body;

      let fotoKey: string | undefined;
      if (req.file) {
        const ext = req.file.originalname.split('.').pop();
        const key = `perfil/${userId}.${ext}`;
        const result = await S3Service.upload({
          key,
          contentType: req.file.mimetype,
          buffer: req.file.buffer,
        });
        fotoKey = result.key;
      }

      const user = await AuthService.updatePerfil(userId, nome, email, novaSenha, fotoKey);
      if (user.fotoPerfil) {
        user.fotoPerfil = await S3Service.getPresignedUrl(toS3Key(user.fotoPerfil));
      }
      return res.json({ user });
    } catch (err: any) {
      return res.status(err.status ?? 400).json({ error: err.message });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ message: "Token não informado" });

      const user = await AuthService.userInfo(token);
      if (user.fotoPerfil) {
        user.fotoPerfil = await S3Service.getPresignedUrl(toS3Key(user.fotoPerfil));
      }
      return res.json({ user });
    } catch {
      return res.status(401).json({ message: "Não autorizado" });
    }
  }
};
