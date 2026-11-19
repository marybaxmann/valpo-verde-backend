import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import { obtenerInspeccionPorId } from "../../repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import { obtenerArbolDeProyecto } from "../../repositories/sivu/tree.repository";
import {
  PhotoRow,
  SQLSTATE_UNIQUE_VIOLATION,
  VistaFoto,
  buscarFotoPorHuella,
  crearFotoRegistro,
  crearUrlSubidaFirmada,
  descargarArchivo,
  eliminarArchivoDeStorage,
  eliminarFotoRegistro,
  obtenerFotoPorId,
  generarUrlFirmada,
  listarFotosPorArbol,
  listarFotosPorInspeccion,
  moverArchivo,
  subirArchivoAStorage,
} from "../../repositories/sivu/photo.repository";
import {
  ConfirmarSubidaBody,
  MAX_FOTO_ORIGINAL_BYTES,
  SolicitarSubidaBody,
  SubirFotoArbolBody,
  SubirFotoInspeccionBody,
} from "../../schemas/sivu/fotos.schema";

/** D-27: la Evaluación instrumental no admite fotos. */
const TIPO_SIN_FOTOS = "evaluacion_instrumental";

/** Roles que asocian fotos de registro al árbol (039): quien registra el inventario y quien inspecciona. */
const ROLES_FOTO_REGISTRO = ["usuario_municipal", "inspector"] as const;

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
}

interface FotoProcesada {
  buffer: Buffer;
  extension: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
}

/** Dónde queda la foto: árbol, proyecto y (si corresponde) inspección. */
interface DestinoFoto {
  projectId: string;
  treeId: string;
  inspectionId: string | null;
  /** Segmento de la ruta en Storage. */
  origen: "inspeccion" | "registro";
}

/**
 * Verifica el formato REAL del archivo decodificándolo con `sharp`
 * (CC-049 punto 5) — nunca confía en la extensión ni en el
 * `Content-Type` declarado, que el cliente puede falsificar. Si
 * `quitarMetadatos` (solo fotos ciudadanas, CC-049 punto 6), recodifica
 * sin EXIF/GPS; las fotos del Inspector se devuelven tal cual —su
 * fecha/ubicación son evidencia de la inspección (D-27).
 */
export async function verificarYProcesarFoto(buffer: Buffer, quitarMetadatos: boolean): Promise<FotoProcesada> {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new AppError("El archivo no es una imagen válida", 400);
  }

  if (metadata.format !== "jpeg" && metadata.format !== "png") {
    throw new AppError("La foto debe ser JPG o PNG (verificado por su contenido, no por la extensión)", 400);
  }

  const extension = metadata.format === "jpeg" ? "jpg" : "png";
  const contentType = metadata.format === "jpeg" ? "image/jpeg" : "image/png";

  if (!quitarMetadatos) {
    return { buffer, extension, contentType };
  }

  // Sin .withMetadata(): sharp descarta EXIF/GPS/perfil ICC al
  // recodificar — es el comportamiento por defecto de la librería.
  const recodificado = metadata.format === "jpeg" ? await sharp(buffer).jpeg().toBuffer() : await sharp(buffer).png().toBuffer();

  return { buffer: recodificado, extension, contentType };
}

/** SHA-256 en hexadecimal (039): huella del original, sin recodificar. */
export function huellaSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function mensajeDuplicada(foto: PhotoRow): string {
  return `La fotografía ya está asociada a este árbol (foto ${foto.id})`;
}

// ---------------------------------------------------------------------------
// Autorización por destino
// ---------------------------------------------------------------------------

/**
 * Reglas de subida a una inspección (CC-048/CC-050; D-27), comunes a la
 * subida directa y a la firmada. Todo se valida ANTES de tocar Storage.
 *
 * A diferencia del resto de la Fase 6, aquí NO hay una función SQL
 * haciendo de autoridad final para "responsable asignado/estado de la
 * OT y la inspección/tipo coherente": `photos` no tiene esa lógica, así
 * que el service la repite completa (ver HANDOFF, novedad del #58).
 */
async function autorizarSubidaInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  accessToken: string
): Promise<DestinoFoto> {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) {
    throw new AppError("La inspección no existe", 404);
  }

  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) {
    throw new AppError("La orden de trabajo de la inspección no existe", 404);
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  // Solo el Inspector responsable ACTUAL de la OT (CC-050: cubre la
  // reasignación sin ningún paso adicional — el anterior queda
  // rechazado de inmediato). `user.role === 'inspector'` ya lo exige
  // assertProjectRole; `user.activo` ya lo exige authMiddleware en
  // cada request (consulta fresca, nunca cacheado en el JWT) — no se
  // repiten esos dos acá.
  if (ot.responsable_accion_id !== user.id) {
    throw new AppError("Solo el Inspector responsable asignado de esta orden de trabajo puede subir fotos", 403);
  }

  // Estado (CC-048/CC-050): una inspección Finalizada o Anulada no
  // admite fotos nuevas, para no alterar su evidencia.
  if (ot.estado_ot !== "en_ejecucion") {
    throw new AppError("La orden de trabajo no está En ejecución", 422);
  }
  if (inspeccion.estado_registro !== "preguardado") {
    throw new AppError("La inspección ya no admite fotos nuevas (no está en Preguardado)", 422);
  }

  // Tipo de inspección (D-27).
  const tipo = inspeccion.tipo_inspeccion_realizada;
  if (tipo === TIPO_SIN_FOTOS) {
    throw new AppError("La Evaluación instrumental no admite fotos (D-27)", 422);
  }

  return { projectId: ot.project_id, treeId: inspeccion.tree_id, inspectionId, origen: "inspeccion" };
}

/**
 * Foto de registro del árbol (039; decisión B de la integración
 * AV_000001–012): un original asociado al ejemplar sin abrir una
 * inspección. No cuenta para D-27 ni altera ninguna evaluación.
 */
async function autorizarSubidaArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  accessToken: string
): Promise<DestinoFoto> {
  await assertProjectRole(user, projectId, ROLES_FOTO_REGISTRO, accessToken);
  const arbol = await obtenerArbolDeProyecto(projectId, treeId);
  if (!arbol) {
    throw new AppError("El árbol no existe en este proyecto", 404);
  }
  return { projectId, treeId, inspectionId: null, origen: "registro" };
}

// ---------------------------------------------------------------------------
// Registro común: deduplicación, Storage y fila
// ---------------------------------------------------------------------------

async function rechazarSiDuplicada(treeId: string, sha256: string): Promise<void> {
  const existente = await buscarFotoPorHuella(treeId, sha256);
  if (existente) {
    throw new AppError(mensajeDuplicada(existente), 409);
  }
}

/** Inserta la fila; si falla, borra el archivo ya subido (nunca queda huérfano). Un duplicado concurrente → 409. */
async function insertarFila(
  user: AuthenticatedUser,
  destino: DestinoFoto,
  photoId: string,
  storagePath: string,
  vista: VistaFoto | null,
  sha256: string
): Promise<PhotoRow> {
  try {
    return await crearFotoRegistro({
      id: photoId,
      treeId: destino.treeId,
      storagePath,
      vista,
      inspectionId: destino.inspectionId,
      maintenanceRecordId: null,
      incidentId: null,
      uploadedBy: user.id,
      sha256,
    });
  } catch (err) {
    await eliminarArchivoDeStorage(storagePath);
    if ((err as { cause?: unknown }).cause === SQLSTATE_UNIQUE_VIOLATION) {
      throw new AppError("La fotografía ya está asociada a este árbol", 409);
    }
    throw err;
  }
}

/** Ruta sin datos personales: solo ids (proyecto/árbol/origen/uuid), nunca el nombre del archivo original (CC-049). */
function rutaDefinitiva(destino: DestinoFoto, photoId: string, extension: string): string {
  return `${destino.projectId}/${destino.treeId}/${destino.origen}/${photoId}.${extension}`;
}

async function registrarFotoDirecta(
  user: AuthenticatedUser,
  destino: DestinoFoto,
  vista: VistaFoto | null,
  archivo: ArchivoSubido
): Promise<PhotoRow> {
  const procesada = await verificarYProcesarFoto(archivo.buffer, false);
  const sha256 = huellaSha256(procesada.buffer);
  await rechazarSiDuplicada(destino.treeId, sha256);

  const photoId = randomUUID();
  const storagePath = rutaDefinitiva(destino, photoId, procesada.extension);
  await subirArchivoAStorage(storagePath, procesada.buffer, procesada.contentType);
  return insertarFila(user, destino, photoId, storagePath, vista, sha256);
}

// ---------------------------------------------------------------------------
// Subida directa (multipart, hasta el límite del cuerpo de la plataforma)
// ---------------------------------------------------------------------------

/**
 * POST /api/sivu/inspections/:inspectionId/photos — el Inspector sube
 * una foto durante su inspección (D-27). La foto NO se recodifica
 * (CC-049 punto 6). 039: se guarda su SHA-256 y se rechaza (409) el
 * mismo original ya asociado al árbol.
 */
export async function subirFotoInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: SubirFotoInspeccionBody,
  archivo: ArchivoSubido,
  accessToken: string
): Promise<PhotoRow> {
  const destino = await autorizarSubidaInspeccion(user, inspectionId, accessToken);
  return registrarFotoDirecta(user, destino, body.vista ?? null, archivo);
}

/** POST /api/sivu/projects/:id/trees/:treeId/photos — foto de registro del árbol (039). */
export async function subirFotoArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  body: SubirFotoArbolBody,
  archivo: ArchivoSubido,
  accessToken: string
): Promise<PhotoRow> {
  const destino = await autorizarSubidaArbol(user, projectId, treeId, accessToken);
  return registrarFotoDirecta(user, destino, body.vista ?? null, archivo);
}

// ---------------------------------------------------------------------------
// Carga firmada en dos pasos (039; decisión H: originales > 4,5 MB)
// ---------------------------------------------------------------------------

export interface SubidaFirmada {
  upload_id: string;
  path: string;
  signed_url: string;
  token: string;
}

/** Staging por usuario: la ruta la decide el servidor y se vuelve a derivar al confirmar. */
function rutaPendiente(userId: string, uploadId: string): string {
  return `pendientes/${userId}/${uploadId}`;
}

async function solicitarSubida(user: AuthenticatedUser, destino: DestinoFoto, body: SolicitarSubidaBody): Promise<SubidaFirmada> {
  // Se rechaza antes de transferir nada si la huella declarada ya está en el árbol.
  await rechazarSiDuplicada(destino.treeId, body.sha256);
  const uploadId = randomUUID();
  const firmada = await crearUrlSubidaFirmada(rutaPendiente(user.id, uploadId));
  return { upload_id: uploadId, path: firmada.path, signed_url: firmada.signedUrl, token: firmada.token };
}

async function confirmarSubida(user: AuthenticatedUser, destino: DestinoFoto, body: ConfirmarSubidaBody): Promise<PhotoRow> {
  const pendiente = rutaPendiente(user.id, body.upload_id);
  const buffer = await descargarArchivo(pendiente);
  if (!buffer) {
    throw new AppError("No se encontró la carga pendiente (¿se subió el archivo con el enlace firmado?)", 404);
  }

  try {
    if (buffer.length > MAX_FOTO_ORIGINAL_BYTES) {
      throw new AppError("La foto supera el máximo de 10 MB", 413);
    }
    const procesada = await verificarYProcesarFoto(buffer, false);
    const sha256 = huellaSha256(procesada.buffer);
    if (sha256 !== body.sha256) {
      throw new AppError("La huella del archivo recibido no coincide con la declarada", 422);
    }
    await rechazarSiDuplicada(destino.treeId, sha256);

    const photoId = randomUUID();
    const storagePath = rutaDefinitiva(destino, photoId, procesada.extension);
    await moverArchivo(pendiente, storagePath);
    return await insertarFila(user, destino, photoId, storagePath, body.vista ?? null, sha256);
  } catch (err) {
    // La carga pendiente nunca queda: o se movió a su ruta definitiva, o se descarta.
    await eliminarArchivoDeStorage(pendiente);
    throw err;
  }
}

/** POST /api/sivu/inspections/:inspectionId/photos/upload-url */
export async function solicitarSubidaInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: SolicitarSubidaBody,
  accessToken: string
): Promise<SubidaFirmada> {
  const destino = await autorizarSubidaInspeccion(user, inspectionId, accessToken);
  return solicitarSubida(user, destino, body);
}

/** POST /api/sivu/inspections/:inspectionId/photos/confirm — vuelve a autorizar: el estado pudo cambiar entre los dos pasos. */
export async function confirmarSubidaInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: ConfirmarSubidaBody,
  accessToken: string
): Promise<PhotoRow> {
  const destino = await autorizarSubidaInspeccion(user, inspectionId, accessToken);
  return confirmarSubida(user, destino, body);
}

/** POST /api/sivu/projects/:id/trees/:treeId/photos/upload-url */
export async function solicitarSubidaArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  body: SolicitarSubidaBody,
  accessToken: string
): Promise<SubidaFirmada> {
  const destino = await autorizarSubidaArbol(user, projectId, treeId, accessToken);
  return solicitarSubida(user, destino, body);
}

/** POST /api/sivu/projects/:id/trees/:treeId/photos/confirm */
export async function confirmarSubidaArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  body: ConfirmarSubidaBody,
  accessToken: string
): Promise<PhotoRow> {
  const destino = await autorizarSubidaArbol(user, projectId, treeId, accessToken);
  return confirmarSubida(user, destino, body);
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export interface FotoConUrl {
  id: string;
  vista: PhotoRow["vista"];
  url: string;
  created_at: string;
  uploaded_by: string | null;
}

/**
 * GET /api/sivu/inspections/:inspectionId/photos — cualquier rol con
 * acceso al proyecto (igual que la búsqueda de especies, CC-053): ver
 * las fotos no está reservado al Inspector. El enlace firmado se
 * genera recién aquí, después de `assertProjectAccess` (CC-049 punto 3)
 * — nunca se guarda ni se expone una URL pública fija.
 */
export async function listarFotosInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  accessToken: string
): Promise<FotoConUrl[]> {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) {
    throw new AppError("La inspección no existe", 404);
  }

  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) {
    throw new AppError("La orden de trabajo de la inspección no existe", 404);
  }

  await assertProjectAccess(user, ot.project_id, accessToken);

  // Filas de `photos` con el JWT del usuario (PR-018 v5.0, CC-064 decisión i);
  // el enlace firmado sigue con service_role, después de assertProjectAccess (CC-049).
  const fotos = await listarFotosPorInspeccion(accessToken, inspectionId);

  return Promise.all(
    fotos.map(async (foto) => ({
      id: foto.id,
      vista: foto.vista,
      url: await generarUrlFirmada(foto.storage_path),
      created_at: foto.created_at,
      uploaded_by: foto.uploaded_by,
    }))
  );
}

export type OrigenFoto = "registro" | "inspeccion" | "mantenimiento" | "incidencia";

export interface FotoArbolConUrl extends FotoConUrl {
  origen: OrigenFoto;
  inspection_id: string | null;
  /** Huella del original (039); permite al cliente comprobar que no hay duplicados. */
  sha256: string | null;
}

export function origenDeFoto(foto: Pick<PhotoRow, "inspection_id" | "maintenance_record_id" | "incident_id">): OrigenFoto {
  if (foto.inspection_id) return "inspeccion";
  if (foto.maintenance_record_id) return "mantenimiento";
  if (foto.incident_id) return "incidencia";
  return "registro";
}

/**
 * GET /api/sivu/projects/:id/trees/:treeId/photos (039) — todas las fotos
 * del ejemplar para la ficha interna, con su origen. Todos los miembros
 * del proyecto y el Administrador (como la ficha, CC-064 a).
 */
export async function listarFotosArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  accessToken: string
): Promise<FotoArbolConUrl[]> {
  await assertProjectAccess(user, projectId, accessToken);
  const arbol = await obtenerArbolDeProyecto(projectId, treeId);
  if (!arbol) {
    throw new AppError("El árbol no existe en este proyecto", 404);
  }

  const fotos = await listarFotosPorArbol(accessToken, treeId);
  return Promise.all(
    fotos.map(async (foto) => ({
      id: foto.id,
      vista: foto.vista,
      url: await generarUrlFirmada(foto.storage_path),
      created_at: foto.created_at,
      uploaded_by: foto.uploaded_by,
      origen: origenDeFoto(foto),
      inspection_id: foto.inspection_id,
      sha256: foto.sha256,
    }))
  );
}

// ---------------------------------------------------------------------------
// Eliminación (sin cambios)
// ---------------------------------------------------------------------------

/**
 * DELETE /api/sivu/inspections/:inspectionId/photos/:photoId — el
 * Inspector responsable quita una foto subida por error mientras la
 * inspección está en Preguardado (decisión de la responsable,
 * 2026-10-30). Una inspección Finalizada o Anulada nunca pierde fotos:
 * son evidencia (D-27). Mismas reglas que subir (CC-048/CC-050).
 *
 * Se borra primero la fila y después el archivo: si falla el archivo,
 * queda un huérfano en Storage (recuperable) y la foto ya no cuenta
 * para finalizar; al revés, quedaría una fila apuntando a nada.
 */
export async function eliminarFotoInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  photoId: string,
  accessToken: string
): Promise<void> {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) {
    throw new AppError("La inspección no existe", 404);
  }

  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) {
    throw new AppError("La orden de trabajo de la inspección no existe", 404);
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  if (ot.responsable_accion_id !== user.id) {
    throw new AppError("Solo el Inspector responsable asignado de esta orden de trabajo puede eliminar fotos", 403);
  }
  if (ot.estado_ot !== "en_ejecucion") {
    throw new AppError("La orden de trabajo no está En ejecución", 422);
  }
  if (inspeccion.estado_registro !== "preguardado") {
    throw new AppError("Solo se pueden eliminar fotos de una inspección en borrador (Preguardado)", 422);
  }

  const foto = await obtenerFotoPorId(photoId);
  if (!foto || foto.inspection_id !== inspectionId) {
    throw new AppError("La foto no existe en esta inspección", 404);
  }

  try {
    await eliminarFotoRegistro(photoId, inspectionId);
  } catch (error) {
    if (error instanceof Error && error.cause === "SV041") {
      throw new AppError("La inspección ya finalizó y la fotografía sigue asociada", 409);
    }
    throw error;
  }
  await eliminarArchivoDeStorage(foto.storage_path);
}
