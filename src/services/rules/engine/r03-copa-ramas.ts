/**
 * R03 — Copa y ramas (REGLAS_INDICADORES: CR-RSE-01 a 05, CR-RQU-01 a 02,
 * CR-DES-01 a 02, CR-DEF-01 a 04; MATRICES_CALCULO R03). Fuente: Excel
 * maestro 2.1.0. No depende de treeRisk.ts ni de docs/methodology.
 *
 * Cuatro indicadores parciales (Ramas secas, Ramas quebradas,
 * Desequilibrio de copa, Defoliación — clases ICP Forests). Puntaje
 * total P_CR = suma de los cuatro, máximo 8. Tramos: 0–2 improbable;
 * 3–4 posible; 5–6 probable; 7–8 inminente.
 *
 * Mismo patrón que R01/R02: el motor nunca rellena, supone ni
 * sustituye un dato. Un campo obligatorio o condicional sin valor, o
 * fuera del rango del diccionario, deja el indicador no_determinado
 * con motivo — nunca 0 (CC-024) — y se propaga al resultado completo.
 *
 * `defoliacion_estimada_pct` no es un cálculo de la plataforma — es
 * una estimación visual directa del Inspector (D-93, Obligatorio), a
 * diferencia de SL_basal_pct/SL_tronco_pct de R01/R02.
 */

import { ProbabilidadFallaCodigo, SeveridadCodigo } from "./catalogs";

export interface R03Input {
  // --- Ramas secas (CR-RSE) ---
  ramas_secas: boolean | null; // obligatorio
  ramas_secas_pct_copa: number | null; // condicional: activado por ramas_secas = Sí; (0, 100]

  // --- Ramas quebradas (CR-RQU) ---
  ramas_quebradas: boolean | null; // obligatorio

  // --- Desequilibrio de copa (CR-DES) ---
  desequilibrio_copa: boolean | null; // obligatorio

  // --- Defoliación (CR-DEF) ---
  defoliacion_estimada_pct: number | null; // obligatorio; [0, 100] (D-93)
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

function indicador(severidad: SeveridadCodigo): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], noDeterminado: false };
}

function noDeterminado(motivo: string): IndicadorResultado {
  return { severidad: null, puntaje: null, noDeterminado: true, motivo };
}

/** CR-RSE-01 a 05. */
function evaluarRamasSecas(input: R03Input): IndicadorResultado {
  if (input.ramas_secas === null) {
    return noDeterminado("ramas_secas sin valor (CR-RSE, obligatorio)");
  }
  if (!input.ramas_secas) return indicador("despreciable"); // CR-RSE-01

  const pct = input.ramas_secas_pct_copa;
  if (pct === null) {
    return noDeterminado("ramas_secas_pct_copa sin registrar (CR-RSE-05, condicional activado por ramas_secas = Sí)");
  }
  if (!Number.isFinite(pct)) {
    return noDeterminado(`ramas_secas_pct_copa no es un número finito (${pct})`);
  }
  if (pct <= 0 || pct > 100) {
    return noDeterminado(`ramas_secas_pct_copa fuera de rango (0–100 %, estrictamente > 0) (${pct}) (D-87)`);
  }
  if (pct < 10) return indicador("leve"); // CR-RSE-02
  if (pct <= 50) return indicador("moderada"); // CR-RSE-03
  return indicador("severa"); // CR-RSE-04
}

/** CR-RQU-01 a 02. */
function evaluarRamasQuebradas(input: R03Input): IndicadorResultado {
  if (input.ramas_quebradas === null) {
    return noDeterminado("ramas_quebradas sin valor (CR-RQU, obligatorio)");
  }
  return input.ramas_quebradas ? indicador("leve") : indicador("despreciable"); // CR-RQU-02 / CR-RQU-01
}

/** CR-DES-01 a 02. */
function evaluarDesequilibrioCopa(input: R03Input): IndicadorResultado {
  if (input.desequilibrio_copa === null) {
    return noDeterminado("desequilibrio_copa sin valor (CR-DES, obligatorio)");
  }
  return input.desequilibrio_copa ? indicador("leve") : indicador("despreciable"); // CR-DES-02 / CR-DES-01
}

/** CR-DEF-01 a 04. */
function evaluarDefoliacion(input: R03Input): IndicadorResultado {
  const pct = input.defoliacion_estimada_pct;
  if (pct === null) {
    return noDeterminado("defoliacion_estimada_pct sin valor (CR-DEF, obligatorio)");
  }
  if (!Number.isFinite(pct)) {
    return noDeterminado(`defoliacion_estimada_pct no es un número finito (${pct})`);
  }
  if (pct < 0 || pct > 100) {
    return noDeterminado(`defoliacion_estimada_pct fuera de rango 0–100 % (${pct}) (D-93)`);
  }
  if (pct <= 10) return indicador("despreciable"); // CR-DEF-01
  if (pct <= 25) return indicador("leve"); // CR-DEF-02
  if (pct <= 60) return indicador("moderada"); // CR-DEF-03
  return indicador("severa"); // CR-DEF-04
}

export interface R03Resultado {
  indicadores: {
    ramasSecas: IndicadorResultado;
    ramasQuebradas: IndicadorResultado;
    desequilibrioCopa: IndicadorResultado;
    defoliacion: IndicadorResultado;
  };
  puntaje: number | null; // null si probabilidadFalla = no_determinado
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje <= 2) return "improbable";
  if (puntaje <= 4) return "posible";
  if (puntaje <= 6) return "probable";
  return "inminente"; // 7–8
}

export function evaluarR03(input: R03Input): R03Resultado {
  const ramasSecas = evaluarRamasSecas(input);
  const ramasQuebradas = evaluarRamasQuebradas(input);
  const desequilibrioCopa = evaluarDesequilibrioCopa(input);
  const defoliacion = evaluarDefoliacion(input);
  const indicadores = { ramasSecas, ramasQuebradas, desequilibrioCopa, defoliacion };

  const motivos: string[] = [];
  if (ramasSecas.noDeterminado) motivos.push(`Ramas secas: ${ramasSecas.motivo}`);
  if (ramasQuebradas.noDeterminado) motivos.push(`Ramas quebradas: ${ramasQuebradas.motivo}`);
  if (desequilibrioCopa.noDeterminado) motivos.push(`Desequilibrio de copa: ${desequilibrioCopa.motivo}`);
  if (defoliacion.noDeterminado) motivos.push(`Defoliación: ${defoliacion.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = ramasSecas.puntaje! + ramasQuebradas.puntaje! + desequilibrioCopa.puntaje! + defoliacion.puntaje!;
  return { indicadores, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
