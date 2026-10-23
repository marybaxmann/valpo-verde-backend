/**
 * M05 — Matriz de priorización árbol–infraestructura (MATRICES_CALCULO,
 * columnas finales). Entradas: clasificacion_riesgo × clasificacion_
 * infraestructura. Salida: clasificacion_prioridad.
 *
 * Reglas (D-172, PR-008 v2.0):
 * - Si clasificacion_infraestructura = No aplica, usar la columna Bajo.
 * - Todo riesgo Extremo entrega prioridad Crítica (la fila Extremo de
 *   la matriz ya es Crítica en las cuatro columnas; no es un caso
 *   especial fuera de la tabla).
 * - Si clasificacion_riesgo = No determinado, clasificacion_prioridad
 *   = No determinado (CC-029) — no se evalúa la matriz.
 *
 * Esta función recibe los valores **efectivos** (el ajustado del
 * Inspector si existe; si no, el calculado — PR-008 v2.0). Resolver
 * cuál de los dos es el efectivo es responsabilidad de quien compone
 * el registro completo (Fase 6); M05 no conoce `classification_
 * adjustments`.
 */

import { ClasificacionInfraestructuraCodigo, ClasificacionPrioridadCodigo, ClasificacionRiesgoCodigo, esCodigoVigente } from "./catalogs";

type ClasificacionRiesgoDeterminada = "bajo" | "moderado" | "alto" | "extremo";
type ColumnaInfraestructura = "bajo" | "moderado" | "alto" | "critico";
type PrioridadDeterminada = "baja" | "media" | "alta" | "critica";

const MATRIZ_M05: Record<ClasificacionRiesgoDeterminada, Record<ColumnaInfraestructura, PrioridadDeterminada>> = {
  bajo: { bajo: "baja", moderado: "baja", alto: "media", critico: "alta" },
  moderado: { bajo: "baja", moderado: "media", alto: "alta", critico: "critica" },
  alto: { bajo: "media", moderado: "alta", alto: "critica", critico: "critica" },
  extremo: { bajo: "critica", moderado: "critica", alto: "critica", critico: "critica" },
};

export interface M05Resultado {
  clasificacionPrioridad: ClasificacionPrioridadCodigo | null; // null solo si falta un dato o hay un código no reconocido
  noDeterminado: boolean;
  motivo?: string;
}

export function evaluarM05(
  clasificacionRiesgoEfectiva: ClasificacionRiesgoCodigo | null,
  clasificacionInfraestructuraEfectiva: ClasificacionInfraestructuraCodigo | null,
): M05Resultado {
  if (clasificacionRiesgoEfectiva === null) {
    return { clasificacionPrioridad: null, noDeterminado: true, motivo: "clasificacion_riesgo sin valor" };
  }
  if (!esCodigoVigente("clasificacion_riesgo", clasificacionRiesgoEfectiva)) {
    return {
      clasificacionPrioridad: null,
      noDeterminado: true,
      motivo: `clasificacion_riesgo tiene un código no reconocido ("${clasificacionRiesgoEfectiva}")`,
    };
  }
  if (clasificacionRiesgoEfectiva === "no_determinado") {
    // CC-029: no se evalúa la matriz.
    return {
      clasificacionPrioridad: "no_determinado",
      noDeterminado: true,
      motivo: "clasificacion_riesgo = no_determinado (CC-029)",
    };
  }
  if (clasificacionInfraestructuraEfectiva === null) {
    return { clasificacionPrioridad: null, noDeterminado: true, motivo: "clasificacion_infraestructura sin valor" };
  }
  if (!esCodigoVigente("clasificacion_infraestructura", clasificacionInfraestructuraEfectiva)) {
    return {
      clasificacionPrioridad: null,
      noDeterminado: true,
      motivo: `clasificacion_infraestructura tiene un código no reconocido ("${clasificacionInfraestructuraEfectiva}")`,
    };
  }

  // D-172: No aplica usa la columna Bajo.
  const columna: ColumnaInfraestructura =
    clasificacionInfraestructuraEfectiva === "no_aplica" ? "bajo" : clasificacionInfraestructuraEfectiva;

  return { clasificacionPrioridad: MATRIZ_M05[clasificacionRiesgoEfectiva][columna], noDeterminado: false };
}
