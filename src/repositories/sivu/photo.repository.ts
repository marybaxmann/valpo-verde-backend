import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

/** Bucket privado creado por la migración 019 (CC-049; issue #74). */
export const BUCKET_FOTOS = "tree-photos";

/**
 * 10 minutos (CC-049 punto 3, decisión exacta de la responsable) — lo
 * justo para que la página que muestra la foto termine de cargarla,
 * sin dejar un enlace válido por más tiempo del necesario.
 */
export const SEGUNDOS_URL_FIRMADA = 10 * 60;

export interface PhotoRow {
  id: string;
  tree_id: string;
  storage_path: string;
  vista: "arbol_completo" | "base" | "tronco" | "copa" | null;
  inspection_id: string | null;
  maintenance_record_id: string | null;
  incident_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

/**
 * Sube el archivo ya verificado (y, si corresponde, recodificado sin
 * metadatos) al bucket privado, con `service_role` — nunca el cliente
 * sube directo a Storage (CC-049 punto 2).
 */
export async function subirArchivoAStorage(path: string, buffer: Buffer, contentType: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET_FOTOS).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Borra el archivo recién subido cuando el paso siguiente (insertar la
 * fila en `photos`) falla — evita dejarlo huérfano en Storage (CC-049;
 * pedido explícito de la responsable). Con la Storage API (`remove`),
 * nunca `DELETE` por SQL (bloqueado por `storage.protect_delete()`,
 * ver la lección de la 019 en HANDOFF).
 *
 * Si el propio borrado falla, no vuelve a lanzar: ya hay un error
 * original (el de la inserción) que es la causa real a reportar: un
 * archivo huérfano en Storage sin su fila es recuperable con una
 * limpieza posterior; perder el error original no lo es.
 */
export async function eliminarArchivoDeStorage(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET_FOTOS).remove([path]);
  if (error) {
    console.error(`No se pudo borrar el archivo huérfano ${path} en Storage: ${error.message}`);
  }
}

export interface CrearFotoInput {
  /**
   * Generado por el service ANTES de insertar (no el default de la
   * columna): es el mismo id que ya forma parte de `storagePath` — el
   * archivo se sube a Storage antes de insertar la fila, así que el
   * nombre del archivo tiene que decidirse primero.
   */
  id: string;
  treeId: string;
  storagePath: string;
  vista: "arbol_completo" | "base" | "tronco" | "copa" | null;
  inspectionId: string | null;
  maintenanceRecordId: string | null;
  incidentId: string | null;
  uploadedBy: string;
}

const PHOTO_COLUMNS =
  "id, tree_id, storage_path, vista, inspection_id, maintenance_record_id, incident_id, uploaded_by, created_at";

/**
 * `photos` (migración 015) no tiene policy de escritura para
 * `authenticated` (CC-033) — con `service_role`, después de que el
 * service ya verificó la autorización del llamador.
 */
export async function crearFotoRegistro(input: CrearFotoInput): Promise<PhotoRow> {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .insert({
      id: input.id,
      tree_id: input.treeId,
      storage_path: input.storagePath,
      vista: input.vista,
      inspection_id: input.inspectionId,
      maintenance_record_id: input.maintenanceRecordId,
      incident_id: input.incidentId,
      uploaded_by: input.uploadedBy,
    })
    .select(PHOTO_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as PhotoRow;
}

export async function listarFotosPorInspeccion(accessToken: string, inspectionId: string): Promise<PhotoRow[]> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("photos")
    .select(PHOTO_COLUMNS)
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error al listar fotos de la inspección: ${error.message}`);
  }

  return (data ?? []) as unknown as PhotoRow[];
}

/**
 * Enlace firmado de corta duración (CC-049 punto 3) — el backend lo
 * genera con `service_role` DESPUÉS de que el service ya verificó
 * `assertProjectAccess`; nunca se expone una URL pública fija.
 */
export async function generarUrlFirmada(path: string, segundos: number = SEGUNDOS_URL_FIRMADA): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_FOTOS).createSignedUrl(path, segundos);

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo generar el enlace firmado");
  }

  return data.signedUrl;
}
