import { Router } from "express";
import authenticate from "../core/middlewares/Auth";
import { HonorarioController } from "../modules/financeiro/controllers/HonorarioController";
import { ParcelaHonorarioController } from "../modules/financeiro/controllers/ParcelaHonorarioController";

const router = Router();
const context = "/financeiro"

router.use(authenticate);

router.get(`${context}/dashboard`, authenticate, ParcelaHonorarioController.dashboard);

router.get(`${context}/honorarios`, authenticate, HonorarioController.get);
router.get(`${context}/honorarios/:id`, authenticate, HonorarioController.getById);
router.post(`${context}/honorarios`, authenticate, HonorarioController.create);
router.put(`${context}/honorarios/:id`, authenticate, HonorarioController.update);
router.delete(`${context}/honorarios/:id`, authenticate, HonorarioController.delete);
router.post(`${context}/honorarios/:id/parcelas`, authenticate, ParcelaHonorarioController.create);

router.get(`${context}/parcelas`, authenticate, ParcelaHonorarioController.get);
router.put(`${context}/parcelas/:id`, authenticate, ParcelaHonorarioController.update);
router.patch(`${context}/parcelas/:id/pagamento`, authenticate, ParcelaHonorarioController.registrarPagamento);
router.patch(`${context}/parcelas/:id/status`, authenticate, ParcelaHonorarioController.updateStatus);
router.delete(`${context}/parcelas/:id`, authenticate, ParcelaHonorarioController.delete);

export default router;
