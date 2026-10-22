/**
 * R01 — Raíces y cuello (REGLAS_INDICADORES: RC-EST-01 a 08, RC-REX-01 a
 * 05, RC-CAV-01 a 10; MATRICES_CALCULO R01). Fuente: Excel maestro
 * 2.1.0. No depende de treeRisk.ts ni de docs/methodology.
 *
 * Tres indicadores parciales (Estabilidad, Raíces expuestas, Cavidad
 * basal). Puntaje total P_RC = suma de los tres, máximo 9. Tramos:
 * 0–1 improbable; 2–4 posible; 5 probable; 6–9 inminente.
 *
 * Regla de la responsable: el motor nunca rellena, supone ni sustituye
 * un dato (nada de `?? `, `|| `, ni "si falta, asumo tal cosa"). Si un
 * campo obligatorio o condicional activado no tiene valor, si el valor
 * está fuera del rango que define el diccionario, o si la combinación
 * de campos es imposible, el indicador queda no_determinado con un
 * motivo explícito — nunca 0 (CC-024) — y se propaga: el resultado
 * completo de R01 queda no_determinado. La validación de entrada
 * (Fase 6) debe rechazar antes de guardar las combinaciones que aquí
 * solo se detectan.
 *
 * SL_basal_pct, R_radio_basal_cm y t_R_basal son "Calculado por
 * plataforma... No admite ingreso manual" (D-56, D-58, D-59): este
 * módulo recibe las mediciones crudas (D, d, Cc, C, t) y los calcula
 * con variables-calculo.ts — nunca los recibe ya calculados.
 */

import { ProbabilidadFallaCodigo, ResultadoCavidadInternaCodigo, SeveridadCodigo } from "./catalogs";
import { calcularRRadioBasalCm, calcularSLBasalPct, calcularTRBasal, ResultadoCalculo } from "./variables-calculo";

export interface R01Input {
  // --- Estabilidad (RC-EST) — ambos obligatorios ---
  levantamiento_del_plato_radicular: boolean | null;
  angulo_inclinacion: number | null; // grados, 0°–90° (D-47)

  // --- Raíces expuestas (RC-REX) ---
  raices_expuestas: boolean | null; // obligatorio
  necrosis_radicular: boolean | null; // condicional: activado por raices_expuestas = Sí
  raices_cortadas: boolean | null; // condicional: activado por raices_expuestas = Sí

  // --- Cavidad basal (RC-CAV) ---
  cavidad_pudricion_basal: boolean | null; // obligatorio
  cavidad_basal_externa: boolean | null; // condicional: activado por cavidad_pudricion_basal = Sí
  cavidad_basal_interna: ResultadoCavidadInternaCodigo | null; // condicional: activado por cavidad_pudricion_basal = Sí

  // Mediciones crudas (D-52 a D-55, D-57). SL_basal_pct, R_radio_basal_cm
  // y t_R_basal se calculan a partir de éstas — ver variables-calculo.ts.
  D_diametro_basal_tronco_cm: number | null; // D-52, condicional: cavidad_pudricion_basal = Sí
  d_diametro_cavidad_basal_cm: number | null; // D-53, condicional: cavidad_basal_externa = Sí
  Cc_longitud_abertura_cavidad_cm: number | null; // D-54, condicional: cavidad_basal_externa = Sí
  C_circunferencia_basal_cm: number | null; // D-55, condicional: cavidad_basal_externa = Sí
  t_pared_residual_basal_cm: number | null; // D-57, condicional: cavidad_basal_interna = "si"
}

export interface IndicadorResultado {
  severidad: SeveridadCodigo | null; // null = no_determinado
  puntaje: number | null;
  noDeterminado: boolean;
  motivo?: string; // presente solo si noDeterminado = true
}

const PUNTAJE_SEVERIDAD: Record<SeveridadCodigo, number> = {
  despreciable: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

const ORDEN_SEVERIDAD: SeveridadCodigo[] = ["despreciable", "leve", "moderada", "severa"];

function indicador(severidad: SeveridadCodigo): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], noDeterminado: false };
}

function noDeterminado(motivo: string): IndicadorResultado {
  return { severidad: null, puntaje: null, noDeterminado: true, motivo };
}

function masSevera(a: SeveridadCodigo, b: SeveridadCodigo): SeveridadCodigo {
  return ORDEN_SEVERIDAD.indexOf(a) >= ORDEN_SEVERIDAD.indexOf(b) ? a : b;
}

/** RC-EST-01 a 08. */
function evaluarEstabilidad(input: R01Input): IndicadorResultado {
  const levantamiento = input.levantamiento_del_plato_radicular;
  const angulo = input.angulo_inclinacion;
  if (levantamiento === null) {
    return noDeterminado("levantamiento_del_plato_radicular sin valor (RC-EST, obligatorio)");
  }
  if (angulo === null) {
    return noDeterminado("angulo_inclinacion sin valor (RC-EST, obligatorio)");
  }
  if (!Number.isFinite(angulo)) {
    return noDeterminado(`angulo_inclinacion no es un número finito (${angulo}) (D-47)`);
  }
  if (angulo < 0 || angulo > 90) {
    return noDeterminado(`angulo_inclinacion fuera de rango 0°–90° (${angulo}) (D-47)`);
  }
  if (levantamiento) {
    if (angulo < 15) return indicador("leve"); // RC-EST-01
    if (angulo <= 30) return indicador("moderada"); // RC-EST-02
    if (angulo <= 45) return indicador("moderada"); // RC-EST-03
    return indicador("severa"); // RC-EST-04
  }
  if (angulo < 15) return indicador("despreciable"); // RC-EST-05
  if (angulo <= 30) return indicador("leve"); // RC-EST-06
  if (angulo <= 45) return indicador("moderada"); // RC-EST-07
  return indicador("severa"); // RC-EST-08
}

/** RC-REX-01 a 05. */
function evaluarRaicesExpuestas(input: R01Input): IndicadorResultado {
  if (input.raices_expuestas === null) {
    return noDeterminado("raices_expuestas sin valor (RC-REX, obligatorio)");
  }
  if (!input.raices_expuestas) return indicador("despreciable"); // RC-REX-01, necrosis/cortadas no se activan

  if (input.necrosis_radicular === null) {
    return noDeterminado("necrosis_radicular sin valor (RC-REX, condicional activado por raices_expuestas = Sí)");
  }
  if (input.raices_cortadas === null) {
    return noDeterminado("raices_cortadas sin valor (RC-REX, condicional activado por raices_expuestas = Sí)");
  }
  const necrosis = input.necrosis_radicular;
  const cortadas = input.raices_cortadas;
  if (!necrosis && !cortadas) return indicador("leve"); // RC-REX-02
  if (necrosis && !cortadas) return indicador("moderada"); // RC-REX-03
  if (!necrosis && cortadas) return indicador("moderada"); // RC-REX-04
  return indicador("severa"); // RC-REX-05
}

/** Rama SL (RC-CAV-02 a 05), aplicable cuando cavidad_basal_externa = Sí. */
function evaluarPorSL(sl: ResultadoCalculo): IndicadorResultado {
  if (sl.valor === null) return noDeterminado(`SL_basal_pct no calculable (RC-CAV-05): ${sl.motivo}`);
  if (sl.valor < 20) return indicador("leve"); // RC-CAV-02
  if (sl.valor < 33) return indicador("moderada"); // RC-CAV-03
  return indicador("severa"); // RC-CAV-04
}

/** Rama t/R (RC-CAV-06 a 08), aplicable cuando cavidad_basal_interna = "si". */
function evaluarPorTR(tR: ResultadoCalculo): IndicadorResultado {
  if (tR.valor === null) return noDeterminado(`t_R_basal no calculable (RC-CAV-08): ${tR.motivo}`);
  if (tR.valor > 0.3) return indicador("moderada"); // RC-CAV-06
  return indicador("severa"); // RC-CAV-07
}

interface CavidadBasalResultado {
  indicador: IndicadorResultado;
  SL_basal_pct?: ResultadoCalculo;
  R_radio_basal_cm?: ResultadoCalculo;
  t_R_basal?: ResultadoCalculo;
}

/** RC-CAV-01 a 10. */
function evaluarCavidadBasal(input: R01Input): CavidadBasalResultado {
  if (input.cavidad_pudricion_basal === null) {
    return { indicador: noDeterminado("cavidad_pudricion_basal sin valor (RC-CAV, obligatorio)") };
  }
  if (!input.cavidad_pudricion_basal) return { indicador: indicador("despreciable") }; // RC-CAV-01

  if (input.cavidad_basal_interna === null) {
    return {
      indicador: noDeterminado("cavidad_basal_interna sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)"),
    };
  }
  if (input.cavidad_basal_interna === "requiere_evaluacion_instrumental") {
    return { indicador: noDeterminado("cavidad_basal_interna = Requiere evaluación instrumental (RC-CAV-09)") };
  }
  if (input.cavidad_basal_externa === null) {
    return {
      indicador: noDeterminado("cavidad_basal_externa sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)"),
    };
  }

  let SL_basal_pct: ResultadoCalculo | undefined;
  let porSL: IndicadorResultado | null = null;
  if (input.cavidad_basal_externa) {
    SL_basal_pct = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: input.D_diametro_basal_tronco_cm,
      d_diametro_cavidad_basal_cm: input.d_diametro_cavidad_basal_cm,
      Cc_longitud_abertura_cavidad_cm: input.Cc_longitud_abertura_cavidad_cm,
      C_circunferencia_basal_cm: input.C_circunferencia_basal_cm,
    });
    porSL = evaluarPorSL(SL_basal_pct);
  }

  let R_radio_basal_cm: ResultadoCalculo | undefined;
  let t_R_basal: ResultadoCalculo | undefined;
  let porTR: IndicadorResultado | null = null;
  if (input.cavidad_basal_interna === "si") {
    R_radio_basal_cm = calcularRRadioBasalCm(input.D_diametro_basal_tronco_cm);
    t_R_basal = calcularTRBasal(input.t_pared_residual_basal_cm, input.D_diametro_basal_tronco_cm);
    porTR = evaluarPorTR(t_R_basal);
  }

  if (porSL === null && porTR === null) {
    // D-51: con cavidad_pudricion_basal = Sí, externa e interna no pueden
    // ser ambas No. No se inventa una categoría: queda no_determinado,
    // con el motivo, para que la Fase 6 lo rechace antes de guardar.
    return {
      indicador: noDeterminado(
        "Combinación inválida: cavidad_pudricion_basal = Sí con cavidad_basal_externa = No y " +
          "cavidad_basal_interna = No (D-51); la Fase 6 debe rechazar esta combinación antes de guardar.",
      ),
      SL_basal_pct,
      R_radio_basal_cm,
      t_R_basal,
    };
  }
  if (porSL?.noDeterminado || porTR?.noDeterminado) {
    // RC-CAV-10: si alguna de las dos vías es no_determinado, el
    // resultado combinado es no_determinado.
    const motivos = [porSL, porTR]
      .filter((p): p is IndicadorResultado => p !== null && p.noDeterminado)
      .map((p) => p.motivo);
    return {
      indicador: noDeterminado(`RC-CAV-10 (combinación externa+interna): ${motivos.join("; ")}`),
      SL_basal_pct,
      R_radio_basal_cm,
      t_R_basal,
    };
  }

  const candidatos = [porSL, porTR].filter((c): c is IndicadorResultado => c !== null);
  const indicadorFinal =
    candidatos.length === 1
      ? candidatos[0] // solo externa o solo interna aplicable
      : indicador(masSevera(candidatos[0].severidad!, candidatos[1].severidad!)); // RC-CAV-10
  return { indicador: indicadorFinal, SL_basal_pct, R_radio_basal_cm, t_R_basal };
}

export interface R01Resultado {
  indicadores: {
    estabilidad: IndicadorResultado;
    raicesExpuestas: IndicadorResultado;
    cavidadBasal: IndicadorResultado;
  };
  /** Variables calculadas (D-56, D-58, D-59), solo cuando la rama correspondiente se activó. */
  variablesCalculo: {
    SL_basal_pct?: ResultadoCalculo;
    R_radio_basal_cm?: ResultadoCalculo;
    t_R_basal?: ResultadoCalculo;
  };
  puntaje: number | null; // null si probabilidadFalla = no_determinado
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje <= 1) return "improbable";
  if (puntaje <= 4) return "posible";
  if (puntaje === 5) return "probable";
  return "inminente"; // 6–9
}

export function evaluarR01(input: R01Input): R01Resultado {
  const estabilidad = evaluarEstabilidad(input);
  const raicesExpuestas = evaluarRaicesExpuestas(input);
  const cavidad = evaluarCavidadBasal(input);
  const indicadores = { estabilidad, raicesExpuestas, cavidadBasal: cavidad.indicador };
  const variablesCalculo = {
    SL_basal_pct: cavidad.SL_basal_pct,
    R_radio_basal_cm: cavidad.R_radio_basal_cm,
    t_R_basal: cavidad.t_R_basal,
  };

  const motivos: string[] = [];
  if (estabilidad.noDeterminado) motivos.push(`Estabilidad: ${estabilidad.motivo}`);
  if (raicesExpuestas.noDeterminado) motivos.push(`Raíces expuestas: ${raicesExpuestas.motivo}`);
  if (cavidad.indicador.noDeterminado) motivos.push(`Cavidad basal: ${cavidad.indicador.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = estabilidad.puntaje! + raicesExpuestas.puntaje! + cavidad.indicador.puntaje!;
  return { indicadores, variablesCalculo, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
