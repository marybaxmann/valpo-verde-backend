import { NextFunction, Request, Response } from "express";
import { resolveAuthenticatedUser } from "../services/auth.service";
import { AppError } from "../utils/AppError";

/**
 * Exige un header `Authorization: Bearer <token>` con un JWT válido de
 * Supabase Auth. Si es válido, adjunta el perfil de aplicación en
 * `req.user` y continúa. Cualquier fallo se delega a error.middleware.ts
 * mediante next(err), para mantener un único lugar donde se da forma a
 * la respuesta de error.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No autenticado", 401);
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      throw new AppError("No autenticado", 401);
    }

    req.user = await resolveAuthenticatedUser(token);
    next();
  } catch (err) {
    next(err);
  }
}
