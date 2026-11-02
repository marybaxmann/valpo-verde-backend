/**
 * Carbono aéreo leñoso (B19; CC-069 v1). Funciones puras. NO conectadas a
 * ningún endpoint todavía (Valej, 2026-11-02).
 *
 * Nunca extrapolan ni rellenan: sin los requisitos del modelo, el resultado
 * es null con su motivo.
 */
import { claveEspecie } from "../indicadores/especies";
import { FACTOR_CO2_POR_C, FRACCION_CARBONO, LIMITACIONES, MODELOS_VOLUMEN, ModeloVolumen } from "./modelos";

export interface ArbolCarbono {
  id: string;
  /** D-28. */
  presente: boolean;
  /**
   * Universo biométrico (habilitacionBiometrica.ts): evaluación completa
   * finalizada, con OT completada, no anulada y vigente. Sin ella el
   * árbol está fuera del universo de cálculo.
   */
  evaluacion_completa_vigente: boolean;
  /** Nombre del catálogo si hay species_id; si no, D-13. */
  especie_cientifica: string | null;
  /** D-262 (catálogo): «palmera» excluye el árbol. */
  tipo_hoja: string | null;
  /** D-15. null = no se sabe si el DAP es directo o equivalente. */
  multifustal: boolean | null;
  /** D-18, medido a 1,30 m. */
  dap_cm: number | null;
  /** D-19. */
  altura_total_m: number | null;
}

/**
 * Categorías (Valej, 2026-11-02): no se agrupan todos como «sin modelo».
 * - fuera_del_universo: el árbol no se calcula (no presente o sin evaluación válida).
 * - restriccion_modelo: «No estimable»: el modelo no se puede aplicar a este árbol.
 * - dato_faltante_o_inconsistente: árbol evaluado al que le falta un dato que el modelo exige.
 * - error_calculo: el cálculo no dio un número válido.
 */
export type CategoriaSinCarbono = "fuera_del_universo" | "restriccion_modelo" | "dato_faltante_o_inconsistente" | "error_calculo";

export const CATEGORIA_DE_MOTIVO = {
  no_presente: "fuera_del_universo",
  sin_evaluacion_valida: "fuera_del_universo",
  sin_modelo: "restriccion_modelo",
  palmera_sin_modelo: "restriccion_modelo",
  multifustal_no_admitido: "restriccion_modelo",
  fuera_de_rango: "restriccion_modelo",
  fuera_de_rango_altura: "restriccion_modelo",
  falta_dap: "dato_faltante_o_inconsistente",
  configuracion_fuste_no_determinada: "dato_faltante_o_inconsistente",
  resultado_invalido: "error_calculo",
} as const satisfies Record<string, CategoriaSinCarbono>;

export type MotivoSinCarbono = keyof typeof CATEGORIA_DE_MOTIVO;

export interface CarbonoArbol {
  volumen_m3: number;
  biomasa_aerea_lenosa_kg: number;
  carbono_kg: number;
  co2e_kg: number;
  /** Trazabilidad completa del modelo aplicado (Valej, 2026-11-02). */
  modelo: {
    id: string;
    version: number;
    variante: ModeloVolumen["variante"];
    componente: "aerea_lenosa";
    /** Publicación científica, tabla y ecuación, y origen de los coeficientes métricos. */
    fuente: string;
    ecuacion: { forma: "V = a·D^b·H^c" | "V = a·D^b"; a: number; b: number; c: number; unidad_volumen: "m3"; unidad_dap: "cm"; unidad_altura: "m" };
    /** Rango de validez aplicado: la altura solo en la variante con altura. Límites incluidos. */
    rango: { dap_min_cm: number; dap_max_cm: number; altura_min_m: number | null; altura_max_m: number | null };
    densidad: ModeloVolumen["densidad"];
    n_muestra: number;
  };
  entradas: { dap_cm: number; altura_total_m: number | null; densidad_kg_m3: number; fraccion_carbono: number };
}

export type ResultadoArbol =
  | { valor: CarbonoArbol; categoria: null; motivo: null; detalle: null }
  | { valor: null; categoria: CategoriaSinCarbono; motivo: MotivoSinCarbono; detalle: string };

const sinResultado = (motivo: MotivoSinCarbono, detalle: string): ResultadoArbol => ({
  valor: null,
  categoria: CATEGORIA_DE_MOTIVO[motivo],
  motivo,
  detalle,
});
const dentro = (x: number, min: number, max: number) => x >= min && x <= max;
const fmt = (x: number) => x.toFixed(4).replace(/\.?0+$/, "");

/** Calcula un árbol, empezando por su pertenencia al universo de cálculo. */
export function calcularCarbonoArbol(a: ArbolCarbono): ResultadoArbol {
  if (!a.presente) return sinResultado("no_presente", "El árbol no está presente (D-28).");
  if (!a.evaluacion_completa_vigente) {
    return sinResultado("sin_evaluacion_valida", "El árbol no tiene una evaluación completa válida y vigente: queda fuera del universo de cálculo.");
  }
  const clave = claveEspecie(a.especie_cientifica);
  const modelos = clave === null ? [] : MODELOS_VOLUMEN.filter((m) => m.especie === clave);
  if (modelos.length === 0) {
    return sinResultado("sin_modelo", clave === null ? "Especie no determinada a nivel específico." : "No hay un modelo aprobado para esta especie.");
  }
  if (a.tipo_hoja === "palmera") return sinResultado("palmera_sin_modelo", "Las palmeras no tienen modelo aprobado.");
  if (a.multifustal === true) {
    return sinResultado("multifustal_no_admitido", "El modelo se ajustó con árboles de un fuste a la altura del DAP; los multifustales no se estiman.");
  }
  if (a.multifustal === null) {
    return sinResultado(
      "configuracion_fuste_no_determinada",
      "No está registrado si el árbol es multifustal (D-15): el DAP podría ser un diámetro equivalente y no la medición directa de un fuste."
    );
  }
  if (a.dap_cm === null) return sinResultado("falta_dap", "Falta el DAP.");

  const conAltura = a.altura_total_m !== null;
  const modelo = modelos.find((m) => m.variante === (conAltura ? "dap_altura" : "dap"));
  if (!modelo) return sinResultado("sin_modelo", "No hay una variante del modelo para los datos disponibles.");

  if (!dentro(a.dap_cm, modelo.dap_min_cm, modelo.dap_max_cm)) {
    return sinResultado("fuera_de_rango", `DAP ${fmt(a.dap_cm)} cm fuera del rango del modelo (${fmt(modelo.dap_min_cm)}-${fmt(modelo.dap_max_cm)} cm).`);
  }
  if (conAltura && !dentro(a.altura_total_m!, modelo.altura_min_m, modelo.altura_max_m)) {
    return sinResultado(
      "fuera_de_rango_altura",
      `Altura ${fmt(a.altura_total_m!)} m fuera del rango del modelo (${fmt(modelo.altura_min_m)}-${fmt(modelo.altura_max_m)} m).`
    );
  }

  const volumen = modelo.a * a.dap_cm ** modelo.b * (conAltura ? a.altura_total_m! ** modelo.c : 1);
  const biomasa = volumen * modelo.densidad.valor;
  const carbono = biomasa * FRACCION_CARBONO.valor;
  const co2e = carbono * FACTOR_CO2_POR_C;
  if (![volumen, biomasa, carbono, co2e].every((v) => Number.isFinite(v) && v > 0)) {
    return sinResultado("resultado_invalido", "El cálculo no dio un valor finito y positivo.");
  }
  return {
    valor: {
      volumen_m3: volumen,
      biomasa_aerea_lenosa_kg: biomasa,
      carbono_kg: carbono,
      co2e_kg: co2e,
      modelo: {
        id: modelo.id,
        version: modelo.version,
        variante: modelo.variante,
        componente: modelo.componente,
        fuente: modelo.fuente,
        ecuacion: {
          forma: modelo.variante === "dap_altura" ? "V = a·D^b·H^c" : "V = a·D^b",
          a: modelo.a,
          b: modelo.b,
          c: modelo.c,
          unidad_volumen: "m3",
          unidad_dap: "cm",
          unidad_altura: "m",
        },
        rango: {
          dap_min_cm: modelo.dap_min_cm,
          dap_max_cm: modelo.dap_max_cm,
          altura_min_m: modelo.variante === "dap_altura" ? modelo.altura_min_m : null,
          altura_max_m: modelo.variante === "dap_altura" ? modelo.altura_max_m : null,
        },
        densidad: { ...modelo.densidad },
        n_muestra: modelo.n_muestra,
      },
      entradas: { dap_cm: a.dap_cm, altura_total_m: conAltura ? a.altura_total_m : null, densidad_kg_m3: modelo.densidad.valor, fraccion_carbono: FRACCION_CARBONO.valor },
    },
    categoria: null,
    motivo: null,
    detalle: null,
  };
}

/**
 * Descriptor del método, para la trazabilidad de cada respuesta. CC-069
 * está aprobado como propuesta y PENDIENTE de sincronización con el Excel
 * maestro: su integración en desarrollo es una excepción documentada
 * (Valej, 2026-11-02).
 */
export const METODO_CARBONO = {
  version: "CC-069 v1",
  estado_cc: "aprobado como propuesta; pendiente de sincronización con el Excel maestro",
  fraccion_carbono: FRACCION_CARBONO.valor,
  fuente_fraccion_carbono: FRACCION_CARBONO.fuente,
  factor_co2: "44/12",
  incluye_raices: false,
  incluye_follaje: false,
  factor_urbano: null,
} as const;

const MOTIVOS = Object.keys(CATEGORIA_DE_MOTIVO) as MotivoSinCarbono[];
const CATEGORIAS: readonly CategoriaSinCarbono[] = ["fuera_del_universo", "restriccion_modelo", "dato_faltante_o_inconsistente", "error_calculo"];

/**
 * Agregado del ámbito. Universo de cálculo = presentes con evaluación
 * completa válida y vigente. Suma solo resultados válidos; sin ninguno,
 * totales null (no 0). Cada árbol queda en una sola categoría y motivo.
 */
export function agregarCarbono(arboles: ArbolCarbono[]) {
  const presentes = arboles.filter((a) => a.presente);
  const universo = presentes.filter((a) => a.evaluacion_completa_vigente);
  const motivos = Object.fromEntries(MOTIVOS.map((m) => [m, 0])) as Record<MotivoSinCarbono, number>;
  const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<CategoriaSinCarbono, number>;
  let biomasa = 0;
  let carbono = 0;
  let co2e = 0;
  let conResultado = 0;
  for (const a of presentes) {
    const r = calcularCarbonoArbol(a);
    if (r.valor === null) {
      motivos[r.motivo]++;
      porCategoria[r.categoria]++;
      continue;
    }
    conResultado++;
    biomasa += r.valor.biomasa_aerea_lenosa_kg;
    carbono += r.valor.carbono_kg;
    co2e += r.valor.co2e_kg;
  }
  const hay = conResultado > 0;
  return {
    indicador: "estimacion_carbono_aereo_lenoso" as const,
    metodo: METODO_CARBONO,
    limitaciones: [...LIMITACIONES],
    cobertura: {
      presentes: presentes.length,
      universo_calculo: universo.length,
      con_resultado: conResultado,
      por_categoria: porCategoria,
      motivos,
    },
    total: {
      biomasa_aerea_lenosa_t: hay ? biomasa / 1000 : null,
      carbono_t: hay ? carbono / 1000 : null,
      co2e_t: hay ? co2e / 1000 : null,
    },
  };
}
