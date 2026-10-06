import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getTreeDetail,
  listTreeMeasurements,
} from "../controllers/tree.controller";

const router = Router();

// GET /api/trees/:treeId (o :id)
router.get("/:treeId", authMiddleware, getTreeDetail);

// GET /api/trees/:treeId/measurements (o :id/measurements)
router.get("/:treeId/measurements", authMiddleware, listTreeMeasurements);

export default router;
