import {
  calcularSLBasalPct,
  calcularRRadioBasalCm,
  calcularTRBasal,
  calcularSLTroncoPct,
  calcularRRadioTroncoCm,
  calcularTRTronco,
} from "../../../../src/services/rules/engine/variables-calculo";

// Caso calculado a mano (D-56): D=10, d=5, Cc=3, C=35.
// SL% = [(5³ + (3/35) × (10³ − 5³)) / 10³] × 100
//     = [(125 + (3/35) × 875) / 1000] × 100
//     = [(125 + 75) / 1000] × 100 = [200/1000] × 100 = 20
describe("calcularSLBasalPct — fórmula D-56", () => {
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

  it("d > D (viola D-56) → no calculable", () => {
    const r = calcularSLBasalPct({
      D_diametro_basal_tronco_cm: 5,
      d_diametro_cavidad_basal_cm: 10,
      Cc_longitud_abertura_cavidad_cm: 3,
      C_circunferencia_basal_cm: 35,
    });
    expect(r.valor).toBeNull();
    expect(r.motivo).toMatch(/d debe ser ≤ D/);
  });

  it("Cc ≥ C (viola D-56) → no calculable", () => {
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

describe("calcularRRadioBasalCm — fórmula D-58", () => {
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

describe("calcularTRBasal — fórmula D-59", () => {
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

describe("variante tronco — mismas fórmulas (D-68, D-70, D-71), delegación verificada", () => {
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
