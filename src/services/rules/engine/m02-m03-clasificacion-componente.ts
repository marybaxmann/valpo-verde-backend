/**
 * M02 — Matriz de probabilidad de falla e impacto, y M03 — Matriz de
 * clasificación de riesgo (MATRICES_CALCULO, columnas G–L y M–R).
 *
 * M02: probabilidad_falla_componente × probabilidad_impacto →
 * probabilidad_falla_impacto. Es un resultado intermedio: no tiene
 * columna propia en evaluations/tree_assessments (D-176 a D-178 usan
 * M02+M03 como un solo paso), pero se expone (`evaluarM02`) para
 * poder probar sus 16 celdas por separado.
 * M03: probabilidad_falla_impacto × consecuencia_componente →
 * clasificacion_riesgo_componente (D-176/177/178), también expuesta
 * (`evaluarM03`) para probar sus 16 celdas.
 *
 * `evaluarClasificacionComponente` compone ambas matrices a partir de
 * las entradas reales (probabilidad_falla_*, probabilidad_impacto,
 * consecuencia_*). Si `probabilidadFalla` llega no_determinado
 * (propagado desde R01/R02/R03, CC-024), el resultado es
 * no_determinado sin evaluar ninguna matriz.
 */

import { ConsecuenciaCodigo, esCodigoVigente, ProbabilidadFallaCodigo, ProbabilidadImpactoCodigo } from "./catalogs";

/** Salida de M02. Intermedia: no se guarda en ninguna columna propia. */
export type ProbabilidadFallaImpactoCodigo = "poco_probable" | "algo_probable" | "probable" | "muy_probable";

type ProbabilidadFallaDeterminada = Exclude<ProbabilidadFallaCodigo, "no_determinado">;
type ClasificacionRiesgoDeterminada = "bajo" | "moderado" | "alto" | "extremo";

const MATRIZ_M02: Record<ProbabilidadFallaDeterminada, Record<ProbabilidadImpactoCodigo, ProbabilidadFallaImpactoCodigo>> = {
  inminente: { muy_baja: "poco_probable", baja: "algo_probable", media: "probable", alta: "muy_probable" },
  probable: { muy_baja: "poco_probable", baja: "poco_probable", media: "algo_probable", alta: "probable" },
  posible: { muy_baja: "poco_probable", baja: "poco_probable", media: "poco_probable", alta: "algo_probable" },
  improbable: { muy_baja: "poco_probable", baja: "poco_probable", media: "poco_probable", alta: "poco_probable" },
};

const MATRIZ_M03: Record<ProbabilidadFallaImpactoCodigo, Record<ConsecuenciaCodigo, ClasificacionRiesgoDeterminada>> = {
  muy_probable: { insignificante: "bajo", menor: "moderado", significativa: "alto", severa: "extremo" },
  probable: { insignificante: "bajo", menor: "moderado", significativa: "alto", severa: "alto" },
  algo_probable: { insignificante: "bajo", menor: "bajo", significativa: "moderado", severa: "moderado" },
  poco_probable: { insignificante: "bajo", menor: "bajo", significativa: "bajo", severa: "bajo" },
};

export interface M02Resultado {
  probabilidadFallaImpacto: ProbabilidadFallaImpactoCodigo | null; // null si noDeterminado
  noDeterminado: boolean;
  motivo?: string;
}

/** M02, aislada: probabilidad_falla_componente × probabilidad_impacto. */
export function evaluarM02(
  probabilidadFalla: ProbabilidadFallaCodigo | null,
  probabilidadImpacto: ProbabilidadImpactoCodigo | null,
): M02Resultado {
  if (probabilidadFalla === null) {
    return { probabilidadFallaImpacto: null, noDeterminado: true, motivo: "probabilidad_falla_* sin valor" };
  }
  if (probabilidadFalla === "no_determinado") {
    return {
      probabilidadFallaImpacto: null,
      noDeterminado: true,
      motivo: "probabilidad_falla_* = no_determinado (propagado desde R01/R02/R03, CC-024)",
    };
  }
  if (!esCodigoVigente("probabilidad_falla", probabilidadFalla)) {
    return {
      probabilidadFallaImpacto: null,
      noDeterminado: true,
      motivo: `probabilidad_falla_* tiene un código no reconocido ("${probabilidadFalla}")`,
    };
  }
  if (probabilidadImpacto === null) {
    return { probabilidadFallaImpacto: null, noDeterminado: true, motivo: "probabilidad_impacto sin valor (M01 no evaluado o no_determinado)" };
  }
  if (!esCodigoVigente("probabilidad_impacto", probabilidadImpacto)) {
    return {
      probabilidadFallaImpacto: null,
      noDeterminado: true,
      motivo: `probabilidad_impacto tiene un código no reconocido ("${probabilidadImpacto}")`,
    };
  }
  return { probabilidadFallaImpacto: MATRIZ_M02[probabilidadFalla][probabilidadImpacto], noDeterminado: false };
}

export interface M03Resultado {
  clasificacion: ClasificacionRiesgoDeterminada | null; // null si noDeterminado
  noDeterminado: boolean;
  motivo?: string;
}

/** M03, aislada: probabilidad_falla_impacto (salida de M02) × consecuencia_componente. */
export function evaluarM03(
  probabilidadFallaImpacto: ProbabilidadFallaImpactoCodigo | null,
  consecuencia: ConsecuenciaCodigo | null,
): M03Resultado {
  if (probabilidadFallaImpacto === null) {
    return { clasificacion: null, noDeterminado: true, motivo: "probabilidad_falla_impacto sin valor (M02 no evaluado o no_determinado)" };
  }
  if (consecuencia === null) {
    return { clasificacion: null, noDeterminado: true, motivo: "consecuencia_* sin valor (D-170/171/172, obligatorio)" };
  }
  if (!esCodigoVigente("consecuencia", consecuencia)) {
    return { clasificacion: null, noDeterminado: true, motivo: `consecuencia_* tiene un código no reconocido ("${consecuencia}")` };
  }
  return { clasificacion: MATRIZ_M03[probabilidadFallaImpacto][consecuencia], noDeterminado: false };
}

export interface ClasificacionComponenteResultado {
  clasificacion: ClasificacionRiesgoDeterminada | null; // null si noDeterminado
  noDeterminado: boolean;
  motivo?: string;
}

/** Compone M02 + M03 a partir de las entradas reales del componente. */
export function evaluarClasificacionComponente(
  probabilidadFalla: ProbabilidadFallaCodigo | null,
  probabilidadImpacto: ProbabilidadImpactoCodigo | null,
  consecuencia: ConsecuenciaCodigo | null,
): ClasificacionComponenteResultado {
  const m02 = evaluarM02(probabilidadFalla, probabilidadImpacto);
  if (m02.noDeterminado) {
    return { clasificacion: null, noDeterminado: true, motivo: m02.motivo };
  }
  const m03 = evaluarM03(m02.probabilidadFallaImpacto, consecuencia);
  if (m03.noDeterminado) {
    return { clasificacion: null, noDeterminado: true, motivo: m03.motivo };
  }
  return { clasificacion: m03.clasificacion, noDeterminado: false };
}
