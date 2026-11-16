import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Ficha pública editable (CC-073; migración 037).
//
// Escritura: solo con las funciones SECURITY DEFINER de la 037 (EXECUTE
// solo para service_role), que vuelven a verificar rol, cuenta activa y
// membresía. Lectura interna: con el JWT del usuario (RLS de SELECT de la
// 037). Fotos: bucket PÚBLICO `conecta-publico`, distinto del privado de
// las fotos técnicas (D-27); el backend sube y borra con service_role.
// ---------------------------------------------------------------------------

export const BUCKET_CONECTA = "conecta-publico";

/** SQLSTATE de la 037: contenido de especie y ficha de árbol. */
export const SQLSTATE_CONTENIDO_ESPECIE = "SV080";
export const SQLSTATE_FICHA_ARBOL = "SV081";

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

export interface ContenidoEspecieRow {
  species_id: string;
  nombre_comun_visualizacion: string | null;
  articulo_nombre: "el" | "la" | null;
  curiosidad: string | null;
  aportes: Array<{ icono: string; titulo: string }>;
  quien_soy: string | null;
  rasgos: Array<{ id: string; etiqueta: string; texto: string; foto_path: string | null; credito?: string | null }>;
  anio_estacional: Record<"prim" | "ver" | "oto" | "inv", string> | null;
  ciclo: { titulo: string; pasos: Array<{ etiqueta: string; texto: string }> } | null;
  historia_especie: string | null;
  consejo: string | null;
  fuentes: Array<{ bloques: string[]; tema: string; referencia: string; enlace?: string }>;
  foto_referencial_path: string | null;
  credito_foto_referencial: string | null;
  foto_referencial_temporal: boolean;
  updated_by: string;
  updated_at: string;
}

export async function obtenerContenidoEspecie(accessToken: string, speciesId: string): Promise<ContenidoEspecieRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("species_public_content")
    .select("*")
    .eq("species_id", speciesId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as ContenidoEspecieRow | null) ?? null;
}

export async function guardarContenidoEspecie(speciesId: string, usuario: string, contenido: unknown): Promise<{ rutas_a_borrar: string[] }> {
  const { data, error } = await supabaseAdmin.rpc("fn_guardar_contenido_especie", {
    p_species_id: speciesId,
    p_usuario: usuario,
    p_contenido: contenido,
  });
  if (error) lanzar(error);
  return data as { rutas_a_borrar: string[] };
}

export async function fijarFotoEspecie(input: {
  speciesId: string;
  usuario: string;
  ranura: string;
  path: string | null;
  credito: string | null;
  temporal: boolean;
}): Promise<{ ruta_anterior: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("fn_fijar_foto_especie", {
    p_species_id: input.speciesId,
    p_usuario: input.usuario,
    p_ranura: input.ranura,
    p_path: input.path,
    p_credito: input.credito,
    p_temporal: input.temporal,
  });
  if (error) lanzar(error);
  return data as { ruta_anterior: string | null };
}

export interface FichaArbolRow {
  tree_id: string;
  mostrar_clase_edad: boolean;
  mostrar_altura_total: boolean;
  mostrar_dap: boolean;
  mostrar_diametro_copa: boolean;
  mostrar_rango_edad: boolean;
  historia: string | null;
  historia_fuente: string | null;
  foto_path: string | null;
  textos_personalizados: Partial<Record<"curiosidad" | "quien_soy" | "consejo", { texto: string; fuente: string | null }>>;
  updated_by: string;
  updated_at: string;
}

export async function obtenerFichaArbol(accessToken: string, treeId: string): Promise<FichaArbolRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("tree_public_content")
    .select("*")
    .eq("tree_id", treeId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as FichaArbolRow | null) ?? null;
}

/** El árbol del proyecto, con lo que la ficha publica de él (valores vigentes). */
export interface ArbolParaFichaRow {
  id: string;
  qr_token: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  clase_edad: string | null;
  altura_total_m: number | null;
  dap_cm: number | null;
  diametro_copa_m: number | null;
  rango_edad_estimada_anios: string | null;
}

export async function obtenerArbolParaFicha(accessToken: string, projectId: string, treeId: string): Promise<ArbolParaFichaRow | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("trees")
    .select("id, qr_token, especie_cientifica, nombre_comun, clase_edad, altura_total_m, dap_cm, diametro_copa_m, rango_edad_estimada_anios")
    .eq("project_id", projectId)
    .eq("id", treeId)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as ArbolParaFichaRow | null) ?? null;
}

export async function guardarFichaArbol(treeId: string, usuario: string, datos: unknown): Promise<void> {
  const { error } = await supabaseAdmin.rpc("fn_guardar_ficha_publica_arbol", {
    p_tree_id: treeId,
    p_usuario: usuario,
    p_datos: datos,
  });
  if (error) lanzar(error);
}

export async function fijarFotoArbol(treeId: string, usuario: string, path: string | null): Promise<{ ruta_anterior: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("fn_fijar_foto_ficha_publica", {
    p_tree_id: treeId,
    p_usuario: usuario,
    p_path: path,
  });
  if (error) lanzar(error);
  return data as { ruta_anterior: string | null };
}

// --- Bucket público -------------------------------------------------------

export async function subirFotoPublica(path: string, buffer: Buffer): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET_CONECTA).upload(path, buffer, { contentType: "image/webp", upsert: false });
  if (error) throw new Error(error.message);
}

/**
 * Borra archivos del bucket público. No vuelve a lanzar si falla: o ya
 * hay un error original que reportar, o la escritura en la base ya se
 * confirmó y un archivo huérfano se recupera con una limpieza posterior.
 */
export async function borrarFotosPublicas(paths: Array<string | null | undefined>): Promise<void> {
  const rutas = paths.filter((p): p is string => Boolean(p));
  if (rutas.length === 0) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET_CONECTA).remove(rutas);
  if (error) console.error(`No se pudieron borrar ${rutas.length} archivo(s) de ${BUCKET_CONECTA}: ${error.message}`);
}

/** URL pública de un archivo del bucket (sin red: solo arma la dirección). */
export function urlPublica(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabaseAdmin.storage.from(BUCKET_CONECTA).getPublicUrl(path).data.publicUrl;
}
