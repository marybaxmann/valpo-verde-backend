import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { fotoInspeccionParamSchema, inspectionIdParamSchema, subirFotoInspeccionSchema } from "../../schemas/sivu/fotos.schema";
import { eliminarFotoInspeccion, listarFotosInspeccion, subirFotoInspeccion } from "../../services/sivu/photo.service";

/** POST /api/sivu/inspections/:inspectionId/photos (CC-049) */
export async function subirFotoInspeccionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = inspectionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = subirFotoInspeccionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    if (!req.file) {
      throw new AppError("Falta el archivo de la foto (campo 'foto')", 400);
    }

    const data = await subirFotoInspeccion(
      req.user!,
      parsedParams.data.inspectionId,
      parsedBody.data,
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      req.accessToken!
    );
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/inspections/:inspectionId/photos (CC-049) */
export async function listarFotosInspeccionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = inspectionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const data = await listarFotosInspeccion(req.user!, parsedParams.data.inspectionId, req.accessToken!);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/sivu/inspections/:inspectionId/photos/:photoId (solo en Preguardado) */
export async function eliminarFotoInspeccionController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = fotoInspeccionParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    await eliminarFotoInspeccion(req.user!, parsedParams.data.inspectionId, parsedParams.data.photoId, req.accessToken!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
