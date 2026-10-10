import { Router } from "express";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import treeRoutes from "./tree.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getCatalogs } from "../controllers/moduleRecords.controller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/trees", treeRoutes);
router.get("/catalogs/modules", authMiddleware, getCatalogs);

// Próximas rutas (Etapa 4, siguientes iteraciones — no implementadas aún):
//   router.use("/inspections", inspectionRoutes);
//   router.use("/incidents", incidentRoutes);
//   router.use("/maintenance", maintenanceRoutes);
//   router.use("/infrastructure-conflicts", infrastructureRoutes);
//   router.use("/dashboard", dashboardRoutes);

export default router;
