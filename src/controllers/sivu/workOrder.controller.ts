import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import {
  crearOrdenTrabajoInspeccionSchema,
  transicionarOrdenTrabajoSchema,
  workOrderIdParamSchema,
} from "../../schemas/sivu/workOrder.schema";
import { crearOrdenTrabajoInspeccion, transicionarOrdenTrabajo } from "../../services/sivu/workOrder.service";

/** POST /api/sivu/projects/:id/work-orders — crear una OT de Inspección (#58) */
export async function crearOrdenTrabajoInspeccionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = crearOrdenTrabajoInspeccionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await crearOrdenTrabajoInspeccion(req.user!, parsedParams.data.id, parsedBody.data, req.accessToken!);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/estado — transición de estado (018g; CC-050) */
export async function transicionarOrdenTrabajoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = workOrderIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = transicionarOrdenTrabajoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await transicionarOrdenTrabajo(
      req.user!,
      parsedParams.data.workOrderId,
      parsedBody.data,
      req.accessToken!
    );
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
