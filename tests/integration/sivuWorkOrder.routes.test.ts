import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
jest.mock("../../src/repositories/sivu/inspection.repository");

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  crearOrdenTrabajoInspeccion,
  obtenerOrdenTrabajoPorId,
  obtenerPrioridadVigenteDelArbol,
  transicionarEstadoOt,
} from "../../src/repositories/sivu/workOrder.repository";
import { guardarBorradorInspeccion, obtenerInspeccionPorId } from "../../src/repositories/sivu/inspection.repository";
import {
  FAKE_TOKEN,
  INSPECTOR_ID,
  MUNICIPAL_ID,
  fakeAuthUser,
  inspectorProfileRow,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mockGetAuthUserByToken = getAuthUserByToken as unknown as jest.Mock;
const mockFindUserProfileById = findUserProfileById as unknown as jest.Mock;
const mockFindMembership = findMembership as unknown as jest.Mock;
const mockCrearOt = crearOrdenTrabajoInspeccion as unknown as jest.Mock;
const mockObtenerOt = obtenerOrdenTrabajoPorId as unknown as jest.Mock;
const mockPrioridadVigente = obtenerPrioridadVigenteDelArbol as unknown as jest.Mock;
const mockTransicionar = transicionarEstadoOt as unknown as jest.Mock;
const mockGuardarBorrador = guardarBorradorInspeccion as unknown as jest.Mock;
const mockObtenerInspeccion = obtenerInspeccionPorId as unknown as jest.Mock;

const authHeader = { Authorization: `Bearer ${FAKE_TOKEN}` };
const PROJECT_ID = "33333333-3333-3333-3333-333333333333";
const TREE_ID = "44444444-4444-4444-4444-444444444444";
const WORK_ORDER_ID = "66666666-6666-6666-6666-666666666666";
const INSPECTION_ID = "77777777-7777-7777-7777-777777777777";

function authAsMunicipal(conMembresia: boolean) {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  mockFindUserProfileById.mockResolvedValue(municipalProfileRow());
  mockFindMembership.mockResolvedValue(conMembresia ? { project_id: PROJECT_ID, user_id: MUNICIPAL_ID } : null);
}

function authAsInspector(conMembresia: boolean) {
  mockGetAuthUserByToken.mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
  mockFindUserProfileById.mockResolvedValue(inspectorProfileRow());
  mockFindMembership.mockResolvedValue(conMembresia ? { project_id: PROJECT_ID, user_id: INSPECTOR_ID } : null);
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/sivu/projects/:id/work-orders — crear OT de Inspección (#58)", () => {
  it("usuario_municipal con membresía: 201", async () => {
    authAsMunicipal(true);
    mockCrearOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, estado_ot: "pendiente" });

    const res = await request(app)
      .post(`/api/sivu/projects/${PROJECT_ID}/work-orders`)
      .set(authHeader)
      .send({
        tree_id: TREE_ID,
        accion_solicitada: "evaluacion_inicial",
        prioridad: "media",
        responsable_accion_id: INSPECTOR_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: WORK_ORDER_ID, estado_ot: "pendiente" });
  });

  it("Inspector: 403 (solo usuario_municipal crea una OT)", async () => {
    authAsInspector(true);

    const res = await request(app)
      .post(`/api/sivu/projects/${PROJECT_ID}/work-orders`)
      .set(authHeader)
      .send({
        tree_id: TREE_ID,
        accion_solicitada: "evaluacion_inicial",
        prioridad: "media",
        responsable_accion_id: INSPECTOR_ID,
      });

    expect(res.status).toBe(403);
    expect(mockCrearOt).not.toHaveBeenCalled();
  });

  it("body inválido (sin accion_solicitada): 400 antes de llegar al service", async () => {
    authAsMunicipal(true);

    const res = await request(app)
      .post(`/api/sivu/projects/${PROJECT_ID}/work-orders`)
      .set(authHeader)
      .send({ tree_id: TREE_ID, responsable_accion_id: INSPECTOR_ID });

    expect(res.status).toBe(400);
    expect(mockCrearOt).not.toHaveBeenCalled();
  });

  it("sin prioridad y sin evaluación vigente: 422", async () => {
    authAsMunicipal(true);
    mockPrioridadVigente.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/sivu/projects/${PROJECT_ID}/work-orders`)
      .set(authHeader)
      .send({ tree_id: TREE_ID, accion_solicitada: "evaluacion_inicial", responsable_accion_id: INSPECTOR_ID });

    expect(res.status).toBe(422);
    expect(mockCrearOt).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/sivu/work-orders/:workOrderId/estado — transición (018g; CC-050)", () => {
  it("Inspector responsable: 200", async () => {
    authAsInspector(true);
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockTransicionar.mockResolvedValueOnce({ work_order_id: WORK_ORDER_ID, estado_ot: "en_ejecucion" });

    const res = await request(app)
      .patch(`/api/sivu/work-orders/${WORK_ORDER_ID}/estado`)
      .set(authHeader)
      .send({ estado: "en_ejecucion" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ work_order_id: WORK_ORDER_ID, estado_ot: "en_ejecucion" });
  });

  it("OT inexistente: 404", async () => {
    authAsInspector(true);
    mockObtenerOt.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/sivu/work-orders/${WORK_ORDER_ID}/estado`)
      .set(authHeader)
      .send({ estado: "en_ejecucion" });

    expect(res.status).toBe(404);
  });

  it("pasar a Programada sin fecha_accion_programada: 400 (Zod, D-241)", async () => {
    authAsInspector(true);

    const res = await request(app)
      .patch(`/api/sivu/work-orders/${WORK_ORDER_ID}/estado`)
      .set(authHeader)
      .send({ estado: "programada" });

    expect(res.status).toBe(400);
    expect(mockObtenerOt).not.toHaveBeenCalled();
  });
});

describe("POST /api/sivu/work-orders/:workOrderId/inspections — primer guardado (#58)", () => {
  it("Inspector responsable: 201", async () => {
    authAsInspector(true);
    mockObtenerOt.mockResolvedValueOnce({
      id: WORK_ORDER_ID,
      project_id: PROJECT_ID,
      tipo_ot: "inspeccion",
      tree_id: TREE_ID,
      accion_solicitada: "evaluacion_inicial",
    });
    mockGuardarBorrador.mockResolvedValueOnce({
      inspection_id: INSPECTION_ID,
      evaluation_id: "ev-1",
      tree_data_version_id: null,
      estado_registro: "preguardado",
    });

    const res = await request(app)
      .post(`/api/sivu/work-orders/${WORK_ORDER_ID}/inspections`)
      .set(authHeader)
      .send({ tipo_inspeccion_realizada: "evaluacion_inicial", variables: { raices_expuestas: true } });

    expect(res.status).toBe(201);
    expect(res.body.data.inspection_id).toBe(INSPECTION_ID);
  });

  it("una clave fuera del alcance de Monitoreo/Vitalidad: 400 (CC-040, antes del service)", async () => {
    authAsInspector(true);

    const res = await request(app)
      .post(`/api/sivu/work-orders/${WORK_ORDER_ID}/inspections`)
      .set(authHeader)
      .send({
        tipo_inspeccion_realizada: "monitoreo",
        subtipo_inspeccion: "vitalidad",
        variables: { ramas_quebradas: true },
      });

    expect(res.status).toBe(400);
    expect(mockObtenerOt).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/sivu/inspections/:inspectionId — guardados siguientes (#58)", () => {
  it("Inspector responsable: 200", async () => {
    authAsInspector(true);
    mockObtenerInspeccion.mockResolvedValueOnce({
      id: INSPECTION_ID,
      work_order_id: WORK_ORDER_ID,
      tree_id: TREE_ID,
      inspector: INSPECTOR_ID,
      estado_registro: "preguardado",
      fecha_inspeccion: "2026-10-25",
      fecha_registro: "2026-10-25",
    });
    mockObtenerOt.mockResolvedValueOnce({ id: WORK_ORDER_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion" });
    mockGuardarBorrador.mockResolvedValueOnce({
      inspection_id: INSPECTION_ID,
      evaluation_id: "ev-1",
      tree_data_version_id: null,
      estado_registro: "preguardado",
    });

    const res = await request(app)
      .patch(`/api/sivu/inspections/${INSPECTION_ID}`)
      .set(authHeader)
      .send({ tipo_inspeccion_realizada: "evaluacion_inicial", variables: { raices_expuestas: false } });

    expect(res.status).toBe(200);
    expect(res.body.data.inspection_id).toBe(INSPECTION_ID);
  });

  it("inspección inexistente: 404", async () => {
    authAsInspector(true);
    mockObtenerInspeccion.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/sivu/inspections/${INSPECTION_ID}`)
      .set(authHeader)
      .send({ tipo_inspeccion_realizada: "evaluacion_inicial", variables: {} });

    expect(res.status).toBe(404);
  });
});
