import request from "supertest";
jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/diagnostico.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { listarEvaluacionesDeInspecciones, listarInspeccionesFinalizadas } from "../../src/repositories/sivu/diagnostico.repository";
import { obtenerMiembrosDeProyecto } from "../../src/repositories/sivu/workOrder.repository";
import { FAKE_TOKEN, MUNICIPAL_ID, fakeAuthUser, municipalProfileRow } from "../helpers/authFixtures";

const P = "22222222-2222-4222-8222-222222222222";
const auth = getAuthUserByToken as jest.Mock;
const profile = findUserProfileById as jest.Mock;
const membership = findMembership as jest.Mock;
const ins = listarInspeccionesFinalizadas as jest.Mock;
const evs = listarEvaluacionesDeInspecciones as jest.Mock;
const miembros = obtenerMiembrosDeProyecto as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  profile.mockResolvedValue(municipalProfileRow());
  membership.mockResolvedValue({});
});
const get = (url: string) => request(app).get(url).set("Authorization", `Bearer ${FAKE_TOKEN}`);

describe("GET /api/sivu/catalogs (B15)", () => {
  it("exige JWT", async () => { expect((await request(app).get("/api/sivu/catalogs")).status).toBe(401); });
  it("entrega catálogos vigentes con código y etiqueta", async () => {
    const res = await get("/api/sivu/catalogs");
    expect(res.status).toBe(200);
    expect(res.body.data.clasificacion_riesgo).toContainEqual(expect.objectContaining({ codigo: "alto", etiqueta: "Alto" }));
    expect(res.body.data.tipo_ot).toBeDefined();
  });
});

describe("GET /api/sivu/projects/:id/assignable-members (B14)", () => {
  it("rechaza sin membresía", async () => {
    membership.mockResolvedValue(null);
    expect((await get(`/api/sivu/projects/${P}/assignable-members`)).status).toBe(403);
  });
  it("filtra por rol", async () => {
    miembros.mockResolvedValue([{ id: "a", nombre: "Ana", rol: "inspector" }, { id: "b", nombre: "Beto", rol: "usuario_municipal" }]);
    const res = await get(`/api/sivu/projects/${P}/assignable-members?rol=inspector`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: "a", nombre: "Ana", rol: "inspector" }]);
  });
  it("rechaza un rol desconocido", async () => {
    expect((await get(`/api/sivu/projects/${P}/assignable-members?rol=otro`)).status).toBe(400);
  });
});

describe("GET /api/sivu/projects/:id/diagnosticos (B18 mínimo)", () => {
  const fila = (id: string, tree: string, code: string, fin: string) => ({
    id, tree_id: tree, codigo_inspeccion: "INS-" + id, work_order_id: "w", tipo_inspeccion_realizada: "evaluacion_inicial",
    subtipo_inspeccion: null, fecha_inspeccion: "2026-10-27", finalizada_at: fin, requiere_mantenimiento: false,
    fecha_proxima_inspeccion: null, fecha_proximo_monitoreo: null,
    trees: { tree_code: code, project_id: P, especie_cientifica: null, nombre_comun: null },
  });
  it("una por árbol (la más reciente), finalizada, con etiquetas y ajuste prevaleciendo", async () => {
    ins.mockResolvedValue([fila("i2", "t1", "A-2", "2026-10-27T12:00:00Z"), fila("i1", "t1", "A-2", "2026-10-20T12:00:00Z"), fila("i3", "t2", "A-1", "2026-10-21T12:00:00Z")]);
    evs.mockResolvedValue([{
      inspection_id: "i2", probabilidad_falla_raices_cuello: "posible", probabilidad_falla_tronco: null, probabilidad_falla_copa_ramas: null,
      probabilidad_impacto: null, clasificacion_raices_cuello: "bajo", clasificacion_tronco: null, clasificacion_copa_ramas: null,
      clasificacion_riesgo_calculada: "moderado", clasificacion_riesgo_ajustada: "alto", puntaje_infraestructura: 3, pct_infraestructura: 25,
      clasificacion_infraestructura_calculada: null, clasificacion_infraestructura_ajustada: null,
      clasificacion_prioridad_calculada: "media", clasificacion_prioridad_ajustada: null, indicadores: null, rule_version: "2.1",
    }]);
    const res = await get(`/api/sivu/projects/${P}/diagnosticos`);
    expect(res.status).toBe(200);
    expect(evs).toHaveBeenCalledWith(FAKE_TOKEN, ["i2", "i3"]);
    expect(res.body.data.map((d: any) => d.tree_code)).toEqual(["A-1", "A-2"]);
    const d = res.body.data[1];
    expect(d.estado).toBe("finalizado");
    expect(d.resultado.clasificacion_riesgo).toEqual({ codigo: "alto", etiqueta: "Alto" });
    expect(d.resultado.riesgo_ajustado).toBe(true);
    expect(d.resultado.prioridad).toEqual({ codigo: "media", etiqueta: "Media" });
    expect(d.resultado.componentes.raices_cuello.probabilidad_falla).toEqual({ codigo: "posible", etiqueta: "Posible" });
    expect(res.body.data[0].resultado).toBeNull();
  });
  it("rechaza tree_id inválido", async () => {
    expect((await get(`/api/sivu/projects/${P}/diagnosticos?tree_id=x`)).status).toBe(400);
  });
});

describe("caché de la API", () => {
  it("responde con Cache-Control: no-store y sin ETag", async () => {
    const res = await get("/api/sivu/catalogs");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers.etag).toBeUndefined();
  });
});
