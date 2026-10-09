import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../utils/AppError";
import { projectIdParamSchema } from "../schemas/project.schema";
import { createTreeSchema, treeIdParamSchema, updateTreeSchema } from "../schemas/tree.schema";
import {
  createTreeForUser,
  getTreeDetailForUser,
  listProjectTreesForUser,
  listTreeMeasurementsForUser,
  updateTreeForUser,
} from "../services/tree.service";

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

/**
 * POST /api/projects/:id/trees (o /api/projects/:projectId/trees)
 *
 * Alta atómica de árbol y medición dendrométrica inicial (PR-006 v7.0, ADR-016).
 * Responde 201 `{ data: TreeDetailDTO }`.
 */
export async function createTree(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawProjectId = req.params.projectId ?? req.params.id;
    const parsedProjectId = z.string().uuid("id de proyecto inválido").safeParse(rawProjectId);
    if (!parsedProjectId.success) {
      throw new AppError(
        parsedProjectId.error.issues[0]?.message ?? "id de proyecto inválido",
        400
      );
    }

    const parsedBody = createTreeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(
        parsedBody.error.issues[0]?.message ?? "Datos de árbol inválidos",
        400
      );
    }

    const result = await createTreeForUser(
      req.user!,
      parsedProjectId.data,
      parsedBody.data,
      req.accessToken!
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trees/:treeId (o :id)
 *
 * Obtiene la ficha completa de un árbol con su medición actual resuelta.
 * Responde 200 `{ data: TreeDetailDTO }`.
 */
export async function getTreeDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = treeIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Identificador de árbol inválido",
        400
      );
    }

    const treeId = parsedParams.data.treeId ?? parsedParams.data.id!;
    const result = await getTreeDetailForUser(
      req.user!,
      treeId,
      req.accessToken!
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/trees/:treeId (o :id)
 *
 * Edita identidad del árbol: especie, dirección, comuna, lugar de
 * referencia. Nunca medición dendrométrica ni ciclo de vida.
 * Responde 200 `{ data: TreeDetailDTO }`.
 */
export async function updateTree(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = treeIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Identificador de árbol inválido",
        400
      );
    }

    const parsedBody = updateTreeSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(
        parsedBody.error.issues[0]?.message ?? "Datos de edición inválidos",
        400
      );
    }

    const treeId = parsedParams.data.treeId ?? parsedParams.data.id!;
    const result = await updateTreeForUser(req.user!, treeId, parsedBody.data, req.accessToken!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trees/:treeId/measurements (o :id/measurements)
 *
 * Obtiene el historial de mediciones de un árbol.
 * Soporta query param opcional ?include_anuladas=true
 * Responde 200 `{ data: TreeMeasurementRow[], meta: { total: number } }`.
 */
export async function listTreeMeasurements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsedParams = treeIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(
        parsedParams.error.issues[0]?.message ?? "Identificador de árbol inválido",
        400
      );
    }

    const treeId = parsedParams.data.treeId ?? parsedParams.data.id!;
    const includeAnuladas = req.query.include_anuladas === "true";

    const result = await listTreeMeasurementsForUser(
      req.user!,
      treeId,
      req.accessToken!,
      includeAnuladas
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
