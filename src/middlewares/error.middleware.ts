import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

/**
 * Único lugar donde se da forma a la respuesta de error. Los services
 * lanzan AppError con el statusCode correspondiente (401, 403, 404, ...);
 * cualquier otro error no controlado se responde como 500 sin filtrar
 * detalles internos al cliente.
 *
 * Debe registrarse DESPUÉS de todas las rutas en app.ts.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
}
