import { Request } from "express";
import { AppError } from "../exceptions/HttpException";

export function tenantIdOrThrow(req: Request): string {
  const tenantId = req.user!.tenantId;
  if (!tenantId) throw new AppError("Usuário não está vinculado a um escritório");
  return tenantId;
}
