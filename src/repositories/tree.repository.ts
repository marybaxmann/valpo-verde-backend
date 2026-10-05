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

export interface CreateTreeRpcParams {
  p_project_id: string;
  p_species_id: string;
  p_public_space_id: string | null;
  p_direccion: string | null;
  p_comuna: string | null;
  p_lugar_referencia: string | null;
  p_lon: number;
  p_lat: number;
  p_medicion: {
    fecha_medicion: string;
    configuracion_fustes: string;
    numero_fustes?: number | null;
    dap_fustes_cm?: number[] | null;
    dap_cm?: number | null;
    altura_total_m: number;
    diametro_copa_m: number;
    altura_primera_rama_m: number;
    clase_edad?: string | null;
  };
}

export interface CreateTreeRpcResult {
  tree_id: string;
  tree_code: string;
  measurement_id: string;
}

export interface TreeDetailRow {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  project_id: string;
  public_space_id: string | null;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
  ubicacion: unknown;
  estado_ciclo_vida: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  species: { id: string; nombre_cientifico: string; nombre_comun: string | null } | null;
  public_spaces: { id: string; nombre: string; tipo: string | null } | null;
}

const TREE_DETAIL_COLUMNS =
  "id, tree_code, legacy_id, project_id, public_space_id, direccion, comuna, lugar_referencia, ubicacion::geometry, estado_ciclo_vida, created_by, created_at, updated_at, species(id, nombre_cientifico, nombre_comun), public_spaces(id, nombre, tipo)";

/**
 * Invoca la función RPC transaccional fn_create_tree_with_measurement en PostgreSQL.
 * Inserta árbol y medición inicial en una sola transacción atómica con RLS evaluado
 * mediante el JWT del usuario (ADR-014 / INV-1A).
 */
export async function createTreeWithMeasurementRpc(
  accessToken: string,
  params: CreateTreeRpcParams
): Promise<CreateTreeRpcResult> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase.rpc(
    "fn_create_tree_with_measurement",
    params
  );

  if (error) {
    throw new Error(`Error al crear árbol con medición inicial: ${error.message}`);
  }

  return data as unknown as CreateTreeRpcResult;
}

/**
 * Consulta un árbol por su identificador único para la ficha de árbol (GET /api/trees/:treeId).
 */
export async function findTreeById(
  accessToken: string,
  treeId: string
): Promise<TreeDetailRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("trees")
    .select(TREE_DETAIL_COLUMNS)
    .eq("id", treeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al consultar árbol por id: ${error.message}`);
  }

  return (data ?? null) as unknown as TreeDetailRow | null;
}
