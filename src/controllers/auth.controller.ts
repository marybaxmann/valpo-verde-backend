import { Request, Response } from "express";

/**
 * GET /api/auth/me
 *
 * Requiere authMiddleware. Devuelve el perfil de aplicación del usuario
 * autenticado (ya resuelto y adjuntado a req.user por el middleware),
 * para que el frontend no tenga que combinar por su cuenta datos de
 * Supabase Auth con la tabla user_profiles.
 */
export function getMe(req: Request, res: Response): void {
  res.json({ data: req.user });
}
