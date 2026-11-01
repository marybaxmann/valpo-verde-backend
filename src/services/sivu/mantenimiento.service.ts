import { randomUUID } from "crypto";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import { CATALOGO } from "../rules/engine/catalogs";
import { ArchivoSubido, verificarYProcesarFoto } from "./photo.service";
import { hoyEnChile } from "./proximasInspecciones.service";
import { eliminarArchivoDeStorage, generarUrlFirmada, subirArchivoAStorage } from "../../repositories/sivu/photo.repository";
import { obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import {
  EjecucionRow,
  cambiarInspectorRevisor,
  crearOtMantenimiento,
  listarEjecuciones,
  registrarEjecucion,
  revisarEjecucion,
} from "../../repositories/sivu/mantenimiento.repository";
import { CrearOtMantenimientoBody, RegistrarEjecucionBody, RevisarEjecucionBody } from "../../schemas/sivu/mantenimiento.schema";
import { listarOtsEnRevision } from "./listadoOt.service";

/**
 * Mantenimiento (#61; PR-020 v1.1; CC-064 b, c y p; migración 031).
 * Las funciones de la base son la autoridad final (rol, membresía,
 * estados y reglas del Excel); el service repite el control de rol para
 * responder pronto y sube o borra las fotos.
 */

type Valor = { codigo: string; etiqueta: string | null } | null;
function conEtiqueta(catalogo: string, codigo: string | null): Valor {
  if (codigo === null) return null;
  return { codigo, etiqueta: CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo)?.etiqueta ?? null };
}

/** SV072 a SV074 (031) → 422; proyecto cerrado → 409. */
function traducir(err: unknown): Error {
  if (err instanceof AppError) return err;
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;
  if (cause === "SV072" || cause === "SV073" || cause === "SV074" || cause === "SV059") return new AppError(error.message, 422);
  if (/está cerrado/.test(error.message)) return new AppError("El proyecto está cerrado: solo consulta", 409);
  return error;
}

async function otDeMantenimiento(workOrderId: string) {
  const ot = await obtenerOrdenTrabajoPorId(workOrderId);
  if (!ot) throw new AppError("La orden de trabajo no existe", 404);
  if (ot.tipo_ot !== "mantenimiento") throw new AppError("La orden de trabajo no es de Mantenimiento", 422);
  return ot;
}

/** POST /api/sivu/projects/:id/work-orders/mantenimiento — solo Usuario municipal. */
export async function crearOrdenMantenimiento(user: AuthenticatedUser, projectId: string, body: CrearOtMantenimientoBody, token: string) {
  await assertProjectRole(user, projectId, ["usuario_municipal"], token);
  try {
    return await crearOtMantenimiento({
      projectId,
      treeId: body.tree_id,
      incidentId: body.incident_id ?? null,
      accionSolicitada: body.accion_solicitada,
      subtipoAccion: body.subtipo_accion ?? null,
      motivo: body.motivo ?? null,
      prioridad: body.prioridad,
      observaciones: body.observaciones ?? null,
      responsableAccionId: body.responsable_accion_id,
      requiereRevisionInspector: body.requiere_revision_inspector ?? null,
      inspectorRevisorId: body.inspector_revisor_id ?? null,
      creadoPor: user.id,
      fechaCreacionOt: hoyEnChile(),
    });
  } catch (err) {
    throw traducir(err);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/revisor — solo Usuario municipal. */
export async function cambiarRevisor(user: AuthenticatedUser, workOrderId: string, nuevoRevisorId: string, token: string) {
  const ot = await otDeMantenimiento(workOrderId);
  await assertProjectRole(user, ot.project_id, ["usuario_municipal"], token);
  try {
    return await cambiarInspectorRevisor(workOrderId, nuevoRevisorId, user.id);
  } catch (err) {
    throw traducir(err);
  }
}

/** Ejecución con sus fotos (enlaces firmados de 10 minutos, CC-049). */
async function ejecucion(f: EjecucionRow) {
  return {
    id: f.id,
    codigo_mantenimiento: f.codigo_mantenimiento,
    work_order_id: f.work_order_id,
    fecha_ejecucion: f.fecha_ejecucion,
    ejecutado_por: f.ejecutado_por,
    accion_ejecutada: conEtiqueta("accion_mantenimiento", f.accion_ejecutada),
    subtipo_ejecutado: conEtiqueta("subtipo_mantenimiento", f.subtipo_ejecutado),
    resultado: conEtiqueta("resultado_mantenimiento", f.resultado),
    observaciones: f.observaciones,
    requiere_seguimiento: f.requiere_seguimiento,
    fecha_seguimiento: f.fecha_seguimiento,
    estado_revision: conEtiqueta("estado_revision", f.estado_revision),
    revisado_por: f.revisado_por,
    fecha_revision: f.fecha_revision,
    observaciones_revision: f.observaciones_revision,
    requiere_correccion: f.requiere_correccion,
    fecha_limite_correccion: f.fecha_limite_correccion,
    created_at: f.created_at,
    fotos: await Promise.all((f.photos ?? []).map(async (p) => ({ id: p.id, url: await generarUrlFirmada(p.storage_path), created_at: p.created_at }))),
  };
}

/** GET /api/sivu/work-orders/:workOrderId/ejecuciones — todos los miembros; historial completo (también las rechazadas). */
export async function listarEjecucionesDeOt(user: AuthenticatedUser, workOrderId: string, token: string) {
  const ot = await otDeMantenimiento(workOrderId);
  await assertProjectAccess(user, ot.project_id, token);
  return Promise.all((await listarEjecuciones(token, [workOrderId])).map(ejecucion));
}

/**
 * POST /api/sivu/work-orders/:workOrderId/ejecuciones — el Encargado de
 * mantención responsable registra la ejecución y su evidencia (D-224).
 * Las fotos se verifican (JPG/PNG por su contenido) y se suben antes de
 * llamar a la base; si la base rechaza, se borran. No se recodifican:
 * son evidencia de la ejecución, como las del Inspector (CC-049).
 */
export async function registrarEjecucionMantenimiento(
  user: AuthenticatedUser,
  workOrderId: string,
  body: RegistrarEjecucionBody,
  archivos: ArchivoSubido[],
  token: string
) {
  const ot = await otDeMantenimiento(workOrderId);
  await assertProjectRole(user, ot.project_id, ["encargado_mantencion"], token);
  if (ot.responsable_accion_id !== user.id) {
    throw new AppError("Solo el Encargado de mantención responsable registra la ejecución (D-217)", 403);
  }
  if (archivos.length === 0) throw new AppError("Debe adjuntar al menos una fotografía de la ejecución (D-224)", 400);

  const procesadas = await Promise.all(archivos.map((a) => verificarYProcesarFoto(a.buffer, false)));
  const fotos: Array<{ id: string; storage_path: string }> = [];
  try {
    for (const p of procesadas) {
      const id = randomUUID();
      const storagePath = `${ot.project_id}/${ot.tree_id}/mantenimiento/${id}.${p.extension}`;
      await subirArchivoAStorage(storagePath, p.buffer, p.contentType);
      fotos.push({ id, storage_path: storagePath });
    }
    return await registrarEjecucion({
      workOrderId,
      usuario: user.id,
      fechaEjecucion: body.fecha_ejecucion,
      accionEjecutada: body.accion_ejecutada,
      subtipoEjecutado: body.subtipo_ejecutado ?? null,
      resultado: body.resultado,
      observaciones: body.observaciones ?? null,
      requiereSeguimiento: body.requiere_seguimiento,
      fechaSeguimiento: body.fecha_seguimiento ?? null,
      fotos,
      hoy: hoyEnChile(),
    });
  } catch (err) {
    await Promise.all(fotos.map((f) => eliminarArchivoDeStorage(f.storage_path)));
    throw traducir(err);
  }
}

/**
 * PATCH /api/sivu/work-orders/:workOrderId/ejecuciones/:recordId/revision —
 * solo el Inspector revisor asignado (decisión de Valej, 2026-11-01).
 * Aprobar exige resultado completo y completa la OT; con Tala o
 * Retiro_tocón cambia la presencia (D-28). Rechazar deja la OT En
 * ejecución para que el Encargado registre la corrección (registro nuevo).
 */
export async function revisarEjecucionMantenimiento(
  user: AuthenticatedUser,
  workOrderId: string,
  recordId: string,
  body: RevisarEjecucionBody,
  token: string
) {
  const ot = await otDeMantenimiento(workOrderId);
  await assertProjectRole(user, ot.project_id, ["inspector"], token);
  const registros = await listarEjecuciones(token, [workOrderId]);
  if (!registros.some((r) => r.id === recordId)) throw new AppError("La ejecución no pertenece a esta orden de trabajo", 404);
  try {
    return await revisarEjecucion({
      recordId,
      usuario: user.id,
      estadoRevision: body.estado_revision,
      observacionesRevision: body.observaciones_revision ?? null,
      requiereCorreccion: body.requiere_correccion,
      fechaLimiteCorreccion: body.fecha_limite_correccion ?? null,
      hoy: hoyEnChile(),
    });
  } catch (err) {
    throw traducir(err);
  }
}

/**
 * GET /api/sivu/work-orders/revisiones — «Revisiones de mantenimiento» del
 * Inspector (CC-064 b): sus OT como revisor, cada una con la ejecución
 * pendiente de revisión (o null). `soloPendientes`: solo las que tienen una.
 */
export async function listarRevisiones(user: AuthenticatedUser, opciones: { projectId?: string; soloPendientes: boolean }, token: string) {
  if (user.role !== "inspector") throw new AppError("Las revisiones de mantenimiento son del Inspector (CC-064 b)", 403);
  const ots = await listarOtsEnRevision(user, { projectId: opciones.projectId }, token);
  const pendientes = (await listarEjecuciones(token, ots.map((o) => o.id))).filter((r) => r.estado_revision === "pendiente_revision");
  const pendientePorOt = new Map(pendientes.map((r) => [r.work_order_id, r]));
  const filas = await Promise.all(
    ots.map(async (o) => {
      const p = pendientePorOt.get(o.id);
      return { ...o, ejecucion_pendiente: p ? await ejecucion(p) : null };
    })
  );
  return filas.filter((f) => !opciones.soloPendientes || f.ejecucion_pendiente !== null);
}
