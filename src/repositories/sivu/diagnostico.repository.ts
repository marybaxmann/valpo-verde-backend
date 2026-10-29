import { createUserScopedClient } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Diagnóstico finalizado (B18 mínimo — GET /api/sivu/projects/:id/diagnosticos)
//
// Lectura con el JWT del usuario (PR-018 v6.0): la RLS de la 017 filtra
// inspections y evaluations por proyecto y rol como segunda capa.
// ---------------------------------------------------------------------------

export interface InspeccionFinalizadaRow {
  id: string;
  tree_id: string;
  codigo_inspeccion: string | null;
  work_order_id: string;
  tipo_inspeccion_realizada: string | null;
  subtipo_inspeccion: string | null;
  fecha_inspeccion: string;
  finalizada_at: string | null;
  requiere_mantenimiento: boolean | null;
  fecha_proxima_inspeccion: string | null;
  fecha_proximo_monitoreo: string | null;
  trees: { tree_code: string; project_id: string; especie_cientifica: string | null; nombre_comun: string | null } | null;
}

export interface EvaluacionResultadoRow {
  inspection_id: string;
  probabilidad_falla_raices_cuello: string | null;
  probabilidad_falla_tronco: string | null;
  probabilidad_falla_copa_ramas: string | null;
  probabilidad_impacto: string | null;
  clasificacion_raices_cuello: string | null;
  clasificacion_tronco: string | null;
  clasificacion_copa_ramas: string | null;
  clasificacion_riesgo_calculada: string | null;
  clasificacion_riesgo_ajustada: string | null;
  puntaje_infraestructura: number | null;
  pct_infraestructura: number | null;
  clasificacion_infraestructura_calculada: string | null;
  clasificacion_infraestructura_ajustada: string | null;
  clasificacion_prioridad_calculada: string | null;
  clasificacion_prioridad_ajustada: string | null;
  indicadores: unknown;
  rule_version: string | null;
}

// Desde trees, con la relación desambiguada por columna (inspections.tree_id):
// trees.vigente_desde_inspection_id es una segunda relación entre las dos tablas.
const ARBOL_INSPECCIONES_COLUMNS =
  "id, tree_code, project_id, especie_cientifica, nombre_comun, inspections!tree_id(id, tree_id, codigo_inspeccion, work_order_id, tipo_inspeccion_realizada, subtipo_inspeccion, fecha_inspeccion, finalizada_at, requiere_mantenimiento, fecha_proxima_inspeccion, fecha_proximo_monitoreo, estado_registro)";

const EVALUACION_COLUMNS =
  "inspection_id, probabilidad_falla_raices_cuello, probabilidad_falla_tronco, probabilidad_falla_copa_ramas, probabilidad_impacto, clasificacion_raices_cuello, clasificacion_tronco, clasificacion_copa_ramas, clasificacion_riesgo_calculada, clasificacion_riesgo_ajustada, puntaje_infraestructura, pct_infraestructura, clasificacion_infraestructura_calculada, clasificacion_infraestructura_ajustada, clasificacion_prioridad_calculada, clasificacion_prioridad_ajustada, indicadores, rule_version";

const PAGINA = 1000;

/** Lee todas las filas en páginas: PostgREST corta cada respuesta en 1000 filas. */
async function paginar<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string; code: string } | null }>
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1);
    if (error) throw new Error(error.message, { cause: error.code });
    const pagina = (data ?? []) as T[];
    filas.push(...pagina);
    if (pagina.length < PAGINA) return filas;
  }
}

export interface ArbolResumenRow {
  id: string;
  estado_ciclo_vida: string;
  ubicacion: unknown;
  especie_cientifica: string | null;
  nombre_comun: string | null;
}

/** Árboles del proyecto para el resumen (B7), con el JWT del usuario. */
export async function listarArbolesResumen(accessToken: string, projectId: string): Promise<ArbolResumenRow[]> {
  return paginar<ArbolResumenRow>((desde, hasta) =>
    createUserScopedClient(accessToken)
      .from("trees")
      .select("id, estado_ciclo_vida, ubicacion, especie_cientifica, nombre_comun")
      .eq("project_id", projectId)
      .order("id", { ascending: true })
      .range(desde, hasta)
  );
}

/** Estado de cada OT del proyecto (B7), con el JWT del usuario. */
export async function listarEstadosOt(accessToken: string, projectId: string): Promise<Array<{ estado_ot: string }>> {
  return paginar<{ estado_ot: string }>((desde, hasta) =>
    createUserScopedClient(accessToken)
      .from("work_orders")
      .select("estado_ot")
      .eq("project_id", projectId)
      .order("id", { ascending: true })
      .range(desde, hasta)
  );
}

type ArbolConInspecciones = {
  id: string; tree_code: string; project_id: string; especie_cientifica: string | null; nombre_comun: string | null;
  inspections: Array<Omit<InspeccionFinalizadaRow, "trees">> | null;
};

/** Inspecciones finalizadas del proyecto, la más reciente primero. */
export async function listarInspeccionesFinalizadas(
  accessToken: string,
  projectId: string,
  treeId?: string
): Promise<InspeccionFinalizadaRow[]> {
  const arboles = await paginar<ArbolConInspecciones>((desde, hasta) => {
    let query = createUserScopedClient(accessToken)
      .from("trees")
      .select(ARBOL_INSPECCIONES_COLUMNS)
      .eq("project_id", projectId)
      .eq("inspections.estado_registro", "finalizado")
      .order("id", { ascending: true })
      .range(desde, hasta);
    if (treeId) query = query.eq("id", treeId);
    return query;
  });
  const filas: InspeccionFinalizadaRow[] = [];
  for (const a of arboles) {
    for (const i of a.inspections ?? []) {
      filas.push({
        ...i,
        trees: { tree_code: a.tree_code, project_id: a.project_id, especie_cientifica: a.especie_cientifica, nombre_comun: a.nombre_comun },
      });
    }
  }
  return filas.sort((x, y) => (y.finalizada_at ?? "").localeCompare(x.finalizada_at ?? "") || x.id.localeCompare(y.id));
}

export async function listarEvaluacionesDeInspecciones(
  accessToken: string,
  inspectionIds: string[]
): Promise<EvaluacionResultadoRow[]> {
  const cliente = createUserScopedClient(accessToken);
  const filas: EvaluacionResultadoRow[] = [];
  // En tandas, para no exceder el largo de la URL con muchos árboles.
  for (let i = 0; i < inspectionIds.length; i += 100) {
    const { data, error } = await cliente
      .from("evaluations")
      .select(EVALUACION_COLUMNS)
      .in("inspection_id", inspectionIds.slice(i, i + 100));
    if (error) throw new Error(error.message, { cause: error.code });
    filas.push(...((data ?? []) as unknown as EvaluacionResultadoRow[]));
  }
  return filas;
}

export interface EvaluacionVigenteRow extends Omit<EvaluacionResultadoRow, "inspection_id"> {
  tree_id: string;
  evento: "ot_completada" | "inspeccion_anulada";
  work_order_id: string | null;
  inspection_id: string | null;
  requiere_revision_ajuste: boolean;
  created_at: string;
}

/**
 * tree_assessments del proyecto (CC-050; ADR-017 v1.2), la más reciente
 * primero: la primera de cada árbol es su evaluación vigente.
 */
export async function listarEvaluacionesVigentes(
  accessToken: string,
  projectId: string,
  treeId?: string
): Promise<EvaluacionVigenteRow[]> {
  const filas = await paginar<EvaluacionVigenteRow & { trees: unknown }>((desde, hasta) => {
    let query = createUserScopedClient(accessToken)
      .from("tree_assessments")
      .select(
        `tree_id, evento, work_order_id, inspection_id, requiere_revision_ajuste, created_at, ${EVALUACION_COLUMNS.replace("inspection_id, ", "")}, trees!inner(project_id)`
      )
      .eq("trees.project_id", projectId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(desde, hasta);
    if (treeId) query = query.eq("tree_id", treeId);
    return query;
  });
  return filas.map(({ trees: _trees, ...fila }) => fila);
}
