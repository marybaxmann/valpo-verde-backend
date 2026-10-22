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
    sl_basal_pct: null,
    t_r_basal: null,
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
  it("RC-EST-02: levantamiento = Sí, 15° ≤ ángulo ≤ 30° → moderada", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 20 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-03: levantamiento = Sí, 30° < ángulo ≤ 45° → moderada", () => {
    const r = evaluarR01({ ...base(), levantamiento_del_plato_radicular: true, angulo_inclinacion: 40 });
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
  it("RC-EST-06: levantamiento = No, 15° ≤ ángulo ≤ 30° → leve", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 25 });
    expect(r.indicadores.estabilidad.severidad).toBe("leve");
  });
  it("RC-EST-07: levantamiento = No, 30° < ángulo ≤ 45° → moderada", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 45 });
    expect(r.indicadores.estabilidad.severidad).toBe("moderada");
  });
  it("RC-EST-08: levantamiento = No, ángulo > 45° → severa", () => {
    const r = evaluarR01({ ...base(), angulo_inclinacion: 46 });
    expect(r.indicadores.estabilidad.severidad).toBe("severa");
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
  it("RC-CAV-02: externa = Sí, SL < 20% → leve", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: 10 });
    expect(r.indicadores.cavidadBasal.severidad).toBe("leve");
  });
  it("RC-CAV-03: externa = Sí, 20% ≤ SL < 33% → moderada", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: 25 });
    expect(r.indicadores.cavidadBasal.severidad).toBe("moderada");
  });
  it("RC-CAV-04: externa = Sí, SL ≥ 33% → severa", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: 40 });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });
  it("RC-CAV-05: externa = Sí, SL no calculable → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: null });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-05/);
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("RC-CAV-06: interna = Sí, t/R > 0,3 → moderada", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si", t_r_basal: 0.5 });
    expect(r.indicadores.cavidadBasal.severidad).toBe("moderada");
  });
  it("RC-CAV-07: interna = Sí, t/R ≤ 0,3 → severa", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si", t_r_basal: 0.2 });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });
  it("RC-CAV-08: interna = Sí, t/R no medido → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si", t_r_basal: null });
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
      cavidad_basal_externa: true, sl_basal_pct: 10, // leve
      cavidad_basal_interna: "si", t_r_basal: 0.2, // severa
    });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });
  it("RC-CAV-10: externa y interna = Sí, SL más severo que t/R → prevalece SL", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_externa: true, sl_basal_pct: 40, // severa
      cavidad_basal_interna: "si", t_r_basal: 0.5, // moderada
    });
    expect(r.indicadores.cavidadBasal.severidad).toBe("severa");
  });
  it("RC-CAV-10: si alguna de las dos vías es no_determinado, el resultado combinado es no_determinado", () => {
    const r = evaluarR01({
      ...base(), cavidad_pudricion_basal: true,
      cavidad_basal_externa: true, sl_basal_pct: null, // no_determinado
      cavidad_basal_interna: "si", t_r_basal: 0.2, // severa
    });
    expect(r.indicadores.cavidadBasal.noDeterminado).toBe(true);
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/RC-CAV-10/);
    expect(r.probabilidadFalla).toBe("no_determinado");
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
      ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: 10, // cavidad: leve (1)
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
      cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: 40, // cavidad: severa (3)
    });
    expect(r.puntaje).toBe(9);
    expect(r.probabilidadFalla).toBe("inminente");
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
  it("sl_basal_pct = null (con externa = Sí) → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: true, cavidad_basal_interna: "no", sl_basal_pct: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/sl_basal_pct/);
  });
  it("t_r_basal = null (con interna = Sí) → no_determinado", () => {
    const r = evaluarR01({ ...base(), cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "si", t_r_basal: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.indicadores.cavidadBasal.motivo).toMatch(/t_r_basal/);
  });
});
