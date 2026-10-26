import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { listarMisOtsController, transicionarOrdenTrabajoController } from "../../controllers/sivu/workOrder.controller";
import { crearBorradorInspeccionController } from "../../controllers/sivu/inspection.controller";

/**
 * Montado en /api/sivu/work-orders (#58). Separado de project.routes.ts
 * porque estas rutas no cuelgan de un proyecto en la URL — la OT ya
 * trae su `project_id`, que el service resuelve antes de autorizar.
 */
const router = Router();

// Mis OT (B4; CC-064 k y n; CC-065): las OT donde el usuario es el
// responsable actual, de todos sus proyectos. Va antes de las rutas
// con :workOrderId.
router.get("/mine", authMiddleware, listarMisOtsController);

// Transición Pendiente→Programada→En ejecución (018g; CC-050). Solo el
// Inspector responsable asignado.
router.patch("/:workOrderId/estado", authMiddleware, transicionarOrdenTrabajoController);

// Primer guardado de una inspección (#58; CC-048/CC-050). Solo el
// Inspector responsable asignado.
router.post("/:workOrderId/inspections", authMiddleware, crearBorradorInspeccionController);

export default router;
