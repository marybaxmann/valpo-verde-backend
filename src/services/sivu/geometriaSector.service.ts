import * as yauzl from "yauzl";
import { Readable } from "stream";
import { AppError } from "../../utils/AppError";
import { GeometriaSectorInput, VistaPreviaSectorBody } from "../../schemas/sivu/common.schema";

/**
 * Límites operativos del backend (elegidos acá, no definidos por el
 * Excel, que no fija ningún tamaño): protección contra archivos
 * KML/KMZ desproporcionados y contra bombas ZIP (un KMZ pequeño que se
 * descomprime a un KML enorme). D-265 no pide un tamaño — esto es una
 * medida operativa, igual que el límite de `express.json` en `app.ts`.
 */
const ARCHIVO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB, antes de descomprimir
const KML_DESCOMPRIMIDO_MAX_BYTES = 20 * 1024 * 1024; // 20 MB, ya descomprimido
const ZIP_MAX_ENTRADAS = 50;
const ARCHIVO_BASE64_MAX_CHARS = Math.ceil((ARCHIVO_MAX_BYTES * 4) / 3) + 100;

/**
 * Forma de la geometría ya resuelta a lo que esperan
 * `fn_create_project_with_sector`/`fn_update_sector_geometria`: GeoJSON
 * como objeto, o KML como texto crudo (un KMZ ya se desempaquetó acá;
 * la base nunca ve un ZIP, solo el KML que contiene — D-265: "En KMZ,
 * extraer el contenido KML").
 */
export interface GeometriaParaRpc {
  formato: "geojson" | "kml";
  geometriaGeojson: Record<string, unknown> | null;
  geometriaKml: string | null;
  indicesSeleccionados: number[] | null;
}

export async function resolverGeometriaSector(
  input: GeometriaSectorInput
): Promise<GeometriaParaRpc> {
  if (input.formato === "geojson") {
    return {
      formato: "geojson",
      geometriaGeojson: input.geometria,
      geometriaKml: null,
      indicesSeleccionados: null,
    };
  }

  const archivo = decodificarArchivoBase64(input.archivoBase64);
  const indicesSeleccionados = input.indicesSeleccionados ?? null;

  if (input.formato === "kml") {
    return {
      formato: "kml",
      geometriaGeojson: null,
      geometriaKml: archivo.toString("utf-8"),
      indicesSeleccionados,
    };
  }

  const kml = await extraerKmlDeKmz(archivo);
  return { formato: "kml", geometriaGeojson: null, geometriaKml: kml, indicesSeleccionados };
}

/** Resuelve solo el texto KML crudo (KML o KMZ), para la vista previa. */
export async function resolverKmlParaVistaPrevia(body: VistaPreviaSectorBody): Promise<string> {
  const archivo = decodificarArchivoBase64(body.archivoBase64);

  if (body.formato === "kml") {
    return archivo.toString("utf-8");
  }

  return extraerKmlDeKmz(archivo);
}

function decodificarArchivoBase64(archivoBase64: string): Buffer {
  if (archivoBase64.length > ARCHIVO_BASE64_MAX_CHARS) {
    throw new AppError(
      `Archivo demasiado grande (máximo ${ARCHIVO_MAX_BYTES / (1024 * 1024)} MB)`,
      400
    );
  }

  const buffer = Buffer.from(archivoBase64, "base64");

  if (buffer.length === 0) {
    throw new AppError("Archivo vacío", 400);
  }
  if (buffer.length > ARCHIVO_MAX_BYTES) {
    throw new AppError(
      `Archivo demasiado grande (máximo ${ARCHIVO_MAX_BYTES / (1024 * 1024)} MB)`,
      400
    );
  }

  return buffer;
}

/**
 * Desempaqueta el `.kml` de un KMZ (un ZIP) con límites explícitos
 * contra bombas ZIP: máximo de entradas en el archivo, y tamaño máximo
 * del contenido ya descomprimido, verificado antes de leerlo (según lo
 * que declara la entrada) y de nuevo mientras se lee (sin confiar solo
 * en lo declarado).
 */
async function extraerKmlDeKmz(buffer: Buffer): Promise<string> {
  let zipfile: yauzl.ZipFile;
  try {
    zipfile = await yauzl.fromBufferPromise(buffer, { lazyEntries: true });
  } catch {
    throw new AppError("KMZ inválido: no se pudo abrir como archivo ZIP", 400);
  }

  try {
    if (zipfile.entryCount > ZIP_MAX_ENTRADAS) {
      throw new AppError("KMZ con demasiados archivos internos", 400);
    }

    const entry = await buscarEntradaKml(zipfile);
    if (!entry) {
      throw new AppError("El KMZ no contiene ningún archivo .kml", 400);
    }
    if (entry.uncompressedSize > KML_DESCOMPRIMIDO_MAX_BYTES) {
      throw new AppError("El contenido KML del KMZ excede el tamaño permitido", 400);
    }

    const stream = await zipfile.openReadStreamPromise(entry);
    return await leerStreamAcotado(stream, KML_DESCOMPRIMIDO_MAX_BYTES);
  } finally {
    zipfile.close();
  }
}

function buscarEntradaKml(zipfile: yauzl.ZipFile): Promise<yauzl.Entry | null> {
  return new Promise((resolve, reject) => {
    zipfile.on("entry", (entry: yauzl.Entry) => {
      if (/\.kml$/i.test(entry.fileName)) {
        zipfile.removeAllListeners("entry");
        zipfile.removeAllListeners("end");
        zipfile.removeAllListeners("error");
        resolve(entry);
        return;
      }
      zipfile.readEntry();
    });
    zipfile.on("end", () => resolve(null));
    zipfile.on("error", (err: Error) => reject(err));
    zipfile.readEntry();
  });
}

function leerStreamAcotado(stream: Readable, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    let total = 0;

    stream.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        stream.destroy();
        reject(new AppError("El contenido KML del KMZ excede el tamaño permitido", 400));
        return;
      }
      partes.push(chunk);
    });
    stream.on("end", () => resolve(Buffer.concat(partes).toString("utf-8")));
    stream.on("error", (err: Error) => reject(err));
  });
}
