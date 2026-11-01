import rateLimit from "express-rate-limit";

/**
 * Límites de solicitudes de las lecturas públicas de Valpo Verde Conecta
 * (CC-062 punto 7; PR-018 v6.0). El del formulario ciudadano (10/hora)
 * está en publicFormRateLimit.middleware.ts.
 *
 * Almacén en memoria (por defecto de express-rate-limit): en Vercel cada
 * instancia lleva su propio contador y se reinicia al arrancar en frío,
 * así que el límite real es «N por hora por instancia», no una
 * protección global garantizada. Aceptado para la demo (Valej,
 * 2026-11-01, opción C); pendiente: contadores compartidos en
 * PostgreSQL (opción A), con migración sujeta a autorización.
 */

/** Ficha pública por qr_token: 60 por hora por IP (decisión de la responsable, 2026-10-31). */
export const limitarFichaPublica = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas consultas desde esta red en la última hora. Intenta de nuevo más tarde." },
});

/**
 * Catálogo público del formulario ciudadano: 60 por hora por IP, el mismo
 * valor de la ficha (decisión de Valej, 2026-11-01), con contador propio.
 */
export const limitarCatalogoPublico = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas consultas desde esta red en la última hora. Intenta de nuevo más tarde." },
});

/** Seguimiento por código: 30 por hora por IP (CC-062 punto 4). */
export const limitarSeguimiento = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas consultas desde esta red en la última hora. Intenta de nuevo más tarde." },
});
