import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { altaMunicipalArbolSchema } from "../../schemas/sivu/arboles.schema";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { altaMunicipalArbol } from "../../services/sivu/tree.service";

/** POST /api/sivu/projects/:id/trees — alta municipal mínima (#57) */
export async function altaMunicipalArbolController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = altaMunicipalArbolSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await altaMunicipalArbol(req.user!, parsedParams.data.id, parsedBody.data, req.accessToken!);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}
