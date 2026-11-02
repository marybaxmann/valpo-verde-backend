import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

/**
 * Avisos dentro de SIVU (CC-051) y recordatorios (#63). Requiere la
 * migración 033 (PROPUESTA, sin aplicar todavía).
 *
 * - Lectura: con el JWT del usuario; la RLS solo deja ver los propios.
 * - Escritura: solo el backend con service_role (CC-033). Los avisos de
 *   OT los crea el trigger de work_orders en la misma transacción que la
 *   cancelación o la reasignación; aquí solo se insertan recordatorios y
 *   se marca como leído.
 */

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

export interface NotificacionRow {
  id: string;
  user_id: string;
  tipo: string;
  work_order_id: string | null;
  tree_id: string | null;
  mensaje: string;
  leido_at: string | null;
  created_at: string;
}

const COLUMNAS = "id, user_id, tipo, work_order_id, tree_id, mensaje, leido_at, created_at";

export async function listarNotificacionesPropias(
  accessToken: string,
  filtros: { soloNoLeidas: boolean; limit: number; offset: number }
): Promise<{ filas: NotificacionRow[]; total: number; noLeidas: number }> {
  const cliente = createUserScopedClient(accessToken);
  let query = cliente.from("notifications").select(COLUMNAS, { count: "exact" });
  if (filtros.soloNoLeidas) query = query.is("leido_at", null);
  const [lista, noLeidas] = await Promise.all([
    query.order("created_at", { ascending: false }).order("id", { ascending: true }).range(filtros.offset, filtros.offset + filtros.limit - 1),
    cliente.from("notifications").select("id", { count: "exact", head: true }).is("leido_at", null),
  ]);
  if (lista.error) lanzar(lista.error);
  if (noLeidas.error) lanzar(noLeidas.error);
  return { filas: (lista.data ?? []) as NotificacionRow[], total: lista.count ?? 0, noLeidas: noLeidas.count ?? 0 };
}

/** Un aviso propio (la RLS devuelve null si es de otro usuario). */
export async function obtenerNotificacionPropia(accessToken: string, id: string): Promise<NotificacionRow | null> {
  const { data, error } = await createUserScopedClient(accessToken).from("notifications").select(COLUMNAS).eq("id", id).maybeSingle();
  if (error) lanzar(error);
  return (data as NotificacionRow | null) ?? null;
}

/** Marca como leído (service_role), acotado al dueño; no cambia la fecha si ya estaba leído. */
export async function marcarNotificacionLeida(id: string, userId: string): Promise<NotificacionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .update({ leido_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("leido_at", null)
    .select(COLUMNAS)
    .maybeSingle();
  if (error) lanzar(error);
  return (data as NotificacionRow | null) ?? null;
}

export interface RecordatorioNuevo {
  user_id: string;
  tipo: "recordatorio_inspeccion";
  tree_id: string;
  mensaje: string;
  clave_unica: string;
}

/**
 * Inserta recordatorios sin duplicar: ON CONFLICT (user_id, clave_unica)
 * DO NOTHING (UNIQUE de la 033). Dos consultas simultáneas no pueden
 * crear el mismo recordatorio dos veces. Devuelve cuántos se crearon.
 */
export async function insertarRecordatorios(filas: RecordatorioNuevo[]): Promise<number> {
  if (filas.length === 0) return 0;
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .upsert(filas, { onConflict: "user_id,clave_unica", ignoreDuplicates: true })
    .select("id");
  if (error) lanzar(error);
  return (data ?? []).length;
}
