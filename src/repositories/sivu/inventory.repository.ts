import { createUserScopedClient } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Inventario arbóreo (B1 — GET /api/sivu/projects/:id/trees)
//
// Lectura con el JWT del usuario (PR-018 v6.0; CC-064 decisión g):
// la RLS de la migración 017 filtra por proyecto y rol como segunda capa.
// Las columnas devueltas son las del alta municipal (D-4 a D-29) y el
// valor vigente calculado por fn_refresh_tree_current (D-7 a D-29).
// Los campos dendrométricos legacy (dap/altura_total legacy) no se exponen;
// los valores vigentes viven en tree_data_versions / v_tree_current_inputs.
// ---------------------------------------------------------------------------

/** Proyección mínima aprobada del inventario (B1). */
export interface ArbolInventarioRow {
  id: string;
  tree_code: string;
  project_id: string;
  sector_id: string;
  sector: string | null;                    // D-7: valor vigente
  ubicacion_descriptiva: string | null;     // D-8
  utm_este: number | null;                  // D-9
  utm_norte: number | null;                 // D-10
  /** GeoJSON Point devuelto por PostgREST (columna `geography`). */
  ubicacion: { type: "Point"; coordinates: [number, number] } | null;
  especie_cientifica: string | null;        // D-13
  nombre_comun: string | null;              // D-14
  estado_ciclo_vida: string;               // 'activo' | 'retirado' | 'tocon'
  fecha_registro: string;                   // D-4
}

/** Columnas seleccionadas del inventario — lista constante para reutilizar. */
const INVENTARIO_COLUMNS =
  "id, tree_code, project_id, sector_id, sector, ubicacion_descriptiva, utm_este, utm_norte, ubicacion::geometry, especie_cientifica, nombre_comun, estado_ciclo_vida, fecha_registro";

export interface FiltrosInventario {
  projectId: string;
  /** Filtro opcional por sector (uuid). */
  sectorId?: string;
  /** Filtro opcional por estado_ciclo_vida ('activo' | 'retirado' | 'tocon'). */
  estadoCicloVida?: string;
  /** Búsqueda parcial (ILIKE) por especie_cientifica o nombre_comun. */
  busqueda?: string;
  limit: number;
  offset: number;
}

/**
 * Lista los árboles del proyecto con paginación y filtros opcionales.
 *
 * Orden: `tree_code` ascendente (orden natural del inventario).
 * La RLS de la migración 017 garantiza que solo los miembros activos del
 * proyecto, el Administrador y los roles operativos autorizados vean
 * estas filas (segunda capa, PR-018 v6.0).
 *
 * @param accessToken JWT del usuario autenticado (createUserScopedClient).
 * @param filtros     Filtros validados por el controller.
 */
export async function listarArbolesInventario(
  accessToken: string,
  filtros: FiltrosInventario
): Promise<{ filas: ArbolInventarioRow[]; total: number }> {
  let query = createUserScopedClient(accessToken)
    .from("trees")
    .select(INVENTARIO_COLUMNS, { count: "exact" })
    .eq("project_id", filtros.projectId);

  if (filtros.sectorId) {
    query = query.eq("sector_id", filtros.sectorId);
  }
  if (filtros.estadoCicloVida) {
    query = query.eq("estado_ciclo_vida", filtros.estadoCicloVida);
  }
  if (filtros.busqueda) {
    // Búsqueda parcial en especie_cientifica O nombre_comun (ILIKE).
    // PostgREST admite el operador `ilike` y el combinador `or`.
    const termino = `%${filtros.busqueda}%`;
    query = query.or(
      `especie_cientifica.ilike.${termino},nombre_comun.ilike.${termino}`
    );
  }

  const { data, error, count } = await query
    .order("tree_code", { ascending: true })
    .range(filtros.offset, filtros.offset + filtros.limit - 1);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return {
    filas: (data ?? []) as unknown as ArbolInventarioRow[],
    total: count ?? 0,
  };
}
