export function paraCentavos(valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return NaN;

  const numero = Number(valor);
  if (!Number.isFinite(numero)) return NaN;
  return Math.round(numero * 100);
}

export function deCentavos(centavos: number): number {
  return centavos / 100;
}

export function somarEmCentavos(valores: number[]): number {
  return valores.reduce((total, valor) => total + paraCentavos(valor), 0);
}

export function dividirEmParcelas(totalCentavos: number, quantidade: number): number[] {
  const valorBase = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - valorBase * quantidade;

  return Array.from({ length: quantidade }, (_item, indice) =>
    indice === quantidade - 1 ? valorBase + resto : valorBase
  );
}

const LIMITE_EM_CENTAVOS = 999_999_999_999_999;

export function centavosValidos(valor: unknown): number | null {
  const valorEmCentavos = paraCentavos(valor);
  if (!(valorEmCentavos > 0) || valorEmCentavos > LIMITE_EM_CENTAVOS) return null;
  return valorEmCentavos;
}
