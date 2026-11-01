/**
 * B19 — GET /api/sivu/projects/:id/indicadores (hoja INDICES; CC-016), con
 * los repositorios simulados.
 */
import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/indicadores.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { listarArbolesIndicadores, listarPresencia, listarRasgosEspecie, obtenerSuperficieProyecto } from "../../src/repositories/sivu/indicadores.repository";
import { FAKE_TOKEN, INSPECTOR_ID, fakeAuthUser, inspectorProfileRow } from "../helpers/authFixtures";

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const RUTA = `/api/sivu/projects/${PROJECT_ID}/indicadores`;
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

const fila = (id: string, p: Record<string, unknown> = {}) => ({
  id, sector: "Barrio El Almendral", especie_cientifica: "Acer negundo", species_id: null, especie_catalogo: null, dap_cm: null,
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
    expect(d.cobertura).toEqual({ arboles_registrados: 4, arboles_presentes: 3 });
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
