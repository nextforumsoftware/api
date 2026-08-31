import { AppDataSource } from "../../../data";
import { MovimentoProcesso } from "../models/MovimentoProcesso";

export const MovimentoProcessoRepository = AppDataSource.getRepository(MovimentoProcesso);
