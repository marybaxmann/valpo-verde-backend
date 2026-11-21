/**
 * Versión del paquete metodológico que implementa este motor (CC-030;
 * PR-011 v3.0). Única fuente de `rule_version`: cambia aquí, no en cada
 * módulo. `motor_commit` no se calcula aquí — lo inyecta la Fase 6.
 *
 * `RULE_VERSION` es la versión candidata que el motor ya sabe calcular;
 * `RULE_VERSION_OPERATIVA` es la publicada, la que usan los servicios
 * (inspecciones, finalización y cierre de OT). CC-081: la 3.3.0 (PALM-01)
 * está en preparación, así que la plataforma sigue calculando con la 3.2.
 * Las palmeras solo se evalúan con sus reglas cuando la operativa pase a
 * "3.3", al publicar.
 */
export const RULE_VERSION = "3.3" as const;

export const RULE_VERSION_OPERATIVA = "3.2" as const;
export type VersionMotor = "3.0" | "3.1" | "3.2" | typeof RULE_VERSION;

/** CC-080: escala de cavidad moderada/severa/crítica, consecuencia calculada y alertas de red (3.2 en adelante). */
export function usaEscala32(version: VersionMotor): boolean {
  return version === "3.2" || version === "3.3";
}

/** CC-081: reglas de palmeras (PALM-01) cuando tipo_hoja = palmera (3.3 en adelante). */
export function incluyePalmeras(version: VersionMotor): boolean {
  return version === "3.3";
}
