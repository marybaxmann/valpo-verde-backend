import request from "supertest";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
jest.mock("../../src/repositories/sivu/inspection.repository");
jest.mock("../../src/repositories/sivu/diagnostico.repository");
jest.mock("../../src/repositories/sivu/species.repository");
import { buscarEspeciesPorNombre } from "../../src/repositories/sivu/species.repository";
import { listarEvaluacionesVigentes } from "../../src/repositories/sivu/diagnostico.repository";
jest.mock("../../src/repositories/sivu/cierreOt.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/cierreOt.repository"),
  listarInspeccionesFinalizadasDeOt: jest.fn(),
  obtenerComposicionPrevia: jest.fn(),
  listarAjustesDeInspecciones: jest.fn(),
  completarOt: jest.fn(),
  cancelarOt: jest.fn(),
  reasignarOt: jest.fn(),
  obtenerComposicionSinInspeccion: jest.fn(),
  obtenerUltimaInspeccionValidaSin: jest.fn(),
  anularInspeccion: jest.fn(),
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
  obtenerComposicionSinInspeccion,
  obtenerUltimaInspeccionValidaSin,
  anularInspeccion,
} from "../../src/repositories/sivu/cierreOt.repository";
import { obtenerArbolVigente, obtenerInspeccionPorId, obtenerVersionArbolDeInspeccion } from "../../src/repositories/sivu/inspection.repository";
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
const mInspeccion = obtenerInspeccionPorId as jest.Mock;
const mSinInspeccion = obtenerComposicionSinInspeccion as jest.Mock;
const mUltimaValida = obtenerUltimaInspeccionValidaSin as jest.Mock;
const mAnular = anularInspeccion as jest.Mock;

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
  it.each([
    [[], "no_determinado", "no_determinado"],
    [[{ clasificacion_riesgo_calculada: "extremo" }], "extremo", "critica"],
  ])("recalcula M05 con el riesgo vigente al completar Infraestructura", async (vigentes, riesgo, prioridad) => {
    mInspecciones.mockResolvedValue([{ id: INS_NUEVA, tree_id: TREE_ID, fecha_inspeccion: "2026-10-28",
      created_at: "2026-10-28T12:00:00Z", alcance_inspeccion: "infraestructura" }]);
    (listarEvaluacionesVigentes as jest.Mock).mockResolvedValue(vigentes);
    expect((await completar()).status).toBe(200);
    expect(mCompletar.mock.calls[0][2][0].resultado).toMatchObject({
      clasificacion_riesgo_calculada: riesgo,
      clasificacion_prioridad_calculada: prioridad,
    });
  });
  it("env?a al motor 3.2 el di?metro del fuste mayor al cerrar la OT", async () => {
    const version = jest.requireActual("../../src/services/rules/engine/version");
    const operativa = jest.replaceProperty(version, "RULE_VERSION_OPERATIVA", "3.2");
    try {
      jest.mocked(obtenerVersionArbolDeInspeccion).mockResolvedValue({
        campos: { dap_fustes_cm: [8, 9] },
        camposRegistrados: ["dap_fustes_cm"],
      });
      jest.mocked(obtenerArbolVigente).mockResolvedValue({
        multifustal: true, numero_fustes: 2, dap_fustes_cm: [30, 40], dap_cm: 12,
      });
      expect((await completar()).status).toBe(200);
      expect(mCompletar.mock.calls[0][2][0].resultado.calculados.consecuencias).toMatchObject({
        raicesCuello: { calculada: "significativa" },
        tronco: { calculada: "menor" },
        copaRamas: { calculada: "insignificante" },
      });
    } finally {
      operativa.restore();
    }
  });

  describe("CC-082: tipo de hoja al cerrar la OT", () => {
    const PHOENIX = { especie_cientifica: "Phoenix canariensis", tipo_hoja: "palmera" };
    const conVersion = (version: string) => {
      const motor = jest.requireActual("../../src/services/rules/engine/version");
      return jest.replaceProperty(motor, "RULE_VERSION_OPERATIVA", version);
    };

    it("palmera cuyo species_id solo lo registró la inspección: aplica PALM-01 (caso AV_000087)", async () => {
      const operativa = conVersion("3.4");
      try {
        jest.mocked(obtenerVersionArbolDeInspeccion).mockResolvedValue({
          campos: { especie_cientifica: "Phoenix canariensis", species_id: "sp-phoenix" },
          camposRegistrados: ["especie_cientifica", "species_id"],
        });
        // `trees` todavía sin vínculo al catálogo: pasa a tenerlo en la misma transacción que completa la OT.
        jest.mocked(obtenerArbolVigente).mockResolvedValue({ especie_cientifica: "Phoenix canariensis", species_id: null, tipo_hoja: null });
        jest.mocked(buscarEspeciesPorNombre).mockResolvedValue([PHOENIX] as never);
        expect((await completar()).status).toBe(200);
        expect(buscarEspeciesPorNombre).toHaveBeenCalledWith(FAKE_TOKEN, "Phoenix canariensis");
        const resultado = mCompletar.mock.calls[0][2][0].resultado;
        expect(resultado.rule_version).toBe("3.4");
        expect(resultado.indicadores).toMatchObject({ tipo: "palmera" });
        expect(resultado.indicadores).toHaveProperty("estipite");
        expect(resultado.indicadores).not.toHaveProperty("codominancia");
      } finally {
        operativa.restore();
      }
    });

    it("árbol con su especie del catálogo: sigue con las reglas de árboles sin buscar por nombre", async () => {
      const operativa = conVersion("3.4");
      try {
        jest.mocked(obtenerVersionArbolDeInspeccion).mockResolvedValue({ campos: {}, camposRegistrados: [] });
        jest.mocked(obtenerArbolVigente).mockResolvedValue({ especie_cientifica: "Platanus x hispanica", tipo_hoja: "latifoliada" });
        expect((await completar()).status).toBe(200);
        expect(buscarEspeciesPorNombre).not.toHaveBeenCalled();
        const { indicadores } = mCompletar.mock.calls[0][2][0].resultado;
        expect(indicadores).not.toHaveProperty("tipo");
        expect(indicadores).toHaveProperty("codominancia");
      } finally {
        operativa.restore();
      }
    });
  });

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

  it("falla el aviso del trigger (SV075, migración 033): 503 con mensaje claro; la cancelación se revirtió", async () => {
    mCancelar.mockRejectedValue(errorDb("SV075"));
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await cancelar({ motivo_cancelacion: "x" });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/no se aplicó/);
    err.mockRestore();
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

  it("falla el aviso del trigger (SV075): 503", async () => {
    mReasignar.mockRejectedValue(errorDb("SV075"));
    const err = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await reasignar({ responsable_accion_id: INSPECTOR_ID })).status).toBe(503);
    err.mockRestore();
  });

  it("responsable que no corresponde (SV067): 422", async () => {
    mReasignar.mockRejectedValue(errorDb("SV067"));
    expect((await reasignar({ responsable_accion_id: INSPECTOR_ID })).status).toBe(422);
  });
});

describe("POST /api/sivu/inspections/:id/anular (CC-067; CC-045 a)", () => {
  const anular = (body: unknown) => request(app).post(`/api/sivu/inspections/${INS_NUEVA}/anular`).set(auth).send(body as object);

  beforeEach(() => {
    mInspeccion.mockResolvedValue({ id: INS_NUEVA, work_order_id: OT_ID, tree_id: TREE_ID, estado_registro: "finalizado" });
    mAnular.mockResolvedValue({ inspection_id: INS_NUEVA, estado_registro: "anulado", vigente_recalculada: false });
  });

  it("el Inspector no anula: 403 (CC-067)", async () => {
    mAuth.mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
    mPerfil.mockResolvedValue(inspectorProfileRow());
    expect((await anular({ motivo_anulacion: "error de registro" })).status).toBe(403);
    expect(mAnular).not.toHaveBeenCalled();
  });

  it("motivo obligatorio: 400", async () => {
    expect((await anular({ motivo_anulacion: " " })).status).toBe(400);
  });

  it("inspección no finalizada: 422", async () => {
    mInspeccion.mockResolvedValue({ id: INS_NUEVA, work_order_id: OT_ID, tree_id: TREE_ID, estado_registro: "preguardado" });
    expect((await anular({ motivo_anulacion: "x" })).status).toBe(422);
  });

  it("OT sin completar: solo anula, sin evaluación", async () => {
    expect((await anular({ motivo_anulacion: "  dato equivocado " })).status).toBe(200);
    expect(mAnular).toHaveBeenCalledWith(INS_NUEVA, MUNICIPAL_ID, "dato equivocado", null);
    expect(mSinInspeccion).not.toHaveBeenCalled();
  });

  it("OT completada: envía la composición sin la inspección y los ajustes de la válida anterior", async () => {
    otEnEjecucion({ estado_ot: "completada" });
    mSinInspeccion.mockResolvedValue({ entradas_vigentes: { raices_expuestas: true }, origen_por_campo: { raices_expuestas: INS_VIEJA } });
    mUltimaValida.mockResolvedValue(INS_VIEJA);
    mAjustes.mockResolvedValue([]);
    mAnular.mockResolvedValue({ inspection_id: INS_NUEVA, estado_registro: "anulado", vigente_recalculada: true });
    expect((await anular({ motivo_anulacion: "x" })).status).toBe(200);
    expect(mSinInspeccion).toHaveBeenCalledWith(TREE_ID, INS_NUEVA);
    expect(mAjustes).toHaveBeenCalledWith([INS_VIEJA]);
    const evaluacion = mAnular.mock.calls[0][3];
    expect(evaluacion.composicion.origen_por_campo).toEqual({ raices_expuestas: INS_VIEJA });
    expect(evaluacion.resultado).toHaveProperty("rule_version");
    expect(evaluacion.resultado).not.toHaveProperty("entradas_vigentes");
  });

  it("OT completada de una palmera sin vínculo al catálogo: recalcula la vigente con PALM-01 (CC-082)", async () => {
    const motor = jest.requireActual("../../src/services/rules/engine/version");
    const operativa = jest.replaceProperty(motor, "RULE_VERSION_OPERATIVA", "3.4");
    try {
      otEnEjecucion({ estado_ot: "completada" });
      mSinInspeccion.mockResolvedValue({ entradas_vigentes: {}, origen_por_campo: {} });
      mUltimaValida.mockResolvedValue(null);
      jest.mocked(obtenerArbolVigente).mockResolvedValue({ especie_cientifica: "Phoenix canariensis", tipo_hoja: null });
      jest.mocked(buscarEspeciesPorNombre).mockResolvedValue([{ especie_cientifica: "Phoenix canariensis", tipo_hoja: "palmera" }] as never);
      expect((await anular({ motivo_anulacion: "x" })).status).toBe(200);
      expect(mAnular.mock.calls[0][3].resultado.indicadores).toMatchObject({ tipo: "palmera" });
    } finally {
      operativa.restore();
    }
  });

  it("OT completada sin otra inspección válida: no pide ajustes", async () => {
    otEnEjecucion({ estado_ot: "completada" });
    mSinInspeccion.mockResolvedValue({ entradas_vigentes: {}, origen_por_campo: {} });
    mUltimaValida.mockResolvedValue(null);
    expect((await anular({ motivo_anulacion: "x" })).status).toBe(200);
    expect(mAjustes).not.toHaveBeenCalled();
  });

  it("composición cambiada dos veces: 409; regla rechazada (SV069): 422", async () => {
    otEnEjecucion({ estado_ot: "completada" });
    mSinInspeccion.mockResolvedValue({ entradas_vigentes: {}, origen_por_campo: {} });
    mUltimaValida.mockResolvedValue(null);
    mAnular.mockRejectedValue(errorDb("SV068"));
    expect((await anular({ motivo_anulacion: "x" })).status).toBe(409);
    expect(mAnular).toHaveBeenCalledTimes(2);
    mAnular.mockReset().mockRejectedValue(errorDb("SV069"));
    expect((await anular({ motivo_anulacion: "x" })).status).toBe(422);
  });
});
