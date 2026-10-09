import { createUserScopedClient } from "../config/supabase";

export interface TreeMeasurementRow {
  id: string;
  tree_id: string;
  fecha_medicion: string;
  configuracion_fustes: string;
  numero_fustes: number | null;
  dap_fustes_cm: number[] | null;
  dap_cm: number | null;
  altura_total_m: number;
  diametro_copa_m: number;
  altura_primera_rama_m: number;
  clase_edad: string | null;
  estado_medicion: "valida" | "anulada";
  motivo_anulacion: string | null;
  anulado_por: string | null;
  fecha_anulacion: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Consulta el historial de mediciones de un árbol ordenadas cronológicamente
 * por fecha_medicion DESC, created_at DESC (ADR-016).
 */
export async function findMeasurementsByTreeId(
  accessToken: string,
  treeId: string,
  includeAnuladas: boolean = false
): Promise<TreeMeasurementRow[]> {
  const supabase = createUserScopedClient(accessToken);
  let query = supabase
    .from("tree_measurements")
    .select("*")
    .eq("tree_id", treeId);

  if (!includeAnuladas) {
    query = query.eq("estado_medicion", "valida");
  }

  const { data, error } = await query
    .order("fecha_medicion", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al consultar mediciones: ${error.message}`);
  }

  return (data ?? []) as unknown as TreeMeasurementRow[];
}

/**
 * Consulta las dos mediciones válidas superiores de un árbol por fecha_medicion DESC
 * para resolver medicion_actual y detectar empates en la fecha máxima (Decisión 2 / INV-1A).
 */
export async function findLatestValidMeasurementsCandidates(
  accessToken: string,
  treeId: string
): Promise<TreeMeasurementRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_measurements")
    .select("*")
    .eq("tree_id", treeId)
    .eq("estado_medicion", "valida")
    .order("fecha_medicion", { ascending: false })
    .limit(2);

  if (error) {
    throw new Error(`Error al consultar última medición: ${error.message}`);
  }

  return (data ?? []) as unknown as TreeMeasurementRow[];
}

/**
 * Mediciones válidas de un conjunto de árboles (fecha_medicion DESC,
 * created_at DESC), en una sola consulta — para agregados de proyecto.
 */
export async function findValidMeasurementsByTreeIds(
  accessToken: string,
  treeIds: string[]
): Promise<TreeMeasurementRow[]> {
  if (treeIds.length === 0) return [];
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_measurements")
    .select("*")
    .in("tree_id", treeIds)
    .eq("estado_medicion", "valida")
    .order("fecha_medicion", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Error al consultar mediciones del proyecto: ${error.message}`);
  }
  return (data ?? []) as TreeMeasurementRow[];
}
