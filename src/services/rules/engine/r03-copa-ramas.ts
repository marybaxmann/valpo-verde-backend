/**
 * R03 — Copa y ramas (REGLAS_INDICADORES: CR-RSE-01 a 05, CR-RQU-01 a
 * 04; MATRICES_CALCULO R03). Fuente: Excel maestro 3.0.0 (CC-071). No
 * depende de treeRisk.ts ni de docs/methodology.
 *
 * Regla de prioridad: si hay una rama quebrada o cortada que permanece
 * suspendida (CR-RQU-03), la probabilidad de falla es Inminente, sin
 * calcular la suma y aunque otro indicador quede No determinado.
 *
 * En otro caso, P_CR = ramas secas (0–3) + ramas quebradas (0–1),
 * máximo 4. Tramos: 0 improbable; 1–2 posible; 3–4 probable. Inminente
 * solo se obtiene por la regla de prioridad o por ajuste del Inspector.
 * Defoliación y desequilibrio de copa no entran en la suma: viven en
 * condicion-copa.ts.
 *
 * Mismo patrón que R01/R02: el motor nunca rellena, supone ni
 * sustituye un dato. Un campo obligatorio o condicional sin valor, o
 * fuera del rango del diccionario, deja el indicador no_determinado
 * con motivo — nunca 0 (CC-024) — y se propaga al resultado, salvo que
 * aplique la regla de prioridad.
 *
 * `reglaId`: el ID exacto de REGLAS_INDICADORES que produjo el
 * resultado (p. ej. "CR-RQU-03"). `null` cuando el resultado es un
 * corte genérico por dato faltante o fuera de rango, que el
 * diccionario exige pero que REGLAS_INDICADORES no numera.
 */

import { ProbabilidadFallaCodigo, SeveridadCodigo } from "./catalogs";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";

export interface R03Input {
  // --- Ramas secas (CR-RSE) ---
  ramas_secas: boolean | null; // obligatorio
  ramas_secas_pct_copa: number | null; // condicional: activado por ramas_secas = Sí; (0, 100]

  // --- Ramas quebradas (CR-RQU) ---
  ramas_quebradas: boolean | null; // obligatorio
  permanece_suspendida: boolean | null; // D-82, condicional: activado por ramas_quebradas = Sí
}

export interface IndicadorResultado {
  /** null = no_determinado, o la regla de prioridad CR-RQU-03, que no asigna severidad. */
  severidad: SeveridadCodigo | null;
  puntaje: number | null;
  reglaId: string | null; // el ID de REGLAS_INDICADORES que produjo el resultado; null si es un corte genérico
  noDeterminado: boolean;
  motivo?: string; // presente solo si noDeterminado = true
}

const PUNTAJE_SEVERIDAD: Record<SeveridadCodigo, number> = {
  despreciable: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

function indicador(severidad: SeveridadCodigo, reglaId: string): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], reglaId, noDeterminado: false };
}

function noDeterminado(motivo: string, reglaId: string | null = null): IndicadorResultado {
  return { severidad: null, puntaje: null, reglaId, noDeterminado: true, motivo };
}

/** CR-RSE-01 a 05. */
function evaluarRamasSecas(input: R03Input): IndicadorResultado {
  if (input.ramas_secas === null) {
    return noDeterminado("ramas_secas sin valor (CR-RSE, obligatorio)");
  }
  if (!esBooleanoValido(input.ramas_secas)) {
    return noDeterminado(motivoFueraDominioSiNo("ramas_secas", input.ramas_secas, "D-76"));
  }
  if (!input.ramas_secas) return indicador("despreciable", "CR-RSE-01");

  const pct = input.ramas_secas_pct_copa;
  if (pct === null) {
    return noDeterminado("ramas_secas_pct_copa sin registrar (CR-RSE-05, condicional activado por ramas_secas = Sí)", "CR-RSE-05");
  }
  if (!Number.isFinite(pct)) {
    return noDeterminado(`ramas_secas_pct_copa no es un número finito (${pct})`);
  }
  if (pct <= 0 || pct > 100) {
    return noDeterminado(`ramas_secas_pct_copa fuera de rango (0–100 %, estrictamente > 0) (${pct}) (D-77)`);
  }
  if (pct < 10) return indicador("leve", "CR-RSE-02");
  if (pct <= 50) return indicador("moderada", "CR-RSE-03");
  return indicador("severa", "CR-RSE-04");
}

/** CR-RQU-01 a 04. */
function evaluarRamasQuebradas(input: R03Input): IndicadorResultado {
  if (input.ramas_quebradas === null) {
    return noDeterminado("ramas_quebradas sin valor (CR-RQU, obligatorio)");
  }
  if (!esBooleanoValido(input.ramas_quebradas)) {
    return noDeterminado(motivoFueraDominioSiNo("ramas_quebradas", input.ramas_quebradas, "D-79"));
  }
  if (!input.ramas_quebradas) return indicador("despreciable", "CR-RQU-01");

  if (input.permanece_suspendida === null) {
    return noDeterminado("permanece_suspendida sin registrar (CR-RQU-04, condicional activado por ramas_quebradas = Sí)", "CR-RQU-04");
  }
  if (!esBooleanoValido(input.permanece_suspendida)) {
    return noDeterminado(motivoFueraDominioSiNo("permanece_suspendida", input.permanece_suspendida, "D-82"));
  }
  if (input.permanece_suspendida) {
    return { severidad: null, puntaje: null, reglaId: "CR-RQU-03", noDeterminado: false };
  }
  return indicador("leve", "CR-RQU-02");
}

export interface R03Resultado {
  indicadores: {
    ramasSecas: IndicadorResultado;
    ramasQuebradas: IndicadorResultado;
  };
  /** null si probabilidadFalla = no_determinado o si aplicó la regla de prioridad. */
  puntaje: number | null;
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje === 0) return "improbable";
  if (puntaje <= 2) return "posible";
  return "probable"; // 3–4
}

export function evaluarR03(input: R03Input): R03Resultado {
  const ramasSecas = evaluarRamasSecas(input);
  const ramasQuebradas = evaluarRamasQuebradas(input);
  const indicadores = { ramasSecas, ramasQuebradas };

  // La regla de prioridad se aplica antes de propagar No determinado (CR-31).
  if (ramasQuebradas.reglaId === "CR-RQU-03") {
    return { indicadores, puntaje: null, probabilidadFalla: "inminente" };
  }

  const motivos: string[] = [];
  if (ramasSecas.noDeterminado) motivos.push(`Ramas secas: ${ramasSecas.motivo}`);
  if (ramasQuebradas.noDeterminado) motivos.push(`Ramas quebradas: ${ramasQuebradas.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = ramasSecas.puntaje! + ramasQuebradas.puntaje!;
  return { indicadores, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
