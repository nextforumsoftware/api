import { AppDataSource } from "../../../data";
import { DetalhesMovimento } from "../models/DetalhesMovimento";

export const DetalhesMovimentoRepository = AppDataSource.getRepository(DetalhesMovimento);
