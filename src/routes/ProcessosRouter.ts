import { Router } from "express";
import authenticate from "../core/middlewares/Auth";
import { ProcessoController } from "../modules/processos/controllers/ProcessoController";
import { MovimentoController } from "../modules/processos/controllers/MovimentoController";

const router = Router();
const context = "/processos"

router.use(authenticate);

router.get(context + "/dashboard", authenticate, ProcessoController.dashboard);
router.get(context + "/movimentos", authenticate, MovimentoController.listAll);
router.get(context + "/", authenticate, ProcessoController.get);
router.get(context + "/:id", authenticate, ProcessoController.getById);
router.post(context + "/", authenticate, ProcessoController.create);
router.put(context + "/:id", authenticate, ProcessoController.update);
router.delete(context + "/:id", authenticate, ProcessoController.delete);
router.get(context + "/:id/movimentos", authenticate, MovimentoController.list);
router.post(context + "/:id/movimentos/sincronizar", authenticate, MovimentoController.sincronizar);

export default router;
