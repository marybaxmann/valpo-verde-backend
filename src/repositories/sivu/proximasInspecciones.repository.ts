import { createUserScopedClient } from "../../config/supabase";

// ---------------------------------------------------------------------------
// B5 — próximas inspecciones y monitoreos por proyecto (CC-037). Lee
// v_upcoming_inspections (migración 030: solo fechas vigentes, AM-18) y los
// árboles, con el JWT del usuario (security_invoker: la RLS de la 017 filtra).
// ---------------------------------------------------------------------------

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

export interface ProximaRow {
  tree_id: string;
  tipo: "inspeccion" | "monitoreo";
  fecha: string;
  ajustada: boolean;
  inspection_id: string;
  fecha_inspeccion: string | null;
  nivel_riesgo: string | null;
}

export async function listarProximas(accessToken: string, projectId: string): Promise<ProximaRow[]> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("v_upcoming_inspections")
    .select("tree_id, tipo, fecha, ajustada, inspection_id, fecha_inspeccion, nivel_riesgo")
    .eq("project_id", projectId)
    .order("fecha", { ascending: true });
  if (error) lanzar(error);
  return (data ?? []) as ProximaRow[];
}

export interface ArbolProximaRow {
  id: string;
  tree_code: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  ubicacion_descriptiva: string | null;
}

export async function listarArbolesPorId(accessToken: string, treeIds: string[]): Promise<ArbolProximaRow[]> {
  const filas: ArbolProximaRow[] = [];
  for (let i = 0; i < treeIds.length; i += 100) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("trees")
      .select("id, tree_code, especie_cientifica, nombre_comun, ubicacion_descriptiva")
      .in("id", treeIds.slice(i, i + 100));
    if (error) lanzar(error);
    filas.push(...((data ?? []) as ArbolProximaRow[]));
  }
  return filas;
}
