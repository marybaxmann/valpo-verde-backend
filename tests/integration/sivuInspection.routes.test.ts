import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
jest.mock("../../src/repositories/sivu/photo.repository");
jest.mock("../../src/repositories/sivu/inspection.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/inspection.repository"),
  obtenerInspeccionPorId: jest.fn(),
  obtenerVariablesBorrador: jest.fn(),
  obtenerVersionArbolDeInspeccion: jest.fn(),
  obtenerArbolVigente: jest.fn(),
  obtenerEntradasVigentes: jest.fn(),
  obtenerFechaProximaInspeccionVigente: jest.fn(),
  finalizarInspeccion: jest.fn(),
  guardarBorradorInspeccion: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { obtenerOrdenTrabajoPorId } from "../../src/repositories/sivu/workOrder.repository";
import { listarFotosPorInspeccion } from "../../src/repositories/sivu/photo.repository";
import {
  finalizarInspeccion,
  obtenerArbolVigente,
  obtenerEntradasVigentes,
  obtenerFechaProximaInspeccionVigente,
  obtenerInspeccionPorId,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../src/repositories/sivu/inspection.repository";
import { FAKE_TOKEN, INSPECTOR_ID, fakeAuthUser, inspectorProfileRow } from "../helpers/authFixtures";

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const TREE_ID = "44444444-4444-4444-4444-444444444444";
const WORK_ORDER_ID = "66666666-6666-6666-6666-666666666666";
const INSPECTION_ID = "77777777-7777-7777-7777-777777777777";
const HUELLA = "a".repeat(64);

function authAsInspector() {
  (getAuthUserByToken as unknown as jest.Mock).mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
  (findUserProfileById as unknown as jest.Mock).mockResolvedValue(inspectorProfileRow());
  (findMembership as unknown as jest.Mock).mockResolvedValue({ project_id: PROJECT_ID, user_id: INSPECTOR_ID });
}

/** Inspección de Monitoreo Vitalidad sin la vitalidad: incompleta. */
function inspeccionIncompleta() {
  (obtenerInspeccionPorId as jest.Mock).mockResolvedValue({
    id: INSPECTION_ID,
    work_order_id: WORK_ORDER_ID,
    tree_id: TREE_ID,
    inspector: INSPECTOR_ID,
    estado_registro: "preguardado",
    tipo_inspeccion_realizada: "monitoreo",
    subtipo_inspeccion: "vitalidad",
    fecha_inspeccion: "2026-10-26",
  });
  (obtenerOrdenTrabajoPorId as unknown as jest.Mock).mockResolvedValue({
    id: WORK_ORDER_ID,
    project_id: PROJECT_ID,
    tree_id: TREE_ID,
    tipo_ot: "inspeccion",
    accion_solicitada: "monitoreo",
    estado_ot: "en_ejecucion",
    responsable_accion_id: INSPECTOR_ID,
  });
  (obtenerVariablesBorrador as jest.Mock).mockResolvedValue({});
  (obtenerVersionArbolDeInspeccion as jest.Mock).mockResolvedValue(null);
  (obtenerArbolVigente as jest.Mock).mockResolvedValue({ especie_cientifica: "Quillaja saponaria" });
  (obtenerEntradasVigentes as jest.Mock).mockResolvedValue({});
  (obtenerFechaProximaInspeccionVigente as jest.Mock).mockResolvedValue(null);
  (listarFotosPorInspeccion as unknown as jest.Mock).mockResolvedValue([]);
}

beforeEach(() => jest.clearAllMocks());

describe("rutas de cierre de la inspección (#59/#72)", () => {
  it.each(["calcular", "finalizar"])("POST /%s sin token: 401", async (accion) => {
    const res = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/${accion}`).send({});
    expect(res.status).toBe(401);
  });

  it.each(["calcular", "finalizar"])("POST /%s con un id que no es uuid: 400", async (accion) => {
    authAsInspector();
    const res = await request(app).post(`/api/sivu/inspections/no-es-uuid/${accion}`).set(authHeader).send({ huella: HUELLA });
    expect(res.status).toBe(400);
  });

  it("POST /calcular: 200 sin body, con los campos faltantes y la huella, sin escribir nada", async () => {
    authAsInspector();
    inspeccionIncompleta();
    const res = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/calcular`).set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.puede_finalizar).toBe(false);
    expect(res.body.data.campos_faltantes.map((f: { campo: string }) => f.campo)).toEqual(["clasificacion_vitalidad"]);
    expect(res.body.data.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(finalizarInspeccion).not.toHaveBeenCalled();
  });

  it("POST /finalizar con la huella de /calcular y un faltante: 200, finalizada = false, sin llamar a la función", async () => {
    authAsInspector();
    inspeccionIncompleta();
    const calculo = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/calcular`).set(authHeader).send({});
    const res = await request(app)
      .post(`/api/sivu/inspections/${INSPECTION_ID}/finalizar`)
      .set(authHeader)
      .send({ huella: calculo.body.data.huella });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ finalizada: false, estado_registro: "preguardado" });
    expect(finalizarInspeccion).not.toHaveBeenCalled();
  });

  it("POST /finalizar con otra huella: 409", async () => {
    authAsInspector();
    inspeccionIncompleta();
    const res = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/finalizar`).set(authHeader).send({ huella: HUELLA });
    expect(res.status).toBe(409);
  });

  it.each([
    ["sin huella", {}],
    ["huella con otro formato", { huella: "abc" }],
    ["fecha inexistente", { huella: HUELLA, fecha_proxima_inspeccion: "2027-02-30" }],
    ["fecha con otro formato", { huella: HUELLA, fecha_proximo_monitoreo: "10/01/2027" }],
    ["ajuste a No determinado", { huella: HUELLA, ajustes: { clasificacion_riesgo: { valor_ajustado: "no_determinado", justificacion_ajuste_clasificacion: "x" } } }],
    ["ajuste a No aplica", { huella: HUELLA, ajustes: { clasificacion_infraestructura: { valor_ajustado: "no_aplica", justificacion_ajuste_clasificacion: "x" } } }],
    ["ajuste sin justificación", { huella: HUELLA, ajustes: { clasificacion_prioridad: { valor_ajustado: "alta" } } }],
    ["ajuste de un campo no ajustable", { huella: HUELLA, ajustes: { clasificacion_vitalidad: { valor_ajustado: "muerto", justificacion_ajuste_clasificacion: "x" } } }],
    ["justificación de fecha vacía", { huella: HUELLA, justificacion_ajuste_fecha: "  " }],
    ["clave desconocida", { huella: HUELLA, estado_registro: "finalizado" }],
  ])("POST /finalizar, %s: 400 (Zod)", async (_caso, body) => {
    authAsInspector();
    const res = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/finalizar`).set(authHeader).send(body);
    expect(res.status).toBe(400);
    expect(obtenerInspeccionPorId).not.toHaveBeenCalled();
  });

  it("POST /calcular con una clave desconocida: 400 (Zod)", async () => {
    authAsInspector();
    const res = await request(app).post(`/api/sivu/inspections/${INSPECTION_ID}/calcular`).set(authHeader).send({ huella: HUELLA });
    expect(res.status).toBe(400);
  });
});
