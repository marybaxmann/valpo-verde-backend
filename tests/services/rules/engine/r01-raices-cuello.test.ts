import { evaluarR01, R01Input } from "../../../../src/services/rules/engine/r01-raices-cuello";
import { ALERTA_MEDIR_PUDRICION } from "../../../../src/services/rules/engine/r02-tronco";

function base(): R01Input {
  return {
    levantamiento_del_plato_radicular: false,
    angulo_inclinacion: 0,
    raices_expuestas: false,
    necrosis_radicular: null,
    raices_cortadas: false,
    cavidad_pudricion_basal: false,
    cavidad_basal_externa: null,
    cavidad_basal_interna: null,
    D_diametro_basal_tronco_cm: null,
    d_diametro_cavidad_basal_cm: null,
    Cc_longitud_abertura_cavidad_cm: null,
    C_circunferencia_basal_cm: null,
    t_pared_residual_basal_cm: null,
    anillamiento: false,
    cuerpos_fructiferos_base: false,
  };
}

const evaluar = (cambios: Partial<R01Input>) => evaluarR01({ ...base(), ...cambios });

const externa = (d: number, Cc: number, C: number): Partial<R01Input> => ({
  cavidad_pudricion_basal: true,
  cavidad_basal_externa: true,
  cavidad_basal_interna: "no",
  D_diametro_basal_tronco_cm: 10,
  d_diametro_cavidad_basal_cm: d,
  Cc_longitud_abertura_cavidad_cm: Cc,
  C_circunferencia_basal_cm: C,
});
const SL_LEVE = externa(1, 1, 10);
const SL_MODERADA = externa(5, 10, 100);
const SL_SEVERA = externa(8, 50, 100);

const interna = (t: number | null): Partial<R01Input> => ({
  cavidad_pudricion_basal: true,
  cavidad_basal_externa: false,
  cavidad_basal_interna: "si",
  D_diametro_basal_tronco_cm: 10, // R = 5
  t_pared_residual_basal_cm: t,
});

describe("R01 — árbol sano", () => {
  it("sin defectos: puntaje 0, improbable", () => {
    const r = evaluar({});
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("RC-EST — Estabilidad", () => {
  it.each<[boolean, number, string, string]>([
    [true, 14.9, "leve", "RC-EST-01"],
    [true, 15, "moderada", "RC-EST-02"],
    [true, 30, "moderada", "RC-EST-02"],
    [true, 30.1, "severa", "RC-EST-03"],
    [true, 45, "severa", "RC-EST-03"],
    [true, 45.1, "severa", "RC-EST-04"],
    [false, 14.9, "despreciable", "RC-EST-05"],
    [false, 15, "leve", "RC-EST-06"],
    [false, 30, "leve", "RC-EST-06"],
    [false, 30.1, "moderada", "RC-EST-07"],
    [false, 45, "moderada", "RC-EST-07"],
    [false, 45.1, "severa", "RC-EST-08"],
  ])("plato %p, %p° → %s (%s)", (plato, angulo, severidad, regla) => {
    const i = evaluar({ levantamiento_del_plato_radicular: plato, angulo_inclinacion: angulo }).indicadores.estabilidad;
    expect(i.severidad).toBe(severidad);
    expect(i.reglaId).toBe(regla);
  });
  it.each([null, -1, 91, NaN])("ángulo = %p queda no_determinado sin plato levantado", (a) => {
    expect(evaluar({ angulo_inclinacion: a }).probabilidadFalla).toBe("no_determinado");
  });
});

describe("RC-REX — Raíces", () => {
  it.each<[Partial<R01Input>, string, number]>([
    [{ raices_expuestas: false, raices_cortadas: false }, "RC-REX-01", 0],
    [{ raices_expuestas: true, necrosis_radicular: false, raices_cortadas: false }, "RC-REX-02", 0],
    [{ raices_expuestas: true, necrosis_radicular: true, raices_cortadas: false }, "RC-REX-03", 2],
    [{ raices_expuestas: true, necrosis_radicular: false, raices_cortadas: true }, "RC-REX-04", 2],
    [{ raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true }, "RC-REX-05", 3],
  ])("caso %#", (cambios, regla, puntaje) => {
    const r = evaluar(cambios);
    expect(r.indicadores.raices.reglaId).toBe(regla);
    expect(r.puntaje).toBe(puntaje);
  });
  it("RC-04: raíces cortadas sin raíces expuestas (zanja) también puntúa", () => {
    const r = evaluar({ raices_expuestas: false, raices_cortadas: true });
    expect(r.indicadores.raices.reglaId).toBe("RC-REX-04");
    expect(r.puntaje).toBe(2);
  });
  it("raices_cortadas es obligatorio aunque no haya raíces expuestas", () => {
    expect(evaluar({ raices_cortadas: null }).probabilidadFalla).toBe("no_determinado");
  });
  it("necrosis sin valor con raíces expuestas → no_determinado", () => {
    expect(evaluar({ raices_expuestas: true, necrosis_radicular: null }).probabilidadFalla).toBe("no_determinado");
  });
});

describe("RC-CAV — Cavidad basal", () => {
  it.each([
    [2.5, "leve", "RC-CAV-06"],
    [2.1, "leve", "RC-CAV-06"], // 0,42 exacto
    [2, "moderada", "RC-CAV-11"],
    [1.5, "moderada", "RC-CAV-11"], // 0,30 exacto
    [1.49, "severa", "RC-CAV-07"],
  ])("t = %p cm → %s (%s)", (t, severidad, regla) => {
    const i = evaluar(interna(t)).indicadores.cavidadBasal;
    expect(i.severidad).toBe(severidad);
    expect(i.reglaId).toBe(regla);
  });
  it("rama SL", () => {
    expect(evaluar(SL_LEVE).indicadores.cavidadBasal.reglaId).toBe("RC-CAV-02");
    expect(evaluar(SL_MODERADA).indicadores.cavidadBasal.reglaId).toBe("RC-CAV-03");
    expect(evaluar(SL_SEVERA).indicadores.cavidadBasal.reglaId).toBe("RC-CAV-04");
  });
  it("D-R03: t mayor que R no es calculable", () => {
    expect(evaluar(interna(6)).indicadores.cavidadBasal.reglaId).toBe("RC-CAV-08");
  });
  it("RC-CAV-09: requiere evaluación instrumental → no_determinado", () => {
    const r = evaluar({ cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "requiere_evaluacion_instrumental" });
    expect(r.indicadores.cavidadBasal.reglaId).toBe("RC-CAV-09");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("RC-CAV-10: externa e interna → la más severa", () => {
    const i = evaluar({ ...SL_LEVE, cavidad_basal_interna: "si", t_pared_residual_basal_cm: 2 }).indicadores.cavidadBasal;
    expect(i.severidad).toBe("moderada");
    expect(i.reglaId).toBe("RC-CAV-10");
  });
  it("combinación inválida → no_determinado", () => {
    expect(evaluar({ cavidad_pudricion_basal: true, cavidad_basal_externa: false, cavidad_basal_interna: "no" }).probabilidadFalla).toBe("no_determinado");
  });
  it("abertura_cavidad_basal_pct = Cc/C × 100", () => {
    expect(evaluar(SL_LEVE).variablesCalculo.abertura_cavidad_basal_pct?.valor).toBeCloseTo(10, 9);
  });
});

describe("RC-ANI y RC-HON", () => {
  it("anillamiento suma 1", () => {
    const r = evaluar({ anillamiento: true });
    expect(r.indicadores.anillamiento.reglaId).toBe("RC-ANI-02");
    expect(r.puntaje).toBe(1);
  });
  it("RC-HON-02: hongos sin cavidad → suma 1 y alerta", () => {
    const r = evaluar({ cuerpos_fructiferos_base: true });
    expect(r.indicadores.hongos.reglaId).toBe("RC-HON-02");
    expect(r.indicadores.hongos.alerta).toBe(ALERTA_MEDIR_PUDRICION);
    expect(r.puntaje).toBe(1);
  });
  it("RC-HON-03: hongos con cavidad → no cuenta dos veces", () => {
    const r = evaluar({ ...SL_LEVE, cuerpos_fructiferos_base: true });
    expect(r.indicadores.hongos.reglaId).toBe("RC-HON-03");
    expect(r.puntaje).toBe(1);
  });
});

describe("Pisos", () => {
  it.each([30.1, 45, 90])("plato levantado y %p° → Inminente, sin puntaje", (a) => {
    const r = evaluar({ levantamiento_del_plato_radicular: true, angulo_inclinacion: a });
    expect(r.probabilidadFalla).toBe("inminente");
    expect(r.puntaje).toBeNull();
  });
  it.each<[string, Partial<R01Input>]>([
    ["plato levantado con 0°", { levantamiento_del_plato_radicular: true, angulo_inclinacion: 0 }],
    ["plato levantado con 30° exactos", { levantamiento_del_plato_radicular: true, angulo_inclinacion: 30 }],
    ["inclinación sobre 45°", { angulo_inclinacion: 45.1 }],
    ["15° exactos con raíces cortadas", { angulo_inclinacion: 15, raices_cortadas: true }],
    ["SL ≥ 33 %", SL_SEVERA],
    ["t/R < 0,3", interna(1)],
  ])("%s → Probable, sin puntaje", (_n, cambios) => {
    const r = evaluar(cambios);
    expect(r.probabilidadFalla).toBe("probable");
    expect(r.puntaje).toBeNull();
  });
  it("45° exactos sin plato ni cortes no activan piso", () => {
    const r = evaluar({ angulo_inclinacion: 45 });
    expect(r.puntaje).toBe(2);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("14,9° con raíces cortadas no activa piso", () => {
    expect(evaluar({ angulo_inclinacion: 14.9, raices_cortadas: true }).probabilidadFalla).toBe("posible");
  });
  it("un dato faltante en otro indicador no bloquea el piso", () => {
    expect(evaluar({ levantamiento_del_plato_radicular: true, angulo_inclinacion: 40, anillamiento: null }).probabilidadFalla).toBe("inminente");
    expect(evaluar({ ...SL_SEVERA, raices_expuestas: null }).probabilidadFalla).toBe("probable");
  });
  it("plato levantado sin ángulo medido → mínimo Probable", () => {
    expect(evaluar({ levantamiento_del_plato_radicular: true, angulo_inclinacion: null }).probabilidadFalla).toBe("probable");
  });
  it("ángulo fuera de rango no activa pisos", () => {
    expect(evaluar({ angulo_inclinacion: 200 }).probabilidadFalla).toBe("no_determinado");
  });
  it("cavidad externa Severa fija el piso aunque la interna requiera instrumento", () => {
    expect(evaluar({ ...SL_SEVERA, cavidad_basal_interna: "requiere_evaluacion_instrumental" }).probabilidadFalla).toBe("probable");
  });
});

describe("Puntaje total P_RC — tramos 0 / 1–3 / 4 o más", () => {
  it("3 → posible (límite superior)", () => {
    const r = evaluar({ raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true });
    expect(r.puntaje).toBe(3);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("4 → probable (límite inferior)", () => {
    const r = evaluar({ raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true, anillamiento: true });
    expect(r.puntaje).toBe(4);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("la suma nunca da Inminente", () => {
    const r = evaluar({ ...SL_MODERADA, angulo_inclinacion: 14, raices_expuestas: true, necrosis_radicular: true, raices_cortadas: true, anillamiento: true });
    expect(r.puntaje).toBe(6);
    expect(r.probabilidadFalla).toBe("probable");
  });
});

describe("Datos faltantes o fuera de dominio → no_determinado", () => {
  it.each(["levantamiento_del_plato_radicular", "raices_expuestas", "cavidad_pudricion_basal", "anillamiento", "cuerpos_fructiferos_base"] as const)(
    "%s = null",
    (campo) => {
      const r = evaluar({ [campo]: null });
      expect(r.probabilidadFalla).toBe("no_determinado");
      expect(r.motivo).toMatch(new RegExp(campo));
    },
  );
  it.each(["Sí", 1])("levantamiento = %p no activa el piso", (v) => {
    const r = evaluar({ levantamiento_del_plato_radicular: v as unknown as boolean, angulo_inclinacion: 40 });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it.each(["Sí", 1])("raices_cortadas = %p no activa el piso", (v) => {
    const r = evaluar({ raices_cortadas: v as unknown as boolean, angulo_inclinacion: 20 });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});
