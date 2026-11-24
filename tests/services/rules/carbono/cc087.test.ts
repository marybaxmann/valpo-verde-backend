import { agregarCarbono, calcularCarbonoArbol } from "../../../../src/services/rules/carbono/calculo";
import { MODELOS_CARBONO_DIRECTO, MODELOS_VOLUMEN } from "../../../../src/services/rules/carbono/modelos";
import { agregarSecuestro, ArbolSecuestro, calcularSecuestroArbol, CATEGORIA_APROBADA_POR_ESPECIE, CATEGORIA_ITREE_REFERENCIA } from "../../../../src/services/rules/carbono/secuestro";

/** CC-087 (2026-11-23): el equipo aprueba los modelos de carbono y las categorías de crecimiento de i-Tree. */

const arbol = (id: string, especie: string, dap: number | null, altura: number | null, p: Partial<ArbolSecuestro> = {}): ArbolSecuestro => ({
  id,
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: especie,
  tipo_hoja: null,
  multifustal: false,
  dap_cm: dap,
  altura_total_m: altura,
  cle: 4,
  muerte_regresiva_pct: 0,
  ...p,
});

describe("CC-087: modelos y categorías aprobados", () => {
  it("todos los modelos de volumen y de carbono directo quedan aprobados", () => {
    expect(MODELOS_VOLUMEN.every((m) => m.estado === "aprobado")).toBe(true);
    expect(MODELOS_CARBONO_DIRECTO.every((m) => m.estado === "aprobado")).toBe(true);
  });

  it("cada especie con categoría de i-Tree tiene su categoría aprobada, con fuente", () => {
    for (const [especie, categoria] of Object.entries(CATEGORIA_ITREE_REFERENCIA)) {
      expect(CATEGORIA_APROBADA_POR_ESPECIE[especie]).toEqual({ categoria, fuente: expect.stringContaining("CC-087") });
    }
  });

  it("un modelo antes exploratorio (Ulmus minor) ahora suma al total oficial", () => {
    const u = arbol("u", "Ulmus minor", 30, 8);
    const r = calcularCarbonoArbol(u);
    expect(r.valor?.estado_resultado).toBe("aprobado");
    const g = agregarCarbono([u]);
    expect(g.cobertura.con_resultado).toBe(1);
    expect(g.total.carbono_t).toBeCloseTo(r.valor!.carbono_kg / 1000, 10);
  });

  it("el multifustal con DAP equivalente queda aprobado", () => {
    const s = arbol("s", "Schinus molle", null, 6, { multifustal: true, dap_fustes_cm: [14.6, 18.3], dap_cm: 23.41 });
    expect(calcularCarbonoArbol(s).valor?.estado_resultado).toBe("aprobado");
  });

  it("con categoría aprobada el secuestro es una estimación fundamentada y suma al total", () => {
    const u = arbol("u", "Ulmus minor", 30, 8);
    const r = calcularSecuestroArbol(u);
    expect(r.tipo).toBe("estimacion_fundamentada");
    const g = agregarSecuestro([u]);
    expect(g.cobertura.estimacion_fundamentada).toBe(1);
    expect(g.total_fundamentado.co2_kg_anio).toBeGreaterThan(0);
  });

  it("sin categoría de i-Tree (Beilschmiedia miersii) sigue el rango de tres escenarios", () => {
    const b = arbol("b", "Beilschmiedia miersii", 30, 10);
    const r = calcularSecuestroArbol(b);
    expect(r.tipo === "simulacion_exploratoria" || r.tipo === "no_estimable").toBe(true);
  });
});
