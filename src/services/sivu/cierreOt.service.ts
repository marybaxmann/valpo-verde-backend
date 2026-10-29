import { env } from "../../config/env";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectRole } from "../authorization.service";
import {
  AjusteRegistradoRow,
  EvaluacionVigentePayload,
  SQLSTATE_CANCELAR_OT,
  SQLSTATE_COMPLETAR_OT,
  SQLSTATE_COMPOSICION_CAMBIO,
  SQLSTATE_ANULAR_INSPECCION,
  SQLSTATE_REASIGNAR_OT,
  anularInspeccion,
  cancelarOt,
  completarOt,
  listarAjustesDeInspecciones,
  listarInspeccionesFinalizadasDeOt,
  obtenerComposicionPrevia,
  obtenerComposicionSinInspeccion,
  obtenerUltimaInspeccionValidaSin,
  reasignarOt,
} from "../../repositories/sivu/cierreOt.repository";
import { OrdenTrabajoRow, obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import { obtenerInspeccionPorId } from "../../repositories/sivu/inspection.repository";
import { AjusteVigente, AjustesEntrada, ensamblarResultadoVigente } from "../rules/engine/ensamblaje";
import { componerVariablesCalculo } from "./finalizacion.service";

/** Intentos ante SV068: la composición cambió entre la lectura y la escritura. */
const INTENTOS_COMPLETAR = 2;

async function otDeInspeccion(workOrderId: string): Promise<OrdenTrabajoRow> {
  const ot = await obtenerOrdenTrabajoPorId(workOrderId);
  if (!ot) throw new AppError("La orden de trabajo no existe", 404);
  if (ot.tipo_ot !== "inspeccion") {
    throw new AppError("Esta API todavía no cierra OT de Mantenimiento (CC-050: se implementa en el #61)", 422);
  }
  return ot;
}

/**
 * Ajustes candidatos (diseño Fase 3, §3.10 bis; CC-040 d): los de la
 * inspección cuya OT dispara el recálculo — la última finalizada del
 * árbol en esta OT. Por campo, el más reciente. El motor decide si se
 * mantienen o se descartan.
 */
function ajustesDeLaInspeccion(ajustes: readonly AjusteRegistradoRow[], inspectionId: string): AjustesEntrada {
  const entrada: AjustesEntrada = {};
  const clave = { clasificacion_riesgo: "riesgo", clasificacion_infraestructura: "infraestructura", clasificacion_prioridad: "prioridad" } as const;
  const propios = ajustes
    .filter((a) => a.inspection_id === inspectionId)
    .sort((a, b) => a.fecha_ajuste.localeCompare(b.fecha_ajuste));
  for (const a of propios) {
    const vigente: AjusteVigente = {
      valorAjustado: a.valor_ajustado,
      // Sin valor calculado registrado, el motor no puede confirmar el ajuste: lo descarta y marca revisión (CC-040 d).
      valorCalculadoEnElAjuste: a.valor_calculado ?? "",
      adjustmentId: a.id,
      inspectionId: a.inspection_id,
    };
    (entrada as Record<string, AjusteVigente>)[clave[a.campo]] = vigente;
  }
  return entrada;
}

async function prepararEvaluaciones(workOrderId: string): Promise<EvaluacionVigentePayload[]> {
  const inspecciones = await listarInspeccionesFinalizadasDeOt(workOrderId);
  if (inspecciones.length === 0) {
    throw new AppError("No se puede completar la orden de trabajo: debe tener al menos una inspección Finalizada (CC-050)", 422);
  }
  const ultimaPorArbol = new Map<string, (typeof inspecciones)[number]>();
  for (const i of [...inspecciones].sort(
    (a, b) => b.fecha_inspeccion.localeCompare(a.fecha_inspeccion) || b.created_at.localeCompare(a.created_at)
  )) {
    if (!ultimaPorArbol.has(i.tree_id)) ultimaPorArbol.set(i.tree_id, i);
  }
  const ajustes = await listarAjustesDeInspecciones([...ultimaPorArbol.values()].map((i) => i.id));

  return Promise.all(
    [...ultimaPorArbol.entries()].map(async ([treeId, inspeccion]) => {
      const composicion = await obtenerComposicionPrevia(treeId, workOrderId);
      const { entradas_vigentes: _entradas, ...resultado } = ensamblarResultadoVigente({
        variablesCalculo: componerVariablesCalculo(composicion.entradas_vigentes, {}),
        ajustes: ajustesDeLaInspeccion(ajustes, inspeccion.id),
        motorCommit: env.MOTOR_COMMIT,
      });
      return { tree_id: treeId, composicion, resultado };
    })
  );
}

/**
 * POST /api/sivu/work-orders/:workOrderId/completar (#60; CC-050;
 * ADR-017 v1.2). Solo el Usuario municipal miembro del proyecto. La
 * fecha la asigna el Sistema (D-242). Los datos de la OT pasan a ser
 * vigentes y se guarda la evaluación vigente de cada árbol.
 */
export async function completarOrdenTrabajo(user: AuthenticatedUser, workOrderId: string, accessToken: string) {
  const ot = await otDeInspeccion(workOrderId);
  await assertProjectRole(user, ot.project_id, ["usuario_municipal"], accessToken);
  if (ot.estado_ot !== "en_ejecucion") {
    throw new AppError(`La orden de trabajo no está En ejecución (estado actual: ${ot.estado_ot})`, 422);
  }

  for (let intento = 1; ; intento++) {
    const evaluaciones = await prepararEvaluaciones(workOrderId);
    try {
      return await completarOt(workOrderId, user.id, evaluaciones);
    } catch (err: unknown) {
      const cause = (err as { cause?: unknown }).cause;
      if (cause === SQLSTATE_COMPOSICION_CAMBIO && intento < INTENTOS_COMPLETAR) continue;
      throw traducirError(err, SQLSTATE_COMPLETAR_OT);
    }
  }
}

/** POST /api/sivu/work-orders/:workOrderId/cancelar (CC-050). Solo el Usuario municipal; motivo obligatorio. */
export async function cancelarOrdenTrabajo(user: AuthenticatedUser, workOrderId: string, motivo: string, accessToken: string) {
  const ot = await otDeInspeccion(workOrderId);
  await assertProjectRole(user, ot.project_id, ["usuario_municipal"], accessToken);
  try {
    return await cancelarOt(workOrderId, motivo, user.id);
  } catch (err: unknown) {
    throw traducirError(err, SQLSTATE_CANCELAR_OT);
  }
}

/** PATCH /api/sivu/work-orders/:workOrderId/responsable (CC-050; D-244). Solo el Usuario municipal. */
export async function reasignarOrdenTrabajo(
  user: AuthenticatedUser,
  workOrderId: string,
  nuevoResponsableId: string,
  accessToken: string
) {
  const ot = await otDeInspeccion(workOrderId);
  await assertProjectRole(user, ot.project_id, ["usuario_municipal"], accessToken);
  try {
    return await reasignarOt(workOrderId, nuevoResponsableId, user.id);
  } catch (err: unknown) {
    throw traducirError(err, SQLSTATE_REASIGNAR_OT);
  }
}

/**
 * POST /api/sivu/inspections/:inspectionId/anular (CC-067; CC-045 a;
 * ADR-017 v1.2). Solo el Usuario municipal miembro del proyecto anula
 * una inspección Finalizada, con motivo. Si su OT está completada, la
 * vigente se recalcula como si la inspección no hubiera existido: los
 * ajustes candidatos son los de la inspección válida que queda como la
 * última; los de la anulada nunca aplican.
 */
export async function anularInspeccionFinalizada(
  user: AuthenticatedUser,
  inspectionId: string,
  motivo: string,
  accessToken: string
) {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) throw new AppError("La inspección no existe", 404);
  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) throw new AppError("La orden de trabajo de la inspección no existe", 404);
  await assertProjectRole(user, ot.project_id, ["usuario_municipal"], accessToken);
  if (inspeccion.estado_registro !== "finalizado") {
    throw new AppError(`Solo se anula una inspección Finalizada (estado actual: ${inspeccion.estado_registro}) (D-209)`, 422);
  }

  for (let intento = 1; ; intento++) {
    let evaluacion: Omit<EvaluacionVigentePayload, "tree_id"> | null = null;
    if (ot.estado_ot === "completada") {
      const [composicion, ultimaValida] = await Promise.all([
        obtenerComposicionSinInspeccion(inspeccion.tree_id, inspectionId),
        obtenerUltimaInspeccionValidaSin(inspeccion.tree_id, inspectionId),
      ]);
      const ajustes = ultimaValida ? await listarAjustesDeInspecciones([ultimaValida]) : [];
      const { entradas_vigentes: _entradas, ...resultado } = ensamblarResultadoVigente({
        variablesCalculo: componerVariablesCalculo(composicion.entradas_vigentes, {}),
        ajustes: ultimaValida ? ajustesDeLaInspeccion(ajustes, ultimaValida) : {},
        inspeccionAnuladaId: inspectionId,
        motorCommit: env.MOTOR_COMMIT,
      });
      evaluacion = { composicion, resultado };
    }
    try {
      return await anularInspeccion(inspectionId, user.id, motivo, evaluacion);
    } catch (err: unknown) {
      const cause = (err as { cause?: unknown }).cause;
      if (cause === SQLSTATE_COMPOSICION_CAMBIO && intento < INTENTOS_COMPLETAR) continue;
      throw traducirError(err, SQLSTATE_ANULAR_INSPECCION);
    }
  }
}

/** Regla rechazada por la función → 422; la composición cambió de nuevo → 409; CHECK → 400. */
function traducirError(err: unknown, sqlstate: string): Error {
  if (err instanceof AppError) return err;
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;
  if (cause === sqlstate) return new AppError(error.message, 422);
  if (cause === SQLSTATE_COMPOSICION_CAMBIO) return new AppError(error.message, 409);
  if (cause === "23514") return new AppError(error.message, 400);
  return error;
}
