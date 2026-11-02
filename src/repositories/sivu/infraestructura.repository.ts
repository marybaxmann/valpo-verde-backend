import { createUserScopedClient } from "../../config/supabase";

/** B8 — identidad y ubicación de los árboles del proyecto, de a 1000, con el JWT del usuario (PR-018 v6.0). */
export interface ArbolInfraestructuraRow {
  id: string;
  tree_code: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  sector: string | null;
  ubicacion: { type: "Point"; coordinates: [number, number] } | null;
}

export async function listarArbolesInfraestructura(accessToken: string, projectId: string): Promise<ArbolInfraestructuraRow[]> {
  const filas: ArbolInfraestructuraRow[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("trees")
      .select("id, tree_code, especie_cientifica, nombre_comun, sector, ubicacion::geometry")
      .eq("project_id", projectId)
      .order("tree_code", { ascending: true })
      .range(desde, desde + 999);
    if (error) throw new Error(error.message, { cause: error.code });
    const pagina = (data ?? []) as unknown as ArbolInfraestructuraRow[];
    filas.push(...pagina);
    if (pagina.length < 1000) return filas;
  }
}
