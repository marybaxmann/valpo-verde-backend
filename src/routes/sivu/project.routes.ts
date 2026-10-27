import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  cambiarEstadoProyectoController,
  crearProyecto,
  editarProyectoController,
  getProyecto,
  listProyectos,
  previsualizarSectorController,
} from "../../controllers/sivu/project.controller";
import {
  addMiembro,
  listMiembros,
  removeMiembro,
} from "../../controllers/sivu/projectMember.controller";
import { altaMunicipalArbolController } from "../../controllers/sivu/tree.controller";
import { listarInventarioController } from "../../controllers/sivu/inventory.controller";
import { crearOrdenTrabajoInspeccionController, listarOtsProyectoController } from "../../controllers/sivu/workOrder.controller";
import {
  buscarEspeciesController,
  completarEspecieController,
  renombrarEspecieController,
} from "../../controllers/sivu/species.controller";

import { inspectionFormSchemaController } from "../../controllers/sivu/inspectionFormSchema.controller";

const router = Router();

// Autenticación para todas las rutas; la autorización fina (admin vs.
// resto de roles, membresía) vive en authorization.service.ts, invocada
// desde los services (mismo patrón que project.routes.ts, sin subcarpeta).
router.get("/", authMiddleware, listProyectos);
router.post("/", authMiddleware, crearProyecto);
// Vista previa del sector (D-255; CC-047): no guarda nada. Antes de
// "/:id" para que no se lea "sector-preview" como un id.
router.post("/sector-preview", authMiddleware, previsualizarSectorController);
router.get("/:id/inspection-form-schema", authMiddleware, inspectionFormSchemaController);
router.get("/:id", authMiddleware, getProyecto);
router.patch("/:id", authMiddleware, editarProyectoController);
router.patch("/:id/estado", authMiddleware, cambiarEstadoProyectoController);

router.get("/:id/members", authMiddleware, listMiembros);
router.post("/:id/members", authMiddleware, addMiembro);
router.delete("/:id/members/:userId", authMiddleware, removeMiembro);

// Alta municipal mínima del árbol (#57). Solo usuario_municipal; el
// sector lo resuelve el servidor desde el proyecto (nunca del body).
router.post("/:id/trees", authMiddleware, altaMunicipalArbolController);
// Inventario arboreo (B1; CC-064): todos los miembros activos, solo lectura.
// RLS de la 017 actua como segunda capa (PR-018 v6.0).
router.get("/:id/trees", authMiddleware, listarInventarioController);
// Crear una OT de Inspección (#58; D-238, D-244, CC-036). Solo usuario_municipal.
router.post("/:id/work-orders", authMiddleware, crearOrdenTrabajoInspeccionController);
// OT del proyecto (B3; CC-061, CC-065): visibilidad por rol y tipo de OT.
router.get("/:id/work-orders", authMiddleware, listarOtsProyectoController);

// Catálogo de especies incorporado por el Inspector (#73; CC-053).
// Búsqueda: cualquier rol con acceso al proyecto. Completar/corregir:
// solo el Inspector (la autorización fina vive en species.service.ts).
router.get("/:id/species", authMiddleware, buscarEspeciesController);
router.patch("/:id/species/:speciesId", authMiddleware, completarEspecieController);
router.patch("/:id/species/:speciesId/nombre", authMiddleware, renombrarEspecieController);

export default router;
