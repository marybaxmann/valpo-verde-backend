import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getTreeDetail,
  listTreeMeasurements,
  updateTree,
} from "../controllers/tree.controller";
import {
  createRiskAssessment,
  getLatestRiskAssessment,
  listRiskAssessments,
} from "../controllers/treeRiskAssessment.controller";
import {
  createInfrastructureAssessment,
  listTreeInfrastructureAssessments,
} from "../controllers/moduleRecords.controller";

const router = Router();

// GET /api/trees/:treeId (o :id)
router.get("/:treeId", authMiddleware, getTreeDetail);

// PATCH /api/trees/:treeId (o :id) — edita identidad del árbol
router.patch("/:treeId", authMiddleware, updateTree);

// GET /api/trees/:treeId/measurements (o :id/measurements)
router.get("/:treeId/measurements", authMiddleware, listTreeMeasurements);

// Evaluación técnica y riesgo (R01–R04/M01–M03; corte vertical mínimo)
router.post("/:treeId/risk-assessments", authMiddleware, createRiskAssessment);
router.get("/:treeId/risk-assessments", authMiddleware, listRiskAssessments);
router.get("/:treeId/risk-assessments/latest", authMiddleware, getLatestRiskAssessment);

// Infraestructura — datos crudos por componente (sin M04; corte demo)
router.post("/:treeId/infrastructure-assessments", authMiddleware, createInfrastructureAssessment);
router.get("/:treeId/infrastructure-assessments", authMiddleware, listTreeInfrastructureAssessments);

export default router;
