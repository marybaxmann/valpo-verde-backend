/**
 * Secuestro bruto anual de CO₂ por árbol: primera implementación
 * (decisiones A, B y C de la responsable, 2026-11-20; la decisión D, que
 * registra el método en el Excel maestro y la fila 15 de INDICES, sigue
 * pendiente). Funciones puras.
 *
 * Método:
 *   C₀ = carbono aéreo leñoso con el DAP vigente (calcularCarbonoArbol, CC-069 v1, sin cambios);
 *   ΔDAP = tasa de la categoría de crecimiento × factor CLE × (1 − muerte regresiva);
 *   C₁ = la misma función con DAP₀ + ΔDAP y la misma altura (supuesto: altura constante);
 *   secuestro = (C₁ − C₀) × 44/12, en kg CO₂ por árbol y año.
 *
 * Reglas:
 * - Ambos DAP deben quedar dentro del rango del modelo, con el mismo modelo.
 * - Se conservan todas las restricciones del carbono almacenado (multifustales, especie sin modelo, etc.).
 * - Sin ajuste por días libres de heladas (decisión B).
 * - Una especie solo tiene «estimación fundamentada» si figura en
 *   CATEGORIA_APROBADA_POR_ESPECIE con su fuente. Hoy está vacía: con
 *   modelo aplicable, el resultado es una SIMULACIÓN con las tres
 *   categorías publicadas, sin asignar ninguna a la especie.
 * - Las simulaciones nunca se suman a los totales.
 */
import { CarbonoArbol, ArbolCarbono, calcularCarbonoArbol, MotivoSinCarbono, CategoriaSinCarbono } from "./calculo";
import { FACTOR_CO2_POR_C } from "./modelos";
import { claveEspecie } from "../indicadores/especies";

/** Parámetros publicados de i-Tree Eco. No se modifican sin una decisión registrada. */
export const CRECIMIENTO_ITREE = {
  fuente: "Nowak, D. J. (2024). Understanding i-Tree: 2023 Summary of Programs and Methods. USDA Forest Service, GTR NRS-200-2023, sección «Tree Growth», pp. 44-45",
  /** Crecimiento diamétrico estandarizado de árboles de crecimiento libre con 153 días libres de heladas (cm/año). */
  categorias: [
    { codigo: "lento", etiqueta: "Lento", tasa_cm_anio: 0.58 },
    { codigo: "moderado", etiqueta: "Moderado", tasa_cm_anio: 0.84 },
    { codigo: "rapido", etiqueta: "Rápido", tasa_cm_anio: 1.09 },
  ],
  /** Factor por exposición lumínica de copa (CLE, 0 a 5). */
  factor_cle: [
    { cle_min: 0, cle_max: 1, factor: 0.44, condicion: "bosque" },
    { cle_min: 2, cle_max: 3, factor: 0.56, condicion: "parque" },
    { cle_min: 4, cle_max: 5, factor: 1, condicion: "crecimiento libre" },
  ],
  condicion: "× (1 − muerte regresiva de copa)",
  ajuste_temporada: "no aplicado (decisión B, 2026-11-20): el ajuste por días libres de heladas no es representativo de Valparaíso",
} as const;

export type CodigoCategoria = (typeof CRECIMIENTO_ITREE.categorias)[number]["codigo"];

/**
 * Especies con una categoría de crecimiento aprobada y su fuente. Solo
 * estas pueden tener una «estimación fundamentada». Vacía al 2026-11-20:
 * ninguna especie del Piloto tiene una categoría con fuente verificada.
 * Clave: claveEspecie (género y epíteto en minúsculas).
 */
export const CATEGORIA_APROBADA_POR_ESPECIE: Readonly<Record<string, { categoria: CodigoCategoria; fuente: string }>> = {};

export const SUPUESTOS_SECUESTRO = [
  "Simulación basada en supuestos: no es una medición ni una estimación validada.",
  "Crecimiento diamétrico con las categorías publicadas por i-Tree Eco (lento, moderado y rápido), sin asignar ninguna a la especie.",
  "Factores de i-Tree Eco por exposición lumínica de copa (CLE) y muerte regresiva; sin ajuste por días libres de heladas.",
  "Altura constante entre un año y el siguiente.",
  "Carbono aéreo leñoso con el mismo modelo del carbono almacenado (CC-069 v1): sin raíces ni follaje.",
  "Secuestro bruto: no descuenta mortalidad ni descomposición.",
] as const;

export const METODO_SECUESTRO = {
  version: "secuestro v1 (decisiones A, B y C, 2026-11-20)",
  estado: "primera implementación; método no registrado en el Excel maestro (decisión D pendiente)",
  base_carbono: "CC-069 v1 (carbono aéreo leñoso almacenado)",
  crecimiento: CRECIMIENTO_ITREE,
  altura: "constante (supuesto)",
  unidad: "kg CO₂ por árbol y año",
  factor_co2: "44/12",
} as const;

export interface ArbolSecuestro extends ArbolCarbono {
  /** D-88, exposición lumínica de copa (0 a 5) de la evaluación vigente. */
  cle: number | null;
  /** D-89, muerte regresiva de copa (%) de la evaluación vigente. */
  muerte_regresiva_pct: number | null;
}

export const MOTIVOS_SECUESTRO_PROPIOS = {
  falta_cle: "dato_faltante_o_inconsistente",
  falta_muerte_regresiva: "dato_faltante_o_inconsistente",
  dap_proyectado_fuera_de_rango: "restriccion_modelo",
  resultado_invalido_secuestro: "error_calculo",
} as const satisfies Record<string, CategoriaSinCarbono>;

export type MotivoSinSecuestro = MotivoSinCarbono | keyof typeof MOTIVOS_SECUESTRO_PROPIOS;

export interface ResultadoCategoria {
  categoria: CodigoCategoria;
  tasa_base_cm_anio: number;
  delta_dap_cm: number;
  dap_proyectado_cm: number;
  carbono_kg_anio: number;
  co2_kg_anio: number;
}

interface Comun {
  unidad: "kg CO₂/árbol/año";
  modelo: { id: string; fuente: string; confianza: CarbonoArbol["modelo"]["confianza"]; especie_ecuacion: string; rango: CarbonoArbol["modelo"]["rango"] };
  entradas: { dap_cm: number; altura_total_m: number | null; cle: number; muerte_regresiva_pct: number };
  factores: { factor_cle: number; factor_condicion: number };
  supuestos: string[];
}

export type ResultadoSecuestro =
  | (Comun & {
      tipo: "estimacion_fundamentada";
      valor: ResultadoCategoria;
      fuente_categoria: string;
      motivo: null;
      categoria_motivo: null;
      detalle: null;
    })
  | (Comun & {
      tipo: "simulacion_exploratoria";
      rango: { co2_kg_anio_min: number; co2_kg_anio_max: number };
      por_categoria: ResultadoCategoria[];
      motivo: null;
      categoria_motivo: null;
      detalle: null;
    })
  | {
      tipo: "no_estimable" | "fuera_del_universo";
      motivo: MotivoSinSecuestro;
      categoria_motivo: CategoriaSinCarbono;
      detalle: string;
    };

const sinSecuestro = (motivo: MotivoSinSecuestro, categoria: CategoriaSinCarbono, detalle: string): ResultadoSecuestro => ({
  tipo: categoria === "fuera_del_universo" ? "fuera_del_universo" : "no_estimable",
  motivo,
  categoria_motivo: categoria,
  detalle,
});

export function factorCle(cle: number): number | null {
  if (!Number.isInteger(cle)) return null;
  const f = CRECIMIENTO_ITREE.factor_cle.find((x) => cle >= x.cle_min && cle <= x.cle_max);
  return f ? f.factor : null;
}

/** Calcula el secuestro de un árbol. Nunca extrapola ni asigna categorías. */
export function calcularSecuestroArbol(
  a: ArbolSecuestro,
  /** Inyectable solo para pruebas; en la API es siempre CATEGORIA_APROBADA_POR_ESPECIE. */
  aprobadas: Readonly<Record<string, { categoria: CodigoCategoria; fuente: string }>> = CATEGORIA_APROBADA_POR_ESPECIE
): ResultadoSecuestro {
  const r0 = calcularCarbonoArbol(a);
  if (r0.valor === null) return sinSecuestro(r0.motivo, r0.categoria, r0.detalle);
  const c0 = r0.valor;

  const fCle = a.cle === null ? null : factorCle(a.cle);
  if (a.cle === null || fCle === null) {
    return sinSecuestro("falta_cle", "dato_faltante_o_inconsistente", "Falta la exposición lumínica de copa (CLE, 0 a 5) en la evaluación vigente.");
  }
  const mr = a.muerte_regresiva_pct;
  if (mr === null || !Number.isFinite(mr) || mr < 0 || mr > 100) {
    return sinSecuestro("falta_muerte_regresiva", "dato_faltante_o_inconsistente", "Falta la muerte regresiva de copa (0 a 100 %) en la evaluación vigente.");
  }
  const fCond = 1 - mr / 100;

  const porCategoria: ResultadoCategoria[] = [];
  for (const cat of CRECIMIENTO_ITREE.categorias) {
    const delta = cat.tasa_cm_anio * fCle * fCond;
    const dap1 = c0.entradas.dap_cm + delta;
    const r1 = calcularCarbonoArbol({ ...a, dap_cm: dap1 });
    if (r1.valor === null || r1.valor.modelo.id !== c0.modelo.id) {
      return sinSecuestro(
        "dap_proyectado_fuera_de_rango",
        "restriccion_modelo",
        `Con la categoría «${cat.etiqueta}» el DAP del año siguiente (${dap1.toFixed(2)} cm) queda fuera del rango del modelo (${c0.modelo.rango.dap_min_cm}-${c0.modelo.rango.dap_max_cm} cm).`
      );
    }
    const carbono = r1.valor.carbono_kg - c0.carbono_kg;
    const co2 = carbono * FACTOR_CO2_POR_C;
    if (!Number.isFinite(co2) || co2 < 0) {
      return sinSecuestro("resultado_invalido_secuestro", "error_calculo", "El cálculo del secuestro no dio un valor finito y no negativo.");
    }
    porCategoria.push({ categoria: cat.codigo, tasa_base_cm_anio: cat.tasa_cm_anio, delta_dap_cm: delta, dap_proyectado_cm: dap1, carbono_kg_anio: carbono, co2_kg_anio: co2 });
  }

  const comun: Comun = {
    unidad: "kg CO₂/árbol/año",
    modelo: { id: c0.modelo.id, fuente: c0.modelo.fuente, confianza: c0.modelo.confianza, especie_ecuacion: c0.modelo.especie_ecuacion, rango: { ...c0.modelo.rango } },
    entradas: { dap_cm: c0.entradas.dap_cm, altura_total_m: c0.entradas.altura_total_m, cle: a.cle, muerte_regresiva_pct: mr },
    factores: { factor_cle: fCle, factor_condicion: fCond },
    supuestos: [...SUPUESTOS_SECUESTRO],
  };

  const clave = claveEspecie(a.especie_cientifica);
  const aprobada = clave === null ? undefined : aprobadas[clave];
  if (aprobada) {
    const valor = porCategoria.find((p) => p.categoria === aprobada.categoria)!;
    return {
      ...comun,
      supuestos: comun.supuestos.filter((s) => !s.startsWith("Simulación") && !s.startsWith("Crecimiento diamétrico con las categorías")),
      tipo: "estimacion_fundamentada",
      valor,
      fuente_categoria: aprobada.fuente,
      motivo: null,
      categoria_motivo: null,
      detalle: null,
    };
  }
  const valores = porCategoria.map((p) => p.co2_kg_anio);
  return {
    ...comun,
    tipo: "simulacion_exploratoria",
    rango: { co2_kg_anio_min: Math.min(...valores), co2_kg_anio_max: Math.max(...valores) },
    por_categoria: porCategoria,
    motivo: null,
    categoria_motivo: null,
    detalle: null,
  };
}

/**
 * Agregado del ámbito. Solo las estimaciones fundamentadas suman al total;
 * las simulaciones se cuentan, pero nunca se suman. Sin ninguna
 * fundamentada, el total es null (no 0).
 */
export function agregarSecuestro(
  arboles: ArbolSecuestro[],
  aprobadas: Readonly<Record<string, { categoria: CodigoCategoria; fuente: string }>> = CATEGORIA_APROBADA_POR_ESPECIE
) {
  const presentes = arboles.filter((a) => a.presente);
  const motivos: Partial<Record<MotivoSinSecuestro, number>> = {};
  let fundamentadas = 0;
  let simulaciones = 0;
  let noEstimables = 0;
  let fueraUniverso = 0;
  let totalCo2 = 0;
  for (const a of presentes) {
    const r = calcularSecuestroArbol(a, aprobadas);
    if (r.tipo === "estimacion_fundamentada") {
      fundamentadas++;
      totalCo2 += r.valor.co2_kg_anio;
    } else if (r.tipo === "simulacion_exploratoria") {
      simulaciones++;
    } else {
      if (r.tipo === "fuera_del_universo") fueraUniverso++;
      else noEstimables++;
      motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1;
    }
  }
  return {
    indicador: "estimacion_secuestro_anual" as const,
    metodo: METODO_SECUESTRO,
    supuestos_simulacion: [...SUPUESTOS_SECUESTRO],
    cobertura: {
      presentes: presentes.length,
      universo_calculo: presentes.length - fueraUniverso,
      estimacion_fundamentada: fundamentadas,
      simulacion_exploratoria: simulaciones,
      no_estimable: noEstimables,
      motivos,
    },
    /** Solo estimaciones fundamentadas. Las simulaciones no se suman. */
    total_fundamentado: {
      co2_kg_anio: fundamentadas > 0 ? totalCo2 : null,
      co2_t_anio: fundamentadas > 0 ? totalCo2 / 1000 : null,
    },
  };
}
