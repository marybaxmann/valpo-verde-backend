import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { inventarioQuerySchema } from "../../schemas/sivu/inventario.schema";
import { listarInventario } from "../../services/sivu/inventory.service";
import { obtenerFichaArbol } from "../../services/sivu/fichaArbol.service";
import { buscarArbolesCercanos } from "../../services/sivu/arbolesCercanos.service";
import { coordenadaUtmEste, coordenadaUtmNorte } from "../../schemas/sivu/common.schema";
import { z } from "zod";

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

/** GET /api/sivu/projects/:id/trees/:treeId — ficha del árbol (B2). */
export async function fichaArbolController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = z.object({ id: z.string().uuid("id de proyecto inválido"), treeId: z.string().uuid("id de árbol inválido") }).safeParse(req.params);
    if (!params.success) {
      throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }
    res.json({ data: await obtenerFichaArbol(req.user!, params.data.id, params.data.treeId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/**
 * Coordenada UTM 19S (mismos rangos que el alta, D-9/D-10) y radio en
 * metros. El tope de 1000 m y de 50 resultados es una protección técnica
 * de la consulta, no una regla metodológica (el radio lo elige el frontend).
 */
const cercanosQuerySchema = z
  .object({
    utm_este: z.coerce.number().pipe(coordenadaUtmEste),
    utm_norte: z.coerce.number().pipe(coordenadaUtmNorte),
    radio_m: z.coerce.number().positive("radio_m debe ser mayor que 0").max(1000, "radio_m admite hasta 1000 m"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

/** GET /api/sivu/projects/:id/nearby-trees — árboles cercanos (CC-052). */
export async function arbolesCercanosController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    const query = cercanosQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(query.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    res.json({ data: await buscarArbolesCercanos(req.user!, params.data.id, query.data, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}
