import {
  evaluarClasificacionComponente,
  evaluarM02,
  evaluarM03,
  ProbabilidadFallaImpactoCodigo,
} from "../../../../src/services/rules/engine/m02-m03-clasificacion-componente";
import { ConsecuenciaCodigo, ProbabilidadFallaCodigo, ProbabilidadImpactoCodigo } from "../../../../src/services/rules/engine/catalogs";

// Las 16 celdas de M02, una por una.
const CELDAS_M02: Array<[ProbabilidadFallaCodigo, ProbabilidadImpactoCodigo, ProbabilidadFallaImpactoCodigo]> = [
  ["inminente", "muy_baja", "poco_probable"],
  ["inminente", "baja", "algo_probable"],
  ["inminente", "media", "probable"],
  ["inminente", "alta", "muy_probable"],

  ["probable", "muy_baja", "poco_probable"],
  ["probable", "baja", "poco_probable"],
  ["probable", "media", "algo_probable"],
  ["probable", "alta", "probable"],

  ["posible", "muy_baja", "poco_probable"],
  ["posible", "baja", "poco_probable"],
  ["posible", "media", "poco_probable"],
  ["posible", "alta", "algo_probable"],

  ["improbable", "muy_baja", "poco_probable"],
  ["improbable", "baja", "poco_probable"],
  ["improbable", "media", "poco_probable"],
  ["improbable", "alta", "poco_probable"],
];

describe("M02 — las 16 celdas de la matriz", () => {
  it.each(CELDAS_M02)("probabilidad_falla=%s, probabilidad_impacto=%s → %s", (falla, impacto, esperado) => {
    const r = evaluarM02(falla, impacto);
    expect(r.noDeterminado).toBe(false);
    expect(r.probabilidadFallaImpacto).toBe(esperado);
  });
  it("cubre las 16 combinaciones (4 niveles de falla × 4 de impacto)", () => {
    expect(CELDAS_M02).toHaveLength(16);
  });
});

describe("M02 — faltantes, no_determinado y fuera de dominio", () => {
  it("probabilidad_falla = null → no_determinado", () => {
    const r = evaluarM02(null, "media");
    expect(r.noDeterminado).toBe(true);
  });
  it("probabilidad_falla = no_determinado (propagado) → no_determinado, sin evaluar la matriz", () => {
    const r = evaluarM02("no_determinado", "media");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/CC-024/);
  });
  it("probabilidad_impacto = null → no_determinado", () => {
    const r = evaluarM02("probable", null);
    expect(r.noDeterminado).toBe(true);
  });
  it("probabilidad_impacto con código no reconocido → no_determinado", () => {
    const r = evaluarM02("probable", "extrema" as unknown as ProbabilidadImpactoCodigo);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});

// Las 16 celdas de M03, una por una.
const CELDAS_M03: Array<[ProbabilidadFallaImpactoCodigo, ConsecuenciaCodigo, "bajo" | "moderado" | "alto" | "extremo"]> = [
  ["muy_probable", "insignificante", "bajo"],
  ["muy_probable", "menor", "moderado"],
  ["muy_probable", "significativa", "alto"],
  ["muy_probable", "severa", "extremo"],

  ["probable", "insignificante", "bajo"],
  ["probable", "menor", "moderado"],
  ["probable", "significativa", "alto"],
  ["probable", "severa", "alto"],

  ["algo_probable", "insignificante", "bajo"],
  ["algo_probable", "menor", "bajo"],
  ["algo_probable", "significativa", "moderado"],
  ["algo_probable", "severa", "moderado"],

  ["poco_probable", "insignificante", "bajo"],
  ["poco_probable", "menor", "bajo"],
  ["poco_probable", "significativa", "bajo"],
  ["poco_probable", "severa", "bajo"],
];

describe("M03 — las 16 celdas de la matriz", () => {
  it.each(CELDAS_M03)("probabilidad_falla_impacto=%s, consecuencia=%s → %s", (fallaImpacto, consecuencia, esperado) => {
    const r = evaluarM03(fallaImpacto, consecuencia);
    expect(r.noDeterminado).toBe(false);
    expect(r.clasificacion).toBe(esperado);
  });
  it("cubre las 16 combinaciones (4 niveles de M02 × 4 consecuencias)", () => {
    expect(CELDAS_M03).toHaveLength(16);
  });
});

describe("M03 — faltantes y fuera de dominio", () => {
  it("probabilidad_falla_impacto = null (M02 no evaluado) → no_determinado", () => {
    const r = evaluarM03(null, "menor");
    expect(r.noDeterminado).toBe(true);
  });
  it("consecuencia = null → no_determinado", () => {
    const r = evaluarM03("probable", null);
    expect(r.noDeterminado).toBe(true);
  });
  it("consecuencia con código no reconocido → no_determinado", () => {
    const r = evaluarM03("probable", "catastrofica" as unknown as ConsecuenciaCodigo);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});

describe("evaluarClasificacionComponente — composición M02 + M03", () => {
  it("probabilidad_falla probable + impacto alta (M02 → probable) + consecuencia severa (M03 → alto) → alto", () => {
    const r = evaluarClasificacionComponente("probable", "alta", "severa");
    expect(r.noDeterminado).toBe(false);
    expect(r.clasificacion).toBe("alto");
  });
  it("probabilidad_falla inminente + impacto alta (M02 → muy_probable) + consecuencia severa (M03 → extremo) → extremo", () => {
    const r = evaluarClasificacionComponente("inminente", "alta", "severa");
    expect(r.clasificacion).toBe("extremo");
  });
  it("probabilidad_falla = no_determinado → no_determinado, sin tocar M02 ni M03", () => {
    const r = evaluarClasificacionComponente("no_determinado", "alta", "severa");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/CC-024/);
  });
  it("consecuencia faltante con probabilidad_falla y probabilidad_impacto válidos → no_determinado", () => {
    const r = evaluarClasificacionComponente("probable", "alta", null);
    expect(r.noDeterminado).toBe(true);
  });
});
