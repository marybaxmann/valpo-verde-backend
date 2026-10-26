/**
 * Alcance de REGISTRO_EVALUACION por tipo y subtipo de inspección
 * (CC-040 a; REGLAS_GENERALES fila 28): la única lista, la usan el
 * borrador (`schemas/sivu/inspeccion.schema.ts`), la completitud
 * (`services/sivu/completitud.ts`) y `validarAlcance` (`ensamblaje.ts`)
 * — CC-063. Antes el motor tenía su propia lista de Monitoreo
 * Estructural, distinta de esta.
 */

/**
 * CC-040 / REGLAS_GENERALES "Preguardado y finalización": campos de
 * REGISTRO_EVALUACION permitidos por cada subtipo de Monitoreo
 * (decisión de la autora, 2026-10-20) y por la Evaluación instrumental
 * (D-39 a D-49, D-51 a D-61, sin los calculados por la plataforma —
 * SL_basal_pct/R_radio_basal_cm/t_R_basal/SL_tronco_pct/
 * R_radio_tronco_cm/t_R_tronco, D-46/48/49/58/60/61 — "Calculado por
 * plataforma... No admite ingreso manual").
 *
 * Evaluación inicial, Reevaluación y Levantamiento: evaluación
 * completa (CC-040 punto 1) — el alcance es TODO REGISTRO_EVALUACION,
 * ver `CAMPOS_EVALUACION_COMPLETA` más abajo.
 */
export const CAMPOS_EVALUACION_INSTRUMENTAL = [
  "cavidad_pudricion_basal",
  "cavidad_basal_externa",
  "cavidad_basal_interna",
  "D_diametro_basal_tronco_cm",
  "d_diametro_cavidad_basal_cm",
  "Cc_longitud_abertura_cavidad_cm",
  "C_circunferencia_basal_cm",
  "t_pared_residual_basal_cm",
  "presenta_cavidad_pudricion_tronco",
  "cavidad_externa_tronco",
  "cavidad_interna_tronco",
  "D_diametro_tronco_cm",
  "d_diametro_cavidad_tronco_cm",
  "Cc_longitud_abertura_tronco_cm",
  "C_circunferencia_tronco_cm",
  "t_pared_residual_tronco_cm",
] as const;

/** CC-040 (a): Fitosanitario = D-83, D-84, D-85, D-89, D-65. */
export const CAMPOS_MONITOREO_FITOSANITARIO = [
  "defoliacion_estimada_pct",
  "clorosis_pct",
  "necrosis_pct",
  "muerte_regresiva_copa_pct",
  "presenta_exudaciones",
] as const;

/**
 * CC-040 (a): Estructural = entradas de R01, R02 y R03 (D-33 a D-82 y
 * D-86) — mismo rango que la Evaluación instrumental PARA cavidad/
 * tronco, más raíces (D-33 a D-38), heridas/exudaciones/grietas/
 * codominancia del tronco (D-62 a D-75) y ramas (D-76 a D-82), más
 * desequilibrio_copa (D-86). Excluye defoliacion/clorosis/necrosis
 * (D-83 a D-85, reservados a Fitosanitario) y los calculados
 * (D-46/48/49/58/60/61).
 */
export const CAMPOS_MONITOREO_ESTRUCTURAL = [
  "raices_expuestas",
  "necrosis_radicular",
  "raices_cortadas",
  "levantamiento_del_plato_radicular",
  "angulo_inclinacion",
  "direccion_inclinacion",
  ...CAMPOS_EVALUACION_INSTRUMENTAL,
  "observaciones_radicular",
  "presenta_heridas_tronco",
  "condicion_heridas_tronco",
  "corteza_muerta_ausente",
  "presenta_exudaciones",
  "crecimiento_de_respuesta",
  "presenta_fisura_grieta_tronco",
  "afectacion_fisura_grieta",
  "direccion_grieta",
  "profundidad_grieta_cm",
  "ancho_apertura_cm",
  "troncos_codominantes",
  "corteza_incluida",
  "grieta_union_codominante",
  "observaciones_tronco",
  "ramas_secas",
  "ramas_secas_pct_copa",
  "diametro_max_ramas_secas_cm",
  "ramas_quebradas",
  "numero_ramas_quebradas",
  "diametro_max_ramas_quebradas_cm",
  "permanece_suspendida",
  "desequilibrio_copa",
] as const;

/**
 * CC-040 (a): Vitalidad = clasificacion_vitalidad (D-169). El dominio
 * del Excel ("0 Exploración / 1 Degeneración / 2 Estancamiento /
 * 3 Resignación / Muerto") ya tiene catálogo propio en `catalogs.ts`
 * (AM-17, cerrado 2026-10-25) — distinto del ENUM `clase_vitalidad` de
 * `schema.sql`, que es la salida de un módulo de cálculo que todavía
 * no existe para Vitalidad, no necesariamente el mismo dominio de
 * entrada del Inspector. El valor se valida en `inspeccion.schema.ts`
 * (`validarAlcanceVariables`) contra `esCodigoVigente("clasificacion_vitalidad", ...)`.
 */
export const CAMPOS_MONITOREO_VITALIDAD = ["clasificacion_vitalidad"] as const;

/**
 * CC-040 punto 1: Evaluación inicial, Reevaluación y Levantamiento
 * exigen la evaluación COMPLETA — todo REGISTRO_EVALUACION que el
 * Inspector ingresa (no lo que el Sistema calcula ni lo que vincula
 * por id). Generado con `scripts/metodologia/campos_evaluacion_completa.py`
 * desde DICCIONARIO_CAMPOS (Hoja = REGISTRO_EVALUACION, "¿Quién lo
 * ingresa?" = "Inspector", sin combinar con Sistema/otro rol — ese
 * filtro ya excluye los 16 campos calculados por la plataforma, los 2
 * campos de vinculación (id_inspeccion/id_arbol) y las 3 salidas
 * calculadas con ajuste del Inspector, clasificacion_riesgo/
 * infraestructura/prioridad), más una exclusión manual documentada en
 * el script: `justificacion_ajuste_clasificacion` (D-173, parte del
 * ajuste posterior al cálculo, #59/#72 — no del guardado Preguardado),
 * y una adición manual: `superficie_alcorque_m2_manual` (D-125,
 * "Irregular → ingreso manual"; CC-056 — sin ella un alcorque Irregular
 * nunca tenía superficie).
 * `tests/schemas/sivu/alcanceInspeccion.test.ts` compara esta lista
 * contra el Excel para que no se desincronicen.
 */
export const CAMPOS_EVALUACION_COMPLETA = [
  "raices_expuestas", "necrosis_radicular", "raices_cortadas", "levantamiento_del_plato_radicular",
  "angulo_inclinacion", "direccion_inclinacion",
  "cavidad_pudricion_basal", "cavidad_basal_externa", "cavidad_basal_interna",
  "D_diametro_basal_tronco_cm", "d_diametro_cavidad_basal_cm", "Cc_longitud_abertura_cavidad_cm",
  "C_circunferencia_basal_cm", "t_pared_residual_basal_cm", "observaciones_radicular",
  "presenta_cavidad_pudricion_tronco", "cavidad_externa_tronco", "cavidad_interna_tronco",
  "D_diametro_tronco_cm", "d_diametro_cavidad_tronco_cm", "Cc_longitud_abertura_tronco_cm",
  "C_circunferencia_tronco_cm", "t_pared_residual_tronco_cm",
  "presenta_heridas_tronco", "condicion_heridas_tronco", "corteza_muerta_ausente",
  "presenta_exudaciones", "crecimiento_de_respuesta", "presenta_fisura_grieta_tronco",
  "afectacion_fisura_grieta", "direccion_grieta", "profundidad_grieta_cm", "ancho_apertura_cm",
  "troncos_codominantes", "corteza_incluida", "grieta_union_codominante", "observaciones_tronco",
  "ramas_secas", "ramas_secas_pct_copa", "diametro_max_ramas_secas_cm",
  "ramas_quebradas", "numero_ramas_quebradas", "diametro_max_ramas_quebradas_cm", "permanece_suspendida",
  "defoliacion_estimada_pct", "clorosis_pct", "necrosis_pct", "desequilibrio_copa",
  "copa_faltante_pct", "exposicion_luminica_copa_cle", "muerte_regresiva_copa_pct", "observaciones_copa",
  "infraestructura_inmediata",
  "existe_vereda", "materialidad_vereda", "dano_interferencia_vereda",
  "presenta_levantamiento_vereda", "presenta_desplazamiento_horizontal_vereda", "presenta_grieta_vereda",
  "presenta_rotura_vereda", "presenta_hundimiento_vereda", "desnivel_max_vereda_cm",
  "numero_grietas_vereda", "ancho_max_grieta_vereda_cm", "longitud_max_grieta_vereda_cm",
  "superficie_afectada_vereda_m2", "reduce_circulacion_peatonal", "ancho_libre_remanente_m", "impide_paso_seguro",
  "existe_calzada", "materialidad_calzada", "dano_interferencia_calzada", "levantamiento_calzada",
  "grieta_fisuracion_calzada", "hundimiento_calzada", "rotura_calzada", "desnivel_max_calzada_cm",
  "superficie_afectada_calzada_m2", "afecta_circulacion_vehicular", "distancia_arbol_calzada_m",
  "existe_superficie_permeable",
  "existe_alcorque", "forma_alcorque", "largo_alcorque_m", "ancho_alcorque_m", "diametro_alcorque_m",
  "superficie_alcorque_m2_manual",
  "dano_interferencia_alcorque", "indicios_compactacion_superficial", "suelo_sellado_impermeabilizado",
  "obstaculos_crecimiento_radicular", "condicion_radicular_entorno",
  "contacto_interferencia_infraestructura_vertical", "tipo_infraestructura_vertical",
  "otro_tipo_infraestructura_vertical", "dano_fisico_observable_infraestructura_vertical",
  "compromete_estabilidad_funcionalidad",
  "interferencia_redes_servicios", "red_aerea_presente", "red_subterranea_presente",
  "tipo_red_aerea", "distancia_copa_red_aerea_m", "dano_interferencia_red_aerea",
  "tipo_red_subterranea", "distancia_arbol_red_subterranea_m", "afectacion_fisica_red_subterranea",
  "compromete_funcionalidad_red_subterranea", "observaciones_infraestructura",
  "presenta_tutorado", "tipo_tutorado", "condicion_tutorado", "interferencia_tutorado_arbol", "observaciones_tutorado",
  "zona_objetivo", "tasa_ocupacion_objetivo",
  "consecuencia_raices_cuello", "consecuencia_tronco", "consecuencia_copa_ramas",
  "clasificacion_vitalidad",
] as const;

/**
 * Alcance de REGISTRO_EVALUACION por tipo/subtipo (CC-040). Ya no
 * devuelve `null`: los tres tipos de evaluación completa usan
 * `CAMPOS_EVALUACION_COMPLETA` (corrección de la responsable,
 * 2026-10-25 — antes el Zod quedaba permisivo con esos tres mientras
 * la lista no estaba enumerada).
 */
export function camposPermitidosPorTipo(tipo: string, subtipo: string | null): readonly string[] | null {
  if (tipo === "evaluacion_instrumental") return CAMPOS_EVALUACION_INSTRUMENTAL;
  if (tipo === "monitoreo") {
    if (subtipo === "fitosanitario") return CAMPOS_MONITOREO_FITOSANITARIO;
    if (subtipo === "estructural") return CAMPOS_MONITOREO_ESTRUCTURAL;
    if (subtipo === "vitalidad") return CAMPOS_MONITOREO_VITALIDAD;
  }
  if (tipo === "evaluacion_inicial" || tipo === "reevaluacion" || tipo === "levantamiento") {
    return CAMPOS_EVALUACION_COMPLETA;
  }
  return null;
}
