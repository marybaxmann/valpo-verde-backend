/**
 * Carbono aéreo total con modelos de carbono directo (Cruz et al. 2015;
 * autorización de la responsable, 2026-11-21). Árboles FICTICIOS con las
 * medidas vigentes de los ejemplares del Piloto (nada se lee ni se escribe en
 * Supabase). Valores de referencia entregados por la responsable (redondeados
 * a 2 decimales).
 */
import { agregarCarbono, ArbolCarbono, calcularCarbonoArbol } from "../../../../src/services/rules/carbono/calculo";
import { agregarCarbonoAereoTotal, calcularCarbonoAereoTotalArbol, METODO_CARBONO_AEREO_TOTAL } from "../../../../src/services/rules/carbono/carbonoAereoTotal";
import { FACTOR_CO2_POR_C, FRACCION_CARBONO, MODELOS_CARBONO_DIRECTO, MODELOS_VOLUMEN, seleccionarModelos } from "../../../../src/services/rules/carbono/modelos";
import { agregarSecuestro, calcularSecuestroArbol } from "../../../../src/services/rules/carbono/secuestro";

const QUILLAY = "Quillaja saponaria";
const PEUMO = "Cryptocarya alba";
const arbol = (id: string, p: Partial<ArbolCarbono> = {}): ArbolCarbono => ({
  id,
  presente: true,
  evaluacion_completa_vigente: true,
  especie_cientifica: QUILLAY,
  tipo_hoja: null,
  multifustal: false,
  dap_cm: 10,
  altura_total_m: 5,
  ...p,
});

/** Los cuatro candidatos autorizados: monofustales, con evaluación completa vigente. */
const CANDIDATOS = [
  { id: "A-000543", especie: QUILLAY, dap: 6.9, altura: 4.5, c: 5.69, modelo: "CRUZ15-C6-QUSA-D" },
  { id: "A-000554", especie: QUILLAY, dap: 8.9, altura: 3.7, c: 10.09, modelo: "CRUZ15-C6-QUSA-D" },
  { id: "A-000568", especie: QUILLAY, dap: 18.4, altura: 8.3, c: 51.76, modelo: "CRUZ15-C6-QUSA-D" },
  { id: "A-000537", especie: PEUMO, dap: 7.8, altura: 3.2, c: 8.46, modelo: "CRUZ15-C6-CRAL-D" },
] as const;
const candidato = (c: (typeof CANDIDATOS)[number]) => arbol(c.id, { especie_cientifica: c.especie, dap_cm: c.dap, altura_total_m: c.altura });

/** Excluidos por decisión de la responsable (2026-11-21). */
const MULTIFUSTALES = [
  arbol("A-000538", { multifustal: true, dap_cm: 11.2, altura_total_m: 4.8 }),
  arbol("A-000540", { multifustal: true, dap_cm: 25.59, altura_total_m: 7.6 }),
  arbol("A-000558", { especie_cientifica: PEUMO, multifustal: true, dap_cm: 22.25, altura_total_m: 6 }),
];
// Medidas registradas en inspecciones finalizadas cuya OT sigue en ejecución: no son vigentes, así que el árbol
// no tiene evaluación completa vigente y su fila de ARBOLES no trae esas medidas.
const SIN_VIGENTES = ["A-000562", "A-000563", "A-000564", "A-000565"].map((id) => arbol(id, { evaluacion_completa_vigente: false, dap_cm: null, altura_total_m: null }));

describe("catálogo de carbono directo (Cruz et al. 2015)", () => {
  it("parámetros tal como los entregó la responsable", () => {
    expect(MODELOS_CARBONO_DIRECTO.map((m) => [m.id, m.especie, m.a, m.b, m.dap_min_cm, m.dap_max_cm, m.n_muestra, m.r2, m.fraccion_carbono_fuente])).toEqual([
      ["CRUZ15-C6-QUSA-D", "quillaja saponaria", 0.0736, 2.251, 5, 41, 80, 0.95, 0.493],
      ["CRUZ15-C6-CRAL-D", "cryptocarya alba", 0.0675, 2.352, 5, 37, 82, 0.95, 0.495],
    ]);
  });

  it("componente aéreo total con hojas y sin raíces; DAP a 1,30 m; exploratorio con confianza «propia_no_urbana»; con DOI", () => {
    for (const m of MODELOS_CARBONO_DIRECTO) {
      expect(m).toEqual(
        expect.objectContaining({
          tipo: "carbono_directo",
          componente: "aerea_total",
          incluye: ["tallo", "ramas", "ramillas", "hojas"],
          excluye: ["raíces"],
          altura_medicion_dap_m: 1.3,
          estado: "exploratorio",
          confianza: "propia_no_urbana",
          admite_multifustal: false,
          doi: "https://doi.org/10.4067/S0717-92002015000300005",
        })
      );
      expect(m.fuente).toMatch(/Bosque, 36\(3\), 375-381/);
      expect(m.limitaciones_modelo.join(" ")).toMatch(/no en árboles urbanos/);
      expect(m.limitaciones_modelo.join(" ")).toMatch(/multifustal/);
    }
  });

  it("los modelos de volumen existentes no cambian: mismo número, componente leñoso y estados", () => {
    expect(MODELOS_VOLUMEN).toHaveLength(16);
    expect(MODELOS_VOLUMEN.every((m) => m.componente === "aerea_lenosa")).toBe(true);
    expect(MODELOS_VOLUMEN.filter((m) => m.estado === "aprobado").map((m) => m.id)).toEqual([
      "UTD-TS7-JAME-DH",
      "UTD-TS7-JAME-D",
      "UTD-TS7-LIST-DH",
      "UTD-TS7-LIST-D",
      "MCH09-T1-ACPL-D-ACPS",
    ]);
  });
});

describe("selección explícita por componente, especie y estado", () => {
  it("cada componente solo entrega modelos de ese componente", () => {
    expect(seleccionarModelos("aerea_lenosa", "quillaja saponaria")).toEqual([]);
    expect(seleccionarModelos("aerea_total", "quillaja saponaria").map((m) => m.id)).toEqual(["CRUZ15-C6-QUSA-D"]);
    expect(seleccionarModelos("aerea_total", "jacaranda mimosifolia")).toEqual([]);
    expect(seleccionarModelos("aerea_lenosa", "jacaranda mimosifolia").map((m) => m.id)).toEqual(["UTD-TS7-JAME-DH", "UTD-TS7-JAME-D"]);
    expect(seleccionarModelos("aerea_total", null)).toEqual([]);
  });

  it("sin ambigüedad: dentro de un componente hay a lo sumo un modelo por especie, estado y variante", () => {
    // Una especie SÍ puede tener modelos en ambos componentes; lo que no puede haber es dos candidatos iguales.
    const claves = [...MODELOS_VOLUMEN, ...MODELOS_CARBONO_DIRECTO].map((m) => `${m.componente}|${m.especie}|${m.estado}|${m.variante}`);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("calcularCarbonoAereoTotalArbol — los cuatro candidatos autorizados", () => {
  it.each(CANDIDATOS)("$id ($especie, DAP $dap cm): $c kg C", (c) => {
    const r = calcularCarbonoAereoTotalArbol(candidato(c));
    expect(r.categoria).toBeNull();
    expect(r.valor!.carbono_kg).toBeCloseTo(c.c, 2);
    expect(r.valor!.co2e_kg).toBeCloseTo(r.valor!.carbono_kg * (44 / 12), 10);
    expect(r.valor!.modelo.id).toBe(c.modelo);
    expect(r.valor!.modelo.estado).toBe("exploratorio");
    expect(r.valor!.componente).toEqual({ codigo: "aerea_total", incluye: ["tallo", "ramas", "ramillas", "hojas"], excluye: ["raíces"] });
  });

  it("sin doble conversión: C = a·D^b exacto, sin densidad ni 0,47; el CO₂e es C × 44/12", () => {
    const r = calcularCarbonoAereoTotalArbol(candidato(CANDIDATOS[2]));
    expect(r.valor!.carbono_kg).toBe(0.0736 * 18.4 ** 2.251);
    expect(r.valor!.carbono_kg).not.toBeCloseTo(0.0736 * 18.4 ** 2.251 * FRACCION_CARBONO.valor, 1);
    expect(r.valor!.co2e_kg).toBe(r.valor!.carbono_kg * FACTOR_CO2_POR_C);
    expect(r.valor!.entradas).toEqual({ dap_cm: 18.4 });
    expect(r.valor).not.toHaveProperty("biomasa_aerea_lenosa_kg");
    expect(r.valor!.modelo).not.toHaveProperty("densidad");
    expect(METODO_CARBONO_AEREO_TOTAL).toEqual(expect.objectContaining({ aplica_densidad: false, aplica_fraccion_carbono: false, incluye_follaje: true, incluye_raices: false }));
  });

  it("la altura no interviene: la ecuación solo usa el DAP", () => {
    const a = calcularCarbonoAereoTotalArbol(arbol("x", { dap_cm: 10, altura_total_m: 3 }));
    const b = calcularCarbonoAereoTotalArbol(arbol("x", { dap_cm: 10, altura_total_m: null }));
    expect(a.valor!.carbono_kg).toBe(b.valor!.carbono_kg);
  });
});

describe("rangos de DAP (límites incluidos)", () => {
  it.each([
    [QUILLAY, 5, true],
    [QUILLAY, 41, true],
    [QUILLAY, 4.99, false],
    [QUILLAY, 41.01, false],
    [PEUMO, 5, true],
    [PEUMO, 37, true],
    [PEUMO, 4.99, false],
    [PEUMO, 37.01, false],
  ])("%s con DAP %d cm: con resultado = %s", (especie, dap, ok) => {
    const r = calcularCarbonoAereoTotalArbol(arbol("x", { especie_cientifica: especie, dap_cm: dap }));
    if (ok) expect(r.valor).not.toBeNull();
    else expect(r).toEqual(expect.objectContaining({ valor: null, categoria: "restriccion_modelo", motivo: "fuera_de_rango" }));
  });
});

describe("exclusiones autorizadas", () => {
  it.each(MULTIFUSTALES)("$id, multifustal con DAP equivalente dentro del rango: no se estima", (a) => {
    const r = calcularCarbonoAereoTotalArbol(a);
    expect(r).toEqual(expect.objectContaining({ valor: null, categoria: "restriccion_modelo", motivo: "multifustal_no_admitido" }));
    expect(r.detalle).toMatch(/DAP equivalente/);
  });

  it.each(SIN_VIGENTES)("$id, sin medidas vigentes (OT en ejecución): fuera del universo", (a) => {
    expect(calcularCarbonoAereoTotalArbol(a)).toEqual(expect.objectContaining({ valor: null, categoria: "fuera_del_universo", motivo: "sin_evaluacion_valida" }));
  });

  it("sin evaluación vigente queda fuera aunque traiga un DAP en rango (nunca se fuerza la vigencia)", () => {
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { evaluacion_completa_vigente: false, dap_cm: 10.2 })).motivo).toBe("sin_evaluacion_valida");
  });

  it("multifustal no registrado, sin DAP, palmera, talado y especie sin modelo", () => {
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { multifustal: null })).motivo).toBe("configuracion_fuste_no_determinada");
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { dap_cm: null })).motivo).toBe("falta_dap");
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { tipo_hoja: "palmera" })).motivo).toBe("palmera_sin_modelo");
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { presente: false })).motivo).toBe("no_presente");
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { especie_cientifica: "Jacaranda mimosifolia" })).motivo).toBe("sin_modelo");
    expect(calcularCarbonoAereoTotalArbol(arbol("x", { especie_cientifica: "Quillaja" })).detalle).toMatch(/no determinada/);
  });
});

describe("no regresión y ausencia de doble conteo", () => {
  const JAC = arbol("j1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 });
  const NEG = arbol("n1", { especie_cientifica: "Acer negundo", dap_cm: 25, altura_total_m: null });
  const PILOTO = [...CANDIDATOS.map(candidato), ...MULTIFUSTALES, ...SIN_VIGENTES];

  it("el carbono aéreo leñoso no cambia: quillay y peumo siguen sin modelo y sus totales no se alteran", () => {
    for (const a of PILOTO.filter((x) => x.evaluacion_completa_vigente && x.multifustal === false)) {
      expect(calcularCarbonoArbol(a)).toEqual(expect.objectContaining({ valor: null, motivo: "sin_modelo" }));
    }
    const sin = agregarCarbono([JAC, NEG]);
    const con = agregarCarbono([JAC, NEG, ...PILOTO]);
    expect(con.total).toEqual(sin.total);
    expect(con.cobertura.con_resultado).toBe(sin.cobertura.con_resultado);
    expect(con.cobertura.con_resultado_exploratorio).toBe(sin.cobertura.con_resultado_exploratorio);
    expect(con.total.carbono_t).toBeCloseTo(110.3147 / 1000, 6);
  });

  it("el carbono aéreo total no incluye a especies con modelo leñoso ni genera total oficial", () => {
    const t = agregarCarbonoAereoTotal([JAC, NEG, ...PILOTO]);
    expect(t.indicador).toBe("estimacion_carbono_aereo_total");
    expect(t.cobertura).toEqual(
      expect.objectContaining({
        presentes: 13,
        universo_calculo: 9,
        con_resultado: 0,
        con_resultado_exploratorio: 4,
        por_modelo: { "CRUZ15-C6-QUSA-D": 3, "CRUZ15-C6-CRAL-D": 1 },
      })
    );
    expect(t.cobertura.motivos).toEqual(expect.objectContaining({ sin_modelo: 2, multifustal_no_admitido: 3, sin_evaluacion_valida: 4 }));
    expect(t.total).toEqual({ carbono_t: null, co2e_t: null });
  });

  it("cada árbol cae en un solo resultado por indicador", () => {
    const todos = [JAC, NEG, ...PILOTO];
    const t = agregarCarbonoAereoTotal(todos);
    const sinResultado = Object.values(t.cobertura.motivos).reduce((s, n) => s + n, 0);
    expect(t.cobertura.con_resultado + t.cobertura.con_resultado_exploratorio + sinResultado).toBe(todos.length);
  });

  it("el secuestro anual no cambia: quillay y peumo quedan no estimables (sin modelo), ni siquiera como simulación", () => {
    for (const a of CANDIDATOS.map(candidato)) {
      expect(calcularSecuestroArbol({ ...a, cle: 4, muerte_regresiva_pct: 0 })).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "sin_modelo" }));
    }
    const conCle = (xs: ArbolCarbono[]) => xs.map((a) => ({ ...a, cle: 4, muerte_regresiva_pct: 0 }));
    const sin = agregarSecuestro(conCle([JAC, NEG]));
    const con = agregarSecuestro(conCle([JAC, NEG, ...PILOTO]));
    expect(con.cobertura.simulacion_exploratoria).toBe(sin.cobertura.simulacion_exploratoria);
    expect(con.cobertura.estimacion_fundamentada).toBe(0);
  });
});
