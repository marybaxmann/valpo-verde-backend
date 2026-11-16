/**
 * Ficha pública editable (CC-073; PR-022 v3.0, PR-004 v8.0): rutas
 * internas con los repositorios simulados. Las funciones SQL de la 037 se
 * prueban en database/fase6/pruebas_037_ficha_publica.sql.
 */
import request from "supertest";
import sharp from "sharp";

jest.mock("../../src/repositories/auth.repository");
jest.mock("../../src/repositories/userProfile.repository");
jest.mock("../../src/repositories/projectMember.repository");
jest.mock("../../src/repositories/sivu/conecta.repository");
jest.mock("../../src/repositories/sivu/species.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/species.repository"),
  obtenerEspeciePorId: jest.fn(),
}));
jest.mock("../../src/repositories/sivu/fichaPublica.repository", () => ({
  ...jest.requireActual("../../src/repositories/sivu/fichaPublica.repository"),
  obtenerContenidoEspecie: jest.fn(),
  guardarContenidoEspecie: jest.fn(),
  fijarFotoEspecie: jest.fn(),
  obtenerFichaArbol: jest.fn(),
  obtenerArbolParaFicha: jest.fn(),
  guardarFichaArbol: jest.fn(),
  fijarFotoArbol: jest.fn(),
  subirFotoPublica: jest.fn(),
  borrarFotosPublicas: jest.fn(),
}));

import app from "../../src/app";
import { getAuthUserByToken } from "../../src/repositories/auth.repository";
import { findUserProfileById } from "../../src/repositories/userProfile.repository";
import { findMembership } from "../../src/repositories/projectMember.repository";
import { obtenerFichaPublica } from "../../src/repositories/sivu/conecta.repository";
import { obtenerEspeciePorId } from "../../src/repositories/sivu/species.repository";
import {
  borrarFotosPublicas,
  fijarFotoArbol,
  fijarFotoEspecie,
  guardarContenidoEspecie,
  guardarFichaArbol,
  obtenerArbolParaFicha,
  obtenerContenidoEspecie,
  obtenerFichaArbol,
  subirFotoPublica,
} from "../../src/repositories/sivu/fichaPublica.repository";
import {
  ADMIN_ID,
  FAKE_TOKEN,
  INSPECTOR_ID,
  MUNICIPAL_ID,
  adminProfileRow,
  fakeAuthUser,
  inspectorProfileRow,
  municipalProfileRow,
} from "../helpers/authFixtures";

const mAuth = getAuthUserByToken as jest.Mock;
const mPerfil = findUserProfileById as jest.Mock;
const mMembresia = findMembership as jest.Mock;
const mFichaPublica = obtenerFichaPublica as jest.Mock;
const mEspecie = obtenerEspeciePorId as jest.Mock;
const mContenido = obtenerContenidoEspecie as jest.Mock;
const mGuardar = guardarContenidoEspecie as jest.Mock;
const mFijarEspecie = fijarFotoEspecie as jest.Mock;
const mFichaArbol = obtenerFichaArbol as jest.Mock;
const mArbol = obtenerArbolParaFicha as jest.Mock;
const mGuardarArbol = guardarFichaArbol as jest.Mock;
const mFijarArbol = fijarFotoArbol as jest.Mock;
const mSubir = subirFotoPublica as jest.Mock;
const mBorrar = borrarFotosPublicas as jest.Mock;

const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const OTRO_PROYECTO = "44444444-4444-4444-8444-444444444444";
const SPECIES_ID = "66666666-6666-4666-8666-666666666666";
const TREE_ID = "77777777-7777-4777-8777-777777777777";
const QR = "8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e";
const auth = { Authorization: `Bearer ${FAKE_TOKEN}` };
const base = `/api/sivu/projects/${PROJECT_ID}`;

function como(rol: "municipal" | "inspector" | "admin", miembro = true) {
  const id = { municipal: MUNICIPAL_ID, inspector: INSPECTOR_ID, admin: ADMIN_ID }[rol];
  mAuth.mockResolvedValue(fakeAuthUser({ id }));
  mPerfil.mockResolvedValue({ municipal: municipalProfileRow, inspector: inspectorProfileRow, admin: adminProfileRow }[rol]());
  mMembresia.mockResolvedValue(miembro ? { project_id: PROJECT_ID, user_id: id } : null);
}

const CONTENIDO = {
  nombre_comun_visualizacion: "Falso plátano",
  articulo_nombre: "el",
  curiosidad: "¡Mi nombre engaña! Soy un arce.",
  aportes: [{ icono: "sombra", titulo: "Gran sombra" }],
  quien_soy: "Vengo de Europa.",
  rasgos: [{ id: "hoja", etiqueta: "Hoja", texto: "Cinco lóbulos." }],
  anio_estacional: { prim: "Brotes", ver: "Semillas", oto: "Se caen", inv: "Descanso" },
  ciclo: null,
  historia_especie: "Corteza en placas.",
  consejo: "No excaves junto a mi tronco.",
  fuentes: [
    { bloques: ["curiosidad"], tema: "Arce", referencia: "RHS 269" },
    { bloques: ["historia_especie"], tema: "Corteza", referencia: "Oregon State University", enlace: "https://example.org/a" },
  ],
};

const FILA = {
  species_id: SPECIES_ID,
  ...CONTENIDO,
  rasgos: [{ id: "hoja", etiqueta: "Hoja", texto: "Cinco lóbulos.", foto_path: "especies/h.webp", credito: "Valpo Verde, levantamiento 2026-10-01" }],
  foto_referencial_path: null,
  credito_foto_referencial: null,
  foto_referencial_temporal: false,
  updated_by: MUNICIPAL_ID,
  updated_at: "2026-11-16T12:00:00Z",
};

let jpg: Buffer;
beforeAll(async () => {
  jpg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#3a7" } })
    .withMetadata({ exif: { IFD0: { Copyright: "camara", Make: "Telefono" } } })
    .jpeg()
    .toBuffer();
});

beforeEach(() => {
  mEspecie.mockResolvedValue({ id: SPECIES_ID, especie_cientifica: "Acer pseudoplatanus" });
  mBorrar.mockResolvedValue(undefined);
  mSubir.mockResolvedValue(undefined);
});

describe("Contenido ciudadano de la especie", () => {
  it("cualquier miembro lo ve; la foto sale como URL pública, nunca la ruta", async () => {
    como("inspector");
    mContenido.mockResolvedValue(FILA);
    const res = await request(app).get(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.rasgos[0].foto.url).toMatch(/conecta-publico\/especies\/h\.webp$/);
    expect(JSON.stringify(res.body)).not.toContain("foto_path");
  });

  it("sin contenido devuelve null; especie inexistente, 404", async () => {
    como("municipal");
    mContenido.mockResolvedValue(null);
    expect((await request(app).get(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth)).body.data).toBeNull();
    mEspecie.mockResolvedValue(null);
    expect((await request(app).get(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth)).status).toBe(404);
  });

  it("el Usuario municipal miembro guarda; se borran las fotos de los rasgos eliminados", async () => {
    como("municipal");
    mGuardar.mockResolvedValue({ rutas_a_borrar: ["especies/viejo.webp"] });
    mContenido.mockResolvedValue(FILA);
    const res = await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO);
    expect(res.status).toBe(200);
    expect(mGuardar).toHaveBeenCalledWith(SPECIES_ID, MUNICIPAL_ID, expect.objectContaining({ curiosidad: CONTENIDO.curiosidad }));
    expect(mBorrar).toHaveBeenCalledWith(["especies/viejo.webp"]);
  });

  it("el Administrador también edita (PR-004 v8.0); el Inspector no (403)", async () => {
    como("admin");
    mGuardar.mockResolvedValue({ rutas_a_borrar: [] });
    mContenido.mockResolvedValue(FILA);
    expect((await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO)).status).toBe(200);
    como("inspector");
    const res = await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO);
    expect(res.status).toBe(403);
    expect(mGuardar).toHaveBeenCalledTimes(1);
  });

  it("un Usuario municipal que no es miembro del proyecto recibe 403", async () => {
    como("municipal", false);
    const res = await request(app).put(`/api/sivu/projects/${OTRO_PROYECTO}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO);
    expect(res.status).toBe(403);
    expect(mGuardar).not.toHaveBeenCalled();
  });

  it.each([
    ["curiosidad de más de 200 caracteres", { curiosidad: "a".repeat(201) }, /200/],
    ["tres aportes", { aportes: [{ icono: "sombra", titulo: "a" }, { icono: "aves", titulo: "b" }, { icono: "hito", titulo: "c" }] }, /2 aportes/],
    ["ícono repetido", { aportes: [{ icono: "sombra", titulo: "a" }, { icono: "sombra", titulo: "b" }] }, /ícono/],
    ["ícono fuera de la lista", { aportes: [{ icono: "oxigeno", titulo: "a" }] }, /Icono_aporte/],
    ["año y ciclo juntos", { ciclo: { titulo: "Piña", pasos: [{ etiqueta: "1", texto: "a" }, { etiqueta: "2", texto: "b" }] } }, /año estacional o el ciclo/],
    ["nombre sin artículo", { articulo_nombre: null }, /D-281/],
    ["curiosidad sin fuente de su bloque", { fuentes: [{ bloques: ["general"], tema: "x", referencia: "y" }] }, /curiosidad requiere/],
    ["enlace no https", { fuentes: [...CONTENIDO.fuentes, { bloques: ["consejo"], tema: "x", referencia: "y", enlace: "http://example.org" }] }, /https/],
    ["el cliente intenta fijar la foto de un rasgo", { rasgos: [{ id: "hoja", etiqueta: "Hoja", texto: "x", foto_path: "especies/x.webp" }] }, /foto_path|Unrecognized/],
  ])("rechaza con 400: %s", async (_caso, cambio, mensaje) => {
    como("municipal");
    const res = await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send({ ...CONTENIDO, ...cambio });
    expect(res.status).toBe(400);
    expect(res.body.error ?? res.body.message ?? JSON.stringify(res.body)).toMatch(mensaje);
    expect(mGuardar).not.toHaveBeenCalled();
  });

  it("traduce los errores de la base: SV080 de datos → 400, de rol → 403", async () => {
    como("municipal");
    mGuardar.mockRejectedValueOnce(new Error("El rasgo x no existe en la especie", { cause: "SV080" }));
    expect((await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO)).status).toBe(404);
    mGuardar.mockRejectedValueOnce(new Error("El usuario x no está activo (D-251)", { cause: "SV080" }));
    expect((await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO)).status).toBe(403);
    mGuardar.mockRejectedValueOnce(new Error("violates check constraint", { cause: "23514" }));
    expect((await request(app).put(`${base}/species/${SPECIES_ID}/contenido-publico`).set(auth).send(CONTENIDO)).status).toBe(400);
  });
});

describe("Fotos de la especie", () => {
  const url = `${base}/species/${SPECIES_ID}/contenido-publico/fotos`;

  it("recodifica a WebP sin metadatos y de 1600 px, sube con ruta aleatoria y borra la anterior", async () => {
    como("municipal");
    mFijarEspecie.mockResolvedValue({ ruta_anterior: "especies/vieja.webp" });
    mContenido.mockResolvedValue(FILA);
    const res = await request(app).put(`${url}/referencial`).set(auth).field("credito", "SIVU, CC BY 4.0").attach("foto", jpg, "IMG_9964.jpg");
    expect(res.status).toBe(200);
    const [ruta, buffer] = mSubir.mock.calls[0];
    expect(ruta).toMatch(/^especies\/[0-9a-f-]{36}\.webp$/);
    const meta = await sharp(buffer).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 1600 });
    expect(meta.exif).toBeUndefined();
    expect(mFijarEspecie).toHaveBeenCalledWith(expect.objectContaining({ ranura: "referencial", path: ruta, credito: "SIVU, CC BY 4.0", temporal: false }));
    expect(mBorrar).toHaveBeenLastCalledWith(["especies/vieja.webp"]);
  });

  it("sin crédito y sin marca temporal → 400 antes de subir (D-292)", async () => {
    como("municipal");
    const res = await request(app).put(`${url}/referencial`).set(auth).attach("foto", jpg, "a.jpg");
    expect(res.status).toBe(400);
    expect(mSubir).not.toHaveBeenCalled();
  });

  it("temporal solo en la referencial (D-293); con ella, el crédito lo fija la base", async () => {
    como("municipal");
    expect((await request(app).put(`${url}/hoja`).set(auth).field("temporal", "true").attach("foto", jpg, "a.jpg")).status).toBe(400);
    mFijarEspecie.mockResolvedValue({ ruta_anterior: null });
    mContenido.mockResolvedValue(FILA);
    expect((await request(app).put(`${url}/referencial`).set(auth).field("temporal", "true").attach("foto", jpg, "a.jpg")).status).toBe(200);
    expect(mFijarEspecie).toHaveBeenCalledWith(expect.objectContaining({ temporal: true, credito: null }));
  });

  it("si la base rechaza, borra lo que subió", async () => {
    como("municipal");
    mFijarEspecie.mockRejectedValue(new Error("El rasgo flor no existe en la especie", { cause: "SV080" }));
    const res = await request(app).put(`${url}/flor`).set(auth).field("credito", "A, CC0").attach("foto", jpg, "a.jpg");
    expect(res.status).toBe(404);
    expect(mBorrar).toHaveBeenCalledWith([mSubir.mock.calls[0][0]]);
  });

  it("un archivo que no es imagen → 400 y no se sube nada", async () => {
    como("municipal");
    const res = await request(app).put(`${url}/referencial`).set(auth).field("credito", "A").attach("foto", Buffer.from("no soy una foto"), "a.jpg");
    expect(res.status).toBe(400);
    expect(mSubir).not.toHaveBeenCalled();
  });

  it("DELETE quita la foto y borra el archivo (204)", async () => {
    como("municipal");
    mFijarEspecie.mockResolvedValue({ ruta_anterior: "especies/h.webp" });
    const res = await request(app).delete(`${url}/hoja`).set(auth);
    expect(res.status).toBe(204);
    expect(mFijarEspecie).toHaveBeenCalledWith(expect.objectContaining({ ranura: "hoja", path: null }));
    expect(mBorrar).toHaveBeenCalledWith(["especies/h.webp"]);
  });
});

describe("Ficha pública del árbol", () => {
  const url = `${base}/trees/${TREE_ID}/ficha-publica`;
  const ARBOL = {
    id: TREE_ID, qr_token: QR, especie_cientifica: "Acer pseudoplatanus", nombre_comun: "Falso plátano",
    clase_edad: "maduro", altura_total_m: 12.5, dap_cm: 40, diametro_copa_m: null, rango_edad_estimada_anios: null,
  };
  const FICHA_028 = {
    especie_cientifica: "Acer pseudoplatanus", nombre_comun: "Falso plátano", ubicacion_descriptiva: "Plaza Victoria",
    sobre_la_especie: { especie_cientifica: "Acer pseudoplatanus", genero: "Acer", familia: "Sapindaceae", origen_biogeografico: "introducida", persistencia_follaje: "caducifolia", tipo_hoja: "latifoliada" },
  };

  beforeEach(() => {
    mArbol.mockResolvedValue(ARBOL);
    mFichaPublica.mockResolvedValue(FICHA_028);
  });

  it("GET entrega lo propio (interruptores en No sin fila), las medidas vigentes con etiqueta y la vista previa", async () => {
    como("inspector");
    mFichaArbol.mockResolvedValue(null);
    const res = await request(app).get(url).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.ficha).toMatchObject({ mostrar_dap: false, historia: null, foto: null, textos_personalizados: {} });
    expect(res.body.data.medidas_vigentes.clase_edad).toEqual({ codigo: "maduro", etiqueta: "Maduro" });
    expect(res.body.data.vista_previa.nombre_visualizacion).toBe("Falso plátano");
    expect(JSON.stringify(res.body)).not.toContain(QR);
  });

  it("árbol de otro proyecto → 404", async () => {
    como("municipal");
    mArbol.mockResolvedValue(null);
    expect((await request(app).get(url).set(auth)).status).toBe(404);
  });

  it("PUT guarda interruptores, historia y textos personalizados", async () => {
    como("municipal");
    mFichaArbol.mockResolvedValue(null);
    const body = {
      mostrar_dap: true,
      historia: "Plantado por los vecinos.",
      historia_fuente: "Junta de vecinos",
      textos_personalizados: { curiosidad: { texto: "Vio pasar el tranvía.", fuente: "Archivo municipal" } },
    };
    const res = await request(app).put(url).set(auth).send(body);
    expect(res.status).toBe(200);
    expect(mGuardarArbol).toHaveBeenCalledWith(TREE_ID, MUNICIPAL_ID, expect.objectContaining({ mostrar_dap: true, mostrar_altura_total: false }));
  });

  it.each([
    ["fuente sin historia", { historia_fuente: "Archivo" }, /D-303/],
    ["curiosidad personalizada sin fuente", { textos_personalizados: { curiosidad: { texto: "x" } } }, /D-305/],
    ["bloque que no se personaliza", { textos_personalizados: { historia_especie: { texto: "x" } } }, /Unrecognized|historia_especie/],
    ["historia de más de 1000", { historia: "h".repeat(1001) }, /1000/],
  ])("rechaza con 400: %s", async (_caso, body, mensaje) => {
    como("municipal");
    const res = await request(app).put(url).set(auth).send(body);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(mensaje);
    expect(mGuardarArbol).not.toHaveBeenCalled();
  });

  it("proyecto cerrado → 409", async () => {
    como("municipal");
    mGuardarArbol.mockRejectedValue(new Error("El proyecto x está cerrado: solo consulta (RG fila 27; CC-042)", { cause: "P0001" }));
    expect((await request(app).put(url).set(auth).send({})).status).toBe(409);
  });

  it("el Inspector no edita (403)", async () => {
    como("inspector");
    expect((await request(app).put(url).set(auth).send({})).status).toBe(403);
    expect(mGuardarArbol).not.toHaveBeenCalled();
  });

  it("foto del ejemplar: sube en arboles/<uuid>.webp, borra la anterior; DELETE la quita", async () => {
    como("municipal");
    mFichaArbol.mockResolvedValue(null);
    mFijarArbol.mockResolvedValue({ ruta_anterior: "arboles/vieja.webp" });
    const res = await request(app).put(`${url}/foto`).set(auth).attach("foto", jpg, "a.jpg");
    expect(res.status).toBe(200);
    expect(mSubir.mock.calls[0][0]).toMatch(/^arboles\/[0-9a-f-]{36}\.webp$/);
    expect(mBorrar).toHaveBeenLastCalledWith(["arboles/vieja.webp"]);

    mFijarArbol.mockResolvedValue({ ruta_anterior: "arboles/actual.webp" });
    expect((await request(app).delete(`${url}/foto`).set(auth)).status).toBe(204);
    expect(mFijarArbol).toHaveBeenLastCalledWith(TREE_ID, MUNICIPAL_ID, null);
    expect(mBorrar).toHaveBeenLastCalledWith(["arboles/actual.webp"]);
  });

  it("foto sin archivo → 400", async () => {
    como("municipal");
    expect((await request(app).put(`${url}/foto`).set(auth)).status).toBe(400);
  });
});
