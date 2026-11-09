import { ALERTA_MEDIR_PUDRICION, evaluarExudaciones, evaluarR02, R02Input } from "../../../../src/services/rules/engine/r02-tronco";

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
    longitud_max_grieta_cm: null,
    dap_cm: 30,
    troncos_codominantes: false,
    grieta_union_codominante: null,
    corteza_incluida: null,
    adelgazamiento_insuficiente_tronco: false,
    cuerpos_fructiferos_tronco: false,
  };
}

const externa = (d: number, Cc: number, C: number): Partial<R02Input> => ({
  presenta_cavidad_pudricion_tronco: true,
  cavidad_externa_tronco: true,
  cavidad_interna_tronco: "no",
  D_diametro_tronco_cm: 10,
  d_diametro_cavidad_tronco_cm: d,
  Cc_longitud_abertura_tronco_cm: Cc,
  C_circunferencia_tronco_cm: C,
});
const SL_LEVE = externa(1, 1, 10);
const SL_MODERADA = externa(5, 10, 100); // 21,25 %
const SL_SEVERA = externa(8, 50, 100);

const interna = (t: number | null): Partial<R02Input> => ({
  presenta_cavidad_pudricion_tronco: true,
  cavidad_externa_tronco: false,
  cavidad_interna_tronco: "si",
  D_diametro_tronco_cm: 10, // R = 5
  t_pared_residual_tronco_cm: t,
});

const grietaLongitudinal = (longitud: number | null): Partial<R02Input> => ({
  presenta_fisura_grieta_tronco: true,
  afectacion_fisura_grieta: "penetra_en_madera",
  direccion_grieta: "longitudinal",
  longitud_max_grieta_cm: longitud,
});
const GRIETA_TRANSVERSAL: Partial<R02Input> = {
  presenta_fisura_grieta_tronco: true,
  afectacion_fisura_grieta: "penetra_en_madera",
  direccion_grieta: "transversal",
};
const UNION_CON_GRIETA: Partial<R02Input> = { troncos_codominantes: true, grieta_union_codominante: true };

const evaluar = (cambios: Partial<R02Input>) => evaluarR02({ ...base(), ...cambios });

describe("R02 — árbol sano", () => {
  it("sin defectos: puntaje 0, improbable", () => {
    const r = evaluar({});
    expect(r.puntaje).toBe(0);
    expect(r.probabilidadFalla).toBe("improbable");
  });
});

describe("TR-CAV — Cavidad", () => {
  it("TR-CAV-01: sin cavidad → despreciable", () => {
    expect(evaluar({}).indicadores.cavidadTronco.reglaId).toBe("TR-CAV-01");
  });
  it.each([
    [SL_LEVE, "leve", "TR-CAV-02"],
    [externa(5, 3, 35), "moderada", "TR-CAV-03"], // SL = 20 exacto
    [SL_MODERADA, "moderada", "TR-CAV-03"],
    [externa(1, 329, 999), "severa", "TR-CAV-04"], // SL = 33 exacto
  ])("rama SL %#", (cambios, severidad, regla) => {
    const i = evaluar(cambios).indicadores.cavidadTronco;
    expect(i.severidad).toBe(severidad);
    expect(i.reglaId).toBe(regla);
  });
  it.each([
    [2.5, "leve", "TR-CAV-06"], // 0,50
    [2.1, "leve", "TR-CAV-06"], // 0,42 exacto
    [2, "moderada", "TR-CAV-11"], // 0,40
    [1.5, "moderada", "TR-CAV-11"], // 0,30 exacto: la fuente pone Severa solo bajo 0,3
    [1.49, "severa", "TR-CAV-07"],
  ])("t = %p cm → %s (%s)", (t, severidad, regla) => {
    const i = evaluar(interna(t)).indicadores.cavidadTronco;
    expect(i.severidad).toBe(severidad);
    expect(i.reglaId).toBe(regla);
  });
  it("TR-CAV-08: t sin medir → no_determinado", () => {
    expect(evaluar(interna(null)).indicadores.cavidadTronco.reglaId).toBe("TR-CAV-08");
  });
  it("D-T11: t mayor que R no es calculable", () => {
    const r = evaluar(interna(6));
    expect(r.indicadores.cavidadTronco.reglaId).toBe("TR-CAV-08");
    expect(r.variablesCalculo.t_R_tronco?.valor).toBeNull();
  });
  it("TR-CAV-05: SL no calculable → no_determinado", () => {
    expect(evaluar({ ...SL_LEVE, C_circunferencia_tronco_cm: null }).indicadores.cavidadTronco.reglaId).toBe("TR-CAV-05");
  });
  it("TR-CAV-09: requiere evaluación instrumental → no_determinado", () => {
    const r = evaluar({ presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "requiere_evaluacion_instrumental" });
    expect(r.indicadores.cavidadTronco.reglaId).toBe("TR-CAV-09");
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("TR-CAV-10: externa e interna → la más severa", () => {
    const i = evaluar({ ...SL_LEVE, cavidad_interna_tronco: "si", t_pared_residual_tronco_cm: 2 }).indicadores.cavidadTronco;
    expect(i.severidad).toBe("moderada");
    expect(i.reglaId).toBe("TR-CAV-10");
  });
  it("combinación inválida externa = No e interna = No → no_determinado", () => {
    expect(evaluar({ presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: false, cavidad_interna_tronco: "no" }).probabilidadFalla).toBe("no_determinado");
  });
  it("abertura_cavidad_tronco_pct = Cc/C × 100", () => {
    expect(evaluar(SL_LEVE).variablesCalculo.abertura_cavidad_tronco_pct?.valor).toBeCloseTo(10, 9);
  });
});

describe("TR-GRI — Grietas", () => {
  it("TR-GRI-02: solo corteza → 0 puntos", () => {
    const r = evaluar({ presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "solo_corteza" });
    expect(r.indicadores.fisurasGrietas.reglaId).toBe("TR-GRI-02");
    expect(r.puntaje).toBe(0);
  });
  it("TR-GRI-03: longitudinal justo bajo 1/3 del DAP → Moderada, suma 2", () => {
    const r = evaluar(grietaLongitudinal(9.99));
    expect(r.indicadores.fisurasGrietas.reglaId).toBe("TR-GRI-03");
    expect(r.puntaje).toBe(2);
  });
  it("TR-GRI-05: longitud = 1/3 exacto del DAP → Severa", () => {
    expect(evaluar(grietaLongitudinal(10)).indicadores.fisurasGrietas.reglaId).toBe("TR-GRI-05");
  });
  it("TR-GRI-06: sin longitud o sin DAP → no_determinado", () => {
    expect(evaluar(grietaLongitudinal(null)).indicadores.fisurasGrietas.reglaId).toBe("TR-GRI-06");
    expect(evaluar({ ...grietaLongitudinal(5), dap_cm: null }).indicadores.fisurasGrietas.reglaId).toBe("TR-GRI-06");
  });
  it.each([0, -1, NaN])("longitud = %p no es válida", (l) => {
    expect(evaluar(grietaLongitudinal(l)).probabilidadFalla).toBe("no_determinado");
  });
});

describe("Puntajes de corteza, herida, codominancia, adelgazamiento", () => {
  it.each<[Partial<R02Input>, number]>([
    [{ corteza_muerta_ausente: true }, 1],
    [{ presenta_heridas_tronco: true, condicion_heridas_tronco: "cerrada" }, 0],
    [{ presenta_heridas_tronco: true, condicion_heridas_tronco: "en_proceso_de_cierre" }, 1],
    [{ presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta" }, 2],
    [{ troncos_codominantes: true, grieta_union_codominante: false, corteza_incluida: false }, 1],
    [{ troncos_codominantes: true, grieta_union_codominante: false, corteza_incluida: true }, 2],
    [{ adelgazamiento_insuficiente_tronco: true }, 1],
  ])("caso %#", (cambios, puntaje) => {
    expect(evaluar(cambios).puntaje).toBe(puntaje);
  });
});

describe("TR-HON — Hongos", () => {
  it("TR-HON-02: hongos sin cavidad → suma 1 y alerta", () => {
    const r = evaluar({ cuerpos_fructiferos_tronco: true });
    expect(r.indicadores.hongos.reglaId).toBe("TR-HON-02");
    expect(r.indicadores.hongos.alerta).toBe(ALERTA_MEDIR_PUDRICION);
    expect(r.puntaje).toBe(1);
  });
  it("TR-HON-03: hongos con cavidad → no cuenta dos veces la pudrición", () => {
    const r = evaluar({ ...SL_LEVE, cuerpos_fructiferos_tronco: true });
    expect(r.indicadores.hongos.reglaId).toBe("TR-HON-03");
    expect(r.indicadores.hongos.alerta).toBeUndefined();
    expect(r.puntaje).toBe(1); // solo la cavidad
  });
});

describe("Exudaciones — contexto sin puntaje", () => {
  it("no suma ni bloquea", () => {
    expect(evaluar({ presenta_exudaciones: true }).puntaje).toBe(0);
    expect(evaluar({ presenta_exudaciones: null }).probabilidadFalla).toBe("improbable");
  });
  it("TR-EXU-01/02", () => {
    expect(evaluarExudaciones({ presenta_exudaciones: false }).reglaId).toBe("TR-EXU-01");
    expect(evaluarExudaciones({ presenta_exudaciones: true }).reglaId).toBe("TR-EXU-02");
    expect(evaluarExudaciones({ presenta_exudaciones: null }).noDeterminado).toBe(true);
  });
});

describe("Pisos", () => {
  it.each<[string, Partial<R02Input>]>([
    ["grieta en la unión", UNION_CON_GRIETA],
    ["grieta transversal", GRIETA_TRANSVERSAL],
  ])("%s → Inminente, sin puntaje", (_n, cambios) => {
    const r = evaluar(cambios);
    expect(r.probabilidadFalla).toBe("inminente");
    expect(r.puntaje).toBeNull();
  });
  it.each<[string, Partial<R02Input>]>([
    ["SL ≥ 33 %", SL_SEVERA],
    ["t/R < 0,3", interna(1)],
    ["grieta longitudinal ≥ 1/3 del DAP", grietaLongitudinal(10)],
  ])("%s → Probable, sin puntaje", (_n, cambios) => {
    const r = evaluar(cambios);
    expect(r.probabilidadFalla).toBe("probable");
    expect(r.puntaje).toBeNull();
  });
  it("Inminente prevalece sobre Probable", () => {
    expect(evaluar({ ...SL_SEVERA, ...UNION_CON_GRIETA }).probabilidadFalla).toBe("inminente");
  });
  it("un dato faltante en otro indicador no bloquea el piso", () => {
    expect(evaluar({ ...UNION_CON_GRIETA, presenta_heridas_tronco: null }).probabilidadFalla).toBe("inminente");
    expect(evaluar({ ...SL_SEVERA, corteza_muerta_ausente: null }).probabilidadFalla).toBe("probable");
  });
  it("cavidad externa Severa fija el piso aunque la interna requiera instrumento", () => {
    expect(evaluar({ ...SL_SEVERA, cavidad_interna_tronco: "requiere_evaluacion_instrumental" }).probabilidadFalla).toBe("probable");
  });
  it("una vía Severa fija el piso aunque la otra no se determine", () => {
    const r = evaluar({ ...SL_SEVERA, cavidad_interna_tronco: "si", t_pared_residual_tronco_cm: null });
    expect(r.indicadores.cavidadTronco.reglaId).toBe("TR-CAV-10");
    expect(r.probabilidadFalla).toBe("probable");
  });
});

describe("Puntaje total P_T — tramos 0 / 1–3 / 4 o más", () => {
  it("3 → posible (límite superior)", () => {
    const r = evaluar({ corteza_muerta_ausente: true, presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta" });
    expect(r.puntaje).toBe(3);
    expect(r.probabilidadFalla).toBe("posible");
  });
  it("4 → probable (límite inferior)", () => {
    const r = evaluar({ ...SL_MODERADA, presenta_heridas_tronco: true, condicion_heridas_tronco: "abierta" });
    expect(r.puntaje).toBe(4);
    expect(r.probabilidadFalla).toBe("probable");
  });
  it("la suma nunca da Inminente", () => {
    const r = evaluar({
      ...SL_MODERADA,
      ...grietaLongitudinal(5),
      presenta_heridas_tronco: true,
      condicion_heridas_tronco: "abierta",
      troncos_codominantes: true,
      grieta_union_codominante: false,
      corteza_incluida: true,
      corteza_muerta_ausente: true,
      adelgazamiento_insuficiente_tronco: true,
    });
    expect(r.puntaje).toBe(10);
    expect(r.probabilidadFalla).toBe("probable");
  });
});

describe("Datos faltantes o fuera de dominio → no_determinado", () => {
  it.each([
    "presenta_cavidad_pudricion_tronco",
    "presenta_heridas_tronco",
    "corteza_muerta_ausente",
    "presenta_fisura_grieta_tronco",
    "troncos_codominantes",
    "adelgazamiento_insuficiente_tronco",
    "cuerpos_fructiferos_tronco",
  ] as const)("%s = null", (campo) => {
    const r = evaluar({ [campo]: null });
    expect(r.probabilidadFalla).toBe("no_determinado");
    expect(r.motivo).toMatch(new RegExp(campo));
  });
  it.each(["Sí", "no", 1, 0])("corteza_muerta_ausente = %p no se interpreta por coerción", (v) => {
    expect(evaluar({ corteza_muerta_ausente: v as unknown as boolean }).indicadores.cortezaMuertaAusente.motivo).toMatch(/fuera del dominio Sí\/No/);
  });
  it.each(["Sí", 1])("grieta_union_codominante = %p no activa el piso", (v) => {
    const r = evaluar({ troncos_codominantes: true, grieta_union_codominante: v as unknown as boolean });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
  it("código no reconocido en direccion_grieta no activa el piso", () => {
    const r = evaluar({ ...GRIETA_TRANSVERSAL, direccion_grieta: "diagonal" as never });
    expect(r.probabilidadFalla).toBe("no_determinado");
  });
});
