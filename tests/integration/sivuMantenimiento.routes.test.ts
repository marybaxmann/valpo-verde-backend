/**
 * Mantenimiento (#61; PR-020; migración 031): rutas con los repositorios
 * simulados. Las reglas de la base se prueban en
 * database/fase6/pruebas_031_mantenimiento.sql.
 */
import request from "supertest";
import sharp from "sharp";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/mantenimiento.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository");
jest.mock("../../src/repositories/sivu/photo.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/photo.repository"),
  subirArchivoAStorage: jest.fn(),
  eliminarArchivoDeStorage: jest.fn(),
  generarUrlFirmada: jest.fn().mockResolvedValue("https://firmada.example.test/foto"),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  cambiarInspectorRevisor,
  crearOtMantenimiento,
  listarEjecuciones,
  registrarEjecucion,
  revisarEjecucion,
} from "../../src/repositories/sivu/mantenimiento.repository";
import {
  listarOrdenesTrabajo,
  obtenerArbolesDeOts,
  obtenerMiembrosDeProyecto,
  obtenerOrdenTrabajoPorId,
  obtenerProyectosDeOts,
} from "../../src/repositories/sivu/workOrder.repository";
import { eliminarArchivoDeStorage, generarUrlFirmada, subirArchivoAStorage } from "../../src/repositories/sivu/photo.repository";
import { FAKE_TOKEN, INSPECTOR_ID, MUNICIPAL_ID, fakeAuthUser, inspectorProfileRow, municipalProfileRow } from "../helpers/authFixtures";

const mAuth = getAuthUserByToken as jest.Mock;
const mPerfil = findUserProfileById as jest.Mock;
const mMembresia = findMembership as jest.Mock;
const mOt = obtenerOrdenTrabajoPorId as jest.Mock;

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const TREE_ID = "44444444-4444-4444-8444-444444444444";
const OT_ID = "66666666-6666-4666-8666-666666666666";
const RECORD_ID = "77777777-7777-4777-8777-777777777777";
const ENCARGADO_ID = "88888888-8888-4888-8888-888888888888";
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

function como(rol: "municipal" | "inspector" | "encargado") {
  const id = rol === "municipal" ? MUNICIPAL_ID : rol === "inspector" ? INSPECTOR_ID : ENCARGADO_ID;
  mAuth.mockResolvedValue(fakeAuthUser({ id }));
  mPerfil.mockResolvedValue(
    rol === "municipal" ? municipalProfileRow() : rol === "inspector" ? inspectorProfileRow() : { id, nombre: "Encargado", activo: true, role: { nombre: "encargado_mantencion" } }
  );
  mMembresia.mockResolvedValue({ project_id: PROJECT_ID, user_id: id });
}

const otMantenimiento = (extra: Record<string, unknown> = {}) => ({
  id: OT_ID, project_id: PROJECT_ID, tree_id: TREE_ID, tipo_ot: "mantenimiento", estado_ot: "en_ejecucion",
  responsable_accion_id: ENCARGADO_ID, requiere_revision_inspector: true, ...extra,
});

const registro = (extra: Record<string, unknown> = {}) => ({
  id: RECORD_ID, codigo_mantenimiento: "MAN-000001", work_order_id: OT_ID, tree_id: TREE_ID, fecha_ejecucion: "2026-11-01",
  ejecutado_por: ENCARGADO_ID, accion_ejecutada: "tala_retiro", subtipo_ejecutado: "tala", resultado: "ejecutado_completamente",
  observaciones: null, requiere_seguimiento: false, fecha_seguimiento: null, estado_revision: "pendiente_revision", revisado_por: null,
  fecha_revision: null, observaciones_revision: null, requiere_correccion: null, fecha_limite_correccion: null, created_at: "2026-11-01T12:00:00Z",
  photos: [{ id: "f1", storage_path: "p/t/mantenimiento/f1.jpg", created_at: "2026-11-01T12:00:00Z" }], ...extra,
});

let jpg: Buffer;
beforeAll(async () => {
  jpg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#363" } }).jpeg().toBuffer();
});
beforeEach(() => {
  (generarUrlFirmada as jest.Mock).mockResolvedValue("https://firmada.example.test/foto");
});

describe("POST /api/sivu/projects/:id/work-orders/mantenimiento", () => {
  const body = { tree_id: TREE_ID, accion_solicitada: "tala_retiro", subtipo_accion: "tala", prioridad: "alta", responsable_accion_id: ENCARGADO_ID, inspector_revisor_id: INSPECTOR_ID };

  it("Usuario municipal: crea la OT con el revisor y la fecha de hoy", async () => {
    como("municipal");
    (crearOtMantenimiento as jest.Mock).mockResolvedValue({ id: OT_ID, codigo_ot: "OT-M-000001", estado_ot: "pendiente", requiere_revision_inspector: true, inspector_revisor_id: INSPECTOR_ID });
    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/work-orders/mantenimiento`).set(auth).send(body);
    expect(res.status).toBe(201);
    expect(crearOtMantenimiento).toHaveBeenCalledWith(expect.objectContaining({
      projectId: PROJECT_ID, accionSolicitada: "tala_retiro", subtipoAccion: "tala", inspectorRevisorId: INSPECTOR_ID, creadoPor: MUNICIPAL_ID,
      fechaCreacionOt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
  });

  it("sin prioridad: 400 (D-238)", async () => {
    como("municipal");
    const { prioridad: _p, ...sin } = body;
    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/work-orders/mantenimiento`).set(auth).send(sin);
    expect(res.status).toBe(400);
  });

  it("Inspector: 403", async () => {
    como("inspector");
    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/work-orders/mantenimiento`).set(auth).send(body);
    expect(res.status).toBe(403);
    expect(crearOtMantenimiento).not.toHaveBeenCalled();
  });

  it("regla rechazada por la base (SV072): 422", async () => {
    como("municipal");
    (crearOtMantenimiento as jest.Mock).mockRejectedValue(new Error("inspector_revisor_id es obligatorio", { cause: "SV072" }));
    const res = await request(app).post(`/api/sivu/projects/${PROJECT_ID}/work-orders/mantenimiento`).set(auth).send(body);
    expect(res.status).toBe(422);
  });
});

describe("POST /api/sivu/work-orders/:id/ejecuciones", () => {
  const campos = { fecha_ejecucion: "2026-11-01", accion_ejecutada: "tala_retiro", subtipo_ejecutado: "tala", resultado: "ejecutado_completamente", requiere_seguimiento: "false" };
  function enviar(fotos = 1, extra: Record<string, string> = {}) {
    let r = request(app).post(`/api/sivu/work-orders/${OT_ID}/ejecuciones`).set(auth);
    for (const [k, v] of Object.entries({ ...campos, ...extra })) r = r.field(k, v);
    for (let i = 0; i < fotos; i++) r = r.attach("fotos", jpg, `f${i}.jpg`);
    return r;
  }

  it("Encargado responsable: sube las fotos y registra la ejecución", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento());
    (registrarEjecucion as jest.Mock).mockResolvedValue({ id: RECORD_ID, codigo_mantenimiento: "MAN-000001", estado_revision: "pendiente_revision", estado_ot: "en_ejecucion" });
    const res = await enviar(2);
    expect(res.status).toBe(201);
    expect(subirArchivoAStorage).toHaveBeenCalledTimes(2);
    const input = (registrarEjecucion as jest.Mock).mock.calls[0][0];
    expect(input).toMatchObject({ workOrderId: OT_ID, usuario: ENCARGADO_ID, requiereSeguimiento: false, subtipoEjecutado: "tala" });
    expect(input.fotos).toHaveLength(2);
    for (const f of input.fotos) expect(f.storage_path).toMatch(new RegExp(`^${PROJECT_ID}/${TREE_ID}/mantenimiento/`));
  });

  it("sin fotos: 400 (D-224)", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento());
    const res = await enviar(0);
    expect(res.status).toBe(400);
    expect(registrarEjecucion).not.toHaveBeenCalled();
  });

  it("seguimiento sin fecha: 400 (D-223)", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento());
    const res = await enviar(1, { requiere_seguimiento: "true" });
    expect(res.status).toBe(400);
  });

  it("otro Encargado: 403", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento({ responsable_accion_id: "otro" }));
    const res = await enviar(1);
    expect(res.status).toBe(403);
  });

  it("la base rechaza (p. ej. ejecución pendiente, SV073): 422 y borra las fotos subidas", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento());
    (registrarEjecucion as jest.Mock).mockRejectedValue(new Error("Hay una ejecución pendiente de revisión", { cause: "SV073" }));
    const res = await enviar(1);
    expect(res.status).toBe(422);
    expect(eliminarArchivoDeStorage).toHaveBeenCalledTimes(1);
  });

  it("OT de Inspección: 422", async () => {
    como("encargado");
    mOt.mockResolvedValue(otMantenimiento({ tipo_ot: "inspeccion" }));
    const res = await enviar(1);
    expect(res.status).toBe(422);
  });
});

describe("GET /api/sivu/work-orders/:id/ejecuciones", () => {
  it("cualquier miembro: historial con etiquetas y fotos firmadas (incluye rechazadas)", async () => {
    como("municipal");
    mOt.mockResolvedValue(otMantenimiento());
    (listarEjecuciones as jest.Mock).mockResolvedValue([registro({ estado_revision: "rechazado" }), registro({ id: "r2" })]);
    const res = await request(app).get(`/api/sivu/work-orders/${OT_ID}/ejecuciones`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].estado_revision).toEqual({ codigo: "rechazado", etiqueta: "Rechazado" });
    expect(res.body.data[0].resultado).toEqual({ codigo: "ejecutado_completamente", etiqueta: "Ejecutado completamente" });
    expect(res.body.data[0].fotos[0].url).toBe("https://firmada.example.test/foto");
  });
});

describe("PATCH /api/sivu/work-orders/:id/ejecuciones/:recordId/revision", () => {
  const url = `/api/sivu/work-orders/${OT_ID}/ejecuciones/${RECORD_ID}/revision`;

  it("Inspector: aprueba y la respuesta trae el cambio de presencia", async () => {
    como("inspector");
    mOt.mockResolvedValue(otMantenimiento());
    (listarEjecuciones as jest.Mock).mockResolvedValue([registro()]);
    (revisarEjecucion as jest.Mock).mockResolvedValue({ id: RECORD_ID, estado_revision: "aprobado", estado_ot: "completada", estado_presencia: "talado" });
    const res = await request(app).patch(url).set(auth).send({ estado_revision: "aprobado", requiere_correccion: false });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado_ot: "completada", estado_presencia: "talado" });
    expect(revisarEjecucion).toHaveBeenCalledWith(expect.objectContaining({ recordId: RECORD_ID, usuario: INSPECTOR_ID, estadoRevision: "aprobado" }));
  });

  it("rechazar sin observaciones: 400 (D-228)", async () => {
    como("inspector");
    const res = await request(app).patch(url).set(auth).send({ estado_revision: "rechazado", requiere_correccion: false });
    expect(res.status).toBe(400);
  });

  it("no es el revisor asignado (SV074): 422", async () => {
    como("inspector");
    mOt.mockResolvedValue(otMantenimiento());
    (listarEjecuciones as jest.Mock).mockResolvedValue([registro()]);
    (revisarEjecucion as jest.Mock).mockRejectedValue(new Error("Solo el Inspector revisor asignado", { cause: "SV074" }));
    const res = await request(app).patch(url).set(auth).send({ estado_revision: "rechazado", observaciones_revision: "Falta", requiere_correccion: false });
    expect(res.status).toBe(422);
  });

  it("ejecución de otra OT: 404", async () => {
    como("inspector");
    mOt.mockResolvedValue(otMantenimiento());
    (listarEjecuciones as jest.Mock).mockResolvedValue([]);
    const res = await request(app).patch(url).set(auth).send({ estado_revision: "aprobado", requiere_correccion: false });
    expect(res.status).toBe(404);
  });

  it("Usuario municipal: 403", async () => {
    como("municipal");
    mOt.mockResolvedValue(otMantenimiento());
    const res = await request(app).patch(url).set(auth).send({ estado_revision: "aprobado", requiere_correccion: false });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/sivu/work-orders/revisiones y PATCH …/revisor", () => {
  it("Inspector: sus OT como revisor, con la ejecución pendiente", async () => {
    como("inspector");
    (listarOrdenesTrabajo as jest.Mock).mockResolvedValue({
      filas: [{ id: OT_ID, codigo_ot: "OT-M-000001", project_id: PROJECT_ID, tree_id: TREE_ID, tipo_ot: "mantenimiento", accion_solicitada: "tala_retiro",
        subtipo_accion: "tala", prioridad: "alta", estado_ot: "en_ejecucion", fecha_creacion_ot: "2026-11-01", fecha_accion_programada: "2026-11-01",
        fecha_completada_ot: null, responsable_accion_id: ENCARGADO_ID, requiere_revision_inspector: true, inspector_revisor_id: INSPECTOR_ID }],
      total: 1,
    });
    (obtenerArbolesDeOts as jest.Mock).mockResolvedValue([]);
    (obtenerProyectosDeOts as jest.Mock).mockResolvedValue([{ id: PROJECT_ID, nombre_proyecto: "P" }]);
    (obtenerMiembrosDeProyecto as jest.Mock).mockResolvedValue([{ id: INSPECTOR_ID, nombre: "Inspector" }, { id: ENCARGADO_ID, nombre: "Encargado" }]);
    (listarEjecuciones as jest.Mock).mockResolvedValue([registro()]);
    const res = await request(app).get("/api/sivu/work-orders/revisiones?solo_pendientes=true").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].inspector_revisor).toEqual({ id: INSPECTOR_ID, nombre: "Inspector" });
    expect(res.body.data[0].ejecucion_pendiente.id).toBe(RECORD_ID);
    expect((listarOrdenesTrabajo as jest.Mock).mock.calls[0][1]).toMatchObject({ inspectorRevisorId: INSPECTOR_ID, tipoOt: "mantenimiento" });
  });

  it("revisiones para otro rol: 403", async () => {
    como("municipal");
    const res = await request(app).get("/api/sivu/work-orders/revisiones").set(auth);
    expect(res.status).toBe(403);
  });

  it("cambiar revisor: Usuario municipal", async () => {
    como("municipal");
    mOt.mockResolvedValue(otMantenimiento());
    (cambiarInspectorRevisor as jest.Mock).mockResolvedValue({ work_order_id: OT_ID, inspector_revisor_id: INSPECTOR_ID });
    const res = await request(app).patch(`/api/sivu/work-orders/${OT_ID}/revisor`).set(auth).send({ inspector_revisor_id: INSPECTOR_ID });
    expect(res.status).toBe(200);
    expect(cambiarInspectorRevisor).toHaveBeenCalledWith(OT_ID, INSPECTOR_ID, MUNICIPAL_ID);
  });
});
