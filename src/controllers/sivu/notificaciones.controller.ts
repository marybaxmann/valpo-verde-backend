import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { listarNotificaciones, marcarLeida } from "../../services/sivu/notificaciones.service";

const listarQuerySchema = z
  .object({
    solo_no_leidas: z
      .enum(["true", "false"], { errorMap: () => ({ message: "solo_no_leidas debe ser true o false" }) })
      .transform((v) => v === "true")
      .default("false"),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

const idParamSchema = z.object({ id: z.string().uuid("id de aviso inválido") });

/** GET /api/sivu/notificaciones (CC-051, #63). */
export async function listarNotificacionesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = listarQuerySchema.safeParse(req.query);
    if (!q.success) throw new AppError(q.error.issues[0]?.message ?? "Query inválida", 400);
    res.json(await listarNotificaciones(req.user!, q.data, req.accessToken!));
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/notificaciones/:id/leida (CC-051). */
export async function marcarLeidaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const p = idParamSchema.safeParse(req.params);
    if (!p.success) throw new AppError(p.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    res.json({ data: await marcarLeida(req.user!, p.data.id, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}
