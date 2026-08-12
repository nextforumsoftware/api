import { Router } from "express";
import multer from "multer";
import authenticate from "../core/middlewares/Auth";
import { JurisprudenciaController } from "../modules/jurisprudencias/controllers/JurisprudenciaController";

const router = Router();
const context = "/jurisprudencias"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.use(authenticate);

router.get(context + "/", JurisprudenciaController.list);
router.get(context + "/:id/download", JurisprudenciaController.download);
router.get(context + "/:id", JurisprudenciaController.getById);
router.post(context + "/", upload.single("arquivo"), JurisprudenciaController.create);
router.put(context + "/:id", JurisprudenciaController.update);
router.delete(context + "/:id", JurisprudenciaController.delete);

export default router;
