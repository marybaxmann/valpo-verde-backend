import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { inventarioQuerySchema } from "../../schemas/sivu/inventario.schema";
import { listarInventario } from "../../services/sivu/inventory.service";

/**
 * GET /api/sivu/projects/:id/trees — Inventario arbóreo del proyecto (B1).
 *
 * Permisos: todos los miembros activos del proyecto (CC-064 decisión a).
 * La autorización fina (membresía activa) vive en inventory.service.ts /
 * authorization.service.ts, no aquí.
 */
export async function listarInventarioController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Parámetros inválidos",
        400
      );
    }

    const parsedQuery = inventarioQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      throw new AppError(
        parsedQuery.error.issues[0]?.message ?? "Query inválida",
        400
      );
    }

    const resultado = await listarInventario(
      req.user!,
      parsedParams.data.id,
      parsedQuery.data,
      req.accessToken!
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}
