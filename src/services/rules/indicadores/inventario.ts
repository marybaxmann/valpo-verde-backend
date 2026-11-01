/**
 * B19 — Indicadores del inventario (hoja INDICES del Excel maestro; CC-016,
 * alcance aprobado por Valej el 2026-11-01: filas 3 a 13). Funciones puras:
 * reciben los árboles del ámbito y devuelven el valor con su denominador y
 * su cobertura. Nunca reemplazan un dato faltante: lo cuentan aparte.
 *
 * Bloque 1: número total de árboles (fila 3), densidad arbórea (fila 4),
 * distribución por clase diamétrica (fila 11), diámetro medio de copa
 * (fila 12) y área proyectada de copa (fila 13).
 */

export interface ArbolIndicador {
  id: string;
  /** D-7: barrio. */
  sector: string | null;
  /** D-28 (v_tree_presence): true solo con estado_presencia = presente. */
  presente: boolean;
  /** D-18: DAP vigente; en multifustal, el equivalente que calcula la plataforma. */
  dap_cm: number | null;
  /** D-20 y D-21. */
  diametro_copa_ns_m: number | null;
  diametro_copa_eo_m: number | null;
  /** D-22: promedio de D-20 y D-21 (columna generada). */
  diametro_copa_m: number | null;
  /** «No presenta» copa (RG «Ausencia»). */
  copa_no_presenta: boolean | null;
}

const porcentaje = (n: number, total: number): number | null => (total > 0 ? (n / total) * 100 : null);

/** Fila 3: árboles con estado_presencia = Presente, cada uno una vez. */
export function numeroTotalArboles(presentes: ArbolIndicador[]) {
  return { valor: presentes.length, unidad: "arboles" as const };
}

/**
 * Fila 4: DA = N / (A_m2 / 10000), solo por proyecto. «No calcular
 * densidad por barrio, porque el barrio no tiene delimitación.»
 */
export function densidadArborea(n: number, superficieM2: number | null, porBarrio: boolean) {
  const base = { unidad: "arboles_por_ha" as const, numerador: n, superficie_m2: superficieM2 };
  if (porBarrio) {
    return { ...base, valor: null, motivo: "No se calcula por barrio: el barrio no tiene delimitación (INDICES)." };
  }
  if (superficieM2 === null || !(superficieM2 > 0)) {
    return { ...base, valor: null, motivo: "El proyecto no tiene una delimitación con superficie registrada." };
  }
  return { ...base, valor: n / (superficieM2 / 10000), motivo: null };
}

/** Fila 11: intervalos de DAP de la hoja INDICES (cm). `hasta_cm` es exclusivo; null = sin límite. */
export const CLASES_DIAMETRICAS: ReadonlyArray<{ codigo: string; etiqueta: string; desde_cm: number; hasta_cm: number | null }> = [
  { codigo: "0_10", etiqueta: ">0 a <10 cm", desde_cm: 0, hasta_cm: 10 },
  { codigo: "10_20", etiqueta: "10 a <20 cm", desde_cm: 10, hasta_cm: 20 },
  { codigo: "20_30", etiqueta: "20 a <30 cm", desde_cm: 20, hasta_cm: 30 },
  { codigo: "30_40", etiqueta: "30 a <40 cm", desde_cm: 30, hasta_cm: 40 },
  { codigo: "40_50", etiqueta: "40 a <50 cm", desde_cm: 40, hasta_cm: 50 },
  { codigo: "50_60", etiqueta: "50 a <60 cm", desde_cm: 50, hasta_cm: 60 },
  { codigo: "60_70", etiqueta: "60 a <70 cm", desde_cm: 60, hasta_cm: 70 },
  { codigo: "70_80", etiqueta: "70 a <80 cm", desde_cm: 70, hasta_cm: 80 },
  { codigo: "80_90", etiqueta: "80 a <90 cm", desde_cm: 80, hasta_cm: 90 },
  { codigo: "90_100", etiqueta: "90 a <100 cm", desde_cm: 90, hasta_cm: 100 },
  { codigo: "100_mas", etiqueta: "≥100 cm", desde_cm: 100, hasta_cm: null },
];

/**
 * Fila 11: porcentaje por clase = árboles de la clase / Número total de
 * árboles presentes × 100. Los presentes sin DAP van en «Sin DAP» (Valej,
 * 2026-11-01), así las clases más «Sin DAP» suman el 100 %.
 */
export function distribucionClaseDiametrica(presentes: ArbolIndicador[]) {
  const total = presentes.length;
  const conteo = CLASES_DIAMETRICAS.map(() => 0);
  let sinDap = 0;
  for (const a of presentes) {
    // La base exige dap_cm > 0 (CHECK); un valor no positivo se trata como sin DAP.
    if (a.dap_cm === null || !(a.dap_cm > 0)) {
      sinDap++;
      continue;
    }
    const i = CLASES_DIAMETRICAS.findIndex((c) => a.dap_cm! >= c.desde_cm && (c.hasta_cm === null || a.dap_cm! < c.hasta_cm));
    conteo[i]++;
  }
  return {
    denominador: total,
    clases: CLASES_DIAMETRICAS.map((c, i) => ({ ...c, arboles: conteo[i], porcentaje: porcentaje(conteo[i], total) })),
    sin_dap: { arboles: sinDap, porcentaje: porcentaje(sinDap, total) },
  };
}

/**
 * Fila 12: Dc_medio = Σ diametro_copa_m / N_validos. N_validos = presentes
 * con diámetro de copa numérico (D-22) o con copa «No presenta» (0 m). Los
 * que no tienen ninguno de los dos quedan fuera y se informan aparte.
 */
export function diametroMedioCopa(presentes: ArbolIndicador[]) {
  let suma = 0;
  let medidos = 0;
  let noPresenta = 0;
  for (const a of presentes) {
    if (a.copa_no_presenta === true) noPresenta++;
    else if (a.diametro_copa_m !== null) {
      suma += a.diametro_copa_m;
      medidos++;
    }
  }
  const validos = medidos + noPresenta;
  return {
    unidad: "m" as const,
    valor: validos > 0 ? suma / validos : null,
    n_validos: validos,
    n_con_medicion: medidos,
    n_no_presenta_copa: noPresenta,
    n_sin_medicion: presentes.length - validos,
    denominador_presentes: presentes.length,
  };
}

/**
 * Fila 13: Ac_i = π × (NS/2) × (EO/2) por árbol; Ac_total = Σ Ac_i. Solo
 * árboles con los dos diámetros. «No presenta» y sin medición se informan
 * aparte (no aportan área). Sin ningún árbol con área: total null.
 */
export function areaProyectadaCopa(presentes: ArbolIndicador[]) {
  let total = 0;
  let conArea = 0;
  let noPresenta = 0;
  for (const a of presentes) {
    if (a.copa_no_presenta === true) noPresenta++;
    else if (a.diametro_copa_ns_m !== null && a.diametro_copa_eo_m !== null) {
      total += Math.PI * (a.diametro_copa_ns_m / 2) * (a.diametro_copa_eo_m / 2);
      conArea++;
    }
  }
  return {
    unidad: "m2" as const,
    total_m2: conArea > 0 ? total : null,
    n_con_area: conArea,
    n_no_presenta_copa: noPresenta,
    n_sin_medicion: presentes.length - conArea - noPresenta,
    denominador_presentes: presentes.length,
  };
}
