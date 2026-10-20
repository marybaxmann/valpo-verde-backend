/**
 * Día de hoy en Chile (America/Santiago), AAAA-MM-DD.
 * `toISOString()` entrega el día UTC: entre las 21:00 (20:00 en invierno) y las
 * 23:59 de Chile ya es el día siguiente. Intl resuelve los cambios de horario.
 */
const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hoyEnChile(): string {
  return formatoFecha.format(new Date());
}
