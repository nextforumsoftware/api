import { AppDataSource } from "../../../data";
import { Prazo } from "../models/Prazo";

export const PrazoRepository = AppDataSource.getRepository(Prazo)
