/**
 * Propuesta experimental (2026-11-21), no vigente: modelos de volumen de la
 * Urban Tree Database por especie (PSW-GTR-253, tablas 9 y 11; GWDD v2.2) y
 * variación anual proyectada del carbono aéreo total (carbono directo).
 * Árboles FICTICIOS con las medidas vigentes del Piloto; nada se lee de
 * Supabase. Referencias calculadas a mano: V × ρ × 0,47 (leñoso) y
 * (C₁ − C₀) × 44/12 con ΔDAP = tasa × factor CLE × (1 − muerte regresiva).
 */
import { agregarCarbono, ArbolCarbono, calcularCarbonoArbol } from "../../../../src/services/rules/carbono/calculo";
import { MODELOS_VOLUMEN } from "../../../../src/services/rules/carbono/modelos";
import { agregarSecuestro, ArbolSecuestro, calcularSecuestroArbol } from "../../../../src/services/rules/carbono/secuestro";
import { agregarVariacionAereoTotal, calcularVariacionAereoTotalArbol } from "../../../../src/services/rules/carbono/variacionAereoTotal";

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

/** Árboles del Piloto que cubren los modelos UTD experimentales: [árbol, kg C almacenado, CO₂ lento/moderado/rápido con CLE 4]. */
const UTD = [
  { a: arbol("A-000504", "Araucaria angustifolia", 23.3, 6.7), id: "UTD-T9-UGEC-DH-ARAN", c: 36.2308, s: [7.5344, 10.9868, 14.3503] },
  { a: arbol("A-000505", "Ginkgo biloba", 84, 6.5), id: "UTD-T9-UGEB-DH-GIBI", c: 950.1619, s: [47.1074, 68.3247, 88.7844] },
  { a: arbol("A-000533", "Pittosporum undulatum", 34.6, 10.7), id: "UTD-T9-UGEB-DH-PIUN", c: 335.6465, s: [40.5885, 58.9917, 76.8088] },
  { a: arbol("A-000535", "Pittosporum undulatum", 38.3, 7.7), id: "UTD-T9-UGEB-DH-PIUN", c: 328.9165, s: [35.9047, 52.1666, 67.9004] },
  { a: arbol("A-000534", "Ficus elastica", 80.1, 17.2), id: "UTD-T9-UGEB-DH-FIEL", c: 1589.2382, s: [82.6413, 119.8716, 155.7774] },
  { a: arbol("A-000544", "Olea europaea", 17, 5.8), id: "UTD-T9-UGEB-DH-OLEU", c: 52.4525, s: [13.0153, 18.9846, 24.803] },
  { a: arbol("A-000559", "Pittosporum tobira", 6.7, 5.2), id: "UTD-T9-UGEB-DH-PITO", c: 7.3587, s: [4.7466, 6.9959, 9.2296] },
  { a: arbol("A-000545", "Acer platanoides", 14.2, 8.3), id: "MCH09-T1-ACPL-D-ACPL", c: 52.9285, s: [14.3756, 20.9661, 27.388] },
];

describe("catálogo experimental de la UTD (PSW-GTR-253)", () => {
  const porId = Object.fromEntries(MODELOS_VOLUMEN.map((m) => [m.id, m]));

  it("ecuaciones generales con los coeficientes y rangos de la tabla 9", () => {
    expect(porId["UTD-T9-UGEB-DH-GIBI"]).toEqual(expect.objectContaining({ a: 0.0001967, b: 1.951853, c: 0.664255, dap_min_cm: 6, dap_max_cm: 135, variante: "dap_altura" }));
    expect(porId["UTD-T9-UGEC-DH-ARAN"]).toEqual(expect.objectContaining({ a: 0.0000426, b: 2.24358, c: 0.64956, dap_min_cm: 16, dap_max_cm: 147, variante: "dap_altura" }));
  });

  it("densidades: tabla 11 de la UTD si la especie está; si no, GWDD v2.2", () => {
    const dens = (id: string) => [porId[id].densidad.valor, porId[id].densidad.version];
    expect(dens("UTD-T9-UGEB-DH-GIBI")).toEqual([520, "2016"]);
    expect(dens("UTD-T9-UGEB-DH-LAIN")).toEqual([571, "2016"]);
    expect(dens("UTD-T9-UGEB-DH-OLEU")).toEqual([700, "2016"]);
    expect(dens("UTD-T9-UGEB-DH-PIUN")).toEqual([745, "2016"]);
    expect(dens("UTD-T9-UGEB-DH-SCMO")).toEqual([650, "2016"]);
    expect(dens("UTD-T9-UGEB-DH-FIEL")).toEqual([500, "v2.2"]);
    expect(dens("UTD-T9-UGEB-DH-PITO")).toEqual([650, "v2.2"]);
    expect(dens("UTD-T9-UGEC-DH-ARAN")).toEqual([450, "v2.2"]);
    expect(dens("MCH09-T1-ACPL-D-ACPL")).toEqual([520, "2016"]);
  });

  it("todos exploratorios, del componente leñoso, con fuente y limitaciones; los generales con confianza «generica_urbana»", () => {
    const nuevos = MODELOS_VOLUMEN.filter((m) => m.id.startsWith("UTD-T9-UGE") || m.id === "MCH09-T1-ACPL-D-ACPL");
    expect(nuevos).toHaveLength(9);
    for (const m of nuevos) {
      expect(m.estado).toBe("exploratorio");
      expect(m.componente).toBe("aerea_lenosa");
      expect(m.fuente).toMatch(/PSW-GTR-253|McHale/);
      expect(m.limitaciones_modelo.length).toBeGreaterThan(0);
    }
    expect(nuevos.filter((m) => m.id.startsWith("UTD-T9-UGE")).every((m) => m.confianza === "generica_urbana")).toBe(true);
    expect(porId["MCH09-T1-ACPL-D-ACPL"].confianza).toBe("propia_urbana");
  });
});

describe("carbono almacenado y secuestro con los modelos UTD experimentales (procedimiento vigente de SIVU)", () => {
  it.each(UTD)("$a.id: carbono leñoso exploratorio y simulación con las tres categorías", ({ a, id, c, s }) => {
    const r = calcularCarbonoArbol(a);
    expect(r.valor!.modelo.id).toBe(id);
    expect(r.valor!.modelo.estado).toBe("exploratorio");
    expect(r.valor!.carbono_kg).toBeCloseTo(c, 3);
    const sec = calcularSecuestroArbol(a);
    expect(sec.tipo).toBe("simulacion_exploratoria");
    if (sec.tipo !== "simulacion_exploratoria") return;
    expect(sec.por_categoria.map((p) => p.co2_kg_anio)).toEqual([expect.closeTo(s[0], 3), expect.closeTo(s[1], 3), expect.closeTo(s[2], 3)]);
  });

  it("avisos según el origen de la ecuación: general urbana, propia de la especie o sustituta del género", () => {
    const aviso = (a: ArbolSecuestro) => {
      const r = calcularSecuestroArbol(a);
      return r.tipo === "simulacion_exploratoria" ? r.advertencias.join(" ") : "";
    };
    expect(aviso(UTD[1].a)).toMatch(/ecuación general urbana de latifoliadas \(UGEB\) de la Urban Tree Database/);
    expect(aviso(UTD[1].a)).toMatch(/altura del árbol no se pudo comprobar/);
    expect(aviso(UTD[7].a)).toMatch(/ecuación de la propia especie/);
    expect(aviso(arbol("n", "Acer negundo", 20, 8))).toMatch(/Acer platanoides, otra especie del mismo género/);
  });

  it("no estimables correctamente clasificados", () => {
    expect(calcularCarbonoArbol(arbol("A-000552", "Lagerstroemia indica", 3.4, 2.9)).motivo).toBe("fuera_de_rango");
    expect(calcularCarbonoArbol(arbol("A-000527", "Schinus molle", 23.41, 5.4, { multifustal: true })).motivo).toBe("multifustal_no_admitido");
    // Sin densidad de la especie en la tabla 11 ni en la GWDD v2.2: no hay modelo.
    expect(calcularCarbonoArbol(arbol("A-000532", "Beilschmiedia miersii", 39.1, 14.4)).motivo).toBe("sin_modelo");
    expect(calcularCarbonoArbol(arbol("A-000531", "Araucaria heterophylla", 47.3, 24.5)).motivo).toBe("sin_modelo");
    // Las ecuaciones generales necesitan la altura.
    expect(calcularCarbonoArbol(arbol("x", "Ginkgo biloba", 30, null)).motivo).toBe("sin_modelo");
    // UGEC empieza en 16 cm.
    expect(calcularCarbonoArbol(arbol("x", "Araucaria angustifolia", 15.9, 6)).motivo).toBe("fuera_de_rango");
  });

  it("no regresión: el total oficial del carbono almacenado y del secuestro no cambian con los modelos experimentales", () => {
    const jac = arbol("j1", "Jacaranda mimosifolia", 30, 10);
    const conExp = [jac, ...UTD.map((u) => u.a)];
    const c = agregarCarbono(conExp);
    expect(c.cobertura.con_resultado).toBe(1);
    expect(c.cobertura.con_resultado_exploratorio).toBe(UTD.length);
    expect(c.total).toEqual(agregarCarbono([jac]).total);
    const s = agregarSecuestro(conExp);
    expect(s.cobertura.estimacion_fundamentada).toBe(0);
    expect(s.cobertura.simulacion_exploratoria).toBe(UTD.length + 1);
    expect(s.total_fundamentado).toEqual({ co2_kg_anio: null, co2_t_anio: null });
  });
});

describe("variación anual proyectada del carbono aéreo total (carbono directo; tratamiento separado)", () => {
  const CANDIDATOS = [
    { a: arbol("A-000543", "Quillaja saponaria", 6.9, 4.5), s: [4.1568, 6.1572, 8.1616] },
    { a: arbol("A-000554", "Quillaja saponaria", 8.9, 3.7), s: [5.6505, 8.3289, 10.9902] },
    { a: arbol("A-000568", "Quillaja saponaria", 18.4, 8.3), s: [13.7322, 20.0616, 26.2492] },
    { a: arbol("A-000537", "Cryptocarya alba", 7.8, 3.2), s: [5.7021, 8.439, 11.1777] },
  ];

  it.each(CANDIDATOS)("$a.id: simulación con las tres categorías, con componente y modelo", ({ a, s }) => {
    const r = calcularVariacionAereoTotalArbol(a);
    expect(r.tipo).toBe("simulacion_exploratoria");
    if (r.tipo !== "simulacion_exploratoria") return;
    expect(r.por_categoria.map((p) => p.co2_kg_anio)).toEqual([expect.closeTo(s[0], 3), expect.closeTo(s[1], 3), expect.closeTo(s[2], 3)]);
    expect(r.rango).toEqual({ co2_kg_anio_min: expect.closeTo(s[0], 3), co2_kg_anio_max: expect.closeTo(s[2], 3) });
    expect(r.componente.incluye).toContain("hojas");
    expect(r.supuestos.join(" ")).toMatch(/no es el secuestro leñoso de SIVU ni la captura fotosintética/);
  });

  it("aplica CLE y muerte regresiva igual que el secuestro: CLE 2 (× 0,56) y 50 % de muerte regresiva (× 0,5)", () => {
    const r = calcularVariacionAereoTotalArbol({ ...CANDIDATOS[2].a, cle: 2, muerte_regresiva_pct: 50 });
    if (r.tipo !== "simulacion_exploratoria") throw new Error(r.tipo);
    expect(r.por_categoria[1].delta_dap_cm).toBeCloseTo(0.84 * 0.56 * 0.5, 10);
    const c = (d: number) => 0.0736 * d ** 2.251;
    expect(r.por_categoria[1].co2_kg_anio).toBeCloseTo((c(18.4 + 0.84 * 0.28) - c(18.4)) * (44 / 12), 8);
  });

  it("exclusiones: multifustal, sin vigencia, sin CLE, especie sin carbono directo y DAP proyectado fuera del rango", () => {
    expect(calcularVariacionAereoTotalArbol(arbol("A-000540", "Quillaja saponaria", 25.59, 7.6, { multifustal: true })).motivo).toBe("multifustal_no_admitido");
    expect(calcularVariacionAereoTotalArbol(arbol("A-000562", "Quillaja saponaria", null, null, { evaluacion_completa_vigente: false })).tipo).toBe("fuera_del_universo");
    expect(calcularVariacionAereoTotalArbol({ ...CANDIDATOS[0].a, cle: null }).motivo).toBe("falta_cle");
    expect(calcularVariacionAereoTotalArbol(arbol("j", "Jacaranda mimosifolia", 30, 10)).motivo).toBe("sin_modelo");
    expect(calcularVariacionAereoTotalArbol(arbol("q", "Quillaja saponaria", 40.5, 9)).motivo).toBe("dap_proyectado_fuera_de_rango");
  });

  it("separación: el secuestro leñoso de quillay y peumo sigue no estimable y el agregado no tiene total", () => {
    for (const { a } of CANDIDATOS) expect(calcularSecuestroArbol(a)).toEqual(expect.objectContaining({ tipo: "no_estimable", motivo: "sin_modelo" }));
    const g = agregarVariacionAereoTotal([...CANDIDATOS.map((c) => c.a), arbol("j", "Jacaranda mimosifolia", 30, 10)]);
    expect(g.cobertura).toEqual(expect.objectContaining({ presentes: 5, simulacion_exploratoria: 4, no_estimable: 1 }));
    expect(g.total).toBeNull();
    expect(g.metodo).toEqual(expect.objectContaining({ incluye_follaje: true, es_captura_fotosintetica: false }));
    // El secuestro leñoso no cuenta a quillay ni peumo como simulación.
    expect(agregarSecuestro(CANDIDATOS.map((c) => c.a) as ArbolCarbono[] as ArbolSecuestro[]).cobertura.simulacion_exploratoria).toBe(0);
  });
});
