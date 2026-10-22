import { evaluarM01 } from "../../../../src/services/rules/engine/m01-probabilidad-impacto";
import { ProbabilidadImpactoCodigo, TasaOcupacionCodigo, ZonaObjetivoCodigo } from "../../../../src/services/rules/engine/catalogs";

// Las 16 celdas de M01 (MATRICES_CALCULO), una por una.
const CELDAS: Array<[ZonaObjetivoCodigo, TasaOcupacionCodigo, ProbabilidadImpactoCodigo]> = [
  ["bajo_la_copa", "rara", "baja"],
  ["bajo_la_copa", "ocasional", "media"],
  ["bajo_la_copa", "frecuente", "alta"],
  ["bajo_la_copa", "constante", "alta"],

  ["entre_limite_copa_y_una_altura", "rara", "muy_baja"],
  ["entre_limite_copa_y_una_altura", "ocasional", "baja"],
  ["entre_limite_copa_y_una_altura", "frecuente", "media"],
  ["entre_limite_copa_y_una_altura", "constante", "alta"],

  ["entre_una_y_1_5_alturas", "rara", "muy_baja"],
  ["entre_una_y_1_5_alturas", "ocasional", "baja"],
  ["entre_una_y_1_5_alturas", "frecuente", "baja"],
  ["entre_una_y_1_5_alturas", "constante", "media"],

  ["mas_alla_de_1_5_alturas", "rara", "muy_baja"],
  ["mas_alla_de_1_5_alturas", "ocasional", "muy_baja"],
  ["mas_alla_de_1_5_alturas", "frecuente", "muy_baja"],
  ["mas_alla_de_1_5_alturas", "constante", "baja"],
];

describe("M01 — las 16 celdas de la matriz", () => {
  it.each(CELDAS)("zona=%s, tasa=%s → %s", (zona, tasa, esperado) => {
    const r = evaluarM01(zona, tasa);
    expect(r.noDeterminado).toBe(false);
    expect(r.probabilidadImpacto).toBe(esperado);
  });
  it("cubre las 16 combinaciones (4 zonas × 4 tasas)", () => {
    expect(CELDAS).toHaveLength(16);
  });
});

describe("M01 — faltantes y fuera de dominio", () => {
  it("zona_objetivo = null → no_determinado", () => {
    const r = evaluarM01(null, "rara");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/zona_objetivo/);
  });
  it("tasa_ocupacion_objetivo = null → no_determinado", () => {
    const r = evaluarM01("bajo_la_copa", null);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/tasa_ocupacion_objetivo/);
  });
  it("zona_objetivo con código no reconocido → no_determinado", () => {
    const r = evaluarM01("en_el_aire" as unknown as ZonaObjetivoCodigo, "rara");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
  it("tasa_ocupacion_objetivo con código no reconocido → no_determinado", () => {
    const r = evaluarM01("bajo_la_copa", "siempre" as unknown as TasaOcupacionCodigo);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});
