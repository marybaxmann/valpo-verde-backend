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

const router = Router();

// Autenticación para todas las rutas; la autorización fina (admin vs.
// resto de roles, membresía) vive en authorization.service.ts, invocada
// desde los services (mismo patrón que project.routes.ts, sin subcarpeta).
router.get("/", authMiddleware, listProyectos);
router.post("/", authMiddleware, crearProyecto);
// Vista previa del sector (D-255; CC-047): no guarda nada. Antes de
// "/:id" para que no se lea "sector-preview" como un id.
router.post("/sector-preview", authMiddleware, previsualizarSectorController);
router.get("/:id", authMiddleware, getProyecto);
router.patch("/:id", authMiddleware, editarProyectoController);
router.patch("/:id/estado", authMiddleware, cambiarEstadoProyectoController);

router.get("/:id/members", authMiddleware, listMiembros);
router.post("/:id/members", authMiddleware, addMiembro);
router.delete("/:id/members/:userId", authMiddleware, removeMiembro);

// Alta municipal mínima del árbol (#57). Solo usuario_municipal; el
// sector lo resuelve el servidor desde el proyecto (nunca del body).
router.post("/:id/trees", authMiddleware, altaMunicipalArbolController);

export default router;
