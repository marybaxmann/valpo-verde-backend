/**
 * Validación de dominio Sí/No en tiempo de ejecución.
 *
 * PR-021: "Sí/No es un dominio base, no un catálogo" — pero sigue
 * siendo un dominio cerrado ({true, false}), y la regla de la
 * responsable de no rellenar/suponer/sustituir aplica igual. El tipo
 * de TypeScript (`boolean | null`) solo protege en tiempo de
 * compilación: un valor corrupto que llegue desde fuera del
 * compilador (p. ej. una fila de la base de datos con "Sí", "no", 1 o
 * 0 en vez de `true`/`false`) sería truthy/falsy por coerción de
 * JavaScript y se clasificaría como si fuera un booleano válido —
 * exactamente la sustitución silenciosa que no se permite.
 *
 * Se usa después de descartar `null` (cada módulo trata el "sin
 * valor" con su propio motivo, citando si el campo es obligatorio o
 * condicional).
 */

export function esBooleanoValido(valor: unknown): valor is boolean {
  return typeof valor === "boolean";
}

export function motivoFueraDominioSiNo(nombre: string, valor: unknown, citaExcel: string): string {
  return `${nombre} fuera del dominio Sí/No (${citaExcel}): valor recibido ${JSON.stringify(valor)} (tipo ${typeof valor})`;
}
