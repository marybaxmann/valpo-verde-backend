import { esCodigoVigente } from "../../services/rules/engine/catalogs";

/**
 * Mismos pares tipo/subtipo que `fn_save_inspection_draft` (018e) y
 * `fn_create_work_order_inspeccion` (018h) — D-196/D-197. Se repite
 * aquí (API) por la misma razón que en ambas funciones SQL: ninguna
 * capa confía solo en la anterior. Si este par cambia, cambiarlo
 * también en esas dos funciones.
 */
export function tipoSubtipoValido(tipo: string, subtipo: string | null): boolean {
  if (!esCodigoVigente("tipo_inspeccion_realizada", tipo)) return false;
  switch (tipo) {
    case "evaluacion_inicial":
    case "levantamiento":
      return subtipo === null;
    case "reevaluacion":
      return subtipo === null || subtipo === "seguimiento" || subtipo === "post_intervencion";
    case "evaluacion_instrumental":
      return (
        subtipo === null ||
        subtipo === "tomografia_sonica" ||
        subtipo === "resistografia" ||
        subtipo === "otra_instrumental"
      );
    case "monitoreo":
      return subtipo === "fitosanitario" || subtipo === "estructural" || subtipo === "vitalidad";
    default:
      return false;
  }
}

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
 * no una lista cerrada; este archivo no la enumera completa todavía
 * (D-33 a D-169, más los módulos de infraestructura/alcorque sin
 * revisar en esta pasada) — ver el aviso en `camposPermitidosPorTipo`.
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
 * CC-040 (a): Vitalidad = clasificacion_vitalidad (D-169). Vacío
 * metodológico sin cerrar todavía (reportado, no inventado): el Excel
 * define el dominio como texto libre con 5 categorías ("0 Exploración"
 * a "Resignación", más "Muerto"), pero `catalogs.ts` (PR-021: código
 * persistente por catálogo) no tiene aún un catálogo
 * "clasificacion_vitalidad" con los códigos que debe usar la API/base
 * (el ENUM `clase_vitalidad` de `schema.sql` es la clasificación de
 * SALIDA de un módulo de cálculo que todavía no existe para Vitalidad,
 * no necesariamente los mismos códigos de ENTRADA del Inspector). Por
 * eso este campo se valida aquí solo como texto no vacío — no se
 * inventa un catálogo de códigos sin que la responsable lo apruebe.
 */
export const CAMPOS_MONITOREO_VITALIDAD = ["clasificacion_vitalidad"] as const;

/**
 * Alcance de REGISTRO_EVALUACION por tipo/subtipo (CC-040). Devuelve
 * `null` para Evaluación inicial, Reevaluación y Levantamiento: esos
 * tres exigen la evaluación COMPLETA (CC-040 punto 1), cuyo listado
 * total de campos (D-33 a D-169 y los módulos de infraestructura/
 * alcorque) todavía no está enumerado en este archivo — `null` señala
 * "sin lista cerrada todavía", no "cualquier campo es válido para
 * siempre". `guardarBorradorInspeccionSchema` trata `null` como
 * permisivo (acepta cualquier clave) y dejarlo así, documentado, en
 * vez de bloquear el guardado real de una Evaluación inicial/
 * Reevaluación/Levantamiento mientras esa lista no esté completa.
 */
export function camposPermitidosPorTipo(tipo: string, subtipo: string | null): readonly string[] | null {
  if (tipo === "evaluacion_instrumental") return CAMPOS_EVALUACION_INSTRUMENTAL;
  if (tipo === "monitoreo") {
    if (subtipo === "fitosanitario") return CAMPOS_MONITOREO_FITOSANITARIO;
    if (subtipo === "estructural") return CAMPOS_MONITOREO_ESTRUCTURAL;
    if (subtipo === "vitalidad") return CAMPOS_MONITOREO_VITALIDAD;
  }
  return null;
}
