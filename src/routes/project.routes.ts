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

export default router;
