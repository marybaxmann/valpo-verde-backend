/**
 * Condición fisiológica y contexto de copa (REGLAS_INDICADORES: CR-DEF-01
 * a 06, CR-DES-01 a 02; DICCIONARIO_CAMPOS: clase_condicion_itree y
 * lcr_pct). Fuente: Excel maestro 3.0.0 (CC-071).
 *
 * Nada de este módulo entra en R03: describe la salud de la copa y
 * orienta al Inspector, sin puntaje. Por eso un dato faltante aquí nunca
 * deja No determinada la probabilidad de falla.
 */

import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";

export interface CondicionCopaInput {
  desequilibrio_copa: boolean | null; // D-86
  defoliacion_estimada_pct: number | null; // D-83, condicional: sin_follaje_estacional = No
  sin_follaje_estacional: boolean | null;
  muerte_regresiva_copa_pct: number | null; // D-89
}

export type CategoriaDefoliacion = "despreciable" | "leve" | "moderada" | "severa" | "muerto" | "no_aplica";

export interface IndicadorCondicion<T extends string> {
  categoria: T | null; // null = no_determinado
  reglaId: string | null;
  noDeterminado: boolean;
  motivo?: string;
}

function resultado<T extends string>(categoria: T, reglaId: string): IndicadorCondicion<T> {
  return { categoria, reglaId, noDeterminado: false };
}

function sinDeterminar<T extends string>(motivo: string): IndicadorCondicion<T> {
  return { categoria: null, reglaId: null, noDeterminado: true, motivo };
}

/** CR-DEF-01 a 06 (clases ICP Forests). */
export function evaluarDefoliacion(input: CondicionCopaInput): IndicadorCondicion<CategoriaDefoliacion> {
  if (input.sin_follaje_estacional !== null) {
    if (!esBooleanoValido(input.sin_follaje_estacional)) {
      return sinDeterminar(motivoFueraDominioSiNo("sin_follaje_estacional", input.sin_follaje_estacional, "CC-071"));
    }
    if (input.sin_follaje_estacional) return resultado("no_aplica", "CR-DEF-06");
  }

  const pct = input.defoliacion_estimada_pct;
  if (pct === null) return sinDeterminar("defoliacion_estimada_pct sin valor (CR-DEF)");
  if (!Number.isFinite(pct)) return sinDeterminar(`defoliacion_estimada_pct no es un número finito (${pct})`);
  if (pct < 0 || pct > 100) return sinDeterminar(`defoliacion_estimada_pct fuera de rango 0–100 % (${pct}) (D-83)`);
  if (pct <= 10) return resultado("despreciable", "CR-DEF-01");
  if (pct <= 25) return resultado("leve", "CR-DEF-02");
  if (pct <= 60) return resultado("moderada", "CR-DEF-03");
  if (pct < 100) return resultado("severa", "CR-DEF-04");
  return resultado("muerto", "CR-DEF-05");
}

export type CategoriaDesequilibrio = "sin_desequilibrio" | "con_desequilibrio";

/** CR-DES-01 a 02: contexto para el Inspector, sin puntaje. */
export function evaluarDesequilibrio(input: CondicionCopaInput): IndicadorCondicion<CategoriaDesequilibrio> {
  if (input.desequilibrio_copa === null) return sinDeterminar("desequilibrio_copa sin valor (CR-DES)");
  if (!esBooleanoValido(input.desequilibrio_copa)) {
    return sinDeterminar(motivoFueraDominioSiNo("desequilibrio_copa", input.desequilibrio_copa, "D-86"));
  }
  return input.desequilibrio_copa ? resultado("con_desequilibrio", "CR-DES-02") : resultado("sin_desequilibrio", "CR-DES-01");
}

export type ClaseCondicionItree = "excelente" | "buena" | "regular" | "mala" | "critica" | "moribunda" | "muerto";

/** clase_condicion_itree, desde muerte_regresiva_copa_pct. null si el dato falta o está fuera de 0–100. */
export function calcularClaseCondicionItree(pct: number | null): ClaseCondicionItree | null {
  if (pct === null || !Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  if (pct === 0) return "excelente";
  if (pct <= 10) return "buena";
  if (pct <= 25) return "regular";
  if (pct <= 50) return "mala";
  if (pct <= 75) return "critica";
  if (pct < 100) return "moribunda";
  return "muerto";
}

export const UMBRAL_ALERTA_LCR_PCT = 40;

export interface LcrResultado {
  lcr_pct: number | null;
  alerta: boolean;
}

/**
 * lcr_pct = (punta viva − base de copa viva) / altura total × 100. No
 * aplica a palmeras. Sin alturas válidas no se calcula ni se alerta. La
 * alerta no es una clase y no modifica ninguna clasificación.
 */
export function calcularLcr(args: {
  altura_punta_viva_m: number | null;
  altura_base_copa_viva_m: number | null;
  altura_total_m: number | null;
  tipo_hoja: string | null;
}): LcrResultado {
  const { altura_punta_viva_m: punta, altura_base_copa_viva_m: base, altura_total_m: total, tipo_hoja } = args;
  if (tipo_hoja === "palmera" || punta === null || base === null || total === null) return { lcr_pct: null, alerta: false };
  if (![punta, base, total].every(Number.isFinite) || total <= 0 || base < 0 || base > punta || punta > total) {
    return { lcr_pct: null, alerta: false };
  }
  const lcr = ((punta - base) / total) * 100;
  return { lcr_pct: lcr, alerta: lcr < UMBRAL_ALERTA_LCR_PCT };
}
