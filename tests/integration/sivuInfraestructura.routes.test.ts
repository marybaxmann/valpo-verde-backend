/**
 * B8 — GET /api/sivu/projects/:id/infraestructura, con repositorios
 * simulados y árboles ficticios (sin Supabase). Solo lectura de lo que
 * ya calculó el motor (M04) en la evaluación vigente.
 */
import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/infraestructura.repository");
jest.mock("../../src/repositories/sivu/indicadores.repository");
jest.mock("../../src/repositories/sivu/evaluacionValida.repository");
jest.mock("../../src/repositories/sivu/diagnostico.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { listarArbolesInfraestructura } from "../../src/repositories/sivu/infraestructura.repository";
import { listarPresencia } from "../../src/repositories/sivu/indicadores.repository";
import { listarArbolesConInspeccionValida } from "../../src/repositories/sivu/evaluacionValida.repository";
import { listarEvaluacionesVigentes } from "../../src/repositories/sivu/diagnostico.repository";
import { FAKE_TOKEN, INSPECTOR_ID, fakeAuthUser, inspectorProfileRow } from "../helpers/authFixtures";

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const RUTA = `/api/sivu/projects/${PROJECT_ID}/infraestructura`;
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

const arbol = (id: string, sector = "Barrio El Almendral") => ({
  id, tree_code: `A-${id}`, especie_cientifica: "Acer negundo", nombre_comun: "Arce negundo", sector,
  ubicacion: { type: "Point", coordinates: [-71.6, -33.04] },
});

const vigente = (treeId: string, p: Record<string, unknown> = {}) => ({
  tree_id: treeId, evento: "ot_completada", work_order_id: "w1", inspection_id: null, requiere_revision_ajuste: false, created_at: "2026-11-01T12:00:00Z",
  probabilidad_falla_raices_cuello: null, probabilidad_falla_tronco: null, probabilidad_falla_copa_ramas: null, probabilidad_impacto: null,
  clasificacion_raices_cuello: null, clasificacion_tronco: null, clasificacion_copa_ramas: null,
  clasificacion_riesgo_calculada: "bajo", clasificacion_riesgo_ajustada: null,
  puntaje_infraestructura: 3, pct_infraestructura: 12.5, clasificacion_infraestructura_calculada: "bajo", clasificacion_infraestructura_ajustada: null,
  clasificacion_prioridad_calculada: "baja", clasificacion_prioridad_ajustada: null, rule_version: "2.1",
  indicadores: {
    vereda: { puntaje: 1, reglaId: "IN-VER-03", categoria: "leve" },
    calzada: { puntaje: 0, reglaId: "IN-CAL-02", categoria: "sin_afectacion" },
    alcorque: { puntaje: 1, reglaId: "IN-ALC-03", categoria: "leve" },
    infraestructuraVertical: { puntaje: null, reglaId: "IN-VRT-01", categoria: "no_aplica" },
    redAerea: { puntaje: null, reglaId: null, categoria: "no_determinado", motivo: "función de la red no determinada (CC-043)" },
    redSubterranea: { puntaje: 0, reglaId: "IN-RSU-06", categoria: "sin_afectacion" },
    tronco: { ignorado: true },
  },
  ...p,
});

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthUserByToken as jest.Mock).mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
  (findUserProfileById as jest.Mock).mockResolvedValue(inspectorProfileRow());
  (findMembership as jest.Mock).mockResolvedValue({ project_id: PROJECT_ID, user_id: INSPECTOR_ID });
  (listarArbolesInfraestructura as jest.Mock).mockResolvedValue([arbol("1"), arbol("2"), arbol("3"), arbol("4", "Barrio Puerto")]);
  (listarPresencia as jest.Mock).mockImplementation(async (_t: string, ids: string[]) =>
    ids.map((id) => ({ tree_id: id, estado_presencia: id === "3" ? "talado" : "presente" }))
  );
  // 1 y 4 evaluados; 2 presente sin evaluación válida; 3 talado.
  (listarArbolesConInspeccionValida as jest.Mock).mockResolvedValue(new Set(["1", "3", "4"]));
  (listarEvaluacionesVigentes as jest.Mock).mockResolvedValue([
    vigente("1"),
    vigente("4", { clasificacion_infraestructura_calculada: "moderado", clasificacion_infraestructura_ajustada: "alto", pct_infraestructura: 30 }),
    vigente("3"),
  ]);
});

describe("GET /api/sivu/projects/:id/infraestructura (B8)", () => {
  it("sin token: 401; sin membresía: 403", async () => {
    expect((await request(app).get(RUTA)).status).toBe(401);
    (findMembership as jest.Mock).mockResolvedValue(null);
    expect((await request(app).get(RUTA).set(auth)).status).toBe(403);
  });

  it("solo presentes con evaluación completa vigente; componentes M04 con etiqueta; ajuste del Inspector prevalece", async () => {
    const res = await request(app).get(RUTA).set(auth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.cobertura).toEqual({ arboles_presentes: 3, arboles_con_evaluacion_valida: 2, arboles_sin_evaluacion_valida: 1 });
    expect(d.arboles.map((a: { arbol: { id: string } }) => a.arbol.id)).toEqual(["1", "4"]);
    const a1 = d.arboles[0];
    expect(a1.infraestructura).toEqual({ clasificacion: { codigo: "bajo", etiqueta: "Bajo" }, ajustada: false, puntaje: 3, porcentaje: 12.5 });
    expect(a1.componentes).toHaveLength(6);
    expect(a1.componentes[0]).toEqual({ componente: { codigo: "vereda", etiqueta: "Vereda" }, categoria: { codigo: "leve", etiqueta: "Leve" }, puntaje: 1, regla_id: "IN-VER-03", motivo: null });
    expect(a1.componentes.find((c: { componente: { codigo: string } }) => c.componente.codigo === "red_aerea")).toEqual(
      expect.objectContaining({ categoria: { codigo: "no_determinado", etiqueta: "No determinado" }, motivo: expect.stringContaining("CC-043") })
    );
    expect(d.arboles[1].infraestructura).toEqual(expect.objectContaining({ clasificacion: { codigo: "alto", etiqueta: "Alto" }, ajustada: true }));
    expect(a1.arbol.ubicacion).toEqual({ lng: -71.6, lat: -33.04 });
  });

  it("resumen por clasificación y por componente sobre los evaluados", async () => {
    const d = (await request(app).get(RUTA).set(auth)).body.data;
    const porCod = Object.fromEntries(d.resumen.por_clasificacion.map((c: { codigo: string; arboles: number }) => [c.codigo, c.arboles]));
    expect(porCod).toEqual(expect.objectContaining({ bajo: 1, alto: 1, moderado: 0 }));
    const vereda = d.resumen.por_componente.find((c: { componente: { codigo: string } }) => c.componente.codigo === "vereda");
    expect(vereda.categorias.find((c: { codigo: string }) => c.codigo === "leve").arboles).toBe(2);
    expect(vereda.sin_dato).toBe(0);
  });

  it("filtros: clasificación y componente+categoría filtran la lista, no el resumen", async () => {
    const d = (await request(app).get(RUTA).query({ clasificacion: "alto" }).set(auth)).body.data;
    expect(d.total_listados).toBe(1);
    expect(d.arboles[0].arbol.id).toBe("4");
    expect(d.resumen.por_clasificacion.find((c: { codigo: string }) => c.codigo === "bajo").arboles).toBe(1);
    const e = (await request(app).get(RUTA).query({ componente: "calzada", categoria: "sin_afectacion" }).set(auth)).body.data;
    expect(e.total_listados).toBe(2);
  });

  it("barrio: solo los árboles de ese sector", async () => {
    const d = (await request(app).get(RUTA).query({ barrio: "Barrio Puerto" }).set(auth)).body.data;
    expect(d.ambito).toEqual({ tipo: "barrio", barrio: "Barrio Puerto" });
    expect(d.arboles.map((a: { arbol: { id: string } }) => a.arbol.id)).toEqual(["4"]);
  });

  it.each([
    [{ clasificacion: "rojo" }, "clasificacion no es un valor de la lista (D-170)"],
    [{ componente: "vereda" }, "componente y categoria van juntos"],
    [{ componente: "puente", categoria: "leve" }, "componente no es un componente de M04"],
    [{ otra: "x" }, undefined],
  ])("query inválida %j: 400", async (q, mensaje) => {
    const res = await request(app).get(RUTA).query(q).set(auth);
    expect(res.status).toBe(400);
    if (mensaje) expect(res.body.error).toBe(mensaje);
  });

  it("lee las evaluaciones vigentes una sola vez (las reutiliza para el universo)", async () => {
    await request(app).get(RUTA).set(auth);
    expect(listarEvaluacionesVigentes).toHaveBeenCalledTimes(1);
  });
});
