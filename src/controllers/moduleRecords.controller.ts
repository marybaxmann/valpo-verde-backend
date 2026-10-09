import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";
import { treeIdParamSchema } from "../schemas/tree.schema";
import { projectIdParamSchema } from "../schemas/project.schema";
import {
  createIncidentSchema,
  createInfrastructureAssessmentSchema,
  createMaintenanceOrderSchema,
  recordIdParamSchema,
  updateIncidentStateSchema,
  updateMaintenanceStateSchema,
} from "../schemas/moduleRecords.schema";
import {
  createIncidentForUser,
  createInfrastructureAssessmentForUser,
  createMaintenanceOrderForUser,
  getModuleCatalogs,
  getProjectIndicesForUser,
  listProjectIncidentsForUser,
  listProjectInfrastructureAssessmentsForUser,
  listProjectMaintenanceForUser,
  listTreeInfrastructureAssessmentsForUser,
  updateIncidentStateForUser,
  updateMaintenanceStateForUser,
} from "../services/moduleRecords.service";

function treeId(params: unknown): string {
  const parsed = treeIdParamSchema.safeParse(params);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Identificador de árbol inválido", 400);
  return parsed.data.treeId ?? parsed.data.id!;
}

function projectId(params: unknown): string {
  const parsed = projectIdParamSchema.safeParse(params);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Parámetros inválidos", 400);
  return parsed.data.id;
}

function body<T>(schema: ZodSchema<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  return parsed.data;
}

type Handler = (req: Request, res: Response) => Promise<void> | void;
const wrap = (fn: Handler) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

/** GET /api/catalogs/modules */
export const getCatalogs = wrap((_req, res) => {
  res.json(getModuleCatalogs());
});

/** POST /api/trees/:treeId/infrastructure-assessments → 201 */
export const createInfrastructureAssessment = wrap(async (req, res) => {
  const result = await createInfrastructureAssessmentForUser(
    req.user!,
    treeId(req.params),
    body(createInfrastructureAssessmentSchema, req.body),
    req.accessToken!
  );
  res.status(201).json(result);
});

/** GET /api/trees/:treeId/infrastructure-assessments */
export const listTreeInfrastructureAssessments = wrap(async (req, res) => {
  res.json(await listTreeInfrastructureAssessmentsForUser(req.user!, treeId(req.params), req.accessToken!));
});

/** GET /api/projects/:id/infrastructure-assessments */
export const listProjectInfrastructureAssessments = wrap(async (req, res) => {
  res.json(await listProjectInfrastructureAssessmentsForUser(req.user!, projectId(req.params), req.accessToken!));
});

/** POST /api/projects/:id/maintenance → 201 */
export const createMaintenanceOrder = wrap(async (req, res) => {
  const result = await createMaintenanceOrderForUser(
    req.user!,
    projectId(req.params),
    body(createMaintenanceOrderSchema, req.body),
    req.accessToken!
  );
  res.status(201).json(result);
});

/** GET /api/projects/:id/maintenance */
export const listProjectMaintenance = wrap(async (req, res) => {
  res.json(await listProjectMaintenanceForUser(req.user!, projectId(req.params), req.accessToken!));
});

/** POST /api/projects/:id/incidents → 201 */
export const createIncident = wrap(async (req, res) => {
  const result = await createIncidentForUser(
    req.user!,
    projectId(req.params),
    body(createIncidentSchema, req.body),
    req.accessToken!
  );
  res.status(201).json(result);
});

/** GET /api/projects/:id/incidents */
export const listProjectIncidents = wrap(async (req, res) => {
  res.json(await listProjectIncidentsForUser(req.user!, projectId(req.params), req.accessToken!));
});

function recordParams(params: unknown): { id: string; recordId: string } {
  const parsed = recordIdParamSchema.safeParse(params);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "Parámetros inválidos", 400);
  return parsed.data;
}

/** PATCH /api/projects/:id/maintenance/:recordId/estado (solo admin) */
export const updateMaintenanceState = wrap(async (req, res) => {
  const { id, recordId } = recordParams(req.params);
  res.json(
    await updateMaintenanceStateForUser(req.user!, id, recordId, body(updateMaintenanceStateSchema, req.body), req.accessToken!)
  );
});

/** PATCH /api/projects/:id/incidents/:recordId/estado (solo admin) */
export const updateIncidentState = wrap(async (req, res) => {
  const { id, recordId } = recordParams(req.params);
  res.json(
    await updateIncidentStateForUser(req.user!, id, recordId, body(updateIncidentStateSchema, req.body), req.accessToken!)
  );
});

/** GET /api/projects/:id/indices — agregados descriptivos del proyecto */
export const getProjectIndices = wrap(async (req, res) => {
  res.json(await getProjectIndicesForUser(req.user!, projectId(req.params), req.accessToken!));
});
