/**
 * Secuestro anual (decisiones A a C, 2026-11-20): funciones puras con
 * árboles FICTICIOS. Los valores esperados se calculan aquí con los
 * coeficientes del catálogo y la fórmula del volumen, sin usar
 * calcularCarbonoArbol, para comprobar el resultado de forma independiente.
 */
import {
  agregarSecuestro,
  ArbolSecuestro,
  calcularSecuestroArbol,
  CATEGORIA_APROBADA_POR_ESPECIE,
  CRECIMIENTO_ITREE,
  factorCle,
} from "../../../../src/services/rules/carbono/secuestro";
import { MODELOS_VOLUMEN } from "../../../../src/services/rules/carbono/modelos";

const arbol = (id: string, p: Partial<ArbolSecuestro> = {}): ArbolSecuestro => ({
  id,
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: "Jacaranda mimosifolia",
  tipo_hoja: null,
  multifustal: false,
  dap_cm: 30,
  altura_total_m: 10,
  cle: 3,
  muerte_regresiva_pct: 0,
  ...p,
});

const modelo = (id: string) => MODELOS_VOLUMEN.find((m) => m.id === id)!;
/** Carbono (kg) con la ecuación del catálogo, independiente de calcularCarbonoArbol. */
const carbonoDe = (id: string, d: number, h: number) => {
  const m = modelo(id);
  const v = m.a * d ** m.b * (m.variante === "dap_altura" ? h ** m.c : 1);
  return v * m.densidad.valor * 0.47;
};
const co2Anual = (id: string, d: number, h: number, delta: number) => (carbonoDe(id, d + delta, h) - carbonoDe(id, d, h)) * (44 / 12);

describe("parámetros publicados (Nowak 2024, pp. 44-45)", () => {
  it("tres categorías y tres factores de CLE, sin ajuste por heladas", () => {
    expect(CRECIMIENTO_ITREE.categorias.map((c) => [c.codigo, c.tasa_cm_anio])).toEqual([
      ["lento", 0.58],
      ["moderado", 0.84],
      ["rapido", 1.09],
    ]);
    expect([0, 1, 2, 3, 4, 5].map(factorCle)).toEqual([0.44, 0.44, 0.56, 0.56, 1, 1]);
    expect(factorCle(6)).toBeNull();
    expect(factorCle(2.5)).toBeNull();
    expect(CRECIMIENTO_ITREE.ajuste_temporada).toMatch(/no aplicado/);
  });

  it("ninguna especie tiene categoría aprobada: no hay estimaciones fundamentadas", () => {
    expect(Object.keys(CATEGORIA_APROBADA_POR_ESPECIE)).toHaveLength(0);
  });
});

describe("calcularSecuestroArbol", () => {
  it("con modelo aplicable y sin categoría aprobada: simulación con las tres categorías y su rango", () => {
    const r = calcularSecuestroArbol(arbol("a"));
    if (r.tipo !== "simulacion_exploratoria") throw new Error(r.tipo);
    expect(r.modelo.id).toBe("UTD-TS7-JAME-DH");
    expect(r.factores).toEqual({ factor_cle: 0.56, factor_condicion: 1 });
    const esperado = CRECIMIENTO_ITREE.categorias.map((c) => co2Anual("UTD-TS7-JAME-DH", 30, 10, c.tasa_cm_anio * 0.56));
    expect(r.por_categoria.map((p) => p.co2_kg_anio)).toEqual(esperado.map((e) => expect.closeTo(e, 8)));
    expect(r.por_categoria[1].delta_dap_cm).toBeCloseTo(0.4704, 10);
    expect(r.por_categoria[1].dap_proyectado_cm).toBeCloseTo(30.4704, 10);
    expect(r.rango.co2_kg_anio_min).toBeCloseTo(esperado[0], 8);
    expect(r.rango.co2_kg_anio_max).toBeCloseTo(esperado[2], 8);
    expect(r.unidad).toBe("kg CO₂/árbol/año");
    expect(r.supuestos.join(" ")).toMatch(/Simulación basada en supuestos/);
    expect(r.supuestos.join(" ")).toMatch(/Altura constante/);
  });

  it("aplica el factor CLE y la muerte regresiva: CLE 4 (× 1) y 10 % (× 0,9)", () => {
    const r = calcularSecuestroArbol(arbol("a", { cle: 4, muerte_regresiva_pct: 10 }));
    if (r.tipo !== "simulacion_exploratoria") throw new Error(r.tipo);
    expect(r.factores).toEqual({ factor_cle: 1, factor_condicion: 0.9 });
    expect(r.por_categoria[2].delta_dap_cm).toBeCloseTo(1.09 * 0.9, 10);
    expect(r.por_categoria[2].co2_kg_anio).toBeCloseTo(co2Anual("UTD-TS7-JAME-DH", 30, 10, 1.09 * 0.9), 8);
  });

  it("muerte regresiva del 100 %: crecimiento nulo, rango 0", () => {
    const r = calcularSecuestroArbol(arbol("a", { muerte_regresiva_pct: 100 }));
    if (r.tipo !== "simulacion_exploratoria") throw new Error(r.tipo);
    expect(r.rango).toEqual({ co2_kg_anio_min: 0, co2_kg_anio_max: 0 });
  });

  it("modelo solo con DAP (Acer pseudoplatanus, CC-070): la altura no interviene", () => {
    const r = calcularSecuestroArbol(arbol("a", { especie_cientifica: "Acer pseudoplatanus", dap_cm: 13.4, altura_total_m: 7.1, cle: 4 }));
    if (r.tipo !== "simulacion_exploratoria") throw new Error(r.tipo);
    expect(r.modelo.id).toBe("MCH09-T1-ACPL-D-ACPS");
    expect(r.modelo.confianza).toBe("sustituta_mismo_genero");
    expect(r.por_categoria[0].co2_kg_anio).toBeCloseTo(co2Anual("MCH09-T1-ACPL-D-ACPS", 13.4, 0, 0.58), 8);
  });

  it("DAP del año siguiente fuera del rango: no estimable, aunque el DAP actual esté dentro", () => {
    // Rango de JAME-DH: 17,272 a 59,69 cm. 59,5 está dentro; 59,5 + 1,09 no.
    const r = calcularSecuestroArbol(arbol("a", { dap_cm: 59.5, cle: 4 }));
    expect(r).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "dap_proyectado_fuera_de_rango", categoria_motivo: "restriccion_modelo" }));
  });

  it("faltan CLE o muerte regresiva, o vienen fuera de dominio: no estimable", () => {
    expect(calcularSecuestroArbol(arbol("a", { cle: null }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "falta_cle" }));
    expect(calcularSecuestroArbol(arbol("a", { cle: 7 }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "falta_cle" }));
    expect(calcularSecuestroArbol(arbol("a", { muerte_regresiva_pct: null }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "falta_muerte_regresiva" }));
    expect(calcularSecuestroArbol(arbol("a", { muerte_regresiva_pct: 120 }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "falta_muerte_regresiva" }));
  });

  it("conserva las restricciones del carbono almacenado", () => {
    expect(calcularSecuestroArbol(arbol("a", { especie_cientifica: "Ulmus minor" }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "sin_modelo" }));
    expect(calcularSecuestroArbol(arbol("a", { multifustal: true }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "multifustal_no_admitido" }));
    expect(calcularSecuestroArbol(arbol("a", { dap_cm: 10 }))).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "fuera_de_rango" }));
    expect(calcularSecuestroArbol(arbol("a", { evaluacion_completa_vigente: false }))).toEqual(expect.objectContaining({ tipo: "fuera_del_universo", motivo: "sin_evaluacion_valida" }));
  });

  it("con una categoría aprobada para la especie: estimación fundamentada con un solo valor y su fuente", () => {
    const aprobadas = { "jacaranda mimosifolia": { categoria: "moderado" as const, fuente: "fuente de prueba" } };
    const r = calcularSecuestroArbol(arbol("a"), aprobadas);
    if (r.tipo !== "estimacion_fundamentada") throw new Error(r.tipo);
    expect(r.valor.categoria).toBe("moderado");
    expect(r.valor.co2_kg_anio).toBeCloseTo(co2Anual("UTD-TS7-JAME-DH", 30, 10, 0.84 * 0.56), 8);
    expect(r.fuente_categoria).toBe("fuente de prueba");
    expect(r.supuestos.join(" ")).not.toMatch(/Simulación/);
  });
});

describe("agregarSecuestro", () => {
  const conjunto = [
    arbol("s1"),
    arbol("s2", { especie_cientifica: "Acer pseudoplatanus", dap_cm: 13.4, cle: 4 }),
    arbol("n1", { especie_cientifica: "Ulmus minor" }),
    arbol("n2", { multifustal: true }),
    arbol("f1", { evaluacion_completa_vigente: false }),
    arbol("t1", { presente: false }),
  ];

  it("cuenta simulaciones y no estimables; las simulaciones NO se suman: total null", () => {
    const g = agregarSecuestro(conjunto);
    expect(g.cobertura).toEqual({
      presentes: 5,
      universo_calculo: 4,
      estimacion_fundamentada: 0,
      simulacion_exploratoria: 2,
      no_estimable: 2,
      motivos: { sin_modelo: 1, multifustal_no_admitido: 1, sin_evaluacion_valida: 1 },
    });
    expect(g.total_fundamentado).toEqual({ co2_kg_anio: null, co2_t_anio: null });
    expect(g.metodo.estado).toMatch(/decisión D pendiente/);
  });

  it("el total suma solo las estimaciones fundamentadas", () => {
    const aprobadas = { "jacaranda mimosifolia": { categoria: "lento" as const, fuente: "fuente de prueba" } };
    const g = agregarSecuestro(conjunto, aprobadas);
    expect(g.cobertura.estimacion_fundamentada).toBe(1);
    expect(g.cobertura.simulacion_exploratoria).toBe(1);
    const esperado = co2Anual("UTD-TS7-JAME-DH", 30, 10, 0.58 * 0.56);
    expect(g.total_fundamentado.co2_kg_anio).toBeCloseTo(esperado, 8);
    expect(g.total_fundamentado.co2_t_anio).toBeCloseTo(esperado / 1000, 11);
  });
});
