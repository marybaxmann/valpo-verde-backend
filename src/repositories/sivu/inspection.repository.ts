import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

/** SQLSTATE propio de `fn_save_inspection_draft` (018e/018f/#58). */
export const SQLSTATE_BORRADOR_INSPECCION = "SV058";
/** SQLSTATE propio del alta (reutilizado por 018f para el árbol nuevo en Levantamiento). */
export const SQLSTATE_ALTA_ARBOL = "SV057";
/** SQLSTATE propio de `fn_finalizar_inspeccion` (020; #59/#72). */
export const SQLSTATE_FINALIZAR_INSPECCION = "SV064";

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

// ---------------------------------------------------------------------
// Cierre de la inspección (#59/#72; CC-054, CC-055, CC-056): lecturas
// para /calcular y /finalizar, y la única escritura de /finalizar.
// Lo que entra en la respuesta y en la huella se lee con el JWT del
// usuario, para que la RLS actúe como segunda capa (PR-018 v5.0,
// CC-064 decisión h); la función de finalizar sigue con service_role.
// ---------------------------------------------------------------------

/** Campos de ARBOLES que guardan `trees` y `tree_data_versions` (los 20 de `CamposArbol`). */
const COLUMNAS_ARBOL =
  "sector, ubicacion_descriptiva, utm_este, utm_norte, especie_cientifica, nombre_comun, multifustal, numero_fustes, dap_fustes_cm, dap_cm, altura_total_m, diametro_copa_ns_m, diametro_copa_eo_m, copa_no_presenta, altura_primera_rama_m, altura_primera_rama_no_presenta, altura_base_copa_viva_m, altura_base_copa_viva_no_presenta, clase_edad, rango_edad_estimada_anios";

/** `evaluations.variables` del borrador de esta inspección; null si todavía no tiene evaluación. */
export async function obtenerVariablesBorrador(
  accessToken: string,
  inspectionId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("evaluations")
    .select("variables")
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data?.variables as Record<string, unknown> | undefined) ?? null;
}

export interface VersionArbolInspeccion {
  campos: Record<string, unknown>;
  camposRegistrados: string[];
}

/** Fila de `tree_data_versions` de esta inspección (lo que registró del árbol); null si no registró nada. */
export async function obtenerVersionArbolDeInspeccion(
  accessToken: string,
  inspectionId: string
): Promise<VersionArbolInspeccion | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("tree_data_versions")
    .select(`campos_registrados, ${COLUMNAS_ARBOL}`)
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
  if (!data) return null;

  const { campos_registrados, ...campos } = data as Record<string, unknown> & { campos_registrados: string[] | null };
  return { campos, camposRegistrados: campos_registrados ?? [] };
}

/** Valores vigentes del árbol (`trees`); null si el árbol no existe. */
export async function obtenerArbolVigente(accessToken: string, treeId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("trees")
    .select(COLUMNAS_ARBOL)
    .eq("id", treeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * `v_tree_current_inputs.entradas_vigentes`: el último valor de cada
 * variable de REGISTRO_EVALUACION registrado por una OT Completada
 * (021). Árbol sin inspecciones vigentes: objeto vacío.
 */
export async function obtenerEntradasVigentes(accessToken: string, treeId: string): Promise<Record<string, unknown>> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("v_tree_current_inputs")
    .select("entradas_vigentes")
    .eq("tree_id", treeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data?.entradas_vigentes as Record<string, unknown> | undefined) ?? {};
}

/** `v_tree_fechas_vigentes.fecha_proxima_inspeccion` (020; CC-055); null si el árbol no tiene. */
export async function obtenerFechaProximaInspeccionVigente(accessToken: string, treeId: string): Promise<string | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("v_tree_fechas_vigentes")
    .select("fecha_proxima_inspeccion")
    .eq("tree_id", treeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return (data?.fecha_proxima_inspeccion as string | null | undefined) ?? null;
}

export interface AjusteFinalizacion {
  campo: "clasificacion_riesgo" | "clasificacion_infraestructura" | "clasificacion_prioridad";
  valor_calculado: string;
  valor_ajustado: string;
  justificacion_ajuste_clasificacion: string;
}

export interface FinalizarInspeccionInput {
  inspectionId: string;
  usuario: string;
  /** Forma de `evaluations_resultado_input` (020). */
  resultado: Record<string, unknown>;
  ajustes: AjusteFinalizacion[];
  fechaProximaInspeccionSugerida: string;
  fechaProximoMonitoreoSugerida: string;
  fechaProximaInspeccion: string;
  fechaProximoMonitoreo: string;
  justificacionAjusteFecha: string | null;
}

export interface FinalizarInspeccionResultado {
  inspection_id: string;
  evaluation_id: string;
  estado_registro: "finalizado";
  species_id: string | null;
}

/**
 * Invoca `fn_finalizar_inspeccion` (020) con `service_role`, UNA sola
 * vez, cuando el service ya verificó que todo está completo (CC-054).
 * Parámetros siempre por nombre.
 */
export async function finalizarInspeccion(input: FinalizarInspeccionInput): Promise<FinalizarInspeccionResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_finalizar_inspeccion", {
    p_inspection_id: input.inspectionId,
    p_usuario: input.usuario,
    p_resultado: input.resultado,
    p_ajustes: input.ajustes,
    p_fecha_proxima_inspeccion_sugerida: input.fechaProximaInspeccionSugerida,
    p_fecha_proximo_monitoreo_sugerida: input.fechaProximoMonitoreoSugerida,
    p_fecha_proxima_inspeccion: input.fechaProximaInspeccion,
    p_fecha_proximo_monitoreo: input.fechaProximoMonitoreo,
    p_justificacion_ajuste_fecha: input.justificacionAjusteFecha,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as FinalizarInspeccionResultado;
}
