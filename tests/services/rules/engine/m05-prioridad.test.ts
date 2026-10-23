import { evaluarM05 } from "../../../../src/services/rules/engine/m05-prioridad";
import { ClasificacionInfraestructuraCodigo, ClasificacionPrioridadCodigo, ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

// Las 16 celdas de M05 (riesgo determinado × infraestructura determinada).
const CELDAS: Array<[ClasificacionRiesgoCodigo, ClasificacionInfraestructuraCodigo, ClasificacionPrioridadCodigo]> = [
  ["bajo", "bajo", "baja"],
  ["bajo", "moderado", "baja"],
  ["bajo", "alto", "media"],
  ["bajo", "critico", "alta"],

  ["moderado", "bajo", "baja"],
  ["moderado", "moderado", "media"],
  ["moderado", "alto", "alta"],
  ["moderado", "critico", "critica"],

  ["alto", "bajo", "media"],
  ["alto", "moderado", "alta"],
  ["alto", "alto", "critica"],
  ["alto", "critico", "critica"],

  ["extremo", "bajo", "critica"],
  ["extremo", "moderado", "critica"],
  ["extremo", "alto", "critica"],
  ["extremo", "critico", "critica"],
];

describe("M05 — las 16 celdas de la matriz", () => {
  it.each(CELDAS)("riesgo=%s, infraestructura=%s → %s", (riesgo, infraestructura, esperado) => {
    const r = evaluarM05(riesgo, infraestructura);
    expect(r.noDeterminado).toBe(false);
    expect(r.clasificacionPrioridad).toBe(esperado);
  });
  it("cubre las 16 combinaciones (4 niveles de riesgo × 4 de infraestructura)", () => {
    expect(CELDAS).toHaveLength(16);
  });
  it("todo riesgo Extremo entrega prioridad Crítica, en las cuatro columnas (confirmación explícita de la regla)", () => {
    for (const infraestructura of ["bajo", "moderado", "alto", "critico"] as const) {
      const r = evaluarM05("extremo", infraestructura);
      expect(r.clasificacionPrioridad).toBe("critica");
    }
  });
});

describe("M05 — D-172: infraestructura No aplica usa la columna Bajo", () => {
  it.each([
    ["bajo", "baja"],
    ["moderado", "baja"],
    ["alto", "media"],
    ["extremo", "critica"],
  ] as const)("riesgo=%s con infraestructura=no_aplica → igual que columna Bajo (%s)", (riesgo, esperado) => {
    const r = evaluarM05(riesgo, "no_aplica");
    expect(r.noDeterminado).toBe(false);
    expect(r.clasificacionPrioridad).toBe(esperado);
  });
});

describe("M05 — CC-029: riesgo No determinado → prioridad No determinado, sin evaluar la matriz", () => {
  it("clasificacion_riesgo = no_determinado, con infraestructura Crítico → no_determinado igual", () => {
    const r = evaluarM05("no_determinado", "critico");
    expect(r.noDeterminado).toBe(true);
    expect(r.clasificacionPrioridad).toBe("no_determinado");
    expect(r.motivo).toMatch(/CC-029/);
  });
});

describe("M05 — faltantes y fuera de dominio", () => {
  it("clasificacion_riesgo = null → no_determinado (sin valor, distinto de no_determinado explícito)", () => {
    const r = evaluarM05(null, "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.clasificacionPrioridad).toBeNull();
  });
  it("clasificacion_infraestructura = null (con riesgo determinado) → no_determinado", () => {
    const r = evaluarM05("bajo", null);
    expect(r.noDeterminado).toBe(true);
  });
  it("clasificacion_riesgo con código no reconocido → no_determinado, nunca se trata como un nivel conocido", () => {
    const r = evaluarM05("catastrofico" as unknown as ClasificacionRiesgoCodigo, "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
  it("clasificacion_infraestructura con código no reconocido → no_determinado", () => {
    const r = evaluarM05("bajo", "desconocida" as unknown as ClasificacionInfraestructuraCodigo);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});
