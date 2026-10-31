import { createUserScopedClient } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Ficha del árbol (B2 — GET /api/sivu/projects/:id/trees/:treeId). Todo con
// el JWT del usuario: la RLS de la 017 deja leer a los miembros del
// proyecto y al Administrador (PR-018 v6.0).
// ---------------------------------------------------------------------------

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

/** Valores vigentes del árbol (fn_refresh_tree_current) y datos del alta. */
export interface ArbolFichaRow {
  id: string;
  tree_code: string;
  project_id: string;
  sector_id: string;
  sector: string | null;
  ubicacion_descriptiva: string | null;
  utm_este: number | null;
  utm_norte: number | null;
  ubicacion: { type: "Point"; coordinates: [number, number] } | null;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  estado_ciclo_vida: string;
  fecha_registro: string;
  multifustal: boolean | null;
  numero_fustes: number | null;
  dap_fustes_cm: number[] | null;
  dap_cm: number | null;
  altura_total_m: number | null;
  diametro_copa_ns_m: number | null;
  diametro_copa_eo_m: number | null;
  diametro_copa_m: number | null;
  copa_no_presenta: boolean | null;
  altura_primera_rama_m: number | null;
  altura_primera_rama_no_presenta: boolean | null;
  altura_base_copa_viva_m: number | null;
  altura_base_copa_viva_no_presenta: boolean | null;
  clase_edad: string | null;
  rango_edad_estimada_anios: string | null;
  vigente_desde_inspection_id: string | null;
}

/** Campos de medición que se versionan (tree_data_versions; D-7 a D-29). */
export const CAMPOS_MEDICION = [
  "sector", "ubicacion_descriptiva", "utm_este", "utm_norte", "especie_cientifica", "nombre_comun",
  "multifustal", "numero_fustes", "dap_fustes_cm", "dap_cm", "altura_total_m",
  "diametro_copa_ns_m", "diametro_copa_eo_m", "diametro_copa_m", "copa_no_presenta",
  "altura_primera_rama_m", "altura_primera_rama_no_presenta", "altura_base_copa_viva_m", "altura_base_copa_viva_no_presenta",
  "clase_edad", "rango_edad_estimada_anios",
] as const;

const ARBOL_COLUMNS = `id, tree_code, project_id, sector_id, ubicacion::geometry, estado_ciclo_vida, fecha_registro, vigente_desde_inspection_id, ${CAMPOS_MEDICION.join(", ")}`;

export async function obtenerArbolFicha(accessToken: string, projectId: string, treeId: string): Promise<ArbolFichaRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("trees")
    .select(ARBOL_COLUMNS)
    .eq("project_id", projectId)
    .eq("id", treeId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as unknown as ArbolFichaRow | null) ?? null;
}

export interface RasgosEspecieRow {
  origen_biogeografico: string;
  persistencia_follaje: string | null;
  tipo_hoja: string | null;
  genero: string | null;
  familia: string | null;
}

/** «Sobre esta especie» (v_species_traits; D-257 a D-262). */
export async function obtenerRasgosEspecie(accessToken: string, treeId: string): Promise<RasgosEspecieRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("v_species_traits")
    .select("origen_biogeografico, persistencia_follaje, tipo_hoja, genero, familia")
    .eq("tree_id", treeId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as RasgosEspecieRow | null) ?? null;
}

export type VersionMedicionRow = Record<(typeof CAMPOS_MEDICION)[number], unknown> & {
  id: string;
  inspection_id: string | null;
  campos_registrados: string[] | null;
  created_at: string;
  inspections: {
    codigo_inspeccion: string | null;
    estado_registro: string;
    fecha_inspeccion: string | null;
    work_orders: { estado_ot: string; fecha_completada_ot: string | null } | null;
  } | null;
};

/** Todas las versiones del árbol (alta e inspecciones), con el estado de su inspección y su OT. */
export async function listarVersionesMedicion(accessToken: string, treeId: string): Promise<VersionMedicionRow[]> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("tree_data_versions")
    .select(
      `id, inspection_id, campos_registrados, created_at, ${CAMPOS_MEDICION.join(", ")}, inspections(codigo_inspeccion, estado_registro, fecha_inspeccion, work_orders(estado_ot, fecha_completada_ot))`
    )
    .eq("tree_id", treeId)
    .order("created_at", { ascending: true });
  if (error) lanzar(error);
  return (data ?? []) as unknown as VersionMedicionRow[];
}
