import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { entradasVigentesDe } from "../../services/rules/engine/catalogs";
import { infraestructuraProyecto } from "../../services/sivu/infraestructura.service";

const codigos = (catalogo: string) => entradasVigentesDe(catalogo).map((c) => c.codigo) as [string, ...string[]];

export const infraestructuraQuerySchema = z
  .object({
    barrio: z.string({ invalid_type_error: "barrio debe ser texto" }).trim().min(1, "barrio no puede estar vacío").max(200).optional(),
    clasificacion: z
      .enum(codigos("clasificacion_infraestructura"), { errorMap: () => ({ message: "clasificacion no es un valor de la lista (D-170)" }) })
      .optional(),
    componente: z
      .enum(codigos("componente_infraestructura"), { errorMap: () => ({ message: "componente no es un componente de M04" }) })
      .optional(),
    categoria: z
      .enum(codigos("categoria_infraestructura"), { errorMap: () => ({ message: "categoria no es un valor de la lista" }) })
      .optional(),
  })
  .strict()
  .refine((q) => (q.componente === undefined) === (q.categoria === undefined), {
    message: "componente y categoria van juntos",
  });

/** GET /api/sivu/projects/:id/infraestructura (B8). */
export async function infraestructuraController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    const query = infraestructuraQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(query.error.issues[0]?.message ?? "Query inválida", 400);
    res.json({ data: await infraestructuraProyecto(req.user!, params.data.id, query.data, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}
