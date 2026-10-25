import rateLimit from "express-rate-limit";

/**
 * Límite de envíos del formulario ciudadano de incidencias (CC-049
 * punto 7; PR-022 v1.0): 10 reportes por hora por IP, decisión exacta
 * de la responsable (2026-10-25).
 *
 * Sin usar todavía: el endpoint público de incidencias (PR-022) no
 * existe en este backend — se implementa con el #62. Queda listo para
 * que esa ruta lo adjunte (`router.post("/incidents", limitarFormularioPublico, ...)`),
 * igual que `fn_resolve_or_create_species` quedó lista para el #59 sin
 * llamador todavía.
 */
export const limitarFormularioPublico = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados reportes desde esta red en la última hora. Intenta de nuevo más tarde." },
});
