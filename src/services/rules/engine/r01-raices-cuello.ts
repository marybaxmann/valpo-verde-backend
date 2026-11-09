/**
 * R01 — Raíces y cuello (REGLAS_INDICADORES: RC-EST-01 a 08, RC-REX-01 a
 * 05, RC-CAV-01 a 11, RC-ANI-01 a 02, RC-HON-01 a 03; MATRICES_CALCULO
 * R01). Fuente: Excel maestro 3.0.0 (CC-070). No depende de treeRisk.ts
 * ni de docs/methodology.
 *
 * Pisos, que se aplican primero: plato levantado e inclinación > 30° →
 * Inminente; plato levantado, inclinación > 45°, inclinación ≥ 15° con
 * raíces cortadas o cavidad basal Severa → mínimo Probable. Con un piso
 * no se calcula puntaje y un dato faltante en otro indicador no lo
 * bloquea.
 *
 * Sin piso, P_RC = suma de los cinco indicadores. Tramos: 0 improbable;
 * 1–3 posible; 4 o más probable.
 *
 * Regla de la responsable: el motor nunca rellena, supone ni sustituye
 * un dato. Sin piso, un campo obligatorio o condicional activado sin
 * valor, fuera de rango o una combinación imposible deja el indicador
 * no_determinado con motivo — nunca 0 (CC-024) — y se propaga.
 *
 * SL_basal_pct, R_radio_basal_cm y t_R_basal son "Calculado por
 * plataforma": este módulo recibe las mediciones crudas y los calcula
 * con variables-calculo.ts — nunca los recibe ya calculados.
 *
 * `reglaId`: el ID exacto de REGLAS_INDICADORES que produjo el
 * resultado. `null` cuando el resultado es un corte genérico por dato
 * faltante, fuera de dominio o combinación inválida que el diccionario
 * prohíbe pero que REGLAS_INDICADORES no numera.
 */

import { esCodigoVigente, ProbabilidadFallaCodigo, ResultadoCavidadInternaCodigo, SeveridadCodigo } from "./catalogs";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";
import { ALERTA_MEDIR_PUDRICION } from "./r02-tronco";
import {
  calcularAberturaCavidadPct,
  calcularRRadioBasalCm,
  calcularSLBasalPct,
  calcularTRBasal,
  ResultadoCalculo,
} from "./variables-calculo";

export interface R01Input {
  // --- Estabilidad (RC-EST) — ambos obligatorios ---
  levantamiento_del_plato_radicular: boolean | null;
  angulo_inclinacion: number | null; // grados, 0°–90° (D-37)

  // --- Raíces (RC-REX) ---
  raices_expuestas: boolean | null; // obligatorio; contexto, no puntúa por sí solo
  necrosis_radicular: boolean | null; // condicional: activado por raices_expuestas = Sí
  raices_cortadas: boolean | null; // obligatorio (RC-04)

  // --- Cavidad basal (RC-CAV) ---
  cavidad_pudricion_basal: boolean | null; // obligatorio
  cavidad_basal_externa: boolean | null; // condicional: activado por cavidad_pudricion_basal = Sí
  cavidad_basal_interna: ResultadoCavidadInternaCodigo | null; // condicional: activado por cavidad_pudricion_basal = Sí

  // Mediciones crudas (D-42 a D-45, D-47).
  D_diametro_basal_tronco_cm: number | null; // D-42, condicional: cavidad_pudricion_basal = Sí
  d_diametro_cavidad_basal_cm: number | null; // D-43, condicional: cavidad_basal_externa = Sí
  Cc_longitud_abertura_cavidad_cm: number | null; // D-44, condicional: cavidad_basal_externa = Sí
  C_circunferencia_basal_cm: number | null; // D-45, condicional: cavidad_basal_externa = Sí
  t_pared_residual_basal_cm: number | null; // D-47, condicional: cavidad_basal_interna = "si"

  // --- Anillamiento y hongos (RC-ANI, RC-HON) ---
  anillamiento: boolean | null; // obligatorio
  cuerpos_fructiferos_base: boolean | null; // obligatorio
}

export interface IndicadorResultado {
  severidad: SeveridadCodigo | null; // null = no_determinado
  puntaje: number | null;
  reglaId: string | null; // el ID de REGLAS_INDICADORES que produjo el resultado; null si es un corte genérico
  noDeterminado: boolean;
  motivo?: string; // presente solo si noDeterminado = true
  alerta?: string; // RC-HON-02: aviso para el Inspector; no modifica el puntaje
}

const PUNTAJE_SEVERIDAD: Record<SeveridadCodigo, number> = {
  despreciable: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

const ORDEN_SEVERIDAD: SeveridadCodigo[] = ["despreciable", "leve", "moderada", "severa"];

function indicador(severidad: SeveridadCodigo, reglaId: string): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], reglaId, noDeterminado: false };
}

function noDeterminado(motivo: string, reglaId: string | null = null): IndicadorResultado {
  return { severidad: null, puntaje: null, reglaId, noDeterminado: true, motivo };
}

function masSevera(a: SeveridadCodigo, b: SeveridadCodigo): SeveridadCodigo {
  return ORDEN_SEVERIDAD.indexOf(a) >= ORDEN_SEVERIDAD.indexOf(b) ? a : b;
}

function anguloValido(angulo: number | null): angulo is number {
  return angulo !== null && Number.isFinite(angulo) && angulo >= 0 && angulo <= 90;
}

/** RC-EST-01 a 08. */
function evaluarEstabilidad(input: R01Input): IndicadorResultado {
  const levantamiento = input.levantamiento_del_plato_radicular;
  const angulo = input.angulo_inclinacion;
  if (levantamiento === null) {
    return noDeterminado("levantamiento_del_plato_radicular sin valor (RC-EST, obligatorio)");
  }
  if (!esBooleanoValido(levantamiento)) {
    return noDeterminado(motivoFueraDominioSiNo("levantamiento_del_plato_radicular", levantamiento, "D-36"));
  }
  if (angulo === null) {
    return noDeterminado("angulo_inclinacion sin valor (RC-EST, obligatorio)");
  }
  if (!Number.isFinite(angulo)) {
    return noDeterminado(`angulo_inclinacion no es un número finito (${angulo}) (D-37)`);
  }
  if (angulo < 0 || angulo > 90) {
    return noDeterminado(`angulo_inclinacion fuera de rango 0°–90° (${angulo}) (D-37)`);
  }
  if (levantamiento) {
    if (angulo < 15) return indicador("leve", "RC-EST-01");
    if (angulo <= 30) return indicador("moderada", "RC-EST-02");
    if (angulo <= 45) return indicador("severa", "RC-EST-03");
    return indicador("severa", "RC-EST-04");
  }
  if (angulo < 15) return indicador("despreciable", "RC-EST-05");
  if (angulo <= 30) return indicador("leve", "RC-EST-06");
  if (angulo <= 45) return indicador("moderada", "RC-EST-07");
  return indicador("severa", "RC-EST-08");
}

/** RC-REX-01 a 05. Sin raíces expuestas, necrosis no se observa: no equivale a raíz sana (RC-17). */
function evaluarRaices(input: R01Input): IndicadorResultado {
  if (input.raices_expuestas === null) {
    return noDeterminado("raices_expuestas sin valor (RC-REX, obligatorio)");
  }
  if (!esBooleanoValido(input.raices_expuestas)) {
    return noDeterminado(motivoFueraDominioSiNo("raices_expuestas", input.raices_expuestas, "D-33"));
  }
  if (input.raices_cortadas === null) {
    return noDeterminado("raices_cortadas sin valor (RC-REX, obligatorio)");
  }
  if (!esBooleanoValido(input.raices_cortadas)) {
    return noDeterminado(motivoFueraDominioSiNo("raices_cortadas", input.raices_cortadas, "D-35"));
  }
  const cortadas = input.raices_cortadas;
  if (!input.raices_expuestas) {
    return cortadas ? indicador("moderada", "RC-REX-04") : indicador("despreciable", "RC-REX-01");
  }

  if (input.necrosis_radicular === null) {
    return noDeterminado("necrosis_radicular sin valor (RC-REX, condicional activado por raices_expuestas = Sí)");
  }
  if (!esBooleanoValido(input.necrosis_radicular)) {
    return noDeterminado(motivoFueraDominioSiNo("necrosis_radicular", input.necrosis_radicular, "D-34"));
  }
  const necrosis = input.necrosis_radicular;
  if (!necrosis && !cortadas) return indicador("despreciable", "RC-REX-02");
  if (necrosis && !cortadas) return indicador("moderada", "RC-REX-03");
  if (!necrosis && cortadas) return indicador("moderada", "RC-REX-04");
  return indicador("severa", "RC-REX-05");
}

/** Rama SL (RC-CAV-02 a 05), aplicable cuando cavidad_basal_externa = Sí. */
function evaluarPorSL(sl: ResultadoCalculo): IndicadorResultado {
  if (sl.valor === null) return noDeterminado(`SL_basal_pct no calculable (RC-CAV-05): ${sl.motivo}`, "RC-CAV-05");
  if (sl.valor < 20) return indicador("leve", "RC-CAV-02");
  if (sl.valor < 33) return indicador("moderada", "RC-CAV-03");
  return indicador("severa", "RC-CAV-04");
}

/** Rama t/R (RC-CAV-06, 07, 08 y 11), aplicable cuando cavidad_basal_interna = "si". */
function evaluarPorTR(tR: ResultadoCalculo): IndicadorResultado {
  if (tR.valor === null) return noDeterminado(`t_R_basal no calculable (RC-CAV-08): ${tR.motivo}`, "RC-CAV-08");
  if (tR.valor >= 0.42) return indicador("leve", "RC-CAV-06");
  if (tR.valor >= 0.3) return indicador("moderada", "RC-CAV-11");
  return indicador("severa", "RC-CAV-07");
}

interface CavidadBasalResultado {
  indicador: IndicadorResultado;
  SL_basal_pct?: ResultadoCalculo;
  R_radio_basal_cm?: ResultadoCalculo;
  t_R_basal?: ResultadoCalculo;
  abertura_cavidad_basal_pct?: ResultadoCalculo;
}

/** RC-CAV-01 a 11. */
function evaluarCavidadBasal(input: R01Input): CavidadBasalResultado {
  if (input.cavidad_pudricion_basal === null) {
    return { indicador: noDeterminado("cavidad_pudricion_basal sin valor (RC-CAV, obligatorio)") };
  }
  if (!esBooleanoValido(input.cavidad_pudricion_basal)) {
    return { indicador: noDeterminado(motivoFueraDominioSiNo("cavidad_pudricion_basal", input.cavidad_pudricion_basal, "D-39")) };
  }
  if (!input.cavidad_pudricion_basal) return { indicador: indicador("despreciable", "RC-CAV-01") };

  if (input.cavidad_basal_interna === null) {
    return {
      indicador: noDeterminado("cavidad_basal_interna sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)"),
    };
  }
  if (!esCodigoVigente("resultado_cavidad_interna", input.cavidad_basal_interna)) {
    // Fuera de dominio: nunca se trata como la rama "si"/"no" más cercana.
    return { indicador: noDeterminado(`cavidad_basal_interna tiene un código no reconocido ("${input.cavidad_basal_interna}")`) };
  }
  const requiereInstrumental = input.cavidad_basal_interna === "requiere_evaluacion_instrumental";
  const noDeterminadoInstrumental = () =>
    noDeterminado("cavidad_basal_interna = Requiere evaluación instrumental (RC-CAV-09)", "RC-CAV-09");

  if (input.cavidad_basal_externa === null) {
    if (requiereInstrumental) return { indicador: noDeterminadoInstrumental() };
    return {
      indicador: noDeterminado("cavidad_basal_externa sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)"),
    };
  }
  if (!esBooleanoValido(input.cavidad_basal_externa)) {
    return { indicador: noDeterminado(motivoFueraDominioSiNo("cavidad_basal_externa", input.cavidad_basal_externa, "D-40")) };
  }

  let SL_basal_pct: ResultadoCalculo | undefined;
  let abertura_cavidad_basal_pct: ResultadoCalculo | undefined;
  let porSL: IndicadorResultado | null = null;
  if (input.cavidad_basal_externa) {
    SL_basal_pct = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: input.D_diametro_basal_tronco_cm,
      d_diametro_cavidad_basal_cm: input.d_diametro_cavidad_basal_cm,
      Cc_longitud_abertura_cavidad_cm: input.Cc_longitud_abertura_cavidad_cm,
      C_circunferencia_basal_cm: input.C_circunferencia_basal_cm,
    });
    abertura_cavidad_basal_pct = calcularAberturaCavidadPct(input.Cc_longitud_abertura_cavidad_cm, input.C_circunferencia_basal_cm);
    porSL = evaluarPorSL(SL_basal_pct);
  }

  if (requiereInstrumental) {
    // RC-15: una cavidad externa Severa fija el piso aunque la interna esté sin resolver.
    return {
      indicador: porSL?.severidad === "severa" ? porSL : noDeterminadoInstrumental(),
      SL_basal_pct,
      abertura_cavidad_basal_pct,
    };
  }

  let R_radio_basal_cm: ResultadoCalculo | undefined;
  let t_R_basal: ResultadoCalculo | undefined;
  let porTR: IndicadorResultado | null = null;
  if (input.cavidad_basal_interna === "si") {
    R_radio_basal_cm = calcularRRadioBasalCm(input.D_diametro_basal_tronco_cm);
    t_R_basal = calcularTRBasal(input.t_pared_residual_basal_cm, input.D_diametro_basal_tronco_cm);
    porTR = evaluarPorTR(t_R_basal);
  }
  const variables = { SL_basal_pct, R_radio_basal_cm, t_R_basal, abertura_cavidad_basal_pct };

  if (porSL === null && porTR === null) {
    // D-41: con cavidad_pudricion_basal = Sí, externa e interna no pueden
    // ser ambas No. No se inventa una categoría.
    return {
      indicador: noDeterminado(
        "Combinación inválida: cavidad_pudricion_basal = Sí con cavidad_basal_externa = No y " +
          "cavidad_basal_interna = No (D-41); la Fase 6 debe rechazar esta combinación antes de guardar.",
      ),
      ...variables,
    };
  }
  if (porSL === null || porTR === null) {
    return { indicador: (porSL ?? porTR)!, ...variables };
  }

  // Ambas vías activas: la más severa (RC-CAV-10). Una vía Severa fija el piso aunque la otra no se determine.
  if (porSL.severidad === "severa" || porTR.severidad === "severa") {
    return { indicador: indicador("severa", "RC-CAV-10"), ...variables };
  }
  if (porSL.noDeterminado || porTR.noDeterminado) {
    const motivos = [porSL, porTR].filter((p) => p.noDeterminado).map((p) => p.motivo);
    return { indicador: noDeterminado(`RC-CAV-10 (combinación externa+interna): ${motivos.join("; ")}`, "RC-CAV-10"), ...variables };
  }
  return { indicador: indicador(masSevera(porSL.severidad!, porTR.severidad!), "RC-CAV-10"), ...variables };
}

/** RC-ANI-01 a 02. */
function evaluarAnillamiento(input: R01Input): IndicadorResultado {
  const valor = input.anillamiento;
  if (valor === null) return noDeterminado("anillamiento sin valor (RC-ANI, obligatorio)");
  if (!esBooleanoValido(valor)) return noDeterminado(motivoFueraDominioSiNo("anillamiento", valor, "CC-070"));
  return valor ? indicador("leve", "RC-ANI-02") : indicador("despreciable", "RC-ANI-01");
}

/** RC-HON-01 a 03. Si ya hay cavidad registrada, la pudrición está valorada allí y no se cuenta dos veces. */
function evaluarHongos(input: R01Input): IndicadorResultado {
  const valor = input.cuerpos_fructiferos_base;
  if (valor === null) return noDeterminado("cuerpos_fructiferos_base sin valor (RC-HON, obligatorio)");
  if (!esBooleanoValido(valor)) return noDeterminado(motivoFueraDominioSiNo("cuerpos_fructiferos_base", valor, "CC-070"));
  if (!valor) return indicador("despreciable", "RC-HON-01");

  const cavidad = input.cavidad_pudricion_basal;
  if (cavidad === null || !esBooleanoValido(cavidad)) {
    return noDeterminado("cuerpos_fructiferos_base = Sí sin un valor válido en cavidad_pudricion_basal (RC-HON)");
  }
  if (cavidad) return indicador("despreciable", "RC-HON-03");
  return { ...indicador("leve", "RC-HON-02"), alerta: ALERTA_MEDIR_PUDRICION };
}

export interface R01Resultado {
  indicadores: {
    estabilidad: IndicadorResultado;
    raices: IndicadorResultado;
    cavidadBasal: IndicadorResultado;
    anillamiento: IndicadorResultado;
    hongos: IndicadorResultado;
  };
  /** Variables calculadas, solo cuando la rama correspondiente se activó. */
  variablesCalculo: {
    SL_basal_pct?: ResultadoCalculo;
    R_radio_basal_cm?: ResultadoCalculo;
    t_R_basal?: ResultadoCalculo;
    abertura_cavidad_basal_pct?: ResultadoCalculo;
  };
  /** null si probabilidadFalla = no_determinado o si aplicó un piso. */
  puntaje: number | null;
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje === 0) return "improbable";
  if (puntaje <= 3) return "posible";
  return "probable"; // 4 o más
}

export function evaluarR01(input: R01Input): R01Resultado {
  const estabilidad = evaluarEstabilidad(input);
  const raices = evaluarRaices(input);
  const cavidad = evaluarCavidadBasal(input);
  const anillamiento = evaluarAnillamiento(input);
  const hongos = evaluarHongos(input);
  const indicadores = { estabilidad, raices, cavidadBasal: cavidad.indicador, anillamiento, hongos };
  const variablesCalculo = {
    SL_basal_pct: cavidad.SL_basal_pct,
    R_radio_basal_cm: cavidad.R_radio_basal_cm,
    t_R_basal: cavidad.t_R_basal,
    abertura_cavidad_basal_pct: cavidad.abertura_cavidad_basal_pct,
  };

  // Los pisos se aplican antes de propagar No determinado (RC-13, RC-15).
  const levantado = input.levantamiento_del_plato_radicular === true;
  const angulo = anguloValido(input.angulo_inclinacion) ? input.angulo_inclinacion : null;
  if (levantado && angulo !== null && angulo > 30) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "inminente" };
  }
  if (
    levantado ||
    (angulo !== null && angulo > 45) ||
    (angulo !== null && angulo >= 15 && input.raices_cortadas === true) ||
    cavidad.indicador.severidad === "severa"
  ) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "probable" };
  }

  const motivos: string[] = [];
  if (estabilidad.noDeterminado) motivos.push(`Estabilidad: ${estabilidad.motivo}`);
  if (raices.noDeterminado) motivos.push(`Raíces: ${raices.motivo}`);
  if (cavidad.indicador.noDeterminado) motivos.push(`Cavidad basal: ${cavidad.indicador.motivo}`);
  if (anillamiento.noDeterminado) motivos.push(`Anillamiento: ${anillamiento.motivo}`);
  if (hongos.noDeterminado) motivos.push(`Hongos: ${hongos.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = Object.values(indicadores).reduce((suma, i) => suma + i.puntaje!, 0);
  return { indicadores, variablesCalculo, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
