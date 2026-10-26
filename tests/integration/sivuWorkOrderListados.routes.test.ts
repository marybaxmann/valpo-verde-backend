import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/workOrder.repository"),
  listarOrdenesTrabajo: jest.fn(),
  obtenerArbolesDeOts: jest.fn(),
  obtenerProyectosDeOts: jest.fn(),
  obtenerMiembrosDeProyecto: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  listarOrdenesTrabajo,
  obtenerArbolesDeOts,
  obtenerMiembrosDeProyecto,
  obtenerProyectosDeOts,
} from "../../src/repositories/sivu/workOrder.repository";
import { FAKE_TOKEN, INSPECTOR_ID, MUNICIPAL_ID, fakeAuthUser, inspectorProfileRow, municipalProfileRow } from "../helpers/authFixtures";

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";

function auth(id: string, perfil: unknown, conMembresia = true) {
  (getAuthUserByToken as unknown as jest.Mock).mockResolvedValue(fakeAuthUser({ id }));
  (findUserProfileById as unknown as jest.Mock).mockResolvedValue(perfil);
  (findMembership as unknown as jest.Mock).mockResolvedValue(conMembresia ? { project_id: PROJECT_ID, user_id: id } : null);
}

beforeEach(() => {
  jest.clearAllMocks();
  (listarOrdenesTrabajo as jest.Mock).mockResolvedValue({ filas: [], total: 0 });
  (obtenerArbolesDeOts as jest.Mock).mockResolvedValue([]);
  (obtenerProyectosDeOts as jest.Mock).mockResolvedValue([]);
  (obtenerMiembrosDeProyecto as jest.Mock).mockResolvedValue([]);
});

describe("rutas de los listados de OT (B3, B4; CC-065)", () => {
  it.each([`/api/sivu/projects/${PROJECT_ID}/work-orders`, "/api/sivu/work-orders/mine"])("GET %s sin token: 401", async (ruta) => {
    expect((await request(app).get(ruta)).status).toBe(401);
  });

  it("B3: 200 con data, total, limit y offset; estado por defecto", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/work-orders`).set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0, limit: 50, offset: 0 });
    expect((listarOrdenesTrabajo as jest.Mock).mock.calls[0][1]).toMatchObject({
      projectId: PROJECT_ID,
      estados: ["pendiente", "programada", "en_ejecucion"],
    });
  });

  it("B3: estado, tipo_ot, limit y offset desde la query", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app)
      .get(`/api/sivu/projects/${PROJECT_ID}/work-orders`)
      .query({ estado: "completada,cancelada", tipo_ot: "mantenimiento", limit: "10", offset: "20" })
      .set(authHeader);
    expect(res.status).toBe(200);
    expect((listarOrdenesTrabajo as jest.Mock).mock.calls[0][1]).toMatchObject({
      estados: ["completada", "cancelada"],
      tipoOt: "mantenimiento",
      limit: 10,
      offset: 20,
    });
  });

  it("B3 sin membresía: 403", async () => {
    auth(INSPECTOR_ID, inspectorProfileRow(), false);
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/work-orders`).set(authHeader);
    expect(res.status).toBe(403);
    expect(listarOrdenesTrabajo).not.toHaveBeenCalled();
  });

  it("B4: 200 con las OT del usuario como responsable", async () => {
    auth(INSPECTOR_ID, inspectorProfileRow());
    const res = await request(app).get("/api/sivu/work-orders/mine").set(authHeader);
    expect(res.status).toBe(200);
    expect((listarOrdenesTrabajo as jest.Mock).mock.calls[0][1]).toMatchObject({
      responsableId: INSPECTOR_ID,
      tipoOt: "inspeccion",
    });
  });

  it.each([
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { estado: "vencida" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { estado: "" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { tipo_ot: "otra" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { limit: "0" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { limit: "201" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { offset: "-1" }],
    ["B3", `/api/sivu/projects/${PROJECT_ID}/work-orders`, { project_id: PROJECT_ID }],
    ["B4", "/api/sivu/work-orders/mine", { project_id: "no-es-uuid" }],
    ["B4", "/api/sivu/work-orders/mine", { orden: "fecha" }],
  ])("%s %s con %j: 400 (Zod)", async (_b, ruta, query) => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    const res = await request(app).get(ruta).query(query).set(authHeader);
    expect(res.status).toBe(400);
    expect(listarOrdenesTrabajo).not.toHaveBeenCalled();
  });

  it("B3 con un id de proyecto que no es uuid: 400", async () => {
    auth(MUNICIPAL_ID, municipalProfileRow());
    expect((await request(app).get("/api/sivu/projects/no-es-uuid/work-orders").set(authHeader)).status).toBe(400);
  });
});
