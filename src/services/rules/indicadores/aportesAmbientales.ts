/**
 * PROPUESTA EXPERIMENTAL (Valej, 2026-11-23) — no es metodología vigente.
 *
 * Aportes ambientales del arbolado según el marco de Nowak (2024): cobertura
 * arbórea, almacenamiento y secuestro de carbono, remoción de contaminantes e
 * interceptación de precipitaciones, estimables a partir de especie,
 * diámetro, altura y condición del árbol.
 *
 * Este módulo no agrega ecuaciones ni datos externos. Hace dos cosas:
 * 1. calcula la cobertura arbórea como la superficie cubierta por copas,
 *    contando una sola vez las copas que se superponen (la fila 13 de
 *    INDICES suma áreas individuales y sobrestima la cobertura);
 * 2. resume qué aporte se puede estimar con los datos registrados y qué
 *    falta para los demás, sin inventar valores.
 */

export interface ArbolCopaUbicada {
  id: string;
  /** UTM 19S (EPSG:32719), en metros. */
  utm_este: number | null;
  utm_norte: number | null;
  /** D-20 (norte-sur) y D-21 (este-oeste), en metros. */
  diametro_copa_ns_m: number | null;
  diametro_copa_eo_m: number | null;
  copa_no_presenta: boolean | null;
}

/** Lado de la celda con que se mide la unión de copas (m). Error esperado < 1 % del área. */
export const RESOLUCION_COBERTURA_M = 0.1;

/**
 * Área cubierta por la unión de las copas (m²). Cada copa es una elipse con
 * ejes norte-sur y este-oeste centrada en el árbol (la misma figura de la
 * fila 13). La unión se mide en una grilla de `resolucion` metros: una celda
 * cuenta si su centro cae dentro de al menos una copa, así que la
 * superposición se cuenta una sola vez.
 */
export function areaUnionCopas(copas: Array<{ x: number; y: number; ns: number; eo: number }>, resolucion = RESOLUCION_COBERTURA_M): number {
  if (copas.length === 0) return 0;
  const x0 = Math.min(...copas.map((c) => c.x - c.eo / 2));
  const y0 = Math.min(...copas.map((c) => c.y - c.ns / 2));
  const celdas = new Set<number>();
  // Índices relativos al vértice inferior izquierdo: claves enteras sin colisión.
  const ANCHO = 10_000_000;
  for (const c of copas) {
    const a = c.eo / 2;
    const b = c.ns / 2;
    if (!(a > 0) || !(b > 0)) continue;
    const i0 = Math.floor((c.x - a - x0) / resolucion);
    const i1 = Math.ceil((c.x + a - x0) / resolucion);
    const j0 = Math.floor((c.y - b - y0) / resolucion);
    const j1 = Math.ceil((c.y + b - y0) / resolucion);
    for (let i = i0; i <= i1; i++) {
      const dx = (x0 + (i + 0.5) * resolucion - c.x) / a;
      if (dx * dx > 1) continue;
      for (let j = j0; j <= j1; j++) {
        const dy = (y0 + (j + 0.5) * resolucion - c.y) / b;
        if (dx * dx + dy * dy <= 1) celdas.add(i * ANCHO + j);
      }
    }
  }
  return celdas.size * resolucion * resolucion;
}

/**
 * Cobertura arbórea (%) = área de la unión de copas / superficie del
 * proyecto × 100. Mismo universo que la fila 13 (evaluados con los dos
 * diámetros); además exige la ubicación del árbol. Como la densidad, no se
 * calcula por barrio (sin delimitación).
 */
export function coberturaArborea(arboles: ArbolCopaUbicada[], superficieM2: number | null, porBarrio: boolean) {
  let sinUbicacion = 0;
  let noPresenta = 0;
  let sinMedicion = 0;
  let sumaIndividual = 0;
  const copas: Array<{ x: number; y: number; ns: number; eo: number }> = [];
  for (const a of arboles) {
    if (a.copa_no_presenta === true) {
      noPresenta++;
      continue;
    }
    if (a.diametro_copa_ns_m === null || a.diametro_copa_eo_m === null) {
      sinMedicion++;
      continue;
    }
    if (a.utm_este === null || a.utm_norte === null) {
      sinUbicacion++;
      continue;
    }
    copas.push({ x: a.utm_este, y: a.utm_norte, ns: a.diametro_copa_ns_m, eo: a.diametro_copa_eo_m });
    sumaIndividual += Math.PI * (a.diametro_copa_ns_m / 2) * (a.diametro_copa_eo_m / 2);
  }
  const union = copas.length > 0 ? areaUnionCopas(copas) : null;
  const base = {
    unidad: "porcentaje" as const,
    estado_metodologico: "propuesta experimental (2026-11-23): sin fila en INDICES",
    metodo:
      "Unión de las copas elípticas (ejes norte-sur y este-oeste, centradas en el árbol) medida en una grilla de 0,1 m; la superposición se cuenta una vez. Cobertura = área unida / superficie del proyecto × 100.",
    area_cubierta_m2: union,
    suma_areas_individuales_m2: copas.length > 0 ? sumaIndividual : null,
    superposicion_m2: union !== null ? Math.max(0, sumaIndividual - union) : null,
    superficie_m2: superficieM2,
    n_con_copa_ubicada: copas.length,
    n_no_presenta_copa: noPresenta,
    n_sin_medicion: sinMedicion,
    n_sin_ubicacion: sinUbicacion,
    denominador_evaluados: arboles.length,
  };
  if (porBarrio) return { ...base, valor: null, motivo: "No se calcula por barrio: el barrio no tiene delimitación (INDICES)." };
  if (superficieM2 === null || !(superficieM2 > 0)) return { ...base, valor: null, motivo: "El proyecto no tiene una delimitación con superficie registrada." };
  if (union === null) return { ...base, valor: null, motivo: "Ningún árbol evaluado tiene los dos diámetros de copa y su ubicación." };
  return { ...base, valor: (union / superficieM2) * 100, motivo: null };
}

/** Variables básicas del inventario que pide el marco (especie, diámetro, altura y condición). */
export interface ArbolVariablesBasicas {
  especie: boolean;
  dap: boolean;
  altura: boolean;
  /** Muerte regresiva de copa o clasificación de vitalidad en la evaluación vigente. */
  condicion: boolean;
}

export type EstadoAporte = "calculado" | "simulacion" | "no_estimable";

export interface AporteAmbiental {
  codigo: string;
  nombre: string;
  estado: EstadoAporte;
  /** Resumen en una línea para la ficha del indicador. */
  resultado: string;
  /** Datos que el inventario ya entrega a este aporte. */
  usa: string[];
  /** Lo que falta para estimarlo o para que deje de ser simulación. Nunca se reemplaza con supuestos. */
  falta: string[];
  /** Fila de INDICES del Excel maestro, si existe. */
  fila_indices: string | null;
}

const fmt = (n: number, d = 1) => n.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Estado de los cinco aportes del marco con los datos registrados. Recibe los
 * resultados ya calculados por los otros módulos: no recalcula nada.
 */
export function resumenAportesAmbientales(entrada: {
  /** Resultado de agregarAportesFoliares (opcional: sin él, contaminantes e interceptación quedan no estimables). */
  foliares?: {
    cobertura: { arboles: number; con_area_foliar: number };
    area_foliar: { total_m2: number | null; lai_medio: number | null };
    remocion_contaminantes: { total_kg: number | null; por_contaminante: Record<string, number | null> };
    intercepcion_precipitaciones: { total_m3: number | null; porcentaje_interceptado: number | null; precipitacion_anual_mm: number };
  };
  presentes: ArbolVariablesBasicas[];
  cobertura: ReturnType<typeof coberturaArborea>;
  carbono: { aprobados: number; exploratorios: number; no_estimables: number; carbono_kg_aprobado: number; carbono_kg_exploratorio: number };
  secuestro: { fundamentadas: number; simulaciones: number; no_estimables: number };
}) {
  const p = entrada.presentes;
  const variables = {
    arboles_presentes: p.length,
    con_especie: p.filter((a) => a.especie).length,
    con_dap: p.filter((a) => a.dap).length,
    con_altura: p.filter((a) => a.altura).length,
    con_condicion: p.filter((a) => a.condicion).length,
    con_las_cuatro: p.filter((a) => a.especie && a.dap && a.altura && a.condicion).length,
  };
  const sinMedir = p.length - variables.con_las_cuatro;
  const faltaMedir = sinMedir > 0 ? [`Medir ${sinMedir} de ${p.length} árboles presentes que no tienen las cuatro variables básicas.`] : [];
  const AREA_FOLIAR = "Ecuación de área foliar por especie o grupo (INDICES fila 18, pendiente); no se sustituye por el área de copa.";

  const c = entrada.cobertura;
  const k = entrada.carbono;
  const s = entrada.secuestro;
  const f = entrada.foliares;
  const hayFoliar = !!f && f.cobertura.con_area_foliar > 0;
  const USA_FOLIAR = ["Especie y tipo de follaje", "Diámetros de copa", "Altura total y base de copa viva", "Condición: muerte regresiva"];
  const remocion: AporteAmbiental = hayFoliar
    ? {
        codigo: "remocion_contaminantes",
        nombre: "Remoción de contaminantes",
        estado: "simulacion",
        resultado: `${fmt(f!.remocion_contaminantes.total_kg ?? 0, 1)} kg/año entre O₃, NO₂, SO₂, PM10 y CO en ${f!.cobertura.con_area_foliar} árboles (${fmt(f!.area_foliar.total_m2 ?? 0, 0)} m² de hojas).`,
        usa: [...USA_FOLIAR, "Concentraciones horarias 2025 (CAMS) y lluvia y radiación horarias (ERA5)"],
        falta: [
          ...faltaMedir,
          "Concentraciones medidas en estaciones SINCA en lugar del modelo CAMS.",
          "Velocidades de deposición horarias con viento y temperatura locales (i-Tree completo) y PM2,5.",
          "Factor de sombra por especie y período sin hojas local.",
        ],
        fila_indices: "20",
      }
    : {
        codigo: "remocion_contaminantes",
        nombre: "Remoción de contaminantes",
        estado: "no_estimable",
        resultado: "No estimable con los datos registrados.",
        usa: USA_FOLIAR,
        falta: [AREA_FOLIAR, "Concentraciones horarias de contaminantes de Valparaíso.", "Meteorología horaria y parámetros de deposición."],
        fila_indices: "20",
      };
  const intercepcion: AporteAmbiental = hayFoliar
    ? {
        codigo: "interceptacion_precipitaciones",
        nombre: "Interceptación de precipitaciones",
        estado: "simulacion",
        resultado: `${fmt(f!.intercepcion_precipitaciones.total_m3 ?? 0, 1)} m³/año retenidos y evaporados por las copas (${fmt(f!.intercepcion_precipitaciones.porcentaje_interceptado ?? 0, 1)} % de la lluvia sobre ellas; ${fmt(f!.intercepcion_precipitaciones.precipitacion_anual_mm, 0)} mm en 2025).`,
        usa: [...USA_FOLIAR, "Precipitación y evapotranspiración horarias 2025 (ERA5)"],
        falta: [
          ...faltaMedir,
          "Precipitación medida en una estación local (DMC) en lugar del reanálisis.",
          "Definir si se reporta la interceptación o la escorrentía evitada (INDICES fila 21); esta última requiere las superficies del suelo.",
        ],
        fila_indices: "21",
      }
    : {
        codigo: "interceptacion_precipitaciones",
        nombre: "Interceptación de precipitaciones",
        estado: "no_estimable",
        resultado: "No estimable con los datos registrados.",
        usa: USA_FOLIAR,
        falta: [AREA_FOLIAR, "Precipitación y meteorología horarias de Valparaíso.", "Definir si se reporta la interceptación o la escorrentía evitada (INDICES fila 21)."],
        fila_indices: "21",
      };
  const aportes: AporteAmbiental[] = [
    {
      codigo: "cobertura_arborea",
      nombre: "Cobertura arbórea",
      estado: c.valor === null ? "no_estimable" : "calculado",
      resultado:
        c.valor === null
          ? (c.motivo ?? "Sin datos.")
          : `${fmt(c.valor, 2)} % del proyecto (${fmt(c.area_cubierta_m2 ?? 0, 0)} m² cubiertos; ${fmt(c.superposicion_m2 ?? 0, 0)} m² de copas superpuestas contados una vez).`,
      usa: ["Diámetros de copa norte-sur y este-oeste", "Ubicación del árbol", "Superficie del proyecto"],
      falta: [...faltaMedir, "Agregar la fila del indicador en INDICES (con autorización)."],
      fila_indices: null,
    },
    {
      codigo: "carbono_almacenado",
      nombre: "Almacenamiento de carbono",
      estado: k.aprobados > 0 ? "calculado" : k.exploratorios > 0 ? "simulacion" : "no_estimable",
      resultado: `${k.aprobados} árboles con modelo aprobado (${fmt(k.carbono_kg_aprobado, 0)} kg C); ${k.exploratorios} con modelo exploratorio (${fmt(k.carbono_kg_exploratorio, 0)} kg C, no suma); ${k.no_estimables} no estimables.`,
      usa: ["Especie", "DAP (equivalente en multifustales)", "Altura total"],
      falta: [...faltaMedir, "Ecuaciones aprobadas para más especies (INDICES fila 14)."],
      fila_indices: "14",
    },
    {
      codigo: "secuestro_carbono",
      nombre: "Secuestro de carbono",
      estado: s.fundamentadas > 0 ? "calculado" : s.simulaciones > 0 ? "simulacion" : "no_estimable",
      resultado: `${s.fundamentadas} estimaciones fundamentadas; ${s.simulaciones} árboles con proyección simulada (crecimiento de i-Tree Eco; leñoso o aéreo total con hojas); ${s.no_estimables} no estimables.`,
      usa: ["Especie", "DAP", "Altura total", "Condición: muerte regresiva de copa", "Exposición lumínica de copa (CLE)"],
      falta: [...faltaMedir, "Tasa o categoría de crecimiento por especie con fuente verificada (INDICES fila 15)."],
      fila_indices: "15",
    },
    remocion,
    intercepcion,
  ];
  return {
    indicador: "aportes_ambientales" as const,
    estado_metodologico: "propuesta experimental (Valej, 2026-11-23): no es metodología vigente",
    marco: "Nowak, D. J. (2024). Understanding i-Tree: 2023 Summary of Programs and Methods. USDA Forest Service, GTR NRS-200-2023.",
    variables_basicas: variables,
    aportes,
  };
}
