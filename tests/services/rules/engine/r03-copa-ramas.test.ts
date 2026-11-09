import { evaluarR03, R03Input } from "../../../../src/services/rules/engine/r03-copa-ramas";

function base(): R03Input {
  return {
    ramas_secas: false,
    ramas_secas_pct_copa: null,
    ramas_quebradas: false,
    permanece_suspendida: null,
  };
}

const conSecas = (pct: number | null): R03Input => ({ ...base(), ramas_secas: true, ramas_secas_pct_copa: pct });
const conQuebrada = (suspendida: boolean | null): R03Input => ({ ...base(), ramas_quebradas: true, permanece_suspendida: suspendida });

describe("R03 — árbol sano", () => {
  it("sin ramas secas ni quebradas: puntaje 0, improbable", () => {
    const r = evaluarR03(base());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("CR-RSE — Ramas secas", () => {
  it.each([
    [5, "leve", "CR-RSE-02"],
    [9.99, "leve", "CR-RSE-02"],
    [10, "moderada", "CR-RSE-03"],
    [50, "moderada", "CR-RSE-03"],
    [50.01, "severa", "CR-RSE-04"],
    [100, "severa", "CR-RSE-04"],
  ])("pct = %p → %s (%s)", (pct, severidad, regla) => {
    const i = evaluarR03(conSecas(pct)).indicadores.ramasSecas;
    expect(i.severidad).toBe(severidad);
    expect(i.reglaId).toBe(regla);
  });
  it("CR-RSE-01: ramas_secas = No → despreciable", () => {
    const i = evaluarR03(base()).indicadores.ramasSecas;
    expect(i.severidad).toBe("despreciable");
    expect(i.reglaId).toBe("CR-RSE-01");
  });
  it("CR-RSE-05: ramas_secas = Sí, pct no registrado → no_determinado", () => {
    const r = evaluarR03(conSecas(null));
    expect(r.indicadores.ramasSecas.reglaId).toBe("CR-RSE-05");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it.each([0, -1, 101, NaN, Infinity])("pct = %p queda no_determinado, nunca se clasifica", (pct) => {
    expect(evaluarR03(conSecas(pct)).probabilidadFalla).toBe("no_determinado");
  });
});

describe("CR-RQU — Ramas quebradas", () => {
  it("CR-RQU-01: No → despreciable, sin mirar permanece_suspendida", () => {
    const i = evaluarR03({ ...base(), permanece_suspendida: true }).indicadores.ramasQuebradas;
    expect(i.severidad).toBe("despreciable");
    expect(i.reglaId).toBe("CR-RQU-01");
  });
  it("CR-RQU-02: Sí y no suspendida → leve, suma 1", () => {
    const r = evaluarR03(conQuebrada(false));
    expect(r.indicadores.ramasQuebradas.reglaId).toBe("CR-RQU-02");
    expect(r.puntaje).toBe(1);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("CR-RQU-04: Sí y permanece_suspendida sin registrar → no_determinado", () => {
    const r = evaluarR03(conQuebrada(null));
    expect(r.indicadores.ramasQuebradas.reglaId).toBe("CR-RQU-04");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});

describe("Regla de prioridad — CR-RQU-03", () => {
  it("rama suspendida → inminente, sin puntaje", () => {
    const r = evaluarR03(conQuebrada(true));
    expect(r.probabilidadFalla).toBe("inminente");
    expect(r.puntaje).toBeNull();
    expect(r.indicadores.ramasQuebradas.reglaId).toBe("CR-RQU-03");
    expect(r.indicadores.ramasQuebradas.noDeterminado).toBe(false);
  });
  it("se aplica antes de propagar No determinado: ramas secas sin dato no la bloquean", () => {
    const r = evaluarR03({ ...conQuebrada(true), ramas_secas: true, ramas_secas_pct_copa: null });
    expect(r.probabilidadFalla).toBe("inminente");
  });
  it("no se confunde con ramas_secas = null", () => {
    const r = evaluarR03({ ...conQuebrada(true), ramas_secas: null });
    expect(r.probabilidadFalla).toBe("inminente");
  });
});

describe("Puntaje total P_CR — tramos 0 / 1–2 / 3–4", () => {
  it.each([
    [5, false, 1, "posible"], // leve
    [5, true, 2, "posible"], // leve + quebrada
    [30, false, 2, "posible"], // moderada
    [30, true, 3, "probable"], // moderada + quebrada
    [60, false, 3, "probable"], // severa
    [60, true, 4, "probable"], // máximo
  ])("secas %p %%, quebrada %p → %p, %s", (pct, quebrada, puntaje, probabilidad) => {
    const r = evaluarR03({ ...conSecas(pct), ramas_quebradas: quebrada, permanece_suspendida: quebrada ? false : null });
    expect(r.puntaje).toBe(puntaje);
    expect(r.probabilidadFalla).toBe(probabilidad);
  });
  it("la suma nunca da Inminente", () => {
    const r = evaluarR03({ ...conSecas(100), ramas_quebradas: true, permanece_suspendida: false });
    expect(r.probabilidadFalla).not.toBe("inminente");
  });
});

describe("Datos faltantes o fuera de dominio → no_determinado", () => {
  it.each(["ramas_secas", "ramas_quebradas"] as const)("%s = null", (campo) => {
    const r = evaluarR03({ ...base(), [campo]: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.motivo).toMatch(new RegExp(campo));
  });
  it.each(["Sí", "no", 1, 0])("ramas_secas = %p no se interpreta por coerción", (valor) => {
    const r = evaluarR03({ ...base(), ramas_secas: valor as unknown as boolean });
    expect(r.indicadores.ramasSecas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("ramas_quebradas = %p no se interpreta por coerción", (valor) => {
    const r = evaluarR03({ ...base(), ramas_quebradas: valor as unknown as boolean });
    expect(r.indicadores.ramasQuebradas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("permanece_suspendida = %p no activa la regla de prioridad", (valor) => {
    const r = evaluarR03(conQuebrada(valor as unknown as boolean));
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.ramasQuebradas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
});
