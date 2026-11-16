import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { contextoActual } from "../utils/contextoPeticion";

export const MENSAJE_TIEMPO_AGOTADO_BD = "La base de datos no respondió a tiempo. Intenta de nuevo en unos minutos.";

/**
 * Único lugar donde se da forma a la respuesta de error. Los services
 * lanzan AppError con el statusCode correspondiente (401, 403, 404, ...);
 * cualquier otro error no controlado se responde como 500 sin filtrar
 * detalles internos al cliente.
 *
 * - Si alguna llamada a Supabase de la petición agotó su tiempo máximo
 *   (PA-29), se responde 504, aunque el service haya traducido el fallo
 *   a otro error (por ejemplo, el 401 de un `getUser` que no respondió).
 * - Las respuestas 5xx llevan el `request_id` (PA-38), para encontrar la
 *   línea del registro cuando alguien reporta el fallo.
 *
 * Debe registrarse DESPUÉS de todas las rutas en app.ts.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const requestId: string | undefined = res.locals.requestId;

  if (contextoActual()?.tiempoAgotadoBd) {
    console.error(`[${requestId}] Tiempo máximo de la base agotado:`, err);
    res.status(504).json({ error: MENSAJE_TIEMPO_AGOTADO_BD, request_id: requestId });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`[${requestId}] ${err.statusCode}:`, err.message);
      res.status(err.statusCode).json({ error: err.message, request_id: requestId });
      return;
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(`[${requestId}] Error no controlado:`, err);
  res.status(500).json({ error: "Error interno del servidor", request_id: requestId });
}
