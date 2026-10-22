import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { proyectoIdParamSchema } from "../../schemas/sivu/proyectos.schema";
import { agregarMiembroSchema, miembroParamsSchema } from "../../schemas/sivu/miembros.schema";
import {
  addProyectoMember,
  listProyectoMembers,
  removeProyectoMember,
} from "../../services/sivu/projectMember.service";

/** GET /api/sivu/projects/:id/members */
export async function listMiembros(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const data = await listProyectoMembers(req.user!, parsedParams.data.id, req.accessToken!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/sivu/projects/:id/members */
export async function addMiembro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = proyectoIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    const parsedBody = agregarMiembroSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await addProyectoMember(
      req.user!,
      parsedParams.data.id,
      parsedBody.data.user_id,
      req.accessToken!
    );
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/sivu/projects/:id/members/:userId */
export async function removeMiembro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = miembroParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }

    await removeProyectoMember(
      req.user!,
      parsedParams.data.id,
      parsedParams.data.userId,
      req.accessToken!
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
