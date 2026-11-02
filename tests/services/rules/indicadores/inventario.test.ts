import {
  ArbolIndicador,
  areaProyectadaCopa,
  densidadArborea,
  diametroMedioCopa,
  distribucionClaseDiametrica,
  numeroTotalArboles,
} from "../../../../src/services/rules/indicadores/inventario";

const arbol = (p: Partial<ArbolIndicador> = {}): ArbolIndicador => ({
  id: Math.random().toString(36).slice(2),
  sector: "Barrio A",
  presente: true,
  dap_cm: null,
  diametro_copa_ns_m: null,
  diametro_copa_eo_m: null,
  diametro_copa_m: null,
  copa_no_presenta: null,
  ...p,
});

describe("B19 bloque 1 — indicadores del inventario (hoja INDICES, filas 3, 4, 11, 12 y 13)", () => {
  it("fila 3: cuenta cada árbol presente una vez", () => {
    expect(numeroTotalArboles([arbol(), arbol(), arbol()])).toEqual({ valor: 3, unidad: "arboles" });
  });

  it("fila 4: DA = N / (A_m2 / 10000)", () => {
    expect(densidadArborea(30, 20000, false)).toEqual(expect.objectContaining({ valor: 15, superficie_m2: 20000, motivo: null }));
  });

  it("fila 4: por barrio no se calcula; sin superficie tampoco (valor null con motivo)", () => {
    expect(densidadArborea(30, 20000, true)).toEqual(expect.objectContaining({ valor: null, motivo: expect.stringContaining("barrio") }));
    expect(densidadArborea(30, null, false)).toEqual(expect.objectContaining({ valor: null, motivo: expect.any(String) }));
    expect(densidadArborea(30, 0, false).valor).toBeNull();
  });

  it("fila 11: límites de clase (inferior incluido, superior excluido), ≥100 y «Sin DAP»", () => {
    const r = distribucionClaseDiametrica([
      arbol({ dap_cm: 9.99 }),
      arbol({ dap_cm: 10 }),
      arbol({ dap_cm: 99.99 }),
      arbol({ dap_cm: 100 }),
      arbol({ dap_cm: null }),
    ]);
    const n = Object.fromEntries(r.clases.map((c) => [c.codigo, c.arboles]));
    expect(n).toEqual(expect.objectContaining({ "0_10": 1, "10_20": 1, "90_100": 1, "100_mas": 1 }));
    expect(r.clases).toHaveLength(11);
    expect(r.sin_dap).toEqual({ arboles: 1, porcentaje: 20 });
    expect(r.denominador_evaluados).toBe(5);
    const suma = r.clases.reduce((s, c) => s + (c.porcentaje ?? 0), 0) + (r.sin_dap.porcentaje ?? 0);
    expect(suma).toBeCloseTo(100);
  });

  it("fila 11: sin árboles presentes, porcentajes null (no 0 inventado)", () => {
    const r = distribucionClaseDiametrica([]);
    expect(r.sin_dap.porcentaje).toBeNull();
    expect(r.clases.every((c) => c.porcentaje === null)).toBe(true);
  });

  it("fila 12: «No presenta» cuenta como 0 m; sin medición queda fuera y se informa", () => {
    const r = diametroMedioCopa([
      arbol({ diametro_copa_m: 6 }),
      arbol({ diametro_copa_m: 4 }),
      arbol({ copa_no_presenta: true }),
      arbol({ diametro_copa_ns_m: 5 }), // solo un diámetro: sin D-22
      arbol(),
    ]);
    expect(r.valor).toBeCloseTo(10 / 3);
    expect(r).toEqual(expect.objectContaining({ n_validos: 3, n_con_medicion: 2, n_no_presenta_copa: 1, n_sin_medicion: 2, denominador_evaluados: 5 }));
  });

  it("fila 12: sin ningún dato válido, valor null", () => {
    expect(diametroMedioCopa([arbol(), arbol()]).valor).toBeNull();
  });

  it("fila 13: área elíptica por árbol y suma de áreas individuales", () => {
    const r = areaProyectadaCopa([
      arbol({ diametro_copa_ns_m: 4, diametro_copa_eo_m: 6 }),
      arbol({ diametro_copa_ns_m: 2, diametro_copa_eo_m: 2 }),
      arbol({ copa_no_presenta: true }),
      arbol({ diametro_copa_eo_m: 3 }),
    ]);
    expect(r.total_m2).toBeCloseTo(Math.PI * 2 * 3 + Math.PI * 1 * 1);
    expect(r).toEqual(expect.objectContaining({ n_con_area: 2, n_no_presenta_copa: 1, n_sin_medicion: 1, denominador_evaluados: 4 }));
  });

  it("fila 13: sin árboles con los dos diámetros, total null", () => {
    expect(areaProyectadaCopa([arbol({ copa_no_presenta: true }), arbol()]).total_m2).toBeNull();
  });
});
