/**
 * Fechas sugeridas de reinspección y monitoreo (INSPECCION: D-212
 * `fecha_proxima_inspeccion`, D-213 `fecha_proximo_monitoreo`). Fuente:
 * Excel maestro 2.1.0. Entrada: `nivel_riesgo` (D-210, igual a
 * `clasificacion_riesgo` del REGISTRO_EVALUACION vinculado, incluido
 * su ajuste) y `fecha_inspeccion`. Salida: el **inicio** del rango
 * sugerido — SIVU solo lo muestra como recordatorio; no agenda nada
 * automáticamente (D-212/D-213, validación y dependencias).
 *
 * D-212 (reinspección): Bajo 24 meses; Moderado 12 meses; Alto 1 a 3
 * meses (inicio = 1 mes); Extremo 1 a 4 semanas (inicio = 1 semana).
 * D-213 (monitoreo): Bajo 12 meses; Moderado 3 a 6 meses (inicio = 3
 * meses); Alto 2 a 4 semanas (inicio = 2 semanas); Extremo "inmediato
 * y continuo mientras persista el peligro" — no es un desplazamiento
 * de fecha, se modela aparte (`inmediatoYContinuo`), con la fecha de
 * inspección como punto de partida.
 *
 * `nivel_riesgo = no_determinado`: el Excel no define una fecha
 * sugerida para este caso. Se reporta como bloqueo (`noDeterminable`
 * con motivo) — no se inventa una fecha ni se omite el campo en
 * silencio.
 *
 * Aritmética de fechas: `fecha_inspeccion` es una fecha de calendario
 * (sin hora), así que sumar meses/semanas se hace con los componentes
 * año/mes/día en UTC — nunca con la zona `America/Santiago`, que
 * introduciría saltos de día por el horario de verano al operar sobre
 * una fecha sin instante real. "Hora de Chile" aquí significa: la
 * fecha de entrada y de salida son fechas de calendario de Chile
 * (AAAA-MM-DD), no un instante que haya que convertir.
 *
 * Nota (a confirmar): sumar un mes a una fecha de fin de mes sigue la
 * normalización estándar de JavaScript (p. ej. 31 de enero + 1 mes →
 * 2 o 3 de marzo, porque febrero no tiene 31 días) — no se recorta al
 * último día del mes de destino.
 */

import { ClasificacionRiesgoCodigo, esCodigoVigente } from "./catalogs";

export interface FechaSugeridaResultado {
  fecha: string | null; // AAAA-MM-DD, inicio del rango; null si noDeterminable
  inmediatoYContinuo?: boolean; // true solo en fecha_proximo_monitoreo con nivel_riesgo = extremo (D-213)
  noDeterminable: boolean;
  motivo?: string;
}

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(fecha: string): boolean {
  if (!FORMATO_FECHA.test(fecha)) return false;
  const [y, m, d] = fecha.split("-").map(Number);
  const reconstruida = new Date(Date.UTC(y, m - 1, d));
  return (
    reconstruida.getUTCFullYear() === y && reconstruida.getUTCMonth() === m - 1 && reconstruida.getUTCDate() === d
  );
}

function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10);
}

function sumarSemanas(fechaISO: string, semanas: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + semanas * 7)).toISOString().slice(0, 10);
}

type NivelRiesgoDeterminado = "bajo" | "moderado" | "alto" | "extremo";

function validarEntradas(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
  citaExcel: string,
): FechaSugeridaResultado | { nivelRiesgo: NivelRiesgoDeterminado; fechaInspeccionISO: string } {
  if (fechaInspeccionISO === null) {
    return { fecha: null, noDeterminable: true, motivo: "fecha_inspeccion sin valor" };
  }
  if (!esFechaValida(fechaInspeccionISO)) {
    return { fecha: null, noDeterminable: true, motivo: `fecha_inspeccion no es una fecha de calendario válida (AAAA-MM-DD): "${fechaInspeccionISO}"` };
  }
  if (nivelRiesgo === null) {
    return { fecha: null, noDeterminable: true, motivo: "nivel_riesgo sin valor (D-210, obligatorio)" };
  }
  if (!esCodigoVigente("clasificacion_riesgo", nivelRiesgo)) {
    return { fecha: null, noDeterminable: true, motivo: `nivel_riesgo tiene un código no reconocido ("${nivelRiesgo}")` };
  }
  if (nivelRiesgo === "no_determinado") {
    return {
      fecha: null,
      noDeterminable: true,
      motivo: `nivel_riesgo = no_determinado: el Excel no define la fecha sugerida para este caso (${citaExcel}); se reporta como bloqueo, no se inventa`,
    };
  }
  return { nivelRiesgo, fechaInspeccionISO };
}

/** D-212: fecha_proxima_inspeccion. */
export function calcularFechaProximaInspeccion(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
): FechaSugeridaResultado {
  const entrada = validarEntradas(nivelRiesgo, fechaInspeccionISO, "D-212");
  if ("noDeterminable" in entrada) return entrada;

  switch (entrada.nivelRiesgo) {
    case "bajo":
      return { fecha: sumarMeses(entrada.fechaInspeccionISO, 24), noDeterminable: false };
    case "moderado":
      return { fecha: sumarMeses(entrada.fechaInspeccionISO, 12), noDeterminable: false };
    case "alto":
      return { fecha: sumarMeses(entrada.fechaInspeccionISO, 1), noDeterminable: false }; // inicio del rango 1–3 meses
    case "extremo":
      return { fecha: sumarSemanas(entrada.fechaInspeccionISO, 1), noDeterminable: false }; // inicio del rango 1–4 semanas
  }
}

/** D-213: fecha_proximo_monitoreo. */
export function calcularFechaProximoMonitoreo(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
): FechaSugeridaResultado {
  const entrada = validarEntradas(nivelRiesgo, fechaInspeccionISO, "D-213");
  if ("noDeterminable" in entrada) return entrada;

  switch (entrada.nivelRiesgo) {
    case "bajo":
      return { fecha: sumarMeses(entrada.fechaInspeccionISO, 12), noDeterminable: false };
    case "moderado":
      return { fecha: sumarMeses(entrada.fechaInspeccionISO, 3), noDeterminable: false }; // inicio del rango 3–6 meses
    case "alto":
      return { fecha: sumarSemanas(entrada.fechaInspeccionISO, 2), noDeterminable: false }; // inicio del rango 2–4 semanas
    case "extremo":
      // D-213: "inmediato y continuo mientras persista el peligro" — no
      // es un desplazamiento de fecha; el punto de partida es la propia
      // fecha de inspección.
      return { fecha: entrada.fechaInspeccionISO, inmediatoYContinuo: true, noDeterminable: false };
  }
}
