import {
  calcularSLBasalPct,
  calcularRRadioBasalCm,
  calcularTRBasal,
  calcularSLTroncoPct,
  calcularRRadioTroncoCm,
  calcularTRTronco,
  calcularSuperficieAlcorqueM2,
} from "../../../../src/services/rules/engine/variables-calculo";
import { FormaAlcorqueCodigo } from "../../../../src/services/rules/engine/catalogs";

// Caso calculado a mano (D-46): D=10, d=5, Cc=3, C=35.
// SL% = [(5³ + (3/35) × (10³ − 5³)) / 10³] × 100
//     = [(125 + (3/35) × 875) / 1000] × 100
//     = [(125 + 75) / 1000] × 100 = [200/1000] × 100 = 20
describe("calcularSLBasalPct — fórmula D-46", () => {
  it("caso calculado a mano: D=10, d=5, Cc=3, C=35 → SL=20", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 10,
      d_diametro_cavidad_basal_cm: 5,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeCloseTo(20, 9);
  });

  it("falta una medición (D) → no calculable, con motivo", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: null,
      d_diametro_cavidad_basal_cm: 5,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/D sin valor/);
  });

  it("d > D (viola D-46) → no calculable", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 5,
      d_diametro_cavidad_basal_cm: 10,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/d debe ser ≤ D/);
  });

  it("Cc ≥ C (viola D-46) → no calculable", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 10,
      d_diametro_cavidad_basal_cm: 5,
      Cc_longitud_abertura_cavidad_cm: 35,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/Cc debe ser < C/);
  });

  it("D = 0 → no calculable (debe ser > 0)", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 0,
      d_diametro_cavidad_basal_cm: 0,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
  });

  it("D = Infinity → no calculable (no finito)", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: Infinity,
      d_diametro_cavidad_basal_cm: 5,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/no es un número finito/);
  });

  it("d = NaN → no calculable (no finito)", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 10,
      d_diametro_cavidad_basal_cm: NaN,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/no es un número finito/);
  });
});

describe("calcularRRadioBasalCm — fórmula D-48", () => {
  it("D=10 → R=5", () => {
    expect(calcularRRadioBasalCm(10).valor).toBe(5);
  });
  it("D sin valor → no calculable", () => {
    const r = calcularRRadioBasalCm(null);
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/D sin valor/);
  });
  it("D ≤ 0 → no calculable", () => {
    expect(calcularRRadioBasalCm(0).valor).toBeNull();
  });
});

describe("calcularTRBasal — fórmula D-49", () => {
  it("t=3, D=20 (R=10) → t/R=0,3 (límite exacto)", () => {
    expect(calcularTRBasal(3, 20).valor).toBeCloseTo(0.3, 9);
  });
  it("t=5, D=20 (R=10) → t/R=0,5", () => {
    expect(calcularTRBasal(5, 20).valor).toBeCloseTo(0.5, 9);
  });
  it("t sin valor → no calculable", () => {
    const r = calcularTRBasal(null, 20);
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/t sin valor/);
  });
  it("D sin valor → R no calculable → t/R no calculable, con el motivo encadenado", () => {
    const r = calcularTRBasal(3, null);
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/R no calculable/);
  });
  it("t = Infinity → no calculable (no finito)", () => {
    const r = calcularTRBasal(Infinity, 20);
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/no es un número finito/);
  });
});

describe("variante tronco — mismas fórmulas (D-58, D-60, D-61), delegación verificada", () => {
  it("calcularSLTroncoPct: mismo caso a mano (D=10,d=5,Cc=3,C=35) → SL=20", () => {
    const r = calcularSLTroncoPct({
      D_diametro_tronco_cm: 10,
      d_diametro_cavidad_tronco_cm: 5,
      Cc_longitud_abertura_tronco_cm: 3,
      C_circunferencia_tronco_cm: 35,
    });
    expect(r.valor).toBeCloseTo(20, 9);
  });
  it("calcularSLTroncoPct: falta una medición → no calculable", () => {
    const r = calcularSLTroncoPct({
      D_diametro_tronco_cm: 10,
      d_diametro_cavidad_tronco_cm: null,
      Cc_longitud_abertura_tronco_cm: 3,
      C_circunferencia_tronco_cm: 35,
    });
    expect(r.valor).toBeNull();
  });
  it("calcularRRadioTroncoCm: D=20 → R=10", () => {
    expect(calcularRRadioTroncoCm(20).valor).toBe(10);
  });
  it("calcularTRTronco: t=3, D=20 (R=10) → t/R=0,3", () => {
    expect(calcularTRTronco(3, 20).valor).toBeCloseTo(0.3, 9);
  });
  it("calcularTRTronco: t no medido → no calculable", () => {
    expect(calcularTRTronco(null, 20).valor).toBeNull();
  });
});

function baseAlcorque(): Parameters<typeof calcularSuperficieAlcorqueM2>[0] {
  return {
    forma_alcorque: null,
    largo_alcorque_m: null,
    ancho_alcorque_m: null,
    diametro_alcorque_m: null,
    superficie_alcorque_m2_manual: null,
  };
}

// Caso calculado a mano, rectangular (D-125): largo=4, ancho=2,5 → 10 m².
describe("calcularSuperficieAlcorqueM2 — fórmula D-125", () => {
  it("rectangular: caso a mano largo=4, ancho=2,5 → 10 m²", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "rectangular", largo_alcorque_m: 4, ancho_alcorque_m: 2.5 });
    expect(r.valor).toBeCloseTo(10, 9);
  });
  it("circular: caso a mano diámetro=2 → π×1² ≈ 3,14159 m²", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "circular", diametro_alcorque_m: 2 });
    expect(r.valor).toBeCloseTo(Math.PI, 9);
  });
  it("irregular: ingreso manual del Inspector, no se calcula — se valida y se deja pasar tal cual", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "irregular", superficie_alcorque_m2_manual: 7.25 });
    expect(r.valor).toBe(7.25);
  });

  it("forma_alcorque sin valor → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2(baseAlcorque());
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/forma_alcorque sin valor/);
  });
  it("forma_alcorque con código no reconocido → no calculable, nunca se trata como una forma conocida", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "triangular" as unknown as FormaAlcorqueCodigo });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/código no reconocido/);
  });

  it("rectangular: falta largo_alcorque_m → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "rectangular", ancho_alcorque_m: 2 });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/largo_alcorque_m/);
  });
  it("rectangular: falta ancho_alcorque_m → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "rectangular", largo_alcorque_m: 4 });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/ancho_alcorque_m/);
  });
  it("rectangular: largo_alcorque_m ≤ 0 → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "rectangular", largo_alcorque_m: 0, ancho_alcorque_m: 2 });
    expect(r.valor).toBeNull();
  });
  it("rectangular: largo_alcorque_m = NaN → no calculable (no finito)", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "rectangular", largo_alcorque_m: NaN, ancho_alcorque_m: 2 });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/no es un número finito/);
  });

  it("circular: falta diametro_alcorque_m → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "circular" });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/diametro_alcorque_m/);
  });
  it("circular: diametro_alcorque_m ≤ 0 → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "circular", diametro_alcorque_m: 0 });
    expect(r.valor).toBeNull();
  });
  it("circular: diametro_alcorque_m = Infinity → no calculable (no finito)", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "circular", diametro_alcorque_m: Infinity });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/no es un número finito/);
  });

  it("irregular: falta superficie_alcorque_m2_manual → no calculable (no se inventa el valor)", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "irregular" });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/superficie_alcorque_m2_manual/);
  });
  it("irregular: superficie_alcorque_m2_manual ≤ 0 → no calculable", () => {
    const r = calcularSuperficieAlcorqueM2({ ...baseAlcorque(), forma_alcorque: "irregular", superficie_alcorque_m2_manual: 0 });
    expect(r.valor).toBeNull();
  });
});
