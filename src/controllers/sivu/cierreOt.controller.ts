import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import {
  anularInspeccionSchema,
  cancelarOrdenTrabajoSchema,
  reasignarOrdenTrabajoSchema,
  workOrderIdParamSchema,
} from "../../schemas/sivu/workOrder.schema";
import {
  anularInspeccionFinalizada,
  cancelarOrdenTrabajo,
  completarOrdenTrabajo,
  reasignarOrdenTrabajo,
} from "../../services/sivu/cierreOt.service";
import { listarInspeccionesDeOrdenTrabajo } from "../../services/sivu/borradorOt.service";

function parsear<T>(schema: z.ZodType<T>, valor: unknown, mensaje: string): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? mensaje, 400);
  return r.data;
}

/** POST /api/sivu/work-orders/:workOrderId/completar (#60; CC-050; ADR-017 v1.2). */
export async function completarOrdenTrabajoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workOrderId } = parsear(workOrderIdParamSchema, req.params, "Parámetros inválidos");
    parsear(z.object({}).strict(), req.body ?? {}, "Este endpoint no recibe datos: la fecha la asigna el Sistema (D-242)");
    res.status(200).json({ data: await completarOrdenTrabajo(req.user!, workOrderId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/work-orders/:workOrderId/cancelar (CC-050). */
export async function cancelarOrdenTrabajoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workOrderId } = parsear(workOrderIdParamSchema, req.params, "Parámetros inválidos");
    const { motivo_cancelacion } = parsear(cancelarOrdenTrabajoSchema, req.body, "Datos inválidos");
    res.status(200).json({ data: await cancelarOrdenTrabajo(req.user!, workOrderId, motivo_cancelacion, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/responsable (CC-050; D-244). */
export async function reasignarOrdenTrabajoController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workOrderId } = parsear(workOrderIdParamSchema, req.params, "Parámetros inválidos");
    const { responsable_accion_id } = parsear(reasignarOrdenTrabajoSchema, req.body, "Datos inválidos");
    res.status(200).json({ data: await reasignarOrdenTrabajo(req.user!, workOrderId, responsable_accion_id, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/work-orders/:workOrderId/inspections (B17): retomar o consultar el borrador. */
export async function listarInspeccionesDeOtController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workOrderId } = parsear(workOrderIdParamSchema, req.params, "Parámetros inválidos");
    res.status(200).json({ data: await listarInspeccionesDeOrdenTrabajo(req.user!, workOrderId, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}

const inspectionIdParamSchema = z.object({ inspectionId: z.string().uuid("inspectionId inválido") });

/** POST /api/sivu/inspections/:inspectionId/anular (CC-067). Solo el Usuario municipal. */
export async function anularInspeccionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { inspectionId } = parsear(inspectionIdParamSchema, req.params, "Parámetros inválidos");
    const { motivo_anulacion } = parsear(anularInspeccionSchema, req.body, "Datos inválidos");
    res.status(200).json({ data: await anularInspeccionFinalizada(req.user!, inspectionId, motivo_anulacion, req.accessToken!) });
  } catch (err) {
    next(err);
  }
}
