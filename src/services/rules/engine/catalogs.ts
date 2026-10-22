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
] as const;

export function etiquetaDe(catalogo: string, codigo: string): string {
  const entrada = CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo);
  if (!entrada) throw new Error(`Código "${codigo}" no registrado en el catálogo "${catalogo}"`);
  return entrada.etiqueta;
}

export function entradasVigentesDe(catalogo: string): CatalogEntry[] {
  return CATALOGO.filter((c) => c.catalogo === catalogo && c.estado === "vigente");
}

export type SeveridadCodigo = "despreciable" | "leve" | "moderada" | "severa";
export type ProbabilidadFallaCodigo = "improbable" | "posible" | "probable" | "inminente" | "no_determinado";
export type ResultadoCavidadInternaCodigo = "si" | "no" | "requiere_evaluacion_instrumental";
