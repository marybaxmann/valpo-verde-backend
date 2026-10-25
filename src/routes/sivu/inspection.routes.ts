import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { subirFotoUnica } from "../../middlewares/upload.middleware";
import { guardarBorradorInspeccionController } from "../../controllers/sivu/inspection.controller";
import {
  listarFotosInspeccionController,
  subirFotoInspeccionController,
} from "../../controllers/sivu/photo.controller";

/** Montado en /api/sivu/inspections (#58). */
const router = Router();

// Guardados siguientes de una inspección en Preguardado (018e/018f).
// Solo el Inspector responsable asignado.
router.patch("/:inspectionId", authMiddleware, guardarBorradorInspeccionController);

// Fotos de la inspección (CC-049; D-27, las 4 vistas obligatorias).
// Subir: solo el Inspector, sin recodificar (su fecha/ubicación son
// evidencia). Listar: cualquier rol con acceso al proyecto.
router.post("/:inspectionId/photos", authMiddleware, subirFotoUnica, subirFotoInspeccionController);
router.get("/:inspectionId/photos", authMiddleware, listarFotosInspeccionController);

export default router;
