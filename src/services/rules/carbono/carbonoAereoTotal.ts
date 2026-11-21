/**
 * Carbono aéreo TOTAL (tallo, ramas, ramillas y hojas; sin raíces) con
 * modelos de carbono directo (autorización de la responsable, 2026-11-21;
 * Cruz et al. 2015 para Quillaja saponaria y Cryptocarya alba).
 *
 * Indicador separado del carbono aéreo leñoso (calculo.ts, CC-069 v1): otro
 * componente, otra cadena de cálculo. Nunca se suman. Los modelos son
 * exploratorios: sus resultados se muestran rotulados y no suman a ningún
 * total oficial. Pendiente de sincronización con el Excel maestro
 * (docs/plan/propuestas/carbono-directo-discrepancia-excel.md).
 *
 * Cadena: C (kg) = a · DAP(cm)^b, tal como lo entrega la ecuación; CO₂e =
 * C × 44/12. Sin densidad ni fracción de carbono: la ecuación ya las
 * incorpora. No alimenta el secuestro anual (decisión del 2026-11-21).
 */
import { claveEspecie } from "../indicadores/especies";
import {
  ArbolCarbono,
  CATEGORIA_DE_MOTIVO,
  CategoriaSinCarbono,
  comprobarRequisitosComunes,
  dentro,
  fmt,
  MotivoSinCarbono,
  sinResultado,
  SinResultado,
} from "./calculo";
import { FACTOR_CO2_POR_C, LIMITACIONES_AEREO_TOTAL, ModeloCarbonoDirecto, seleccionarModelos } from "./modelos";

export interface CarbonoAereoTotalArbol {
  carbono_kg: number;
  co2e_kg: number;
  componente: { codigo: "aerea_total"; incluye: string[]; excluye: string[] };
  modelo: {
    id: string;
    version: number;
    tipo: "carbono_directo";
    variante: "dap";
    componente: "aerea_total";
    fuente: string;
    doi: string;
    ecuacion: { forma: "C = a·D^b"; a: number; b: number; unidad_carbono: "kg"; unidad_dap: "cm" };
    rango: { dap_min_cm: number; dap_max_cm: number };
    altura_medicion_dap_m: number;
    n_muestra: number;
    r2: number;
    /** Solo informativa: la ecuación ya la incorpora y no se vuelve a aplicar. */
    fraccion_carbono_fuente: number;
    confianza: ModeloCarbonoDirecto["confianza"];
    estado: ModeloCarbonoDirecto["estado"];
    especie_ecuacion: string;
    fuente_rango: string;
    limitaciones_modelo: string[];
  };
  entradas: { dap_cm: number };
}

export type ResultadoAereoTotal = { valor: CarbonoAereoTotalArbol; categoria: null; motivo: null; detalle: null } | SinResultado;

export function calcularCarbonoAereoTotalArbol(a: ArbolCarbono): ResultadoAereoTotal {
  const clave = claveEspecie(a.especie_cientifica);
  const modelos = seleccionarModelos("aerea_total", clave);
  const requisito = comprobarRequisitosComunes(a, clave, modelos.length > 0, {
    sinModelo: "No hay un modelo de carbono aéreo total para esta especie.",
    multifustal:
      "La fuente no demuestra que el DAP equivalente de un multifustal pueda sustituir el DAP con que se ajustó la ecuación: los multifustales no se estiman.",
  });
  if (requisito) return requisito;
  if (a.dap_cm === null) return sinResultado("falta_dap", "Falta el DAP.");
  const modelo = modelos.find((m) => m.variante === "dap");
  if (!modelo) return sinResultado("sin_modelo", "No hay una variante del modelo para los datos disponibles.");

  if (!dentro(a.dap_cm, modelo.dap_min_cm, modelo.dap_max_cm)) {
    return sinResultado("fuera_de_rango", `DAP ${fmt(a.dap_cm)} cm fuera del rango del modelo (${fmt(modelo.dap_min_cm)}-${fmt(modelo.dap_max_cm)} cm).`);
  }

  const carbono = modelo.a * a.dap_cm ** modelo.b;
  const co2e = carbono * FACTOR_CO2_POR_C;
  if (![carbono, co2e].every((v) => Number.isFinite(v) && v > 0)) {
    return sinResultado("resultado_invalido", "El cálculo no dio un valor finito y positivo.");
  }
  return {
    valor: {
      carbono_kg: carbono,
      co2e_kg: co2e,
      componente: { codigo: "aerea_total", incluye: [...modelo.incluye], excluye: [...modelo.excluye] },
      modelo: {
        id: modelo.id,
        version: modelo.version,
        tipo: modelo.tipo,
        variante: modelo.variante,
        componente: modelo.componente,
        fuente: modelo.fuente,
        doi: modelo.doi,
        ecuacion: { forma: "C = a·D^b", a: modelo.a, b: modelo.b, unidad_carbono: "kg", unidad_dap: "cm" },
        rango: { dap_min_cm: modelo.dap_min_cm, dap_max_cm: modelo.dap_max_cm },
        altura_medicion_dap_m: modelo.altura_medicion_dap_m,
        n_muestra: modelo.n_muestra,
        r2: modelo.r2,
        fraccion_carbono_fuente: modelo.fraccion_carbono_fuente,
        confianza: modelo.confianza,
        estado: modelo.estado,
        especie_ecuacion: modelo.especie_ecuacion,
        fuente_rango: modelo.fuente_rango,
        limitaciones_modelo: [...modelo.limitaciones_modelo],
      },
      entradas: { dap_cm: a.dap_cm },
    },
    categoria: null,
    motivo: null,
    detalle: null,
  };
}

/** Descriptor del método, para la trazabilidad de cada respuesta. */
export const METODO_CARBONO_AEREO_TOTAL = {
  version: "carbono directo v1 (2026-11-21)",
  estado_cc: "autorizado por la responsable para desarrollo; pendiente de sincronización con el Excel maestro",
  componente: "aerea_total",
  incluye: ["tallo", "ramas", "ramillas", "hojas"],
  excluye: ["raíces"],
  factor_co2: "44/12",
  aplica_densidad: false,
  aplica_fraccion_carbono: false,
  incluye_raices: false,
  incluye_follaje: true,
  alimenta_secuestro_anual: false,
} as const;

const MOTIVOS = Object.keys(CATEGORIA_DE_MOTIVO) as MotivoSinCarbono[];
const CATEGORIAS: readonly CategoriaSinCarbono[] = ["fuera_del_universo", "restriccion_modelo", "dato_faltante_o_inconsistente", "error_calculo"];

/**
 * Agregado del ámbito, separado del carbono aéreo leñoso. Solo los modelos
 * aprobados sumarían al total; hoy todos son exploratorios, así que el total
 * es null y solo se informa la cobertura (sin total oficial).
 */
export function agregarCarbonoAereoTotal(arboles: ArbolCarbono[]) {
  const presentes = arboles.filter((a) => a.presente);
  const universo = presentes.filter((a) => a.evaluacion_completa_vigente);
  const motivos = Object.fromEntries(MOTIVOS.map((m) => [m, 0])) as Record<MotivoSinCarbono, number>;
  const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<CategoriaSinCarbono, number>;
  const porModelo: Record<string, number> = {};
  let carbono = 0;
  let co2e = 0;
  let conResultado = 0;
  let conResultadoExploratorio = 0;
  for (const a of presentes) {
    const r = calcularCarbonoAereoTotalArbol(a);
    if (r.valor === null) {
      motivos[r.motivo]++;
      porCategoria[r.categoria]++;
      continue;
    }
    porModelo[r.valor.modelo.id] = (porModelo[r.valor.modelo.id] ?? 0) + 1;
    if (r.valor.modelo.estado === "exploratorio") {
      conResultadoExploratorio++;
      continue;
    }
    conResultado++;
    carbono += r.valor.carbono_kg;
    co2e += r.valor.co2e_kg;
  }
  const hay = conResultado > 0;
  return {
    indicador: "estimacion_carbono_aereo_total" as const,
    metodo: METODO_CARBONO_AEREO_TOTAL,
    limitaciones: [...LIMITACIONES_AEREO_TOTAL],
    cobertura: {
      presentes: presentes.length,
      universo_calculo: universo.length,
      /** Resultados con modelo aprobado: los únicos que sumarían al total. */
      con_resultado: conResultado,
      /** Resultados con modelo exploratorio: se muestran rotulados en la ficha y no suman. */
      con_resultado_exploratorio: conResultadoExploratorio,
      por_modelo: porModelo,
      por_categoria: porCategoria,
      motivos,
    },
    total: {
      carbono_t: hay ? carbono / 1000 : null,
      co2e_t: hay ? co2e / 1000 : null,
    },
  };
}
