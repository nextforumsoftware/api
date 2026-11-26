import { ValueTransformer } from "typeorm";

export const numericTransformer: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) => (valor == null ? null : Number(valor)),
};
