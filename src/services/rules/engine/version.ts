/**
 * Versión del paquete metodológico que implementa este motor (CC-030;
 * PR-011 v3.0). Única fuente de `rule_version`: cambia aquí, no en cada
 * módulo. `motor_commit` no se calcula aquí — lo inyecta la Fase 6.
 */
export const RULE_VERSION = "3.2" as const;

export const RULE_VERSION_OPERATIVA = "3.2" as const;
export type VersionMotor = "3.0" | "3.1" | typeof RULE_VERSION;
