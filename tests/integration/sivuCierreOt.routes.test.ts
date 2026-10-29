import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
jest.mock("../../src/repositories/sivu/cierreOt.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/cierreOt.repository"),
  listarInspeccionesFinalizadasDeOt: jest.fn(),
  obtenerComposicionPrevia: jest.fn(),
  listarAjustesDeInspecciones: jest.fn(),
  completarOt: jest.fn(),
  cancelarOt: jest.fn(),
  reasignarOt: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { obtenerOrdenTrabajoPorId } from "../../src/repositories/sivu/workOrder.repository";
import {
  cancelarOt,
  completarOt,
  listarAjustesDeInspecciones,
  listarInspeccionesFinalizadasDeOt,
  obtenerComposicionPrevia,
  reasignarOt,
} from "../../src/repositories/sivu/cierreOt.repository";
import { FAKE_TOKEN, INSPECTOR_ID, MUNICIPAL_ID, fakeAuthUser, inspectorProfileRow, municipalProfileRow } from "../helpers/authFixtures";

const mAuth = getAuthUserByToken as jest.Mock;
const mPerfil = findUserProfileById as jest.Mock;
const mMembresia = findMembership as jest.Mock;
const mOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mInspecciones = listarInspeccionesFinalizadasDeOt as jest.Mock;
const mComposicion = obtenerComposicionPrevia as jest.Mock;
const mAjustes = listarAjustesDeInspecciones as jest.Mock;
const mCompletar = completarOt as jest.Mock;
const mCancelar = cancelarOt as jest.Mock;
const mReasignar = reasignarOt as jest.Mock;

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const TREE_ID = "44444444-4444-4444-8444-444444444444";
const OT_ID = "66666666-6666-4666-8666-666666666666";
const INS_VIEJA = "77777777-7777-4777-8777-777777777771";
const INS_NUEVA = "77777777-7777-4777-8777-777777777772";
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

function comoMunicipal() {
  mAuth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
  mPerfil.mockResolvedValue(municipalProfileRow());
  mMembresia.mockResolvedValue({ project_id: PROJECT_ID, user_id: MUNICIPAL_ID });
}

function otEnEjecucion(extra: Record<string, unknown> = {}) {
  mOt.mockResolvedValue({ id: OT_ID, project_id: PROJECT_ID, tree_id: TREE_ID, tipo_ot: "inspeccion", estado_ot: "en_ejecucion", ...extra });
}

function errorDb(code: string, message = "rechazado") {
  return new Error(message, { cause: code });
}

beforeEach(() => {
  jest.resetAllMocks();
  comoMunicipal();
  otEnEjecucion();
  mInspecciones.mockResolvedValue([
    { id: INS_VIEJA, tree_id: TREE_ID, fecha_inspeccion: "2026-10-20", created_at: "2026-10-20T10:00:00Z" },
    { id: INS_NUEVA, tree_id: TREE_ID, fecha_inspeccion: "2026-10-28", created_at: "2026-10-28T10:00:00Z" },
  ]);
  mComposicion.mockResolvedValue({ entradas_vigentes: { raices_expuestas: false }, origen_por_campo: { raices_expuestas: INS_NUEVA } });
  mAjustes.mockResolvedValue([]);
  mCompletar.mockResolvedValue({ work_order_id: OT_ID, estado_ot: "completada", fecha_completada_ot: "2026-10-29", tree_ids: [TREE_ID] });
});

const completar = () => request(app).post(`/api/sivu/work-orders/${OT_ID}/completar`).set(auth);

describe("POST /api/sivu/work-orders/:id/completar (#60; ADR-017 v1.2)", () => {
  it("exige JWT", async () => {
    expect((await request(app).post(`/api/sivu/work-orders/${OT_ID}/completar`)).status).toBe(401);
  });

  it("el Inspector no completa: 403", async () => {
    mAuth.mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
    mPerfil.mockResolvedValue(inspectorProfileRow());
    expect((await completar()).status).toBe(403);
    expect(mCompletar).not.toHaveBeenCalled();
  });

  it("no recibe datos: la fecha la asigna el Sistema (D-242)", async () => {
    expect((await completar().send({ fecha_completada_ot: "2026-01-01" })).status).toBe(400);
  });

  it("OT de Mantenimiento u OT que no está En ejecución: 422 sin escribir", async () => {
    otEnEjecucion({ tipo_ot: "mantenimiento" });
    expect((await completar()).status).toBe(422);
    otEnEjecucion({ estado_ot: "programada" });
    expect((await completar()).status).toBe(422);
    expect(mCompletar).not.toHaveBeenCalled();
  });

  it("envía por árbol la composición leída y el resultado del motor, con los ajustes de la última inspección", async () => {
    mAjustes.mockResolvedValue([
      { id: "aj-1", campo: "clasificacion_riesgo", valor_calculado: "alto", valor_ajustado: "extremo", fecha_ajuste: "2026-10-28T11:00:00Z", inspection_id: INS_NUEVA },
    ]);
    const res = await completar();
    expect(res.status).toBe(200);
    expect(res.body.data.estado_ot).toBe("completada");
    expect(mAjustes).toHaveBeenCalledWith([INS_NUEVA]);
    expect(mComposicion).toHaveBeenCalledWith(TREE_ID, OT_ID);
    const [ot, usuario, evaluaciones] = mCompletar.mock.calls[0];
    expect([ot, usuario]).toEqual([OT_ID, MUNICIPAL_ID]);
    expect(evaluaciones).toHaveLength(1);
    expect(evaluaciones[0].tree_id).toBe(TREE_ID);
    expect(evaluaciones[0].composicion).toEqual({ entradas_vigentes: { raices_expuestas: false }, origen_por_campo: { raices_expuestas: INS_NUEVA } });
    expect(evaluaciones[0].resultado).not.toHaveProperty("entradas_vigentes");
    expect(evaluaciones[0].resultado).toHaveProperty("rule_version");
    expect(evaluaciones[0].resultado).toHaveProperty("clasificacion_riesgo_calculada");
    // El ajuste se mantiene o se descarta según el motor (CC-040 d); en ambos casos queda registrado.
    const r = evaluaciones[0].resultado;
    expect(r.adjustment_ids.includes("aj-1") || r.ajustes_descartados.some((d: { adjustmentId: string }) => d.adjustmentId === "aj-1")).toBe(true);
  });

  it("si la composición cambió (SV068) recalcula una vez y completa", async () => {
    mCompletar.mockRejectedValueOnce(errorDb("SV068"));
    expect((await completar()).status).toBe(200);
    expect(mCompletar).toHaveBeenCalledTimes(2);
    expect(mComposicion).toHaveBeenCalledTimes(2);
  });

  it("si vuelve a cambiar: 409", async () => {
    mCompletar.mockRejectedValue(errorDb("SV068"));
    expect((await completar()).status).toBe(409);
  });

  it("regla rechazada por la función (SV065): 422", async () => {
    mCompletar.mockRejectedValue(errorDb("SV065", "tiene inspecciones en Preguardado"));
    const res = await completar();
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("Preguardado");
  });

  it("sin inspecciones finalizadas: 422 sin llamar a la función", async () => {
    mInspecciones.mockResolvedValue([]);
    expect((await completar()).status).toBe(422);
    expect(mCompletar).not.toHaveBeenCalled();
  });
});

describe("POST /api/sivu/work-orders/:id/cancelar (CC-050)", () => {
  const cancelar = (body: unknown) => request(app).post(`/api/sivu/work-orders/${OT_ID}/cancelar`).set(auth).send(body as object);

  it("motivo obligatorio: 400", async () => {
    expect((await cancelar({})).status).toBe(400);
    expect((await cancelar({ motivo_cancelacion: "   " })).status).toBe(400);
  });

  it("cancela con el motivo sin espacios sobrantes", async () => {
    mCancelar.mockResolvedValue({ work_order_id: OT_ID, estado_ot: "cancelada" });
    expect((await cancelar({ motivo_cancelacion: "  árbol retirado por terceros " })).status).toBe(200);
    expect(mCancelar).toHaveBeenCalledWith(OT_ID, "árbol retirado por terceros", MUNICIPAL_ID);
  });

  it("estado no cancelable (SV066): 422", async () => {
    mCancelar.mockRejectedValue(errorDb("SV066"));
    expect((await cancelar({ motivo_cancelacion: "x" })).status).toBe(422);
  });
});

describe("PATCH /api/sivu/work-orders/:id/responsable (CC-050; D-244)", () => {
  const reasignar = (body: unknown) => request(app).patch(`/api/sivu/work-orders/${OT_ID}/responsable`).set(auth).send(body as object);

  it("responsable inválido: 400", async () => {
    expect((await reasignar({ responsable_accion_id: "x" })).status).toBe(400);
  });

  it("reasigna", async () => {
    mReasignar.mockResolvedValue({ work_order_id: OT_ID, responsable_accion_id: INSPECTOR_ID });
    expect((await reasignar({ responsable_accion_id: INSPECTOR_ID })).status).toBe(200);
    expect(mReasignar).toHaveBeenCalledWith(OT_ID, INSPECTOR_ID, MUNICIPAL_ID);
  });

  it("responsable que no corresponde (SV067): 422", async () => {
    mReasignar.mockRejectedValue(errorDb("SV067"));
    expect((await reasignar({ responsable_accion_id: INSPECTOR_ID })).status).toBe(422);
  });
});
