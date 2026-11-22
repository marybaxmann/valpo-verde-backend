/** Versión candidata del motor. La operativa se mantiene en 3.2 salvo activación explícita. */
export const RULE_VERSION = "3.4" as const;

const versionConfigurada = process.env.SIVU_RULE_VERSION_OPERATIVA;
export const RULE_VERSION_OPERATIVA = versionConfigurada === RULE_VERSION || versionConfigurada === "3.3"
  ? versionConfigurada
  : "3.2";

export type VersionMotor = "3.0" | "3.1" | "3.2" | "3.3" | typeof RULE_VERSION;

/** CC-080: escala de cavidad moderada/severa/crítica y consecuencia calculada desde 3.2. */
export function usaEscala32(version: VersionMotor): boolean {
  return version === "3.2" || version === "3.3" || incluyePalmeras(version);
}

/** CC-082: PALM-01 se incorpora en SIVU 3.4. */
export function incluyePalmeras(version: VersionMotor): boolean {
  return version === RULE_VERSION;
}
