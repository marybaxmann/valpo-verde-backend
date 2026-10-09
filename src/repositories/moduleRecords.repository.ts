import { createUserScopedClient } from "../config/supabase";

/**
 * Persistencia de Infraestructura (datos crudos), órdenes de trabajo
 * (`maintenance`) e incidencias (`incidents`). Todas las consultas usan el
 * cliente con el JWT del usuario: RLS (migraciones 005 y 008) es la
 * segunda capa de autorización, además de assertProjectAccess.
 */

function mapError(error: { code?: string; message: string }, accion: string): Error {
  if (error.code === "23503") return new Error("Árbol no encontrado");
  if (error.code === "42501" || error.code === "PGRST116") return new Error("No tiene acceso a este árbol");
  return new Error(`Error al ${accion}: ${error.message}`);
}

// ---------------------------------------------------------------- Infra

export interface InfrastructureAssessmentRow {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  variables: Record<string, string | null>;
  observaciones: string | null;
  created_by: string | null;
  created_at: string;
  user_profiles: { nombre: string | null } | null;
}

const INFRA_COLUMNS = "id, tree_id, fecha_evaluacion, variables, observaciones, created_by, created_at, user_profiles(nombre)";

export async function insertInfrastructureAssessment(
  accessToken: string,
  row: { tree_id: string; fecha_evaluacion: string; variables: Record<string, string | null>; observaciones: string | null }
): Promise<InfrastructureAssessmentRow> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_infrastructure_assessments")
    .insert(row)
    .select(INFRA_COLUMNS)
    .single();
  if (error) throw mapError(error, "guardar la evaluación de infraestructura");
  return data as unknown as InfrastructureAssessmentRow;
}

export async function findInfrastructureAssessmentsByTreeIds(
  accessToken: string,
  treeIds: string[]
): Promise<InfrastructureAssessmentRow[]> {
  if (treeIds.length === 0) return [];
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("tree_infrastructure_assessments")
    .select(INFRA_COLUMNS)
    .in("tree_id", treeIds)
    .order("fecha_evaluacion", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw mapError(error, "listar evaluaciones de infraestructura");
  return (data ?? []) as unknown as InfrastructureAssessmentRow[];
}

// ---------------------------------------------------------- Mantención

export interface MaintenanceRow {
  id: string;
  codigo_ot: string | null;
  tree_id: string;
  tipo_intervencion: string;
  subtipo_accion: string | null;
  fecha_programada: string | null;
  responsable: string | null;
  estado: string;
  observacion: string | null;
  created_by: string | null;
  created_at: string;
  fecha_actualizacion: string | null;
}

const MAINT_COLUMNS =
  "id, codigo_ot, tree_id, tipo_intervencion, subtipo_accion, fecha_programada, responsable, estado, observacion, created_by, created_at, fecha_actualizacion";

export async function insertMaintenanceOrder(
  accessToken: string,
  row: {
    tree_id: string;
    tipo_intervencion: string;
    subtipo_accion: string | null;
    fecha_programada: string | null;
    responsable: string | null;
    observacion: string | null;
  }
): Promise<MaintenanceRow> {
  const supabase = createUserScopedClient(accessToken);
  // `estado` queda en su DEFAULT de schema.sql ('pendiente').
  const { data, error } = await supabase.from("maintenance").insert(row).select(MAINT_COLUMNS).single();
  if (error) throw mapError(error, "guardar la orden de trabajo");
  return data as MaintenanceRow;
}

export async function findMaintenanceByTreeIds(accessToken: string, treeIds: string[]): Promise<MaintenanceRow[]> {
  if (treeIds.length === 0) return [];
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("maintenance")
    .select(MAINT_COLUMNS)
    .in("tree_id", treeIds)
    .order("created_at", { ascending: false });
  if (error) throw mapError(error, "listar órdenes de trabajo");
  return (data ?? []) as MaintenanceRow[];
}

// ---------------------------------------------------------- Incidencias

export interface IncidentRow {
  id: string;
  codigo_incidencia: string | null;
  tree_id: string | null;
  project_id: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  origen_reporte: string | null;
  reportado_por_user_id: string | null;
  observacion: string | null;
  fecha_actualizacion: string | null;
  created_at: string;
}

const INCIDENT_COLUMNS =
  "id, codigo_incidencia, tree_id, project_id, tipo, descripcion, estado, origen_reporte, reportado_por_user_id, observacion, fecha_actualizacion, created_at";

export async function insertIncident(
  accessToken: string,
  row: {
    project_id: string;
    tree_id: string | null;
    tipo: string;
    descripcion: string;
    origen_reporte: string | null;
    reportado_por_user_id: string;
  }
): Promise<IncidentRow> {
  const supabase = createUserScopedClient(accessToken);
  // Estado inicial de INCIDENCIA.estado_incidencia (Excel maestro): Ingresada.
  const { data, error } = await supabase
    .from("incidents")
    .insert({ ...row, estado: "ingresada" })
    .select(INCIDENT_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23503") throw new Error("El árbol no pertenece a este proyecto");
    throw mapError(error, "guardar la incidencia");
  }
  return data as IncidentRow;
}

export async function findIncidentsByProjectId(accessToken: string, projectId: string): Promise<IncidentRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw mapError(error, "listar incidencias");
  return (data ?? []) as IncidentRow[];
}

// ------------------------------------------------- Cambios de estado
// Sin UPDATE para usuario_municipal en RLS (005/008, PR-003 v5.0): el
// servicio exige admin y RLS lo vuelve a garantizar.

export async function findMaintenanceById(accessToken: string, id: string): Promise<MaintenanceRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase.from("maintenance").select(MAINT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw mapError(error, "consultar la orden de trabajo");
  return (data as MaintenanceRow) ?? null;
}

export async function updateMaintenanceState(
  accessToken: string,
  id: string,
  estado: string,
  userId: string
): Promise<MaintenanceRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("maintenance")
    .update({ estado, actualizado_por: userId, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id)
    .select(MAINT_COLUMNS)
    .maybeSingle();
  if (error) throw mapError(error, "actualizar la orden de trabajo");
  return (data as MaintenanceRow) ?? null;
}

export async function findIncidentById(accessToken: string, id: string): Promise<IncidentRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase.from("incidents").select(INCIDENT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw mapError(error, "consultar la incidencia");
  return (data as IncidentRow) ?? null;
}

export async function updateIncidentState(
  accessToken: string,
  id: string,
  estado: string,
  observacion: string | null,
  userId: string
): Promise<IncidentRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("incidents")
    .update({ estado, observacion, actualizado_por: userId, fecha_actualizacion: new Date().toISOString() })
    .eq("id", id)
    .select(INCIDENT_COLUMNS)
    .maybeSingle();
  if (error) throw mapError(error, "actualizar la incidencia");
  return (data as IncidentRow) ?? null;
}
