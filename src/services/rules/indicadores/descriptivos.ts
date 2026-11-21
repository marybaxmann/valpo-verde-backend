/**
 * PROPUESTA EXPERIMENTAL (2026-11-21): indicadores DESCRIPTIVOS del arbolado
 * calculados solo con datos medidos o registrados y vigentes. No aplican
 * ecuaciones científicas ni definen índices nuevos (vitalidad, riesgo,
 * estabilidad, cobertura o beneficios): resumen variables que ya existen en
 * el inventario (ARBOLES) y en la evaluación vigente.
 *
 * No están registrados en la hoja INDICES del Excel maestro: son
 * «descriptivos propuestos», distintos de los indicadores aprobados (B19).
 * Los datos faltantes no se rellenan: se excluyen del cálculo y se cuentan
 * en la completitud.
 */

export interface ArbolDescriptivo {
  id: string;
  tree_code: string | null;
  sector: string | null;
  presente: boolean;
  evaluacion_completa_vigente: boolean;
  especie_cientifica: string | null;
  /** Especie vinculada al catálogo (species_id). */
  especie_en_catalogo: boolean;
  genero: string | null;
  familia: string | null;
  origen_biogeografico: string | null;
  multifustal: boolean | null;
  dap_fustes_cm: number[] | null;
  dap_cm: number | null;
  altura_total_m: number | null;
  diametro_copa_m: number | null;
  altura_primera_rama_m: number | null;
  altura_base_copa_viva_m: number | null;
  clase_edad: { codigo: string; etiqueta: string | null } | null;
  /** Variables registradas en la evaluación vigente (sin transformar). */
  cle: number | null;
  muerte_regresiva_pct: number | null;
  defoliacion_pct: number | null;
  clorosis_pct: number | null;
  necrosis_pct: number | null;
  copa_faltante_pct: number | null;
  vitalidad: { codigo: string; etiqueta: string | null } | null;
}

export interface Estadistica {
  n: number;
  media: number | null;
  mediana: number | null;
  minimo: number | null;
  maximo: number | null;
}

const finito = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function estadistica(valores: (number | null | undefined)[]): Estadistica {
  const xs = valores.filter(finito).sort((a, b) => a - b);
  if (xs.length === 0) return { n: 0, media: null, mediana: null, minimo: null, maximo: null };
  const mitad = Math.floor(xs.length / 2);
  return {
    n: xs.length,
    media: xs.reduce((s, x) => s + x, 0) / xs.length,
    mediana: xs.length % 2 ? xs[mitad] : (xs[mitad - 1] + xs[mitad]) / 2,
    minimo: xs[0],
    maximo: xs[xs.length - 1],
  };
}

/** Clases [desde, hasta); la última es abierta. Solo cuenta valores medidos. */
export function distribucion(valores: (number | null | undefined)[], cortes: number[], unidad: string) {
  const xs = valores.filter(finito);
  return cortes.map((desde, i) => {
    const hasta = i + 1 < cortes.length ? cortes[i + 1] : null;
    const n = xs.filter((x) => x >= desde && (hasta === null || x < hasta)).length;
    return { etiqueta: hasta === null ? `${desde} ${unidad} o más` : `${desde} a ${hasta} ${unidad}`, desde, hasta, n };
  });
}

/** Conteo por valor registrado (variables con valores discretos, como CLE o porcentajes en pasos de 5 %). */
export function porValor(valores: (number | null | undefined)[]) {
  const xs = valores.filter(finito);
  const mapa = new Map<number, number>();
  for (const x of xs) mapa.set(x, (mapa.get(x) ?? 0) + 1);
  return {
    n: xs.length,
    mediana: estadistica(xs).mediana,
    valores: [...mapa.entries()].sort((a, b) => a[0] - b[0]).map(([valor, n]) => ({ valor, n })),
  };
}

function porCategoria(items: ({ codigo: string; etiqueta: string | null } | null)[]) {
  const mapa = new Map<string, { codigo: string; etiqueta: string | null; n: number }>();
  let sinDato = 0;
  for (const it of items) {
    if (!it) {
      sinDato++;
      continue;
    }
    const e = mapa.get(it.codigo) ?? { ...it, n: 0 };
    e.n++;
    mapa.set(it.codigo, e);
  }
  return { categorias: [...mapa.values()].sort((a, b) => b.n - a.n), sin_dato: sinDato };
}

function abundancia(nombres: (string | null)[]) {
  const total = nombres.length;
  const mapa = new Map<string, number>();
  let sin = 0;
  for (const n of nombres) {
    if (!n) sin++;
    else mapa.set(n, (mapa.get(n) ?? 0) + 1);
  }
  return {
    denominador: total,
    grupos: [...mapa.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([nombre, n]) => ({ nombre, arboles: n, porcentaje: total > 0 ? (n / total) * 100 : null })),
    sin_dato: sin,
  };
}

const longitudCopaViva = (a: ArbolDescriptivo) =>
  finito(a.altura_total_m) && finito(a.altura_base_copa_viva_m) && a.altura_base_copa_viva_m <= a.altura_total_m ? a.altura_total_m - a.altura_base_copa_viva_m : null;

/** Valores descriptivos de un árbol (ficha): solo cocientes y diferencias de medidas registradas. */
export function descriptivosArbol(a: ArbolDescriptivo) {
  const largo = longitudCopaViva(a);
  return {
    estado: "descriptivo propuesto (no registrado en INDICES)",
    longitud_copa_viva_m: largo,
    proporcion_copa_viva_pct: largo !== null && finito(a.altura_total_m) && a.altura_total_m > 0 ? (largo / a.altura_total_m) * 100 : null,
    relacion_copa_altura: finito(a.diametro_copa_m) && finito(a.altura_total_m) && a.altura_total_m > 0 ? a.diametro_copa_m / a.altura_total_m : null,
    altura_primera_rama_m: a.altura_primera_rama_m,
    altura_base_copa_viva_m: a.altura_base_copa_viva_m,
    numero_fustes: a.multifustal ? (a.dap_fustes_cm?.length ?? null) : a.multifustal === false ? 1 : null,
    condicion_copa: {
      cle: a.cle,
      muerte_regresiva_pct: a.muerte_regresiva_pct,
      defoliacion_pct: a.defoliacion_pct,
      clorosis_pct: a.clorosis_pct,
      necrosis_pct: a.necrosis_pct,
      copa_faltante_pct: a.copa_faltante_pct,
      vitalidad: a.vitalidad,
    },
  };
}

/** Diagnóstico descriptivo del ámbito. */
export function diagnosticoDescriptivo(arboles: ArbolDescriptivo[], medicionesEnRevision: Readonly<Record<string, string>> = {}) {
  const presentes = arboles.filter((a) => a.presente);
  const ev = presentes.filter((a) => a.evaluacion_completa_vigente);
  const altura = ev.map((a) => a.altura_total_m);
  const largos = ev.map(longitudCopaViva);
  const proporciones = ev.map((a) => {
    const l = longitudCopaViva(a);
    return l !== null && finito(a.altura_total_m) && a.altura_total_m > 0 ? (l / a.altura_total_m) * 100 : null;
  });
  const relacion = ev.map((a) => (finito(a.diametro_copa_m) && finito(a.altura_total_m) && a.altura_total_m > 0 ? a.diametro_copa_m / a.altura_total_m : null));
  const area = ev.map((a) => (finito(a.diametro_copa_m) ? Math.PI * (a.diametro_copa_m / 2) ** 2 : null));

  const sectores = [...new Set(presentes.map((a) => a.sector?.trim() || "Sin sector"))].sort((a, b) => a.localeCompare(b, "es"));
  const especiesSinOrigen = [
    ...new Set(presentes.filter((a) => a.especie_cientifica && (!a.origen_biogeografico || a.origen_biogeografico === "no_determinado")).map((a) => a.especie_cientifica as string)),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const faltan = (f: (a: ArbolDescriptivo) => unknown) => ev.filter((a) => f(a) === null || f(a) === undefined).length;

  return {
    indicador: "diagnostico_descriptivo" as const,
    estado: "descriptivo propuesto: calculado con datos medidos y vigentes; no registrado en INDICES ni aprobado como indicador metodológico",
    universo: { presentes: presentes.length, con_evaluacion_vigente: ev.length },
    dimensiones: {
      altura_m: { ...estadistica(altura), clases: distribucion(altura, [0, 5, 10, 15, 20], "m") },
      dap_cm: { ...estadistica(ev.map((a) => a.dap_cm)), multifustales_con_dap_equivalente: ev.filter((a) => a.multifustal === true && finito(a.dap_cm)).length },
      diametro_copa_m: estadistica(ev.map((a) => a.diametro_copa_m)),
      area_copa_por_arbol_m2: estadistica(area),
      longitud_copa_viva_m: estadistica(largos),
      proporcion_copa_viva_pct: { ...estadistica(proporciones), clases: distribucion(proporciones, [0, 25, 50, 75], "%") },
      relacion_copa_altura: estadistica(relacion),
      altura_primera_rama_m: estadistica(ev.map((a) => a.altura_primera_rama_m)),
      clase_edad: porCategoria(ev.map((a) => a.clase_edad)),
    },
    condicion_copa: {
      nota: "Distribución de valores registrados en la evaluación vigente; no es un índice de vitalidad ni de riesgo.",
      cle: porValor(ev.map((a) => a.cle)),
      muerte_regresiva_pct: porValor(ev.map((a) => a.muerte_regresiva_pct)),
      defoliacion_pct: porValor(ev.map((a) => a.defoliacion_pct)),
      clorosis_pct: porValor(ev.map((a) => a.clorosis_pct)),
      necrosis_pct: porValor(ev.map((a) => a.necrosis_pct)),
      copa_faltante_pct: porValor(ev.map((a) => a.copa_faltante_pct)),
      vitalidad: porCategoria(ev.map((a) => a.vitalidad)),
    },
    composicion: {
      genero: abundancia(presentes.map((a) => a.genero)),
      familia: abundancia(presentes.map((a) => a.familia)),
    },
    territorio: {
      sectores: sectores.map((s) => {
        const del = presentes.filter((a) => (a.sector?.trim() || "Sin sector") === s);
        const evs = del.filter((a) => a.evaluacion_completa_vigente);
        return {
          sector: s,
          presentes: del.length,
          con_evaluacion_vigente: evs.length,
          especies: new Set(del.map((a) => a.especie_cientifica).filter(Boolean)).size,
          altura_mediana_m: estadistica(evs.map((a) => a.altura_total_m)).mediana,
          dap_mediano_cm: estadistica(evs.map((a) => a.dap_cm)).mediana,
          diametro_copa_mediano_m: estadistica(evs.map((a) => a.diametro_copa_m)).mediana,
        };
      }),
      comparable: sectores.length > 1,
    },
    completitud: {
      presentes_sin_evaluacion_vigente: presentes.length - ev.length,
      evaluados_sin: {
        altura: faltan((a) => a.altura_total_m),
        dap: faltan((a) => a.dap_cm),
        diametro_copa: faltan((a) => a.diametro_copa_m),
        base_copa_viva: faltan((a) => a.altura_base_copa_viva_m),
        primera_rama: faltan((a) => a.altura_primera_rama_m),
        clase_edad: faltan((a) => a.clase_edad),
        cle: faltan((a) => a.cle),
        muerte_regresiva: faltan((a) => a.muerte_regresiva_pct),
      },
      base_copa_viva_mayor_que_altura: ev.filter((a) => finito(a.altura_total_m) && finito(a.altura_base_copa_viva_m) && a.altura_base_copa_viva_m > a.altura_total_m).length,
      multifustales_sin_fustes: ev.filter((a) => a.multifustal === true && (a.dap_fustes_cm?.length ?? 0) < 2).length,
      presentes_sin_especie: presentes.filter((a) => !a.especie_cientifica).length,
      presentes_sin_vinculo_catalogo: presentes.filter((a) => a.especie_cientifica && !a.especie_en_catalogo).length,
      especies_sin_origen_en_catalogo: especiesSinOrigen,
      mediciones_en_revision: presentes
        .filter((a) => a.tree_code && medicionesEnRevision[a.tree_code])
        .map((a) => ({ tree_code: a.tree_code as string, motivo: medicionesEnRevision[a.tree_code as string] })),
    },
  };
}
