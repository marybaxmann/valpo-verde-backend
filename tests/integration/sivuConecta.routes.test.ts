/**
 * Valpo Verde Conecta (#62; CC-062 / PR-022 v2.0): rutas públicas e
 * internas, con los repositorios simulados. Las funciones SQL (028) se
 * prueban en database/fase6/pruebas_028_conecta.sql.
 */
import request from "supertest";
import sharp from "sharp";
import { createHash } from "crypto";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/conecta.repository");
jest.mock("../../src/repositories/sivu/workOrder.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/workOrder.repository"),
  obtenerMiembrosDeProyecto: jest.fn(),
}));
jest.mock("../../src/repositories/sivu/photo.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/photo.repository"),
  subirArchivoAStorage: jest.fn(),
  eliminarArchivoDeStorage: jest.fn(),
  generarUrlFirmada: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import {
  crearIncidenciaCiudadana,
  listarIncidenciasProyecto,
  obtenerEstadoSeguimiento,
  obtenerFichaPublica,
  obtenerIncidencia,
  purgarHuellasVencidas,
  revisarIncidencia,
} from "../../src/repositories/sivu/conecta.repository";
import { eliminarArchivoDeStorage, subirArchivoAStorage } from "../../src/repositories/sivu/photo.repository";
import { obtenerMiembrosDeProyecto } from "../../src/repositories/sivu/workOrder.repository";
import { FAKE_TOKEN, INSPECTOR_ID, MUNICIPAL_ID, fakeAuthUser, inspectorProfileRow, municipalProfileRow } from "../helpers/authFixtures";

const mAuth = getAuthUserByToken as jest.Mock;
const mPerfil = findUserProfileById as jest.Mock;
const mMembresia = findMembership as jest.Mock;
const mFicha = obtenerFichaPublica as jest.Mock;
const mCrear = crearIncidenciaCiudadana as jest.Mock;
const mEstado = obtenerEstadoSeguimiento as jest.Mock;
const mPurgar = purgarHuellasVencidas as jest.Mock;
const mListar = listarIncidenciasProyecto as jest.Mock;
const mObtener = obtenerIncidencia as jest.Mock;
const mRevisar = revisarIncidencia as jest.Mock;
const mSubir = subirArchivoAStorage as jest.Mock;
const mBorrar = eliminarArchivoDeStorage as jest.Mock;
const mMiembros = obtenerMiembrosDeProyecto as jest.Mock;

const QR = "8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const INCIDENT_ID = "99999999-9999-4999-8999-999999999999";
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };

const FICHA = {
  especie_cientifica: "Acer pseudoplatanus",
  nombre_comun: "Falso plátano",
  ubicacion_descriptiva: "Plaza Victoria",
  sobre_la_especie: { especie_cientifica: "Acer pseudoplatanus", genero: "Acer", familia: "Sapindaceae", origen_biogeografico: "introducida", persistencia_follaje: "caducifolia", tipo_hoja: "latifoliada" },
};

let jpg: Buffer;
beforeAll(async () => {
  jpg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#3a7" } }).jpeg().toBuffer();
});

beforeEach(() => {
  mPurgar.mockResolvedValue(0);
});

function reportar(campos: Record<string, string>, fotos = 1) {
  let r = request(app).post(`/api/sivu/conecta/arboles/${QR}/incidencias`);
  for (const [k, v] of Object.entries(campos)) r = r.field(k, v);
  for (let i = 0; i < fotos; i++) r = r.attach("fotos", jpg, `foto${i}.jpg`);
  return r;
}

const REPORTE = { nombre_reportante: "María Pérez", rut_reportante: "12.345.678-5", tipo_incidencia: "rama_caida", descripcion: "Rama sobre la vereda" };

describe("GET /api/sivu/conecta/catalogos (público)", () => {
  it("sin sesión entrega solo tipo_incidencia con código y etiqueta (D-180)", async () => {
    const res = await request(app).get("/api/sivu/conecta/catalogos");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data)).toEqual(["tipo_incidencia"]);
    expect(res.body.data.tipo_incidencia).toHaveLength(9);
    expect(res.body.data.tipo_incidencia[0]).toEqual({ codigo: "rama_caida", etiqueta: "Rama caída", orden: 0, padre: null });
    expect(mAuth).not.toHaveBeenCalled();
  });

  it("/api/sivu/catalogs sigue exigiendo sesión", async () => {
    const res = await request(app).get("/api/sivu/catalogs");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/sivu/conecta/arboles/:qrToken (ficha pública)", () => {
  it("sin sesión, entrega solo especie, nombre común, ubicación y «Sobre esta especie» con etiquetas", async () => {
    mFicha.mockResolvedValue(FICHA);
    const res = await request(app).get(`/api/sivu/conecta/arboles/${QR}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["especie_cientifica", "nombre_comun", "sobre_la_especie", "ubicacion_descriptiva"]);
    expect(res.body.data.sobre_la_especie.origen_biogeografico).toEqual({ codigo: "introducida", etiqueta: "Introducida" });
    expect(JSON.stringify(res.body)).not.toMatch(/tree_code|utm|riesgo|project/);
  });

  it("QR inexistente y QR mal formado reciben la misma respuesta", async () => {
    mFicha.mockResolvedValue(null);
    const inexistente = await request(app).get(`/api/sivu/conecta/arboles/${QR}`);
    const malFormado = await request(app).get("/api/sivu/conecta/arboles/A-000346");
    expect(inexistente.status).toBe(404);
    expect(malFormado.status).toBe(404);
    expect(malFormado.body).toEqual(inexistente.body);
    expect(mFicha).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/sivu/conecta/arboles/:qrToken/incidencias (formulario ciudadano)", () => {
  it("crea el reporte, sube las fotos sin datos personales en la ruta y devuelve el código una sola vez", async () => {
    mFicha.mockResolvedValue(FICHA);
    mCrear.mockResolvedValue({ id: INCIDENT_ID, codigo_incidencia: "INC-000001", fecha_reporte: "2026-10-31" });

    const res = await reportar(REPORTE, 2);

    expect(res.status).toBe(201);
    const codigo: string = res.body.data.codigo_seguimiento;
    expect(codigo).toMatch(/^[A-Za-z0-9_-]{22}$/); // 128 bits en base64url
    expect(res.body.data).not.toHaveProperty("codigo_incidencia");
    expect(mSubir).toHaveBeenCalledTimes(2);
    for (const [ruta] of mSubir.mock.calls) expect(ruta).toMatch(/^incidencias\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    const input = mCrear.mock.calls[0][0];
    expect(input.rutReportante).toBe("12345678-5");
    // La base recibe la huella, nunca el código.
    expect(input.huellaHex).toBe(createHash("sha256").update(codigo).digest("hex"));
    expect(JSON.stringify(input)).not.toContain(codigo);
  });

  it("sin fotos: 400 y no se crea nada", async () => {
    const res = await reportar(REPORTE, 0);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/al menos una fotografía/);
    expect(mCrear).not.toHaveBeenCalled();
  });

  it("más de 3 fotos: 400", async () => {
    const res = await reportar(REPORTE, 4);
    expect(res.status).toBe(400);
    expect(mCrear).not.toHaveBeenCalled();
  });

  it("RUT inválido: 400 antes de subir nada", async () => {
    const res = await reportar({ ...REPORTE, rut_reportante: "12.345.678-9" });
    expect(res.status).toBe(400);
    expect(mSubir).not.toHaveBeenCalled();
  });

  it("si la creación falla, borra las fotos ya subidas", async () => {
    mFicha.mockResolvedValue(FICHA);
    mCrear.mockRejectedValue(new Error("El proyecto X está cerrado: solo consulta (RG fila 27; CC-042)"));
    const res = await reportar(REPORTE, 2);
    expect(res.status).toBe(409);
    expect(mBorrar).toHaveBeenCalledTimes(2);
  });

  it("QR inexistente: misma respuesta que la ficha", async () => {
    mFicha.mockResolvedValue(null);
    const res = await reportar(REPORTE);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("No encontramos este árbol.");
    expect(mSubir).not.toHaveBeenCalled();
  });
});

describe("POST /api/sivu/conecta/seguimiento", () => {
  const CODIGO = "AAAAAAAAAAAAAAAAAAAAAA";

  it("devuelve solo el estado, consultando por la huella y purgando antes", async () => {
    mEstado.mockResolvedValue("en_revision");
    const res = await request(app).post("/api/sivu/conecta/seguimiento").send({ codigo: CODIGO });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { estado_incidencia: { codigo: "en_revision", etiqueta: "En revisión" } } });
    expect(mEstado).toHaveBeenCalledWith(createHash("sha256").update(CODIGO).digest("hex"));
    expect(mPurgar).toHaveBeenCalled();
  });

  it("inexistente o vencido, mal formado y sin código: la misma respuesta", async () => {
    mEstado.mockResolvedValue(null);
    const inexistente = await request(app).post("/api/sivu/conecta/seguimiento").send({ codigo: CODIGO });
    const malFormado = await request(app).post("/api/sivu/conecta/seguimiento").send({ codigo: "abc" });
    const sinCodigo = await request(app).post("/api/sivu/conecta/seguimiento").send({});
    for (const r of [inexistente, malFormado, sinCodigo]) {
      expect(r.status).toBe(404);
      expect(r.body).toEqual(inexistente.body);
    }
  });
});

describe("B9 y revisión (internas)", () => {
  const fila = {
    id: INCIDENT_ID, codigo_incidencia: "INC-000001", tree_id: "t1", project_id: PROJECT_ID, tipo_incidencia: "rama_caida",
    descripcion: "Rama", estado_incidencia: "ingresada", origen_reporte: "comunidad", fecha_reporte: "2026-10-31", ubicacion: "Plaza",
    fecha_revision: null, revisado_por: null, resultado_revision: null, observaciones_revision: null, prioridad_municipal: null,
    fecha_actualizacion_estado: "2026-10-31T12:00:00Z",
    trees: { tree_code: "A-000346", especie_cientifica: "Acer pseudoplatanus", nombre_comun: "Falso plátano" },
    incident_reporters: { nombre_reportante: "María Pérez", rut_reportante: "12345678-5" },
  };

  function como(rol: "municipal" | "inspector") {
    if (rol === "municipal") {
      mAuth.mockResolvedValue(fakeAuthUser({ id: MUNICIPAL_ID }));
      mPerfil.mockResolvedValue(municipalProfileRow());
      mMembresia.mockResolvedValue({ project_id: PROJECT_ID, user_id: MUNICIPAL_ID });
    } else {
      mAuth.mockResolvedValue(fakeAuthUser({ id: INSPECTOR_ID }));
      mPerfil.mockResolvedValue(inspectorProfileRow());
      mMembresia.mockResolvedValue({ project_id: PROJECT_ID, user_id: INSPECTOR_ID });
    }
  }

  it("el Usuario municipal ve nombre y RUT", async () => {
    como("municipal");
    mListar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data[0].reportante).toEqual({ nombre: "María Pérez", rut: "12345678-5" });
    expect(res.body.data[0].tipo_incidencia).toEqual({ codigo: "rama_caida", etiqueta: "Rama caída" });
  });

  it("el Inspector no recibe nombre ni RUT aunque llegaran", async () => {
    como("inspector");
    mListar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data[0].reportante).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain("12345678-5");
  });

  it("filtros origen y tipo: se pasan al repositorio", async () => {
    como("inspector");
    mListar.mockResolvedValue({ filas: [], total: 0 });
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias?origen=comunidad&tipo=rama_caida&estado=ingresada`).set(auth);
    expect(res.status).toBe(200);
    expect(mListar).toHaveBeenLastCalledWith(FAKE_TOKEN, expect.objectContaining({ projectId: PROJECT_ID, estado: "ingresada", origen: "comunidad", tipo: "rama_caida" }));
  });

  it.each([["origen=vecino", "origen no es un valor de la lista (D-177)"], ["tipo=incendio", "tipo no es un valor de la lista (D-180)"]])(
    "filtro fuera de la lista (%s): 400",
    async (qs, mensaje) => {
      como("inspector");
      mListar.mockClear();
      const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias?${qs}`).set(auth);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(mensaje);
      expect(mListar).not.toHaveBeenCalled();
    }
  );

  it("campos nuevos: origen con etiqueta, cantidad_fotos, ot_derivadas ordenadas y revisor con nombre", async () => {
    como("inspector");
    const REVISOR = "44444444-4444-4444-8444-444444444444";
    mListar.mockResolvedValue({
      filas: [
        {
          ...fila,
          estado_incidencia: "derivada",
          resultado_revision: "requiere_antecedentes",
          revisado_por: REVISOR,
          photos: [{ count: 2 }],
          work_orders: [
            { id: "ot2", codigo_ot: "OT-I-000020", estado_ot: "pendiente", created_at: "2026-11-01T10:00:00Z" },
            { id: "ot1", codigo_ot: "OT-I-000010", estado_ot: "completada", created_at: "2026-10-31T10:00:00Z" },
          ],
        },
        { ...fila, id: "otra", revisado_por: "55555555-5555-4555-8555-555555555555", photos: [{ count: 0 }], work_orders: [] },
      ],
      total: 2,
    });
    mMiembros.mockResolvedValue([{ id: REVISOR, nombre: "Ana Municipal", rol: "usuario_municipal" }]);
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias`).set(auth);
    expect(res.status).toBe(200);
    const [a, b] = res.body.data;
    expect(a.origen_reporte).toEqual({ codigo: "comunidad", etiqueta: "Comunidad" });
    expect(a.cantidad_fotos).toBe(2);
    expect(a.revisado_por).toEqual({ id: REVISOR, nombre: "Ana Municipal" });
    expect(a.ot_derivadas).toEqual([
      { id: "ot1", codigo_ot: "OT-I-000010", estado: { codigo: "completada", etiqueta: expect.any(String) } },
      { id: "ot2", codigo_ot: "OT-I-000020", estado: { codigo: "pendiente", etiqueta: "Pendiente" } },
    ]);
    expect(b.revisado_por).toEqual({ id: "55555555-5555-4555-8555-555555555555", nombre: null, fuera_del_proyecto: true });
    expect(b.cantidad_fotos).toBe(0);
    expect(b.ot_derivadas).toEqual([]);
    expect(mMiembros).toHaveBeenCalledTimes(1);
  });

  it("sin revisor no consulta los miembros; sin datos de fotos ni OT: 0 y []", async () => {
    como("inspector");
    mMiembros.mockClear();
    mListar.mockResolvedValue({ filas: [fila], total: 1 });
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/incidencias`).set(auth);
    expect(res.body.data[0]).toEqual(expect.objectContaining({ revisado_por: null, cantidad_fotos: 0, ot_derivadas: [] }));
    expect(mMiembros).not.toHaveBeenCalled();
  });

  it("revisión: solo el Usuario municipal", async () => {
    como("inspector");
    const res = await request(app)
      .patch(`/api/sivu/projects/${PROJECT_ID}/incidencias/${INCIDENT_ID}/revision`)
      .set(auth)
      .send({ estado_incidencia: "en_revision", resultado_revision: "requiere_antecedentes" });
    expect(res.status).toBe(403);
    expect(mRevisar).not.toHaveBeenCalled();
  });

  it("revisión Descartada: borra los archivos de las fotos que devuelve la función", async () => {
    como("municipal");
    mObtener.mockResolvedValue(fila);
    mRevisar.mockResolvedValue({ id: INCIDENT_ID, fotos_borradas: ["incidencias/a/1.jpg", "incidencias/a/2.jpg"] });
    const res = await request(app)
      .patch(`/api/sivu/projects/${PROJECT_ID}/incidencias/${INCIDENT_ID}/revision`)
      .set(auth)
      .send({ estado_incidencia: "descartada", resultado_revision: "descartada" });
    expect(res.status).toBe(200);
    expect(res.body.data.fotos_borradas).toBe(2);
    expect(mBorrar).toHaveBeenCalledWith("incidencias/a/1.jpg");
    expect(mBorrar).toHaveBeenCalledWith("incidencias/a/2.jpg");
  });

  it("revisión rechazada por la función (SV071): 422", async () => {
    como("municipal");
    mObtener.mockResolvedValue(fila);
    mRevisar.mockRejectedValue(new Error("El usuario no es miembro", { cause: "SV071" }));
    const res = await request(app)
      .patch(`/api/sivu/projects/${PROJECT_ID}/incidencias/${INCIDENT_ID}/revision`)
      .set(auth)
      .send({ estado_incidencia: "en_revision", resultado_revision: "requiere_antecedentes" });
    expect(res.status).toBe(422);
  });

  it("placas QR: solo el Usuario municipal", async () => {
    como("inspector");
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/placas-qr`).set(auth);
    expect(res.status).toBe(403);
  });

  it("placas QR sin CONECTA_URL_BASE configurada: 503 con el motivo", async () => {
    como("municipal");
    const res = await request(app).get(`/api/sivu/projects/${PROJECT_ID}/placas-qr`).set(auth);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/CONECTA_URL_BASE/);
  });
});

// Al final: el contador de límites es por proceso y se agotaría para las demás pruebas.
describe("límites por IP (CC-062 punto 4)", () => {
  it("la consulta 31 de seguimiento en una hora se rechaza con 429", async () => {
    mEstado.mockResolvedValue(null);
    const respuestas: number[] = [];
    for (let i = 0; i < 31; i++) {
      respuestas.push((await request(app).post("/api/sivu/conecta/seguimiento").set("X-Forwarded-For", "203.0.113.9").send({ codigo: "x" })).status);
    }
    // Las de arriba ya consumieron algunas desde la IP local; esta IP empieza en cero.
    expect(respuestas.slice(0, 30).every((s) => s === 404)).toBe(true);
    expect(respuestas[30]).toBe(429);
  });
});
