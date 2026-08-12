import { Request, Response, NextFunction } from "express";
import { HttpException } from "../exceptions/HttpException";

type MappedError = { status: number; message: string };

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const { status, message } = mapError(err);

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ status, message });
}

function mapError(err: any): MappedError {
  if (err instanceof HttpException) {
    return { status: err.status, message: err.message };
  }

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return { status: 401, message: "Token inválido ou expirado" };
  }

  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    return { status: 400, message: "Arquivo excede o tamanho máximo permitido" };
  }

  const legacyStatus = Number(err?.status ?? err?.statusCode); // throws no formato { status, message }
  if (Number.isInteger(legacyStatus) && legacyStatus >= 400) {
    return { status: legacyStatus, message: err?.message ?? "Erro" };
  }

  if (typeof err === "string") {
    return { status: 400, message: err };
  }

  return { status: 500, message: "Erro interno no servidor" };
}
