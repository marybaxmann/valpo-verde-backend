import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Valpo Verde Conecta (#62; CC-062 / PR-022 v2.0; migración 028).
//
// Público: las funciones de la 028 (SECURITY DEFINER, EXECUTE solo para
// service_role) son la única excepción a «el backend lee con el JWT del
// usuario» (PR-018 v6.0). Interno (B9): con el JWT del usuario; la RLS
// de la 017 deja ver nombre y RUT (incident_reporters) solo al Usuario
// municipal miembro.
// ---------------------------------------------------------------------------

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

export interface FichaPublica {
  especie_cientifica: string | null;
  nombre_comun: string | null;
  ubicacion_descriptiva: string | null;
  sobre_la_especie: {
    especie_cientifica: string | null;
    genero: string | null;
    familia: string | null;
    origen_biogeografico: string;
    persistencia_follaje: string | null;
    tipo_hoja: string | null;
  };
}

export async function obtenerFichaPublica(qrToken: string): Promise<FichaPublica | null> {
  const { data, error } = await supabaseAdmin.rpc("fn_ficha_publica_arbol", { p_qr_token: qrToken });
  if (error) lanzar(error);
  return (data as FichaPublica | null) ?? null;
}

export interface CrearIncidenciaCiudadanaInput {
  incidentId: string;
  qrToken: string;
  tipoIncidencia: string;
  descripcion: string;
  nombreReportante: string;
  rutReportante: string;
  /** SHA-256 del código de seguimiento, en hexadecimal. */
  huellaHex: string;
  fotos: Array<{ id: string; storage_path: string }>;
}

export async function crearIncidenciaCiudadana(
  input: CrearIncidenciaCiudadanaInput
): Promise<{ id: string; codigo_incidencia: string; fecha_reporte: string }> {
  const { data, error } = await supabaseAdmin.rpc("fn_crear_incidencia_ciudadana", {
    p_incident_id: input.incidentId,
    p_qr_token: input.qrToken,
    p_tipo_incidencia: input.tipoIncidencia,
    p_descripcion: input.descripcion,
    p_nombre_reportante: input.nombreReportante,
    p_rut_reportante: input.rutReportante,
    // bytea por PostgREST: formato hexadecimal de Postgres.
    p_huella: `\\x${input.huellaHex}`,
    p_fotos: input.fotos,
  });
  if (error) lanzar(error);
  return data as { id: string; codigo_incidencia: string; fecha_reporte: string };
}

export async function obtenerEstadoSeguimiento(huellaHex: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("fn_estado_seguimiento", { p_huella: `\\x${huellaHex}` });
  if (error) lanzar(error);
  return (data as string | null) ?? null;
}

export async function purgarHuellasVencidas(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("fn_purgar_huellas_vencidas");
  if (error) lanzar(error);
  return (data as number) ?? 0;
}

// --- Interno (B9 y revisión) ---------------------------------------------

export interface IncidenciaRow {
  id: string;
  codigo_incidencia: string;
  tree_id: string;
  project_id: string;
  tipo_incidencia: string;
  descripcion: string | null;
  estado_incidencia: string;
  origen_reporte: string | null;
  fecha_reporte: string | null;
  ubicacion: string | null;
  fecha_revision: string | null;
  revisado_por: string | null;
  resultado_revision: string | null;
  observaciones_revision: string | null;
  prioridad_municipal: string | null;
  fecha_actualizacion_estado: string | null;
  trees: { tree_code: string; especie_cientifica: string | null; nombre_comun: string | null } | null;
  incident_reporters: { nombre_reportante: string; rut_reportante: string } | null;
}

const INCIDENCIA_COLUMNS =
  "id, codigo_incidencia, tree_id, project_id, tipo_incidencia, descripcion, estado_incidencia, origen_reporte, fecha_reporte, ubicacion, fecha_revision, revisado_por, resultado_revision, observaciones_revision, prioridad_municipal, fecha_actualizacion_estado, trees(tree_code, especie_cientifica, nombre_comun), incident_reporters(nombre_reportante, rut_reportante)";

export async function listarIncidenciasProyecto(
  accessToken: string,
  filtros: { projectId: string; estado?: string; treeId?: string; limit: number; offset: number }
): Promise<{ filas: IncidenciaRow[]; total: number }> {
  let query = createUserScopedClient(accessToken)
    .from("incidents")
    .select(INCIDENCIA_COLUMNS, { count: "exact" })
    .eq("project_id", filtros.projectId);
  if (filtros.estado) query = query.eq("estado_incidencia", filtros.estado);
  if (filtros.treeId) query = query.eq("tree_id", filtros.treeId);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(filtros.offset, filtros.offset + filtros.limit - 1);
  if (error) lanzar(error);
  return { filas: (data ?? []) as unknown as IncidenciaRow[], total: count ?? 0 };
}

export async function obtenerIncidencia(accessToken: string, projectId: string, incidentId: string): Promise<IncidenciaRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("incidents")
    .select(INCIDENCIA_COLUMNS)
    .eq("project_id", projectId)
    .eq("id", incidentId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as unknown as IncidenciaRow | null) ?? null;
}

export async function listarFotosIncidencia(accessToken: string, incidentId: string): Promise<Array<{ id: string; storage_path: string; created_at: string }>> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("photos")
    .select("id, storage_path, created_at")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });
  if (error) lanzar(error);
  return (data ?? []) as Array<{ id: string; storage_path: string; created_at: string }>;
}

export interface RevisionResultado {
  id: string;
  codigo_incidencia: string;
  estado_incidencia: string;
  resultado_revision: string | null;
  observaciones_revision: string | null;
  prioridad_municipal: string | null;
  fecha_revision: string | null;
  revisado_por: string | null;
  fecha_actualizacion_estado: string | null;
  fotos_borradas: string[];
}

export async function revisarIncidencia(input: {
  incidentId: string;
  usuario: string;
  estado: string;
  resultado: string | null;
  observaciones: string | null;
  prioridad: string | null;
}): Promise<RevisionResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_revisar_incidencia", {
    p_incident_id: input.incidentId,
    p_usuario: input.usuario,
    p_estado_incidencia: input.estado,
    p_resultado_revision: input.resultado,
    p_observaciones_revision: input.observaciones,
    p_prioridad_municipal: input.prioridad,
  });
  if (error) lanzar(error);
  return data as RevisionResultado;
}

/** Árboles del proyecto para las placas QR (CC-062 punto 2), con el JWT del usuario. */
export async function listarArbolesParaPlacas(
  accessToken: string,
  projectId: string
): Promise<Array<{ tree_code: string; qr_token: string; especie_cientifica: string | null; nombre_comun: string | null }>> {
  const filas: Array<{ tree_code: string; qr_token: string; especie_cientifica: string | null; nombre_comun: string | null }> = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("trees")
      .select("tree_code, qr_token, especie_cientifica, nombre_comun")
      .eq("project_id", projectId)
      .eq("estado_ciclo_vida", "activo")
      .order("tree_code", { ascending: true })
      .range(desde, desde + 999);
    if (error) lanzar(error);
    const pagina = (data ?? []) as typeof filas;
    filas.push(...pagina);
    if (pagina.length < 1000) return filas;
  }
}
