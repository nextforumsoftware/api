import { Router } from "express";
import authenticate from "../core/middlewares/Auth";
import { PeticaoController } from "../modules/peticoes/controllers/PeticaoController";

const router = Router();
const context = "/peticoes"

router.use(authenticate);

router.get(context + "/", authenticate, PeticaoController.list);
router.get(context + "/:id", authenticate, PeticaoController.get);
router.post(context + "/gerar-ia", authenticate, PeticaoController.gerarComIA);
router.post(context + "/", authenticate, PeticaoController.create);
router.put(context + "/:id", authenticate, PeticaoController.update);
router.delete(context + "/:id", authenticate, PeticaoController.delete);

export default router;