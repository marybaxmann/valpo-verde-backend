/**
 * PROPUESTA EXPERIMENTAL (Valej, 2026-11-23) — no es metodología vigente.
 *
 * Área foliar, remoción de contaminantes e interceptación de precipitaciones
 * por árbol, con la lógica de i-Tree Eco (Nowak 2024) simplificada y con los
 * datos que SIVU ya registra (especie, copa, altura, base de copa viva y
 * muerte regresiva). Todo valor es exploratorio y no suma a ningún total
 * oficial. Cada parámetro lleva su fuente en PARAMETROS_FOLIARES.
 */
import serie from "../../../data/ambiental/valparaiso-2025.json";

/* ---------- Parámetros, con su fuente ---------- */

export const PARAMETROS_FOLIARES = {
  area_foliar: {
    ecuacion: "ln Y = −4,3309 + 0,2942·H + 0,7312·D + 5,7217·S − 0,0148·C;  C = π·D·(H + D)/2",
    variables: "Y área foliar (m²); H altura de copa (m); D diámetro medio de copa (m); S factor de sombra; C superficie externa de la copa (m²)",
    fuente:
      "Nowak (1996), Forest Science 42(4): 504-507, según Nowak, D. J. (2024). Understanding i-Tree: 2023 Summary of Programs and Methods. GTR NRS-200-2023, pp. 22-24 (ecuación, rangos y ajustes verificados en la fuente).",
    rango: "H 1 a 12 m, D 1 a 14 m, H/D 0,5 a 2. Si H/D > 2: ecuación con H/D = 2 × (H/D)/2; si H/D < 0,5: ecuación con H/D = 0,5 × 0,5/(H/D); fuera de 1-12 m o 1-14 m: LAI del borde del rango × área de copa (Nowak 2024, nota 5)",
    condicion: "× (1 − copa faltante); si no se registró, × (1 − muerte regresiva) (Nowak 2024, p. 24)",
    sin_factor_correccion: "No se aplica el factor de corrección logarítmica del original (no verificado): subestima levemente.",
  },
  /** Factor de sombra promedio de latifoliadas (Nowak 1996) y clase 0,91 para coníferas que no son pinos (UFORE Methods). */
  sombra: { latifoliada: 0.83, conifera: 0.91, fuente: "UFORE Methods (Nowak et al.), sección Leaf area and leaf biomass" },
  /** Supuesto exploratorio: LAI máximo por árbol (UFORE Methods lo usa como tope de arbustos; para árboles no hay tope publicado). */
  lai_maximo: { valor: 18, supuesto: "LAI acotado a 18 (tope de UFORE para arbustos): las copas muy altas y angostas lo superan al escalar por volumen. Revisar sus mediciones." },
  /** Índice de superficie de corteza de caducifolias sin hojas (Whittaker y Woodwell 1967, en UFORE Methods). */
  indice_corteza: 1.7,
  /** Supuesto exploratorio: caducifolias y semicaducifolias sin hojas del 1 de junio al 31 de agosto. */
  sin_hojas: { desde_mes: 6, hasta_mes: 8, supuesto: "Período sin hojas de caducifolias en Valparaíso: 1 de junio a 31 de agosto (supuesto, sin fuente local)." },
  deposicion: {
    formula: "F = Vd × C (Nowak et al. 2006; UFORE Methods, ec. 22). Vd = 0 con precipitación.",
    /** Vd diurna con hojas a LAI 6 (cm/s): punto medio del rango de 55 ciudades de EE. UU. (Nowak et al. 2006). */
    vd_dia_cm_s: { o3: (0.4 + 0.71) / 2, no2: (0.29 + 0.44) / 2, so2: (0.38 + 0.69) / 2 },
    /** Resistencia cuticular base (s/m) para la noche: Vd = LAI / rt (Nowak et al. 2006). */
    rt_noche_s_m: { o3: 10000, no2: 20000, so2: 8000 },
    /** CO: Rc constante con hojas 50.000 s/m (Bidwell y Fraser 1972, en Nowak et al. 2006). */
    rc_co_s_m: 50000,
    /** PM10: mediana 0,0128 m/s con hojas (Lovett 1994) con 50 % de resuspensión (Zinke 1967), a LAI 6. */
    vd_pm10_m_s: 0.0128,
    resuspension_pm10: 0.5,
    fuente:
      "Nowak, Crane y Stevens (2006). Air pollution removal by urban trees and shrubs in the United States. UF&UG 4: 115-123; UFORE Methods.",
    simplificacion: "Vd escalada linealmente por LAI/6; sin resistencias aerodinámicas horarias (Ra, Rb) ni capa de mezcla.",
  },
  intercepcion: {
    formula:
      "Svmax = 0,0002 m × LAI; c = 1 − e^(−0,7·LAI); Pc = P·c; Sv(t) = Sv(t−1) + Pc − Ev; Ev = (Sv/Svmax)^(2/3) × PE (Hirabayashi 2013, ec. 1 a 6).",
    fuente: "Hirabayashi, S. (2013). i-Tree Eco Precipitation Interception Model Descriptions v1.3 (basado en Wang et al. 2008).",
    simplificacion: "PE = evapotranspiración de referencia FAO-56 horaria. Interceptación = agua retenida por la copa que se evapora.",
  },
  serie: {
    descripcion: (serie as { descripcion: string }).descripcion,
    fuentes: (serie as { fuentes: string[] }).fuentes,
    periodo: (serie as { periodo: unknown }).periodo,
  },
} as const;

/* ---------- Área foliar ---------- */

export interface ArbolFoliar {
  id: string;
  tree_code: string | null;
  especie_cientifica: string | null;
  /** latifoliada, acicular, palmera… (v_species_traits). */
  tipo_hoja: string | null;
  /** perennifolia, caducifolia, semicaducifolia. */
  persistencia_follaje: string | null;
  genero: string | null;
  altura_total_m: number | null;
  altura_base_copa_viva_m: number | null;
  altura_primera_rama_m: number | null;
  diametro_copa_ns_m: number | null;
  diametro_copa_eo_m: number | null;
  copa_no_presenta: boolean | null;
  muerte_regresiva_pct: number | null;
  /** Copa faltante (%) de la evaluación vigente: ajuste preferente de i-Tree (Nowak 2024, p. 24). */
  copa_faltante_pct?: number | null;
}

const ecuacionNowak = (h: number, d: number, s: number) => Math.exp(-4.3309 + 0.2942 * h + 0.7312 * d + 5.7217 * s - 0.0148 * ((Math.PI * d * (h + d)) / 2));

/**
 * Área foliar de copa abierta con los ajustes de rango de i-Tree (Nowak
 * 2024, nota 5):
 * - H/D > 2: ecuación con el ancho real y H/D = 2, × (H/D)/2;
 * - H/D < 0,5: ecuación con la altura real y H/D = 0,5, × 0,5/(H/D);
 * - copa fuera de 1-12 m de alto o 1-14 m de ancho: LAI de la copa llevada
 *   al borde del rango (misma proporción) × área de suelo de la copa.
 */
export function areaFoliarCopaAbierta(h: number, d: number, s: number) {
  const ajustes: string[] = [];
  let hr = h;
  let dr = d;
  let factor = 1;
  if (h / d > 2) {
    hr = 2 * d;
    factor = h / d / 2;
    ajustes.push("H/D > 2: ecuación con H/D = 2 y escalada (i-Tree)");
  } else if (h / d < 0.5) {
    dr = 2 * h;
    factor = 0.5 / (h / d);
    ajustes.push("H/D < 0,5: ecuación con H/D = 0,5 y escalada (i-Tree)");
  }
  let la: number;
  if (hr > 12 || dr > 14 || hr < 1 || dr < 1) {
    const f = hr > 12 || dr > 14 ? Math.min(12 / hr, 14 / dr) : Math.max(1 / hr, 1 / dr);
    const lai = ecuacionNowak(f * hr, f * dr, s) / ((Math.PI * (f * dr) ** 2) / 4);
    la = lai * ((Math.PI * dr * dr) / 4);
    ajustes.push("copa fuera del rango de la ecuación: LAI del borde del rango × área de copa (i-Tree)");
  } else {
    la = ecuacionNowak(hr, dr, s);
  }
  return { area_foliar_m2: la * factor, ajustes };
}

export type MotivoSinFoliar = "palmera" | "sin_copa" | "falta_copa" | "falta_altura_copa" | "copa_invalida";

export interface ResultadoFoliar {
  id: string;
  tree_code: string | null;
  especie_cientifica: string | null;
  area_foliar_m2: number | null;
  /** LAI = área foliar / área de suelo de la copa (elipse NS × EO). */
  lai: number | null;
  area_copa_m2: number | null;
  caducifolia: boolean;
  factor_sombra: number | null;
  ajustes: string[];
  motivo: MotivoSinFoliar | null;
}

export const MOTIVO_SIN_FOLIAR: Record<MotivoSinFoliar, string> = {
  palmera: "Palmera: la ecuación de copa no se aplica.",
  sin_copa: "El árbol no presenta copa.",
  falta_copa: "Faltan los diámetros de copa.",
  falta_altura_copa: "Falta la altura total o la base de copa viva.",
  copa_invalida: "La altura de copa resulta nula o negativa.",
};

export function areaFoliarArbol(a: ArbolFoliar): ResultadoFoliar {
  const base = { id: a.id, tree_code: a.tree_code, especie_cientifica: a.especie_cientifica, caducifolia: a.persistencia_follaje === "caducifolia" || a.persistencia_follaje === "semicaducifolia" };
  const sin = (motivo: MotivoSinFoliar): ResultadoFoliar => ({ ...base, area_foliar_m2: null, lai: null, area_copa_m2: null, factor_sombra: null, ajustes: [], motivo });
  if (a.tipo_hoja === "palmera") return sin("palmera");
  if (a.copa_no_presenta === true) return sin("sin_copa");
  if (a.diametro_copa_ns_m === null || a.diametro_copa_eo_m === null || !(a.diametro_copa_ns_m > 0) || !(a.diametro_copa_eo_m > 0)) return sin("falta_copa");
  const baseCopa = a.altura_base_copa_viva_m ?? a.altura_primera_rama_m;
  if (a.altura_total_m === null || baseCopa === null) return sin("falta_altura_copa");
  const h = a.altura_total_m - baseCopa;
  if (!(h > 0)) return sin("copa_invalida");
  const d = (a.diametro_copa_ns_m + a.diametro_copa_eo_m) / 2;
  // Coníferas que no son pinos: clase 0,91; pinos y latifoliadas: 0,83 (UFORE Methods).
  const conifera = a.tipo_hoja === "acicular" || a.tipo_hoja === "escamosa";
  const s = conifera && a.genero !== "Pinus" ? PARAMETROS_FOLIARES.sombra.conifera : PARAMETROS_FOLIARES.sombra.latifoliada;
  const r = areaFoliarCopaAbierta(h, d, s);
  const ajustes = [...r.ajustes];
  if (a.altura_base_copa_viva_m === null) ajustes.push("base de copa = altura de primera rama");
  // Condición (Nowak 2024, p. 24): × (1 − copa faltante); si no se registró, × (1 − muerte regresiva).
  let la = r.area_foliar_m2;
  const faltante = a.copa_faltante_pct ?? null;
  if (faltante !== null) {
    if (faltante > 0) {
      la *= 1 - Math.min(100, faltante) / 100;
      ajustes.push(`reducida ${faltante} % por copa faltante`);
    }
  } else if (a.muerte_regresiva_pct !== null && a.muerte_regresiva_pct > 0) {
    la *= 1 - Math.min(100, a.muerte_regresiva_pct) / 100;
    ajustes.push(`reducida ${a.muerte_regresiva_pct} % por muerte regresiva (sin dato de copa faltante)`);
  }
  const areaCopa = (Math.PI * a.diametro_copa_ns_m * a.diametro_copa_eo_m) / 4;
  const laiMax = PARAMETROS_FOLIARES.lai_maximo.valor;
  if (la / areaCopa > laiMax) {
    ajustes.push(`LAI acotado a ${laiMax} (era ${(la / areaCopa).toFixed(1)}): revisar la medición de la copa`);
    la = laiMax * areaCopa;
  }
  return { ...base, area_foliar_m2: la, lai: la / areaCopa, area_copa_m2: areaCopa, factor_sombra: s, ajustes, motivo: null };
}

/* ---------- Serie horaria ---------- */

interface Serie {
  inicio: string;
  precipitacion: Array<number | null>;
  et0: Array<number | null>;
  radiacion: Array<number | null>;
  pm10: Array<number | null>;
  no2: Array<number | null>;
  o3: Array<number | null>;
  so2: Array<number | null>;
  co: Array<number | null>;
}
const S = serie as unknown as Serie;
const HORAS = S.precipitacion.length;
/** Mes (1 a 12) de cada hora, desde el inicio de la serie (hora local). */
const MES: number[] = (() => {
  const [y, m, d] = S.inicio.slice(0, 10).split("-").map(Number);
  const t0 = Date.UTC(y, m - 1, d);
  return Array.from({ length: HORAS }, (_, i) => new Date(t0 + i * 3600_000).getUTCMonth() + 1);
})();
const sinHojas = (h: number) => MES[h] >= PARAMETROS_FOLIARES.sin_hojas.desde_mes && MES[h] <= PARAMETROS_FOLIARES.sin_hojas.hasta_mes;

/** Índice foliar efectivo de la hora: corteza (1,7) en caducifolias sin hojas. */
const laiHora = (lai: number, caducifolia: boolean, h: number) => (caducifolia && sinHojas(h) ? PARAMETROS_FOLIARES.indice_corteza : lai);

export const CONTAMINANTES = ["o3", "no2", "so2", "pm10", "co"] as const;
export type Contaminante = (typeof CONTAMINANTES)[number];

/** Velocidad de deposición (m/s) de la hora, para un índice foliar dado. */
function vdHora(p: Contaminante, lai: number, dia: boolean): number {
  const P = PARAMETROS_FOLIARES.deposicion;
  const escala = lai / 6;
  switch (p) {
    case "pm10":
      return P.vd_pm10_m_s * (1 - P.resuspension_pm10) * escala;
    case "co":
      return (1 / P.rc_co_s_m) * escala;
    default:
      return dia ? (P.vd_dia_cm_s[p] / 100) * escala : lai / P.rt_noche_s_m[p];
  }
}

/** Remoción anual por árbol (g/año por contaminante). F = Vd × C sobre el área de copa; 0 con lluvia. */
export function remocionArbol(lai: number, areaCopa: number, caducifolia: boolean): Record<Contaminante, number> {
  const total = { o3: 0, no2: 0, so2: 0, pm10: 0, co: 0 } as Record<Contaminante, number>;
  for (let h = 0; h < HORAS; h++) {
    if ((S.precipitacion[h] ?? 0) > 0) continue;
    const l = laiHora(lai, caducifolia, h);
    const dia = (S.radiacion[h] ?? 0) > 0;
    for (const p of CONTAMINANTES) {
      const c = S[p][h];
      if (c === null) continue;
      total[p] += vdHora(p, l, dia) * c * 1e-6 * 3600 * areaCopa;
    }
  }
  return total;
}

/** Interceptación anual por árbol (m³/año): agua retenida por la copa que se evapora (i-Tree Eco, ec. 1 a 6). */
export function intercepcionArbol(lai: number, areaCopa: number, caducifolia: boolean) {
  let sv = 0;
  let evaporada = 0;
  let lluviaSobreCopa = 0;
  for (let h = 0; h < HORAS; h++) {
    const l = laiHora(lai, caducifolia, h);
    const svMax = 0.0002 * l;
    const p = (S.precipitacion[h] ?? 0) / 1000;
    const pe = (S.et0[h] ?? 0) / 1000;
    lluviaSobreCopa += p;
    const c = 1 - Math.exp(-0.7 * l);
    if (sv > svMax) sv = svMax; // al perder las hojas, la capacidad baja
    const ev = sv > 0 && svMax > 0 ? Math.min(sv, (sv / svMax) ** (2 / 3) * pe) : 0;
    evaporada += ev;
    sv = Math.min(svMax, Math.max(0, sv + p * c - ev));
  }
  return { intercepcion_m3: evaporada * areaCopa, lluvia_sobre_copa_m3: lluviaSobreCopa * areaCopa };
}

/* ---------- Agregado del ámbito ---------- */

export interface ArbolAporteFoliar extends ResultadoFoliar {
  remocion_g: Record<Contaminante, number> | null;
  remocion_total_g: number | null;
  intercepcion_m3: number | null;
  lluvia_sobre_copa_m3: number | null;
}

export function agregarAportesFoliares(arboles: ArbolFoliar[]) {
  const filas: ArbolAporteFoliar[] = arboles.map((a) => {
    const f = areaFoliarArbol(a);
    if (f.lai === null || f.area_copa_m2 === null) return { ...f, remocion_g: null, remocion_total_g: null, intercepcion_m3: null, lluvia_sobre_copa_m3: null };
    const r = remocionArbol(f.lai, f.area_copa_m2, f.caducifolia);
    const i = intercepcionArbol(f.lai, f.area_copa_m2, f.caducifolia);
    return { ...f, remocion_g: r, remocion_total_g: CONTAMINANTES.reduce((s, p) => s + r[p], 0), intercepcion_m3: i.intercepcion_m3, lluvia_sobre_copa_m3: i.lluvia_sobre_copa_m3 };
  });
  const con = filas.filter((f) => f.area_foliar_m2 !== null);
  const suma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const motivos: Partial<Record<MotivoSinFoliar, number>> = {};
  for (const f of filas) if (f.motivo) motivos[f.motivo] = (motivos[f.motivo] ?? 0) + 1;
  const remocionKg = Object.fromEntries(CONTAMINANTES.map((p) => [p, con.length ? suma(con.map((f) => f.remocion_g![p])) / 1000 : null])) as Record<Contaminante, number | null>;
  const intercepcion = con.length ? suma(con.map((f) => f.intercepcion_m3!)) : null;
  const lluvia = con.length ? suma(con.map((f) => f.lluvia_sobre_copa_m3!)) : null;
  // Promedios del período (concentración y lluvia), para contexto en la interfaz.
  const promedio = (v: Array<number | null>) => {
    const xs = v.filter((x): x is number => x !== null);
    return xs.length ? suma(xs) / xs.length : null;
  };
  return {
    indicador: "aportes_foliares" as const,
    estado_metodologico: "propuesta experimental (Valej, 2026-11-23): resultados exploratorios, no suman a totales oficiales",
    parametros: PARAMETROS_FOLIARES,
    cobertura: {
      arboles: filas.length,
      con_area_foliar: con.length,
      sin_area_foliar: filas.length - con.length,
      motivos,
      /** Árboles cuyo LAI se acotó: sus mediciones de copa conviene revisarlas. */
      lai_acotado: con.filter((f) => f.ajustes.some((x) => x.startsWith("LAI acotado"))).map((f) => f.tree_code ?? f.id),
    },
    area_foliar: {
      total_m2: con.length ? suma(con.map((f) => f.area_foliar_m2!)) : null,
      lai_medio: con.length ? suma(con.map((f) => f.area_foliar_m2!)) / suma(con.map((f) => f.area_copa_m2!)) : null,
    },
    remocion_contaminantes: {
      unidad: "kg/año",
      por_contaminante: remocionKg,
      total_kg: con.length ? suma(CONTAMINANTES.map((p) => remocionKg[p] ?? 0)) : null,
      concentracion_media_ug_m3: Object.fromEntries(CONTAMINANTES.map((p) => [p, promedio(S[p])])) as Record<Contaminante, number | null>,
    },
    intercepcion_precipitaciones: {
      unidad: "m3/año",
      total_m3: intercepcion,
      lluvia_sobre_copas_m3: lluvia,
      porcentaje_interceptado: intercepcion !== null && lluvia ? (intercepcion / lluvia) * 100 : null,
      precipitacion_anual_mm: suma(S.precipitacion.map((x) => x ?? 0)),
    },
    arboles: filas,
  };
}
