import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { subirFotosEjecucion } from "../../middlewares/upload.middleware";
import { listarMisOtsController, transicionarOrdenTrabajoController } from "../../controllers/sivu/workOrder.controller";
import { crearBorradorInspeccionController } from "../../controllers/sivu/inspection.controller";
import {
  cambiarRevisorController,
  listarEjecucionesController,
  listarRevisionesController,
  registrarEjecucionController,
  revisarEjecucionController,
} from "../../controllers/sivu/mantenimiento.controller";

/**
 * Montado en /api/sivu/work-orders (#58). Separado de project.routes.ts
 * porque estas rutas no cuelgan de un proyecto en la URL — la OT ya
 * trae su `project_id`, que el service resuelve antes de autorizar.
 */
import {
  cancelarOrdenTrabajoController,
  completarOrdenTrabajoController,
  listarInspeccionesDeOtController,
  reasignarOrdenTrabajoController,
} from "../../controllers/sivu/cierreOt.controller";

const router = Router();

// Mis OT (B4; CC-064 k y n; CC-065): las OT donde el usuario es el
// responsable actual, de todos sus proyectos. Va antes de las rutas
// con :workOrderId.
router.get("/mine", authMiddleware, listarMisOtsController);
// «Revisiones de mantenimiento» del Inspector revisor (#61; CC-064 b). Antes de :workOrderId.
router.get("/revisiones", authMiddleware, listarRevisionesController);

// Transición Pendiente→Programada→En ejecución (018g; CC-050). Solo el
// responsable asignado: Inspector (Inspección) o Encargado de mantención (Mantenimiento, 031).
router.patch("/:workOrderId/estado", authMiddleware, transicionarOrdenTrabajoController);
// Completar, cancelar y reasignar (#60; CC-050; ADR-017 v1.2). Solo el Usuario municipal.
// Completar es solo de Inspección: las de Mantenimiento las completa el Sistema (PR-020).
router.post("/:workOrderId/completar", authMiddleware, completarOrdenTrabajoController);
router.post("/:workOrderId/cancelar", authMiddleware, cancelarOrdenTrabajoController);
router.patch("/:workOrderId/responsable", authMiddleware, reasignarOrdenTrabajoController);

// Primer guardado de una inspección (#58; CC-048/CC-050). Solo el
// Inspector responsable asignado.
router.post("/:workOrderId/inspections", authMiddleware, crearBorradorInspeccionController);
// Inspecciones de la OT con su borrador, para retomarlo (B17). Cualquier miembro del proyecto.
router.get("/:workOrderId/inspections", authMiddleware, listarInspeccionesDeOtController);

// Mantenimiento (#61; PR-020; migración 031).
// Cambiar el Inspector revisor: solo el Usuario municipal.
router.patch("/:workOrderId/revisor", authMiddleware, cambiarRevisorController);
// Ejecuciones: historial (todos los miembros) y registro con fotos (Encargado responsable).
router.get("/:workOrderId/ejecuciones", authMiddleware, listarEjecucionesController);
router.post("/:workOrderId/ejecuciones", authMiddleware, subirFotosEjecucion, registrarEjecucionController);
// Revisión de una ejecución: solo el Inspector revisor asignado.
router.patch("/:workOrderId/ejecuciones/:recordId/revision", authMiddleware, revisarEjecucionController);

export default router;
