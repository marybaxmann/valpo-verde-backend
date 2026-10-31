import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { subirFotoUnica } from "../../middlewares/upload.middleware";
import {
  calcularInspeccionController,
  finalizarInspeccionController,
  guardarBorradorInspeccionController,
} from "../../controllers/sivu/inspection.controller";
import {
  eliminarFotoInspeccionController,
  listarFotosInspeccionController,
  subirFotoInspeccionController,
} from "../../controllers/sivu/photo.controller";

/** Montado en /api/sivu/inspections (#58). */
import { anularInspeccionController } from "../../controllers/sivu/cierreOt.controller";

const router = Router();

// Guardados siguientes de una inspección en Preguardado (018e/018f).
// Solo el Inspector responsable asignado.
router.patch("/:inspectionId", authMiddleware, guardarBorradorInspeccionController);

// Fotos de la inspección (CC-049; D-27, las 4 vistas obligatorias).
// Subir: solo el Inspector, sin recodificar (su fecha/ubicación son
// evidencia). Listar: cualquier rol con acceso al proyecto.
router.post("/:inspectionId/photos", authMiddleware, subirFotoUnica, subirFotoInspeccionController);
router.get("/:inspectionId/photos", authMiddleware, listarFotosInspeccionController);
// Quitar una foto subida por error: solo el Inspector responsable y solo en Preguardado.
router.delete("/:inspectionId/photos/:photoId", authMiddleware, eliminarFotoInspeccionController);

// Cierre en dos pasos (#59/#72; CC-054): /calcular no escribe nada;
// /finalizar exige la huella de /calcular y, si todo está completo,
// invoca fn_finalizar_inspeccion (020) una sola vez. Solo el Inspector
// responsable asignado.
router.post("/:inspectionId/calcular", authMiddleware, calcularInspeccionController);
router.post("/:inspectionId/finalizar", authMiddleware, finalizarInspeccionController);
// Anular una inspección Finalizada (CC-067; CC-045 a). Solo el Usuario municipal.
router.post("/:inspectionId/anular", authMiddleware, anularInspeccionController);

export default router;
