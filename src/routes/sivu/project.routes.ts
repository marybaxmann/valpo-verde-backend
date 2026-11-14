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
  listarUsuariosDisponiblesController,
  removeMiembro,
} from "../../controllers/sivu/projectMember.controller";
import { altaMunicipalArbolController } from "../../controllers/sivu/tree.controller";
import { arbolesCercanosController, fichaArbolController, listarInventarioController } from "../../controllers/sivu/inventory.controller";
import { crearOrdenTrabajoInspeccionController, listarOtsProyectoController } from "../../controllers/sivu/workOrder.controller";
import {
  buscarEspeciesController,
  completarEspecieController,
  renombrarEspecieController,
} from "../../controllers/sivu/species.controller";

import { indicadoresController } from "../../controllers/sivu/indicadores.controller";
import { infraestructuraController } from "../../controllers/sivu/infraestructura.controller";
import { inspectionFormSchemaController } from "../../controllers/sivu/inspectionFormSchema.controller";
import { crearOtMantenimientoController } from "../../controllers/sivu/mantenimiento.controller";
import { listarDiagnosticosController, listarMiembrosAsignablesController, proximasInspeccionesController, resumenProyectoController } from "../../controllers/sivu/diagnostico.controller";
import {
  detalleIncidenciaController,
  listarIncidenciasController,
  placasQrController,
  qrArbolController,
  revisarIncidenciaController,
} from "../../controllers/sivu/conecta.controller";

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
// Usuarios que aún no son miembros, para agregarlos (B11). Solo el Administrador.
router.get("/:id/available-users", authMiddleware, listarUsuariosDisponiblesController);

// Alta municipal mínima del árbol (#57). Solo usuario_municipal; el
// sector lo resuelve el servidor desde el proyecto (nunca del body).
router.post("/:id/trees", authMiddleware, altaMunicipalArbolController);
// Inventario arboreo (B1; CC-064): todos los miembros activos, solo lectura.
// RLS de la 017 actua como segunda capa (PR-018 v6.0).
router.get("/:id/trees", authMiddleware, listarInventarioController);
// Ficha del árbol (B2): todos los miembros activos y el Administrador.
router.get("/:id/trees/:treeId", authMiddleware, fichaArbolController);
// Árboles cercanos a una coordenada UTM, para no duplicar en un Levantamiento (CC-052).
router.get("/:id/nearby-trees", authMiddleware, arbolesCercanosController);
// Crear una OT de Inspección (#58; D-238, D-244, CC-036). Solo usuario_municipal.
router.post("/:id/work-orders", authMiddleware, crearOrdenTrabajoInspeccionController);
// Crear una OT de Mantenimiento (#61; D-233 a D-246; PR-020). Solo usuario_municipal.
router.post("/:id/work-orders/mantenimiento", authMiddleware, crearOtMantenimientoController);
// OT del proyecto (B3; CC-061, CC-065): visibilidad por rol y tipo de OT.
router.get("/:id/work-orders", authMiddleware, listarOtsProyectoController);
// Miembros asignables como responsables (B14; fn_miembros_proyecto, 024).
router.get("/:id/assignable-members", authMiddleware, listarMiembrosAsignablesController);
// Diagnóstico finalizado por árbol (B18 mínimo): nunca se presenta como vigente.
router.get("/:id/diagnosticos", authMiddleware, listarDiagnosticosController);
// Resumen del proyecto para el Dashboard (B7).
router.get("/:id/resumen", authMiddleware, resumenProyectoController);
// B19: indicadores del inventario (hoja INDICES; CC-016). Miembros y Administrador.
router.get("/:id/indicadores", authMiddleware, indicadoresController);
// B8: infraestructura (M04 de la evaluación vigente; solo lectura). Miembros y Administrador.
router.get("/:id/infraestructura", authMiddleware, infraestructuraController);
// Próximas inspecciones y monitoreos (B5; CC-037): recordatorios, no agenda.
router.get("/:id/upcoming-inspections", authMiddleware, proximasInspeccionesController);

// Catálogo de especies incorporado por el Inspector (#73; CC-053).
// Búsqueda: cualquier rol con acceso al proyecto. Completar/corregir:
// solo el Inspector (la autorización fina vive en species.service.ts).
router.get("/:id/species", authMiddleware, buscarEspeciesController);
router.patch("/:id/species/:speciesId", authMiddleware, completarEspecieController);
router.patch("/:id/species/:speciesId/nombre", authMiddleware, renombrarEspecieController);

// Valpo Verde Conecta, parte interna (#62; CC-036, CC-062). Incidencias:
// todos los miembros; nombre y RUT, revisión y placas: solo el Usuario municipal.
router.get("/:id/incidencias", authMiddleware, listarIncidenciasController);
router.get("/:id/incidencias/:incidentId", authMiddleware, detalleIncidenciaController);
router.patch("/:id/incidencias/:incidentId/revision", authMiddleware, revisarIncidenciaController);
router.get("/:id/placas-qr", authMiddleware, placasQrController);
// QR de un árbol en SVG o STL, para modelar o imprimir en 3D: solo el Usuario municipal.
router.get("/:id/trees/:treeId/qr", authMiddleware, qrArbolController);

export default router;
