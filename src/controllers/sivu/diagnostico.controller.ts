import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { catalogosVigentes, listarDiagnosticos, listarMiembrosAsignables, resumenProyecto } from "../../services/sivu/diagnostico.service";

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
