/**
 * Ensamblaje — compone R01–R04, M01–M05 y las fechas sugeridas en el
 * formato de salida de `evaluations` y `tree_assessments` (migración
 * 014). Puro: no consulta Supabase, `work_orders`, `v_tree_current_
 * inputs` ni `classification_adjustments` — recibe todo ya armado. La
 * composición de valores vigentes (diseño Fase 3, §3.10 bis; REGLAS_
 * GENERALES "Preguardado y finalización"; CC-040) la entrega la Fase 6
 * desde `v_tree_current_inputs`; este módulo no la recalcula.
 *
 * Dos funciones, no una, porque `evaluations` y `tree_assessments` son
 * conceptualmente distintas (diseño Fase 3, §3.9 y §3.10 bis):
 * `evaluations` es el resultado de *esta* inspección
 * (`variables_calculo` = lo registrado + lo vigente en ese momento);
 * `tree_assessments` es la evaluación *vigente* del árbol, recompuesta
 * campo por campo tras cada OT completada o inspección anulada
 * (diseño Fase 3, §3.10 bis).
 *
 * Orden de cálculo (corregido por la responsable, 2026-10-22): R04
 * (riesgo calculado) y M04 (infraestructura calculada) → se resuelve
 * el valor efectivo de riesgo e infraestructura (ajustado si existe y
 * coincide, calculado si no) → M05 con los dos efectivos → se resuelve
 * el valor efectivo de prioridad comparando contra el resultado de
 * M05 que se acaba de calcular → fechas sugeridas (solo en
 * `ensamblarResultadoEvaluacion`) con nivel_riesgo = riesgo efectivo
 * (D-200: "igual a clasificacion_riesgo... incluido su ajuste").
 *
 * CC-044 (2026-10-22): el Inspector puede ajustar una clasificación
 * cuyo valor calculado es `no_determinado` (riesgo/prioridad) o
 * `no_aplica` (infraestructura), con justificación — D-171 y PR-008
 * v2.0 permiten el ajuste justificado pero el Excel no decía si aplica
 * cuando el cálculo no está determinado. `valorCalculadoEnElAjuste`
 * admite esos dos valores sin problema (es solo una foto del momento);
 * lo que NUNCA es válido es que el **valor ajustado** mismo sea
 * `no_determinado`/`no_aplica` — un ajuste siempre resuelve a una
 * categoría concreta. `resolverValorEfectivo` valida esto (y cualquier
 * otro código fuera de dominio) antes de aceptar el ajuste; si no pasa,
 * se descarta con motivo "valor ajustado fuera del dominio" — nunca se
 * usa un valor inválido ni se afirma con "!" un resultado que podría
 * no existir (ver el comentario sobre `m05.clasificacionPrioridad` más
 * abajo, que corrige exactamente ese hallazgo).
 *
 * CC-045 (2026-10-22) — cierra los dos bloqueos que dejó abiertos la
 * primera versión de este módulo:
 * (a) Ajustes ante una inspección anulada. CC-040 (d) se generaliza:
 *     aplica igual sin importar qué disparó el recálculo de la
 *     vigente — una OT completada o una `inspeccion_anulada`. Los
 *     ajustes que pertenecen a la inspección que se está anulando
 *     nunca aplican a la vigente (se conservan en el historial, pero
 *     eso es un hecho de la base de datos, no de este módulo):
 *     `ensamblarResultadoVigente` recibe `inspeccionAnuladaId` y
 *     filtra (`filtrarPorAnulacion`) cualquier `AjusteVigente` cuyo
 *     `inspectionId` coincida, antes de siquiera intentar compararlo.
 *     Un ajuste de una inspección válida anterior que haya quedado
 *     descartado solo por culpa de la anulada se vuelve a evaluar con
 *     la misma regla de CC-040 (d) — si quien llama lo pasa como el
 *     ajuste candidato, esta función ya lo compara correctamente sin
 *     necesitar saber que hubo una anulación de por medio.
 * (b) Fechas sugeridas con `nivel_riesgo = no_determinado`. Ya no es
 *     un bloqueo: `fechas-sugeridas.ts` devuelve el rango de Extremo
 *     como criterio de precaución, con motivo "CC-045 (b)" — nunca
 *     `noDeterminable: true` para este caso. Si el Inspector ajusta el
 *     riesgo (CC-044), las fechas usan el valor ajustado (ya ocurre
 *     así: `nivel_riesgo` siempre es el riesgo efectivo).
 *
 * CC-055 (2026-10-25): en un Monitoreo, `fecha_proxima_inspeccion`
 * sugerida es la menor entre la vigente del árbol
 * (`fechaProximaInspeccionVigenteISO`, que entrega la Fase 6) y la
 * calculada, nunca anterior al día siguiente a `fecha_inspeccion`. Los
 * demás tipos no cambian.
 *
 * Discrepancia encontrada contra el plan aprobado (reportada, no
 * resuelta en silencio): la migración 014 NO tiene columnas
 * `fecha_proxima_inspeccion`/`fecha_proximo_monitoreo` en `evaluations`
 * — esas dos columnas (más sus `_sugerida`) viven en `inspections`
 * (§3.8; D-202/D-203). Tampoco existe una columna `nivel_riesgo`: por
 * diseño (§1 principio 5, "valores derivados no se duplican") nunca
 * se guarda — se deriva en vivo con la vista `v_inspections` (D-200).
 * Por eso esta función devuelve `inspeccion: { nivelRiesgo,
 * fechaProximaInspeccionSugerida, fechaProximoMonitoreoSugerida }`
 * como un bloque aparte, con el comentario de a qué tabla/columna
 * corresponde cada uno — la Fase 6 debe escribirlos en `inspections`,
 * no mezclarlos en el INSERT de `evaluations`.
 */

import {
  ClasificacionInfraestructuraCodigo,
  ClasificacionPrioridadCodigo,
  ClasificacionRiesgoCodigo,
  ConsecuenciaCodigo,
  FormaAlcorqueCodigo,
  SubtipoInspeccionCodigo,
  TasaOcupacionCodigo,
  TipoInspeccionRealizadaCodigo,
  ZonaObjetivoCodigo,
} from "./catalogs";
import {
  calcularFechaProximaInspeccion,
  calcularFechaProximaInspeccionMonitoreo,
  calcularFechaProximoMonitoreo,
  FechaSugeridaResultado,
} from "./fechas-sugeridas";
import { calcularCumplimientoDistanciaSeguridad, evaluarM04, M04Input, M04Resultado } from "./m04-infraestructura";
import { evaluarM01 } from "./m01-probabilidad-impacto";
import { evaluarClasificacionComponente } from "./m02-m03-clasificacion-componente";
import { evaluarM05 } from "./m05-prioridad";
import { evaluarR01, R01Input, R01Resultado } from "./r01-raices-cuello";
import { evaluarR02, R02Input, R02Resultado } from "./r02-tronco";
import { evaluarR03, R03Input, R03Resultado } from "./r03-copa-ramas";
import { evaluarR04 } from "./r04-clasificacion-riesgo";
import { calcularSuperficieAlcorqueM2, ResultadoCalculo } from "./variables-calculo";
import { RULE_VERSION } from "./version";

// =====================================================================
// 1. Alcance por tipo de inspección (CC-040 a, b)
// =====================================================================

/** R01: las entradas de la cavidad basal (D-39 a D-47). */
const CAMPOS_INSTRUMENTAL_R01 = [
  "cavidad_pudricion_basal",
  "cavidad_basal_externa",
  "cavidad_basal_interna",
  "D_diametro_basal_tronco_cm",
  "d_diametro_cavidad_basal_cm",
  "Cc_longitud_abertura_cavidad_cm",
  "C_circunferencia_basal_cm",
  "t_pared_residual_basal_cm",
] as const;

/** R02: las entradas de la cavidad del tronco (D-51 a D-59). */
const CAMPOS_INSTRUMENTAL_R02 = [
  "presenta_cavidad_pudricion_tronco",
  "cavidad_externa_tronco",
  "cavidad_interna_tronco",
  "D_diametro_tronco_cm",
  "d_diametro_cavidad_tronco_cm",
  "Cc_longitud_abertura_tronco_cm",
  "C_circunferencia_tronco_cm",
  "t_pared_residual_tronco_cm",
] as const;

/** Evaluación instrumental: solo los campos de cavidad basal y de tronco. */
const CAMPOS_INSTRUMENTAL = new Set<string>([...CAMPOS_INSTRUMENTAL_R01, ...CAMPOS_INSTRUMENTAL_R02]);

/** Monitoreo, subtipo Fitosanitario (CC-040 decisión a). */
const CAMPOS_FITOSANITARIO = new Set<string>([
  "defoliacion_estimada_pct",
  "clorosis_pct",
  "necrosis_pct",
  "muerte_regresiva_copa_pct",
  "presenta_exudaciones",
]);

/** Todas las entradas de R01 (D-33 a D-47). */
const CAMPOS_R01 = [
  "levantamiento_del_plato_radicular",
  "angulo_inclinacion",
  "raices_expuestas",
  "necrosis_radicular",
  "raices_cortadas",
  "cavidad_pudricion_basal",
  "cavidad_basal_externa",
  "cavidad_basal_interna",
  "D_diametro_basal_tronco_cm",
  "d_diametro_cavidad_basal_cm",
  "Cc_longitud_abertura_cavidad_cm",
  "C_circunferencia_basal_cm",
  "t_pared_residual_basal_cm",
] as const;

/** Todas las entradas de R02 (D-51 a D-74). */
const CAMPOS_R02 = [
  "presenta_cavidad_pudricion_tronco",
  "cavidad_externa_tronco",
  "cavidad_interna_tronco",
  "D_diametro_tronco_cm",
  "d_diametro_cavidad_tronco_cm",
  "Cc_longitud_abertura_tronco_cm",
  "C_circunferencia_tronco_cm",
  "t_pared_residual_tronco_cm",
  "presenta_heridas_tronco",
  "condicion_heridas_tronco",
  "corteza_muerta_ausente",
  "presenta_exudaciones",
  "presenta_fisura_grieta_tronco",
  "afectacion_fisura_grieta",
  "direccion_grieta",
  "troncos_codominantes",
  "grieta_union_codominante",
  "corteza_incluida",
] as const;

/** Todas las entradas de R03 (D-76 a D-86). */
const CAMPOS_R03 = ["ramas_secas", "ramas_secas_pct_copa", "ramas_quebradas", "desequilibrio_copa", "defoliacion_estimada_pct"] as const;

/** Monitoreo, subtipo Estructural (CC-040 decisión a): entradas de R01 + R02 + R03. */
const CAMPOS_ESTRUCTURAL = new Set<string>([...CAMPOS_R01, ...CAMPOS_R02, ...CAMPOS_R03]);

/** Monitoreo, subtipo Vitalidad (CC-040 decisión a). */
const CAMPOS_VITALIDAD = new Set<string>(["clasificacion_vitalidad"]);

export interface AlcanceResultado {
  /** Campos registrados en esta inspección que no pertenecen al alcance de su tipo/subtipo. */
  camposFueraDeAlcance: string[];
  /** Valores que el alcance prohíbe explícitamente (CC-040 b), distintos de "campo fuera de alcance". */
  valoresNoPermitidosEnAlcance: string[];
}

/**
 * CC-040 (a, b). No lanza ni bloquea: devuelve las listas de problemas
 * para que la Fase 6 decida (rechazar el guardado, advertir, etc.).
 */
export function validarAlcance(
  tipoInspeccionRealizada: TipoInspeccionRealizadaCodigo,
  subtipoInspeccion: SubtipoInspeccionCodigo | null,
  variablesRegistradas: Record<string, unknown>,
): AlcanceResultado {
  const camposFueraDeAlcance: string[] = [];
  const valoresNoPermitidosEnAlcance: string[] = [];
  const camposRegistrados = Object.keys(variablesRegistradas);

  let alcancePermitido: Set<string> | null = null; // null = sin restricción (alcance completo)

  if (tipoInspeccionRealizada === "evaluacion_instrumental") {
    alcancePermitido = CAMPOS_INSTRUMENTAL;

    // CC-040 (b): en la Evaluación instrumental, las cavidades internas
    // solo admiten Sí o No — "Requiere evaluación instrumental" no es
    // un valor permitido en este alcance (sería la condición que la
    // propia evaluación instrumental viene a resolver).
    if (variablesRegistradas.cavidad_basal_interna === "requiere_evaluacion_instrumental") {
      valoresNoPermitidosEnAlcance.push(
        'cavidad_basal_interna = "requiere_evaluacion_instrumental" no está permitido en Evaluación instrumental (CC-040 b)',
      );
    }
    if (variablesRegistradas.cavidad_interna_tronco === "requiere_evaluacion_instrumental") {
      valoresNoPermitidosEnAlcance.push(
        'cavidad_interna_tronco = "requiere_evaluacion_instrumental" no está permitido en Evaluación instrumental (CC-040 b)',
      );
    }
  } else if (tipoInspeccionRealizada === "monitoreo") {
    if (subtipoInspeccion === "fitosanitario") alcancePermitido = CAMPOS_FITOSANITARIO;
    else if (subtipoInspeccion === "estructural") alcancePermitido = CAMPOS_ESTRUCTURAL;
    else if (subtipoInspeccion === "vitalidad") alcancePermitido = CAMPOS_VITALIDAD;
    else {
      // subtipo ausente o no reconocido para Monitoreo: no se puede
      // determinar el alcance — no se inventa un subtipo por defecto.
      // Todo lo registrado queda señalado como fuera de un alcance que
      // no se pudo confirmar.
      alcancePermitido = new Set<string>();
    }
  }
  // evaluacion_inicial / reevaluacion / levantamiento: alcancePermitido
  // queda null → alcance completo, sin restricción (CC-040 a).

  if (alcancePermitido !== null) {
    for (const campo of camposRegistrados) {
      if (!alcancePermitido.has(campo)) camposFueraDeAlcance.push(campo);
    }
  }

  return { camposFueraDeAlcance, valoresNoPermitidosEnAlcance };
}

// =====================================================================
// 2. Núcleo de cálculo — siempre completo, sin ramas por alcance
// =====================================================================

/**
 * Entradas de alcorque (D-120 a D-125): no las consume ninguna regla
 * de clasificación de M04 (M04 solo usa las 3 condiciones booleanas
 * de IN-ALC) — se agregan aquí solo para poder calcular
 * `superficie_alcorque_m2` y exponerla en `calculados`, tal como pidió
 * la responsable.
 */
export interface EntradasAlcorque {
  forma_alcorque: FormaAlcorqueCodigo | null;
  largo_alcorque_m: number | null;
  ancho_alcorque_m: number | null;
  diametro_alcorque_m: number | null;
  superficie_alcorque_m2_manual: number | null;
}

export type NucleoEntradas = R01Input &
  R02Input &
  R03Input &
  M04Input &
  EntradasAlcorque & {
    zona_objetivo: ZonaObjetivoCodigo | null;
    tasa_ocupacion_objetivo: TasaOcupacionCodigo | null;
    consecuencia_raices_cuello: ConsecuenciaCodigo | null;
    consecuencia_tronco: ConsecuenciaCodigo | null;
    consecuencia_copa_ramas: ConsecuenciaCodigo | null;
  };

export interface NucleoResultado {
  r01: R01Resultado;
  r02: R02Resultado;
  r03: R03Resultado;
  m04: M04Resultado;
  /** "no_determinado" (CC-024) cuando el componente no pudo clasificarse — nunca null salvo error interno. */
  clasificacionRaicesCuello: ClasificacionRiesgoCodigo;
  clasificacionTronco: ClasificacionRiesgoCodigo;
  clasificacionCopaRamas: ClasificacionRiesgoCodigo;
  /** "no_determinado" (D-171) cuando algún componente no se pudo clasificar. */
  clasificacionRiesgoCalculada: ClasificacionRiesgoCodigo;
  /** Nunca "no_determinado" (D-170): bajo/moderado/alto/critico/no_aplica. */
  clasificacionInfraestructuraCalculada: ClasificacionInfraestructuraCodigo;
}

function calcularNucleo(entradas: NucleoEntradas): NucleoResultado {
  const r01 = evaluarR01(entradas);
  const r02 = evaluarR02(entradas);
  const r03 = evaluarR03(entradas);
  const m01 = evaluarM01(entradas.zona_objetivo, entradas.tasa_ocupacion_objetivo);

  const componenteRaicesCuello = evaluarClasificacionComponente(
    r01.probabilidadFalla,
    m01.probabilidadImpacto,
    entradas.consecuencia_raices_cuello,
  );
  const componenteTronco = evaluarClasificacionComponente(r02.probabilidadFalla, m01.probabilidadImpacto, entradas.consecuencia_tronco);
  const componenteCopaRamas = evaluarClasificacionComponente(
    r03.probabilidadFalla,
    m01.probabilidadImpacto,
    entradas.consecuencia_copa_ramas,
  );

  // CC-024: un componente no determinado se representa con el código
  // explícito "no_determinado" — nunca con null ni se omite.
  const clasificacionRaicesCuello: ClasificacionRiesgoCodigo = componenteRaicesCuello.noDeterminado
    ? "no_determinado"
    : componenteRaicesCuello.clasificacion!;
  const clasificacionTronco: ClasificacionRiesgoCodigo = componenteTronco.noDeterminado ? "no_determinado" : componenteTronco.clasificacion!;
  const clasificacionCopaRamas: ClasificacionRiesgoCodigo = componenteCopaRamas.noDeterminado
    ? "no_determinado"
    : componenteCopaRamas.clasificacion!;

  const r04 = evaluarR04(clasificacionRaicesCuello, clasificacionTronco, clasificacionCopaRamas);
  const clasificacionRiesgoCalculada: ClasificacionRiesgoCodigo = r04.noDeterminado ? "no_determinado" : r04.clasificacionRiesgo!;

  const m04 = evaluarM04(entradas);

  return {
    r01,
    r02,
    r03,
    m04,
    clasificacionRaicesCuello,
    clasificacionTronco,
    clasificacionCopaRamas,
    clasificacionRiesgoCalculada,
    clasificacionInfraestructuraCalculada: m04.clasificacionInfraestructura,
  };
}

function calcularCalculados(entradas: NucleoEntradas, nucleo: NucleoResultado) {
  return {
    SL_basal_pct: nucleo.r01.variablesCalculo.SL_basal_pct,
    R_radio_basal_cm: nucleo.r01.variablesCalculo.R_radio_basal_cm,
    t_R_basal: nucleo.r01.variablesCalculo.t_R_basal,
    SL_tronco_pct: nucleo.r02.variablesCalculo.SL_tronco_pct,
    R_radio_tronco_cm: nucleo.r02.variablesCalculo.R_radio_tronco_cm,
    t_R_tronco: nucleo.r02.variablesCalculo.t_R_tronco,
    superficie_alcorque_m2: calcularSuperficieAlcorqueM2(entradas),
    // D-142, calculado desde distancia_copa_red_aerea_m (D-140) — no es
    // un ResultadoCalculo con `motivo`; es "cumple"/"no_cumple"/null.
    cumplimiento_distancia_seguridad_bt_mt: calcularCumplimientoDistanciaSeguridad(entradas.distancia_copa_red_aerea_m),
  };
}

function calcularIndicadores(nucleo: NucleoResultado) {
  return {
    estabilidad: nucleo.r01.indicadores.estabilidad,
    raicesExpuestas: nucleo.r01.indicadores.raicesExpuestas,
    cavidadBasal: nucleo.r01.indicadores.cavidadBasal,
    cavidadTronco: nucleo.r02.indicadores.cavidadTronco,
    heridas: nucleo.r02.indicadores.heridas,
    cortezaMuertaAusente: nucleo.r02.indicadores.cortezaMuertaAusente,
    exudaciones: nucleo.r02.indicadores.exudaciones,
    fisurasGrietas: nucleo.r02.indicadores.fisurasGrietas,
    codominancia: nucleo.r02.indicadores.codominancia,
    ramasSecas: nucleo.r03.indicadores.ramasSecas,
    ramasQuebradas: nucleo.r03.indicadores.ramasQuebradas,
    desequilibrioCopa: nucleo.r03.indicadores.desequilibrioCopa,
    defoliacion: nucleo.r03.indicadores.defoliacion,
    vereda: nucleo.m04.componentes.vereda,
    calzada: nucleo.m04.componentes.calzada,
    alcorque: nucleo.m04.componentes.alcorque,
    infraestructuraVertical: nucleo.m04.componentes.infraestructuraVertical,
    redAerea: nucleo.m04.componentes.redAerea,
    redSubterranea: nucleo.m04.componentes.redSubterranea,
  };
}

type Calculados = ReturnType<typeof calcularCalculados>;
type Indicadores = ReturnType<typeof calcularIndicadores>;

// =====================================================================
// 3. Ajuste → valor efectivo → descarte (CC-040 d, PR-008 v2.0)
// =====================================================================

/** classification_adjustments: el ajuste vigente de un campo, tal como lo entrega quien llama. */
export interface AjusteVigente<T extends string = string> {
  valorAjustado: T;
  /** El valor calculado que el Inspector tenía delante cuando ajustó (classification_adjustments.valor_calculado). */
  valorCalculadoEnElAjuste: T;
  adjustmentId: string;
  /**
   * La inspección que registró este ajuste (evaluations.inspection_id
   * de la fila de `classification_adjustments`). CC-045 (a): si en
   * `ensamblarResultadoVigente` esta inspección es la que se está
   * anulando (`inspeccionAnuladaId`), el ajuste se ignora por
   * completo — como si no existiera, sin comparar nada. Opcional
   * porque solo es necesario cuando el recálculo lo dispara una
   * anulación; en `ensamblarResultadoEvaluacion` no aplica.
   */
  inspectionId?: string;
}

export interface AjusteDescartado {
  campo: "clasificacion_riesgo" | "clasificacion_infraestructura" | "clasificacion_prioridad";
  valorCalculadoAnterior: string;
  valorAjustado: string;
  nuevoValorCalculado: string;
  adjustmentId: string;
  motivo: string;
}

/**
 * Valores de clasificación determinada admitidos como **valor ajustado**
 * en cada campo. `no_determinado` (riesgo, prioridad) y `no_aplica`
 * (infraestructura) son resultados calculados legítimos, pero el
 * Inspector nunca ajusta *a* ellos — un ajuste siempre resuelve a una
 * categoría concreta (D-171, PR-008 v2.0).
 */
const CODIGOS_AJUSTE_VALIDOS: Record<AjusteDescartado["campo"], readonly string[]> = {
  clasificacion_riesgo: ["bajo", "moderado", "alto", "extremo"],
  clasificacion_infraestructura: ["bajo", "moderado", "alto", "critico"],
  clasificacion_prioridad: ["baja", "media", "alta", "critica"],
};

export interface AjustesEntrada {
  riesgo?: AjusteVigente<ClasificacionRiesgoCodigo> | null;
  infraestructura?: AjusteVigente<ClasificacionInfraestructuraCodigo> | null;
  prioridad?: AjusteVigente<ClasificacionPrioridadCodigo> | null;
}

interface ResolucionValorEfectivo<T extends string> {
  valorEfectivo: T;
  /** El id del ajuste que se mantuvo, o null si no había ajuste o se descartó. */
  ajusteMantenidoId: string | null;
  ajusteDescartado: AjusteDescartado | null;
}

/**
 * CC-040 (d): el ajuste se mantiene solo si el valor recalculado
 * coincide con el valor calculado sobre el que se hizo. Si no, se
 * descarta: el valor efectivo vuelve a ser el calculado y se registra
 * el descarte. CC-045 (a) (2026-10-22): esta regla aplica igual sin
 * importar qué disparó el recálculo — una OT completada o una
 * inspección anulada; esta función en sí no distingue el evento,
 * porque no necesita hacerlo. El filtrado específico de "el ajuste
 * pertenece a la inspección que se está anulando, así que se ignora
 * por completo" ocurre antes de llegar aquí (ver `filtrarPorAnulacion`
 * y `resolverAjustesYPrioridad`).
 *
 * CC-044 (2026-10-22): `valorCalculado`/`valorCalculadoEnElAjuste`
 * pueden legítimamente ser `no_determinado` (riesgo/prioridad) o
 * `no_aplica` (infraestructura) — el Inspector puede ajustar una
 * clasificación cuyo valor calculado no está determinado, con
 * justificación. Lo que nunca es válido es que el **valor ajustado**
 * (`valorAjustado`, el destino del ajuste) sea uno de esos dos
 * valores: un ajuste siempre resuelve a una categoría concreta. Si
 * llega un `valorAjustado` fuera de dominio o igual a `no_determinado`/
 * `no_aplica`, el ajuste se descarta sin comparar fechas — nunca se
 * usa un valor que no es una clasificación determinada válida.
 */
function resolverValorEfectivo<T extends string>(
  campo: AjusteDescartado["campo"],
  valorCalculado: T,
  ajuste: AjusteVigente<T> | null | undefined,
): ResolucionValorEfectivo<T> {
  // Nota: AjusteDescartado se guarda con sus valores como `string`
  // simple (no genérico en T) para evitar un problema de varianza al
  // acumular descartes de riesgo/infraestructura/prioridad —  tres T
  // distintos — en un solo arreglo (ver resolverAjustesYPrioridad).
  if (!ajuste) {
    return { valorEfectivo: valorCalculado, ajusteMantenidoId: null, ajusteDescartado: null };
  }
  if (!CODIGOS_AJUSTE_VALIDOS[campo].includes(ajuste.valorAjustado)) {
    return {
      valorEfectivo: valorCalculado,
      ajusteMantenidoId: null,
      ajusteDescartado: {
        campo,
        valorCalculadoAnterior: ajuste.valorCalculadoEnElAjuste,
        valorAjustado: ajuste.valorAjustado,
        nuevoValorCalculado: valorCalculado,
        adjustmentId: ajuste.adjustmentId,
        motivo: "valor ajustado fuera del dominio",
      },
    };
  }
  if (ajuste.valorCalculadoEnElAjuste === valorCalculado) {
    return { valorEfectivo: ajuste.valorAjustado, ajusteMantenidoId: ajuste.adjustmentId, ajusteDescartado: null };
  }
  return {
    valorEfectivo: valorCalculado,
    ajusteMantenidoId: null,
    ajusteDescartado: {
      campo,
      valorCalculadoAnterior: ajuste.valorCalculadoEnElAjuste,
      valorAjustado: ajuste.valorAjustado,
      nuevoValorCalculado: valorCalculado,
      adjustmentId: ajuste.adjustmentId,
      motivo: "el valor recalculado no coincide con el valor calculado sobre el que se hizo el ajuste",
    },
  };
}

/** Exportada para poder probarla de forma aislada. */
export { resolverValorEfectivo };

/**
 * CC-045 (a): si `ajuste` pertenece a la inspección que se está
 * anulando, se ignora por completo — nunca se compara, nunca se usa,
 * como si no se hubiera pasado. "Se conservan en el historial" (la
 * fila de `classification_adjustments` no se borra) es un hecho de la
 * base de datos, no de esta función: aquí solo se decide si cuenta
 * para la vigente que se está recalculando.
 *
 * Si `ajuste.inspectionId` no viene informado, no se filtra nada (no
 * hay información suficiente para decidir) — quien llama debe
 * informarlo siempre que pase `inspeccionAnuladaId`.
 */
function filtrarPorAnulacion<T extends string>(
  ajuste: AjusteVigente<T> | null | undefined,
  inspeccionAnuladaId: string | null | undefined,
): AjusteVigente<T> | null | undefined {
  if (!ajuste || !inspeccionAnuladaId) return ajuste;
  if (ajuste.inspectionId === inspeccionAnuladaId) return null;
  return ajuste;
}

interface ResultadoResolucionCompleta {
  riesgoEfectivo: ClasificacionRiesgoCodigo;
  infraestructuraEfectiva: ClasificacionInfraestructuraCodigo;
  prioridadCalculada: ClasificacionPrioridadCodigo;
  prioridadEfectiva: ClasificacionPrioridadCodigo;
  clasificacionRiesgoAjustada: ClasificacionRiesgoCodigo | null;
  clasificacionInfraestructuraAjustada: ClasificacionInfraestructuraCodigo | null;
  clasificacionPrioridadAjustada: ClasificacionPrioridadCodigo | null;
  adjustmentIdsVigentes: string[];
  ajustesDescartados: AjusteDescartado[];
}

/**
 * Orden exacto (corregido 2026-10-22): riesgo e infraestructura
 * calculados → efectivos → M05 con los efectivos → prioridad
 * calculada (salida de M05) → efectiva, comparada contra el ajuste de
 * prioridad si lo hay.
 *
 * CC-045 (a): si `inspeccionAnuladaId` viene informado (el recálculo
 * lo dispara una inspección anulada), cualquier ajuste que pertenezca
 * a esa inspección se ignora por completo antes de resolver — nunca
 * se compara. Un ajuste de una inspección válida anterior que haya
 * quedado descartado solo por culpa de la anulada se vuelve a evaluar
 * aquí mismo con la regla normal de CC-040 (d), porque es exactamente
 * el mismo mecanismo: si quien llama pasa ese ajuste anterior, esta
 * función lo compara contra el nuevo valor calculado sin saber ni
 * necesitar saber que hubo una anulación de por medio.
 */
function resolverAjustesYPrioridad(
  nucleo: NucleoResultado,
  ajustes: AjustesEntrada | undefined,
  inspeccionAnuladaId?: string | null,
): ResultadoResolucionCompleta {
  const ajusteRiesgo = filtrarPorAnulacion(ajustes?.riesgo, inspeccionAnuladaId);
  const ajusteInfraestructura = filtrarPorAnulacion(ajustes?.infraestructura, inspeccionAnuladaId);
  const ajustePrioridad = filtrarPorAnulacion(ajustes?.prioridad, inspeccionAnuladaId);

  const resRiesgo = resolverValorEfectivo("clasificacion_riesgo", nucleo.clasificacionRiesgoCalculada, ajusteRiesgo);
  const resInfraestructura = resolverValorEfectivo(
    "clasificacion_infraestructura",
    nucleo.clasificacionInfraestructuraCalculada,
    ajusteInfraestructura,
  );

  const m05 = evaluarM05(resRiesgo.valorEfectivo, resInfraestructura.valorEfectivo);
  // m05.clasificacionPrioridad solo es null si a evaluarM05 se le pasó
  // un valor sin valor o fuera de dominio. Como resolverValorEfectivo ya
  // descarta cualquier valorAjustado fuera de dominio, resRiesgo.
  // valorEfectivo/resInfraestructura.valorEfectivo siempre son códigos
  // válidos (calculado o ajustado-validado) — este null no debería
  // alcanzarse. Aun así, no se afirma con "!": si ocurriera, se trata
  // como no_determinado en vez de propagar un null silencioso con un
  // tipo que promete string.
  const prioridadCalculada: ClasificacionPrioridadCodigo = m05.clasificacionPrioridad ?? "no_determinado";

  const resPrioridad = resolverValorEfectivo("clasificacion_prioridad", prioridadCalculada, ajustePrioridad);

  const ajustesDescartados = [resRiesgo.ajusteDescartado, resInfraestructura.ajusteDescartado, resPrioridad.ajusteDescartado].filter(
    (a): a is AjusteDescartado => a !== null,
  );
  const adjustmentIdsVigentes = [resRiesgo.ajusteMantenidoId, resInfraestructura.ajusteMantenidoId, resPrioridad.ajusteMantenidoId].filter(
    (id): id is string => id !== null,
  );

  return {
    riesgoEfectivo: resRiesgo.valorEfectivo,
    infraestructuraEfectiva: resInfraestructura.valorEfectivo,
    prioridadCalculada,
    prioridadEfectiva: resPrioridad.valorEfectivo,
    clasificacionRiesgoAjustada: resRiesgo.ajusteMantenidoId ? resRiesgo.valorEfectivo : null,
    clasificacionInfraestructuraAjustada: resInfraestructura.ajusteMantenidoId ? resInfraestructura.valorEfectivo : null,
    clasificacionPrioridadAjustada: resPrioridad.ajusteMantenidoId ? resPrioridad.valorEfectivo : null,
    adjustmentIdsVigentes,
    ajustesDescartados,
  };
}

// =====================================================================
// 4. ensamblarResultadoEvaluacion — forma de `evaluations`
// =====================================================================

export interface ArgsResultadoEvaluacion {
  /** Solo lo registrado en esta inspección (diseño Fase 3, §3.10 bis; REGLAS_GENERALES "Preguardado y finalización"; CC-040). Se usa para el alcance y se devuelve tal cual — nunca para calcular. */
  variables: Record<string, unknown>;
  /** Registrado + vigente en ese momento, ya compuesto por la Fase 6 (§3.9). Esto es lo que se calcula. */
  variablesCalculo: NucleoEntradas;
  tipoInspeccionRealizada: TipoInspeccionRealizadaCodigo;
  subtipoInspeccion?: SubtipoInspeccionCodigo | null;
  ajustes?: AjustesEntrada;
  fechaInspeccionISO: string | null;
  /**
   * CC-055: fecha de próxima inspección vigente del árbol
   * (`v_tree_fechas_vigentes.fecha_proxima_inspeccion`), o null si no
   * tiene. Solo se usa en Monitoreo; en los demás tipos se ignora.
   */
  fechaProximaInspeccionVigenteISO?: string | null;
  motorCommit: string;
}

export interface ResultadoEvaluacion {
  // --- evaluations ---
  variables: Record<string, unknown>;
  variables_calculo: NucleoEntradas;
  calculados: Calculados;
  indicadores: Indicadores;
  puntaje_raices_cuello: number | null;
  probabilidad_falla_raices_cuello: R01Resultado["probabilidadFalla"];
  puntaje_tronco: number | null;
  probabilidad_falla_tronco: R02Resultado["probabilidadFalla"];
  puntaje_copa_ramas: number | null;
  probabilidad_falla_copa_ramas: R03Resultado["probabilidadFalla"];
  probabilidad_impacto: string | null;
  clasificacion_raices_cuello: ClasificacionRiesgoCodigo;
  clasificacion_tronco: ClasificacionRiesgoCodigo;
  clasificacion_copa_ramas: ClasificacionRiesgoCodigo;
  clasificacion_riesgo_calculada: ClasificacionRiesgoCodigo;
  puntaje_infraestructura: number | null;
  pct_infraestructura: number | null;
  clasificacion_infraestructura_calculada: ClasificacionInfraestructuraCodigo;
  clasificacion_prioridad_calculada: ClasificacionPrioridadCodigo;
  clasificacion_riesgo_ajustada: ClasificacionRiesgoCodigo | null;
  clasificacion_infraestructura_ajustada: ClasificacionInfraestructuraCodigo | null;
  clasificacion_prioridad_ajustada: ClasificacionPrioridadCodigo | null;
  rule_version: typeof RULE_VERSION;
  motor_commit: string;

  /**
   * NO son columnas de `evaluations` (ver discrepancia en el
   * encabezado del archivo): `nivelRiesgo` no se guarda nunca (D-200,
   * vista `v_inspections`); `fechaProximaInspeccionSugerida` y
   * `fechaProximoMonitoreoSugerida` van a `inspections.fecha_proxima_
   * inspeccion_sugerida` e `inspections.fecha_proximo_monitoreo_
   * sugerida` — la Fase 6 debe escribirlas ahí, no en el INSERT de
   * `evaluations`.
   */
  inspeccion: {
    nivelRiesgo: ClasificacionRiesgoCodigo; // D-200; informativo, no se persiste
    fechaProximaInspeccionSugerida: FechaSugeridaResultado; // -> inspections.fecha_proxima_inspeccion_sugerida
    fechaProximoMonitoreoSugerida: FechaSugeridaResultado; // -> inspections.fecha_proximo_monitoreo_sugerida
  };

  alcance: AlcanceResultado;

  /**
   * No tiene columna en `evaluations` (solo `tree_assessments` la
   * tiene). Por diseño, el ajuste solo se registra antes de finalizar
   * (§3.10) — en la práctica debería llegar vacío aquí. Se expone
   * igual, por si la Fase 6 necesita advertir al Inspector antes de
   * guardar.
   */
  ajustesDescartados: AjusteDescartado[];
}

export function ensamblarResultadoEvaluacion(args: ArgsResultadoEvaluacion): ResultadoEvaluacion {
  const alcance = validarAlcance(args.tipoInspeccionRealizada, args.subtipoInspeccion ?? null, args.variables);
  const nucleo = calcularNucleo(args.variablesCalculo);
  const resolucion = resolverAjustesYPrioridad(nucleo, args.ajustes);

  // CC-055: Monitoreo puede adelantar la reinspección, nunca atrasarla;
  // los demás tipos la renuevan desde el riesgo nuevo, como antes.
  const fechaProximaInspeccionSugerida =
    args.tipoInspeccionRealizada === "monitoreo"
      ? calcularFechaProximaInspeccionMonitoreo(
          resolucion.riesgoEfectivo,
          args.fechaInspeccionISO,
          args.fechaProximaInspeccionVigenteISO ?? null,
        )
      : calcularFechaProximaInspeccion(resolucion.riesgoEfectivo, args.fechaInspeccionISO);
  const fechaProximoMonitoreoSugerida = calcularFechaProximoMonitoreo(resolucion.riesgoEfectivo, args.fechaInspeccionISO);

  return {
    variables: args.variables,
    variables_calculo: args.variablesCalculo,
    calculados: calcularCalculados(args.variablesCalculo, nucleo),
    indicadores: calcularIndicadores(nucleo),
    puntaje_raices_cuello: nucleo.r01.puntaje,
    probabilidad_falla_raices_cuello: nucleo.r01.probabilidadFalla,
    puntaje_tronco: nucleo.r02.puntaje,
    probabilidad_falla_tronco: nucleo.r02.probabilidadFalla,
    puntaje_copa_ramas: nucleo.r03.puntaje,
    probabilidad_falla_copa_ramas: nucleo.r03.probabilidadFalla,
    probabilidad_impacto: evaluarM01(args.variablesCalculo.zona_objetivo, args.variablesCalculo.tasa_ocupacion_objetivo).probabilidadImpacto,
    clasificacion_raices_cuello: nucleo.clasificacionRaicesCuello,
    clasificacion_tronco: nucleo.clasificacionTronco,
    clasificacion_copa_ramas: nucleo.clasificacionCopaRamas,
    clasificacion_riesgo_calculada: nucleo.clasificacionRiesgoCalculada,
    puntaje_infraestructura: nucleo.m04.puntajeInfraestructura,
    pct_infraestructura: nucleo.m04.pctInfraestructura,
    clasificacion_infraestructura_calculada: nucleo.clasificacionInfraestructuraCalculada,
    clasificacion_prioridad_calculada: resolucion.prioridadCalculada,
    clasificacion_riesgo_ajustada: resolucion.clasificacionRiesgoAjustada,
    clasificacion_infraestructura_ajustada: resolucion.clasificacionInfraestructuraAjustada,
    clasificacion_prioridad_ajustada: resolucion.clasificacionPrioridadAjustada,
    rule_version: RULE_VERSION,
    motor_commit: args.motorCommit,
    inspeccion: {
      nivelRiesgo: resolucion.riesgoEfectivo,
      fechaProximaInspeccionSugerida,
      fechaProximoMonitoreoSugerida,
    },
    alcance,
    ajustesDescartados: resolucion.ajustesDescartados,
  };
}

// =====================================================================
// 5. ensamblarResultadoVigente — forma de `tree_assessments`
// =====================================================================

export interface ArgsResultadoVigente {
  /** Composición campo por campo de v_tree_current_inputs (§3.10 bis), ya armada por la Fase 6. */
  variablesCalculo: NucleoEntradas;
  /**
   * Los ajustes candidatos a aplicar en este recálculo. Si el evento es
   * una anulación, quien llama debe seguir pasando el ajuste de una
   * inspección válida anterior si corresponde que reaparezca (CC-045
   * a) — esta función no busca en el historial, solo decide si el
   * ajuste que le llega cuenta o no.
   */
  ajustes?: AjustesEntrada;
  /**
   * CC-045 (a): si este recálculo lo dispara la anulación de una
   * inspección, su id. Cualquier ajuste en `ajustes` cuyo
   * `inspectionId` coincida se ignora por completo, como si no se
   * hubiera pasado — los ajustes de esa inspección nunca aplican a la
   * vigente (se conservan en el historial, pero eso es un hecho de la
   * base de datos, no de esta función). `undefined`/`null` cuando el
   * recálculo lo dispara una OT completada.
   */
  inspeccionAnuladaId?: string | null;
  motorCommit: string;
}

export interface ResultadoVigente {
  // --- tree_assessments ---
  entradas_vigentes: NucleoEntradas;
  calculados: Calculados;
  indicadores: Indicadores;
  puntaje_raices_cuello: number | null;
  probabilidad_falla_raices_cuello: R01Resultado["probabilidadFalla"];
  puntaje_tronco: number | null;
  probabilidad_falla_tronco: R02Resultado["probabilidadFalla"];
  puntaje_copa_ramas: number | null;
  probabilidad_falla_copa_ramas: R03Resultado["probabilidadFalla"];
  probabilidad_impacto: string | null;
  clasificacion_raices_cuello: ClasificacionRiesgoCodigo;
  clasificacion_tronco: ClasificacionRiesgoCodigo;
  clasificacion_copa_ramas: ClasificacionRiesgoCodigo;
  clasificacion_riesgo_calculada: ClasificacionRiesgoCodigo;
  puntaje_infraestructura: number | null;
  pct_infraestructura: number | null;
  clasificacion_infraestructura_calculada: ClasificacionInfraestructuraCodigo;
  clasificacion_prioridad_calculada: ClasificacionPrioridadCodigo;
  clasificacion_riesgo_ajustada: ClasificacionRiesgoCodigo | null;
  clasificacion_infraestructura_ajustada: ClasificacionInfraestructuraCodigo | null;
  clasificacion_prioridad_ajustada: ClasificacionPrioridadCodigo | null;
  adjustment_ids: string[];
  ajustes_descartados: AjusteDescartado[];
  requiere_revision_ajuste: boolean;
  rule_version: typeof RULE_VERSION;
  motor_commit: string;
}

/**
 * No calcula fechas sugeridas: D-202/D-203 son columnas de
 * `inspections`, y `tree_assessments` no tiene columnas de fecha (ver
 * la discrepancia documentada en el encabezado del archivo). Tampoco
 * valida alcance: la composición por tipo de inspección ya ocurrió en
 * `v_tree_current_inputs` antes de llegar aquí (§3.10 bis).
 */
export function ensamblarResultadoVigente(args: ArgsResultadoVigente): ResultadoVigente {
  const nucleo = calcularNucleo(args.variablesCalculo);
  const resolucion = resolverAjustesYPrioridad(nucleo, args.ajustes, args.inspeccionAnuladaId);

  return {
    entradas_vigentes: args.variablesCalculo,
    calculados: calcularCalculados(args.variablesCalculo, nucleo),
    indicadores: calcularIndicadores(nucleo),
    puntaje_raices_cuello: nucleo.r01.puntaje,
    probabilidad_falla_raices_cuello: nucleo.r01.probabilidadFalla,
    puntaje_tronco: nucleo.r02.puntaje,
    probabilidad_falla_tronco: nucleo.r02.probabilidadFalla,
    puntaje_copa_ramas: nucleo.r03.puntaje,
    probabilidad_falla_copa_ramas: nucleo.r03.probabilidadFalla,
    probabilidad_impacto: evaluarM01(args.variablesCalculo.zona_objetivo, args.variablesCalculo.tasa_ocupacion_objetivo).probabilidadImpacto,
    clasificacion_raices_cuello: nucleo.clasificacionRaicesCuello,
    clasificacion_tronco: nucleo.clasificacionTronco,
    clasificacion_copa_ramas: nucleo.clasificacionCopaRamas,
    clasificacion_riesgo_calculada: nucleo.clasificacionRiesgoCalculada,
    puntaje_infraestructura: nucleo.m04.puntajeInfraestructura,
    pct_infraestructura: nucleo.m04.pctInfraestructura,
    clasificacion_infraestructura_calculada: nucleo.clasificacionInfraestructuraCalculada,
    clasificacion_prioridad_calculada: resolucion.prioridadCalculada,
    clasificacion_riesgo_ajustada: resolucion.clasificacionRiesgoAjustada,
    clasificacion_infraestructura_ajustada: resolucion.clasificacionInfraestructuraAjustada,
    clasificacion_prioridad_ajustada: resolucion.clasificacionPrioridadAjustada,
    adjustment_ids: resolucion.adjustmentIdsVigentes,
    ajustes_descartados: resolucion.ajustesDescartados,
    requiere_revision_ajuste: resolucion.ajustesDescartados.length > 0,
    rule_version: RULE_VERSION,
    motor_commit: args.motorCommit,
  };
}

export type { ResultadoCalculo };
