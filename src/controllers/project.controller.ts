import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import {
  createProjectSchema,
  projectIdParamSchema,
} from "../schemas/project.schema";
import {
  createProjectForUser,
  getProjectByIdForUser,
  listProjectsForUser,
} from "../services/project.service";

/**
 * GET /api/projects
 */
export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await listProjectsForUser(req.user!);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects
 */
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }

    const data = await createProjectForUser(req.user!, parsed.data);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id
 */
export async function getProjectById(
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

    const data = await getProjectByIdForUser(req.user!, parsedParams.data.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
