import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { hoyEnChile } from "../../utils/fechaChile";
import { assertProjectRole } from "../authorization.service";
import {
  CrearOrdenTrabajoInspeccionInput,
  OrdenTrabajoInspeccionRow,
  OrdenTrabajoRow,
  SQLSTATE_CREAR_OT,
  SQLSTATE_TRANSICION_OT,
  TransicionarEstadoOtResultado,
  crearOrdenTrabajoInspeccion as crearOrdenTrabajoInspeccionRepo,
  obtenerOrdenTrabajoPorId,
  obtenerPrioridadVigenteDelArbol,
  transicionarEstadoOt,
} from "../../repositories/sivu/workOrder.repository";
import { CrearOrdenTrabajoInspeccionBody, TransicionarOrdenTrabajoBody } from "../../schemas/sivu/workOrder.schema";

/**
 * POST /api/sivu/projects/:id/work-orders — crear una OT de Inspección
 * (#58; D-238, D-244, CC-036). Solo `usuario_municipal` (PR-003/PR-004:
 * mismo rol que crea proyectos/árboles; el Administrador tiene acceso
 * de solo lectura a los datos del proyecto, CC-022).
 *
 * `responsable_accion_id` (Inspector activo y miembro del proyecto,
 * D-244) no es el usuario autenticado — `assertProjectRole` solo
 * verifica al llamador, así que esa validación la hace íntegramente
 * `fn_create_work_order_inspeccion` (018h); este service no la repite
 * (no hay manera de repetirla sin otra consulta redundante a la misma
 * tabla que la función ya consulta).
 */
export async function crearOrdenTrabajoInspeccion(
  user: AuthenticatedUser,
  projectId: string,
  body: CrearOrdenTrabajoInspeccionBody,
  accessToken: string
): Promise<OrdenTrabajoInspeccionRow> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], accessToken);

  let prioridad = body.prioridad;
  if (!prioridad && body.tree_id) {
    const propuesta = await obtenerPrioridadVigenteDelArbol(body.tree_id);
    if (propuesta && propuesta !== "no_determinado") {
      prioridad = propuesta as CrearOrdenTrabajoInspeccionBody["prioridad"];
    }
  }
  if (!prioridad) {
    throw new AppError(
      "prioridad es obligatoria: el árbol no tiene una evaluación vigente desde la cual proponerla (D-238)",
      422
    );
  }

  const input: CrearOrdenTrabajoInspeccionInput = {
    projectId,
    treeId: body.tree_id ?? null,
    incidentId: body.incident_id ?? null,
    accionSolicitada: body.accion_solicitada,
    subtipoAccion: body.subtipo_accion ?? null,
    motivo: body.motivo ?? null,
    prioridad,
    observaciones: body.observaciones ?? null,
    responsableAccionId: body.responsable_accion_id,
    creadoPor: user.id,
    fechaCreacionOt: hoyEnChile(),
  };

  try {
    return await crearOrdenTrabajoInspeccionRepo(input);
  } catch (err: unknown) {
    throw traducirErrorOt(err, SQLSTATE_CREAR_OT);
  }
}

/**
 * PATCH /api/sivu/work-orders/:workOrderId/estado — transición
 * Pendiente→Programada→En ejecución (018g; CC-050). Solo el Inspector
 * responsable asignado — `fn_transition_work_order_estado` es la
 * autoridad final (verifica que `user.id` sea exactamente
 * `responsable_accion_id`); `assertProjectRole` aquí es una capa
 * adicional de defensa (rechaza pronto a quien ni siquiera tiene rol
 * Inspector en el proyecto), no la que decide.
 */
export async function transicionarOrdenTrabajo(
  user: AuthenticatedUser,
  workOrderId: string,
  body: TransicionarOrdenTrabajoBody,
  accessToken: string
): Promise<TransicionarEstadoOtResultado> {
  const ot = await obtenerOrdenTrabajoPorId(workOrderId);
  if (!ot) {
    throw new AppError("La orden de trabajo no existe", 404);
  }
  if (ot.tipo_ot !== "inspeccion") {
    throw new AppError(
      "Esta API todavía no transiciona OT de Mantenimiento (CC-050: se implementa en el #61)",
      422
    );
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  try {
    return await transicionarEstadoOt({
      workOrderId,
      nuevoEstado: body.estado,
      fechaAccionProgramada: body.fecha_accion_programada ?? null,
      usuario: user.id,
    });
  } catch (err: unknown) {
    throw traducirErrorOt(err, SQLSTATE_TRANSICION_OT);
  }
}

/**
 * Traduce un error de la base a un error HTTP. `SV060`/`SV059` → 422
 * (regla de negocio rechazada, igual que `SV046`/`SV057`/`SV058` en el
 * resto de esta fase). Una violación de CHECK que el Zod ya debería
 * haber evitado → 400.
 */
function traducirErrorOt(err: unknown, sqlstate: string): Error {
  if (err instanceof AppError) {
    return err;
  }
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  if (cause === sqlstate) {
    return new AppError(error.message, 422);
  }
  if (cause === "23514") {
    return new AppError(error.message, 400);
  }
  return error;
}

export type { OrdenTrabajoRow };
