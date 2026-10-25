import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  crearBorradorInspeccionSchema,
  guardarBorradorInspeccionSchema,
  inspectionIdParamSchema,
} from "../../schemas/sivu/inspeccion.schema";
import { workOrderIdParamSchema } from "../../schemas/sivu/workOrder.schema";
import { crearBorradorInspeccion, guardarBorradorInspeccion } from "../../services/sivu/inspection.service";

/** POST /api/sivu/work-orders/:workOrderId/inspections — primer guardado (#58) */
export async function crearBorradorInspeccionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = workOrderIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = crearBorradorInspeccionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await crearBorradorInspeccion(
      req.user!,
      parsedParams.data.workOrderId,
      parsedBody.data,
      req.accessToken!
    );
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/inspections/:inspectionId — guardados siguientes (#58) */
export async function guardarBorradorInspeccionController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = inspectionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = guardarBorradorInspeccionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await guardarBorradorInspeccion(
      req.user!,
      parsedParams.data.inspectionId,
      parsedBody.data,
      req.accessToken!
    );
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
