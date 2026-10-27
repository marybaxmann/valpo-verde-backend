import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

/**
 * SQLSTATE propio de `fn_create_work_order_inspeccion` (018h): rol,
 * membresía, par tipo/subtipo, árbol/incidencia fuera de proyecto,
 * prioridad inválida, observaciones faltante. El service lo traduce a
 * 422/403 según el caso.
 */
export const SQLSTATE_CREAR_OT = "SV060";

/** SQLSTATE propio de `fn_transition_work_order_estado` (018g). */
export const SQLSTATE_TRANSICION_OT = "SV059";

export interface OrdenTrabajoInspeccionRow {
  id: string;
  codigo_ot: string;
  estado_ot: string;
  fecha_creacion_ot: string;
  project_id: string;
  tree_id: string | null;
  incident_id: string | null;
  accion_solicitada: string;
  subtipo_accion: string | null;
  prioridad: string;
  responsable_accion_id: string;
}

export interface CrearOrdenTrabajoInspeccionInput {
  projectId: string;
  treeId: string | null;
  incidentId: string | null;
  accionSolicitada: string;
  subtipoAccion: string | null;
  motivo: string | null;
  prioridad: string;
  observaciones: string | null;
  responsableAccionId: string;
  creadoPor: string;
  fechaCreacionOt: string;
}

/**
 * Invoca `fn_create_work_order_inspeccion` (migración 018h, #58) con
 * `service_role`. Una sola invocación ya es atómica — mismo patrón que
 * `fn_create_tree_alta`/`fn_save_inspection_draft`.
 */
export async function crearOrdenTrabajoInspeccion(
  input: CrearOrdenTrabajoInspeccionInput
): Promise<OrdenTrabajoInspeccionRow> {
  const { data, error } = await supabaseAdmin.rpc("fn_create_work_order_inspeccion", {
    p_project_id: input.projectId,
    p_tree_id: input.treeId,
    p_incident_id: input.incidentId,
    p_accion_solicitada: input.accionSolicitada,
    p_subtipo_accion: input.subtipoAccion,
    p_motivo: input.motivo,
    p_prioridad: input.prioridad,
    p_observaciones: input.observaciones,
    p_responsable_accion_id: input.responsableAccionId,
    p_creado_por: input.creadoPor,
    p_fecha_creacion_ot: input.fechaCreacionOt,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as OrdenTrabajoInspeccionRow;
}

export interface OrdenTrabajoRow {
  id: string;
  project_id: string;
  tree_id: string | null;
  tipo_ot: string;
  accion_solicitada: string;
  estado_ot: string;
  responsable_accion_id: string | null;
  fecha_creacion_ot: string;
}

/**
 * Lectura directa (sin RPC): el controller necesita `project_id` de la
 * OT antes de poder invocar `assertProjectRole` en el service, y el
 * `tipo_ot` para rechazar pronto una OT de Mantenimiento en los
 * endpoints de Inspección (mensaje claro en vez de esperar el SV058/
 * SV059 de la función). Es una lectura, no escritura: no necesita
 * `service_role` para la coherencia de datos, pero se usa el mismo
 * cliente administrativo que el resto de `repositories/sivu` (RLS de
 * `work_orders` no está entre las 21 tablas con policy de lectura
 * directa por rol aún — ver CC-033).
 */
export async function obtenerOrdenTrabajoPorId(workOrderId: string): Promise<OrdenTrabajoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("work_orders")
    .select("id, project_id, tree_id, tipo_ot, accion_solicitada, estado_ot, responsable_accion_id, fecha_creacion_ot")
    .eq("id", workOrderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data as OrdenTrabajoRow | null) ?? null;
}

export interface TransicionarEstadoOtInput {
  workOrderId: string;
  nuevoEstado: "programada" | "en_ejecucion";
  fechaAccionProgramada: string | null;
  usuario: string;
}

export interface TransicionarEstadoOtResultado {
  work_order_id: string;
  estado_ot: string;
}

interface EvaluacionVigenteRow {
  clasificacion_prioridad_ajustada: string | null;
  clasificacion_prioridad_calculada: string | null;
  created_at: string;
  inspections:
    | { estado_registro: string; work_orders: { estado_ot: string; fecha_completada_ot: string | null } | null }
    | { estado_registro: string; work_orders: { estado_ot: string; fecha_completada_ot: string | null } | null }[]
    | null;
}

/**
 * D-238: "si el árbol tiene una evaluación vigente, proponer por
 * defecto su clasificacion_prioridad". Misma definición de "vigente"
 * que `fn_refresh_tree_current` (schema.sql): inspección no anulada
 * (en la práctica, finalizada — una OT completada no puede tener
 * ninguna inspección en Preguardado, CC-050) de una OT completada, la
 * más reciente por `fecha_completada_ot`. Devuelve `null` si no hay
 * ninguna — el service entonces exige `prioridad` en el body, nunca
 * inventa un valor.
 *
 * Filtrado en TS, no con sintaxis de filtro de PostgREST sobre tablas
 * incrustadas (`inspections.estado_registro=...`): esa sintaxis es
 * frágil de verificar sin una prueba de integración contra la API
 * real; el riesgo de este enfoque es, como máximo, no encontrar una
 * propuesta (el usuario la ingresa a mano) — nunca proponer un valor
 * equivocado.
 *
 * evaluations tiene dos FK hacia inspections (inspection_id y la compuesta
 * con tree_id): sin el nombre de la relación, PostgREST responde PGRST201.
 */
export async function obtenerPrioridadVigenteDelArbol(treeId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select(
      "clasificacion_prioridad_ajustada, clasificacion_prioridad_calculada, created_at, inspections!evaluations_inspection_tree_fkey!inner(estado_registro, work_orders!inner(estado_ot, fecha_completada_ot))"
    )
    .eq("tree_id", treeId);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  const filas = (data ?? []) as unknown as EvaluacionVigenteRow[];
  const vigentes = filas
    .map((fila) => {
      const inspeccion = Array.isArray(fila.inspections) ? fila.inspections[0] : fila.inspections;
      const ot = inspeccion?.work_orders ?? null;
      return { fila, inspeccion, ot };
    })
    .filter(
      ({ inspeccion, ot }) =>
        inspeccion?.estado_registro === "finalizado" && ot?.estado_ot === "completada"
    )
    .sort((a, b) => {
      const fechaA = a.ot?.fecha_completada_ot ?? "";
      const fechaB = b.ot?.fecha_completada_ot ?? "";
      if (fechaA !== fechaB) return fechaA < fechaB ? 1 : -1;
      return a.fila.created_at < b.fila.created_at ? 1 : -1;
    });

  const masReciente = vigentes[0]?.fila;
  if (!masReciente) return null;
  return masReciente.clasificacion_prioridad_ajustada ?? masReciente.clasificacion_prioridad_calculada;
}

/** Invoca `fn_transition_work_order_estado` (migración 018g, #58/CC-050). */
export async function transicionarEstadoOt(
  input: TransicionarEstadoOtInput
): Promise<TransicionarEstadoOtResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_transition_work_order_estado", {
    p_work_order_id: input.workOrderId,
    p_nuevo_estado: input.nuevoEstado,
    p_fecha_accion_programada: input.fechaAccionProgramada,
    p_usuario: input.usuario,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as TransicionarEstadoOtResultado;
}

// ---------------------------------------------------------------------
// Listados de OT (B3, B4; CC-065). Todo se lee con el JWT del usuario
// (PR-018 v6.0): la RLS de la 017 limita las filas a los proyectos donde
// es miembro, como segunda capa de la autorización del service.
// ---------------------------------------------------------------------

export interface OtListadoRow {
  id: string;
  codigo_ot: string | null;
  project_id: string;
  tree_id: string | null;
  tipo_ot: string;
  accion_solicitada: string;
  subtipo_accion: string | null;
  prioridad: string | null;
  estado_ot: string;
  fecha_creacion_ot: string;
  fecha_accion_programada: string | null;
  fecha_completada_ot: string | null;
  responsable_accion_id: string | null;
  requiere_revision_inspector: boolean | null;
}

const OT_LISTADO_COLUMNS =
  "id, codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad, estado_ot, fecha_creacion_ot, fecha_accion_programada, fecha_completada_ot, responsable_accion_id, requiere_revision_inspector";

export interface FiltrosListadoOt {
  projectId?: string;
  /** Solo las OT de este responsable (B4). */
  responsableId?: string;
  tipoOt?: "inspeccion" | "mantenimiento";
  /**
   * B3, Inspector sin `tipo_ot` (CC-065 punto 2): todas las de
   * Mantenimiento más las de Inspección donde es el responsable actual.
   */
  mantenimientoOInspeccionDe?: string;
  estados: readonly string[];
  limit: number;
  offset: number;
}

/**
 * Orden: `fecha_accion_programada` ascendente (las vacías al final) y
 * después `codigo_ot`. Devuelve también el total, para la paginación.
 */
export async function listarOrdenesTrabajo(
  accessToken: string,
  filtros: FiltrosListadoOt
): Promise<{ filas: OtListadoRow[]; total: number }> {
  let query = createUserScopedClient(accessToken)
    .from("work_orders")
    .select(OT_LISTADO_COLUMNS, { count: "exact" })
    .in("estado_ot", [...filtros.estados]);

  if (filtros.projectId) query = query.eq("project_id", filtros.projectId);
  if (filtros.responsableId) query = query.eq("responsable_accion_id", filtros.responsableId);
  if (filtros.tipoOt) query = query.eq("tipo_ot", filtros.tipoOt);
  if (filtros.mantenimientoOInspeccionDe) {
    query = query.or(
      `tipo_ot.eq.mantenimiento,and(tipo_ot.eq.inspeccion,responsable_accion_id.eq.${filtros.mantenimientoOInspeccionDe})`
    );
  }

  const { data, error, count } = await query
    .order("fecha_accion_programada", { ascending: true, nullsFirst: false })
    .order("codigo_ot", { ascending: true })
    .range(filtros.offset, filtros.offset + filtros.limit - 1);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return { filas: (data ?? []) as unknown as OtListadoRow[], total: count ?? 0 };
}

export interface ArbolDeOtRow {
  id: string;
  tree_code: string;
  nombre_comun: string | null;
  especie_cientifica: string | null;
  ubicacion_descriptiva: string | null;
  /** `ubicacion::geometry`: PostgREST lo devuelve como GeoJSON (Point). */
  ubicacion: { type: "Point"; coordinates: [number, number] } | null;
}

/** Árboles de un listado de OT, con su ubicación (`trees.ubicacion`) para el minimapa. */
export async function obtenerArbolesDeOts(accessToken: string, treeIds: readonly string[]): Promise<ArbolDeOtRow[]> {
  if (treeIds.length === 0) return [];
  const { data, error } = await createUserScopedClient(accessToken)
    .from("trees")
    .select("id, tree_code, nombre_comun, especie_cientifica, ubicacion_descriptiva, ubicacion::geometry")
    .in("id", [...treeIds]);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data ?? []) as unknown as ArbolDeOtRow[];
}

export async function obtenerProyectosDeOts(
  accessToken: string,
  projectIds: readonly string[]
): Promise<Array<{ id: string; nombre_proyecto: string }>> {
  if (projectIds.length === 0) return [];
  const { data, error } = await createUserScopedClient(accessToken)
    .from("projects")
    .select("id, nombre_proyecto")
    .in("id", [...projectIds]);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data ?? []) as Array<{ id: string; nombre_proyecto: string }>;
}

/**
 * `fn_miembros_proyecto` (024; CC-065 punto 6): id, nombre y rol de los
 * miembros del proyecto, solo si quien llama (por su JWT) es miembro
 * activo o Administrador.
 */
export async function obtenerMiembrosDeProyecto(
  accessToken: string,
  projectId: string
): Promise<Array<{ id: string; nombre: string | null; rol: string }>> {
  const { data, error } = await createUserScopedClient(accessToken).rpc("fn_miembros_proyecto", {
    p_project_id: projectId,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data ?? []) as Array<{ id: string; nombre: string | null; rol: string }>;
}
