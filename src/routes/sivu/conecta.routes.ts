import { Router } from "express";
import { limitarCatalogoPublico, limitarFichaPublica, limitarSeguimiento } from "../../middlewares/conectaRateLimit.middleware";
import { limitarFormularioPublico } from "../../middlewares/publicFormRateLimit.middleware";
import { subirFotosReporte } from "../../middlewares/upload.middleware";
import { catalogosPublicosController, fichaPublicaController, reporteCiudadanoController, seguimientoController } from "../../controllers/sivu/conecta.controller";

/**
 * Montado en /api/sivu/conecta (#62; CC-062 / PR-022 v2.0). Público,
 * sin sesión: cada ruta tiene su límite de solicitudes por IP. Las
 * rutas internas (B9, revisión, placas) van en project.routes.ts.
 */
const router = Router();

// Solo tipo_incidencia (D-180); /api/sivu/catalogs sigue con sesión.
router.get("/catalogos", limitarCatalogoPublico, catalogosPublicosController);
router.get("/arboles/:qrToken", limitarFichaPublica, fichaPublicaController);
router.post("/arboles/:qrToken/incidencias", limitarFormularioPublico, subirFotosReporte, reporteCiudadanoController);
router.post("/seguimiento", limitarSeguimiento, seguimientoController);

export default router;
