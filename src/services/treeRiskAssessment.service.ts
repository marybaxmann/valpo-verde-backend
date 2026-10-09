import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { findTreeById } from "../repositories/tree.repository";
import { listProjectTreesForUser } from "./tree.service";
import {
  createTreeRiskAssessment,
  findRiskAssessmentsByTreeId,
  findRiskAssessmentsByTreeIds,
  TreeRiskAssessmentRow,
} from "../repositories/treeRiskAssessment.repository";
import { evaluarRiesgo } from "./rules/treeRisk";
import { CreateTreeRiskAssessmentBody } from "../schemas/treeRiskAssessment.schema";
import { assertProjectAccess } from "./authorization.service";

export interface TreeRiskAssessmentDTO {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  resultado: {
    puntaje_raices_cuello: number | null;
    probabilidad_falla_raices_cuello: string | null;
    puntaje_tronco: number | null;
    probabilidad_falla_tronco: string | null;
    puntaje_copa_ramas: number | null;
    probabilidad_falla_copa_ramas: string | null;
    probabilidad_impacto: string;
    clasificacion_raices_cuello: string | null;
    clasificacion_tronco: string | null;
    clasificacion_copa_ramas: string | null;
    clasificacion_riesgo: string | null;
    // Consecuencia observada por el inspector (entrada, no calculada) —
    // se expone junto al resultado solo para mostrarla en ficha/historial.
    consecuencia_raices_cuello: string;
    consecuencia_tronco: string;
    consecuencia_copa_ramas: string;
  };
  rule_version: string;
  created_by: string | null;
  inspector_nombre: string | null;
  created_at: string;
}

function toDTO(row: TreeRiskAssessmentRow): TreeRiskAssessmentDTO {
  return {
    id: row.id,
    tree_id: row.tree_id,
    fecha_evaluacion: row.fecha_evaluacion,
    resultado: {
      puntaje_raices_cuello: row.puntaje_raices_cuello,
      probabilidad_falla_raices_cuello: row.probabilidad_falla_raices_cuello,
      puntaje_tronco: row.puntaje_tronco,
      probabilidad_falla_tronco: row.probabilidad_falla_tronco,
      puntaje_copa_ramas: row.puntaje_copa_ramas,
      probabilidad_falla_copa_ramas: row.probabilidad_falla_copa_ramas,
      probabilidad_impacto: row.probabilidad_impacto,
      clasificacion_raices_cuello: row.clasificacion_raices_cuello,
      clasificacion_tronco: row.clasificacion_tronco,
      clasificacion_copa_ramas: row.clasificacion_copa_ramas,
      clasificacion_riesgo: row.clasificacion_riesgo,
      consecuencia_raices_cuello: row.variables.consecuencia_raices_cuello,
      consecuencia_tronco: row.variables.consecuencia_tronco,
      consecuencia_copa_ramas: row.variables.consecuencia_copa_ramas,
    },
    rule_version: row.rule_version,
    created_by: row.created_by,
    inspector_nombre: row.user_profiles?.nombre ?? null,
    created_at: row.created_at,
  };
}

/**
 * Registra una evaluación técnica (POST /api/trees/:treeId/risk-assessments).
 * El riesgo se calcula aquí (services/rules/treeRisk.ts) — nunca se confía
 * en un resultado enviado por el frontend.
 */
export async function createTreeRiskAssessmentForUser(
  user: AuthenticatedUser,
  treeId: string,
  body: CreateTreeRiskAssessmentBody,
  accessToken: string
): Promise<{ data: TreeRiskAssessmentDTO }> {
  const tree = await findTreeById(accessToken, treeId);
  if (!tree) {
    throw new AppError("Árbol no encontrado", 404);
  }
  await assertProjectAccess(user, tree.project_id, accessToken);

  const resultado = evaluarRiesgo(body.variables);

  try {
    const row = await createTreeRiskAssessment(
      accessToken,
      treeId,
      body.fecha_evaluacion,
      body.variables,
      resultado
    );
    return { data: toDTO(row) };
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "";
    if (msg.includes("Árbol no encontrado")) throw new AppError("Árbol no encontrado", 404);
    if (msg.includes("No tiene acceso")) throw new AppError("No tiene acceso a este árbol", 403);
    throw err;
  }
}

/** Historial de evaluaciones de un árbol (GET /api/trees/:treeId/risk-assessments). */
export async function listTreeRiskAssessmentsForUser(
  user: AuthenticatedUser,
  treeId: string,
  accessToken: string
): Promise<{ data: TreeRiskAssessmentDTO[] }> {
  const tree = await findTreeById(accessToken, treeId);
  if (!tree) {
    throw new AppError("Árbol no encontrado", 404);
  }
  await assertProjectAccess(user, tree.project_id, accessToken);

  const rows = await findRiskAssessmentsByTreeId(accessToken, treeId);
  return { data: rows.map(toDTO) };
}

/** Última evaluación de un árbol, o null si no tiene ninguna (para la ficha). */
export async function getLatestTreeRiskAssessmentForUser(
  user: AuthenticatedUser,
  treeId: string,
  accessToken: string
): Promise<{ data: TreeRiskAssessmentDTO | null }> {
  const { data } = await listTreeRiskAssessmentsForUser(user, treeId, accessToken);
  return { data: data[0] ?? null };
}

/**
 * Última evaluación vigente de cada árbol del proyecto, en una sola
 * consulta (GET /api/projects/:id/risk-assessments/latest). Pensado para
 * colorear el mapa de Inventario por riesgo sin N+1 consultas. El acceso
 * se valida vía `listProjectTreesForUser` (misma regla que el inventario).
 */
export async function getProjectRiskSummaryForUser(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<{ data: Record<string, TreeRiskAssessmentDTO> }> {
  const inventory = await listProjectTreesForUser(user, projectId, accessToken);
  const treeIds = inventory.data.features.map((f) => f.properties.id);

  const rows = await findRiskAssessmentsByTreeIds(accessToken, treeIds);

  // Las filas ya vienen ordenadas (fecha_evaluacion desc, created_at desc):
  // nos quedamos con la primera aparición de cada tree_id (la vigente).
  const latestByTreeId: Record<string, TreeRiskAssessmentDTO> = {};
  for (const row of rows) {
    if (!latestByTreeId[row.tree_id]) {
      latestByTreeId[row.tree_id] = toDTO(row);
    }
  }
  return { data: latestByTreeId };
}
