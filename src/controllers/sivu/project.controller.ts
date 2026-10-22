import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import {
  cambiarEstadoProyectoSchema,
  crearProyectoConSectorSchema,
  editarProyectoSchema,
  proyectoIdParamSchema,
} from "../../schemas/sivu/proyectos.schema";
import {
  cambiarEstadoProyecto,
  crearProyectoConSector,
  editarProyecto,
  getProyectoByIdForUser,
  listProyectosForUser,
} from "../../services/sivu/project.service";

/** GET /api/sivu/projects */
export async function listProyectos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listProyectosForUser(req.user!, req.accessToken!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/sivu/projects/:id */
export async function getProyecto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const data = await getProyectoByIdForUser(req.user!, parsedParams.data.id, req.accessToken!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/projects */
export async function crearProyecto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = crearProyectoConSectorSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await crearProyectoConSector(req.user!, parsedBody.data);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/projects/:id */
export async function editarProyectoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = editarProyectoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    await editarProyecto(req.user!, parsedParams.data.id, parsedBody.data, req.accessToken!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/sivu/projects/:id/estado */
export async function cambiarEstadoProyectoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = cambiarEstadoProyectoSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await cambiarEstadoProyecto(req.user!, parsedParams.data.id, parsedBody.data);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
