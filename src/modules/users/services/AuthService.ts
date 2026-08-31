import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "../repositories/AuthRepository";
import { UnauthorizedException } from "../../../core/exceptions/HttpException";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

export const AuthService = {
  async login(email: string, password: string) {
    if (!email || !password) throw new Error("Credenciais não informadas");

    const user = await AuthRepository.findOne({ where: { email }, relations: ["empresa"] });
    if (!user) throw new UnauthorizedException("Credenciais Inválidas");

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) throw new UnauthorizedException("Credenciais Inválidas");

    if (!user.ativo) throw new Error("Usuário inativo. Entre em contato com o administrador do escritório.");

    const token = jwt.sign({ id: user.id, email: user.email, tenantId: user.empresa?.id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    return { token, user: { id: user.id, nome: user.nome, email: user.email } };
  },

  async updatePerfil(userId: string, nome: string, email: string, novaSenha?: string, fotoUrl?: string) {
    if (!nome) throw new Error("Nome não informado");
    if (!email) throw new Error("E-mail não informado");
    if (novaSenha !== undefined && novaSenha.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres");

    const user = await AuthRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("Usuário não encontrado");

    if (email !== user.email) {
      const existing = await AuthRepository.findOneBy({ email });
      if (existing) throw new Error("E-mail já está em uso");
    }

    user.nome = nome;
    user.email = email;
    if (novaSenha) user.password = await bcrypt.hash(novaSenha, 10);
    if (fotoUrl) user.fotoPerfil = fotoUrl;

    await AuthRepository.save(user);
    return { id: user.id, nome: user.nome, email: user.email, fotoPerfil: user.fotoPerfil };
  },

  async userInfo(token: string) {
    try {
      if(!token) throw new Error("Token inválido ou expirado");

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

      const user = await AuthRepository.findOne({
        where: { id: payload.id },
        relations: ["empresa"],
        select: { id: true, nome: true, email: true, fotoPerfil: true, empresa: { id: true } }
      });

      if (!user) throw new Error("Usuário não encontrado");

      return user;
    } catch {
      throw new Error("Token inválido ou expirado");
    }
  }
}
