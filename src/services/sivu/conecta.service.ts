import { createHash, randomBytes, randomUUID } from "crypto";
import { AppError } from "../../utils/AppError";
import { etiquetaDe } from "../rules/engine/catalogs";
import { verificarYProcesarFoto, ArchivoSubido } from "./photo.service";
import { eliminarArchivoDeStorage, subirArchivoAStorage } from "../../repositories/sivu/photo.repository";
import {
  crearIncidenciaCiudadana,
  obtenerEstadoSeguimiento,
  obtenerFichaPublica,
  purgarHuellasVencidas,
} from "../../repositories/sivu/conecta.repository";
import { ReporteCiudadanoBody } from "../../schemas/sivu/conecta.schema";

/**
 * Valpo Verde Conecta, parte pública (#62; CC-062 / PR-022 v2.0). Sin
 * sesión: los límites de solicitudes van en las rutas.
 */

/** Misma respuesta para un QR inexistente o mal formado (CC-062, pruebas). */
export const ARBOL_NO_ENCONTRADO = "No encontramos este árbol.";
/** Misma respuesta para un código inexistente, vencido o mal formado (CC-062 punto 4). */
export const REPORTE_NO_ENCONTRADO = "No encontramos un reporte con ese código.";

/** 16 bytes = 128 bits (CC-062 punto 4), en base64url: 22 caracteres. */
const BYTES_CODIGO = 16;
const FORMATO_CODIGO = /^[A-Za-z0-9_-]{22}$/;

function huellaDe(codigo: string): string {
  return createHash("sha256").update(codigo, "utf8").digest("hex");
}

const conEtiqueta = (catalogo: string, codigo: string | null) =>
  codigo === null ? null : { codigo, etiqueta: etiquetaDe(catalogo, codigo) };

/** GET /api/sivu/conecta/arboles/:qrToken — ficha pública (CC-062 punto 3). */
export async function fichaPublica(qrToken: string) {
  const ficha = await obtenerFichaPublica(qrToken);
  if (!ficha) throw new AppError(ARBOL_NO_ENCONTRADO, 404);
  const s = ficha.sobre_la_especie;
  return {
    especie_cientifica: ficha.especie_cientifica,
    nombre_comun: ficha.nombre_comun,
    ubicacion_descriptiva: ficha.ubicacion_descriptiva,
    sobre_la_especie: {
      especie_cientifica: s.especie_cientifica,
      genero: s.genero,
      familia: s.familia,
      origen_biogeografico: conEtiqueta("origen_biogeografico", s.origen_biogeografico),
      persistencia_follaje: conEtiqueta("persistencia_follaje", s.persistencia_follaje),
      tipo_hoja: conEtiqueta("tipo_hoja", s.tipo_hoja),
    },
  };
}

/**
 * POST /api/sivu/conecta/arboles/:qrToken/incidencias — formulario
 * ciudadano (PR-022 v2.0). Las fotos se recodifican sin metadatos
 * (CC-049 punto 6) y se suben antes de crear la incidencia; si la
 * creación falla, se borran. El código de seguimiento se devuelve una
 * sola vez y la base guarda solo su huella.
 */
export async function crearReporteCiudadano(qrToken: string, body: ReporteCiudadanoBody, archivos: ArchivoSubido[]) {
  if (archivos.length === 0) {
    throw new AppError("Debe adjuntar al menos una fotografía (D-183)", 400);
  }
  if (!(await obtenerFichaPublica(qrToken))) {
    throw new AppError(ARBOL_NO_ENCONTRADO, 404);
  }

  // Todas se verifican antes de subir ninguna.
  const procesadas = await Promise.all(archivos.map((a) => verificarYProcesarFoto(a.buffer, true)));

  const incidentId = randomUUID();
  const fotos: Array<{ id: string; storage_path: string }> = [];
  try {
    for (const p of procesadas) {
      const id = randomUUID();
      // Ruta sin datos personales: solo ids (CC-049).
      const storagePath = `incidencias/${incidentId}/${id}.${p.extension}`;
      await subirArchivoAStorage(storagePath, p.buffer, p.contentType);
      fotos.push({ id, storage_path: storagePath });
    }

    const codigo = randomBytes(BYTES_CODIGO).toString("base64url");
    const creada = await crearIncidenciaCiudadana({
      incidentId,
      qrToken,
      tipoIncidencia: body.tipo_incidencia,
      descripcion: body.descripcion,
      nombreReportante: body.nombre_reportante,
      rutReportante: body.rut_reportante,
      huellaHex: huellaDe(codigo),
      fotos,
    });

    await purgarHuellasVencidas().catch((err) => console.error("No se pudieron purgar las huellas vencidas:", err));

    return { codigo_seguimiento: codigo, fecha_reporte: creada.fecha_reporte };
  } catch (err) {
    await Promise.all(fotos.map((f) => eliminarArchivoDeStorage(f.storage_path)));
    throw traducirErrorReporte(err);
  }
}

function traducirErrorReporte(err: unknown): Error {
  if (err instanceof AppError) return err;
  const error = err as Error;
  if (/está cerrado/.test(error.message)) {
    return new AppError("Este árbol no recibe reportes en este momento.", 409);
  }
  if ((error as { cause?: unknown }).cause === "SV070") {
    return /código QR/.test(error.message) ? new AppError(ARBOL_NO_ENCONTRADO, 404) : new AppError(error.message, 400);
  }
  return error;
}

/**
 * POST /api/sivu/conecta/seguimiento — solo el estado del reporte
 * (CC-062 punto 4). Antes de consultar, purga las huellas vencidas.
 */
export async function consultarSeguimiento(codigo: unknown) {
  await purgarHuellasVencidas().catch((err) => console.error("No se pudieron purgar las huellas vencidas:", err));
  if (typeof codigo !== "string" || !FORMATO_CODIGO.test(codigo)) {
    throw new AppError(REPORTE_NO_ENCONTRADO, 404);
  }
  const estado = await obtenerEstadoSeguimiento(huellaDe(codigo));
  if (!estado) throw new AppError(REPORTE_NO_ENCONTRADO, 404);
  return { estado_incidencia: conEtiqueta("estado_incidencia", estado) };
}
