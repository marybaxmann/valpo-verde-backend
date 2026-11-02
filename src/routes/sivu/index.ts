import { Router } from "express";
import projectRoutes from "./project.routes";
import workOrderRoutes from "./workOrder.routes";
import inspectionRoutes from "./inspection.routes";
import conectaRoutes from "./conecta.routes";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listarCatalogosController } from "../../controllers/sivu/diagnostico.controller";
import { listarNotificacionesController, marcarLeidaController } from "../../controllers/sivu/notificaciones.controller";

/**
 * Montado en /api/sivu (src/routes/index.ts). Separado por completo de
 * /api (la demo, sin subcarpeta): tablas, esquemas Zod y autorización
 * propios del modelo nuevo (Fase 6). No se tocan las rutas de la demo.
 */
const router = Router();

router.use("/projects", projectRoutes);
router.use("/work-orders", workOrderRoutes);
router.use("/inspections", inspectionRoutes);
// Valpo Verde Conecta, público (#62; CC-062).
router.use("/conecta", conectaRoutes);
// Catálogos vigentes con código y etiqueta (B15; PR-021).
router.get("/catalogs", authMiddleware, listarCatalogosController);
// Avisos dentro de SIVU (CC-051) y recordatorios (#63). Requieren la migración 033 (propuesta, sin aplicar).
router.get("/notificaciones", authMiddleware, listarNotificacionesController);
router.patch("/notificaciones/:id/leida", authMiddleware, marcarLeidaController);

export default router;
