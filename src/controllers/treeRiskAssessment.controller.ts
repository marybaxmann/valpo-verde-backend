import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { treeIdParamSchema } from "../schemas/tree.schema";
import { projectIdParamSchema } from "../schemas/project.schema";
import { createTreeRiskAssessmentSchema } from "../schemas/treeRiskAssessment.schema";
import {
  createTreeRiskAssessmentForUser,
  getLatestTreeRiskAssessmentForUser,
  getProjectRiskSummaryForUser,
  listTreeRiskAssessmentsForUser,
} from "../services/treeRiskAssessment.service";

function resolveTreeId(params: unknown): string {
  const parsed = treeIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Identificador de árbol inválido", 400);
  }
  return parsed.data.treeId ?? parsed.data.id!;
}

/**
 * POST /api/trees/:treeId/risk-assessments
 * Responde 201 `{ data: TreeRiskAssessmentDTO }`.
 */
export async function createRiskAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const treeId = resolveTreeId(req.params);
    const parsedBody = createTreeRiskAssessmentSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw new AppError(parsedBody.error.issues[0]?.message ?? "Datos de evaluación inválidos", 400);
    }
    const result = await createTreeRiskAssessmentForUser(req.user!, treeId, parsedBody.data, req.accessToken!);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trees/:treeId/risk-assessments
 * Responde 200 `{ data: TreeRiskAssessmentDTO[] }`.
 */
export async function listRiskAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const treeId = resolveTreeId(req.params);
    const result = await listTreeRiskAssessmentsForUser(req.user!, treeId, req.accessToken!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trees/:treeId/risk-assessments/latest
 * Responde 200 `{ data: TreeRiskAssessmentDTO | null }`.
 */
export async function getLatestRiskAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const treeId = resolveTreeId(req.params);
    const result = await getLatestTreeRiskAssessmentForUser(req.user!, treeId, req.accessToken!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/risk-assessments/latest
 * Responde 200 `{ data: Record<tree_id, TreeRiskAssessmentDTO> }` — última
 * evaluación vigente de cada árbol del proyecto (para colorear el mapa de
 * Inventario por riesgo sin N+1 consultas).
 */
export async function getProjectRiskSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = projectIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      throw new AppError(parsedParams.error.issues[0]?.message ?? "Parámetros inválidos", 400);
    }
    const result = await getProjectRiskSummaryForUser(req.user!, parsedParams.data.id, req.accessToken!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
