import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { findTreeById } from "../repositories/tree.repository";
import { listAllProjectTreeRowsForUser, resolveCurrentMeasurement } from "./tree.service";
import { findValidMeasurementsByTreeIds, TreeMeasurementRow } from "../repositories/treeMeasurement.repository";
import { assertAdmin, assertProjectAccess } from "./authorization.service";
import {
  findIncidentsByProjectId,
  findInfrastructureAssessmentsByTreeIds,
  findMaintenanceByTreeIds,
  insertIncident,
  insertInfrastructureAssessment,
  insertMaintenanceOrder,
  InfrastructureAssessmentRow,
  findIncidentById,
  findMaintenanceById,
  updateIncidentState,
  updateMaintenanceState,
} from "../repositories/moduleRecords.repository";
import {
  CreateIncidentBody,
  CreateInfrastructureAssessmentBody,
  CreateMaintenanceOrderBody,
  UpdateIncidentStateBody,
  UpdateMaintenanceStateBody,
} from "../schemas/moduleRecords.schema";
import { INCIDENT_STATES, INFRA_DOMAINS, MAINTENANCE_ACTIONS, MAINTENANCE_STATES } from "./rules/moduleCatalogs";

function rethrow(err: unknown): never {
  const msg = (err as Error)?.message || "";
  if (msg.includes("Árbol no encontrado")) throw new AppError("Árbol no encontrado", 404);
  if (msg.includes("No tiene acceso")) throw new AppError("No tiene acceso a este árbol", 403);
  if (msg.includes("no pertenece")) throw new AppError(msg, 400);
  throw err;
}

async function treeProjectFor(user: AuthenticatedUser, treeId: string, accessToken: string): Promise<string> {
  const tree = await findTreeById(accessToken, treeId);
  if (!tree) throw new AppError("Árbol no encontrado", 404);
  await assertProjectAccess(user, tree.project_id, accessToken);
  return tree.project_id;
}

async function projectTreeIds(user: AuthenticatedUser, projectId: string, accessToken: string): Promise<string[]> {
  // Valida acceso con la misma regla del inventario; incluye árboles sin ubicación.
  const rows = await listAllProjectTreeRowsForUser(user, projectId, accessToken);
  return rows.map((r) => r.id);
}

/** GET /api/catalogs/modules — catálogos de Infraestructura y Mantención. */
export function getModuleCatalogs() {
  return {
    data: {
      maintenance_actions: MAINTENANCE_ACTIONS,
      maintenance_states: MAINTENANCE_STATES,
      incident_states: INCIDENT_STATES,
      infrastructure: INFRA_DOMAINS,
    },
  };
}

// ---------------------------------------------------------------- Infra

export interface InfrastructureAssessmentDTO {
  id: string;
  tree_id: string;
  fecha_evaluacion: string;
  variables: Record<string, string | null>;
  observaciones: string | null;
  inspector_nombre: string | null;
  created_at: string;
}

function infraDTO(row: InfrastructureAssessmentRow): InfrastructureAssessmentDTO {
  return {
    id: row.id,
    tree_id: row.tree_id,
    fecha_evaluacion: row.fecha_evaluacion,
    variables: row.variables,
    observaciones: row.observaciones,
    inspector_nombre: row.user_profiles?.nombre ?? null,
    created_at: row.created_at,
  };
}

/**
 * Registra respuestas observadas por componente. No calcula severidades
 * ni nivel global de conflicto (M04 fuera de este corte).
 */
export async function createInfrastructureAssessmentForUser(
  user: AuthenticatedUser,
  treeId: string,
  body: CreateInfrastructureAssessmentBody,
  accessToken: string
): Promise<{ data: InfrastructureAssessmentDTO }> {
  await treeProjectFor(user, treeId, accessToken);
  try {
    const row = await insertInfrastructureAssessment(accessToken, {
      tree_id: treeId,
      fecha_evaluacion: body.fecha_evaluacion,
      variables: body.variables,
      observaciones: body.observaciones ?? null,
    });
    return { data: infraDTO(row) };
  } catch (err) {
    rethrow(err);
  }
}

export async function listTreeInfrastructureAssessmentsForUser(
  user: AuthenticatedUser,
  treeId: string,
  accessToken: string
): Promise<{ data: InfrastructureAssessmentDTO[] }> {
  await treeProjectFor(user, treeId, accessToken);
  const rows = await findInfrastructureAssessmentsByTreeIds(accessToken, [treeId]);
  return { data: rows.map(infraDTO) };
}

export async function listProjectInfrastructureAssessmentsForUser(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<{ data: InfrastructureAssessmentDTO[] }> {
  const ids = await projectTreeIds(user, projectId, accessToken);
  const rows = await findInfrastructureAssessmentsByTreeIds(accessToken, ids);
  return { data: rows.map(infraDTO) };
}

// ---------------------------------------------------------- Mantención

export async function createMaintenanceOrderForUser(
  user: AuthenticatedUser,
  projectId: string,
  body: CreateMaintenanceOrderBody,
  accessToken: string
) {
  const treeProject = await treeProjectFor(user, body.tree_id, accessToken);
  if (treeProject !== projectId) throw new AppError("El árbol no pertenece a este proyecto", 400);
  try {
    const row = await insertMaintenanceOrder(accessToken, {
      tree_id: body.tree_id,
      tipo_intervencion: body.accion_solicitada,
      subtipo_accion: body.subtipo_accion || null,
      fecha_programada: body.fecha_programada ?? null,
      responsable: body.responsable || null,
      observacion: body.observacion || null,
    });
    return { data: row };
  } catch (err) {
    rethrow(err);
  }
}

export async function listProjectMaintenanceForUser(user: AuthenticatedUser, projectId: string, accessToken: string) {
  const ids = await projectTreeIds(user, projectId, accessToken);
  return { data: await findMaintenanceByTreeIds(accessToken, ids) };
}

// ---------------------------------------------------------- Incidencias

export async function createIncidentForUser(
  user: AuthenticatedUser,
  projectId: string,
  body: CreateIncidentBody,
  accessToken: string
) {
  await assertProjectAccess(user, projectId, accessToken);
  if (body.tree_id) {
    const treeProject = await treeProjectFor(user, body.tree_id, accessToken);
    if (treeProject !== projectId) throw new AppError("El árbol no pertenece a este proyecto", 400);
  }
  try {
    const row = await insertIncident(accessToken, {
      project_id: projectId,
      tree_id: body.tree_id ?? null,
      tipo: body.tipo,
      descripcion: body.descripcion,
      origen_reporte: body.origen_reporte || null,
      reportado_por_user_id: user.id,
    });
    return { data: row };
  } catch (err) {
    rethrow(err);
  }
}

export async function listProjectIncidentsForUser(user: AuthenticatedUser, projectId: string, accessToken: string) {
  await assertProjectAccess(user, projectId, accessToken);
  return { data: await findIncidentsByProjectId(accessToken, projectId) };
}

// ------------------------------------------------- Cambios de estado

/**
 * Cambio de estado de una orden de trabajo. Solo Administrador: PR-003 v5.0
 * no otorga al Usuario municipal gestión de mantenimiento ("consultar
 * mantenimiento"), y RLS no le concede UPDATE.
 */
export async function updateMaintenanceStateForUser(
  user: AuthenticatedUser,
  projectId: string,
  orderId: string,
  body: UpdateMaintenanceStateBody,
  accessToken: string
) {
  assertAdmin(user);
  const order = await findMaintenanceById(accessToken, orderId);
  if (!order) throw new AppError("Orden de trabajo no encontrada", 404);
  const treeProject = await treeProjectFor(user, order.tree_id, accessToken);
  if (treeProject !== projectId) throw new AppError("Orden de trabajo no encontrada", 404);
  const updated = await updateMaintenanceState(accessToken, orderId, body.estado, user.id);
  if (!updated) throw new AppError("No tiene permiso para actualizar esta orden", 403);
  return { data: updated };
}

/**
 * Cambio de estado de una incidencia (con nota de seguimiento opcional que
 * se agrega a la bitácora `observacion`). Solo Administrador: la migración
 * 005 excluye explícitamente UPDATE de incidents para usuario_municipal.
 */
export async function updateIncidentStateForUser(
  user: AuthenticatedUser,
  projectId: string,
  incidentId: string,
  body: UpdateIncidentStateBody,
  accessToken: string
) {
  assertAdmin(user);
  const incident = await findIncidentById(accessToken, incidentId);
  if (!incident || incident.project_id !== projectId) throw new AppError("Incidencia no encontrada", 404);
  const nota = body.observacion?.trim();
  const etiqueta = INCIDENT_STATES.find((s) => s.codigo === body.estado)?.etiqueta ?? body.estado;
  const bitacora = nota
    ? [incident.observacion, `[${new Date().toISOString().slice(0, 10)} · ${etiqueta}] ${nota}`].filter(Boolean).join("\n")
    : incident.observacion;
  const updated = await updateIncidentState(accessToken, incidentId, body.estado, bitacora ?? null, user.id);
  if (!updated) throw new AppError("No tiene permiso para actualizar esta incidencia", 403);
  return { data: updated };
}

// ---------------------------------------------------------- Índices

interface Stat {
  n: number;
  min: number | null;
  promedio: number | null;
  max: number | null;
}

function stat(values: number[]): Stat {
  if (values.length === 0) return { n: 0, min: null, promedio: null, max: null };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    n: values.length,
    min: Math.min(...values),
    promedio: Math.round((sum / values.length) * 100) / 100,
    max: Math.max(...values),
  };
}

/**
 * GET /api/projects/:id/indices — agregados DESCRIPTIVOS del proyecto
 * (conteos, composición por especie, estadísticos de la medición actual).
 * No calcula los índices de la hoja INDICES: "no es implementable ni
 * normativa vigente hasta cerrar CC-016" (docs/registro-cambios.md).
 * La medición actual se resuelve con la regla vigente (INV-1A, Decisión 2):
 * un empate de fecha máxima no se desempata y el árbol queda fuera de los
 * estadísticos. El DAP de árboles polifuste no se agrega (sin fórmula de
 * DAP equivalente aprobada).
 */
export async function getProjectIndicesForUser(user: AuthenticatedUser, projectId: string, accessToken: string) {
  const treeRows = await listAllProjectTreeRowsForUser(user, projectId, accessToken);
  const ids = treeRows.map((r) => r.id);

  const especies = new Map<string, { nombre_cientifico: string; nombre_comun: string | null; n: number }>();
  let sinEspecie = 0;
  for (const r of treeRows) {
    const nc = r.species?.nombre_cientifico;
    if (!nc) {
      sinEspecie++;
      continue;
    }
    const prev = especies.get(nc);
    if (prev) prev.n++;
    else especies.set(nc, { nombre_cientifico: nc, nombre_comun: r.species?.nombre_comun ?? null, n: 1 });
  }

  const rows = await findValidMeasurementsByTreeIds(accessToken, ids);
  const byTree = new Map<string, TreeMeasurementRow[]>();
  for (const r of rows) {
    const list = byTree.get(r.tree_id) ?? [];
    if (list.length < 2) list.push(r);
    byTree.set(r.tree_id, list);
  }

  const alturas: number[] = [];
  const copas: number[] = [];
  const daps: number[] = [];
  let polifuste = 0;
  let empates = 0;
  const claseEdad = new Map<string, number>();
  for (const id of ids) {
    const res = resolveCurrentMeasurement(byTree.get(id) ?? []);
    if (res.medicion_actual_estado === "error_empate_fecha_maxima") {
      empates++;
      continue;
    }
    const m = res.medicion_actual;
    if (!m) continue;
    alturas.push(Number(m.altura_total_m));
    copas.push(Number(m.diametro_copa_m));
    if (m.dap_cm !== null && m.dap_cm !== undefined) daps.push(Number(m.dap_cm));
    else if (m.dap_fustes_cm && m.dap_fustes_cm.length > 0) polifuste++;
    if (m.clase_edad) claseEdad.set(m.clase_edad, (claseEdad.get(m.clase_edad) ?? 0) + 1);
  }

  return {
    data: {
      total_arboles: treeRows.length,
      con_ubicacion: treeRows.filter((r) => r.ubicacion != null).length,
      especies: [...especies.values()].sort((a, b) => b.n - a.n),
      sin_especie: sinEspecie,
      dendrometria: {
        con_medicion_actual: alturas.length,
        empates_fecha_maxima: empates,
        altura_total_m: stat(alturas),
        diametro_copa_m: stat(copas),
        dap_cm_un_fuste: stat(daps),
        polifuste_sin_dap_equivalente: polifuste,
        clase_edad: [...claseEdad.entries()].map(([clase, n]) => ({ clase, n })),
      },
    },
  };
}
