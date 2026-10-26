jest.mock("../../../src/repositories/sivu/inspection.repository");
jest.mock("../../../src/repositories/sivu/workOrder.repository");
jest.mock("../../../src/repositories/sivu/photo.repository");
jest.mock("../../../src/services/authorization.service", () => ({
  assertProjectAccess: jest.fn(),
  assertProjectRole: jest.fn(),
}));

import sharp from "sharp";
import { obtenerInspeccionPorId } from "../../../src/repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../../src/repositories/sivu/workOrder.repository";
import {
  PhotoRow,
  crearFotoRegistro,
  eliminarArchivoDeStorage,
  generarUrlFirmada,
  listarFotosPorInspeccion,
  subirArchivoAStorage,
} from "../../../src/repositories/sivu/photo.repository";
import { assertProjectAccess, assertProjectRole } from "../../../src/services/authorization.service";
import {
  listarFotosInspeccion,
  subirFotoInspeccion,
  verificarYProcesarFoto,
} from "../../../src/services/sivu/photo.service";
import { AuthenticatedUser } from "../../../src/types/auth";
import { SubirFotoInspeccionBody } from "../../../src/schemas/sivu/fotos.schema";

const mockObtenerInspeccion = obtenerInspeccionPorId as jest.Mock;
const mockObtenerOt = obtenerOrdenTrabajoPorId as jest.Mock;
const mockSubirArchivo = subirArchivoAStorage as jest.Mock;
const mockCrearFoto = crearFotoRegistro as jest.Mock;
const mockEliminarArchivo = eliminarArchivoDeStorage as jest.Mock;
const mockListarFotos = listarFotosPorInspeccion as jest.Mock;
const mockGenerarUrl = generarUrlFirmada as jest.Mock;
const mockAssertProjectAccess = assertProjectAccess as jest.Mock;
const mockAssertProjectRole = assertProjectRole as jest.Mock;

function usuario(id: string, role: string | null): AuthenticatedUser {
  return { id, email: `${id}@example.invalid`, nombre: "Usuario de prueba", role, activo: true };
}

const INSPECTOR_ID = "inspector-1";
const INSPECTION_ID = "11111111-1111-1111-1111-111111111111";
const PROJECT_ID = "22222222-2222-2222-2222-222222222222";
const TREE_ID = "33333333-3333-3333-3333-333333333333";
const WORK_ORDER_ID = "44444444-4444-4444-4444-444444444444";
const TOKEN = "token-de-prueba";

/** Inspección Preguardado de Evaluación inicial, OT En ejecución, responsable = INSPECTOR_ID. */
function inspeccionBase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: INSPECTION_ID,
    work_order_id: WORK_ORDER_ID,
    tree_id: TREE_ID,
    estado_registro: "preguardado",
    tipo_inspeccion_realizada: "evaluacion_inicial",
    ...overrides,
  };
}

function otBase(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: WORK_ORDER_ID,
    project_id: PROJECT_ID,
    estado_ot: "en_ejecucion",
    responsable_accion_id: INSPECTOR_ID,
    ...overrides,
  };
}

async function jpegConExif(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .withMetadata({ exif: { IFD0: { Copyright: "quien-reporta" } } })
    .jpeg()
    .toBuffer();
}

async function pngSimple(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 255, b: 0 } } }).png().toBuffer();
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("verificarYProcesarFoto (CC-049 puntos 5 y 6)", () => {
  it("acepta un jpeg real y lo identifica por su contenido, no por una extensión declarada", async () => {
    const buffer = await jpegConExif();
    const resultado = await verificarYProcesarFoto(buffer, false);
    expect(resultado.extension).toBe("jpg");
    expect(resultado.contentType).toBe("image/jpeg");
  });

  it("acepta un png real", async () => {
    const buffer = await pngSimple();
    const resultado = await verificarYProcesarFoto(buffer, false);
    expect(resultado.extension).toBe("png");
    expect(resultado.contentType).toBe("image/png");
  });

  it("rechaza un archivo que no es una imagen real, aunque se declare jpg/png", async () => {
    const buffer = Buffer.from("esto no es una imagen, solo texto");
    await expect(verificarYProcesarFoto(buffer, false)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("con quitarMetadatos=false (foto del Inspector), NO recodifica: el EXIF se conserva", async () => {
    const buffer = await jpegConExif();
    const resultado = await verificarYProcesarFoto(buffer, false);
    const metadata = await sharp(resultado.buffer).metadata();
    expect(metadata.exif).toBeDefined();
  });

  it("con quitarMetadatos=true (foto ciudadana), recodifica y el EXIF/GPS desaparece", async () => {
    const buffer = await jpegConExif();
    const antes = await sharp(buffer).metadata();
    expect(antes.exif).toBeDefined();

    const resultado = await verificarYProcesarFoto(buffer, true);
    const metadata = await sharp(resultado.buffer).metadata();
    expect(metadata.exif).toBeUndefined();
  });
});

describe("subirFotoInspeccion (CC-049, mismas reglas de CC-048/CC-050)", () => {
  const archivoValido = { buffer: Buffer.alloc(0), mimetype: "image/jpeg" };

  function bodyValido(): SubirFotoInspeccionBody {
    return { vista: "arbol_completo" };
  }

  async function subirConFixtures(
    inspeccionOverrides: Partial<Record<string, unknown>>,
    otOverrides: Partial<Record<string, unknown>>,
    body: SubirFotoInspeccionBody,
    archivo = archivoValido
  ) {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase(inspeccionOverrides));
    mockObtenerOt.mockResolvedValueOnce(otBase(otOverrides));
    return subirFotoInspeccion(usuario(INSPECTOR_ID, "inspector"), INSPECTION_ID, body, archivo, TOKEN);
  }

  it("404 si la inspección no existe", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(null);

    await expect(subirConFixtures({}, {}, bodyValido())).rejects.toMatchObject({ statusCode: 404 });
  });

  it("exige rol Inspector en el proyecto (assertProjectRole, antes de cualquier otra validación)", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase());
    mockAssertProjectRole.mockRejectedValueOnce(Object.assign(new Error("Requiere uno de los roles: inspector"), { statusCode: 403 }));

    await expect(
      subirFotoInspeccion(usuario("municipal-1", "usuario_municipal"), INSPECTION_ID, bodyValido(), archivoValido, TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("otro Inspector del proyecto (no el responsable de esta OT) → rechazado", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase({ responsable_accion_id: "otro-inspector" }));

    await expect(
      subirFotoInspeccion(usuario(INSPECTOR_ID, "inspector"), INSPECTION_ID, bodyValido(), archivoValido, TOKEN)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("OT no En ejecución (p. ej. Programada) → rechazada", async () => {
    await expect(subirConFixtures({}, { estado_ot: "programada" }, bodyValido())).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("inspección Finalizada → rechazada (no altera la evidencia ya cerrada)", async () => {
    await expect(subirConFixtures({ estado_registro: "finalizado" }, {}, bodyValido())).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("inspección Anulada → rechazada", async () => {
    await expect(subirConFixtures({ estado_registro: "anulado" }, {}, bodyValido())).rejects.toMatchObject({
      statusCode: 422,
    });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("Evaluación instrumental → rechazada, no admite fotos (D-27)", async () => {
    await expect(
      subirConFixtures({ tipo_inspeccion_realizada: "evaluacion_instrumental" }, {}, { vista: "base" })
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("Evaluación inicial sin vista → rechazada (D-27: vista obligatoria salvo en Monitoreo)", async () => {
    await expect(subirConFixtures({}, {}, {})).rejects.toMatchObject({ statusCode: 422 });
    expect(mockSubirArchivo).not.toHaveBeenCalled();
  });

  it("Monitoreo SIN vista → aceptado (D-27: vista opcional en Monitoreo)", async () => {
    const buffer = await jpegConExif();
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase({ tipo_inspeccion_realizada: "monitoreo" }));
    mockObtenerOt.mockResolvedValueOnce(otBase());
    const fotoCreada: PhotoRow = {
      id: "foto-1",
      tree_id: TREE_ID,
      storage_path: "x",
      vista: null,
      inspection_id: INSPECTION_ID,
      maintenance_record_id: null,
      incident_id: null,
      uploaded_by: INSPECTOR_ID,
      created_at: "2026-10-25T00:00:00Z",
    };
    mockCrearFoto.mockResolvedValueOnce(fotoCreada);

    const resultado = await subirFotoInspeccion(
      usuario(INSPECTOR_ID, "inspector"),
      INSPECTION_ID,
      {},
      { buffer, mimetype: "image/jpeg" },
      TOKEN
    );

    expect(mockCrearFoto).toHaveBeenCalledWith(expect.objectContaining({ vista: null }));
    expect(resultado).toBe(fotoCreada);
  });

  it("con todo válido, verifica el contenido real, sube el archivo TAL CUAL (sin recodificar) y crea la fila", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase());
    const buffer = await jpegConExif();
    const fotoCreada: PhotoRow = {
      id: "foto-1",
      tree_id: TREE_ID,
      storage_path: "x",
      vista: "arbol_completo",
      inspection_id: INSPECTION_ID,
      maintenance_record_id: null,
      incident_id: null,
      uploaded_by: INSPECTOR_ID,
      created_at: "2026-10-25T00:00:00Z",
    };
    mockCrearFoto.mockResolvedValueOnce(fotoCreada);

    const resultado = await subirFotoInspeccion(
      usuario(INSPECTOR_ID, "inspector"),
      INSPECTION_ID,
      bodyValido(),
      { buffer, mimetype: "image/jpeg" },
      TOKEN
    );

    expect(mockSubirArchivo).toHaveBeenCalledTimes(1);
    const [path, subidoBuffer, contentType] = mockSubirArchivo.mock.calls[0];
    expect(path).toBe(`${PROJECT_ID}/${TREE_ID}/inspeccion/${(mockCrearFoto.mock.calls[0][0] as { id: string }).id}.jpg`);
    expect(contentType).toBe("image/jpeg");
    // Sin recodificar: el buffer subido conserva el EXIF.
    const metadataSubida = await sharp(subidoBuffer as Buffer).metadata();
    expect(metadataSubida.exif).toBeDefined();

    expect(mockCrearFoto).toHaveBeenCalledWith(
      expect.objectContaining({
        treeId: TREE_ID,
        vista: "arbol_completo",
        inspectionId: INSPECTION_ID,
        maintenanceRecordId: null,
        incidentId: null,
        uploadedBy: INSPECTOR_ID,
      })
    );
    expect(resultado).toBe(fotoCreada);
    expect(mockEliminarArchivo).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que no es una imagen real, sin subir nada", async () => {
    await expect(subirConFixtures({}, {}, bodyValido(), { buffer: Buffer.from("no es una imagen"), mimetype: "image/jpeg" })).rejects.toMatchObject(
      { statusCode: 400 }
    );
    expect(mockSubirArchivo).not.toHaveBeenCalled();
    expect(mockCrearFoto).not.toHaveBeenCalled();
  });

  it("si falla la inserción en photos DESPUÉS de subir el archivo, lo borra de Storage antes de propagar el error", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase());
    const buffer = await jpegConExif();
    const errorInsercion = Object.assign(new Error("el proyecto está cerrado"), { statusCode: 422 });
    mockCrearFoto.mockRejectedValueOnce(errorInsercion);

    await expect(
      subirFotoInspeccion(usuario(INSPECTOR_ID, "inspector"), INSPECTION_ID, bodyValido(), { buffer, mimetype: "image/jpeg" }, TOKEN)
    ).rejects.toBe(errorInsercion);

    expect(mockSubirArchivo).toHaveBeenCalledTimes(1);
    const pathSubido = mockSubirArchivo.mock.calls[0][0] as string;
    expect(mockEliminarArchivo).toHaveBeenCalledWith(pathSubido);
  });
});

describe("listarFotosInspeccion (cualquier rol con acceso al proyecto)", () => {
  it("exige acceso al proyecto, resuelto desde la OT de la inspección", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase());
    mockAssertProjectAccess.mockRejectedValueOnce(Object.assign(new Error("No tiene acceso a este proyecto"), { statusCode: 403 }));

    await expect(listarFotosInspeccion(usuario("municipal-1", "usuario_municipal"), INSPECTION_ID, TOKEN)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockAssertProjectAccess).toHaveBeenCalledWith(usuario("municipal-1", "usuario_municipal"), PROJECT_ID, TOKEN);
    expect(mockListarFotos).not.toHaveBeenCalled();
  });

  it("con acceso, genera un enlace firmado por cada foto (nunca una URL fija)", async () => {
    mockObtenerInspeccion.mockResolvedValueOnce(inspeccionBase());
    mockObtenerOt.mockResolvedValueOnce(otBase());
    const fotos: PhotoRow[] = [
      {
        id: "foto-1",
        tree_id: TREE_ID,
        storage_path: "p/t/inspeccion/foto-1.jpg",
        vista: "arbol_completo",
        inspection_id: INSPECTION_ID,
        maintenance_record_id: null,
        incident_id: null,
        uploaded_by: INSPECTOR_ID,
        created_at: "2026-10-25T00:00:00Z",
      },
    ];
    mockListarFotos.mockResolvedValueOnce(fotos);
    mockGenerarUrl.mockResolvedValueOnce("https://signed.example/foto-1");

    const resultado = await listarFotosInspeccion(usuario("municipal-1", "usuario_municipal"), INSPECTION_ID, TOKEN);

    // PR-018 v5.0 (CC-064 decisión i): filas con el JWT del usuario, enlace con service_role.
    expect(mockListarFotos).toHaveBeenCalledWith(TOKEN, INSPECTION_ID);
    expect(mockGenerarUrl).toHaveBeenCalledWith("p/t/inspeccion/foto-1.jpg");
    expect(resultado).toEqual([
      { id: "foto-1", vista: "arbol_completo", url: "https://signed.example/foto-1", created_at: "2026-10-25T00:00:00Z", uploaded_by: INSPECTOR_ID },
    ]);
  });
});
