/**
 * M01 — Matriz de probabilidad de impacto (MATRICES_CALCULO, columnas
 * A–E). Entradas: zona_objetivo × tasa_ocupacion_objetivo. Salida:
 * probabilidad_impacto (D-159). Es una tabla de consulta directa del
 * Excel, celda por celda — no se deriva de ninguna fórmula ni de
 * ningún puntaje.
 *
 * Mismo patrón que R01–R03: el motor nunca rellena, supone ni
 * sustituye un dato. Un campo sin valor o un código fuera de dominio
 * deja el resultado no_determinado, con motivo.
 */

import { esCodigoVigente, ProbabilidadImpactoCodigo, TasaOcupacionCodigo, ZonaObjetivoCodigo } from "./catalogs";

const MATRIZ_M01: Record<ZonaObjetivoCodigo, Record<TasaOcupacionCodigo, ProbabilidadImpactoCodigo>> = {
  bajo_la_copa: { rara: "baja", ocasional: "media", frecuente: "alta", constante: "alta" },
  entre_limite_copa_y_una_altura: { rara: "muy_baja", ocasional: "baja", frecuente: "media", constante: "alta" },
  entre_una_y_1_5_alturas: { rara: "muy_baja", ocasional: "baja", frecuente: "baja", constante: "media" },
  mas_alla_de_1_5_alturas: { rara: "muy_baja", ocasional: "muy_baja", frecuente: "muy_baja", constante: "baja" },
};

export interface M01Resultado {
  probabilidadImpacto: ProbabilidadImpactoCodigo | null; // null si noDeterminado
  noDeterminado: boolean;
  motivo?: string;
}

export function evaluarM01(
  zonaObjetivo: ZonaObjetivoCodigo | null,
  tasaOcupacionObjetivo: TasaOcupacionCodigo | null,
): M01Resultado {
  if (zonaObjetivo === null) {
    return { probabilidadImpacto: null, noDeterminado: true, motivo: "zona_objetivo sin valor (D-157, obligatorio)" };
  }
  if (!esCodigoVigente("zona_objetivo", zonaObjetivo)) {
    return { probabilidadImpacto: null, noDeterminado: true, motivo: `zona_objetivo tiene un código no reconocido ("${zonaObjetivo}")` };
  }
  if (tasaOcupacionObjetivo === null) {
    return { probabilidadImpacto: null, noDeterminado: true, motivo: "tasa_ocupacion_objetivo sin valor (D-158, obligatorio)" };
  }
  if (!esCodigoVigente("tasa_ocupacion", tasaOcupacionObjetivo)) {
    return {
      probabilidadImpacto: null,
      noDeterminado: true,
      motivo: `tasa_ocupacion_objetivo tiene un código no reconocido ("${tasaOcupacionObjetivo}")`,
    };
  }
  return { probabilidadImpacto: MATRIZ_M01[zonaObjetivo][tasaOcupacionObjetivo], noDeterminado: false };
}
