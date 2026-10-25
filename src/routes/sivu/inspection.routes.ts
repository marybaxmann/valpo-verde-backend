import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { guardarBorradorInspeccionController } from "../../controllers/sivu/inspection.controller";

/** Montado en /api/sivu/inspections (#58). */
const router = Router();

// Guardados siguientes de una inspección en Preguardado (018e/018f).
// Solo el Inspector responsable asignado.
router.patch("/:inspectionId", authMiddleware, guardarBorradorInspeccionController);

export default router;
