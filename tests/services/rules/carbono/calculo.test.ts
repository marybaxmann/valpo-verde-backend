/**
 * Carbono aéreo leñoso (CC-069 v1): funciones puras con árboles FICTICIOS
 * (nada se lee ni se escribe en Supabase). Valores de referencia calculados
 * a mano con las fórmulas de Pillsbury et al. 1998 (coeficientes métricos
 * de la UTD), densidad de TS9, 0,47 y 44/12.
 */
import { agregarCarbono, ArbolCarbono, calcularCarbonoArbol, CATEGORIA_DE_MOTIVO } from "../../../../src/services/rules/carbono/calculo";
import { FACTOR_CO2_POR_C, FRACCION_CARBONO, MODELOS_VOLUMEN } from "../../../../src/services/rules/carbono/modelos";

const arbol = (id: string, p: Partial<ArbolCarbono> = {}): ArbolCarbono => ({
  id,
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: "Jacaranda mimosifolia",
  tipo_hoja: null,
  multifustal: false,
  dap_cm: 30,
  altura_total_m: 10,
  ...p,
});
const LIQ = "Liquidambar styraciflua";

describe("catálogo de modelos (Pillsbury 1998 / UTD)", () => {
  it("cuatro modelos, coeficientes métricos de la UTD y rangos de la tabla 8 convertidos", () => {
    const porId = Object.fromEntries(MODELOS_VOLUMEN.map((m) => [m.id, m]));
    expect(Object.keys(porId).sort()).toEqual(["UTD-TS7-JAME-D", "UTD-TS7-JAME-DH", "UTD-TS7-LIST-D", "UTD-TS7-LIST-DH"]);
    expect(porId["UTD-TS7-JAME-DH"]).toEqual(expect.objectContaining({ a: 0.0000801, b: 2.18578, c: 0.548045, n_muestra: 49 }));
    expect(porId["UTD-TS7-LIST-D"]).toEqual(expect.objectContaining({ a: 0.0000799, b: 2.560469, c: 0, n_muestra: 50 }));
    expect(porId["UTD-TS7-JAME-D"].dap_min_cm).toBeCloseTo(17.272, 10);
    expect(porId["UTD-TS7-JAME-D"].dap_max_cm).toBeCloseTo(59.69, 10);
    expect(porId["UTD-TS7-JAME-DH"].altura_min_m).toBeCloseTo(6.858, 10);
    expect(porId["UTD-TS7-JAME-DH"].altura_max_m).toBeCloseTo(17.526, 10);
    expect(porId["UTD-TS7-LIST-D"].dap_min_cm).toBeCloseTo(13.97, 10);
    expect(porId["UTD-TS7-LIST-D"].dap_max_cm).toBeCloseTo(54.356, 10);
    expect(porId["UTD-TS7-LIST-DH"].altura_min_m).toBeCloseTo(7.3152, 10);
    expect(porId["UTD-TS7-LIST-DH"].altura_max_m).toBeCloseTo(19.9644, 10);
    expect(MODELOS_VOLUMEN.every((m) => m.componente === "aerea_lenosa" && m.densidad.unidad === "kg/m3" && !m.admite_multifustal && !m.apto_palmeras)).toBe(true);
    expect(FRACCION_CARBONO.valor).toBe(0.47);
    expect(FACTOR_CO2_POR_C).toBeCloseTo(3.6666667, 7);
  });
});

describe("calcularCarbonoArbol — ejemplos E1-E8 (especificación)", () => {
  it.each([
    ["E1", "Jacaranda mimosifolia", 30, 10, "UTD-TS7-JAME-DH", 0.479005, 234.7122, 110.3147, 404.4874],
    ["E2", "Jacaranda mimosifolia", 30, null, "UTD-TS7-JAME-D", 0.472776, 231.6605, 108.8804, 399.2282],
    ["E3", "Jacaranda mimosifolia", 17.272, 6.858, "UTD-TS7-JAME-DH", 0.116537, 57.1033, 26.8386, 98.408],
    ["E4", "Jacaranda mimosifolia", 59.69, 17.526, "UTD-TS7-JAME-DH", 2.930602, 1435.9949, 674.9176, 2474.6979],
    ["E5", LIQ, 25, 9, "UTD-TS7-LIST-DH", 0.271703, 124.9835, 58.7423, 215.3883],
    ["E6", LIQ, 25, null, "UTD-TS7-LIST-D", 0.303339, 139.5361, 65.582, 240.4673],
    ["E7", LIQ, 13.97, 7.3152, "UTD-TS7-LIST-DH", 0.064769, 29.7936, 14.003, 51.3444],
    ["E8", LIQ, 54.356, 19.9644, "UTD-TS7-LIST-DH", 2.286018, 1051.5685, 494.2372, 1812.203],
  ] as const)("%s", (_e, especie, dap, h, modelo, v, b, c, co2e) => {
    const r = calcularCarbonoArbol(arbol("x", { especie_cientifica: especie, dap_cm: dap, altura_total_m: h }));
    expect(r.motivo).toBeNull();
    expect(r.valor!.modelo.id).toBe(modelo);
    expect(r.valor!.modelo.componente).toBe("aerea_lenosa");
    expect(r.valor!.volumen_m3).toBeCloseTo(v, 6);
    expect(r.valor!.biomasa_aerea_lenosa_kg).toBeCloseTo(b, 4);
    expect(r.valor!.carbono_kg).toBeCloseTo(c, 4);
    expect(r.valor!.co2e_kg).toBeCloseTo(co2e, 4);
  });
});

describe("calcularCarbonoArbol — motivos de null (nunca extrapola ni rellena)", () => {
  it.each([
    ["DAP bajo el rango", { dap_cm: 17.27 }, "fuera_de_rango"],
    ["DAP sobre el rango", { dap_cm: 59.7 }, "fuera_de_rango"],
    ["DAP fuera de rango sin altura (variante solo DAP)", { dap_cm: 16.9, altura_total_m: null }, "fuera_de_rango"],
    ["altura bajo el rango", { altura_total_m: 6.85 }, "fuera_de_rango_altura"],
    ["altura sobre el rango", { altura_total_m: 17.53 }, "fuera_de_rango_altura"],
    ["multifustal", { multifustal: true }, "multifustal_no_admitido"],
    ["multifustal desconocido", { multifustal: null }, "configuracion_fuste_no_determinada"],
    ["sin DAP", { dap_cm: null }, "falta_dap"],
    ["palmera", { especie_cientifica: "Jacaranda mimosifolia", tipo_hoja: "palmera" }, "palmera_sin_modelo"],
    ["especie sin modelo (Ginkgo)", { especie_cientifica: "Ginkgo biloba" }, "sin_modelo"],
    ["solo género", { especie_cientifica: "Quercus sp." }, "sin_modelo"],
    ["sin especie", { especie_cientifica: null }, "sin_modelo"],
    ["no presente", { presente: false }, "no_presente"],
    ["sin evaluación completa válida y vigente", { evaluacion_completa_vigente: false }, "sin_evaluacion_valida"],
  ] as const)("%s → %s", (_d, cambios, motivo) => {
    const r = calcularCarbonoArbol(arbol("x", cambios as Partial<ArbolCarbono>));
    expect(r.valor).toBeNull();
    expect(r.motivo).toBe(motivo);
    expect(r.categoria).toBe(CATEGORIA_DE_MOTIVO[motivo]);
    expect(typeof r.detalle).toBe("string");
  });

  it("categorías: universo, restricción del modelo, dato faltante y error de cálculo no se mezclan", () => {
    expect(CATEGORIA_DE_MOTIVO).toEqual({
      no_presente: "fuera_del_universo",
      sin_evaluacion_valida: "fuera_del_universo",
      sin_modelo: "restriccion_modelo",
      palmera_sin_modelo: "restriccion_modelo",
      multifustal_no_admitido: "restriccion_modelo",
      fuera_de_rango: "restriccion_modelo",
      fuera_de_rango_altura: "restriccion_modelo",
      falta_dap: "dato_faltante_o_inconsistente",
      configuracion_fuste_no_determinada: "dato_faltante_o_inconsistente",
      resultado_invalido: "error_calculo",
    });
  });

  it("un árbol sin evaluación válida queda fuera del universo aunque tenga DAP y modelo", () => {
    const r = calcularCarbonoArbol(arbol("x", { evaluacion_completa_vigente: false }));
    expect(r).toEqual(expect.objectContaining({ valor: null, categoria: "fuera_del_universo", motivo: "sin_evaluacion_valida" }));
  });

  it("con resultado: categoría y motivo null, y modelo trazable", () => {
    const r = calcularCarbonoArbol(arbol("x"));
    expect(r.categoria).toBeNull();
    expect(r.valor!.modelo).toEqual(expect.objectContaining({ id: "UTD-TS7-JAME-DH", version: 1, variante: "dap_altura", componente: "aerea_lenosa" }));
  });

  it("altura fuera de rango no cae a la variante solo DAP", () => {
    const r = calcularCarbonoArbol(arbol("x", { altura_total_m: 30 }));
    expect(r.motivo).toBe("fuera_de_rango_altura");
  });

  it("el DAP a 1,30 m no se transforma: el volumen usa el valor tal cual", () => {
    const r = calcularCarbonoArbol(arbol("x", { dap_cm: 30, altura_total_m: 10 }));
    expect(r.valor!.entradas.dap_cm).toBe(30);
  });

  it("una variedad o cultivar usa el modelo de su especie (decisión 10)", () => {
    const r = calcularCarbonoArbol(arbol("x", { especie_cientifica: "Jacaranda mimosifolia 'Alba'" }));
    expect(r.valor!.modelo.id).toBe("UTD-TS7-JAME-DH");
  });
});

describe("agregarCarbono — árboles ficticios de QA Fase 7 (fixtures; no se tocan en Supabase)", () => {
  const arboles: ArbolCarbono[] = [
    arbol("QA-F-01"), // E1
    arbol("QA-F-02", { altura_total_m: null }), // E2
    arbol("QA-F-03", { dap_cm: 17.272, altura_total_m: 6.858 }), // E3
    arbol("QA-F-04", { dap_cm: 16.9 }), // fuera_de_rango
    arbol("QA-F-05", { altura_total_m: 18 }), // fuera_de_rango_altura
    arbol("QA-F-06", { especie_cientifica: LIQ, dap_cm: 25, altura_total_m: 9 }), // E5
    arbol("QA-F-07", { especie_cientifica: LIQ, dap_cm: 25, altura_total_m: null }), // E6
    arbol("QA-F-08", { multifustal: true }),
    arbol("QA-F-09", { especie_cientifica: "Phoenix canariensis", tipo_hoja: "palmera" }), // sin modelo para la especie
    arbol("QA-F-10", { especie_cientifica: "Ginkgo biloba" }),
    arbol("QA-F-11", { especie_cientifica: "Quercus sp." }),
    arbol("QA-F-12", { dap_cm: null }),
    arbol("QA-F-13", { especie_cientifica: "Jacaranda mimosifolia var. alba" }), // como E1
    arbol("QA-F-14", { multifustal: null }),
    arbol("QA-F-15", { presente: false }), // talado: no se considera
    arbol("QA-F-16", { evaluacion_completa_vigente: false }), // registrado sin evaluar: fuera del universo
  ];

  it("cobertura, motivos y totales en toneladas solo con resultados válidos", () => {
    const r = agregarCarbono(arboles);
    expect(r.indicador).toBe("estimacion_carbono_aereo_lenoso");
    expect(r.cobertura.presentes).toBe(15);
    expect(r.cobertura.universo_calculo).toBe(14);
    expect(r.cobertura.con_resultado).toBe(6);
    expect(r.cobertura.motivos).toEqual({
      no_presente: 0,
      sin_evaluacion_valida: 1,
      sin_modelo: 3,
      palmera_sin_modelo: 0,
      multifustal_no_admitido: 1,
      fuera_de_rango: 1,
      fuera_de_rango_altura: 1,
      falta_dap: 1,
      configuracion_fuste_no_determinada: 1,
      resultado_invalido: 0,
    });
    expect(r.cobertura.por_categoria).toEqual({ fuera_del_universo: 1, restriccion_modelo: 6, dato_faltante_o_inconsistente: 2, error_calculo: 0 });
    const carbonoKg = 110.3147 + 108.8804 + 26.8386 + 58.7423 + 65.582 + 110.3147;
    expect(r.total.carbono_t).toBeCloseTo(carbonoKg / 1000, 6);
    expect(r.total.co2e_t).toBeCloseTo((carbonoKg * 44) / 12 / 1000, 5);
    expect(r.metodo).toEqual(expect.objectContaining({ fraccion_carbono: 0.47, incluye_raices: false, incluye_follaje: false, factor_urbano: null }));
    expect(r.limitaciones.length).toBeGreaterThan(0);
  });

  it("sin ningún resultado, totales null (no 0)", () => {
    const r = agregarCarbono([arbol("a", { dap_cm: null }), arbol("b", { presente: false }), arbol("c", { evaluacion_completa_vigente: false })]);
    expect(r.cobertura).toEqual(expect.objectContaining({ presentes: 2, universo_calculo: 1, con_resultado: 0 }));
    expect(r.total).toEqual({ biomasa_aerea_lenosa_t: null, carbono_t: null, co2e_t: null });
  });
});
