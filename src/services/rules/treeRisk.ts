/**
 * Motor de reglas de evaluación técnica y riesgo (R01–R04, M01–M03).
 *
 * Fuente exacta, verificada celda por celda el 2026-10-06:
 * - borrador_reglas_diagramas_v3.xlsx, hoja REGLAS_INDICADORES (puntajes
 *   por indicador) y hoja CHEQUEO_PUNTAJES (máximos reales y rangos de
 *   clasificación, marcados "Definitivo").
 * - Base de Datos Valpo Verde.xlsx, hoja MATRICES_CALCULO (M01/M02/M03/R04)
 *   y hoja DICCIONARIO_CAMPOS (fórmulas de R01/R02/R03/R04 por campo).
 *
 * Estos Excel son más recientes que docs/methodology/*.md y
 * project-rules.md, que todavía no están sincronizados (deuda documental
 * registrada, PR-002 / docs/workflow.md §14 — pendiente, no resuelta aquí).
 *
 * Dos correcciones aplicadas usando CHEQUEO_PUNTAJES / DICCIONARIO_CAMPOS
 * (ambos "Definitivo") sobre el texto desactualizado de MATRICES_CALCULO:
 * R02 máximo real 14 (no 18); R03 máximo real 5 (no 9).
 *
 * M04 (infraestructura) y M05 (prioridad) NO se implementan aquí —
 * fuera de alcance de este corte vertical.
 *
 * No se calcula nada que no esté en esta fuente. Una variable "No
 * determinado" (p. ej. SL% no calculable y t/R no medido a la vez)
 * nunca se trata como 0: el componente completo queda "No determinado"
 * (CHEQUEO_PUNTAJES, nota N13) y no participa en R04.
 */

export type Severidad = "Despreciable" | "Leve" | "Moderada" | "Severa";
export type ProbabilidadFalla = "Improbable" | "Posible" | "Probable" | "Inminente";
export type NivelRiesgo = "Bajo" | "Moderado" | "Alto" | "Extremo";
export type ProbabilidadImpacto = "Muy baja" | "Baja" | "Media" | "Alta";
export type Consecuencia = "Despreciable" | "Menor" | "Significativa" | "Severa";

export type ZonaObjetivo =
  | "Bajo la copa"
  | "Entre el límite de la copa y 1× la altura del árbol"
  | "Entre 1× y 1,5× la altura del árbol"
  | "Más allá de 1,5× la altura del árbol";

export type TasaOcupacion = "Rara" | "Ocasional" | "Frecuente" | "Constante";

const SEVERIDAD_PUNTAJE: Record<Severidad, number> = {
  Despreciable: 0,
  Leve: 1,
  Moderada: 2,
  Severa: 3,
};

/** Resultado de un indicador individual: null = "No determinado" (sin puntaje, nunca 0). */
interface IndicadorResultado {
  severidad: Severidad | null;
  puntaje: number | null;
  noDeterminado: boolean;
}

function indicador(severidad: Severidad): IndicadorResultado {
  return { severidad, puntaje: SEVERIDAD_PUNTAJE[severidad], noDeterminado: false };
}

function noDeterminado(): IndicadorResultado {
  return { severidad: null, puntaje: null, noDeterminado: true };
}

// ============================================================================
// Variables de entrada — contrato mínimo para ejecutar R01/R02/R03/R04/M01–M03.
// ============================================================================

export interface TreeRiskVariables {
  // --- R01 — Raíces y cuello ---
  levantamiento_plato_radicular: boolean;
  angulo_inclinacion: number; // grados, 0–90

  raices_expuestas: boolean;
  necrosis_radicular: boolean | null; // requerido si raices_expuestas = true
  raices_cortadas: boolean | null; // requerido si raices_expuestas = true

  cavidad_pudricion_basal: boolean;
  cavidad_basal_externa: boolean | null; // requerido si cavidad_pudricion_basal = true
  sl_basal_pct: number | null; // observado si cavidad_basal_externa = true (0–100)
  t_r_basal: number | null; // observado si cavidad_basal_externa = false (0–1)

  // --- R02 — Tronco ---
  presenta_cavidad_pudricion_tronco: boolean;
  cavidad_externa_tronco: boolean | null;
  sl_tronco_pct: number | null;
  t_r_tronco: number | null;

  presenta_heridas_tronco: boolean;
  condicion_heridas_tronco: "Cerrada" | "En proceso de cierre" | "Abierta" | null;

  corteza_muerta_ausente: boolean;
  presenta_exudaciones: boolean;

  presenta_fisura_grieta_tronco: boolean;
  afectacion_fisura_grieta: "Solo corteza" | "Penetra en madera" | null;
  direccion_grieta: "Longitudinal" | "Transversal" | null;

  troncos_codominantes: boolean;
  grieta_union_codominante: boolean | null;
  corteza_incluida: boolean | null;

  // --- R03 — Copa y ramas ---
  ramas_secas: boolean;
  ramas_secas_pct_copa: number | null;
  ramas_quebradas: boolean;
  desequilibrio_copa: boolean;

  // --- M01 — Probabilidad de impacto ---
  zona_objetivo: ZonaObjetivo;
  tasa_ocupacion_objetivo: TasaOcupacion;

  // --- Consecuencias (observadas por el inspector, una por componente) ---
  consecuencia_raices_cuello: Consecuencia;
  consecuencia_tronco: Consecuencia;
  consecuencia_copa_ramas: Consecuencia;
}

// ============================================================================
// R01 — Raíces y cuello (REGLAS_INDICADORES: RC-EST-*, RC-REX-*, RC-CAV-*)
// ============================================================================

function evaluarEstabilidad(v: TreeRiskVariables): IndicadorResultado {
  const inclinado = v.levantamiento_plato_radicular;
  const a = v.angulo_inclinacion;
  if (inclinado) {
    if (a < 15) return indicador("Leve"); // RC-EST-01
    if (a <= 30) return indicador("Moderada"); // RC-EST-02
    if (a <= 45) return indicador("Moderada"); // RC-EST-03
    return indicador("Severa"); // RC-EST-04
  }
  if (a < 15) return indicador("Despreciable"); // RC-EST-05
  if (a <= 30) return indicador("Leve"); // RC-EST-06
  if (a <= 45) return indicador("Moderada"); // RC-EST-07
  return indicador("Severa"); // RC-EST-08
}

function evaluarRaicesExpuestas(v: TreeRiskVariables): IndicadorResultado {
  if (!v.raices_expuestas) return indicador("Despreciable"); // RC-REX-01
  const necrosis = v.necrosis_radicular === true;
  const cortadas = v.raices_cortadas === true;
  if (!necrosis && !cortadas) return indicador("Leve"); // RC-REX-02
  if (necrosis && !cortadas) return indicador("Moderada"); // RC-REX-03
  if (!necrosis && cortadas) return indicador("Moderada"); // RC-REX-04
  return indicador("Severa"); // RC-REX-05 (necrosis Y cortadas)
}

/** Patrón compartido por cavidad/pudrición basal (RC-CAV-*) y de tronco (TR-CAV-*). */
function evaluarCavidadPudricion(
  presenta: boolean,
  externa: boolean | null,
  slPct: number | null,
  tR: number | null
): IndicadorResultado {
  if (!presenta) return indicador("Despreciable");
  if (externa === true) {
    if (slPct === null) return noDeterminado(); // SL no calculable
    if (slPct >= 33) return indicador("Severa");
    if (slPct >= 20) return indicador("Moderada");
    return indicador("Leve");
  }
  // externa === false (sin síntoma externo): requiere t/R medido
  if (tR === null) return noDeterminado();
  if (tR <= 0.3) return indicador("Severa");
  return indicador("Moderada");
}

export interface ComponenteResultado {
  puntaje: number | null;
  probabilidadFalla: ProbabilidadFalla | null;
  noDeterminado: boolean;
  indicadores: Record<string, IndicadorResultado>;
}

function clasificarPorRangos(
  puntaje: number,
  rangos: Array<{ min: number; max: number; categoria: ProbabilidadFalla }>
): ProbabilidadFalla {
  for (const r of rangos) {
    if (puntaje >= r.min && puntaje <= r.max) return r.categoria;
  }
  throw new Error(`Puntaje ${puntaje} fuera de rango de clasificación`);
}

function sumarComponente(indicadores: Record<string, IndicadorResultado>): {
  puntaje: number | null;
  noDeterminado: boolean;
} {
  const valores = Object.values(indicadores);
  if (valores.some((i) => i.noDeterminado)) {
    return { puntaje: null, noDeterminado: true };
  }
  const puntaje = valores.reduce((acc, i) => acc + (i.puntaje ?? 0), 0);
  return { puntaje, noDeterminado: false };
}

export function evaluarR01(v: TreeRiskVariables): ComponenteResultado {
  const indicadores = {
    estabilidad: evaluarEstabilidad(v),
    raices_expuestas: evaluarRaicesExpuestas(v),
    cavidad_basal: evaluarCavidadPudricion(
      v.cavidad_pudricion_basal,
      v.cavidad_basal_externa,
      v.sl_basal_pct,
      v.t_r_basal
    ),
  };
  const { puntaje, noDeterminado: nd } = sumarComponente(indicadores);
  if (nd || puntaje === null) {
    return { puntaje: null, probabilidadFalla: null, noDeterminado: true, indicadores };
  }
  // DICCIONARIO_CAMPOS probabilidad_falla_raices_cuello: 0–1 Improbable; 2–4 Posible; 5 Probable; 6–9 Inminente
  const probabilidadFalla = clasificarPorRangos(puntaje, [
    { min: 0, max: 1, categoria: "Improbable" },
    { min: 2, max: 4, categoria: "Posible" },
    { min: 5, max: 5, categoria: "Probable" },
    { min: 6, max: 9, categoria: "Inminente" },
  ]);
  return { puntaje, probabilidadFalla, noDeterminado: false, indicadores };
}

// ============================================================================
// R02 — Tronco (REGLAS_INDICADORES: TR-CAV-*, TR-HER-*, TR-COR-*, TR-EXU-*,
// TR-GRI-*, TR-COD-*)
// ============================================================================

function evaluarHeridas(v: TreeRiskVariables): IndicadorResultado {
  if (!v.presenta_heridas_tronco) return indicador("Despreciable"); // TR-HER-01
  if (v.condicion_heridas_tronco === "Cerrada") return indicador("Despreciable"); // TR-HER-02
  if (v.condicion_heridas_tronco === "En proceso de cierre") return indicador("Leve"); // TR-HER-03
  return indicador("Moderada"); // TR-HER-04 (Abierta)
}

function evaluarGrietasTronco(v: TreeRiskVariables): IndicadorResultado {
  if (!v.presenta_fisura_grieta_tronco) return indicador("Despreciable"); // TR-GRI-01
  if (v.afectacion_fisura_grieta === "Solo corteza") return indicador("Leve"); // TR-GRI-02
  // "Penetra en madera"
  if (v.direccion_grieta === "Longitudinal") return indicador("Moderada"); // TR-GRI-03
  return indicador("Severa"); // TR-GRI-04 (Transversal)
}

function evaluarCodominancia(v: TreeRiskVariables): IndicadorResultado {
  if (!v.troncos_codominantes) return indicador("Despreciable"); // TR-COD-01
  if (v.grieta_union_codominante === true) return indicador("Severa"); // TR-COD-02
  if (v.corteza_incluida === true) return indicador("Moderada"); // TR-COD-03
  return indicador("Leve"); // TR-COD-04
}

export function evaluarR02(v: TreeRiskVariables): ComponenteResultado {
  const indicadores = {
    cavidad_tronco: evaluarCavidadPudricion(
      v.presenta_cavidad_pudricion_tronco,
      v.cavidad_externa_tronco,
      v.sl_tronco_pct,
      v.t_r_tronco
    ),
    heridas: evaluarHeridas(v),
    corteza_muerta: v.corteza_muerta_ausente ? indicador("Moderada") : indicador("Despreciable"), // TR-COR-01/02
    exudaciones: v.presenta_exudaciones ? indicador("Leve") : indicador("Despreciable"), // TR-EXU-01/02
    grietas: evaluarGrietasTronco(v),
    codominancia: evaluarCodominancia(v),
  };
  const { puntaje, noDeterminado: nd } = sumarComponente(indicadores);
  if (nd || puntaje === null) {
    return { puntaje: null, probabilidadFalla: null, noDeterminado: true, indicadores };
  }
  // DICCIONARIO_CAMPOS probabilidad_falla_tronco: 0–1·2–4·5–7·8–14 Inminente.
  // CORRECCIÓN: MATRICES_CALCULO (desactualizado) dice "8–18"; el máximo real
  // de los 6 indicadores (3+2+1+2+3+3) es 14 — CHEQUEO_PUNTAJES (v3,
  // "Definitivo") y DICCIONARIO_CAMPOS ya corrigen a 8–14.
  const probabilidadFalla = clasificarPorRangos(puntaje, [
    { min: 0, max: 1, categoria: "Improbable" },
    { min: 2, max: 4, categoria: "Posible" },
    { min: 5, max: 7, categoria: "Probable" },
    { min: 8, max: 14, categoria: "Inminente" },
  ]);
  return { puntaje, probabilidadFalla, noDeterminado: false, indicadores };
}

// ============================================================================
// R03 — Copa y ramas (REGLAS_INDICADORES: CR-RSE-*, CR-RQU-*, CR-DES-*)
// Nota: defoliación y clorosis/necrosis NO suman en R03 (CR-DEF-*: "suma en:
// ninguna (vitalidad / estado fisiológico)") — se capturan aparte si se
// necesitan, pero no participan en probabilidad_falla_copa_ramas.
// ============================================================================

function evaluarRamasSecas(v: TreeRiskVariables): IndicadorResultado {
  if (!v.ramas_secas) return indicador("Despreciable"); // CR-RSE-01
  const pct = v.ramas_secas_pct_copa;
  if (pct === null) return noDeterminado();
  if (pct < 10) return indicador("Leve"); // CR-RSE-02
  if (pct <= 50) return indicador("Moderada"); // CR-RSE-03
  return indicador("Severa"); // CR-RSE-04
}

export function evaluarR03(v: TreeRiskVariables): ComponenteResultado {
  const indicadores = {
    ramas_secas: evaluarRamasSecas(v),
    ramas_quebradas: v.ramas_quebradas ? indicador("Leve") : indicador("Despreciable"), // CR-RQU-01/02
    desequilibrio_copa: v.desequilibrio_copa ? indicador("Leve") : indicador("Despreciable"), // CR-DES-01/02
  };
  const { puntaje, noDeterminado: nd } = sumarComponente(indicadores);
  if (nd || puntaje === null) {
    return { puntaje: null, probabilidadFalla: null, noDeterminado: true, indicadores };
  }
  // DICCIONARIO_CAMPOS probabilidad_falla_copa_ramas: 0–1·2·3·4–5 Inminente.
  // CORRECCIÓN: MATRICES_CALCULO (desactualizado) dice "0–2/3–4/5–6/7–9"; el
  // máximo real (ramas secas 3 + ramas quebradas 1 + desequilibrio 1) es 5 —
  // CHEQUEO_PUNTAJES (v3, "Definitivo") y DICCIONARIO_CAMPOS ya corrigen.
  const probabilidadFalla = clasificarPorRangos(puntaje, [
    { min: 0, max: 1, categoria: "Improbable" },
    { min: 2, max: 2, categoria: "Posible" },
    { min: 3, max: 3, categoria: "Probable" },
    { min: 4, max: 5, categoria: "Inminente" },
  ]);
  return { puntaje, probabilidadFalla, noDeterminado: false, indicadores };
}

// ============================================================================
// M01 — Matriz de probabilidad de impacto (MATRICES_CALCULO A1:E8)
// ============================================================================

const M01: Record<ZonaObjetivo, Record<TasaOcupacion, ProbabilidadImpacto>> = {
  "Bajo la copa": { Rara: "Baja", Ocasional: "Media", Frecuente: "Alta", Constante: "Alta" },
  "Entre el límite de la copa y 1× la altura del árbol": {
    Rara: "Muy baja",
    Ocasional: "Baja",
    Frecuente: "Media",
    Constante: "Alta",
  },
  "Entre 1× y 1,5× la altura del árbol": {
    Rara: "Muy baja",
    Ocasional: "Baja",
    Frecuente: "Baja",
    Constante: "Media",
  },
  "Más allá de 1,5× la altura del árbol": {
    Rara: "Muy baja",
    Ocasional: "Muy baja",
    Frecuente: "Muy baja",
    Constante: "Baja",
  },
};

export function evaluarM01(v: TreeRiskVariables): ProbabilidadImpacto {
  return M01[v.zona_objetivo][v.tasa_ocupacion_objetivo];
}

// ============================================================================
// M02 — Matriz de probabilidad de falla e impacto (MATRICES_CALCULO G1:K8)
// Escala intermedia (nunca persistida sola): Improbable/Algo probable/
// Probable/Muy probable.
// ============================================================================

type ProbabilidadFallaImpacto = "Improbable" | "Algo probable" | "Probable" | "Muy probable";

const M02: Record<ProbabilidadFalla, Record<ProbabilidadImpacto, ProbabilidadFallaImpacto>> = {
  Inminente: { "Muy baja": "Improbable", Baja: "Algo probable", Media: "Probable", Alta: "Muy probable" },
  Probable: { "Muy baja": "Improbable", Baja: "Improbable", Media: "Algo probable", Alta: "Probable" },
  Posible: { "Muy baja": "Improbable", Baja: "Improbable", Media: "Improbable", Alta: "Algo probable" },
  Improbable: { "Muy baja": "Improbable", Baja: "Improbable", Media: "Improbable", Alta: "Improbable" },
};

// ============================================================================
// M03 — Matriz de clasificación de riesgo (MATRICES_CALCULO M1:Q8)
// ============================================================================

const M03: Record<ProbabilidadFallaImpacto, Record<Consecuencia, NivelRiesgo>> = {
  "Muy probable": { Despreciable: "Bajo", Menor: "Moderado", Significativa: "Alto", Severa: "Extremo" },
  Probable: { Despreciable: "Bajo", Menor: "Moderado", Significativa: "Alto", Severa: "Alto" },
  "Algo probable": { Despreciable: "Bajo", Menor: "Bajo", Significativa: "Moderado", Severa: "Moderado" },
  Improbable: { Despreciable: "Bajo", Menor: "Bajo", Significativa: "Bajo", Severa: "Bajo" },
};

/** M02 + M03 aplicadas a un componente (DICCIONARIO_CAMPOS: clasificacion_raices_cuello/tronco/copa_ramas). */
export function clasificarComponente(
  probabilidadFalla: ProbabilidadFalla,
  probabilidadImpacto: ProbabilidadImpacto,
  consecuencia: Consecuencia
): NivelRiesgo {
  const intermedio = M02[probabilidadFalla][probabilidadImpacto];
  return M03[intermedio][consecuencia];
}

// ============================================================================
// R04 — Consolidación (DICCIONARIO_CAMPOS clasificacion_riesgo): el máximo
// nivel de riesgo entre los tres componentes, jerarquía Bajo<Moderado<Alto<Extremo.
// ============================================================================

const JERARQUIA_RIESGO: Record<NivelRiesgo, number> = { Bajo: 1, Moderado: 2, Alto: 3, Extremo: 4 };

export function evaluarR04(clasificaciones: Array<NivelRiesgo | null>): NivelRiesgo | null {
  if (clasificaciones.some((c) => c === null)) return null;
  const validas = clasificaciones as NivelRiesgo[];
  return validas.reduce((peor, actual) =>
    JERARQUIA_RIESGO[actual] > JERARQUIA_RIESGO[peor] ? actual : peor
  );
}

// ============================================================================
// Resultado completo de una evaluación
// ============================================================================

export interface TreeRiskResult {
  r01: ComponenteResultado;
  r02: ComponenteResultado;
  r03: ComponenteResultado;
  probabilidadImpacto: ProbabilidadImpacto;
  clasificacionRaicesCuello: NivelRiesgo | null;
  clasificacionTronco: NivelRiesgo | null;
  clasificacionCopaRamas: NivelRiesgo | null;
  clasificacionRiesgo: NivelRiesgo | null;
}

export function evaluarRiesgo(v: TreeRiskVariables): TreeRiskResult {
  const r01 = evaluarR01(v);
  const r02 = evaluarR02(v);
  const r03 = evaluarR03(v);
  const probabilidadImpacto = evaluarM01(v);

  const clasificacionRaicesCuello = r01.probabilidadFalla
    ? clasificarComponente(r01.probabilidadFalla, probabilidadImpacto, v.consecuencia_raices_cuello)
    : null;
  const clasificacionTronco = r02.probabilidadFalla
    ? clasificarComponente(r02.probabilidadFalla, probabilidadImpacto, v.consecuencia_tronco)
    : null;
  const clasificacionCopaRamas = r03.probabilidadFalla
    ? clasificarComponente(r03.probabilidadFalla, probabilidadImpacto, v.consecuencia_copa_ramas)
    : null;

  const clasificacionRiesgo = evaluarR04([
    clasificacionRaicesCuello,
    clasificacionTronco,
    clasificacionCopaRamas,
  ]);

  return {
    r01,
    r02,
    r03,
    probabilidadImpacto,
    clasificacionRaicesCuello,
    clasificacionTronco,
    clasificacionCopaRamas,
    clasificacionRiesgo,
  };
}
