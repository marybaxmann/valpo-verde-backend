import { proyeccionCrecimiento } from "../../../../src/services/rules/indicadores/proyeccionCrecimiento";

describe("proyección de crecimiento (i-Tree Eco, propuesta experimental)", () => {
  it("DAP + tasa × factor CLE × (1 − muerte regresiva) × años, en tres escenarios", () => {
    const r = proyeccionCrecimiento({ especie_cientifica: "Acer negundo", dap_cm: 30, cle: 4, muerte_regresiva_pct: 10 });
    const [lento, , rapido] = r.valor!.escenarios;
    expect(lento.incremento_cm_anio).toBeCloseTo(0.58 * 1 * 0.9, 10);
    expect(rapido.dap_cm.find((x) => x.anios === 10)!.dap_cm).toBeCloseTo(30 + 1.09 * 0.9 * 10, 10);
  });

  it("usa el factor de parque (0,56) con CLE 2 a 3", () => {
    const r = proyeccionCrecimiento({ especie_cientifica: null, dap_cm: 20, cle: 2, muerte_regresiva_pct: 0 });
    expect(r.valor!.escenarios[1].incremento_cm_anio).toBeCloseTo(0.84 * 0.56, 10);
  });

  it("sin DAP, CLE o muerte regresiva no proyecta y dice por qué", () => {
    expect(proyeccionCrecimiento({ especie_cientifica: null, dap_cm: null, cle: 4, muerte_regresiva_pct: 0 }).motivo).toBe("falta_dap");
    expect(proyeccionCrecimiento({ especie_cientifica: null, dap_cm: 20, cle: null, muerte_regresiva_pct: 0 }).motivo).toBe("falta_cle");
    expect(proyeccionCrecimiento({ especie_cientifica: null, dap_cm: 20, cle: 4, muerte_regresiva_pct: null }).motivo).toBe("falta_muerte_regresiva");
  });
});
