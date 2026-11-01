import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { catalogosVigentes, listarDiagnosticos, listarMiembrosAsignables, resumenProyecto } from "../../services/sivu/diagnostico.service";
import { listarProximasInspecciones } from "../../services/sivu/proximasInspecciones.service";

const diagnosticosQuerySchema = z.object({ tree_id: z.string().uuid().optional() }).strict();
const asignablesQuerySchema = z
  .object({ rol: z.enum(["usuario_municipal", "inspector", "encargado_mantencion", "admin"]).optional() })
  .strict();

function parsear<T>(schema: z.ZodType<T>, valor: unknown, mensaje: string): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? mensaje, 400);
  return r.data;
}

/** GET /api/sivu/projects/:id/diagnosticos (B18 mínimo). */
export async function listarDiagnosticosController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = parsear(proyectoIdParamSchema, req.params, "Parámetros inválidos");
    const { tree_id } = parsear(diagnosticosQuerySchema, req.query, "Query inválida");
    const data = await listarDiagnosticos(req.user!, id, req.accessToken!, tree_id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/projects/:id/resumen (B7). */
export async function resumenProyectoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = parsear(proyectoIdParamSchema, req.params, "Parámetros inválidos");
    const data = await resumenProyecto(req.user!, id, req.accessToken!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/projects/:id/assignable-members (B14). */
export async function listarMiembrosAsignablesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = parsear(proyectoIdParamSchema, req.params, "Parámetros inválidos");
    const { rol } = parsear(asignablesQuerySchema, req.query, "Query inválida");
    const data = await listarMiembrosAsignables(req.user!, id, req.accessToken!, rol);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/catalogs (B15). */
export function listarCatalogosController(_req: Request, res: Response): void {
  res.json({ data: catalogosVigentes() });
}

/** GET /api/sivu/projects/:id/upcoming-inspections?solo_activos= (B5) */
export async function proximasInspeccionesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    const query = z
      .object({ solo_activos: z.enum(["true", "false"], { errorMap: () => ({ message: "solo_activos debe ser true o false" }) }).optional() })
      .strict()
      .safeParse(req.query);
    if (!query.success) throw new AppError(query.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    const data = await listarProximasInspecciones(req.user!, params.data.id, req.accessToken!, { soloActivos: query.data.solo_activos === "true" });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
