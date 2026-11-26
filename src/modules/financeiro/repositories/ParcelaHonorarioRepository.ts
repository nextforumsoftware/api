import { AppDataSource } from "../../../data";
import { ParcelaHonorario } from "../models/ParcelaHonorario";

export const ParcelaHonorarioRepository = AppDataSource.getRepository(ParcelaHonorario)
