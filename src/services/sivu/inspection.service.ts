import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { hoyEnChile } from "../../utils/fechaChile";
import { assertProjectRole } from "../authorization.service";
import { RULE_VERSION } from "../rules/engine/version";
import { calcularDapEquivalenteCm } from "../rules/engine/variables-calculo";
import {
  BorradorInspeccionResultado,
  CamposArbol,
  SQLSTATE_ALTA_ARBOL,
  SQLSTATE_BORRADOR_INSPECCION,
  guardarBorradorInspeccion as guardarBorradorInspeccionRepo,
  obtenerInspeccionPorId,
} from "../../repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import { CrearBorradorInspeccionBody, GuardarBorradorInspeccionBody } from "../../schemas/sivu/inspeccion.schema";

/**
 * POST /api/sivu/work-orders/:workOrderId/inspections — primer
 * guardado de una inspección (#58; CC-048/CC-050). Solo el Inspector
 * responsable asignado — `fn_save_inspection_draft` (018e/018f) es la
 * autoridad final; `assertProjectRole` aquí es defensa adicional, no
 * la que decide.
 *
 * Árbol nuevo en Levantamiento (CC-052/018f) fuera de alcance: si la
 * OT es de Levantamiento, exige `tree_id` de un árbol YA existente del
 * mismo proyecto (D-193) en el body — el endpoint para crear uno nuevo
 * queda pendiente de la búsqueda de árboles cercanos.
 */
export async function crearBorradorInspeccion(
  user: AuthenticatedUser,
  workOrderId: string,
  body: CrearBorradorInspeccionBody,
  accessToken: string
): Promise<BorradorInspeccionResultado> {
  const ot = await obtenerOrdenTrabajoPorId(workOrderId);
  if (!ot) {
    throw new AppError("La orden de trabajo no existe", 404);
  }
  if (ot.tipo_ot !== "inspeccion") {
    throw new AppError("La orden de trabajo no es de tipo Inspección", 422);
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  const treeId = resolverTreeId(ot.tree_id, ot.accion_solicitada, body.tree_id);
  const fecha = hoyEnChile();

  try {
    return await guardarBorradorInspeccionRepo({
      inspectionId: null,
      workOrderId,
      treeId,
      inspector: user.id,
      fechaInspeccion: fecha,
      fechaRegistro: fecha,
      ruleVersion: RULE_VERSION,
      tipoInspeccionRealizada: body.tipo_inspeccion_realizada,
      subtipoInspeccion: body.subtipo_inspeccion ?? null,
      metodoInstrumental: body.metodo_instrumental ?? null,
      resultadoGeneral: body.resultado_general ?? null,
      requiereMantenimiento: body.requiere_mantenimiento ?? null,
      observaciones: body.observaciones ?? null,
      registradoPor: user.id,
      variables: body.variables,
      ...camposArbolConDap(body.campos_arbol ?? {}),
    });
  } catch (err: unknown) {
    throw traducirErrorBorrador(err);
  }
}

/**
 * PATCH /api/sivu/inspections/:inspectionId — guardados siguientes.
 * El body trae el estado COMPLETO del borrador (018e: nunca un
 * delta) — `work_order_id`/`tree_id`/`inspector` se leen de la fila
 * existente, nunca del body.
 */
export async function guardarBorradorInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: GuardarBorradorInspeccionBody,
  accessToken: string
): Promise<BorradorInspeccionResultado> {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) {
    throw new AppError("La inspección no existe", 404);
  }

  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) {
    throw new AppError("La orden de trabajo de esta inspección no existe", 404);
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  try {
    return await guardarBorradorInspeccionRepo({
      inspectionId,
      workOrderId: inspeccion.work_order_id,
      treeId: inspeccion.tree_id,
      inspector: inspeccion.inspector ?? user.id,
      fechaInspeccion: inspeccion.fecha_inspeccion,
      fechaRegistro: inspeccion.fecha_registro ?? hoyEnChile(),
      ruleVersion: RULE_VERSION,
      tipoInspeccionRealizada: body.tipo_inspeccion_realizada,
      subtipoInspeccion: body.subtipo_inspeccion ?? null,
      metodoInstrumental: body.metodo_instrumental ?? null,
      resultadoGeneral: body.resultado_general ?? null,
      requiereMantenimiento: body.requiere_mantenimiento ?? null,
      observaciones: body.observaciones ?? null,
      registradoPor: user.id,
      variables: body.variables,
      ...camposArbolConDap(body.campos_arbol ?? {}),
    });
  } catch (err: unknown) {
    throw traducirErrorBorrador(err);
  }
}

/**
 * DAP de un árbol multifustal (D-18; CC-056 decisión n): con
 * `multifustal` = Sí, `numero_fustes` y `dap_fustes_cm`, el backend
 * calcula `dap_cm` y lo registra en el `tree_data_versions` de esta
 * inspección (así queda vigente al completar la OT, como cualquier
 * campo registrado). El Zod ya rechazó las combinaciones inválidas;
 * con fustes o diámetros todavía sin registrar no se calcula nada y
 * la completitud los informa como faltantes.
 *
 * Se calcula desde los diámetros redondeados a 2 decimales y se
 * redondea el resultado igual, como los guarda `NUMERIC(6,2)`: el valor
 * que se usa después (tutorado, motor) es el mismo que queda en la base.
 */
function camposArbolConDap(camposArbol: CamposArbol): { camposArbol: CamposArbol; camposRegistradosArbol: string[] } {
  const camposRegistradosArbol = Object.keys(camposArbol);
  if (
    camposArbol.multifustal !== true ||
    camposArbol.numero_fustes === undefined ||
    camposArbol.numero_fustes === null ||
    camposArbol.dap_fustes_cm === undefined ||
    camposArbol.dap_fustes_cm === null
  ) {
    return { camposArbol, camposRegistradosArbol };
  }
  const resultado = calcularDapEquivalenteCm({
    numero_fustes: camposArbol.numero_fustes,
    dap_fustes_cm: camposArbol.dap_fustes_cm.map(redondearA2),
  });
  if (resultado.valor === null) {
    throw new AppError(`No se pudo calcular dap_cm: ${resultado.motivo}`, 400);
  }
  return {
    camposArbol: { ...camposArbol, dap_cm: redondearA2(resultado.valor) },
    camposRegistradosArbol: camposRegistradosArbol.includes("dap_cm")
      ? camposRegistradosArbol
      : [...camposRegistradosArbol, "dap_cm"],
  };
}

function redondearA2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Resuelve el árbol de la inspección: el de la OT, salvo Levantamiento
 * (D-193), donde el body debe traer un árbol EXISTENTE del mismo
 * proyecto (la función SQL valida la coherencia de proyecto; crear uno
 * nuevo, CC-052/018f, queda fuera de este endpoint).
 */
function resolverTreeId(otTreeId: string | null, accionSolicitada: string, bodyTreeId: string | undefined): string {
  if (otTreeId !== null) {
    if (bodyTreeId !== undefined && bodyTreeId !== otTreeId) {
      throw new AppError("tree_id no coincide con el árbol de la orden de trabajo", 422);
    }
    return otTreeId;
  }
  if (accionSolicitada !== "levantamiento") {
    throw new AppError("La orden de trabajo no tiene un árbol asignado", 422);
  }
  if (!bodyTreeId) {
    throw new AppError(
      "tree_id es obligatorio: seleccione un árbol existente del proyecto (crear uno nuevo durante un Levantamiento todavía no está disponible)",
      422
    );
  }
  return bodyTreeId;
}

function traducirErrorBorrador(err: unknown): Error {
  if (err instanceof AppError) {
    return err;
  }
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  if (cause === SQLSTATE_BORRADOR_INSPECCION || cause === SQLSTATE_ALTA_ARBOL) {
    return new AppError(error.message, 422);
  }
  if (cause === "23514") {
    return new AppError(error.message, 400);
  }
  return error;
}
