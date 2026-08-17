import { Router } from "express";
import authenticate from "../core/middlewares/Auth";
import { PrazoController } from "../modules/prazos/controllers/PrazoController";

const router = Router();
const context = "/prazos"

router.use(authenticate);

router.get(context + "/dashboard", authenticate, PrazoController.dashboard);
router.get(context + "/", authenticate, PrazoController.get);
router.get(context + "/:id", authenticate, PrazoController.getById);
router.post(context + "/", authenticate, PrazoController.create);
router.put(context + "/:id", authenticate, PrazoController.update);
router.patch(context + "/:id/status", authenticate, PrazoController.updateStatus);
router.delete(context + "/:id", authenticate, PrazoController.delete);

export default router;
