import express from "express";
import cors from "cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

// CORS_ORIGIN admite varios orígenes separados por coma (local + despliegue).
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean), credentials: true }));
// Límite explícito, no el default de express (100kb): un sector por
// KML/KMZ en base64 (archivo de hasta 5 MB, ver geometriaSector.service.ts)
// pesa más que eso en JSON. 8mb deja margen para el overhead de base64
// (~33%) sin ser un límite laxo — la protección fina contra archivos
// desproporcionados vive en geometriaSector.service.ts, no acá.
app.use(express.json({ limit: "8mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

// Debe registrarse al final, después de todas las rutas.
app.use(errorMiddleware);

export default app;
