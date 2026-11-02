import { createUserScopedClient } from "../../config/supabase";

/**
 * Inspecciones VÁLIDAS (el mismo filtro que `validas` de
 * fn_refresh_tree_current, migraciones 021/025, y que
 * obtenerUltimaInspeccionValidaSin): estado_registro = 'finalizado' (una
 * anulada deja de estarlo, CC-067) y OT completada (aprobada por el
 * Usuario municipal, CC-050). Solo de los tipos indicados. Con el JWT del
 * usuario (PR-018 v6.0).
 */
export async function listarArbolesConInspeccionValida(
  accessToken: string,
  treeIds: string[],
  tipos: readonly string[]
): Promise<Set<string>> {
  const salida = new Set<string>();
  for (let i = 0; i < treeIds.length; i += 150) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("inspections")
      .select("tree_id, work_orders!inner(estado_ot)")
      .in("tree_id", treeIds.slice(i, i + 150))
      .in("tipo_inspeccion_realizada", [...tipos])
      .eq("estado_registro", "finalizado")
      .eq("work_orders.estado_ot", "completada");
    if (error) throw new Error(error.message, { cause: error.code });
    for (const f of (data ?? []) as Array<{ tree_id: string }>) salida.add(f.tree_id);
  }
  return salida;
}
