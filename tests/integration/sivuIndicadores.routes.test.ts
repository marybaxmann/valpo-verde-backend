/**
 * B19 — GET /api/sivu/projects/:id/indicadores (hoja INDICES; CC-016), con
 * los repositorios simulados.
 */
import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/indicadores.repository");
jest.mock("../../src/services/sivu/habilitacionBiometrica");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { listarArbolesIndicadores, listarPresencia, listarRasgosEspecie, listarVariablesCrecimiento, obtenerSuperficieProyecto } from "../../src/repositories/sivu/indicadores.repository";
import { arbolesConEvaluacionCompletaVigente } from "../../src/services/sivu/habilitacionBiometrica";
import { FAKE_TOKEN, INSPECTOR_ID, fakeAuthUser, inspectorProfileRow } from "../helpers/authFixtures";

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const RUTA = `/api/sivu/projects/${PROJECT_ID}/indicadores`;
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

const fila = (id: string, p: Record<string, unknown> = {}) => ({
  id, sector: "Barrio El Almendral", especie_cientifica: "Acer negundo", species_id: null, especie_catalogo: null, dap_cm: null, multifustal: false, altura_total_m: null,
  diametro_copa_ns_m: null, diametro_copa_eo_m: null, diametro_copa_m: null, copa_no_presenta: null, ...p,
});

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthUserByToken as jest.Mock).mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
  (findUserProfileById as jest.Mock).mockResolvedValue(inspectorProfileRow());
  (findMembership as jest.Mock).mockResolvedValue({ project_id: PROJECT_ID, user_id: INSPECTOR_ID });
  (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
    fila("a1", { dap_cm: 25, diametro_copa_ns_m: 4, diametro_copa_eo_m: 6, diametro_copa_m: 5 }),
    fila("a2", { copa_no_presenta: true }),
    fila("a3", { sector: "Barrio Puerto", dap_cm: 120 }),
    fila("a4", { dap_cm: 40 }), // talado: fuera de todo
  ]);
  (listarPresencia as jest.Mock).mockImplementation(async (_t: string, ids: string[]) =>
    ids.map((id) => ({ tree_id: id, estado_presencia: id === "a4" ? "talado" : "presente" }))
  );
  (obtenerSuperficieProyecto as jest.Mock).mockResolvedValue(30000);
  // Por defecto todos los presentes tienen evaluación completa válida y vigente.
  (arbolesConEvaluacionCompletaVigente as jest.Mock).mockImplementation(async (_t: string, _p: string, ids: string[]) => new Set(ids));
  // Secuestro anual: por defecto todos los presentes con CLE 4 y sin muerte regresiva.
  (listarVariablesCrecimiento as jest.Mock).mockImplementation(async (_t: string, ids: string[]) => ids.map((id) => ({ tree_id: id, cle: 4, muerte_regresiva_pct: 0 })));
  (listarRasgosEspecie as jest.Mock).mockImplementation(async (_t: string, ids: string[]) =>
    ids.map((id) => ({ tree_id: id, genero: id === "a1" ? "Acer" : null, familia: null, origen_biogeografico: id === "a1" ? "introducida" : "no_determinado" }))
  );
});

describe("GET /api/sivu/projects/:id/indicadores (B19)", () => {
  it("sin token: 401", async () => {
    expect((await request(app).get(RUTA)).status).toBe(401);
  });

  it("sin membresía: 403", async () => {
    (findMembership as jest.Mock).mockResolvedValue(null);
    expect((await request(app).get(RUTA).set(auth)).status).toBe(403);
  });

  it("proyecto: solo presentes; densidad con la superficie del sector; cobertura y barrios", async () => {
    const res = await request(app).get(RUTA).set(auth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.ambito).toEqual({ tipo: "proyecto", barrio: null });
    expect(d.barrios).toEqual(["Barrio El Almendral", "Barrio Puerto"]);
    expect(d.cobertura).toEqual({ arboles_registrados: 4, arboles_presentes: 3, arboles_con_evaluacion_valida: 3, arboles_sin_evaluacion_valida: 0 });
    expect(d.numero_total_arboles.valor).toBe(3);
    expect(d.densidad_arborea.valor).toBeCloseTo(1);
    expect(d.clases_diametricas.sin_dap.arboles).toBe(1);
    expect(d.clases_diametricas.clases.find((c: { codigo: string }) => c.codigo === "100_mas").arboles).toBe(1);
    expect(d.diametro_medio_copa).toEqual(expect.objectContaining({ valor: 2.5, n_no_presenta_copa: 1, n_sin_medicion: 1 }));
    expect(d.area_proyectada_copa.total_m2).toBeCloseTo(Math.PI * 6);
    expect(typeof d.fecha_consulta).toBe("string");
  });

  it("bloque 2: indicadores de especies con cobertura; el nombre del catálogo manda si el árbol está vinculado", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("a1"),
      fila("a2", { especie_cientifica: "Acer negundoo", species_id: "s1", especie_catalogo: "Acer negundo" }),
      fila("a3", { especie_cientifica: "Quercus sp." }),
    ]);
    const res = await request(app).get(RUTA).set(auth);
    const d = res.body.data;
    expect(d.riqueza_especies).toEqual(expect.objectContaining({ valor: 1, n_identificados: 2, n_no_identificados: 1 }));
    expect(d.abundancia_relativa.especies).toEqual([{ especie: "Acer negundo", arboles: 2, porcentaje: expect.closeTo(66.667, 2) }]);
    expect(d.diversidad_shannon.valor).toBe(0);
    expect(d.proporcion_origen.introducidos.arboles).toBe(1);
    expect(d.proporcion_origen.origen_no_determinado.arboles).toBe(2);
    expect(d.cobertura_taxonomica).toEqual(expect.objectContaining({ presentes: 3, con_genero_catalogo: 1, identificaciones_provisionales: null }));
    expect(listarRasgosEspecie).toHaveBeenCalledWith(FAKE_TOKEN, expect.arrayContaining(["a1", "a2", "a3"]));
  });

  it("universos: los no evaluados cuentan en inventario y diversidad, pero no en los biométricos (ni como «Sin DAP» ni «sin medición»)", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("e1", { dap_cm: 25, diametro_copa_ns_m: 4, diametro_copa_eo_m: 6, diametro_copa_m: 5 }),
      fila("n1"),
      fila("n2"),
    ]);
    (arbolesConEvaluacionCompletaVigente as jest.Mock).mockResolvedValue(new Set(["e1"]));
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    expect(d.numero_total_arboles.valor).toBe(3);
    expect(d.riqueza_especies.n_identificados).toBe(3);
    expect(d.cobertura).toEqual(expect.objectContaining({ arboles_presentes: 3, arboles_con_evaluacion_valida: 1, arboles_sin_evaluacion_valida: 2 }));
    expect(d.clases_diametricas.denominador_evaluados).toBe(1);
    expect(d.clases_diametricas.sin_dap.arboles).toBe(0);
    expect(d.diametro_medio_copa).toEqual(expect.objectContaining({ valor: 5, n_sin_medicion: 0, denominador_evaluados: 1 }));
    expect(d.area_proyectada_copa).toEqual(expect.objectContaining({ n_sin_medicion: 0, denominador_evaluados: 1 }));
    expect(arbolesConEvaluacionCompletaVigente).toHaveBeenCalledWith(FAKE_TOKEN, PROJECT_ID, ["e1", "n1", "n2"]);
  });

  it("sin ningún evaluado: biométricos vacíos (valores null), inventario intacto", async () => {
    (arbolesConEvaluacionCompletaVigente as jest.Mock).mockResolvedValue(new Set());
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    expect(d.numero_total_arboles.valor).toBe(3);
    expect(d.clases_diametricas.denominador_evaluados).toBe(0);
    expect(d.clases_diametricas.sin_dap).toEqual({ arboles: 0, porcentaje: null });
    expect(d.diametro_medio_copa.valor).toBeNull();
    expect(d.area_proyectada_copa.total_m2).toBeNull();
  });

  it("carbono (CC-069 v1): universo, resultados y motivos; los 11 indicadores no cambian", async () => {
    const sinCarbono = (await request(app).get(RUTA).set(auth)).body.data;
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("a1", { dap_cm: 25, diametro_copa_ns_m: 4, diametro_copa_eo_m: 6, diametro_copa_m: 5 }),
      fila("a2", { copa_no_presenta: true }),
      fila("a3", { sector: "Barrio Puerto", dap_cm: 120 }),
      fila("a4", { dap_cm: 40 }),
    ]);
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    // Mismo set de árboles que el resto de las pruebas: los indicadores existentes son idénticos.
    for (const k of ["numero_total_arboles", "densidad_arborea", "clases_diametricas", "diametro_medio_copa", "area_proyectada_copa", "riqueza_especies", "abundancia_relativa", "diversidad_shannon", "diversidad_taxonomica_10_20_30", "proporcion_origen", "cobertura_taxonomica"]) {
      expect(d[k]).toEqual(sinCarbono[k]);
    }
    const c = d.estimacion_carbono_aereo_lenoso;
    // a4 está talado; a1-a3 son Acer negundo, con modelo exploratorio (2026-11-20): a1 (25 cm) tiene resultado
    // exploratorio, que no suma; a2 no tiene DAP y a3 (120 cm) queda fuera del rango (9,7-102,1 cm).
    expect(c.cobertura).toEqual(expect.objectContaining({ presentes: 3, universo_calculo: 3, con_resultado: 0, con_resultado_exploratorio: 1 }));
    expect(c.cobertura.motivos.falta_dap).toBe(1);
    expect(c.cobertura.motivos.fuera_de_rango).toBe(1);
    expect(c.total).toEqual({ biomasa_aerea_lenosa_t: null, carbono_t: null, co2e_t: null });
    expect(c.metodo.estado_cc).toMatch(/pendiente de sincronización con el Excel/);
  });

  it("compatibilidad: B19 solo agrega estimacion_carbono_aereo_lenoso, estimacion_carbono_aereo_total y estimacion_secuestro_anual; universo de carbono = universo biométrico", async () => {
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    expect(Object.keys(d).sort()).toEqual(
      [
        "fecha_consulta", "ambito", "barrios", "cobertura", "numero_total_arboles", "densidad_arborea", "clases_diametricas",
        "diametro_medio_copa", "area_proyectada_copa", "cobertura_copa", "cobertura_taxonomica", "riqueza_especies", "abundancia_relativa",
        "diversidad_shannon", "diversidad_taxonomica_10_20_30", "proporcion_origen", "estimacion_carbono_aereo_lenoso",
        "estimacion_carbono_aereo_total", "estimacion_carbono_integrada", "estimacion_secuestro_anual", "estimacion_variacion_anual_carbono_aereo_total", "resumen_proyeccion_anual", "diagnostico_descriptivo",
      ].sort()
    );
    expect(d.estimacion_carbono_aereo_lenoso.cobertura.presentes).toBe(d.cobertura.arboles_presentes);
    expect(d.estimacion_carbono_aereo_lenoso.cobertura.universo_calculo).toBe(d.cobertura.arboles_con_evaluacion_valida);
  });

  it("carbono con árboles ficticios con modelo: Jacarandá evaluado calcula; no evaluado queda fuera del universo", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("j1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 }),
      fila("j2", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 }),
      fila("l1", { especie_cientifica: "Liquidambar styraciflua", dap_cm: 25, altura_total_m: null }),
      fila("j3", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, multifustal: true }),
    ]);
    (arbolesConEvaluacionCompletaVigente as jest.Mock).mockResolvedValue(new Set(["j1", "l1", "j3"]));
    const c = (await request(app).get(RUTA).set(auth)).body.data.estimacion_carbono_aereo_lenoso;
    expect(c.cobertura).toEqual(expect.objectContaining({ presentes: 4, universo_calculo: 3, con_resultado: 2 }));
    expect(c.cobertura.por_categoria).toEqual({ fuera_del_universo: 1, restriccion_modelo: 1, dato_faltante_o_inconsistente: 0, error_calculo: 0 });
    expect(c.cobertura.motivos).toEqual(expect.objectContaining({ sin_evaluacion_valida: 1, multifustal_no_admitido: 1 }));
    expect(c.total.biomasa_aerea_lenosa_t).toBeCloseTo((234.7122 + 139.5361) / 1000, 6);
    expect(c.total.carbono_t).toBeCloseTo((110.3147 + 65.582) / 1000, 6);
    expect(c.total.co2e_t).toBeCloseTo((404.4874 + 240.4673) / 1000, 6);
  });

  it("barrio: filtra por ARBOLES.sector y no calcula densidad", async () => {
    const res = await request(app).get(RUTA).query({ barrio: "Barrio Puerto" }).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.ambito).toEqual({ tipo: "barrio", barrio: "Barrio Puerto" });
    expect(res.body.data.numero_total_arboles.valor).toBe(1);
    expect(res.body.data.densidad_arborea.valor).toBeNull();
    expect(obtenerSuperficieProyecto).not.toHaveBeenCalled();
  });

  it("query desconocida: 400", async () => {
    expect((await request(app).get(RUTA).query({ especie: "x" }).set(auth)).status).toBe(400);
  });
});

describe("GET /api/sivu/projects/:id/indicadores: secuestro anual (decisiones A a C, 2026-11-20)", () => {
  it("cuenta simulaciones y no estimables; el total fundamentado queda null; los demás indicadores no cambian", async () => {
    const antes = (await request(app).get(RUTA).set(auth)).body.data;
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("j1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 24.3, altura_total_m: 7.6 }),
      fila("p1", { especie_cientifica: "Acer pseudoplatanus", dap_cm: 13.4, altura_total_m: 7.1 }),
      fila("p2", { especie_cientifica: "Acer pseudoplatanus", dap_cm: 13.5, multifustal: true }),
      fila("u1", { especie_cientifica: "Ulmus minor", dap_cm: 45 }),
      fila("x1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 }),
    ]);
    (listarVariablesCrecimiento as jest.Mock).mockImplementation(async (_t: string, ids: string[]) =>
      ids.map((id) => ({ tree_id: id, cle: id === "x1" ? null : 4, muerte_regresiva_pct: 0 }))
    );
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    const s = d.estimacion_secuestro_anual;
    expect(s.indicador).toBe("estimacion_secuestro_anual");
    expect(s.cobertura).toEqual({
      presentes: 5,
      universo_calculo: 5,
      estimacion_fundamentada: 0,
      simulacion_exploratoria: 2,
      no_estimable: 3,
      simulacion_medicion_en_revision: 0,
      simulacion_con_categoria_itree: 2,
      motivos: { multifustal_no_admitido: 1, sin_modelo: 1, falta_cle: 1 },
    });
    expect(s.total_fundamentado).toEqual({ co2_kg_anio: null, co2_t_anio: null });
    expect(s.supuestos_simulacion.join(" ")).toMatch(/Simulación basada en supuestos/);
    // El carbono almacenado sigue igual: las simulaciones no lo tocan.
    expect(d.estimacion_carbono_aereo_lenoso.cobertura.con_resultado).toBe(3);
    expect(listarVariablesCrecimiento).toHaveBeenCalledWith(FAKE_TOKEN, ["j1", "p1", "p2", "u1", "x1"]);
    expect(Object.keys(antes)).toEqual(Object.keys(d));
  });
});

describe("GET /api/sivu/projects/:id/indicadores: carbono aéreo total (carbono directo, 2026-11-21)", () => {
  // Quillayes y peumos del Piloto con sus medidas vigentes (ficticios; nada se lee de Supabase).
  const PILOTO = [
    fila("A-000543", { especie_cientifica: "Quillaja saponaria", dap_cm: 6.9, altura_total_m: 4.5 }),
    fila("A-000554", { especie_cientifica: "Quillaja saponaria", dap_cm: 8.9, altura_total_m: 3.7 }),
    fila("A-000568", { especie_cientifica: "Quillaja saponaria", dap_cm: 18.4, altura_total_m: 8.3 }),
    fila("A-000537", { especie_cientifica: "Cryptocarya alba", dap_cm: 7.8, altura_total_m: 3.2 }),
    fila("A-000538", { especie_cientifica: "Quillaja saponaria", dap_cm: 11.2, multifustal: true }),
    fila("A-000540", { especie_cientifica: "Quillaja saponaria", dap_cm: 25.59, multifustal: true }),
    fila("A-000558", { especie_cientifica: "Cryptocarya alba", dap_cm: 22.25, multifustal: true }),
    fila("A-000562", { especie_cientifica: "Quillaja saponaria" }),
    fila("A-000563", { especie_cientifica: "Quillaja saponaria" }),
    fila("A-000564", { especie_cientifica: "Quillaja saponaria" }),
    fila("A-000565", { especie_cientifica: "Quillaja saponaria" }),
  ];
  const CON_OT_EN_EJECUCION = new Set(["A-000562", "A-000563", "A-000564", "A-000565"]);
  const JAC = fila("j1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 });

  beforeEach(() => {
    (arbolesConEvaluacionCompletaVigente as jest.Mock).mockImplementation(async (_t: string, _p: string, ids: string[]) => new Set(ids.filter((id) => !CON_OT_EN_EJECUCION.has(id))));
  });

  it("solo los cuatro candidatos tienen resultado (exploratorio); sin total oficial; multifustales y no vigentes excluidos", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([JAC, ...PILOTO]);
    const t = (await request(app).get(RUTA).set(auth)).body.data.estimacion_carbono_aereo_total;
    expect(t.indicador).toBe("estimacion_carbono_aereo_total");
    expect(t.cobertura).toEqual(
      expect.objectContaining({ presentes: 12, universo_calculo: 8, con_resultado: 0, con_resultado_exploratorio: 4, por_modelo: { "CRUZ15-C6-QUSA-D": 3, "CRUZ15-C6-CRAL-D": 1 } })
    );
    expect(t.cobertura.motivos).toEqual(expect.objectContaining({ sin_evaluacion_valida: 4, multifustal_no_admitido: 3, sin_modelo: 1 }));
    expect(t.total).toEqual({ carbono_t: null, co2e_t: null });
    expect(t.metodo).toEqual(expect.objectContaining({ componente: "aerea_total", incluye_follaje: true, alimenta_secuestro_anual: false }));
  });

  it("no regresión: el carbono leñoso y el secuestro dan lo mismo con y sin quillayes y peumos", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([JAC]);
    const sin = (await request(app).get(RUTA).set(auth)).body.data;
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([JAC, ...PILOTO]);
    const con = (await request(app).get(RUTA).set(auth)).body.data;
    expect(con.estimacion_carbono_aereo_lenoso.total).toEqual(sin.estimacion_carbono_aereo_lenoso.total);
    expect(con.estimacion_carbono_aereo_lenoso.cobertura.con_resultado).toBe(1);
    expect(con.estimacion_carbono_aereo_lenoso.cobertura.con_resultado_exploratorio).toBe(0);
    expect(con.estimacion_secuestro_anual.cobertura.simulacion_exploratoria).toBe(sin.estimacion_secuestro_anual.cobertura.simulacion_exploratoria);
    expect(con.estimacion_secuestro_anual.cobertura.estimacion_fundamentada).toBe(0);
  });
});

describe("GET /api/sivu/projects/:id/indicadores: propuesta experimental (2026-11-21)", () => {
  it("modelos UTD experimentales: amplían las simulaciones del secuestro leñoso sin tocar los totales oficiales; la variación del carbono aéreo total va aparte", async () => {
    (listarArbolesIndicadores as jest.Mock).mockResolvedValue([
      fila("j1", { especie_cientifica: "Jacaranda mimosifolia", dap_cm: 30, altura_total_m: 10 }),
      fila("g1", { especie_cientifica: "Ginkgo biloba", dap_cm: 84, altura_total_m: 6.5 }),
      fila("o1", { especie_cientifica: "Olea europaea", dap_cm: 17, altura_total_m: 5.8 }),
      fila("b1", { especie_cientifica: "Araucaria heterophylla", dap_cm: 39.1, altura_total_m: 14.4 }),
      fila("q1", { especie_cientifica: "Quillaja saponaria", dap_cm: 18.4, altura_total_m: 8.3 }),
    ]);
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    expect(d.estimacion_carbono_aereo_lenoso.cobertura).toEqual(expect.objectContaining({ con_resultado: 1, con_resultado_exploratorio: 2 }));
    expect(d.estimacion_carbono_aereo_lenoso.total.carbono_t).toBeCloseTo(110.3147 / 1000, 6);
    expect(d.estimacion_secuestro_anual.cobertura).toEqual(expect.objectContaining({ estimacion_fundamentada: 0, simulacion_exploratoria: 3, no_estimable: 2 }));
    expect(d.estimacion_secuestro_anual.total_fundamentado).toEqual({ co2_kg_anio: null, co2_t_anio: null });
    const v = d.estimacion_variacion_anual_carbono_aereo_total;
    expect(v.cobertura).toEqual(expect.objectContaining({ simulacion_exploratoria: 1, no_estimable: 4 }));
    expect(v.total).toBeNull();
    expect(v.metodo.estado).toMatch(/propuesta experimental/);
  });
});
