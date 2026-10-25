import { supabaseAdmin } from "../../config/supabase";

/** SQLSTATE propio de `fn_save_inspection_draft` (018e/018f/#58). */
export const SQLSTATE_BORRADOR_INSPECCION = "SV058";
/** SQLSTATE propio del alta (reutilizado por 018f para el árbol nuevo en Levantamiento). */
export const SQLSTATE_ALTA_ARBOL = "SV057";

export interface CamposArbol {
  sector?: string | null;
  ubicacion_descriptiva?: string | null;
  utm_este?: number | null;
  utm_norte?: number | null;
  especie_cientifica?: string | null;
  nombre_comun?: string | null;
  multifustal?: boolean | null;
  numero_fustes?: number | null;
  dap_fustes_cm?: number[] | null;
  dap_cm?: number | null;
  altura_total_m?: number | null;
  diametro_copa_ns_m?: number | null;
  diametro_copa_eo_m?: number | null;
  copa_no_presenta?: boolean | null;
  altura_primera_rama_m?: number | null;
  altura_primera_rama_no_presenta?: boolean | null;
  altura_base_copa_viva_m?: number | null;
  altura_base_copa_viva_no_presenta?: boolean | null;
  clase_edad?: string | null;
  rango_edad_estimada_anios?: string | null;
}

export interface GuardarBorradorInspeccionInput {
  inspectionId: string | null;
  workOrderId: string;
  treeId: string;
  inspector: string;
  fechaInspeccion: string;
  fechaRegistro: string;
  ruleVersion: string;
  tipoInspeccionRealizada: string;
  subtipoInspeccion: string | null;
  metodoInstrumental: string | null;
  resultadoGeneral: string | null;
  requiereMantenimiento: boolean | null;
  observaciones: string | null;
  registradoPor: string;
  variables: Record<string, unknown>;
  camposArbol: CamposArbol;
  camposRegistradosArbol: string[] | null;
}

export interface BorradorInspeccionResultado {
  inspection_id: string;
  evaluation_id: string;
  tree_data_version_id: string | null;
  estado_registro: string;
}

/**
 * Invoca `fn_save_inspection_draft` (018e/018f; #58) con `service_role`.
 * Solo la rama de árbol existente: los parámetros `p_nuevo_arbol_*`
 * (018f, CC-052 — árbol nuevo en Levantamiento) no se exponen todavía
 * desde este repositorio; ese endpoint queda para cuando la responsable
 * decida la propuesta de búsqueda de árboles cercanos. `camposArbol`
 * siempre lleva el estado COMPLETO del borrador en ese guardado, nunca
 * un delta (mismo criterio que la función).
 */
export async function guardarBorradorInspeccion(
  input: GuardarBorradorInspeccionInput
): Promise<BorradorInspeccionResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_save_inspection_draft", {
    p_inspection_id: input.inspectionId,
    p_work_order_id: input.workOrderId,
    p_tree_id: input.treeId,
    p_inspector: input.inspector,
    p_fecha_inspeccion: input.fechaInspeccion,
    p_fecha_registro: input.fechaRegistro,
    p_rule_version: input.ruleVersion,
    p_tipo_inspeccion_realizada: input.tipoInspeccionRealizada,
    p_subtipo_inspeccion: input.subtipoInspeccion,
    p_metodo_instrumental: input.metodoInstrumental,
    p_resultado_general: input.resultadoGeneral,
    p_requiere_mantenimiento: input.requiereMantenimiento,
    p_observaciones: input.observaciones,
    p_registrado_por: input.registradoPor,
    p_variables: input.variables,
    p_campos_arbol: input.camposArbol,
    p_campos_registrados_arbol: input.camposRegistradosArbol,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as BorradorInspeccionResultado;
}

export interface InspeccionRow {
  id: string;
  work_order_id: string;
  tree_id: string;
  inspector: string | null;
  estado_registro: string;
  tipo_inspeccion_realizada: string | null;
  subtipo_inspeccion: string | null;
  metodo_instrumental: string | null;
  resultado_general: string | null;
  requiere_mantenimiento: boolean | null;
  observaciones: string | null;
  fecha_inspeccion: string;
  fecha_registro: string | null;
  registrado_por: string | null;
}

/**
 * Lectura directa: PATCH /api/sivu/inspections/:id solo trae el id de
 * la inspección en la ruta — hace falta `work_order_id`/`tree_id` (y
 * `estado_registro`, para rechazar pronto con un mensaje claro si ya
 * no está Preguardado) antes de poder volver a invocar
 * `fn_save_inspection_draft`, que exige el estado COMPLETO del
 * borrador en cada guardado, no un delta.
 */
export async function obtenerInspeccionPorId(inspectionId: string): Promise<InspeccionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("inspections")
    .select(
      "id, work_order_id, tree_id, inspector, estado_registro, tipo_inspeccion_realizada, subtipo_inspeccion, metodo_instrumental, resultado_general, requiere_mantenimiento, observaciones, fecha_inspeccion, fecha_registro, registrado_por"
    )
    .eq("id", inspectionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data as InspeccionRow | null) ?? null;
}
