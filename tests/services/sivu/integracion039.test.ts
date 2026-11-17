/**
 * 039 — fotos de detalle y de registro, huella SHA-256, carga firmada,
 * publicación en la ficha pública, corrección de ubicación y legacy_id.
 */
jest.mock("../../../src/repositories/sivu/inspection.repository");
jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/repositories/sivu/photo.repository", () => ({
  ...jest.requireActual("../../../src/repositories/sivu/photo.repository"),
  buscarFotoPorHuella: jest.fn(),
  crearFotoRegistro: jest.fn(),
  crearUrlSubidaFirmada: jest.fn(),
  descargarArchivo: jest.fn(),
  eliminarArchivoDeStorage: jest.fn(),
  generarUrlFirmada: jest.fn(),
  listarFotosPorArbol: jest.fn(),
  moverArchivo: jest.fn(),
  obtenerFotoPorId: jest.fn(),
  subirArchivoAStorage: jest.fn(),
}));
jest.mock("../../../src/repositories/sivu/tree.repository");
jest.mock("../../../src/repositories/sivu/project.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectAccess: jest.fn(),
  assertProjectRole: jest.fn(),
}));

import sharp from "sharp";
import { obtenerInspeccionPorId } from "../../../src/repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../../src/repositories/sivu/workOrder.repository";
import {
  PhotoRow,
  buscarFotoPorHuella,
  crearFotoRegistro,
  crearUrlSubidaFirmada,
  descargarArchivo,
  eliminarArchivoDeStorage,
  moverArchivo,
  obtenerFotoPorId,
  subirArchivoAStorage,
} from "../../../src/repositories/sivu/photo.repository";
import {
  asignarLegacyIdSiVacio,
  corregirUbicacionArbol,
  obtenerArbolDeProyecto,
  obtenerArbolPorLegacyId,
} from "../../../src/repositories/sivu/tree.repository";
import { assertProjectRole } from "../../../src/services/authorization.service";
import {
  confirmarSubidaArbol,
  huellaSha256,
  origenDeFoto,
  solicitarSubidaInspeccion,
  subirFotoArbol,
  subirFotoInspeccion,
} from "../../../src/services/sivu/photo.service";
import { asignarLegacyId, corregirUbicacion } from "../../../src/services/sivu/tree.service";
import { asignarLegacyIdSchema, corregirUbicacionSchema } from "../../../src/schemas/sivu/arboles.schema";
import { subirFotoInspeccionSchema } from "../../../src/schemas/sivu/fotos.schema";
import { AuthenticatedUser } from "../../../src/types/auth";

const m = {
  inspeccion: obtenerInspeccionPorId as jest.Mock,
  ot: obtenerOrdenTrabajoPorId as jest.Mock,
  huella: buscarFotoPorHuella as jest.Mock,
  crear: crearFotoRegistro as jest.Mock,
  subir: subirArchivoAStorage as jest.Mock,
  borrar: eliminarArchivoDeStorage as jest.Mock,
  firmada: crearUrlSubidaFirmada as jest.Mock,
  descargar: descargarArchivo as jest.Mock,
  mover: moverArchivo as jest.Mock,
  foto: obtenerFotoPorId as jest.Mock,
  arbol: obtenerArbolDeProyecto as jest.Mock,
  porLegacy: obtenerArbolPorLegacyId as jest.Mock,
  asignar: asignarLegacyIdSiVacio as jest.Mock,
  corregir: corregirUbicacionArbol as jest.Mock,
  rol: assertProjectRole as jest.Mock,
};

const INSPECTOR = "inspector-1";
const MUNICIPAL = "municipal-1";
const PROJECT_ID = "22222222-2222-2222-2222-222222222222";
const TREE_ID = "33333333-3333-3333-3333-333333333333";
const INSPECTION_ID = "11111111-1111-1111-1111-111111111111";
const WORK_ORDER_ID = "44444444-4444-4444-4444-444444444444";
const UPLOAD_ID = "55555555-5555-5555-5555-555555555555";
const TOKEN = "t";

const usuario = (id: string, role: string): AuthenticatedUser => ({ id, email: `${id}@example.invalid`, nombre: "U", role, activo: true });

const inspeccion = (o: Record<string, unknown> = {}) => ({
  id: INSPECTION_ID,
  work_order_id: WORK_ORDER_ID,
  tree_id: TREE_ID,
  estado_registro: "preguardado",
  tipo_inspeccion_realizada: "evaluacion_inicial",
  ...o,
});
const ot = (o: Record<string, unknown> = {}) => ({
  id: WORK_ORDER_ID,
  project_id: PROJECT_ID,
  estado_ot: "en_ejecucion",
  responsable_accion_id: INSPECTOR,
  ...o,
});
const arbol = (o: Record<string, unknown> = {}) => ({
  id: TREE_ID,
  tree_code: "A-000419",
  project_id: PROJECT_ID,
  legacy_id: null,
  estado_ciclo_vida: "activo",
  ...o,
});

function fila(o: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id: "foto-1",
    tree_id: TREE_ID,
    storage_path: `${PROJECT_ID}/${TREE_ID}/registro/foto-1.jpg`,
    vista: null,
    inspection_id: null,
    maintenance_record_id: null,
    incident_id: null,
    uploaded_by: MUNICIPAL,
    created_at: "2026-11-16T00:00:00Z",
    sha256: null,
    ...o,
  };
}

async function jpegConExif(color = 255): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 6, channels: 3, background: { r: color, g: 0, b: 0 } } })
    .withMetadata({ exif: { IFD0: { Copyright: "inspector" } } })
    .jpeg()
    .toBuffer();
}

beforeEach(() => {
  jest.clearAllMocks();
  m.huella.mockResolvedValue(null);
  m.crear.mockImplementation(async (i) => fila({ id: i.id, storage_path: i.storagePath, vista: i.vista, inspection_id: i.inspectionId, sha256: i.sha256 }));
});

describe("vista «detalle» (decisión A)", () => {
  it("el esquema la acepta y no acepta valores fuera del dominio", () => {
    expect(subirFotoInspeccionSchema.safeParse({ vista: "detalle" }).success).toBe(true);
    expect(subirFotoInspeccionSchema.safeParse({ vista: "follaje" }).success).toBe(false);
  });

  it("una foto de detalle se sube a la inspección con su huella, sin recodificar", async () => {
    m.inspeccion.mockResolvedValueOnce(inspeccion());
    m.ot.mockResolvedValueOnce(ot());
    const buffer = await jpegConExif();

    const r = await subirFotoInspeccion(usuario(INSPECTOR, "inspector"), INSPECTION_ID, { vista: "detalle" }, { buffer, mimetype: "image/jpeg" }, TOKEN);

    expect(r.vista).toBe("detalle");
    expect(m.crear).toHaveBeenCalledWith(expect.objectContaining({ vista: "detalle", sha256: huellaSha256(buffer) }));
    expect(m.subir.mock.calls[0][1]).toBe(buffer);
  });
});

describe("huella SHA-256: sin duplicados", () => {
  it("el mismo original ya asociado al árbol → 409 y no se sube nada", async () => {
    m.inspeccion.mockResolvedValueOnce(inspeccion());
    m.ot.mockResolvedValueOnce(ot());
    m.huella.mockResolvedValueOnce(fila({ id: "existente" }));

    await expect(
      subirFotoInspeccion(usuario(INSPECTOR, "inspector"), INSPECTION_ID, { vista: "base" }, { buffer: await jpegConExif(), mimetype: "image/jpeg" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(m.subir).not.toHaveBeenCalled();
  });

  it("duplicado concurrente (índice único) → 409 y se borra el archivo subido", async () => {
    m.inspeccion.mockResolvedValueOnce(inspeccion());
    m.ot.mockResolvedValueOnce(ot());
    m.crear.mockRejectedValueOnce(new Error("duplicate key", { cause: "23505" }));

    await expect(
      subirFotoInspeccion(usuario(INSPECTOR, "inspector"), INSPECTION_ID, { vista: "base" }, { buffer: await jpegConExif(), mimetype: "image/jpeg" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(m.borrar).toHaveBeenCalledWith(m.subir.mock.calls[0][0]);
  });
});

describe("fotos de registro del árbol (decisión B)", () => {
  it("municipal o inspector; ruta «registro», sin inspección", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    const r = await subirFotoArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, {}, { buffer: await jpegConExif(), mimetype: "image/jpeg" }, TOKEN);

    expect(m.rol).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, ["usuario_municipal", "inspector"], TOKEN);
    expect(m.subir.mock.calls[0][0]).toMatch(new RegExp(`^${PROJECT_ID}/${TREE_ID}/registro/[0-9a-f-]{36}\\.jpg$`));
    expect(r.inspection_id).toBeNull();
    expect(origenDeFoto(r)).toBe("registro");
  });

  it("árbol de otro proyecto → 404", async () => {
    m.arbol.mockResolvedValueOnce(null);
    await expect(
      subirFotoArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, {}, { buffer: await jpegConExif(), mimetype: "image/jpeg" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("carga firmada (decisión H)", () => {
  it("solicitar aplica las mismas reglas que la subida directa (OT no en ejecución → 422)", async () => {
    m.inspeccion.mockResolvedValueOnce(inspeccion());
    m.ot.mockResolvedValueOnce(ot({ estado_ot: "completada" }));
    await expect(
      solicitarSubidaInspeccion(usuario(INSPECTOR, "inspector"), INSPECTION_ID, { content_type: "image/jpeg", bytes: 5_265_665, sha256: "a".repeat(64), vista: "base" }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(m.firmada).not.toHaveBeenCalled();
  });

  it("solicitar devuelve un enlace a una ruta de staging decidida por el servidor", async () => {
    m.inspeccion.mockResolvedValueOnce(inspeccion());
    m.ot.mockResolvedValueOnce(ot());
    m.firmada.mockImplementationOnce(async (path: string) => ({ signedUrl: "https://firmada", token: "tok", path }));

    const r = await solicitarSubidaInspeccion(usuario(INSPECTOR, "inspector"), INSPECTION_ID, { content_type: "image/jpeg", bytes: 5_265_665, sha256: "a".repeat(64), vista: "base" }, TOKEN);

    expect(r.path).toBe(`pendientes/${INSPECTOR}/${r.upload_id}`);
    expect(r.signed_url).toBe("https://firmada");
  });

  it("confirmar: huella distinta de la declarada → 422 y se descarta la carga", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.descargar.mockResolvedValueOnce(await jpegConExif());
    await expect(
      confirmarSubidaArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, { upload_id: UPLOAD_ID, sha256: "b".repeat(64) }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(m.borrar).toHaveBeenCalledWith(`pendientes/${MUNICIPAL}/${UPLOAD_ID}`);
    expect(m.mover).not.toHaveBeenCalled();
  });

  it("confirmar: un archivo que no es imagen → 400 y se descarta", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    const falso = Buffer.from("no es una imagen");
    m.descargar.mockResolvedValueOnce(falso);
    await expect(
      confirmarSubidaArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, { upload_id: UPLOAD_ID, sha256: huellaSha256(falso) }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(m.borrar).toHaveBeenCalledWith(`pendientes/${MUNICIPAL}/${UPLOAD_ID}`);
  });

  it("confirmar: sin carga pendiente → 404", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.descargar.mockResolvedValueOnce(null);
    await expect(
      confirmarSubidaArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, { upload_id: UPLOAD_ID, sha256: "c".repeat(64) }, TOKEN)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("confirmar: verifica, mueve a la ruta definitiva y registra con la huella", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    const buffer = await jpegConExif();
    m.descargar.mockResolvedValueOnce(buffer);

    const r = await confirmarSubidaArbol(usuario(MUNICIPAL, "usuario_municipal"), PROJECT_ID, TREE_ID, { upload_id: UPLOAD_ID, sha256: huellaSha256(buffer), vista: "base" }, TOKEN);

    expect(m.mover).toHaveBeenCalledWith(`pendientes/${MUNICIPAL}/${UPLOAD_ID}`, expect.stringMatching(new RegExp(`^${PROJECT_ID}/${TREE_ID}/registro/`)));
    expect(r.sha256).toBe(huellaSha256(buffer));
    expect(r.vista).toBe("base");
  });
});

describe("legacy_id (vínculo del identificador de origen)", () => {
  const municipal = usuario(MUNICIPAL, "usuario_municipal");

  it("el esquema rechaza espacios y textos vacíos", () => {
    expect(asignarLegacyIdSchema.safeParse({ legacy_id: "AV_000004" }).success).toBe(true);
    expect(asignarLegacyIdSchema.safeParse({ legacy_id: "AV 4" }).success).toBe(false);
    expect(asignarLegacyIdSchema.safeParse({ legacy_id: " " }).success).toBe(false);
  });

  it("mismo valor ya asignado → sin cambios", async () => {
    m.arbol.mockResolvedValueOnce(arbol({ legacy_id: "AV_000004" }));
    await expect(asignarLegacyId(municipal, PROJECT_ID, TREE_ID, { legacy_id: "AV_000004" }, TOKEN)).resolves.toMatchObject({ cambio: false });
    expect(m.asignar).not.toHaveBeenCalled();
  });

  it("nunca reasigna: el árbol ya tiene otro → 409", async () => {
    m.arbol.mockResolvedValueOnce(arbol({ legacy_id: "AV_000003" }));
    await expect(asignarLegacyId(municipal, PROJECT_ID, TREE_ID, { legacy_id: "AV_000004" }, TOKEN)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("el valor pertenece a otro árbol → 409", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.porLegacy.mockResolvedValueOnce(arbol({ id: "otro", tree_code: "A-000999", legacy_id: "AV_000004" }));
    await expect(asignarLegacyId(municipal, PROJECT_ID, TREE_ID, { legacy_id: "AV_000004" }, TOKEN)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("vacío → se asigna", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.porLegacy.mockResolvedValueOnce(null);
    m.asignar.mockResolvedValueOnce(arbol({ legacy_id: "AV_000004" }));
    await expect(asignarLegacyId(municipal, PROJECT_ID, TREE_ID, { legacy_id: "AV_000004" }, TOKEN)).resolves.toMatchObject({ cambio: true });
    expect(m.asignar).toHaveBeenCalledWith(TREE_ID, "AV_000004");
  });
});

describe("corrección de ubicación (decisión F)", () => {
  const municipal = usuario(MUNICIPAL, "usuario_municipal");

  it("el esquema exige motivo y las dos coordenadas juntas", () => {
    expect(corregirUbicacionSchema.safeParse({ utm_este: 255424, utm_norte: 6340508, motivo: "Excel actualizado" }).success).toBe(true);
    expect(corregirUbicacionSchema.safeParse({ utm_este: 255424, motivo: "x" }).success).toBe(false);
    expect(corregirUbicacionSchema.safeParse({ utm_este: 255424, utm_norte: 6340508 }).success).toBe(false);
    expect(corregirUbicacionSchema.safeParse({ motivo: "sin campos" }).success).toBe(false);
  });

  it("solo usuario municipal; pasa los valores a la función de la base", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.corregir.mockResolvedValueOnce({ cambio: true, tree_id: TREE_ID });
    await corregirUbicacion(municipal, PROJECT_ID, TREE_ID, { utm_este: 255424, utm_norte: 6340508, motivo: "Excel" }, TOKEN);
    expect(m.rol).toHaveBeenCalledWith(expect.anything(), PROJECT_ID, ["usuario_municipal"], TOKEN);
    expect(m.corregir).toHaveBeenCalledWith(expect.objectContaining({ treeId: TREE_ID, utmEste: 255424, utmNorte: 6340508, sector: null, usuarioId: MUNICIPAL }));
  });

  it("rechazo propio de la función (SV039) → 422", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.corregir.mockRejectedValueOnce(new Error("El motivo de la corrección es obligatorio", { cause: "SV039" }));
    await expect(corregirUbicacion(municipal, PROJECT_ID, TREE_ID, { utm_este: 1, utm_norte: 2, motivo: "m" } as never, TOKEN)).rejects.toMatchObject({ statusCode: 422 });
  });

  it("fuera del sector (SV046) → 422", async () => {
    m.arbol.mockResolvedValueOnce(arbol());
    m.corregir.mockRejectedValueOnce(new Error("La coordenada registrada queda fuera de la delimitación del sector", { cause: "SV046" }));
    await expect(corregirUbicacion(municipal, PROJECT_ID, TREE_ID, { utm_este: 1, utm_norte: 2, motivo: "m" } as never, TOKEN)).rejects.toMatchObject({ statusCode: 422 });
  });
});
