import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Mantenimiento (#61; migración 031). Escrituras con las funciones de la
// 031 (service_role; validan rol, membresía y reglas del Excel). Lecturas
// con el JWT del usuario (RLS de la 017 sobre maintenance_records y photos).
// ---------------------------------------------------------------------------

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

export async function crearOtMantenimiento(input: {
  projectId: string;
  treeId: string;
  incidentId: string | null;
  accionSolicitada: string;
  subtipoAccion: string | null;
  motivo: string | null;
  prioridad: string;
  observaciones: string | null;
  responsableAccionId: string;
  requiereRevisionInspector: boolean | null;
  inspectorRevisorId: string | null;
  creadoPor: string;
  fechaCreacionOt: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("fn_create_work_order_mantenimiento", {
    p_project_id: input.projectId,
    p_tree_id: input.treeId,
    p_incident_id: input.incidentId,
    p_accion_solicitada: input.accionSolicitada,
    p_subtipo_accion: input.subtipoAccion,
    p_motivo: input.motivo,
    p_prioridad: input.prioridad,
    p_observaciones: input.observaciones,
    p_responsable_accion_id: input.responsableAccionId,
    p_requiere_revision_inspector: input.requiereRevisionInspector,
    p_inspector_revisor_id: input.inspectorRevisorId,
    p_creado_por: input.creadoPor,
    p_fecha_creacion_ot: input.fechaCreacionOt,
  });
  if (error) lanzar(error);
  return data as { id: string; codigo_ot: string; estado_ot: string; requiere_revision_inspector: boolean; inspector_revisor_id: string | null };
}

export async function cambiarInspectorRevisor(workOrderId: string, nuevoRevisorId: string, usuario: string) {
  const { data, error } = await supabaseAdmin.rpc("fn_reassign_inspector_revisor", {
    p_work_order_id: workOrderId,
    p_nuevo_revisor_id: nuevoRevisorId,
    p_usuario: usuario,
  });
  if (error) lanzar(error);
  return data as { work_order_id: string; inspector_revisor_id: string };
}

export async function registrarEjecucion(input: {
  workOrderId: string;
  usuario: string;
  fechaEjecucion: string;
  accionEjecutada: string;
  subtipoEjecutado: string | null;
  resultado: string;
  observaciones: string | null;
  requiereSeguimiento: boolean;
  fechaSeguimiento: string | null;
  fotos: Array<{ id: string; storage_path: string }>;
  hoy: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("fn_registrar_ejecucion_mantenimiento", {
    p_work_order_id: input.workOrderId,
    p_usuario: input.usuario,
    p_fecha_ejecucion: input.fechaEjecucion,
    p_accion_ejecutada: input.accionEjecutada,
    p_subtipo_ejecutado: input.subtipoEjecutado,
    p_resultado: input.resultado,
    p_observaciones: input.observaciones,
    p_requiere_seguimiento: input.requiereSeguimiento,
    p_fecha_seguimiento: input.fechaSeguimiento,
    p_fotos: input.fotos,
    p_hoy: input.hoy,
  });
  if (error) lanzar(error);
  return data as { id: string; codigo_mantenimiento: string; estado_revision: string | null; estado_ot: string };
}

export async function revisarEjecucion(input: {
  recordId: string;
  usuario: string;
  estadoRevision: string;
  observacionesRevision: string | null;
  requiereCorreccion: boolean;
  fechaLimiteCorreccion: string | null;
  hoy: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("fn_revisar_mantenimiento", {
    p_maintenance_record_id: input.recordId,
    p_usuario: input.usuario,
    p_estado_revision: input.estadoRevision,
    p_observaciones_revision: input.observacionesRevision,
    p_requiere_correccion: input.requiereCorreccion,
    p_fecha_limite_correccion: input.fechaLimiteCorreccion,
    p_hoy: input.hoy,
  });
  if (error) lanzar(error);
  return data as { id: string; estado_revision: string; estado_ot: string; estado_presencia: string | null };
}

export interface EjecucionRow {
  id: string;
  codigo_mantenimiento: string;
  work_order_id: string;
  tree_id: string;
  fecha_ejecucion: string;
  ejecutado_por: string | null;
  accion_ejecutada: string;
  subtipo_ejecutado: string | null;
  resultado: string;
  observaciones: string | null;
  requiere_seguimiento: boolean | null;
  fecha_seguimiento: string | null;
  estado_revision: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  observaciones_revision: string | null;
  requiere_correccion: boolean | null;
  fecha_limite_correccion: string | null;
  created_at: string;
  photos: Array<{ id: string; storage_path: string; created_at: string }> | null;
}

const EJECUCION_COLUMNS =
  "id, codigo_mantenimiento, work_order_id, tree_id, fecha_ejecucion, ejecutado_por, accion_ejecutada, subtipo_ejecutado, resultado, observaciones, requiere_seguimiento, fecha_seguimiento, estado_revision, revisado_por, fecha_revision, observaciones_revision, requiere_correccion, fecha_limite_correccion, created_at, photos(id, storage_path, created_at)";

/** Ejecuciones de una o varias OT, de la más antigua a la más reciente (trazabilidad). */
export async function listarEjecuciones(accessToken: string, workOrderIds: string[]): Promise<EjecucionRow[]> {
  if (workOrderIds.length === 0) return [];
  const { data, error } = await createUserScopedClient(accessToken)
    .from("maintenance_records")
    .select(EJECUCION_COLUMNS)
    .in("work_order_id", workOrderIds)
    .order("created_at", { ascending: true });
  if (error) lanzar(error);
  return (data ?? []) as unknown as EjecucionRow[];
}

/** Presencia del árbol (v_tree_presence, D-28; migración 031). */
export async function obtenerPresencia(
  accessToken: string,
  treeId: string
): Promise<{ estado_presencia: string; fecha_cambio_estado_presencia: string } | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("v_tree_presence")
    .select("estado_presencia, fecha_cambio_estado_presencia")
    .eq("tree_id", treeId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as { estado_presencia: string; fecha_cambio_estado_presencia: string } | null) ?? null;
}
