/**
 * Registro de catálogos y códigos persistentes (PR-021; CC-034).
 * Reemplaza, para este motor, a `moduleCatalogs.ts` (que no se toca:
 * sigue usándolo la demo sobre `treeRisk.ts`).
 *
 * El Excel define valores y etiquetas (DICCIONARIO_CAMPOS, LISTAS); el
 * código persistente lo define el backend y nunca se reutiliza ni se
 * renombra. Las dos escalas de abajo ya quedaron fijadas en snake_case
 * en la migración 014 (CHECK de `probabilidad_falla_*`); este registro
 * las documenta como catálogo en vez de dejarlas sueltas en el SQL.
 *
 * Catálogos de clasificación (riesgo, infraestructura, prioridad) y de
 * tipo/subtipo de inspección se agregan junto con los módulos M02–M05.
 */

export type EstadoCatalogo = "vigente" | "reemplazado" | "descartado";

export interface CatalogEntry {
  catalogo: string;
  codigo: string;
  etiqueta: string;
  orden?: number;
  padre?: string;
  estado: EstadoCatalogo;
  cc: string;
}

export const CATALOGO: readonly CatalogEntry[] = [
  // --- severidad: categoría parcial de REGLAS_INDICADORES ---
  { catalogo: "severidad", codigo: "despreciable", etiqueta: "Despreciable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "leve", etiqueta: "Leve", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "moderada", etiqueta: "Moderada", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "severa", etiqueta: "Severa", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- probabilidad_falla_*: migración 014 (CHECK) ---
  { catalogo: "probabilidad_falla", codigo: "improbable", etiqueta: "Improbable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "posible", etiqueta: "Posible", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "probable", etiqueta: "Probable", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "inminente", etiqueta: "Inminente", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "no_determinado", etiqueta: "No determinado", estado: "vigente", cc: "CC-024" },

  // --- resultado_cavidad_interna: D-41 (cavidad_basal_interna), D-53 (cavidad_interna_tronco) ---
  { catalogo: "resultado_cavidad_interna", codigo: "si", etiqueta: "Sí", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "resultado_cavidad_interna", codigo: "no", etiqueta: "No", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "resultado_cavidad_interna", codigo: "requiere_evaluacion_instrumental", etiqueta: "Requiere evaluación instrumental", orden: 2, estado: "vigente", cc: "CC-040" },

  // --- condicion_herida: D-63 (condicion_heridas_tronco) ---
  { catalogo: "condicion_herida", codigo: "abierta", etiqueta: "Abierta", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_herida", codigo: "en_proceso_de_cierre", etiqueta: "En proceso de cierre", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_herida", codigo: "cerrada", etiqueta: "Cerrada", orden: 2, estado: "vigente", cc: "PR-021" },

  // --- afectacion_grieta: D-68 (afectacion_fisura_grieta) ---
  { catalogo: "afectacion_grieta", codigo: "solo_corteza", etiqueta: "Solo corteza", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "afectacion_grieta", codigo: "penetra_en_madera", etiqueta: "Penetra en madera", orden: 1, estado: "vigente", cc: "PR-021" },

  // --- direccion_grieta: D-69 (direccion_grieta) ---
  { catalogo: "direccion_grieta", codigo: "longitudinal", etiqueta: "Longitudinal", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "direccion_grieta", codigo: "transversal", etiqueta: "Transversal", orden: 1, estado: "vigente", cc: "PR-021" },

  // --- zona_objetivo: D-157 (M01) ---
  { catalogo: "zona_objetivo", codigo: "bajo_la_copa", etiqueta: "Bajo la copa", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "entre_limite_copa_y_una_altura", etiqueta: "Entre el límite de la copa y 1× la altura del árbol", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "entre_una_y_1_5_alturas", etiqueta: "Entre 1× y 1,5× la altura del árbol", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "mas_alla_de_1_5_alturas", etiqueta: "Más allá de 1,5× la altura del árbol", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- tasa_ocupacion: D-158 (M01) ---
  { catalogo: "tasa_ocupacion", codigo: "rara", etiqueta: "Rara", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "ocasional", etiqueta: "Ocasional", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "frecuente", etiqueta: "Frecuente", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "constante", etiqueta: "Constante", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- probabilidad_impacto: D-159, salida de M01 ---
  { catalogo: "probabilidad_impacto", codigo: "muy_baja", etiqueta: "Muy baja", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "baja", etiqueta: "Baja", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "media", etiqueta: "Media", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "alta", etiqueta: "Alta", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- consecuencia: D-160/161/162 (consecuencia_raices_cuello/_tronco/_copa_ramas), entrada de M03 ---
  { catalogo: "consecuencia", codigo: "insignificante", etiqueta: "Insignificante", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "menor", etiqueta: "Menor", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "significativa", etiqueta: "Significativa", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "severa", etiqueta: "Severa", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- clasificacion_riesgo: D-166/167/168 (por componente), D-171 (R04) ---
  { catalogo: "clasificacion_riesgo", codigo: "bajo", etiqueta: "Bajo", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "moderado", etiqueta: "Moderado", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "alto", etiqueta: "Alto", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "extremo", etiqueta: "Extremo", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "no_determinado", etiqueta: "No determinado", estado: "vigente", cc: "CC-024" },

  // --- probabilidad_falla_impacto: salida intermedia de M02, sin columna
  //     propia en evaluations/tree_assessments (D-166 a D-168 tratan
  //     M02+M03 como un solo paso); se registra igual para que
  //     evaluarM03 pueda validar su dominio antes de indexar la matriz. ---
  { catalogo: "probabilidad_falla_impacto", codigo: "poco_probable", etiqueta: "Poco probable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "algo_probable", etiqueta: "Algo probable", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "probable", etiqueta: "Probable", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "muy_probable", etiqueta: "Muy probable", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- si_no_no_determinado: D-138 (red_subterranea_presente), D-146
  //     (compromete_funcionalidad_red_subterranea) ---
  { catalogo: "si_no_no_determinado", codigo: "si", etiqueta: "Sí", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "si_no_no_determinado", codigo: "no", etiqueta: "No", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "si_no_no_determinado", codigo: "no_determinado", etiqueta: "No determinado", orden: 2, estado: "vigente", cc: "PR-021" },

  // --- categoria_infraestructura: categoría parcial de REGLAS_INDICADORES (IN-*) ---
  { catalogo: "categoria_infraestructura", codigo: "no_aplica", etiqueta: "No aplica", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "sin_afectacion", etiqueta: "Sin afectación", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "leve", etiqueta: "Leve", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "moderada", etiqueta: "Moderada", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "severa", etiqueta: "Severa", orden: 4, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "no_determinado", etiqueta: "No determinado", orden: 5, estado: "vigente", cc: "PR-021" },

  // --- clasificacion_infraestructura: D-170 (salida de M04) ---
  { catalogo: "clasificacion_infraestructura", codigo: "bajo", etiqueta: "Bajo", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "moderado", etiqueta: "Moderado", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "alto", etiqueta: "Alto", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "critico", etiqueta: "Crítico", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "no_aplica", etiqueta: "No aplica", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- tipo_inspeccion_realizada: D-196 (INSPECCION) ---
  { catalogo: "tipo_inspeccion_realizada", codigo: "evaluacion_inicial", etiqueta: "Evaluación inicial", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_inspeccion_realizada", codigo: "reevaluacion", etiqueta: "Reevaluación", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_inspeccion_realizada", codigo: "evaluacion_instrumental", etiqueta: "Evaluación instrumental", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_inspeccion_realizada", codigo: "monitoreo", etiqueta: "Monitoreo", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_inspeccion_realizada", codigo: "levantamiento", etiqueta: "Levantamiento", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- subtipo_inspeccion: D-197 (INSPECCION), dominio dependiente de
  //     tipo_inspeccion_realizada — un campo, dominio irregular, no
  //     separado por "/" como los demás (ver catalogs.test.ts). ---
  { catalogo: "subtipo_inspeccion", codigo: "seguimiento", etiqueta: "Seguimiento", padre: "reevaluacion", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "post_intervencion", etiqueta: "Post intervención", padre: "reevaluacion", estado: "vigente", cc: "PR-021" }, // Excel D-197 y LISTAS: "Post_intervención"; sin guion bajo por decisión de la responsable (2026-10-27)
  { catalogo: "subtipo_inspeccion", codigo: "tomografia_sonica", etiqueta: "Tomografía_sónica", padre: "evaluacion_instrumental", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "resistografia", etiqueta: "Resistografía", padre: "evaluacion_instrumental", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "otra_instrumental", etiqueta: "Otra", padre: "evaluacion_instrumental", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "fitosanitario", etiqueta: "Fitosanitario", padre: "monitoreo", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "estructural", etiqueta: "Estructural", padre: "monitoreo", estado: "vigente", cc: "PR-021" },
  { catalogo: "subtipo_inspeccion", codigo: "vitalidad", etiqueta: "Vitalidad", padre: "monitoreo", estado: "vigente", cc: "PR-021" },

  // --- tipo_ot: D-234 (ORDENES DE TRABAJO.Tipo_ot). Códigos del CHECK de
  //     work_orders.tipo_ot (CC-065). ---
  { catalogo: "tipo_ot", codigo: "inspeccion", etiqueta: "Inspección", orden: 0, estado: "vigente", cc: "CC-065" },
  { catalogo: "tipo_ot", codigo: "mantenimiento", etiqueta: "Mantenimiento", orden: 1, estado: "vigente", cc: "CC-065" },

  // --- estado_ot: D-239. Códigos del CHECK de work_orders.estado_ot (CC-065). ---
  { catalogo: "estado_ot", codigo: "pendiente", etiqueta: "Pendiente", orden: 0, estado: "vigente", cc: "CC-065" },
  { catalogo: "estado_ot", codigo: "programada", etiqueta: "Programada", orden: 1, estado: "vigente", cc: "CC-065" },
  { catalogo: "estado_ot", codigo: "en_ejecucion", etiqueta: "En ejecución", orden: 2, estado: "vigente", cc: "CC-065" },
  { catalogo: "estado_ot", codigo: "completada", etiqueta: "Completada", orden: 3, estado: "vigente", cc: "CC-065" },
  { catalogo: "estado_ot", codigo: "cancelada", etiqueta: "Cancelada", orden: 4, estado: "vigente", cc: "CC-065" },

  // --- accion_mantenimiento: D-235, parte «Mantenimiento» de
  //     Accion_solicitada (las de Inspección son tipo_inspeccion_realizada).
  //     `otra_intervencion` es el código que ya fija la base
  //     (chk_work_orders_observaciones, D-246; CC-065). ---
  { catalogo: "accion_mantenimiento", codigo: "poda", etiqueta: "Poda", orden: 0, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "riego", etiqueta: "Riego", orden: 1, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "descompactacion", etiqueta: "Descompactación", orden: 2, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "manejo_fitosanitario", etiqueta: "Manejo fitosanitario", orden: 3, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "tala_retiro", etiqueta: "Tala_retiro", orden: 4, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "reparacion_alcorque", etiqueta: "Reparación_alcorque", orden: 5, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "soporte_tutorado", etiqueta: "Soporte_tutorado", orden: 6, estado: "vigente", cc: "CC-065" },
  { catalogo: "accion_mantenimiento", codigo: "otra_intervencion", etiqueta: "Otra_Intervención", orden: 7, estado: "vigente", cc: "CC-065" },

  // --- subtipo_mantenimiento: D-236, subtipos de cada acción de
  //     Mantenimiento (`padre` = su accion_mantenimiento). `tala` y
  //     `retiro_tocon` son los códigos que ya fija la base
  //     (fn_fix_requiere_revision_inspector, v_tree_presence; CC-065). ---
  { catalogo: "subtipo_mantenimiento", codigo: "sanitaria", etiqueta: "Sanitaria", padre: "poda", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "formacion", etiqueta: "Formación", padre: "poda", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "despeje", etiqueta: "Despeje", padre: "poda", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "reduccion", etiqueta: "Reducción", padre: "poda", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "programado", etiqueta: "Programado", padre: "riego", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "emergencia", etiqueta: "Emergencia", padre: "riego", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "manual", etiqueta: "Manual", padre: "descompactacion", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "mecanica", etiqueta: "Mecánica", padre: "descompactacion", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "preventivo", etiqueta: "Preventivo", padre: "manejo_fitosanitario", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "correctivo", etiqueta: "Correctivo", padre: "manejo_fitosanitario", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "retiro_residuos", etiqueta: "Retiro_residuos", padre: "manejo_fitosanitario", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "tala", etiqueta: "Tala", padre: "tala_retiro", estado: "vigente", cc: "CC-065" },
  { catalogo: "subtipo_mantenimiento", codigo: "retiro_tocon", etiqueta: "Retiro_tocón", padre: "tala_retiro", estado: "vigente", cc: "CC-065" },

  // --- forma_alcorque: D-121 ---
  { catalogo: "forma_alcorque", codigo: "rectangular", etiqueta: "Rectangular", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "forma_alcorque", codigo: "circular", etiqueta: "Circular", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "forma_alcorque", codigo: "irregular", etiqueta: "Irregular", orden: 2, estado: "vigente", cc: "PR-021" },

  // --- tipo_red_aerea: D-139, selección múltiple ---
  { catalogo: "tipo_red_aerea", codigo: "electrica", etiqueta: "Eléctrica", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_red_aerea", codigo: "telecomunicaciones", etiqueta: "Telecomunicaciones", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_red_aerea", codigo: "alumbrado_publico", etiqueta: "Alumbrado público", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_red_aerea", codigo: "otra", etiqueta: "Otra", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "tipo_red_aerea", codigo: "funcion_no_determinada", etiqueta: "Función no determinada", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- tipo_infraestructura_vertical: D-132, selección múltiple. Lo usa
  //     la condición de otro_tipo_infraestructura_vertical (D-133,
  //     "= Otro") en la tabla de completitud (CC-056). ---
  { catalogo: "tipo_infraestructura_vertical", codigo: "poste", etiqueta: "Poste", orden: 0, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "luminaria", etiqueta: "Luminaria", orden: 1, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "senaletica", etiqueta: "Señalética", orden: 2, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "semaforo", etiqueta: "Semáforo", orden: 3, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "muro_o_cierre", etiqueta: "Muro o cierre", orden: 4, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "edificacion", etiqueta: "Edificación", orden: 5, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_infraestructura_vertical", codigo: "otro", etiqueta: "Otro", orden: 6, estado: "vigente", cc: "CC-056" },

  // --- tipo_red_subterranea: D-143, selección múltiple (CC-056 decisión
  //     o). Mismos códigos que tipo_red_aerea donde coinciden. ---
  { catalogo: "tipo_red_subterranea", codigo: "electrica", etiqueta: "Eléctrica", orden: 0, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "telecomunicaciones", etiqueta: "Telecomunicaciones", orden: 1, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "agua_potable", etiqueta: "Agua potable", orden: 2, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "alcantarillado", etiqueta: "Alcantarillado", orden: 3, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "aguas_lluvias", etiqueta: "Aguas lluvias", orden: 4, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "gas", etiqueta: "Gas", orden: 5, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "otra", etiqueta: "Otra", orden: 6, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_red_subterranea", codigo: "funcion_no_determinada", etiqueta: "Función no determinada", orden: 7, estado: "vigente", cc: "CC-056" },

  // --- tipo_tutorado: D-150. Lo usa la condición de observaciones_tutorado
  //     (D-153, "tipo_tutorado = Otro") en la tabla de completitud (CC-056). ---
  { catalogo: "tipo_tutorado", codigo: "simple", etiqueta: "Simple", orden: 0, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_tutorado", codigo: "doble", etiqueta: "Doble", orden: 1, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_tutorado", codigo: "multiple", etiqueta: "Múltiple", orden: 2, estado: "vigente", cc: "CC-056" },
  { catalogo: "tipo_tutorado", codigo: "otro", etiqueta: "Otro", orden: 3, estado: "vigente", cc: "CC-056" },

  // --- clasificacion_prioridad: D-172 (salida de M05) ---
  { catalogo: "clasificacion_prioridad", codigo: "baja", etiqueta: "Baja", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "media", etiqueta: "Media", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "alta", etiqueta: "Alta", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "critica", etiqueta: "Crítica", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "no_determinado", etiqueta: "No determinado", orden: 4, estado: "vigente", cc: "CC-029" },

  // --- clasificacion_vitalidad: D-169 (REGISTRO_EVALUACION, Monitoreo/
  //     Vitalidad). Dominio del Excel: "0 Exploración / 1 Degeneración /
  //     2 Estancamiento / 3 Resignación / Muerto" — asignación visual
  //     del Inspector (Roloff), nunca calculada (D-169: "no calcular
  //     mediante suma de síntomas ni convertir automáticamente desde
  //     muerte_regresiva_copa_pct"). Códigos propios, distintos del ENUM
  //     `clase_vitalidad` de schema.sql (sin_vitalidad/clase_0-3/
  //     no_clasificable): ese ENUM es la salida de un módulo de cálculo
  //     que todavía no existe para Vitalidad, no necesariamente el
  //     mismo dominio de entrada del Inspector (AM-17). ---
  { catalogo: "clasificacion_vitalidad", codigo: "0_exploracion", etiqueta: "0 Exploración", orden: 0, estado: "vigente", cc: "AM-17" },
  { catalogo: "clasificacion_vitalidad", codigo: "1_degeneracion", etiqueta: "1 Degeneración", orden: 1, estado: "vigente", cc: "AM-17" },
  { catalogo: "clasificacion_vitalidad", codigo: "2_estancamiento", etiqueta: "2 Estancamiento", orden: 2, estado: "vigente", cc: "AM-17" },
  { catalogo: "clasificacion_vitalidad", codigo: "3_resignacion", etiqueta: "3 Resignación", orden: 3, estado: "vigente", cc: "AM-17" },
  { catalogo: "clasificacion_vitalidad", codigo: "muerto", etiqueta: "Muerto", orden: 4, estado: "vigente", cc: "AM-17" },

  // --- clase_edad: D-25. Dominio literal de la columna H; códigos de camposArbolBaseSchema (inspeccion.schema.ts). Expuesto por B16. ---
  { catalogo: "clase_edad", codigo: "joven", etiqueta: "Joven", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clase_edad", codigo: "semimaduro", etiqueta: "Semimaduro", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clase_edad", codigo: "tempranamente_maduro", etiqueta: "Tempranamente maduro", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clase_edad", codigo: "maduro", etiqueta: "Maduro", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clase_edad", codigo: "sobremaduro", etiqueta: "Sobremaduro", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- rango_edad_estimada_anios: D-26. Dominio literal de la columna H; códigos de camposArbolBaseSchema (inspeccion.schema.ts). Expuesto por B16. ---
  { catalogo: "rango_edad_estimada_anios", codigo: "0_5", etiqueta: "0–5", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "6_10", etiqueta: "6–10", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "11_15", etiqueta: "11–15", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "16_20", etiqueta: "16–20", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "21_25", etiqueta: "21–25", orden: 4, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "26_30", etiqueta: "26–30", orden: 5, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "31_35", etiqueta: "31–35", orden: 6, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "36_40", etiqueta: "36–40", orden: 7, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "41_45", etiqueta: "41–45", orden: 8, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "46_50", etiqueta: "46–50", orden: 9, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "51_55", etiqueta: "51–55", orden: 10, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "56_60", etiqueta: "56–60", orden: 11, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "61_65", etiqueta: "61–65", orden: 12, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "66_70", etiqueta: "66–70", orden: 13, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "71_75", etiqueta: "71–75", orden: 14, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "76_80", etiqueta: "76–80", orden: 15, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "81_85", etiqueta: "81–85", orden: 16, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "86_90", etiqueta: "86–90", orden: 17, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "91_95", etiqueta: "91–95", orden: 18, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "96_100", etiqueta: "96–100", orden: 19, estado: "vigente", cc: "PR-021" },
  { catalogo: "rango_edad_estimada_anios", codigo: "mas_de_100", etiqueta: "Más de 100 años", orden: 20, estado: "vigente", cc: "PR-021" },

  // --- materialidad_vereda: D-93. Dominio literal de la columna H; códigos snake_case de la etiqueta. Expuesto por B16. ---
  { catalogo: "materialidad_vereda", codigo: "baldosa", etiqueta: "Baldosa", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_vereda", codigo: "adoquin", etiqueta: "Adoquín", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_vereda", codigo: "hormigon", etiqueta: "Hormigón", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_vereda", codigo: "asfalto", etiqueta: "Asfalto", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_vereda", codigo: "otro", etiqueta: "Otro", orden: 4, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_vereda", codigo: "no_determinado", etiqueta: "No determinado", orden: 5, estado: "vigente", cc: "PR-021" },

  // --- materialidad_calzada: D-109. Dominio literal de la columna H; códigos snake_case de la etiqueta. Expuesto por B16. ---
  { catalogo: "materialidad_calzada", codigo: "asfalto", etiqueta: "Asfalto", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_calzada", codigo: "hormigon", etiqueta: "Hormigón", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_calzada", codigo: "adoquin", etiqueta: "Adoquín", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_calzada", codigo: "otro", etiqueta: "Otro", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "materialidad_calzada", codigo: "no_determinado", etiqueta: "No determinado", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- condicion_radicular_entorno: D-130. Dominio literal de la columna H; códigos snake_case de la etiqueta. Expuesto por B16. ---
  { catalogo: "condicion_radicular_entorno", codigo: "sin_alteracion_observable", etiqueta: "Sin alteración observable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_radicular_entorno", codigo: "restriccion_del_desarrollo", etiqueta: "Restricción del desarrollo", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_radicular_entorno", codigo: "raices_sobresalientes", etiqueta: "Raíces sobresalientes", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_radicular_entorno", codigo: "ambas", etiqueta: "Ambas", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- condicion_tutorado: D-151. Dominio literal de la columna H; códigos snake_case de la etiqueta. Expuesto por B16. ---
  { catalogo: "condicion_tutorado", codigo: "adecuado", etiqueta: "Adecuado", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_tutorado", codigo: "deteriorado", etiqueta: "Deteriorado", orden: 1, estado: "vigente", cc: "PR-021" },

  // --- vista_foto: D-27 ("árbol completo, base, tronco y copa"); códigos de photos.vista (CC-049 punto 9). ---
  { catalogo: "vista_foto", codigo: "arbol_completo", etiqueta: "Árbol completo", orden: 0, estado: "vigente", cc: "CC-049" },
  { catalogo: "vista_foto", codigo: "base", etiqueta: "Base", orden: 1, estado: "vigente", cc: "CC-049" },
  { catalogo: "vista_foto", codigo: "tronco", etiqueta: "Tronco", orden: 2, estado: "vigente", cc: "CC-049" },
  { catalogo: "vista_foto", codigo: "copa", etiqueta: "Copa", orden: 3, estado: "vigente", cc: "CC-049" },

  // --- estado_ciclo_vida: PROVISIONAL (demo 2026-10-27, decisión de la responsable). La base usa
  //     activo/retirado/tocon; el Excel define estado_presencia (D-28) Presente/Talado/Retirado.
  //     Contradicción pendiente de resolver; mientras tanto, etiquetas de D-28. ---
  { catalogo: "estado_ciclo_vida", codigo: "activo", etiqueta: "Presente", orden: 0, estado: "vigente", cc: "pendiente" },
  { catalogo: "estado_ciclo_vida", codigo: "tocon", etiqueta: "Talado", orden: 1, estado: "vigente", cc: "pendiente" },
  { catalogo: "estado_ciclo_vida", codigo: "retirado", etiqueta: "Retirado", orden: 2, estado: "vigente", cc: "pendiente" },
] as const;

export function etiquetaDe(catalogo: string, codigo: string): string {
  const entrada = CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo);
  if (!entrada) throw new Error(`Código "${codigo}" no registrado en el catálogo "${catalogo}"`);
  return entrada.etiqueta;
}

export function entradasVigentesDe(catalogo: string): CatalogEntry[] {
  return CATALOGO.filter((c) => c.catalogo === catalogo && c.estado === "vigente");
}

/**
 * true solo si `codigo` es un código vigente de `catalogo`. El motor la usa
 * para validar en tiempo de ejecución los campos de catálogo (3 o más
 * valores): el tipo de TypeScript no protege contra un valor corrupto que
 * llegue como string sin pasar por el compilador (p. ej. desde la base de
 * datos). Un código no reconocido nunca se trata como la rama "else" de un
 * valor conocido — ver variables-calculo.ts y los módulos R01–R03 sobre
 * "valores fuera de dominio".
 */
export function esCodigoVigente(catalogo: string, codigo: string): boolean {
  return CATALOGO.some((c) => c.catalogo === catalogo && c.codigo === codigo && c.estado === "vigente");
}

export type SeveridadCodigo = "despreciable" | "leve" | "moderada" | "severa";
export type ProbabilidadFallaCodigo = "improbable" | "posible" | "probable" | "inminente" | "no_determinado";
export type ResultadoCavidadInternaCodigo = "si" | "no" | "requiere_evaluacion_instrumental";
export type CondicionHeridaCodigo = "abierta" | "en_proceso_de_cierre" | "cerrada";
export type AfectacionGrietaCodigo = "solo_corteza" | "penetra_en_madera";
export type DireccionGrietaCodigo = "longitudinal" | "transversal";
export type ZonaObjetivoCodigo =
  | "bajo_la_copa"
  | "entre_limite_copa_y_una_altura"
  | "entre_una_y_1_5_alturas"
  | "mas_alla_de_1_5_alturas";
export type TasaOcupacionCodigo = "rara" | "ocasional" | "frecuente" | "constante";
export type ProbabilidadImpactoCodigo = "muy_baja" | "baja" | "media" | "alta";
export type ConsecuenciaCodigo = "insignificante" | "menor" | "significativa" | "severa";
export type ClasificacionRiesgoCodigo = "bajo" | "moderado" | "alto" | "extremo" | "no_determinado";
export type SiNoNoDeterminadoCodigo = "si" | "no" | "no_determinado";
export type CategoriaInfraestructuraCodigo = "no_aplica" | "sin_afectacion" | "leve" | "moderada" | "severa" | "no_determinado";
export type ClasificacionInfraestructuraCodigo = "bajo" | "moderado" | "alto" | "critico" | "no_aplica";
export type ClasificacionPrioridadCodigo = "baja" | "media" | "alta" | "critica" | "no_determinado";
export type ClasificacionVitalidadCodigo = "0_exploracion" | "1_degeneracion" | "2_estancamiento" | "3_resignacion" | "muerto";
export type TipoRedAereaCodigo = "electrica" | "telecomunicaciones" | "alumbrado_publico" | "otra" | "funcion_no_determinada";
export type FormaAlcorqueCodigo = "rectangular" | "circular" | "irregular";
export type TipoInspeccionRealizadaCodigo =
  | "evaluacion_inicial"
  | "reevaluacion"
  | "evaluacion_instrumental"
  | "monitoreo"
  | "levantamiento";
export type SubtipoInspeccionCodigo =
  | "seguimiento"
  | "post_intervencion"
  | "tomografia_sonica"
  | "resistografia"
  | "otra_instrumental"
  | "fitosanitario"
  | "estructural"
  | "vitalidad";
