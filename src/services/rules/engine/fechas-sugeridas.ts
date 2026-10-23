/**
 * Fechas sugeridas de reinspección y monitoreo (INSPECCION: D-202
 * `fecha_proxima_inspeccion`, D-203 `fecha_proximo_monitoreo`). Fuente:
 * Excel maestro 2.1.0. Entrada: `nivel_riesgo` (D-200, igual a
 * `clasificacion_riesgo` del REGISTRO_EVALUACION vinculado, incluido
 * su ajuste) y `fecha_inspeccion`. Salida: el rango sugerido completo
 * (inicio y fin) — SIVU solo lo muestra como recordatorio; no agenda
 * nada automáticamente (D-202/D-203, validación y dependencias).
 *
 * D-202 (reinspección): Bajo 24 meses (sin rango, un solo valor);
 * Moderado 12 meses (sin rango); Alto 1 a 3 meses; Extremo 1 a 4
 * semanas. D-203 (monitoreo): Bajo 12 meses (sin rango); Moderado 3 a
 * 6 meses; Alto 2 a 4 semanas; Extremo "inmediato y continuo mientras
 * persista el peligro" — no es un desplazamiento de fecha ni tiene
 * fin, se modela aparte (`inmediatoYContinuo`), con la fecha de
 * inspección como único punto (`fechaInicio`, `fechaFin: null`).
 *
 * Cuando el Excel da un solo valor (Bajo en ambas, Moderado en D-202),
 * `fechaFin` es igual a `fechaInicio`: no hay una franja, es un punto.
 *
 * `nivel_riesgo = no_determinado` (CC-045 b, 2026-10-22): D-200 exige
 * `nivel_riesgo` y D-202/D-203 son fechas Obligatorias, pero
 * `clasificacion_riesgo` puede calcularse como No determinado (D-171)
 * — una inspección en ese caso nunca podría finalizarse si las fechas
 * quedaran sin valor. Decisión (opción B, criterio de precaución): se
 * usan los mismos rangos que Extremo, con un motivo explícito para que
 * la interfaz muestre por qué. `nivel_riesgo` sigue siendo el riesgo
 * **efectivo** (D-200, incluido el ajuste del Inspector — CC-044): si
 * se ajusta a un valor determinado, las fechas usan ese valor, no el
 * de precaución.
 *
 * Aritmética de fechas: `fecha_inspeccion` es una fecha de calendario
 * (sin hora), así que sumar meses/semanas se hace con los componentes
 * año/mes/día en UTC — nunca con la zona `America/Santiago`, que
 * introduciría saltos de día por el horario de verano al operar sobre
 * una fecha sin instante real. "Hora de Chile" aquí significa: la
 * fecha de entrada y de salida son fechas de calendario de Chile
 * (AAAA-MM-DD), no un instante que haya que convertir.
 *
 * Fin de mes (corregido, 2026-10-22): sumar N meses a una fecha se
 * recorta al último día del mes de destino cuando ese mes es más
 * corto (31 ene + 1 mes → 28 feb, no 2/3 mar). Sumar semanas es
 * siempre exacto (7 × N días); no hay nada que recortar.
 */

import { ClasificacionRiesgoCodigo, esCodigoVigente } from "./catalogs";

export interface FechaSugeridaResultado {
  fechaInicio: string | null; // AAAA-MM-DD, inicio del rango sugerido; null si noDeterminable
  fechaFin: string | null; // AAAA-MM-DD, fin del rango sugerido; igual a fechaInicio si el Excel da un solo valor; null si noDeterminable o si no aplica (Extremo en D-203)
  inmediatoYContinuo?: boolean; // true solo en fecha_proximo_monitoreo con nivel_riesgo = extremo (D-203)
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

/** Último día del mes `mesIndiceUTC` (0-indexado) del año `y`. */
function ultimoDiaDelMes(y: number, mesIndiceUTC: number): number {
  return new Date(Date.UTC(y, mesIndiceUTC + 1, 0)).getUTCDate();
}

/** Suma `meses` a `fechaISO`, recortando al último día del mes de destino cuando ese mes es más corto. */
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const mesDestinoAbsoluto = m - 1 + meses;
  const anioDestino = y + Math.floor(mesDestinoAbsoluto / 12);
  const mesIndiceDestino = ((mesDestinoAbsoluto % 12) + 12) % 12;
  const diaFinal = Math.min(d, ultimoDiaDelMes(anioDestino, mesIndiceDestino));
  return new Date(Date.UTC(anioDestino, mesIndiceDestino, diaFinal)).toISOString().slice(0, 10);
}

function sumarSemanas(fechaISO: string, semanas: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + semanas * 7)).toISOString().slice(0, 10);
}

const MOTIVO_PRECAUCION_ND = "criterio de precaución: nivel_riesgo No determinado (CC-045 b)";

function validarEntradas(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
): FechaSugeridaResultado | { nivelRiesgo: ClasificacionRiesgoCodigo; fechaInspeccionISO: string } {
  if (fechaInspeccionISO === null) {
    return { fechaInicio: null, fechaFin: null, noDeterminable: true, motivo: "fecha_inspeccion sin valor" };
  }
  if (!esFechaValida(fechaInspeccionISO)) {
    return {
      fechaInicio: null,
      fechaFin: null,
      noDeterminable: true,
      motivo: `fecha_inspeccion no es una fecha de calendario válida (AAAA-MM-DD): "${fechaInspeccionISO}"`,
    };
  }
  if (nivelRiesgo === null) {
    return { fechaInicio: null, fechaFin: null, noDeterminable: true, motivo: "nivel_riesgo sin valor (D-200, obligatorio)" };
  }
  if (!esCodigoVigente("clasificacion_riesgo", nivelRiesgo)) {
    return {
      fechaInicio: null,
      fechaFin: null,
      noDeterminable: true,
      motivo: `nivel_riesgo tiene un código no reconocido ("${nivelRiesgo}")`,
    };
  }
  return { nivelRiesgo, fechaInspeccionISO };
}

/** D-202: fecha_proxima_inspeccion. */
export function calcularFechaProximaInspeccion(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
): FechaSugeridaResultado {
  const entrada = validarEntradas(nivelRiesgo, fechaInspeccionISO);
  if ("noDeterminable" in entrada) return entrada;
  const { fechaInspeccionISO: f } = entrada;

  switch (entrada.nivelRiesgo) {
    case "bajo": {
      const fecha = sumarMeses(f, 24); // sin rango: un solo valor
      return { fechaInicio: fecha, fechaFin: fecha, noDeterminable: false };
    }
    case "moderado": {
      const fecha = sumarMeses(f, 12); // sin rango: un solo valor
      return { fechaInicio: fecha, fechaFin: fecha, noDeterminable: false };
    }
    case "alto":
      return { fechaInicio: sumarMeses(f, 1), fechaFin: sumarMeses(f, 3), noDeterminable: false }; // rango 1 a 3 meses
    case "extremo":
      return { fechaInicio: sumarSemanas(f, 1), fechaFin: sumarSemanas(f, 4), noDeterminable: false }; // rango 1 a 4 semanas
    case "no_determinado":
      // CC-045 (b): criterio de precaución, mismos rangos que Extremo.
      return { fechaInicio: sumarSemanas(f, 1), fechaFin: sumarSemanas(f, 4), noDeterminable: false, motivo: MOTIVO_PRECAUCION_ND };
  }
}

/** D-203: fecha_proximo_monitoreo. */
export function calcularFechaProximoMonitoreo(
  nivelRiesgo: ClasificacionRiesgoCodigo | null,
  fechaInspeccionISO: string | null,
): FechaSugeridaResultado {
  const entrada = validarEntradas(nivelRiesgo, fechaInspeccionISO);
  if ("noDeterminable" in entrada) return entrada;
  const { fechaInspeccionISO: f } = entrada;

  switch (entrada.nivelRiesgo) {
    case "bajo": {
      const fecha = sumarMeses(f, 12); // sin rango: un solo valor
      return { fechaInicio: fecha, fechaFin: fecha, noDeterminable: false };
    }
    case "moderado":
      return { fechaInicio: sumarMeses(f, 3), fechaFin: sumarMeses(f, 6), noDeterminable: false }; // rango 3 a 6 meses
    case "alto":
      return { fechaInicio: sumarSemanas(f, 2), fechaFin: sumarSemanas(f, 4), noDeterminable: false }; // rango 2 a 4 semanas
    case "extremo":
      // D-203: "inmediato y continuo mientras persista el peligro" — no
      // es un desplazamiento de fecha ni tiene fin; el punto de partida
      // es la propia fecha de inspección.
      return { fechaInicio: f, fechaFin: null, inmediatoYContinuo: true, noDeterminable: false };
    case "no_determinado":
      // CC-045 (b): criterio de precaución, mismo tratamiento que Extremo.
      return { fechaInicio: f, fechaFin: null, inmediatoYContinuo: true, noDeterminable: false, motivo: MOTIVO_PRECAUCION_ND };
  }
}
