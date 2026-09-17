import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { projectIdParamSchema } from "../schemas/project.schema";
import {
  addProjectMemberSchema,
  projectMemberParamsSchema,
} from "../schemas/projectMember.schema";
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
} from "../services/projectMember.service";

/**
 * GET /api/projects/:id/members
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = projectIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Parámetros inválidos",
        400
      );
    }

    const data = await listProjectMembers(
      req.user!,
      parsedParams.data.id,
      req.accessToken!
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:id/members
 */
export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = projectIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Parámetros inválidos",
        400
      );
    }

    const parsedBody = addProjectMemberSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(
        parsedBody.error.issues[0]?.message ?? "Datos inválidos",
        400
      );
    }

    const data = await addProjectMember(
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

/**
 * DELETE /api/projects/:id/members/:userId
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = projectMemberParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Parámetros inválidos",
        400
      );
    }

    await removeProjectMember(
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
