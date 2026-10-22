/**
 * R04 — Clasificación global de riesgo del árbol (DICCIONARIO_CAMPOS
 * D-181; MATRICES_CALCULO). Entradas: clasificacion_raices_cuello +
 * clasificacion_tronco + clasificacion_copa_ramas (salida de
 * M02+M03, uno por componente). Salida: clasificacion_riesgo.
 *
 * Regla (D-181): el nivel más alto entre los tres componentes, según
 * la jerarquía Bajo < Moderado < Alto < Extremo. Si algún componente
 * queda no_determinado, el resultado completo queda no_determinado —
 * nunca se calcula con los otros dos ignorando el que falta.
 */

import { ClasificacionRiesgoCodigo, esCodigoVigente } from "./catalogs";

type ClasificacionRiesgoDeterminada = "bajo" | "moderado" | "alto" | "extremo";

const JERARQUIA: ClasificacionRiesgoDeterminada[] = ["bajo", "moderado", "alto", "extremo"];

function masAlta(a: ClasificacionRiesgoDeterminada, b: ClasificacionRiesgoDeterminada): ClasificacionRiesgoDeterminada {
  return JERARQUIA.indexOf(a) >= JERARQUIA.indexOf(b) ? a : b;
}

export interface R04Resultado {
  clasificacionRiesgo: ClasificacionRiesgoDeterminada | null; // null si noDeterminado
  noDeterminado: boolean;
  motivo?: string;
}

interface ComponenteR04 {
  nombre: string;
  valor: ClasificacionRiesgoCodigo | null;
}

export function evaluarR04(
  clasificacionRaicesCuello: ClasificacionRiesgoCodigo | null,
  clasificacionTronco: ClasificacionRiesgoCodigo | null,
  clasificacionCopaRamas: ClasificacionRiesgoCodigo | null,
): R04Resultado {
  const componentes: ComponenteR04[] = [
    { nombre: "clasificacion_raices_cuello", valor: clasificacionRaicesCuello },
    { nombre: "clasificacion_tronco", valor: clasificacionTronco },
    { nombre: "clasificacion_copa_ramas", valor: clasificacionCopaRamas },
  ];

  const faltantes = componentes.filter((c) => c.valor === null);
  if (faltantes.length > 0) {
    return {
      clasificacionRiesgo: null,
      noDeterminado: true,
      motivo: `${faltantes.map((c) => c.nombre).join(", ")} sin valor`,
    };
  }

  const fueraDeDominio = componentes.filter((c) => !esCodigoVigente("clasificacion_riesgo", c.valor as string));
  if (fueraDeDominio.length > 0) {
    return {
      clasificacionRiesgo: null,
      noDeterminado: true,
      motivo: `${fueraDeDominio.map((c) => `${c.nombre} tiene un código no reconocido ("${c.valor}")`).join("; ")}`,
    };
  }

  const noDeterminados = componentes.filter((c) => c.valor === "no_determinado");
  if (noDeterminados.length > 0) {
    // D-181: si algún componente queda no_determinado, el valor calculado
    // queda no_determinado — no se calcula con los dos restantes.
    return {
      clasificacionRiesgo: null,
      noDeterminado: true,
      motivo: `${noDeterminados.map((c) => c.nombre).join(", ")} = no_determinado (D-181)`,
    };
  }

  const determinadas = componentes.map((c) => c.valor as ClasificacionRiesgoDeterminada);
  const clasificacionRiesgo = determinadas.reduce(masAlta);
  return { clasificacionRiesgo, noDeterminado: false };
}
