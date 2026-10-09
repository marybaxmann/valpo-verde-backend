import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  createProject,
  getProjectById,
  listProjects,
} from "../controllers/project.controller";
import {
  addMember,
  listMembers,
  removeMember,
} from "../controllers/projectMember.controller";
import {
  createTree,
  listProjectTrees,
} from "../controllers/tree.controller";
import { getProjectRiskSummary } from "../controllers/treeRiskAssessment.controller";
import {
  createIncident,
  createMaintenanceOrder,
  listProjectIncidents,
  listProjectInfrastructureAssessments,
  listProjectMaintenance,
  getProjectIndices,
  updateIncidentState,
  updateMaintenanceState,
} from "../controllers/moduleRecords.controller";

const router = Router();

// Todas las rutas de proyectos requieren autenticación. La autorización
// fina (admin vs. usuario_municipal, membresía) vive en
// authorization.service.ts, invocada desde los services.
router.get("/", authMiddleware, listProjects);
router.post("/", authMiddleware, createProject);
router.get("/:id", authMiddleware, getProjectById);

router.get("/:id/members", authMiddleware, listMembers);
router.post("/:id/members", authMiddleware, addMember);
router.delete("/:id/members/:userId", authMiddleware, removeMember);

router.get("/:id/trees", authMiddleware, listProjectTrees);
router.post("/:id/trees", authMiddleware, createTree);

router.get("/:id/risk-assessments/latest", authMiddleware, getProjectRiskSummary);

// Corte demo: infraestructura (lectura), órdenes de trabajo e incidencias
router.get("/:id/infrastructure-assessments", authMiddleware, listProjectInfrastructureAssessments);
router.get("/:id/maintenance", authMiddleware, listProjectMaintenance);
router.post("/:id/maintenance", authMiddleware, createMaintenanceOrder);
router.get("/:id/incidents", authMiddleware, listProjectIncidents);
router.post("/:id/incidents", authMiddleware, createIncident);
router.get("/:id/indices", authMiddleware, getProjectIndices);
router.patch("/:id/maintenance/:recordId/estado", authMiddleware, updateMaintenanceState);
router.patch("/:id/incidents/:recordId/estado", authMiddleware, updateIncidentState);

export default router;
