/**
 * PROPUESTA EXPERIMENTAL (2026-11-21), no vigente: variación anual PROYECTADA
 * del carbono aéreo TOTAL (tallo, ramas, ramillas y hojas; sin raíces) para
 * las especies con modelo de carbono directo (Cruz et al. 2015: quillay y
 * peumo). Tratamiento separado del secuestro anual de SIVU (secuestro.ts),
 * porque el componente es otro: incluye el carbono del follaje.
 *
 * Qué es y qué no es:
 * - Es el aumento proyectado del carbono almacenado en la parte aérea entre
 *   un año y el siguiente por crecimiento diamétrico (C₁ − C₀) × 44/12.
 * - No es el secuestro bruto leñoso del indicador oficial (sin hojas) ni la
 *   captura fotosintética (fijación bruta de CO₂), que SIVU no estima.
 *
 * Mismo crecimiento que el secuestro anual (CRECIMIENTO_ITREE, factores de
 * CLE y muerte regresiva, sin ajuste por heladas, altura constante), sin
 * modificar sus parámetros. Siempre es una SIMULACIÓN con las tres
 * categorías: nunca una estimación fundamentada y nunca suma a un total.
 */
import { CategoriaSinCarbono } from "./calculo";
import { calcularCarbonoAereoTotalArbol } from "./carbonoAereoTotal";
import { FACTOR_CO2_POR_C } from "./modelos";
import { ArbolSecuestro, CodigoCategoria, CRECIMIENTO_ITREE, factorCle, MotivoSinSecuestro } from "./secuestro";

export const SUPUESTOS_VARIACION_AEREO_TOTAL = [
  "Propuesta experimental, no vigente: simulación basada en supuestos, no es una medición ni una estimación validada.",
  "Variación anual proyectada del carbono aéreo total (incluye hojas): no es el secuestro leñoso de SIVU ni la captura fotosintética.",
  "Crecimiento diamétrico con las categorías publicadas por i-Tree Eco (lento, moderado y rápido), sin asignar ninguna a la especie.",
  "Factores de i-Tree Eco por exposición lumínica de copa (CLE) y muerte regresiva; sin ajuste por días libres de heladas.",
  "Ecuación de carbono directo de la especie (Cruz et al. 2015), ajustada en el bosque mediterráneo chileno, no en árboles urbanos.",
  "No descuenta mortalidad, caída de hojas ni descomposición.",
] as const;

export const METODO_VARIACION_AEREO_TOTAL = {
  version: "variación anual del carbono aéreo total v0 (propuesta experimental, 2026-11-21)",
  estado: "propuesta experimental pendiente de revisión del equipo; no forma parte de la metodología vigente",
  base_carbono: "carbono aéreo total con modelos de carbono directo (propuesta experimental)",
  crecimiento: CRECIMIENTO_ITREE,
  altura: "no interviene (la ecuación solo usa el DAP)",
  unidad: "kg CO₂ por árbol y año",
  factor_co2: "44/12",
  incluye_follaje: true,
  es_captura_fotosintetica: false,
} as const;

export interface CategoriaVariacion {
  categoria: CodigoCategoria;
  tasa_base_cm_anio: number;
  delta_dap_cm: number;
  dap_proyectado_cm: number;
  carbono_kg_anio: number;
  co2_kg_anio: number;
}

export type ResultadoVariacionAereoTotal =
  | {
      tipo: "simulacion_exploratoria";
      indicador: "variacion_anual_carbono_aereo_total";
      unidad: "kg CO₂/árbol/año";
      componente: { codigo: "aerea_total"; incluye: string[]; excluye: string[] };
      modelo: { id: string; fuente: string; doi: string; estado: "aprobado" | "exploratorio"; confianza: string; rango: { dap_min_cm: number; dap_max_cm: number } };
      entradas: { dap_cm: number; cle: number; muerte_regresiva_pct: number };
      factores: { factor_cle: number; factor_condicion: number };
      rango: { co2_kg_anio_min: number; co2_kg_anio_max: number };
      por_categoria: CategoriaVariacion[];
      supuestos: string[];
      advertencias: string[];
      motivo: null;
      categoria_motivo: null;
      detalle: null;
    }
  | { tipo: "no_estimable" | "fuera_del_universo"; motivo: MotivoSinSecuestro; categoria_motivo: CategoriaSinCarbono; detalle: string };

const sin = (motivo: MotivoSinSecuestro, categoria: CategoriaSinCarbono, detalle: string): ResultadoVariacionAereoTotal => ({
  tipo: categoria === "fuera_del_universo" ? "fuera_del_universo" : "no_estimable",
  motivo,
  categoria_motivo: categoria,
  detalle,
});

export function calcularVariacionAereoTotalArbol(a: ArbolSecuestro): ResultadoVariacionAereoTotal {
  const r0 = calcularCarbonoAereoTotalArbol(a);
  if (r0.valor === null) return sin(r0.motivo, r0.categoria, r0.detalle);
  const c0 = r0.valor;

  const fCle = a.cle === null ? null : factorCle(a.cle);
  if (a.cle === null || fCle === null) {
    return sin("falta_cle", "dato_faltante_o_inconsistente", "Falta la exposición lumínica de copa (CLE, 0 a 5) en la evaluación vigente.");
  }
  const mr = a.muerte_regresiva_pct;
  if (mr === null || !Number.isFinite(mr) || mr < 0 || mr > 100) {
    return sin("falta_muerte_regresiva", "dato_faltante_o_inconsistente", "Falta la muerte regresiva de copa (0 a 100 %) en la evaluación vigente.");
  }
  const fCond = 1 - mr / 100;

  const porCategoria: CategoriaVariacion[] = [];
  for (const cat of CRECIMIENTO_ITREE.categorias) {
    const delta = cat.tasa_cm_anio * fCle * fCond;
    const dap1 = c0.entradas.dap_cm + delta;
    const r1 = calcularCarbonoAereoTotalArbol({ ...a, dap_cm: dap1 });
    if (r1.valor === null || r1.valor.modelo.id !== c0.modelo.id) {
      return sin(
        "dap_proyectado_fuera_de_rango",
        "restriccion_modelo",
        `Con la categoría «${cat.etiqueta}» el DAP del año siguiente (${dap1.toFixed(2)} cm) queda fuera del rango del modelo (${c0.modelo.rango.dap_min_cm}-${c0.modelo.rango.dap_max_cm} cm).`
      );
    }
    const carbono = r1.valor.carbono_kg - c0.carbono_kg;
    const co2 = carbono * FACTOR_CO2_POR_C;
    if (!Number.isFinite(co2) || co2 < 0) {
      return sin("resultado_invalido_secuestro", "error_calculo", "El cálculo de la variación anual no dio un valor finito y no negativo.");
    }
    porCategoria.push({ categoria: cat.codigo, tasa_base_cm_anio: cat.tasa_cm_anio, delta_dap_cm: delta, dap_proyectado_cm: dap1, carbono_kg_anio: carbono, co2_kg_anio: co2 });
  }

  const advertencias = ["Modelo de carbono directo exploratorio: ecuación de la especie ajustada fuera de la ciudad; incluye hojas."];
  if (a.poda_intensa === true) {
    advertencias.push("Copa con poda intensa o desmoche (vitalidad no evaluable por poda): el modelo puede no representar su arquitectura.");
  }
  const valores = porCategoria.map((p) => p.co2_kg_anio);
  return {
    tipo: "simulacion_exploratoria",
    indicador: "variacion_anual_carbono_aereo_total",
    unidad: "kg CO₂/árbol/año",
    componente: { ...c0.componente, incluye: [...c0.componente.incluye], excluye: [...c0.componente.excluye] },
    modelo: { id: c0.modelo.id, fuente: c0.modelo.fuente, doi: c0.modelo.doi, estado: c0.modelo.estado, confianza: c0.modelo.confianza, rango: { ...c0.modelo.rango } },
    entradas: { dap_cm: c0.entradas.dap_cm, cle: a.cle, muerte_regresiva_pct: mr },
    factores: { factor_cle: fCle, factor_condicion: fCond },
    rango: { co2_kg_anio_min: Math.min(...valores), co2_kg_anio_max: Math.max(...valores) },
    por_categoria: porCategoria,
    supuestos: [...SUPUESTOS_VARIACION_AEREO_TOTAL],
    advertencias,
    motivo: null,
    categoria_motivo: null,
    detalle: null,
  };
}

/** Agregado del ámbito: solo cobertura. Nunca suma simulaciones ni se mezcla con el secuestro leñoso. */
export function agregarVariacionAereoTotal(arboles: ArbolSecuestro[]) {
  const presentes = arboles.filter((a) => a.presente);
  const motivos: Partial<Record<MotivoSinSecuestro, number>> = {};
  let simulaciones = 0;
  let noEstimables = 0;
  let fueraUniverso = 0;
  for (const a of presentes) {
    const r = calcularVariacionAereoTotalArbol(a);
    if (r.tipo === "simulacion_exploratoria") simulaciones++;
    else {
      if (r.tipo === "fuera_del_universo") fueraUniverso++;
      else noEstimables++;
      motivos[r.motivo] = (motivos[r.motivo] ?? 0) + 1;
    }
  }
  return {
    indicador: "estimacion_variacion_anual_carbono_aereo_total" as const,
    metodo: METODO_VARIACION_AEREO_TOTAL,
    supuestos_simulacion: [...SUPUESTOS_VARIACION_AEREO_TOTAL],
    cobertura: {
      presentes: presentes.length,
      universo_calculo: presentes.length - fueraUniverso,
      simulacion_exploratoria: simulaciones,
      no_estimable: noEstimables,
      motivos,
    },
    /** Sin total: las simulaciones experimentales no se suman. */
    total: null,
  };
}
