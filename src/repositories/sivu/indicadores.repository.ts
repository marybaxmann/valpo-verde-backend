import { createUserScopedClient } from "../../config/supabase";

/**
 * B19 — lecturas para los indicadores del inventario (hoja INDICES; CC-016).
 * Todo con el JWT del usuario (PR-018 v6.0): la RLS de la 017 limita las
 * filas a sus proyectos.
 */

function lanzar(error: { message: string; code?: string }): never {
  throw new Error(error.message, { cause: error.code });
}

const aNumero = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export interface ArbolIndicadorRow {
  id: string;
  /** Código del árbol: solo para el aviso de medición en revisión (propuesta experimental). */
  tree_code?: string | null;
  sector: string | null;
  especie_cientifica: string | null;
  species_id: string | null;
  /** Nombre en el catálogo cuando el árbol está vinculado por species_id (CC-053). */
  especie_catalogo: string | null;
  dap_cm: number | null;
  /** D-15 y D-19: solo los usa el carbono (CC-069). */
  multifustal: boolean | null;
  /** D-16: diámetros de cada fuste (multifustales); propuesta experimental del DAP equivalente. */
  dap_fustes_cm: number[] | null;
  altura_total_m: number | null;
  diametro_copa_ns_m: number | null;
  diametro_copa_eo_m: number | null;
  diametro_copa_m: number | null;
  copa_no_presenta: boolean | null;
}

/** Árboles del proyecto con los valores vigentes que usan los indicadores, de a 1000. */
export async function listarArbolesIndicadores(accessToken: string, projectId: string): Promise<ArbolIndicadorRow[]> {
  const filas: ArbolIndicadorRow[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("trees")
      .select("id, tree_code, sector, especie_cientifica, species_id, species(especie_cientifica), dap_cm, multifustal, dap_fustes_cm, altura_total_m, diametro_copa_ns_m, diametro_copa_eo_m, diametro_copa_m, copa_no_presenta")
      .eq("project_id", projectId)
      .order("id", { ascending: true })
      .range(desde, desde + 999);
    if (error) lanzar(error);
    const pagina = (data ?? []) as Array<Record<string, unknown>>;
    for (const f of pagina) {
      filas.push({
        id: f.id as string,
        tree_code: (f.tree_code as string | null) ?? null,
        sector: (f.sector as string | null) ?? null,
        especie_cientifica: (f.especie_cientifica as string | null) ?? null,
        species_id: (f.species_id as string | null) ?? null,
        especie_catalogo: ((f.species as { especie_cientifica?: string } | null)?.especie_cientifica as string | undefined) ?? null,
        dap_cm: aNumero(f.dap_cm),
        multifustal: (f.multifustal as boolean | null) ?? null,
        dap_fustes_cm: Array.isArray(f.dap_fustes_cm) ? (f.dap_fustes_cm as unknown[]).map(aNumero).filter((x): x is number => x !== null) : null,
        altura_total_m: aNumero(f.altura_total_m),
        diametro_copa_ns_m: aNumero(f.diametro_copa_ns_m),
        diametro_copa_eo_m: aNumero(f.diametro_copa_eo_m),
        diametro_copa_m: aNumero(f.diametro_copa_m),
        copa_no_presenta: (f.copa_no_presenta as boolean | null) ?? null,
      });
    }
    if (pagina.length < 1000) return filas;
  }
}

/** Presencia (v_tree_presence, D-28; 031) de los árboles indicados, en lotes. */
export async function listarPresencia(accessToken: string, treeIds: string[]): Promise<Array<{ tree_id: string; estado_presencia: string }>> {
  const salida: Array<{ tree_id: string; estado_presencia: string }> = [];
  for (let i = 0; i < treeIds.length; i += 150) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("v_tree_presence")
      .select("tree_id, estado_presencia")
      .in("tree_id", treeIds.slice(i, i + 150));
    if (error) lanzar(error);
    salida.push(...((data ?? []) as Array<{ tree_id: string; estado_presencia: string }>));
  }
  return salida;
}

/** Rasgos de la especie por árbol (v_species_traits; CC-053: species_id o nombre), en lotes. */
export async function listarRasgosEspecie(
  accessToken: string,
  treeIds: string[]
): Promise<Array<{ tree_id: string; genero: string | null; familia: string | null; origen_biogeografico: string; tipo_hoja: string | null }>> {
  const salida: Array<{ tree_id: string; genero: string | null; familia: string | null; origen_biogeografico: string; tipo_hoja: string | null }> = [];
  for (let i = 0; i < treeIds.length; i += 150) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("v_species_traits")
      .select("tree_id, genero, familia, origen_biogeografico, tipo_hoja")
      .in("tree_id", treeIds.slice(i, i + 150));
    if (error) lanzar(error);
    salida.push(...((data ?? []) as typeof salida));
  }
  return salida;
}

export interface VariablesCrecimientoRow {
  tree_id: string;
  /** D-88 (0 a 5), de la evaluación vigente. */
  cle: number | null;
  /** D-89 (%), de la evaluación vigente. */
  muerte_regresiva_pct: number | null;
  /** clasificacion_vitalidad = «no_evaluable_poda» en la evaluación vigente. */
  poda_intensa: boolean | null;
}

const numeroDeTexto = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Secuestro anual (decisiones A a C, 2026-11-20): CLE y muerte regresiva de
 * la evaluación de la inspección que da vigencia al árbol
 * (trees.vigente_desde_inspection_id, la que compone el DAP y la altura
 * vigentes en fn_refresh_tree_current). Árboles sin esa inspección no
 * aparecen en la salida.
 */
export async function listarVariablesCrecimiento(accessToken: string, treeIds: string[]): Promise<VariablesCrecimientoRow[]> {
  const inspeccionPorArbol = new Map<string, string>();
  for (let i = 0; i < treeIds.length; i += 150) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("trees")
      .select("id, vigente_desde_inspection_id")
      .in("id", treeIds.slice(i, i + 150));
    if (error) lanzar(error);
    for (const f of (data ?? []) as Array<{ id: string; vigente_desde_inspection_id: string | null }>) {
      if (f.vigente_desde_inspection_id) inspeccionPorArbol.set(f.id, f.vigente_desde_inspection_id);
    }
  }
  const inspecciones = [...new Set(inspeccionPorArbol.values())];
  const porInspeccion = new Map<string, { cle: number | null; muerte_regresiva_pct: number | null; poda_intensa: boolean | null }>();
  for (let i = 0; i < inspecciones.length; i += 100) {
    const { data, error } = await createUserScopedClient(accessToken)
      .from("evaluations")
      .select("inspection_id, cle:variables->>exposicion_luminica_copa_cle, mr:variables->>muerte_regresiva_copa_pct, vit:variables->>clasificacion_vitalidad")
      .in("inspection_id", inspecciones.slice(i, i + 100));
    if (error) lanzar(error);
    for (const f of (data ?? []) as Array<{ inspection_id: string; cle: unknown; mr: unknown; vit: unknown }>) {
      porInspeccion.set(f.inspection_id, {
        cle: numeroDeTexto(f.cle),
        muerte_regresiva_pct: numeroDeTexto(f.mr),
        poda_intensa: f.vit === null || f.vit === undefined || f.vit === "" ? null : f.vit === "no_evaluable_poda",
      });
    }
  }
  return [...inspeccionPorArbol.entries()].map(([tree_id, inspection_id]) => ({
    tree_id,
    cle: porInspeccion.get(inspection_id)?.cle ?? null,
    muerte_regresiva_pct: porInspeccion.get(inspection_id)?.muerte_regresiva_pct ?? null,
    poda_intensa: porInspeccion.get(inspection_id)?.poda_intensa ?? null,
  }));
}

/** Superficie de la delimitación del proyecto (SECTORES.superficie_sector_m2, D-256); null si no hay sector. */
export async function obtenerSuperficieProyecto(accessToken: string, projectId: string): Promise<number | null> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("sectors")
    .select("superficie_sector_m2")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) lanzar(error);
  return aNumero((data as { superficie_sector_m2: unknown } | null)?.superficie_sector_m2);
}
