export function textoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  const texto = valor.trim();
  return texto === "" ? null : texto;
}
