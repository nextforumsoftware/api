const FUSO_HORARIO = "America/Sao_Paulo";
const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function partesDaData(dataIso: string): [number, number, number] {
  const [ano = 0, mes = 1, dia = 1] = dataIso.split("-").map(Number);
  return [ano, mes, dia];
}

function paraIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
}

export function isDataIso(valor: unknown): valor is string {
  if (typeof valor !== "string" || !FORMATO_DATA_ISO.test(valor)) return false;

  const [ano, mes, dia] = partesDaData(valor);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function adicionarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = partesDaData(dataIso);
  return paraIso(new Date(Date.UTC(ano, mes - 1, dia + dias)));
}

export function adicionarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = partesDaData(dataIso);
  const ultimoDiaDoMesAlvo = new Date(Date.UTC(ano, mes + meses, 0)).getUTCDate();
  return paraIso(new Date(Date.UTC(ano, mes - 1 + meses, Math.min(dia, ultimoDiaDoMesAlvo))));
}

export function inicioDoMes(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

export function fimDoMes(dataIso: string): string {
  const [ano, mes] = partesDaData(dataIso);
  return paraIso(new Date(Date.UTC(ano, mes, 0)));
}
