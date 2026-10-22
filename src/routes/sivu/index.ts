import { Router } from "express";
import projectRoutes from "./project.routes";

/**
 * Montado en /api/sivu (src/routes/index.ts). Separado por completo de
 * /api (la demo, sin subcarpeta): tablas, esquemas Zod y autorización
 * propios del modelo nuevo (Fase 6). No se tocan las rutas de la demo.
 */
const router = Router();

router.use("/projects", projectRoutes);

export default router;
