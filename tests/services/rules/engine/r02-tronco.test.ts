import { evaluarR02, R02Input } from "../../../../src/services/rules/engine/r02-tronco";

function base(): R02Input {
  return {
    presenta_cavidad_pudricion_tronco: false,
    cavidad_externa_tronco: null,
    cavidad_interna_tronco: null,
    D_diametro_tronco_cm: null,
    d_diametro_cavidad_tronco_cm: null,
    Cc_longitud_abertura_tronco_cm: null,
    C_circunferencia_tronco_cm: null,
    t_pared_residual_tronco_cm: null,
    presenta_heridas_tronco: false,
    condicion_heridas_tronco: null,
    corteza_muerta_ausente: false,
    presenta_exudaciones: false,
    presenta_fisura_grieta_tronco: false,
    afectacion_fisura_grieta: null,
    direccion_grieta: null,
    troncos_codominantes: false,
    grieta_union_codominante: null,
    corteza_incluida: null,
  };
}

describe("R02 — árbol sano", () => {
  it("los seis indicadores en despreciable: puntaje 0, improbable", () => {
    const r = evaluarR02(base());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("TR-CAV — Cavidad del tronco", () => {
  it("TR-CAV-01: pudrición = No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.cavidadTronco.severidad).toBe("despreciable");
  });
  it("TR-CAV-02: externa = Sí, SL < 20% → leve", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 1, Cc_longitud_abertura_tronco_cm: 1, C_circunferencia_tronco_cm: 10,
    });
    expect(r.indicadores.cavidadTronco.severidad).toBe("leve");
  });
  it("TR-CAV-02/03 (límite exacto SL=20) → moderada", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: 35,
    });
    expect(r.variablesCalculo.SL_tronco_pct?.valor).toBeCloseTo(20, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("moderada");
  });
  it("TR-CAV-03: 20% ≤ SL < 33% → moderada", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 10, C_circunferencia_tronco_cm: 100,
    });
    expect(r.variablesCalculo.SL_tronco_pct?.valor).toBeCloseTo(21.25, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("moderada");
  });
  it("TR-CAV-03/04 (límite exacto SL=33) → severa", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 1, Cc_longitud_abertura_tronco_cm: 329, C_circunferencia_tronco_cm: 999,
    });
    expect(r.variablesCalculo.SL_tronco_pct?.valor).toBeCloseTo(33, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("severa");
  });
  it("TR-CAV-04: SL ≥ 33% → severa", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 8, Cc_longitud_abertura_tronco_cm: 5, C_circunferencia_tronco_cm: 10,
    });
    expect(r.variablesCalculo.SL_tronco_pct?.valor).toBeCloseTo(75.6, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("severa");
  });
  it("TR-CAV-05: externa = Sí, SL no calculable (falta C) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: null,
    });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadTronco.motivo).toMatch(/TR-CAV-05/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("TR-CAV-06: interna = Sí, t/R > 0,3 → moderada", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "si",
      t_pared_residual_tronco_cm: 5, D_diametro_tronco_cm: 20,
    });
    expect(r.variablesCalculo.t_R_tronco?.valor).toBeCloseTo(0.5, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("moderada");
  });
  it("TR-CAV-06/07 (límite exacto t/R=0,3) → severa", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "si",
      t_pared_residual_tronco_cm: 3, D_diametro_tronco_cm: 20,
    });
    expect(r.variablesCalculo.t_R_tronco?.valor).toBeCloseTo(0.3, 9);
    expect(r.indicadores.cavidadTronco.severidad).toBe("severa");
  });
  it("TR-CAV-08: interna = Sí, t/R no calculable (falta t) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "si",
      t_pared_residual_tronco_cm: null, D_diametro_tronco_cm: 20,
    });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadTronco.motivo).toMatch(/TR-CAV-08/);
  });
  it("TR-CAV-09: interna = Requiere evaluación instrumental → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_interna_tronco: "requiere_evaluacion_instrumental" });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadTronco.motivo).toMatch(/TR-CAV-09/);
  });
  it("TR-CAV-10: externa y interna = Sí → la más severa entre SL y t/R", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true,
      cavidad_externa_tronco: true, D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 1, Cc_longitud_abertura_tronco_cm: 1, C_circunferencia_tronco_cm: 10, // SL≈10,09% → leve
      cavidad_interna_tronco: "si", t_pared_residual_tronco_cm: 1, // con D=10 → R=5, t/R=0,2 → severa
    });
    expect(r.indicadores.cavidadTronco.severidad).toBe("severa");
  });
  it("cavidad_interna_tronco con un código fuera de dominio → no_determinado, nunca se trata como 'si'/'no'", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true,
      cavidad_interna_tronco: "tal_vez" as unknown as R02Input["cavidad_interna_tronco"],
    });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadTronco.motivo).toMatch(/código no reconocido/);
  });

  it("D-62/D-63: pudrición = Sí con externa = No e interna = No es una combinación inválida → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "no" });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("D_diametro_tronco_cm = NaN (con externa = Sí) → no_determinado, nunca se clasifica", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: NaN, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: 35,
    });
    expect(r.indicadores.cavidadTronco.noDeterminado).toBe(true);
  });
});

describe("TR-HER — Heridas", () => {
  it("TR-HER-01: presenta = No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.heridas.severidad).toBe("despreciable");
  });
  it("TR-HER-02: condición = Cerrada → despreciable", () => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: true, condicion_heridas_tronco: "cerrada" });
    expect(r.indicadores.heridas.severidad).toBe("despreciable");
  });
  it("TR-HER-03: condición = En proceso de cierre → leve", () => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: true, condicion_heridas_tronco: "en_proceso_de_cierre" });
    expect(r.indicadores.heridas.severidad).toBe("leve");
  });
  it("TR-HER-04: condición = Abierta → moderada", () => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta" });
    expect(r.indicadores.heridas.severidad).toBe("moderada");
  });
  it("condicion_heridas_tronco con un código fuera de dominio → no_determinado, nunca se trata como 'abierta'", () => {
    const r = evaluarR02({
      ...base(), presenta_heridas_tronco: true,
      condicion_heridas_tronco: "sanando_mal" as unknown as R02Input["condicion_heridas_tronco"],
    });
    expect(r.indicadores.heridas.noDeterminado).toBe(true);
    expect(r.indicadores.heridas.motivo).toMatch(/código no reconocido/);
  });
});

describe("TR-COR — Corteza muerta o ausente", () => {
  it("TR-COR-01: No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.cortezaMuertaAusente.severidad).toBe("despreciable");
  });
  it("TR-COR-02: Sí → moderada", () => {
    const r = evaluarR02({ ...base(), corteza_muerta_ausente: true });
    expect(r.indicadores.cortezaMuertaAusente.severidad).toBe("moderada");
  });
});

describe("TR-EXU — Exudaciones", () => {
  it("TR-EXU-01: No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.exudaciones.severidad).toBe("despreciable");
  });
  it("TR-EXU-02: Sí → leve", () => {
    const r = evaluarR02({ ...base(), presenta_exudaciones: true });
    expect(r.indicadores.exudaciones.severidad).toBe("leve");
  });
});

describe("TR-GRI — Fisuras y grietas", () => {
  it("TR-GRI-01: presenta = No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.fisurasGrietas.severidad).toBe("despreciable");
  });
  it("TR-GRI-02: afectación = Solo corteza → leve", () => {
    const r = evaluarR02({ ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "solo_corteza" });
    expect(r.indicadores.fisurasGrietas.severidad).toBe("leve");
  });
  it("TR-GRI-03: Penetra en madera + Longitudinal → moderada", () => {
    const r = evaluarR02({
      ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "longitudinal",
    });
    expect(r.indicadores.fisurasGrietas.severidad).toBe("moderada");
  });
  it("TR-GRI-04: Penetra en madera + Transversal → severa", () => {
    const r = evaluarR02({
      ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "transversal",
    });
    expect(r.indicadores.fisurasGrietas.severidad).toBe("severa");
  });
  it("afectacion_fisura_grieta con un código fuera de dominio → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_fisura_grieta_tronco: true,
      afectacion_fisura_grieta: "no_se_sabe" as unknown as R02Input["afectacion_fisura_grieta"],
    });
    expect(r.indicadores.fisurasGrietas.noDeterminado).toBe(true);
    expect(r.indicadores.fisurasGrietas.motivo).toMatch(/código no reconocido/);
  });
  it("direccion_grieta con un código fuera de dominio → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera",
      direccion_grieta: "diagonal" as unknown as R02Input["direccion_grieta"],
    });
    expect(r.indicadores.fisurasGrietas.noDeterminado).toBe(true);
    expect(r.indicadores.fisurasGrietas.motivo).toMatch(/código no reconocido/);
  });
});

describe("TR-COD — Codominancia", () => {
  it("TR-COD-01: troncos_codominantes = No → despreciable", () => {
    const r = evaluarR02(base());
    expect(r.indicadores.codominancia.severidad).toBe("despreciable");
  });
  it("TR-COD-02: grieta_union_codominante = Sí → severa", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: true, grieta_union_codominante: true });
    expect(r.indicadores.codominancia.severidad).toBe("severa");
  });
  it("TR-COD-03: grieta_union_codominante = No, corteza_incluida = Sí → moderada", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: true, grieta_union_codominante: false, corteza_incluida: true });
    expect(r.indicadores.codominancia.severidad).toBe("moderada");
  });
  it("TR-COD-04: grieta_union_codominante = No, corteza_incluida = No → leve", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: true, grieta_union_codominante: false, corteza_incluida: false });
    expect(r.indicadores.codominancia.severidad).toBe("leve");
  });
});

describe("Puntaje total P_T — tramos de MATRICES_CALCULO", () => {
  it("puntaje 1 → improbable (límite superior del tramo 0–1)", () => {
    const r = evaluarR02({ ...base(), presenta_exudaciones: true }); // leve (1)
    expect(r.puntaje).toBe(1);
    expect(r.probabilidadFalla).toBe("improbable");
  });
  it("puntaje 2 → posible (límite inferior del tramo 2–4)", () => {
    const r = evaluarR02({ ...base(), corteza_muerta_ausente: true }); // moderada (2)
    expect(r.puntaje).toBe(2);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 4 → posible (límite superior del tramo 2–4)", () => {
    const r = evaluarR02({
      ...base(), corteza_muerta_ausente: true, // moderada (2)
      presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta", // moderada (2)
    });
    expect(r.puntaje).toBe(4);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 5 → probable (límite inferior del tramo 5–7)", () => {
    const r = evaluarR02({
      ...base(), corteza_muerta_ausente: true, // moderada (2)
      presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta", // moderada (2)
      presenta_exudaciones: true, // leve (1)
    });
    expect(r.puntaje).toBe(5);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("puntaje 7 → probable (límite superior del tramo 5–7)", () => {
    const r = evaluarR02({
      ...base(),
      troncos_codominantes: true, grieta_union_codominante: true, // severa (3)
      presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "transversal", // severa (3)
      presenta_exudaciones: true, // leve (1)
    });
    expect(r.puntaje).toBe(7);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("puntaje 8 → inminente (límite inferior del tramo 8–14)", () => {
    const r = evaluarR02({
      ...base(),
      troncos_codominantes: true, grieta_union_codominante: true, // severa (3)
      presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "transversal", // severa (3)
      presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta", // moderada (2)
    });
    expect(r.puntaje).toBe(8);
    expect(r.probabilidadFalla).toBe("inminente");
  });
  it("puntaje 14 → inminente (máximo P_T)", () => {
    const r = evaluarR02({
      ...base(),
      presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no", // severa (3)
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 8, Cc_longitud_abertura_tronco_cm: 5, C_circunferencia_tronco_cm: 10,
      presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta", // moderada (2)
      corteza_muerta_ausente: true, // moderada (2)
      presenta_exudaciones: true, // leve (1)
      presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: "transversal", // severa (3)
      troncos_codominantes: true, grieta_union_codominante: true, // severa (3)
    });
    expect(r.puntaje).toBe(14);
    expect(r.probabilidadFalla).toBe("inminente");
  });
});

describe("Valores fuera del dominio Sí/No (nunca truthy/falsy por coerción)", () => {
  it.each(["Sí", "no", 1, 0])("presenta_cavidad_pudricion_tronco = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadTronco.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("presenta_heridas_tronco = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.heridas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("corteza_muerta_ausente = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), corteza_muerta_ausente: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cortezaMuertaAusente.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("presenta_exudaciones = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), presenta_exudaciones: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.exudaciones.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("presenta_fisura_grieta_tronco = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), presenta_fisura_grieta_tronco: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.fisurasGrietas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("troncos_codominantes = %p → no_determinado", (valor) => {
    const r = evaluarR02({ ...base(), troncos_codominantes: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.codominancia.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
});

describe("Campos faltantes → no_determinado (el motor nunca rellena ni supone)", () => {
  it("presenta_cavidad_pudricion_tronco = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("cavidad_interna_tronco = null (con pudrición = Sí) → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_interna_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("cavidad_externa_tronco = null (con pudrición = Sí, interna = No) → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_interna_tronco: "no", cavidad_externa_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("D_diametro_tronco_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: null, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("d_diametro_cavidad_tronco_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: null, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("Cc_longitud_abertura_tronco_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: null, C_circunferencia_tronco_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("C_circunferencia_tronco_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, cavidad_interna_tronco: "no",
      D_diametro_tronco_cm: 10, d_diametro_cavidad_tronco_cm: 5, Cc_longitud_abertura_tronco_cm: 3, C_circunferencia_tronco_cm: null,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("t_pared_residual_tronco_cm = null (con interna = Sí) → no_determinado", () => {
    const r = evaluarR02({
      ...base(), presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "si",
      t_pared_residual_tronco_cm: null, D_diametro_tronco_cm: 20,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("presenta_heridas_tronco = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("condicion_heridas_tronco = null (con presenta = Sí) → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_heridas_tronco: true, condicion_heridas_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("corteza_muerta_ausente = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), corteza_muerta_ausente: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("presenta_exudaciones = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_exudaciones: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("presenta_fisura_grieta_tronco = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_fisura_grieta_tronco: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("afectacion_fisura_grieta = null (con presenta = Sí) → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("direccion_grieta = null (con afectación = Penetra en madera) → no_determinado", () => {
    const r = evaluarR02({ ...base(), presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "penetra_en_madera", direccion_grieta: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("troncos_codominantes = null → no_determinado", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("grieta_union_codominante = null (con troncos_codominantes = Sí) → no_determinado", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: true, grieta_union_codominante: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("corteza_incluida = null (con grieta_union_codominante = No) → no_determinado", () => {
    const r = evaluarR02({ ...base(), troncos_codominantes: true, grieta_union_codominante: false, corteza_incluida: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});
