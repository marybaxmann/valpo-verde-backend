import { NextFunction, Request, Response } from "express";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { AppError } from "../../utils/AppError";
import { obtenerInspectionFormSchema } from "../../services/sivu/inspectionFormSchema.service";

export async function inspectionFormSchemaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = proyectoIdParamSchema.safeParse(req.params);
    if (!params.success) throw new AppError(params.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    if (req.query.tipo !== "evaluacion_inicial" || Object.keys(req.query).some(k => k !== "tipo")) {
      throw new AppError("tipo debe ser evaluacion_inicial", 400);
    }
    const data = await obtenerInspectionFormSchema(req.user!, params.data.id, req.accessToken!);
    res.status(200).json({ data });
  } catch (err) { next(err); }
}
