import { supabaseAdmin } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Completar, cancelar y reasignar una OT de Inspección (#60; CC-050;
// ADR-017 v1.2; migración 025). Escrituras y lecturas que las preparan,
// con la credencial de servicio (PR-018 v6.0, excepción de lecturas
// internas): la autorización la hace el service y la repite la función.
// ---------------------------------------------------------------------------

export const SQLSTATE_COMPLETAR_OT = "SV065";
export const SQLSTATE_CANCELAR_OT = "SV066";
export const SQLSTATE_REASIGNAR_OT = "SV067";
export const SQLSTATE_COMPOSICION_CAMBIO = "SV068";

/** Lo que devuelve `fn_entradas_vigentes_previas`. */
export interface ComposicionVigente {
  entradas_vigentes: Record<string, unknown>;
  origen_por_campo: Record<string, string>;
}

export interface InspeccionFinalizadaDeOt {
  id: string;
  tree_id: string;
  fecha_inspeccion: string;
  created_at: string;
}

export interface AjusteRegistradoRow {
  id: string;
  campo: "clasificacion_riesgo" | "clasificacion_infraestructura" | "clasificacion_prioridad";
  valor_calculado: string | null;
  valor_ajustado: string;
  fecha_ajuste: string;
  inspection_id: string;
}

function lanzar(error: { message: string; code: string }): never {
  throw new Error(error.message, { cause: error.code });
}

/** Inspecciones finalizadas de la OT (una por árbol en una OT estándar; varias en Levantamiento). */
export async function listarInspeccionesFinalizadasDeOt(workOrderId: string): Promise<InspeccionFinalizadaDeOt[]> {
  const { data, error } = await supabaseAdmin
    .from("inspections")
    .select("id, tree_id, fecha_inspeccion, created_at")
    .eq("work_order_id", workOrderId)
    .eq("estado_registro", "finalizado");
  if (error) lanzar(error);
  return (data ?? []) as InspeccionFinalizadaDeOt[];
}

/** Composición que quedaría vigente con la OT completada hoy (ADR-017 v1.2). */
export async function obtenerComposicionPrevia(treeId: string, workOrderId: string): Promise<ComposicionVigente> {
  const { data, error } = await supabaseAdmin.rpc("fn_entradas_vigentes_previas", {
    p_tree_id: treeId,
    p_work_order_id: workOrderId,
  });
  if (error) lanzar(error);
  return data as ComposicionVigente;
}

/** Ajustes del Inspector (classification_adjustments) de las inspecciones dadas. */
export async function listarAjustesDeInspecciones(inspectionIds: readonly string[]): Promise<AjusteRegistradoRow[]> {
  if (inspectionIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("classification_adjustments")
    .select("id, campo, valor_calculado, valor_ajustado, fecha_ajuste, evaluations!inner(inspection_id)")
    .in("evaluations.inspection_id", [...inspectionIds]);
  if (error) lanzar(error);
  return ((data ?? []) as unknown as Array<Omit<AjusteRegistradoRow, "inspection_id"> & { evaluations: { inspection_id: string } }>).map(
    ({ evaluations, ...fila }) => ({ ...fila, inspection_id: evaluations.inspection_id })
  );
}

export interface EvaluacionVigentePayload {
  tree_id: string;
  composicion: ComposicionVigente;
  resultado: Record<string, unknown>;
}

export async function completarOt(workOrderId: string, usuario: string, evaluaciones: EvaluacionVigentePayload[]) {
  const { data, error } = await supabaseAdmin.rpc("fn_complete_work_order_inspeccion", {
    p_work_order_id: workOrderId,
    p_usuario: usuario,
    p_evaluaciones: evaluaciones,
  });
  if (error) lanzar(error);
  return data as { work_order_id: string; estado_ot: "completada"; fecha_completada_ot: string; tree_ids: string[] };
}

export async function cancelarOt(workOrderId: string, motivo: string, usuario: string) {
  const { data, error } = await supabaseAdmin.rpc("fn_cancel_work_order", {
    p_work_order_id: workOrderId,
    p_motivo: motivo,
    p_usuario: usuario,
  });
  if (error) lanzar(error);
  return data as { work_order_id: string; estado_ot: "cancelada"; motivo_cancelacion: string; cancelado_por: string; fecha_cancelacion: string };
}

export async function reasignarOt(workOrderId: string, nuevoResponsableId: string, usuario: string) {
  const { data, error } = await supabaseAdmin.rpc("fn_reassign_work_order", {
    p_work_order_id: workOrderId,
    p_nuevo_responsable_id: nuevoResponsableId,
    p_usuario: usuario,
  });
  if (error) lanzar(error);
  return data as { work_order_id: string; responsable_accion_id: string };
}
