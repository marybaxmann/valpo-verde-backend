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
 * campo obligatorio o condicional activado no tiene valor, o si la
 * combinación de campos es imposible según el diccionario, el
 * indicador queda no_determinado con un motivo explícito — nunca 0
 * (CC-024) — y se propaga: el resultado completo de R01 queda
 * no_determinado. La validación de entrada (Fase 6) debe rechazar
 * antes de guardar las combinaciones que aquí solo se detectan.
 */

import { ProbabilidadFallaCodigo, ResultadoCavidadInternaCodigo, SeveridadCodigo } from "./catalogs";

export interface R01Input {
  // --- Estabilidad (RC-EST) — ambos obligatorios ---
  levantamiento_del_plato_radicular: boolean | null;
  angulo_inclinacion: number | null; // grados, 0–90

  // --- Raíces expuestas (RC-REX) ---
  raices_expuestas: boolean | null; // obligatorio
  necrosis_radicular: boolean | null; // condicional: activado por raices_expuestas = Sí
  raices_cortadas: boolean | null; // condicional: activado por raices_expuestas = Sí

  // --- Cavidad basal (RC-CAV) ---
  cavidad_pudricion_basal: boolean | null; // obligatorio
  cavidad_basal_externa: boolean | null; // condicional: activado por cavidad_pudricion_basal = Sí
  cavidad_basal_interna: ResultadoCavidadInternaCodigo | null; // condicional: activado por cavidad_pudricion_basal = Sí
  sl_basal_pct: number | null; // condicional: activado por cavidad_basal_externa = Sí (0–100)
  t_r_basal: number | null; // condicional: activado por cavidad_basal_interna = "si" (≥0)
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
function evaluarPorSL(sl: number | null): IndicadorResultado {
  if (sl === null) return noDeterminado("sl_basal_pct no calculable (RC-CAV-05)");
  if (sl < 20) return indicador("leve"); // RC-CAV-02
  if (sl < 33) return indicador("moderada"); // RC-CAV-03
  return indicador("severa"); // RC-CAV-04
}

/** Rama t/R (RC-CAV-06 a 08), aplicable cuando cavidad_basal_interna = "si". */
function evaluarPorTR(tr: number | null): IndicadorResultado {
  if (tr === null) return noDeterminado("t_r_basal no medido (RC-CAV-08)");
  if (tr > 0.3) return indicador("moderada"); // RC-CAV-06
  return indicador("severa"); // RC-CAV-07
}

/** RC-CAV-01 a 10. */
function evaluarCavidadBasal(input: R01Input): IndicadorResultado {
  if (input.cavidad_pudricion_basal === null) {
    return noDeterminado("cavidad_pudricion_basal sin valor (RC-CAV, obligatorio)");
  }
  if (!input.cavidad_pudricion_basal) return indicador("despreciable"); // RC-CAV-01

  if (input.cavidad_basal_interna === null) {
    return noDeterminado("cavidad_basal_interna sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)");
  }
  if (input.cavidad_basal_interna === "requiere_evaluacion_instrumental") {
    return noDeterminado("cavidad_basal_interna = Requiere evaluación instrumental (RC-CAV-09)");
  }
  if (input.cavidad_basal_externa === null) {
    return noDeterminado("cavidad_basal_externa sin valor (RC-CAV, condicional activado por cavidad_pudricion_basal = Sí)");
  }

  const porSL = input.cavidad_basal_externa ? evaluarPorSL(input.sl_basal_pct) : null;
  const porTR = input.cavidad_basal_interna === "si" ? evaluarPorTR(input.t_r_basal) : null;

  if (porSL === null && porTR === null) {
    // D-51: con cavidad_pudricion_basal = Sí, externa e interna no pueden
    // ser ambas No. No se inventa una categoría: queda no_determinado,
    // con el motivo, para que la Fase 6 lo rechace antes de guardar.
    return noDeterminado(
      "Combinación inválida: cavidad_pudricion_basal = Sí con cavidad_basal_externa = No y " +
        "cavidad_basal_interna = No (D-51); la Fase 6 debe rechazar esta combinación antes de guardar.",
    );
  }
  if (porSL?.noDeterminado || porTR?.noDeterminado) {
    // RC-CAV-10: si alguna de las dos vías es no_determinado, el resultado
    // combinado es no_determinado.
    const motivos = [porSL, porTR]
      .filter((p): p is IndicadorResultado => p !== null && p.noDeterminado)
      .map((p) => p.motivo);
    return noDeterminado(`RC-CAV-10 (combinación externa+interna): ${motivos.join("; ")}`);
  }

  const candidatos = [porSL, porTR].filter((c): c is IndicadorResultado => c !== null);
  if (candidatos.length === 1) return candidatos[0]; // solo externa o solo interna aplicable
  // RC-CAV-10: la categoría más severa entre SL y t/R.
  return indicador(masSevera(candidatos[0].severidad!, candidatos[1].severidad!));
}

export interface R01Resultado {
  indicadores: {
    estabilidad: IndicadorResultado;
    raicesExpuestas: IndicadorResultado;
    cavidadBasal: IndicadorResultado;
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
  const cavidadBasal = evaluarCavidadBasal(input);
  const indicadores = { estabilidad, raicesExpuestas, cavidadBasal };

  const motivos: string[] = [];
  if (estabilidad.noDeterminado) motivos.push(`Estabilidad: ${estabilidad.motivo}`);
  if (raicesExpuestas.noDeterminado) motivos.push(`Raíces expuestas: ${raicesExpuestas.motivo}`);
  if (cavidadBasal.noDeterminado) motivos.push(`Cavidad basal: ${cavidadBasal.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = estabilidad.puntaje! + raicesExpuestas.puntaje! + cavidadBasal.puntaje!;
  return { indicadores, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
