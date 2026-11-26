import { AppDataSource } from "../../../data";
import { Honorario } from "../models/Honorario";

export const HonorarioRepository = AppDataSource.getRepository(Honorario)
