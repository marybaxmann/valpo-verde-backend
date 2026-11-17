import { supabaseAdmin } from "../../config/supabase";

/**
 * SQLSTATE propio del rechazo "campo obligatorio del alta ausente"
 * (`sector`, `ubicacion_descriptiva`, `utm_este`, `utm_norte` — D-7 a
 * D-10), en `fn_create_tree_alta` (migración 018d). Ninguno de los
 * cuatro es `NOT NULL` en la columna física de `trees`; el Zod del API
 * ya los exige, pero la función es la única puerta de escritura real
 * y no confía solo en el llamador. El service lo traduce a 422.
 */
export const SQLSTATE_CAMPO_OBLIGATORIO_ALTA = "SV057";

/**
 * Columnas de `trees` que expone el alta municipal mínima (#57, PR-006
 * v11.0). No incluye datos dendrométricos ni características de la
 * especie: esos los registra el Inspector mediante OT (fuera del
 * alcance de este issue).
 */
export interface ArbolAltaRow {
  id: string;
  tree_code: string;
  project_id: string;
  sector_id: string;
  sector: string;
  ubicacion_descriptiva: string;
  utm_este: number;
  utm_norte: number;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  estado_ciclo_vida: string;
  fecha_registro: string;
  registrado_por: string;
  created_at: string;
}

export interface AltaArbolInput {
  projectId: string;
  sectorId: string;
  sector: string;
  ubicacionDescriptiva: string;
  utmEste: number;
  utmNorte: number;
  especieCientifica: string | null;
  nombreComun: string | null;
  fechaRegistro: string;
  registradoPor: string;
}

/**
 * Invoca `fn_create_tree_alta` (migración 018d, #57) con `service_role`
 * (CC-033: ningún rol de `authenticated` tiene policy de escritura).
 *
 * No es un INSERT directo en `trees` (versión anterior de este archivo,
 * revisada 2026-10-23): el alta debe escribir `trees` y su versión de
 * alta en `tree_data_versions` (`inspection_id` NULL, §3.6) **en la
 * misma transacción** — sin esa fila, `fn_refresh_tree_current` no
 * tiene de dónde respaldar un campo que ninguna inspección registre, y
 * lo deja en `NULL` al completar la primera OT parcial (defecto
 * encontrado por la responsable). Una función `SECURITY DEFINER`
 * invocada una sola vez ya es atómica — mismo patrón que
 * `fn_create_project_with_sector` (018b); no necesita node-postgres
 * (ADR-017 no incluye este flujo).
 */
export async function crearArbolAlta(input: AltaArbolInput): Promise<ArbolAltaRow> {
  const { data, error } = await supabaseAdmin.rpc("fn_create_tree_alta", {
    p_project_id: input.projectId,
    p_sector_id: input.sectorId,
    p_sector: input.sector,
    p_ubicacion_descriptiva: input.ubicacionDescriptiva,
    p_utm_este: input.utmEste,
    p_utm_norte: input.utmNorte,
    p_especie_cientifica: input.especieCientifica,
    p_nombre_comun: input.nombreComun,
    p_fecha_registro: input.fechaRegistro,
    p_registrado_por: input.registradoPor,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as ArbolAltaRow;
}

/** Datos mínimos del árbol para autorizar una operación sobre él dentro de un proyecto. */
export interface ArbolDeProyectoRow {
  id: string;
  tree_code: string;
  project_id: string;
  legacy_id: string | null;
  estado_ciclo_vida: string;
}

/** El árbol, solo si pertenece al proyecto (con `service_role`, después de autorizar el rol). */
export async function obtenerArbolDeProyecto(projectId: string, treeId: string): Promise<ArbolDeProyectoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("trees")
    .select("id, tree_code, project_id, legacy_id, estado_ciclo_vida")
    .eq("id", treeId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener el árbol: ${error.message}`);
  }
  return (data as unknown as ArbolDeProyectoRow) ?? null;
}

/** El árbol que ya tiene ese identificador de origen, en cualquier proyecto (legacy_id es UNIQUE). */
export async function obtenerArbolPorLegacyId(legacyId: string): Promise<ArbolDeProyectoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("trees")
    .select("id, tree_code, project_id, legacy_id, estado_ciclo_vida")
    .eq("legacy_id", legacyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al buscar el identificador de origen: ${error.message}`);
  }
  return (data as unknown as ArbolDeProyectoRow) ?? null;
}

/**
 * Asigna `legacy_id` solo si está vacío (`.is("legacy_id", null)`): nunca
 * reasigna un identificador. Devuelve null si no se actualizó ninguna fila
 * (ya tenía uno). `legacy_id` no es un campo versionado: fn_refresh_tree_current
 * no lo toca.
 */
export async function asignarLegacyIdSiVacio(treeId: string, legacyId: string): Promise<ArbolDeProyectoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("trees")
    .update({ legacy_id: legacyId })
    .eq("id", treeId)
    .is("legacy_id", null)
    .select("id, tree_code, project_id, legacy_id, estado_ciclo_vida")
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
  return (data as unknown as ArbolDeProyectoRow) ?? null;
}

export interface CorreccionUbicacionInput {
  treeId: string;
  sector: string | null;
  ubicacionDescriptiva: string | null;
  utmEste: number | null;
  utmNorte: number | null;
  motivo: string;
  usuarioId: string;
}

export interface CorreccionUbicacionResultado {
  cambio: boolean;
  tree_id: string;
  version_id?: string;
  campos?: string[];
  anterior?: { sector: string | null; ubicacion_descriptiva: string | null; utm_este: number | null; utm_norte: number | null };
}

/**
 * `fn_corregir_ubicacion_arbol` (039; decisión F): versión nueva en
 * `tree_data_versions` (origen 'correccion_ubicacion') y recálculo del
 * árbol, en una sola transacción. EXECUTE solo para service_role.
 */
export async function corregirUbicacionArbol(input: CorreccionUbicacionInput): Promise<CorreccionUbicacionResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_corregir_ubicacion_arbol", {
    p_tree_id: input.treeId,
    p_sector: input.sector,
    p_ubicacion_descriptiva: input.ubicacionDescriptiva,
    p_utm_este: input.utmEste,
    p_utm_norte: input.utmNorte,
    p_motivo: input.motivo,
    p_usuario: input.usuarioId,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
  return data as unknown as CorreccionUbicacionResultado;
}
