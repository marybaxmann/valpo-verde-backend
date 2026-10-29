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
import { obtenerOrdenTrabajoPorId } from "../../src/repositories/sivu/workOrder.repository";
import {
  listarInspeccionesDeOt,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../src/repositories/sivu/inspection.repository";
import { FAKE_TOKEN, INSPECTOR_ID, fakeAuthUser, inspectorProfileRow } from "../helpers/authFixtures";

const mAuth = getAuthUserByToken as jest.Mock;
const mPerfil = findUserProfileById as jest.Mock;
const mMembresia = findMembership as jest.Mock;
const mOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mInspecciones = listarInspeccionesDeOt as jest.Mock;
const mVariables = obtenerVariablesBorrador as jest.Mock;
const mVersion = obtenerVersionArbolDeInspeccion as jest.Mock;

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const OT_ID = "66666666-6666-4666-8666-666666666666";
const INS_ID = "77777777-7777-4777-8777-777777777777";
const url = `/api/sivu/work-orders/${OT_ID}/inspections`;
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

beforeEach(() => {
  jest.resetAllMocks();
  mAuth.mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
  mPerfil.mockResolvedValue(inspectorProfileRow());
  mMembresia.mockResolvedValue({ project_id: PROJECT_ID, user_id: INSPECTOR_ID });
  mOt.mockResolvedValue({ id: OT_ID, project_id: PROJECT_ID, tipo_ot: "inspeccion", estado_ot: "en_ejecucion" });
  mInspecciones.mockResolvedValue([
    {
      id: INS_ID, tree_id: "t", codigo_inspeccion: "INS-000001", estado_registro: "preguardado",
      tipo_inspeccion_realizada: "evaluacion_inicial", subtipo_inspeccion: null, metodo_instrumental: null,
      fecha_inspeccion: "2026-10-29", observaciones: "parcial", inspector: INSPECTOR_ID, finalizada_at: null,
      motivo_anulacion: null, fecha_anulacion: null, created_at: "2026-10-29T10:00:00Z",
    },
  ]);
  mVariables.mockResolvedValue({ raices_expuestas: true });
  mVersion.mockResolvedValue({ camposRegistrados: ["dap_cm"], campos: { dap_cm: 31.5, altura_total_m: null } });
});

describe("GET /api/sivu/work-orders/:id/inspections (B17)", () => {
  it("exige JWT", async () => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  it("sin membresía en el proyecto: 403", async () => {
    mMembresia.mockResolvedValue(null);
    expect((await request(app).get(url).set(auth)).status).toBe(403);
  });

  it("OT inexistente: 404", async () => {
    mOt.mockResolvedValue(null);
    expect((await request(app).get(url).set(auth)).status).toBe(404);
  });

  it("devuelve el borrador: variables y solo los campos del árbol registrados", async () => {
    const res = await request(app).get(url).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        inspection_id: INS_ID,
        estado_registro: "preguardado",
        tipo_inspeccion_realizada: "evaluacion_inicial",
        observaciones: "parcial",
        variables: { raices_expuestas: true },
        campos_arbol: { dap_cm: 31.5 },
      }),
    ]);
    expect(mInspecciones).toHaveBeenCalledWith(FAKE_TOKEN, OT_ID);
  });

  it("sin evaluación ni versión del árbol todavía: objetos vacíos", async () => {
    mVariables.mockResolvedValue(null);
    mVersion.mockResolvedValue(null);
    const res = await request(app).get(url).set(auth);
    expect(res.body.data[0]).toMatchObject({ variables: {}, campos_arbol: {} });
  });
});
