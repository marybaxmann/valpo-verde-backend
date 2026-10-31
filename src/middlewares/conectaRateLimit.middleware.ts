import rateLimit from "express-rate-limit";

/**
 * Límites de solicitudes de las lecturas públicas de Valpo Verde Conecta
 * (CC-062 punto 7; PR-018 v6.0). El del formulario ciudadano (10/hora)
 * está en publicFormRateLimit.middleware.ts.
 */

/** Ficha pública por qr_token: 60 por hora por IP (decisión de la responsable, 2026-10-31). */
export const limitarFichaPublica = rateLimit({
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
