import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { workOrderIdParamSchema } from "../../schemas/sivu/workOrder.schema";
import {
  cambiarRevisorSchema,
  crearOtMantenimientoSchema,
  ejecucionParamsSchema,
  registrarEjecucionSchema,
  revisarEjecucionSchema,
  revisionesQuerySchema,
} from "../../schemas/sivu/mantenimiento.schema";
import {
  cambiarRevisor,
  crearOrdenMantenimiento,
  listarEjecucionesDeOt,
  listarRevisiones,
  registrarEjecucionMantenimiento,
  revisarEjecucionMantenimiento,
} from "../../services/sivu/mantenimiento.service";

const primerMensaje = (r: { error: { issues: Array<{ message: string }> } }) => r.error.issues[0]?.message ?? "Datos inválidos";

function otId(req: Request): string {
  const p = workOrderIdParamSchema.safeParse(req.params);
  if (!p.success) throw new AppError(primerMensaje(p), 400);
  return p.data.workOrderId;
}

/** POST /api/sivu/projects/:id/work-orders/mantenimiento */
export async function crearOtMantenimientoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    const body = crearOtMantenimientoSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    res.status(201).json({ data: await crearOrdenMantenimiento(req.user!, params.data.id, body.data, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/revisor */
export async function cambiarRevisorController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = otId(req);
    const body = cambiarRevisorSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    res.json({ data: await cambiarRevisor(req.user!, id, body.data.inspector_revisor_id, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/work-orders/:workOrderId/ejecuciones */
export async function listarEjecucionesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await listarEjecucionesDeOt(req.user!, otId(req), req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/work-orders/:workOrderId/ejecuciones (multipart) */
export async function registrarEjecucionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = otId(req);
    const body = registrarEjecucionSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    const archivos = ((req.files as Express.Multer.File[] | undefined) ?? []).map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
    res.status(201).json({ data: await registrarEjecucionMantenimiento(req.user!, id, body.data, archivos, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/ejecuciones/:recordId/revision */
export async function revisarEjecucionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = ejecucionParamsSchema.safeParse(req.params);
    if (!params.success) throw new AppError(primerMensaje(params), 400);
    const body = revisarEjecucionSchema.safeParse(req.body);
    if (!body.success) throw new AppError(primerMensaje(body), 400);
    res.json({ data: await revisarEjecucionMantenimiento(req.user!, params.data.workOrderId, params.data.recordId, body.data, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/work-orders/revisiones?project_id=&solo_pendientes= */
export async function listarRevisionesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = revisionesQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(primerMensaje(query), 400);
    res.json({
      data: await listarRevisiones(req.user!, { projectId: query.data.project_id, soloPendientes: query.data.solo_pendientes === "true" }, req.accessToken!),
    });
  } catch (err) {
    next(err);
  }
}
