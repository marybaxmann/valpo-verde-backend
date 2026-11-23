/**
 * Estimación integrada del carbono almacenado por árbol (propuesta experimental,
 * Valej 2026-11-22). NO es metodología vigente ni reemplaza los indicadores
 * publicados: reúne, para cada árbol, el mejor modelo disponible según la
 * jerarquía especie → género → grupo funcional → general, y separa siempre:
 *
 * - carbono AÉREO (con el componente que estima cada modelo: «aerea_lenosa»,
 *   tronco y ramas; o «aerea_total», con hojas), y
 * - carbono TOTAL (aéreo + subterráneo), solo cuando la fuente lo publica como
 *   biomasa total del árbol. Nunca se agregan raíces con un factor propio.
 *
 * Reutiliza sin duplicar: `calcularCarbonoArbol` (volumen × densidad × 0,47)
 * y `calcularCarbonoAereoTotalArbol` (carbono directo, Cruz et al. 2015).
 * Agrega los modelos de biomasa de este archivo. Solo los modelos «aprobado»
 * suman al total oficial; todo lo demás es exploratorio y se informa aparte.
 *
 * CO₂e = C × 44/12. Es carbono ALMACENADO, no captura anual.
 */
import { claveEspecie } from "../indicadores/especies";
import { ArbolCarbono, calcularCarbonoArbol, dentro, fmt } from "./calculo";
import { calcularCarbonoAereoTotalArbol } from "./carbonoAereoTotal";
import { FACTOR_CO2_POR_C, seleccionarModelos } from "./modelos";

export type EstadoResultado = "aprobado" | "exploratorio" | "no_estimable";

/** Modelo de BIOMASA seca (kg) publicado como ecuación alométrica. */
export interface ModeloBiomasa {
  id: string;
  version: number;
  /** Clave de especie de B19 a la que se aplica (claveEspecie). */
  especie: string;
  especie_ecuacion: string;
  /** «total»: árbol completo (aéreo + raíces); «aerea_total»: tallo, ramas y hojas. */
  componente: "total" | "aerea_total";
  incluye: readonly string[];
  forma: string;
  variables: readonly ("dap_cm" | "altura_total_m")[];
  biomasa: (dapCm: number, alturaM: number | null) => number;
  fraccion_carbono: { valor: number; fuente: string };
  confianza: "propia_urbana" | "sustituta_mismo_genero";
  estado: "exploratorio";
  /** Rango de calibración publicado; null si la fuente no lo informa en el texto revisado. */
  dap_min_cm: number | null;
  dap_max_cm: number | null;
  n_muestra: number | null;
  fuente: string;
  doi: string;
  advertencias: readonly string[];
  /** «comparacion»: se calcula y se informa, pero no se elige como resultado del árbol. */
  uso: "resultado" | "comparacion";
}

const FUENTE_ZHANG_2026 =
  "Zhang, R., Wang, L., Tian, X. y Song, Y. (2026). Carbon budget of common urban tree species in an arid city based on life cycle assessment. PLoS ONE 21(4): e0345213 (Métodos: ecuaciones por especie W = a(D²H)^b; W biomasa total en kg, D en cm, H en m; CF = 0,5)";
const DOI_ZHANG_2026 = "https://doi.org/10.1371/journal.pone.0345213";
const ADV_ZHANG = [
  "Ecuación urbana ajustada en Shihezi (Xinjiang, China), clima continental árido; su transferencia a Valparaíso (mediterráneo costero) no está validada.",
  "Biomasa TOTAL: la fuente agregó las raíces con las razones raíz/tallo del IPCC antes de ajustar la ecuación. No se agregan raíces otra vez.",
  "El rango de DAP y altura de la muestra (~30 árboles por especie, 10 clases de edad) está en la tabla S2, que no se pudo revisar: el rango no se controla.",
] as const;

const FUENTE_LIU_LI_2012 =
  "Liu, C. y Li, X. (2012). Carbon storage and sequestration by urban forests in Shenyang, China. Urban Forestry & Urban Greening 11: 121-128; ecuaciones de Ulmus según Wang et al. (2022), Forests 13(11): 1805, tabla A1 (B_fuste = 0,044·D^2,87; B_ramas = 0,0075·D^2,67; B_hojas = 0,0029·D^2,50)";
const DOI_CHANGCHUN_2022 = "https://doi.org/10.3390/f13111805";

export const MODELOS_BIOMASA: readonly ModeloBiomasa[] = [
  {
    id: "ZHANG26-ACNE-DDH",
    version: 1,
    especie: "acer negundo",
    especie_ecuacion: "acer negundo",
    componente: "total",
    incluye: ["fuste", "ramas", "hojas", "raíces (razón IPCC en la fuente)"],
    forma: "W = 0,499·(D²·H)^0,774",
    variables: ["dap_cm", "altura_total_m"],
    biomasa: (d, h) => 0.499 * (d * d * (h as number)) ** 0.774,
    fraccion_carbono: { valor: 0.5, fuente: "Zhang et al. 2026 (CF = 0,5 por defecto)" },
    confianza: "propia_urbana",
    estado: "exploratorio",
    dap_min_cm: null,
    dap_max_cm: null,
    n_muestra: 30,
    fuente: FUENTE_ZHANG_2026,
    doi: DOI_ZHANG_2026,
    advertencias: ADV_ZHANG,
    uso: "resultado",
  },
  {
    id: "ZHANG26-ULPU-DDH-ULMI",
    version: 1,
    especie: "ulmus minor",
    especie_ecuacion: "ulmus pumila",
    componente: "total",
    incluye: ["fuste", "ramas", "hojas", "raíces (razón IPCC en la fuente)"],
    forma: "W = 0,101·(D²·H)^0,935",
    variables: ["dap_cm", "altura_total_m"],
    biomasa: (d, h) => 0.101 * (d * d * (h as number)) ** 0.935,
    fraccion_carbono: { valor: 0.5, fuente: "Zhang et al. 2026 (CF = 0,5 por defecto)" },
    confianza: "sustituta_mismo_genero",
    estado: "exploratorio",
    dap_min_cm: null,
    dap_max_cm: null,
    n_muestra: 30,
    fuente: FUENTE_ZHANG_2026,
    doi: DOI_ZHANG_2026,
    advertencias: ["Ecuación de otra especie del mismo género (Ulmus pumila), no de Ulmus minor.", ...ADV_ZHANG],
    uso: "resultado",
  },
  {
    id: "LIULI12-ULMUS-D-ULMI",
    version: 1,
    especie: "ulmus minor",
    especie_ecuacion: "Ulmus (género)",
    componente: "aerea_total",
    incluye: ["fuste", "ramas", "hojas"],
    forma: "B = 0,044·D^2,87 + 0,0075·D^2,67 + 0,0029·D^2,50",
    variables: ["dap_cm"],
    biomasa: (d) => 0.044 * d ** 2.87 + 0.0075 * d ** 2.67 + 0.0029 * d ** 2.5,
    fraccion_carbono: { valor: 0.5, fuente: "Valor por defecto 0,5 (pedido de Valej, 2026-11-22); la fuente no lo informa" },
    confianza: "sustituta_mismo_genero",
    estado: "exploratorio",
    dap_min_cm: null,
    dap_max_cm: null,
    n_muestra: null,
    fuente: FUENTE_LIU_LI_2012,
    doi: DOI_CHANGCHUN_2022,
    advertencias: [
      "Ecuación del género Ulmus (noreste de China), no de Ulmus minor; solo usa el DAP, sin altura.",
      "Wang et al. 2022 multiplican la biomasa urbana por 0,8 por la poda; SIVU no aplica ese factor.",
      "La fuente revisada no publica el rango de DAP: el rango no se controla.",
    ],
    uso: "comparacion",
  },
];

/** Especies sin ningún modelo defendible y motivo (2026-11-22). */
export const PENDIENTES_POR_ESPECIE: Readonly<Record<string, string>> = {
  "phoenix canariensis":
    "Palmera: no hay una ecuación de Phoenix canariensis verificada. La única revisada (Frangi y Lugo 1985, en Brown 1997) se ajustó con Prestoea montana, una palmera de tronco delgado; transferirla a una palmera canaria subestimaría su biomasa.",
  "beilschmiedia miersii":
    "Sin densidad de madera publicada (UTD tabla 11; GWDD v1 y v2.2) ni una ecuación de biomasa de la especie, del género o de un grupo funcional compatible verificada.",
  "araucaria heterophylla":
    "Sin densidad de madera publicada (UTD tabla 11; GWDD v1 y v2.2) ni una ecuación de biomasa de la especie o del género verificada.",
};

export interface Componente {
  biomasa_kg: number | null;
  carbono_kg: number;
  co2e_kg: number;
  componente: "aerea_lenosa" | "aerea_total" | "total";
  incluye: string[];
  modelo: {
    id: string;
    version: number;
    forma: string;
    fuente: string;
    especie_ecuacion: string;
    confianza: string;
    estado: "aprobado" | "exploratorio";
    fraccion_carbono: number | null;
  };
  variables: Record<string, number>;
  advertencias: string[];
}

export interface CarbonoIntegradoArbol {
  tree_id: string;
  tree_code: string | null;
  especie: string | null;
  estado: EstadoResultado;
  aereo: Componente | null;
  total: Componente | null;
  comparacion: Componente[];
  motivo: string | null;
  fecha_calculo: string;
}

function deBiomasa(m: ModeloBiomasa, dap: number, altura: number | null): Componente | { error: string } {
  if (m.variables.includes("altura_total_m") && altura === null) return { error: "Falta la altura total, que la ecuación necesita." };
  const advertencias = [...m.advertencias];
  if (m.dap_min_cm !== null && m.dap_max_cm !== null && !dentro(dap, m.dap_min_cm, m.dap_max_cm)) {
    return { error: `DAP ${fmt(dap)} cm fuera del rango del modelo (${fmt(m.dap_min_cm)}-${fmt(m.dap_max_cm)} cm).` };
  }
  const biomasa = m.biomasa(dap, altura);
  const carbono = biomasa * m.fraccion_carbono.valor;
  if (![biomasa, carbono].every((v) => Number.isFinite(v) && v > 0)) return { error: "El cálculo no dio un valor finito y positivo." };
  const variables: Record<string, number> = { dap_cm: dap };
  if (m.variables.includes("altura_total_m")) variables.altura_total_m = altura as number;
  return {
    biomasa_kg: biomasa,
    carbono_kg: carbono,
    co2e_kg: carbono * FACTOR_CO2_POR_C,
    componente: m.componente,
    incluye: [...m.incluye],
    modelo: {
      id: m.id,
      version: m.version,
      forma: m.forma,
      fuente: `${m.fuente}. ${m.doi}`,
      especie_ecuacion: m.especie_ecuacion,
      confianza: m.confianza,
      estado: m.estado,
      fraccion_carbono: m.fraccion_carbono.valor,
    },
    variables,
    advertencias,
  };
}

/**
 * Multifustal con un modelo de carbono directo de Cruz et al. 2015: la fuente
 * ajustó los modelos POR VÁSTAGO («cada vástago de la muestra contiene la
 * proporción de biomasa de su cepa… bastaría medir todos los vástagos», p. 379),
 * así que el carbono del árbol es la suma de cada fuste medido (D-18 por fuste).
 * Cada fuste debe estar dentro del rango de DAP del modelo.
 */
function porVastago(a: ArbolCarbono, clave: string): Componente | null {
  const modelo = seleccionarModelos("aerea_total", clave).find((m) => m.variante === "dap");
  const fustes = (a.dap_fustes_cm ?? []).filter((d) => Number.isFinite(d) && d > 0);
  if (!modelo || fustes.length < 2 || !fustes.every((d) => dentro(d, modelo.dap_min_cm, modelo.dap_max_cm))) return null;
  const carbono = fustes.reduce((s, d) => s + modelo.a * d ** modelo.b, 0);
  if (!(Number.isFinite(carbono) && carbono > 0)) return null;
  return {
    biomasa_kg: null,
    carbono_kg: carbono,
    co2e_kg: carbono * FACTOR_CO2_POR_C,
    componente: "aerea_total",
    incluye: [...modelo.incluye],
    modelo: {
      id: `${modelo.id}-VASTAGOS`,
      version: modelo.version,
      forma: `C = Σ ${modelo.a}·dᵢ^${modelo.b} por vástago (kg C)`,
      fuente: `${modelo.fuente}. ${modelo.doi}`,
      especie_ecuacion: modelo.especie_ecuacion,
      confianza: modelo.confianza,
      estado: modelo.estado,
      fraccion_carbono: null,
    },
    variables: Object.fromEntries(fustes.map((d, i) => [`dap_fuste_${i + 1}_cm`, d])),
    advertencias: [...modelo.limitaciones_modelo.filter((l) => !l.startsWith("Solo árboles de un fuste")), "Multifustal: suma del modelo aplicado a cada vástago, como lo ajustó la fuente."],
  };
}

/** Carbono de un árbol con todos los modelos aplicables, sin sumar componentes distintos. */
export function calcularCarbonoIntegradoArbol(a: ArbolCarbono & { tree_code?: string | null }, fecha: string): CarbonoIntegradoArbol {
  const clave = claveEspecie(a.especie_cientifica);
  const base = { tree_id: a.id, tree_code: a.tree_code ?? null, especie: clave, comparacion: [] as Componente[], fecha_calculo: fecha };
  const pendiente = (motivo: string): CarbonoIntegradoArbol => ({ ...base, estado: "no_estimable", aereo: null, total: null, motivo });

  if (!a.presente) return pendiente("El árbol no está presente.");
  if (!a.evaluacion_completa_vigente) return pendiente("Sin evaluación completa vigente: no tiene DAP ni altura vigentes.");
  if (clave === null) return pendiente("Especie no identificada: no se puede elegir un modelo.");
  if (a.tipo_hoja === "palmera" || PENDIENTES_POR_ESPECIE[clave]) {
    return pendiente(PENDIENTES_POR_ESPECIE[clave] ?? "Palmera: sin un modelo de palmeras verificado.");
  }

  // 1) Aéreo: carbono directo de la especie (con hojas) o volumen × densidad (leñoso).
  let aereo: Componente | null = null;
  let motivoAereo: string | null = null;
  const directo = calcularCarbonoAereoTotalArbol(a);
  if (directo.valor) {
    const v = directo.valor;
    aereo = {
      biomasa_kg: null,
      carbono_kg: v.carbono_kg,
      co2e_kg: v.co2e_kg,
      componente: "aerea_total",
      incluye: v.componente.incluye,
      modelo: {
        id: v.modelo.id,
        version: v.modelo.version,
        forma: `C = ${v.modelo.ecuacion.a}·D^${v.modelo.ecuacion.b} (kg C)`,
        fuente: `${v.modelo.fuente}. ${v.modelo.doi}`,
        especie_ecuacion: v.modelo.especie_ecuacion,
        confianza: v.modelo.confianza,
        estado: v.modelo.estado,
        fraccion_carbono: null,
      },
      variables: { dap_cm: v.entradas.dap_cm },
      advertencias: v.modelo.limitaciones_modelo,
    };
  } else if (directo.motivo === "multifustal_no_admitido" && (aereo = porVastago(a, clave))) {
    // Cruz et al. 2015 ajustaron el modelo por vástago: el carbono del árbol es la suma de sus vástagos.
  } else {
    const lenoso = calcularCarbonoArbol(a);
    if (lenoso.valor) {
      const v = lenoso.valor;
      const variables: Record<string, number> = { dap_cm: v.entradas.dap_cm, densidad_kg_m3: v.entradas.densidad_kg_m3 };
      if (v.modelo.variante === "dap_altura" && v.entradas.altura_total_m !== null) variables.altura_total_m = v.entradas.altura_total_m;
      aereo = {
        biomasa_kg: v.biomasa_aerea_lenosa_kg,
        carbono_kg: v.carbono_kg,
        co2e_kg: v.co2e_kg,
        componente: "aerea_lenosa",
        incluye: ["tronco", "ramas"],
        modelo: {
          id: v.modelo.id,
          version: v.modelo.version,
          forma: `${v.modelo.ecuacion.forma} (V en m³) × densidad × 0,47`,
          fuente: v.modelo.fuente,
          especie_ecuacion: v.modelo.especie_ecuacion,
          confianza: v.modelo.confianza,
          estado: v.estado_resultado,
          fraccion_carbono: v.entradas.fraccion_carbono,
        },
        variables,
        advertencias: [...v.modelo.limitaciones_modelo, ...(v.tratamiento_multifustal ? ["Multifustal: DAP equivalente de i-Tree Eco (exploratorio)."] : [])],
      };
    } else {
      motivoAereo = lenoso.detalle;
    }
  }

  // 2) Total (aéreo + subterráneo) y comparaciones, con los modelos de biomasa.
  let total: Componente | null = null;
  const comparacion: Componente[] = [];
  const multifustalSinDap = a.multifustal === true;
  for (const m of MODELOS_BIOMASA.filter((x) => x.especie === clave)) {
    if (a.dap_cm === null) break;
    if (multifustalSinDap) continue; // las fuentes no demuestran que el DAP equivalente sirva
    const r = deBiomasa(m, a.dap_cm, a.altura_total_m);
    if ("error" in r) continue;
    if (m.uso === "comparacion") comparacion.push(r);
    else if (m.componente === "total" && total === null) total = r;
  }

  if (!aereo && !total) {
    return { ...pendiente(motivoAereo ?? "No hay un modelo defendible para esta especie."), comparacion };
  }
  const estados = [aereo?.modelo.estado, total?.modelo.estado].filter(Boolean);
  const estado: EstadoResultado = estados.every((e) => e === "aprobado") ? "aprobado" : "exploratorio";
  return { ...base, estado, aereo, total, comparacion, motivo: aereo ? null : `Sin carbono aéreo: ${motivoAereo}` };
}

const suma = (xs: (Componente | null)[]) => xs.reduce((s, c) => s + (c?.carbono_kg ?? 0), 0);

/** Resumen del proyecto: aprobados y exploratorios separados; componentes nunca mezclados sin rótulo. */
export function agregarCarbonoIntegrado(arboles: (ArbolCarbono & { tree_code?: string | null })[], fecha = new Date().toISOString()) {
  const filas = arboles.filter((a) => a.presente).map((a) => calcularCarbonoIntegradoArbol(a, fecha));
  const con = (e: EstadoResultado) => filas.filter((f) => f.estado === e);
  const aereos = filas.filter((f) => f.aereo);
  const totales = filas.filter((f) => f.total);
  const kgAereo = (estado: "aprobado" | "exploratorio") => suma(aereos.filter((f) => f.aereo!.modelo.estado === estado).map((f) => f.aereo));
  const pendientes: Record<string, number> = {};
  for (const f of con("no_estimable")) pendientes[f.motivo ?? "—"] = (pendientes[f.motivo ?? "—"] ?? 0) + 1;
  return {
    indicador: "estimacion_carbono_integrada" as const,
    estado_metodologico: "propuesta experimental (Valej, 2026-11-22): no es metodología vigente ni suma a los indicadores publicados",
    fecha_calculo: fecha,
    arboles_presentes: filas.length,
    con_estimacion: filas.length - con("no_estimable").length,
    aprobados: con("aprobado").length,
    exploratorios: con("exploratorio").length,
    no_estimables: con("no_estimable").length,
    aereo: {
      arboles: aereos.length,
      carbono_kg_aprobado: kgAereo("aprobado"),
      carbono_kg_exploratorio: kgAereo("exploratorio"),
      carbono_kg: suma(aereos.map((f) => f.aereo)),
      por_componente: {
        aerea_lenosa: { arboles: aereos.filter((f) => f.aereo!.componente === "aerea_lenosa").length, carbono_kg: suma(aereos.filter((f) => f.aereo!.componente === "aerea_lenosa").map((f) => f.aereo)) },
        aerea_total: { arboles: aereos.filter((f) => f.aereo!.componente === "aerea_total").length, carbono_kg: suma(aereos.filter((f) => f.aereo!.componente === "aerea_total").map((f) => f.aereo)) },
      },
      co2e_kg: suma(aereos.map((f) => f.aereo)) * FACTOR_CO2_POR_C,
    },
    total: {
      arboles: totales.length,
      carbono_kg: suma(totales.map((f) => f.total)),
      co2e_kg: suma(totales.map((f) => f.total)) * FACTOR_CO2_POR_C,
    },
    pendientes,
    arboles: filas,
  };
}
