import { esOtVencida } from "../../../src/services/sivu/otVencida";

describe("esOtVencida (B6, opción A)", () => {
  const HOY = "2026-11-02";
  it.each([
    ["programada", "2026-11-01", true],
    ["programada", "2026-11-02", false], // hoy no está vencida
    ["programada", "2026-11-03", false],
    ["programada", null, false],
    ["en_ejecucion", "2026-10-01", false],
    ["pendiente", null, false],
    ["completada", "2026-10-01", false],
    ["cancelada", "2026-10-01", false],
  ] as const)("%s con fecha %s → %s", (estado, fecha, esperado) => {
    expect(esOtVencida(estado, fecha, HOY)).toBe(esperado);
  });
});
