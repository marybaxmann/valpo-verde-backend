import { evaluarR01, R01Input } from "../../../../src/services/rules/engine/r01-raices-cuello";

function base(): R01Input {
  return {
    levantamiento_del_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: null,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    cavidad_basal_interna: null,
    D_diametro_basal_tronco_cm: null,
    d_diametro_cavidad_basal_cm: null,
    Cc_longitud_abertura_cavidad_cm: null,
    C_circunferencia_basal_cm: null,
    t_pared_residual_basal_cm: null,
  };
}

describe("R01 — árbol sano", () => {
  it("los tres indicadores en despreciable: puntaje 0, improbable", () => {
    const r = evaluarR01(base());
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("RC-EST — Estabilidad", () => {
  it("RC-EST-01: levantamiento = Sí, ángulo < 15° → leve", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 10 });
    expect(r.indicadores.estabilidad.severidad).toBe("leve");
  });
  it("RC-EST-02/03 (límite 15°): levantamiento = Sí, ángulo = 15° → moderada", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 15 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-02 (límite 30°): levantamiento = Sí, ángulo = 30° → moderada", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 30 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-03 (límite 30,5°): levantamiento = Sí, ángulo = 30,5° → moderada (transición RC-EST-02→03, misma categoría)", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 30.5 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-03/04 (límite 45°): levantamiento = Sí, ángulo = 45° → moderada (no severa todavía)", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 45 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-04: levantamiento = Sí, ángulo > 45° → severa", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 60 });
    expect(r.indicadores.estabilidad.severidad).toBe("severa");
  });
  it("RC-EST-05: levantamiento = No, ángulo < 15° → despreciable", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 5 });
    expect(r.indicadores.estabilidad.severidad).toBe("despreciable");
  });
  it("RC-EST-06/07 (límite 15°): levantamiento = No, ángulo = 15° → leve", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 15 });
    expect(r.indicadores.estabilidad.severidad).toBe("leve");
  });
  it("RC-EST-06 (límite 30°): levantamiento = No, ángulo = 30° → leve", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 30 });
    expect(r.indicadores.estabilidad.severidad).toBe("leve");
  });
  it("RC-EST-07 (límite 30,5°): levantamiento = No, ángulo = 30,5° → moderada", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 30.5 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-07 (límite 45°): levantamiento = No, ángulo = 45° → moderada", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 45 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-08: levantamiento = No, ángulo > 45° → severa", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 46 });
    expect(r.indicadores.estabilidad.severidad).toBe("severa");
  });

  it("D-47: ángulo < 0° → no_determinado (fuera de rango, no se clasifica)", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: -1 });
    expect(r.indicadores.estabilidad.noDeterminado).toBe(true);
    expect(r.indicadores.estabilidad.motivo).toMatch(/fuera de rango/);
  });
  it("D-47: ángulo > 90° → no_determinado (fuera de rango, no se clasifica)", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 91 });
    expect(r.indicadores.estabilidad.noDeterminado).toBe(true);
    expect(r.indicadores.estabilidad.motivo).toMatch(/fuera de rango/);
  });
  it("ángulo = NaN → no_determinado, nunca se clasifica", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: NaN });
    expect(r.indicadores.estabilidad.noDeterminado).toBe(true);
    expect(r.indicadores.estabilidad.motivo).toMatch(/no es un número finito/);
  });
  it("ángulo = Infinity → no_determinado, nunca se clasifica", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: Infinity });
    expect(r.indicadores.estabilidad.noDeterminado).toBe(true);
    expect(r.indicadores.estabilidad.motivo).toMatch(/no es un número finito/);
  });
});

describe("RC-REX — Raíces expuestas", () => {
  it("RC-REX-01: raíces expuestas = No → despreciable", () => {
    const r = evaluarR01(base());
    expect(r.indicadores.raicesExpuestas.severidad).toBe("despreciable");
  });
  it("RC-REX-02: expuestas = Sí, necrosis = No, cortadas = No → leve", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: false, raices_cortadas: false });
    expect(r.indicadores.raicesExpuestas.severidad).toBe("leve");
  });
  it("RC-REX-03: necrosis = Sí, cortadas = No → moderada", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: true, raices_cortadas: false });
    expect(r.indicadores.raicesExpuestas.severidad).toBe("moderada");
  });
  it("RC-REX-04: necrosis = No, cortadas = Sí → moderada", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: false, raices_cortadas: true });
    expect(r.indicadores.raicesExpuestas.severidad).toBe("moderada");
  });
  it("RC-REX-05: necrosis = Sí, cortadas = Sí → severa", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true });
    expect(r.indicadores.raicesExpuestas.severidad).toBe("severa");
  });
});

describe("RC-CAV — Cavidad basal", () => {
  it("RC-CAV-01: pudrición = No → despreciable", () => {
    const r = evaluarR01(base());
    expect(r.indicadores.cavidadBasal.severidad).toBe("despreciable");
  });

  it("RC-CAV-02: externa = Sí, SL < 20% → leve (D=10,d=1,Cc=1,C=10 → SL≈10,09%)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 1, Cc_longitud_abertura_cavidad_cm: 1, C_circunferencia_basal_cm: 10,
    });
    expect(r.indicadores.cavidadBasal.severidad).toBe("leve");
    expect(r.variablesCalculo.SL_basal_pct?.valor).toBeLessThan(20);
  });

  it("RC-CAV-02/03 (límite exacto SL=20): D=10,d=5,Cc=3,C=35 → SL=20 → moderada", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: 3, C_circunferencia_basal_cm: 35,
    });
    expect(r.variablesCalculo.SL_basal_pct?.valor).toBeCloseTo(20, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("moderada");
  });

  it("RC-CAV-03: 20% ≤ SL < 33% → moderada (D=10,d=5,Cc=10,C=100 → SL=21,25%)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: 10, C_circunferencia_basal_cm: 100,
    });
    expect(r.variablesCalculo.SL_basal_pct?.valor).toBeCloseTo(21.25, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("moderada");
  });

  it("RC-CAV-03/04 (límite exacto SL=33): D=10,d=1,Cc=329,C=999 → SL=33 → severa", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 1, Cc_longitud_abertura_cavidad_cm: 329, C_circunferencia_basal_cm: 999,
    });
    expect(r.variablesCalculo.SL_basal_pct?.valor).toBeCloseTo(33, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });

  it("RC-CAV-04: SL ≥ 33% → severa (D=10,d=8,Cc=5,C=10 → SL=75,6%)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 8, Cc_longitud_abertura_cavidad_cm: 5, C_circunferencia_basal_cm: 10,
    });
    expect(r.variablesCalculo.SL_basal_pct?.valor).toBeCloseTo(75.6, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });

  it("RC-CAV-05: externa = Sí, SL no calculable (falta C) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: 3, C_circunferencia_basal_cm: null,
    });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-05/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });

  it("RC-CAV-06: interna = Sí, t/R > 0,3 → moderada (t=5, D=20 → R=10, t/R=0,5)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si",
      t_pared_residual_basal_cm: 5, D_diametro_basal_tronco_cm: 20,
    });
    expect(r.variablesCalculo.t_R_basal?.valor).toBeCloseTo(0.5, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("moderada");
  });

  it("RC-CAV-06/07 (límite exacto t/R=0,3): t=3, D=20 → R=10, t/R=0,3 → severa", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si",
      t_pared_residual_basal_cm: 3, D_diametro_basal_tronco_cm: 20,
    });
    expect(r.variablesCalculo.t_R_basal?.valor).toBeCloseTo(0.3, 9);
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });

  it("RC-CAV-08: interna = Sí, t/R no calculable (falta t) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si",
      t_pared_residual_basal_cm: null, D_diametro_basal_tronco_cm: 20,
    });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-08/);
  });

  it("RC-CAV-09: interna = Requiere evaluación instrumental → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_interna: "requiere_evaluacion_instrumental" });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-09/);
  });

  it("RC-CAV-10: externa y interna = Sí → la más severa entre SL y t/R (t/R más severo)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_externa: true, D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 1, Cc_longitud_abertura_cavidad_cm: 1, C_circunferencia_basal_cm: 10, // SL≈10,09% → leve
      cavidad_basal_interna: "si", t_pared_residual_basal_cm: 1, // con D=10 → R=5, t/R=0,2 → severa
    });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });

  it("RC-CAV-10: externa y interna = Sí, SL más severo que t/R → prevalece SL", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_externa: true, D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 8, Cc_longitud_abertura_cavidad_cm: 5, C_circunferencia_basal_cm: 10, // SL≈75,6% → severa
      cavidad_basal_interna: "si", t_pared_residual_basal_cm: 5, // con D=10 → R=5, t/R=1,0 → moderada
    });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });

  it("RC-CAV-10: si alguna de las dos vías es no_determinado, el resultado combinado es no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_externa: true, D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 1, Cc_longitud_abertura_cavidad_cm: 1, C_circunferencia_basal_cm: null, // SL no calculable
      cavidad_basal_interna: "si", t_pared_residual_basal_cm: 1, // t/R=0,2 → severa
    });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-10/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });

  it("cavidad_basal_interna con un código fuera de dominio → no_determinado, nunca se trata como 'si'/'no'", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_interna: "tal_vez" as unknown as R01Input["cavidad_basal_interna"],
    });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/código no reconocido/);
  });

  it("D-51: pudrición = Sí con externa = No e interna = No es una combinación inválida → no_determinado, sin inventar un valor", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "no" });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/D-51/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});

describe("Puntaje total P_RC — tramos de MATRICES_CALCULO", () => {
  it("puntaje 1 → improbable (límite superior del tramo 0–1)", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 1, Cc_longitud_abertura_cavidad_cm: 1, C_circunferencia_basal_cm: 10, // cavidad: leve (1)
    });
    expect(r.puntaje).toBe(1);
    expect(r.probabilidadFalla).toBe("improbable");
  });
  it("puntaje 2 → posible (límite inferior del tramo 2–4)", () => {
    const r = evaluarR01({
      ...base(),
      levantamiento_del_plato_radicular: true, angulo_inclinacion: 10, // estabilidad: leve (1)
      raices_expuestas: true, necrosis_radicular: false, raices_cortadas: false, // raíces: leve (1)
    });
    expect(r.puntaje).toBe(2);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 4 → posible (límite superior del tramo 2–4)", () => {
    const r = evaluarR01({
      ...base(),
      levantamiento_del_plato_radicular: true, angulo_inclinacion: 20, // estabilidad: moderada (2)
      raices_expuestas: true, necrosis_radicular: true, raices_cortadas: false, // raíces: moderada (2)
    });
    expect(r.puntaje).toBe(4);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("puntaje 5 → probable", () => {
    const r = evaluarR01({
      ...base(),
      levantamiento_del_plato_radicular: true, angulo_inclinacion: 60, // estabilidad: severa (3)
      raices_expuestas: true, necrosis_radicular: true, raices_cortadas: false, // raíces: moderada (2)
    });
    expect(r.puntaje).toBe(5);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("puntaje 6 → inminente (límite inferior del tramo 6–9)", () => {
    const r = evaluarR01({
      ...base(),
      levantamiento_del_plato_radicular: true, angulo_inclinacion: 60, // estabilidad: severa (3)
      raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true, // raíces: severa (3)
    });
    expect(r.puntaje).toBe(6);
    expect(r.probabilidadFalla).toBe("inminente");
  });
  it("puntaje 9 → inminente (máximo P_RC)", () => {
    const r = evaluarR01({
      ...base(),
      levantamiento_del_plato_radicular: true, angulo_inclinacion: 60, // estabilidad: severa (3)
      raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true, // raíces: severa (3)
      cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 8, Cc_longitud_abertura_cavidad_cm: 5, C_circunferencia_basal_cm: 10, // cavidad: severa (3)
    });
    expect(r.puntaje).toBe(9);
    expect(r.probabilidadFalla).toBe("inminente");
  });
});

describe("Valores fuera del dominio Sí/No (nunca truthy/falsy por coerción)", () => {
  it.each(["Sí", "no", 1, 0])("levantamiento_del_plato_radicular = %p → no_determinado", (valor) => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.estabilidad.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("raices_expuestas = %p → no_determinado", (valor) => {
    const r = evaluarR01({ ...base(), raices_expuestas: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.raicesExpuestas.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", "no", 1, 0])("cavidad_pudricion_basal = %p → no_determinado", (valor) => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: valor as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
});

describe("Campos faltantes → no_determinado (el motor nunca rellena ni supone)", () => {
  it("levantamiento_del_plato_radicular = null → no_determinado", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.estabilidad.motivo).toMatch(/levantamiento_del_plato_radicular/);
  });
  it("angulo_inclinacion = null → no_determinado", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.estabilidad.motivo).toMatch(/angulo_inclinacion/);
  });
  it("raices_expuestas = null → no_determinado", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.raicesExpuestas.motivo).toMatch(/raices_expuestas/);
  });
  it("necrosis_radicular = null (con raices_expuestas = Sí) → no_determinado", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: null, raices_cortadas: false });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.raicesExpuestas.motivo).toMatch(/necrosis_radicular/);
  });
  it("raices_cortadas = null (con raices_expuestas = Sí) → no_determinado", () => {
    const r = evaluarR01({ ...base(), raices_expuestas: true, necrosis_radicular: false, raices_cortadas: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.raicesExpuestas.motivo).toMatch(/raices_cortadas/);
  });
  it("cavidad_pudricion_basal = null → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/cavidad_pudricion_basal/);
  });
  it("cavidad_basal_interna = null (con pudrición = Sí) → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_interna: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/cavidad_basal_interna/);
  });
  it("cavidad_basal_externa = null (con pudrición = Sí, interna = No) → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_interna: "no", cavidad_basal_externa: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/cavidad_basal_externa/);
  });
  it("D_diametro_basal_tronco_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: null, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: 3, C_circunferencia_basal_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/D sin valor/);
  });
  it("d_diametro_cavidad_basal_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: null, Cc_longitud_abertura_cavidad_cm: 3, C_circunferencia_basal_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/d sin valor/);
  });
  it("Cc_longitud_abertura_cavidad_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: null, C_circunferencia_basal_cm: 35,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/Cc sin valor/);
  });
  it("C_circunferencia_basal_cm = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no",
      D_diametro_basal_tronco_cm: 10, d_diametro_cavidad_basal_cm: 5, Cc_longitud_abertura_cavidad_cm: 3, C_circunferencia_basal_cm: null,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/C sin valor/);
  });
  it("t_pared_residual_basal_cm = null (con interna = Sí) → no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si",
      t_pared_residual_basal_cm: null, D_diametro_basal_tronco_cm: 20,
    });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/t sin valor/);
  });
});
