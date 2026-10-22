/**
 * Registro de catálogos y códigos persistentes (PR-021; CC-034).
 * Reemplaza, para este motor, a `moduleCatalogs.ts` (que no se toca:
 * sigue usándolo la demo sobre `treeRisk.ts`).
 *
 * El Excel define valores y etiquetas (DICCIONARIO_CAMPOS, LISTAS); el
 * código persistente lo define el backend y nunca se reutiliza ni se
 * renombra. Las dos escalas de abajo ya quedaron fijadas en snake_case
 * en la migración 014 (CHECK de `probabilidad_falla_*`); este registro
 * las documenta como catálogo en vez de dejarlas sueltas en el SQL.
 *
 * Catálogos de clasificación (riesgo, infraestructura, prioridad) y de
 * tipo/subtipo de inspección se agregan junto con los módulos M02–M05.
 */

export type EstadoCatalogo = "vigente" | "reemplazado" | "descartado";

export interface CatalogEntry {
  catalogo: string;
  codigo: string;
  etiqueta: string;
  orden?: number;
  padre?: string;
  estado: EstadoCatalogo;
  cc: string;
}

export const CATALOGO: readonly CatalogEntry[] = [
  // --- severidad: categoría parcial de REGLAS_INDICADORES ---
  { catalogo: "severidad", codigo: "despreciable", etiqueta: "Despreciable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "leve", etiqueta: "Leve", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "moderada", etiqueta: "Moderada", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "severidad", codigo: "severa", etiqueta: "Severa", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- probabilidad_falla_*: migración 014 (CHECK) ---
  { catalogo: "probabilidad_falla", codigo: "improbable", etiqueta: "Improbable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "posible", etiqueta: "Posible", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "probable", etiqueta: "Probable", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "inminente", etiqueta: "Inminente", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla", codigo: "no_determinado", etiqueta: "No determinado", estado: "vigente", cc: "CC-024" },

  // --- resultado_cavidad_interna: D-51 (cavidad_basal_interna), D-63 (cavidad_interna_tronco) ---
  { catalogo: "resultado_cavidad_interna", codigo: "si", etiqueta: "Sí", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "resultado_cavidad_interna", codigo: "no", etiqueta: "No", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "resultado_cavidad_interna", codigo: "requiere_evaluacion_instrumental", etiqueta: "Requiere evaluación instrumental", orden: 2, estado: "vigente", cc: "CC-040" },

  // --- condicion_herida: D-73 (condicion_heridas_tronco) ---
  { catalogo: "condicion_herida", codigo: "abierta", etiqueta: "Abierta", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_herida", codigo: "en_proceso_de_cierre", etiqueta: "En proceso de cierre", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "condicion_herida", codigo: "cerrada", etiqueta: "Cerrada", orden: 2, estado: "vigente", cc: "PR-021" },

  // --- afectacion_grieta: D-78 (afectacion_fisura_grieta) ---
  { catalogo: "afectacion_grieta", codigo: "solo_corteza", etiqueta: "Solo corteza", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "afectacion_grieta", codigo: "penetra_en_madera", etiqueta: "Penetra en madera", orden: 1, estado: "vigente", cc: "PR-021" },

  // --- direccion_grieta: D-79 (direccion_grieta) ---
  { catalogo: "direccion_grieta", codigo: "longitudinal", etiqueta: "Longitudinal", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "direccion_grieta", codigo: "transversal", etiqueta: "Transversal", orden: 1, estado: "vigente", cc: "PR-021" },

  // --- zona_objetivo: D-167 (M01) ---
  { catalogo: "zona_objetivo", codigo: "bajo_la_copa", etiqueta: "Bajo la copa", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "entre_limite_copa_y_una_altura", etiqueta: "Entre el límite de la copa y 1× la altura del árbol", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "entre_una_y_1_5_alturas", etiqueta: "Entre 1× y 1,5× la altura del árbol", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "zona_objetivo", codigo: "mas_alla_de_1_5_alturas", etiqueta: "Más allá de 1,5× la altura del árbol", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- tasa_ocupacion: D-168 (M01) ---
  { catalogo: "tasa_ocupacion", codigo: "rara", etiqueta: "Rara", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "ocasional", etiqueta: "Ocasional", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "frecuente", etiqueta: "Frecuente", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "tasa_ocupacion", codigo: "constante", etiqueta: "Constante", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- probabilidad_impacto: D-169, salida de M01 ---
  { catalogo: "probabilidad_impacto", codigo: "muy_baja", etiqueta: "Muy baja", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "baja", etiqueta: "Baja", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "media", etiqueta: "Media", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_impacto", codigo: "alta", etiqueta: "Alta", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- consecuencia: D-170/171/172 (consecuencia_raices_cuello/_tronco/_copa_ramas), entrada de M03 ---
  { catalogo: "consecuencia", codigo: "insignificante", etiqueta: "Insignificante", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "menor", etiqueta: "Menor", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "significativa", etiqueta: "Significativa", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "consecuencia", codigo: "severa", etiqueta: "Severa", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- clasificacion_riesgo: D-176/177/178 (por componente), D-181 (R04) ---
  { catalogo: "clasificacion_riesgo", codigo: "bajo", etiqueta: "Bajo", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "moderado", etiqueta: "Moderado", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "alto", etiqueta: "Alto", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "extremo", etiqueta: "Extremo", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_riesgo", codigo: "no_determinado", etiqueta: "No determinado", estado: "vigente", cc: "CC-024" },

  // --- probabilidad_falla_impacto: salida intermedia de M02, sin columna
  //     propia en evaluations/tree_assessments (D-176 a D-178 tratan
  //     M02+M03 como un solo paso); se registra igual para que
  //     evaluarM03 pueda validar su dominio antes de indexar la matriz. ---
  { catalogo: "probabilidad_falla_impacto", codigo: "poco_probable", etiqueta: "Poco probable", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "algo_probable", etiqueta: "Algo probable", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "probable", etiqueta: "Probable", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "probabilidad_falla_impacto", codigo: "muy_probable", etiqueta: "Muy probable", orden: 3, estado: "vigente", cc: "PR-021" },

  // --- si_no_no_determinado: D-148 (red_subterranea_presente), D-156
  //     (compromete_funcionalidad_red_subterranea) ---
  { catalogo: "si_no_no_determinado", codigo: "si", etiqueta: "Sí", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "si_no_no_determinado", codigo: "no", etiqueta: "No", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "si_no_no_determinado", codigo: "no_determinado", etiqueta: "No determinado", orden: 2, estado: "vigente", cc: "PR-021" },

  // --- categoria_infraestructura: categoría parcial de REGLAS_INDICADORES (IN-*) ---
  { catalogo: "categoria_infraestructura", codigo: "no_aplica", etiqueta: "No aplica", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "sin_afectacion", etiqueta: "Sin afectación", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "leve", etiqueta: "Leve", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "moderada", etiqueta: "Moderada", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "severa", etiqueta: "Severa", orden: 4, estado: "vigente", cc: "PR-021" },
  { catalogo: "categoria_infraestructura", codigo: "no_determinado", etiqueta: "No determinado", orden: 5, estado: "vigente", cc: "PR-021" },

  // --- clasificacion_infraestructura: D-170 (salida de M04) ---
  { catalogo: "clasificacion_infraestructura", codigo: "bajo", etiqueta: "Bajo", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "moderado", etiqueta: "Moderado", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "alto", etiqueta: "Alto", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "critico", etiqueta: "Crítico", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_infraestructura", codigo: "no_aplica", etiqueta: "No aplica", orden: 4, estado: "vigente", cc: "PR-021" },

  // --- clasificacion_prioridad: D-172 (salida de M05) ---
  { catalogo: "clasificacion_prioridad", codigo: "baja", etiqueta: "Baja", orden: 0, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "media", etiqueta: "Media", orden: 1, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "alta", etiqueta: "Alta", orden: 2, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "critica", etiqueta: "Crítica", orden: 3, estado: "vigente", cc: "PR-021" },
  { catalogo: "clasificacion_prioridad", codigo: "no_determinado", etiqueta: "No determinado", orden: 4, estado: "vigente", cc: "CC-029" },
] as const;

export function etiquetaDe(catalogo: string, codigo: string): string {
  const entrada = CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo);
  if (!entrada) throw new Error(`Código "${codigo}" no registrado en el catálogo "${catalogo}"`);
  return entrada.etiqueta;
}

export function entradasVigentesDe(catalogo: string): CatalogEntry[] {
  return CATALOGO.filter((c) => c.catalogo === catalogo && c.estado === "vigente");
}

/**
 * true solo si `codigo` es un código vigente de `catalogo`. El motor la usa
 * para validar en tiempo de ejecución los campos de catálogo (3 o más
 * valores): el tipo de TypeScript no protege contra un valor corrupto que
 * llegue como string sin pasar por el compilador (p. ej. desde la base de
 * datos). Un código no reconocido nunca se trata como la rama "else" de un
 * valor conocido — ver variables-calculo.ts y los módulos R01–R03 sobre
 * "valores fuera de dominio".
 */
export function esCodigoVigente(catalogo: string, codigo: string): boolean {
  return CATALOGO.some((c) => c.catalogo === catalogo && c.codigo === codigo && c.estado === "vigente");
}

export type SeveridadCodigo = "despreciable" | "leve" | "moderada" | "severa";
export type ProbabilidadFallaCodigo = "improbable" | "posible" | "probable" | "inminente" | "no_determinado";
export type ResultadoCavidadInternaCodigo = "si" | "no" | "requiere_evaluacion_instrumental";
export type CondicionHeridaCodigo = "abierta" | "en_proceso_de_cierre" | "cerrada";
export type AfectacionGrietaCodigo = "solo_corteza" | "penetra_en_madera";
export type DireccionGrietaCodigo = "longitudinal" | "transversal";
export type ZonaObjetivoCodigo =
  | "bajo_la_copa"
  | "entre_limite_copa_y_una_altura"
  | "entre_una_y_1_5_alturas"
  | "mas_alla_de_1_5_alturas";
export type TasaOcupacionCodigo = "rara" | "ocasional" | "frecuente" | "constante";
export type ProbabilidadImpactoCodigo = "muy_baja" | "baja" | "media" | "alta";
export type ConsecuenciaCodigo = "insignificante" | "menor" | "significativa" | "severa";
export type ClasificacionRiesgoCodigo = "bajo" | "moderado" | "alto" | "extremo" | "no_determinado";
export type SiNoNoDeterminadoCodigo = "si" | "no" | "no_determinado";
export type CategoriaInfraestructuraCodigo = "no_aplica" | "sin_afectacion" | "leve" | "moderada" | "severa" | "no_determinado";
export type ClasificacionInfraestructuraCodigo = "bajo" | "moderado" | "alto" | "critico" | "no_aplica";
export type ClasificacionPrioridadCodigo = "baja" | "media" | "alta" | "critica" | "no_determinado";
