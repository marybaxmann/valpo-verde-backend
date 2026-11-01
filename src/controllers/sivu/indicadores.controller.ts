import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { indicadoresInventario } from "../../services/sivu/indicadores.service";

/** Ámbito opcional: un barrio (ARBOLES.sector, D-7), tal como aparece en `barrios`. */
export const indicadoresQuerySchema = z
  .object({
    barrio: z.string({ invalid_type_error: "barrio debe ser texto" }).trim().min(1, "barrio no puede estar vacío").max(200).optional(),
  })
  .strict();

/** GET /api/sivu/projects/:id/indicadores (B19; hoja INDICES; CC-016). */
export async function indicadoresController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    const query = indicadoresQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(query.error.issues[0]?.message ?? "Query inválida", 400);
    res.json({ data: await indicadoresInventario(req.user!, params.data.id, query.data.barrio, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}
