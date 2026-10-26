import { randomUUID } from "crypto";
import sharp from "sharp";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import { obtenerInspeccionPorId } from "../../repositories/sivu/inspection.repository";
import { obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import {
  PhotoRow,
  crearFotoRegistro,
  eliminarArchivoDeStorage,
  generarUrlFirmada,
  listarFotosPorInspeccion,
  subirArchivoAStorage,
} from "../../repositories/sivu/photo.repository";
import { SubirFotoInspeccionBody } from "../../schemas/sivu/fotos.schema";

/** D-27: la Evaluación instrumental no admite fotos. */
const TIPO_SIN_FOTOS = "evaluacion_instrumental";

/** D-27: en Monitoreo, la vista es opcional; en el resto (salvo el de arriba), obligatoria. */
const TIPO_VISTA_OPCIONAL = "monitoreo";

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
}

interface FotoProcesada {
  buffer: Buffer;
  extension: "jpg" | "png";
  contentType: "image/jpeg" | "image/png";
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

/**
 * POST /api/sivu/inspections/:inspectionId/photos — el Inspector sube
 * una de las 4 vistas obligatorias (D-27) durante su inspección. La
 * foto NO se recodifica (CC-049 punto 6) — a diferencia del resto de
 * la Fase 6, aquí NO hay una función SQL (`fn_save_inspection_draft`)
 * haciendo de autoridad final para "responsable asignado/estado de la
 * OT y la inspección/tipo coherente": `photos` no tiene esa lógica, así
 * que el service la repite completa, con el mismo criterio que
 * CC-048/CC-050 (ver HANDOFF, novedad del #58).
 *
 * Todo se valida ANTES de subir el archivo. Si falla la inserción en
 * `photos` DESPUÉS de subirlo (por ejemplo, el trigger de proyecto
 * cerrado), se borra el archivo de Storage antes de propagar el error
 * — nunca queda un archivo huérfano.
 */
export async function subirFotoInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: SubirFotoInspeccionBody,
  archivo: ArchivoSubido,
  accessToken: string
): Promise<PhotoRow> {
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
  if (tipo !== TIPO_VISTA_OPCIONAL && body.vista === undefined) {
    throw new AppError("vista es obligatoria para este tipo de inspección (D-27)", 422);
  }

  const procesada = await verificarYProcesarFoto(archivo.buffer, false);

  const photoId = randomUUID();
  // Ruta sin datos personales: solo ids (proyecto/árbol/origen/uuid),
  // nunca el nombre del archivo original ni ningún dato del reportante
  // (CC-049; esta foto es del Inspector, pero el mismo criterio de ruta
  // se usa para todo origen).
  const storagePath = `${ot.project_id}/${inspeccion.tree_id}/inspeccion/${photoId}.${procesada.extension}`;

  await subirArchivoAStorage(storagePath, procesada.buffer, procesada.contentType);

  try {
    return await crearFotoRegistro({
      id: photoId,
      treeId: inspeccion.tree_id,
      storagePath,
      vista: body.vista ?? null,
      inspectionId,
      maintenanceRecordId: null,
      incidentId: null,
      uploadedBy: user.id,
    });
  } catch (err) {
    await eliminarArchivoDeStorage(storagePath);
    throw err;
  }
}

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
