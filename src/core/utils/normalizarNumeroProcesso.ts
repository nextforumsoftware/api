import { AppError } from "../exceptions/HttpException";

export function normalizarNumeroProcesso(numeroProcesso: string): string {
  const apenasDigitos = (numeroProcesso ?? "").replace(/\D/g, "");

  if (apenasDigitos.length !== 20) {
    throw new AppError(
      "Número de processo fora do padrão CNJ."
    );
  }

  return apenasDigitos;
}
