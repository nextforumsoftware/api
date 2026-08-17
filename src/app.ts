import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/AuthRoute";
import backofficeRoutes from "./routes/BackofficeRoute";
import usuariosRoutes from "./routes/UsuariosRoute";
import clientesRoutes from "./routes/ClientesRouter";
import processoRoutes from "./routes/ProcessosRouter";
import pastaRoutes from "./routes/PastasRouter";
import arquivosRoutes from "./routes/ArquivosRouter";
import jurisprudenciasRoutes from "./routes/JurisprudenciaRoutes";
import peticaoRoutes from "./routes/PeticaoRouter";
import timelineRoutes from "./routes/TimelineRouter";
import prazosRoutes from "./routes/PrazosRouter";
import { errorHandler } from "./core/middlewares/ErrorHandler";

dotenv.config();

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(authRoutes);
app.use(backofficeRoutes);
app.use(usuariosRoutes);
app.use(clientesRoutes);
app.use(processoRoutes)
app.use(pastaRoutes)
app.use(arquivosRoutes)
app.use(jurisprudenciasRoutes)
app.use(peticaoRoutes)
app.use(timelineRoutes)
app.use(prazosRoutes)

app.use(errorHandler)

export default app;