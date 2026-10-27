import { Router } from "express";
import projectRoutes from "./project.routes";
import workOrderRoutes from "./workOrder.routes";
import inspectionRoutes from "./inspection.routes";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listarCatalogosController } from "../../controllers/sivu/diagnostico.controller";

/**
 * Montado en /api/sivu (src/routes/index.ts). Separado por completo de
 * /api (la demo, sin subcarpeta): tablas, esquemas Zod y autorización
 * propios del modelo nuevo (Fase 6). No se tocan las rutas de la demo.
 */
const router = Router();

router.use("/projects", projectRoutes);
router.use("/work-orders", workOrderRoutes);
router.use("/inspections", inspectionRoutes);
// Catálogos vigentes con código y etiqueta (B15; PR-021).
router.get("/catalogs", authMiddleware, listarCatalogosController);

export default router;
