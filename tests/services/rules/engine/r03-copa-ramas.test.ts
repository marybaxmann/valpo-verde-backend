import { evaluarR03, R03Input } from "../../../../src/services/rules/engine/r03-copa-ramas";

function base(): R03Input {
  return {
    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    desequilibrio_copa: false,
    defoliacion_estimada_pct: 0,
  };
}

describe("R03 — árbol sano", () => {
  it("los cuatro indicadores en despreciable: puntaje 0, improbable", () => {
    const r = evaluarR03(base());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("CR-RSE — Ramas secas", () => {
  it("CR-RSE-01: ramas_secas = No → despreciable", () => {
    const r = evaluarR03(base());
    expect(r.indicadores.ramasSecas.severidad).toBe("despreciable");
  });
  it("CR-RSE-02: pct < 10% → leve", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 5 });
    expect(r.indicadores.ramasSecas.severidad).toBe("leve");
  });
  it("CR-RSE-02/03 (límite exacto 10%) → moderada", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 10 });
    expect(r.indicadores.ramasSecas.severidad).toBe("moderada");
  });
  it("CR-RSE-03: 10% ≤ pct ≤ 50% → moderada", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 30 });
    expect(r.indicadores.ramasSecas.severidad).toBe("moderada");
  });
  it("CR-RSE-03/04 (límite exacto 50%) → moderada (no severa todavía)", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 50 });
    expect(r.indicadores.ramasSecas.severidad).toBe("moderada");
  });
  it("CR-RSE-04: pct > 50% → severa", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 51 });
    expect(r.indicadores.ramasSecas.severidad).toBe("severa");
  });
  it("CR-RSE-05: ramas_secas = Sí, pct no registrado → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: null });
    expect(r.indicadores.ramasSecas.noDeterminado).toBe(true);
    expect(r.indicadores.ramasSecas.motivo).toMatch(/CR-RSE-05/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("D-87: pct = 0 es fuera de rango (debe ser > 0 si ramas_secas = Sí) → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 0 });
    expect(r.indicadores.ramasSecas.noDeterminado).toBe(true);
    expect(r.indicadores.ramasSecas.motivo).toMatch(/fuera de rango/);
  });
  it("D-87: pct > 100 → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: 101 });
    expect(r.indicadores.ramasSecas.noDeterminado).toBe(true);
  });
  it("pct = NaN → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: NaN });
    expect(r.indicadores.ramasSecas.noDeterminado).toBe(true);
    expect(r.indicadores.ramasSecas.motivo).toMatch(/no es un número finito/);
  });
  it("pct = Infinity → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: Infinity });
    expect(r.indicadores.ramasSecas.noDeterminado).toBe(true);
    expect(r.indicadores.ramasSecas.motivo).toMatch(/no es un número finito/);
  });
});

describe("CR-RQU — Ramas quebradas", () => {
  it("CR-RQU-01: No → despreciable", () => {
    const r = evaluarR03(base());
    expect(r.indicadores.ramasQuebradas.severidad).toBe("despreciable");
  });
  it("CR-RQU-02: Sí → leve", () => {
    const r = evaluarR03({ ...base(), ramas_quebradas: true });
    expect(r.indicadores.ramasQuebradas.severidad).toBe("leve");
  });
  it("ramas_quebradas = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_quebradas: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});

describe("CR-DES — Desequilibrio de copa", () => {
  it("CR-DES-01: No → despreciable", () => {
    const r = evaluarR03(base());
    expect(r.indicadores.desequilibrioCopa.severidad).toBe("despreciable");
  });
  it("CR-DES-02: Sí → leve", () => {
    const r = evaluarR03({ ...base(), desequilibrio_copa: true });
    expect(r.indicadores.desequilibrioCopa.severidad).toBe("leve");
  });
  it("desequilibrio_copa = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), desequilibrio_copa: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});

describe("CR-DEF — Defoliación (clases ICP Forests)", () => {
  it("CR-DEF-01: pct ≤ 10% → despreciable", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 10 });
    expect(r.indicadores.defoliacion.severidad).toBe("despreciable");
  });
  it("CR-DEF-01/02 (límite exacto 10%, siguiente unidad) → leve", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 10.0001 });
    expect(r.indicadores.defoliacion.severidad).toBe("leve");
  });
  it("CR-DEF-02: 10% < pct ≤ 25% → leve", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 20 });
    expect(r.indicadores.defoliacion.severidad).toBe("leve");
  });
  it("CR-DEF-02/03 (límite exacto 25%) → leve (no moderada todavía)", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 25 });
    expect(r.indicadores.defoliacion.severidad).toBe("leve");
  });
  it("CR-DEF-03: 25% < pct ≤ 60% → moderada", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 40 });
    expect(r.indicadores.defoliacion.severidad).toBe("moderada");
  });
  it("CR-DEF-03/04 (límite exacto 60%) → moderada (no severa todavía)", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 60 });
    expect(r.indicadores.defoliacion.severidad).toBe("moderada");
  });
  it("CR-DEF-04: pct > 60% → severa", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 61 });
    expect(r.indicadores.defoliacion.severidad).toBe("severa");
  });
  it("defoliacion_estimada_pct = null → no_determinado (obligatorio)", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("defoliacion_estimada_pct < 0 → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: -1 });
    expect(r.indicadores.defoliacion.noDeterminado).toBe(true);
    expect(r.indicadores.defoliacion.motivo).toMatch(/fuera de rango/);
  });
  it("defoliacion_estimada_pct > 100 → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: 101 });
    expect(r.indicadores.defoliacion.noDeterminado).toBe(true);
  });
  it("defoliacion_estimada_pct = NaN → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: NaN });
    expect(r.indicadores.defoliacion.noDeterminado).toBe(true);
    expect(r.indicadores.defoliacion.motivo).toMatch(/no es un número finito/);
  });
  it("defoliacion_estimada_pct = Infinity → no_determinado, nunca se clasifica", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: Infinity });
    expect(r.indicadores.defoliacion.noDeterminado).toBe(true);
  });
});

describe("Puntaje total P_CR — tramos de MATRICES_CALCULO", () => {
  it("puntaje 2 → improbable (límite superior del tramo 0–2)", () => {
    const r = evaluarR03({ ...base(), ramas_quebradas: true, desequilibrio_copa: true }); // 1+1=2
    expect(r.puntaje).toBe(2);
    expect(r.probabilidadFalla).toBe("improbable");
  });
  it("puntaje 3 → posible (límite inferior del tramo 3–4)", () => {
    const r = evaluarR03({
      ...base(), ramas_secas: true, ramas_secas_pct_copa: 5, // leve (1)
      ramas_quebradas: true, desequilibrio_copa: true, // 1 + 1
    });
    expect(r.puntaje).toBe(3);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 4 → posible (límite superior del tramo 3–4)", () => {
    const r = evaluarR03({
      ...base(), ramas_secas: true, ramas_secas_pct_copa: 30, // moderada (2)
      ramas_quebradas: true, desequilibrio_copa: true, // 1 + 1
    });
    expect(r.puntaje).toBe(4);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 5 → probable (límite inferior del tramo 5–6)", () => {
    const r = evaluarR03({
      ...base(), ramas_secas: true, ramas_secas_pct_copa: 60, // severa (3)
      ramas_quebradas: true, desequilibrio_copa: true, // 1 + 1
    });
    expect(r.puntaje).toBe(5);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("puntaje 6 → probable (límite superior del tramo 5–6)", () => {
    const r = evaluarR03({
      ...base(), ramas_secas: true, ramas_secas_pct_copa: 60, // severa (3)
      defoliacion_estimada_pct: 70, // severa (3)
    });
    expect(r.puntaje).toBe(6);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("puntaje 7 → inminente (límite inferior del tramo 7–8)", () => {
    const r = evaluarR03({
      ...base(), ramas_secas: true, ramas_secas_pct_copa: 60, // severa (3)
      defoliacion_estimada_pct: 70, // severa (3)
      ramas_quebradas: true, // leve (1)
    });
    expect(r.puntaje).toBe(7);
    expect(r.probabilidadFalla).toBe("inminente");
  });
  it("puntaje 8 → inminente (máximo P_CR)", () => {
    const r = evaluarR03({
      ramas_secas: true, ramas_secas_pct_copa: 60, // severa (3)
      ramas_quebradas: true, // leve (1)
      desequilibrio_copa: true, // leve (1)
      defoliacion_estimada_pct: 70, // severa (3)
    });
    expect(r.puntaje).toBe(8);
    expect(r.probabilidadFalla).toBe("inminente");
  });
});

describe("Valores fuera del dominio Sí/No (nunca truthy/falsy por coerción)", () => {
  it.each(["Sí", "no", 1, 0])("ramas_secas = %p → no_determinado", (valor) => {
    const r = evaluarR03({ ...base(), ramas_secas: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasSecas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("ramas_quebradas = %p → no_determinado", (valor) => {
    const r = evaluarR03({ ...base(), ramas_quebradas: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasQuebradas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("desequilibrio_copa = %p → no_determinado", (valor) => {
    const r = evaluarR03({ ...base(), desequilibrio_copa: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.desequilibrioCopa.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
});

describe("Campos faltantes → no_determinado (el motor nunca rellena ni supone)", () => {
  it("ramas_secas = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_secas: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasSecas.motivo).toMatch(/ramas_secas/);
  });
  it("ramas_secas_pct_copa = null (con ramas_secas = Sí) → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_secas: true, ramas_secas_pct_copa: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasSecas.motivo).toMatch(/ramas_secas_pct_copa/);
  });
  it("ramas_quebradas = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), ramas_quebradas: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasQuebradas.motivo).toMatch(/ramas_quebradas/);
  });
  it("desequilibrio_copa = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), desequilibrio_copa: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.desequilibrioCopa.motivo).toMatch(/desequilibrio_copa/);
  });
  it("defoliacion_estimada_pct = null → no_determinado", () => {
    const r = evaluarR03({ ...base(), defoliacion_estimada_pct: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.defoliacion.motivo).toMatch(/defoliacion_estimada_pct/);
  });
});
