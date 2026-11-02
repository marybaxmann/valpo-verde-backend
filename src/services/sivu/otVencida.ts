/**
 * B6 — OT vencida (decisión de Valej, 2026-11-02, opción A): condición
 * CALCULADA, no un estado de OT (D-239 no cambia). Una OT está vencida si
 * su estado es Programada y su `fecha_accion_programada` (D-241) es
 * anterior a la fecha de hoy en Chile. Las OT En ejecución, Pendientes,
 * Completadas o Canceladas nunca están vencidas en esta versión.
 */
export function esOtVencida(estadoOt: string, fechaAccionProgramada: string | null, hoyChile: string): boolean {
  return estadoOt === "programada" && fechaAccionProgramada !== null && fechaAccionProgramada < hoyChile;
}
