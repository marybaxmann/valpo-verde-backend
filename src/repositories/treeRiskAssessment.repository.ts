import { createUserScopedClient } from "../config/supabase";
import { TreeRiskVariables, TreeRiskResult } from "../services/rules/treeRisk";

export interface TreeRiskAssessmentRow {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  variables: TreeRiskVariables;
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
  rule_version: string;
  created_by: string | null;
  created_at: string;
  user_profiles: { nombre: string | null } | null;
}

const COLUMNS =
  "id, tree_id, fecha_evaluacion, variables, puntaje_raices_cuello, probabilidad_falla_raices_cuello, puntaje_tronco, probabilidad_falla_tronco, puntaje_copa_ramas, probabilidad_falla_copa_ramas, probabilidad_impacto, clasificacion_raices_cuello, clasificacion_tronco, clasificacion_copa_ramas, clasificacion_riesgo, rule_version, created_by, created_at, user_profiles(nombre)";

/**
 * Inserta una evaluación ya calculada (R01–R04/M01–M03 resueltos en
 * services/rules/treeRisk.ts). RLS (migración 007) decide si la fila puede
 * existir para este usuario — mismo modelo que `trees` (ADR-014).
 */
export async function createTreeRiskAssessment(
  accessToken: string,
  treeId: string,
  fechaEvaluacion: string,
  variables: TreeRiskVariables,
  result: TreeRiskResult
): Promise<TreeRiskAssessmentRow> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_risk_assessments")
    .insert({
      tree_id: treeId,
      fecha_evaluacion: fechaEvaluacion,
      variables,
      puntaje_raices_cuello: result.r01.puntaje,
      probabilidad_falla_raices_cuello: result.r01.probabilidadFalla,
      puntaje_tronco: result.r02.puntaje,
      probabilidad_falla_tronco: result.r02.probabilidadFalla,
      puntaje_copa_ramas: result.r03.puntaje,
      probabilidad_falla_copa_ramas: result.r03.probabilidadFalla,
      probabilidad_impacto: result.probabilidadImpacto,
      clasificacion_raices_cuello: result.clasificacionRaicesCuello,
      clasificacion_tronco: result.clasificacionTronco,
      clasificacion_copa_ramas: result.clasificacionCopaRamas,
      clasificacion_riesgo: result.clasificacionRiesgo,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Árbol no encontrado");
    }
    if (error.code === "PGRST116") {
      throw new Error("No tiene acceso a este árbol");
    }
    throw new Error(`Error al guardar la evaluación: ${error.message}`);
  }

  return data as unknown as TreeRiskAssessmentRow;
}

/** Historial de evaluaciones de un árbol, más reciente primero. */
export async function findRiskAssessmentsByTreeId(
  accessToken: string,
  treeId: string
): Promise<TreeRiskAssessmentRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_risk_assessments")
    .select(COLUMNS)
    .eq("tree_id", treeId)
    .order("fecha_evaluacion", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar evaluaciones: ${error.message}`);
  }
  return (data ?? []) as unknown as TreeRiskAssessmentRow[];
}

/**
 * Fila liviana para el resumen de riesgo del proyecto: el resultado ya
 * calculado y solo las tres consecuencias observadas, sin el JSON completo de
 * `variables` (que el resumen no usa).
 */
export type TreeRiskSummaryRow = Omit<TreeRiskAssessmentRow, "variables"> & {
  consecuencia_raices_cuello: string;
  consecuencia_tronco: string;
  consecuencia_copa_ramas: string;
};

const SUMMARY_COLUMNS =
  "id, tree_id, fecha_evaluacion, puntaje_raices_cuello, probabilidad_falla_raices_cuello, puntaje_tronco, probabilidad_falla_tronco, puntaje_copa_ramas, probabilidad_falla_copa_ramas, probabilidad_impacto, clasificacion_raices_cuello, clasificacion_tronco, clasificacion_copa_ramas, clasificacion_riesgo, rule_version, created_by, created_at, user_profiles(nombre), " +
  "consecuencia_raices_cuello:variables->>consecuencia_raices_cuello, consecuencia_tronco:variables->>consecuencia_tronco, consecuencia_copa_ramas:variables->>consecuencia_copa_ramas, " +
  "trees!inner(project_id)";

/**
 * Evaluaciones de los árboles de un proyecto (más recientes primero), en una
 * sola consulta filtrada por proyecto en la base de datos. No envía la lista
 * de ids de árboles en la URL (no crece con el inventario) ni el JSON de
 * `variables`. El servicio se queda con la primera fila por `tree_id`.
 */
export async function findProjectRiskSummaryRows(
  accessToken: string,
  projectId: string
): Promise<TreeRiskSummaryRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_risk_assessments")
    .select(SUMMARY_COLUMNS)
    .eq("trees.project_id", projectId)
    .order("fecha_evaluacion", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar evaluaciones del proyecto: ${error.message}`);
  }
  return (data ?? []) as unknown as TreeRiskSummaryRow[];
}
