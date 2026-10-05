import { createUserScopedClient } from "../config/supabase";

/**
 * Fila de `trees` para el mapa de inventario (SIG-1, ADR-015). Solo las
 * columnas que necesita el contrato de GET /api/projects/:id/trees.
 *
 * `ubicacion` se pide como `ubicacion::geometry`: PostgREST devuelve
 * entonces el GeoJSON que serializa PostGIS, en vez del EWKB hexadecimal
 * que entrega para `geography` (alternativa E1, ADR-010 v2.0). Es solo una
 * conversión de tipo en la lectura: `trees.ubicacion` sigue siendo la única
 * fuente espacial.
 */
export interface TreeRow {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  estado_ciclo_vida: string;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
  ubicacion: unknown;
  species: { nombre_cientifico: string; nombre_comun: string | null } | null;
}

/**
 * Tamaño de página pedido a PostgREST. Supabase corta cada respuesta en su
 * "Max rows" (1000 por defecto), así que no se pide más. El fin de la
 * lectura lo marca una página VACÍA, nunca una página corta (ver
 * tree.service.ts).
 */
export const TREE_PAGE_SIZE = 1000;

const TREE_COLUMNS =
  "id, tree_code, legacy_id, estado_ciclo_vida, direccion, comuna, lugar_referencia, ubicacion::geometry, species(nombre_cientifico, nombre_comun)";

/**
 * Una página de árboles del proyecto, por cursor: `id > afterId`, orden por
 * `id`. El índice `trees_project_id_id_key (project_id, id)` cubre este
 * filtro y orden. Usa el JWT del usuario: RLS (`trees_*`) se evalúa como
 * ese usuario, en paralelo a `assertProjectAccess` (ADR-014).
 */
export async function findTreesPage(
  accessToken: string,
  projectId: string,
  afterId: string | null
): Promise<TreeRow[]> {
  const supabase = createUserScopedClient(accessToken);
  let query = supabase.from("trees").select(TREE_COLUMNS).eq("project_id", projectId);
  if (afterId) {
    query = query.gt("id", afterId);
  }
  const { data, error } = await query
    .order("id", { ascending: true })
    .limit(TREE_PAGE_SIZE);

  if (error) {
    throw new Error(`Error al listar árboles: ${error.message}`);
  }
  return (data ?? []) as unknown as TreeRow[];
}
