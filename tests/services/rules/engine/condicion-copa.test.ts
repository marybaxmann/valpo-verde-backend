import {
  calcularClaseCondicionItree,
  calcularLcr,
  CondicionCopaInput,
  evaluarDefoliacion,
  evaluarDesequilibrio,
} from "../../../../src/services/rules/engine/condicion-copa";

function base(): CondicionCopaInput {
  return { desequilibrio_copa: false, defoliacion_estimada_pct: 0, sin_follaje_estacional: false, muerte_regresiva_copa_pct: 0 };
}

describe("CR-DEF — Defoliación (clases ICP Forests)", () => {
  it.each([
    [0, "despreciable", "CR-DEF-01"],
    [10, "despreciable", "CR-DEF-01"],
    [10.01, "leve", "CR-DEF-02"],
    [25, "leve", "CR-DEF-02"],
    [25.01, "moderada", "CR-DEF-03"],
    [60, "moderada", "CR-DEF-03"],
    [60.01, "severa", "CR-DEF-04"],
    [99.99, "severa", "CR-DEF-04"],
    [100, "muerto", "CR-DEF-05"],
  ])("%p %% → %s (%s)", (pct, categoria, regla) => {
    const r = evaluarDefoliacion({ ...base(), defoliacion_estimada_pct: pct });
    expect(r.categoria).toBe(categoria);
    expect(r.reglaId).toBe(regla);
  });
  it("CR-DEF-06: sin follaje estacional → no_aplica, aunque no haya porcentaje", () => {
    const r = evaluarDefoliacion({ ...base(), sin_follaje_estacional: true, defoliacion_estimada_pct: null });
    expect(r.categoria).toBe("no_aplica");
    expect(r.reglaId).toBe("CR-DEF-06");
  });
  it.each([null, -1, 101, NaN, Infinity])("%p queda no_determinado", (pct) => {
    expect(evaluarDefoliacion({ ...base(), defoliacion_estimada_pct: pct }).noDeterminado).toBe(true);
  });
  it("sin_follaje_estacional fuera de dominio → no_determinado", () => {
    expect(evaluarDefoliacion({ ...base(), sin_follaje_estacional: "Sí" as unknown as boolean }).noDeterminado).toBe(true);
  });
});

describe("CR-DES — Desequilibrio de copa", () => {
  it("No → sin_desequilibrio", () => {
    expect(evaluarDesequilibrio(base()).reglaId).toBe("CR-DES-01");
  });
  it("Sí → con_desequilibrio", () => {
    const r = evaluarDesequilibrio({ ...base(), desequilibrio_copa: true });
    expect(r.categoria).toBe("con_desequilibrio");
    expect(r.reglaId).toBe("CR-DES-02");
  });
  it("null → no_determinado", () => {
    expect(evaluarDesequilibrio({ ...base(), desequilibrio_copa: null }).noDeterminado).toBe(true);
  });
});

describe("clase_condicion_itree", () => {
  it.each([
    [0, "excelente"],
    [5, "buena"],
    [10, "buena"],
    [15, "regular"],
    [25, "regular"],
    [30, "mala"],
    [50, "mala"],
    [55, "critica"],
    [75, "critica"],
    [80, "moribunda"],
    [95, "moribunda"],
    [100, "muerto"],
  ])("%p %% → %s", (pct, clase) => {
    expect(calcularClaseCondicionItree(pct)).toBe(clase);
  });
  it.each([null, -1, 101, NaN])("%p → null", (pct) => {
    expect(calcularClaseCondicionItree(pct)).toBeNull();
  });
});

describe("lcr_pct y alerta", () => {
  const alturas = { altura_punta_viva_m: 10, altura_base_copa_viva_m: 6, altura_total_m: 10, tipo_hoja: "latifoliada" };

  it("copa viva de 6 a 10 m en un árbol de 10 m = 40 %, sin alerta (el umbral es estricto)", () => {
    expect(calcularLcr(alturas)).toEqual({ lcr_pct: 40, alerta: false });
  });
  it("bajo 40 % → alerta", () => {
    expect(calcularLcr({ ...alturas, altura_base_copa_viva_m: 7 }).alerta).toBe(true);
  });
  it("punta muerta: usa la punta viva, no la altura total", () => {
    expect(calcularLcr({ ...alturas, altura_punta_viva_m: 8 }).lcr_pct).toBe(20);
  });
  it("no aplica a palmeras", () => {
    expect(calcularLcr({ ...alturas, tipo_hoja: "palmera" })).toEqual({ lcr_pct: null, alerta: false });
  });
  it.each([
    ["sin punta viva", { altura_punta_viva_m: null }],
    ["base mayor que punta", { altura_base_copa_viva_m: 11 }],
    ["punta mayor que total", { altura_punta_viva_m: 11 }],
    ["altura total cero", { altura_total_m: 0 }],
  ])("%s → sin cálculo ni alerta", (_n, cambio) => {
    expect(calcularLcr({ ...alturas, ...cambio })).toEqual({ lcr_pct: null, alerta: false });
  });
});
