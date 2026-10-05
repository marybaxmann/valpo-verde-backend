import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { projectIdParamSchema } from "../schemas/project.schema";
import { listProjectTreesForUser } from "../services/tree.service";

/**
 * GET /api/projects/:id/trees
 *
 * Responde `{ data: FeatureCollection, meta }` (ver tree.service.ts).
 */
export async function listProjectTrees(
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

    const result = await listProjectTreesForUser(
      req.user!,
      parsedParams.data.id,
      req.accessToken!
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
