/**
 * Carbono aéreo leñoso (B19; CC-069 v1, aprobado como propuesta por Valej).
 * Catálogo de modelos APTO. Fuente metodológica pendiente: hoja de modelos
 * del Excel maestro; mientras no exista, este archivo es la única copia y
 * NO está conectado a ningún endpoint.
 *
 * Ecuaciones: Pillsbury, N. H.; Reimer, J. L.; Thompson, R. P. 1998. Tree
 * volume equations for fifteen urban species in California. Urban Forest
 * Ecosystems Institute, Cal Poly (tablas 6, 7 y 8; unidades imperiales).
 * Coeficientes MÉTRICOS de la Urban Tree Database (McPherson, van Doorn y
 * Peper 2016, RDS-2016-0005, TS7; recopilados en PSW-GTR-253): D en cm, H
 * en m, V en m³ por árbol. Nunca se combinan con los imperiales.
 *
 * Volumen: exterior a la corteza; tronco y ramas (segmentos terminales
 * modelados desde ~4 pulgadas hasta la punta); sin raíces ni follaje.
 * Densidad: masa seca / volumen verde de la madera (TS9). Aproximación
 * documentada: se aplica la densidad de la madera al volumen con corteza,
 * sin factor de corrección (no hay uno publicado para estas especies).
 *
 * CC-070 (opción C2, Valej 2026-11-02): *Acer pseudoplatanus* usa, como
 * sustituta del mismo género, la ecuación de *Acer platanoides* de McHale
 * et al. 2009 (tabla 1; solo DAP) con la densidad básica de la propia
 * especie (Sedlar et al. 2021). Referencias y aplicación completas en
 * docs/metodologia/carbono-referencias.md.
 */

export const FRACCION_CARBONO = {
  valor: 0.47,
  fuente: "IPCC 2006, Guidelines for National Greenhouse Gas Inventories, Vol. 4, cap. 4, tabla 4.3 (valor por defecto; no es específico de cada especie)",
} as const;

/** Razón de masas molares CO₂ / C. */
export const FACTOR_CO2_POR_C = 44 / 12;

/**
 * Nivel de confianza por el ORIGEN de la ecuación (CC-069 decisión 1; CC-070;
 * 2026-11-21): «propia_urbana», ecuación urbana de la misma especie;
 * «sustituta_mismo_genero», ecuación de otra especie del mismo género;
 * «propia_no_urbana», ecuación de la misma especie ajustada fuera de la
 * ciudad. Es independiente del estado metodológico en SIVU (aprobado o
 * exploratorio).
 */
export type NivelConfianza = "propia_urbana" | "sustituta_mismo_genero" | "propia_no_urbana";

/** Estado metodológico del modelo en SIVU: solo «aprobado» suma a los totales. */
export type EstadoModelo = "aprobado" | "exploratorio";

/**
 * Componente de carbono que estima un modelo (2026-11-21). Cada indicador
 * agrega un solo componente y nunca se suman entre sí:
 * - aerea_lenosa: tronco y ramas, sin follaje ni raíces (CC-069 v1).
 * - aerea_total: tallo, ramas, ramillas y hojas, sin raíces.
 */
export type ComponenteCarbono = "aerea_lenosa" | "aerea_total";

export interface ModeloVolumen {
  id: string;
  version: number;
  /** Clave de especie de B19 (claveEspecie): género y epíteto en minúsculas. */
  especie: string;
  variante: "dap_altura" | "dap";
  /** V = a · D^b · H^c (c = 0 en la variante solo DAP). */
  a: number;
  b: number;
  c: number;
  componente: "aerea_lenosa";
  /**
   * Rangos de la muestra (Pillsbury 1998, tabla 8), convertidos exactos (1 in = 2,54 cm; 1 ft = 0,3048 m)
   * y escritos como literales: multiplicar en coma flotante deja, p. ej., 22,5 × 0,3048 = 6,8580000000000005
   * y excluiría el límite. Límites incluidos.
   */
  dap_min_cm: number;
  dap_max_cm: number;
  /**
   * Solo se controla en la variante con altura; null en un modelo que solo
   * tiene variante con DAP, o cuando la fuente no publica el rango de altura
   * (entonces la altura no se controla y el resultado lo advierte).
   */
  altura_min_m: number | null;
  altura_max_m: number | null;
  densidad: { valor: number; unidad: "kg/m3"; tipo: "masa seca / volumen verde"; fuente: string; version: string };
  /** Árboles de la especie en la muestra; null si la publicación no lo informa por especie. */
  n_muestra: number | null;
  /**
   * Nivel de confianza (CC-069 decisión 1; CC-070): «propia_urbana», ecuación
   * urbana ajustada para la misma especie; «sustituta_mismo_genero»,
   * ecuación de otra especie del mismo género (estimación indirecta).
   */
  confianza: Extract<NivelConfianza, "propia_urbana" | "sustituta_mismo_genero">;
  /**
   * «aprobado»: aprobado por la responsable de la metodología (CC-069,
   * CC-070); sus resultados suman al total. «exploratorio» (2026-11-20):
   * incorporado para ampliar la cobertura con carácter exploratorio; sus
   * resultados se muestran rotulados y NUNCA suman a los totales.
   */
  estado: EstadoModelo;
  /** Especie con la que se ajustó la ecuación (igual a `especie` si es propia). */
  especie_ecuacion: string;
  /** Fuente del rango de DAP (y de altura) aplicado. */
  fuente_rango: string;
  /** Limitaciones propias de este modelo, además de las generales (LIMITACIONES). */
  limitaciones_modelo: readonly string[];
  admite_multifustal: false;
  apto_palmeras: false;
  fuente: string;
}

const UTD_TS9 = "USDA Urban Tree Database, TS9 (McPherson, van Doorn y Peper 2016, RDS-2016-0005)";
const UTD_VERSION = "2020-01-21";
const FUENTE_JAME_DH = "Pillsbury, Reimer y Thompson 1998, tabla 7, ec. 29; coeficientes métricos UTD TS7 / PSW-GTR-253";
const FUENTE_JAME_D = "Pillsbury, Reimer y Thompson 1998, tabla 6, ec. 14; coeficientes métricos UTD TS7 / PSW-GTR-253";
const FUENTE_LIST_DH = "Pillsbury, Reimer y Thompson 1998, tabla 7, ec. 30; coeficientes métricos UTD TS7 / PSW-GTR-253";
const FUENTE_LIST_D = "Pillsbury, Reimer y Thompson 1998, tabla 6, ec. 15; coeficientes métricos UTD TS7 / PSW-GTR-253";

const RANGO_PILLSBURY = "Pillsbury, Reimer y Thompson 1998, tabla 8 (convertido de pulgadas y pies)";
const LIMITACIONES_PILLSBURY = [
  "Ecuación de árboles urbanos de California (Pillsbury et al. 1998).",
  "Ramas modeladas desde ~4 pulgadas de diámetro hasta la punta; no es una medición exhaustiva de todas las ramas.",
  "DAP de SIVU a 1,30 m; el de la ecuación, a 1,3716 m (4,5 ft). Sin corrección.",
] as const;

const JACARANDA = {
  especie: "jacaranda mimosifolia",
  especie_ecuacion: "jacaranda mimosifolia",
  dap_min_cm: 17.272, // 6,8 in
  dap_max_cm: 59.69, // 23,5 in
  altura_min_m: 6.858, // 22,5 ft
  altura_max_m: 17.526, // 57,5 ft
  densidad: { valor: 490, unidad: "kg/m3", tipo: "masa seca / volumen verde", fuente: UTD_TS9, version: UTD_VERSION },
  n_muestra: 49,
} as const;

const LIQUIDAMBAR = {
  especie: "liquidambar styraciflua",
  especie_ecuacion: "liquidambar styraciflua",
  dap_min_cm: 13.97, // 5,5 in
  dap_max_cm: 54.356, // 21,4 in
  altura_min_m: 7.3152, // 24,0 ft
  altura_max_m: 19.9644, // 65,5 ft
  densidad: { valor: 460, unidad: "kg/m3", tipo: "masa seca / volumen verde", fuente: UTD_TS9, version: UTD_VERSION },
  n_muestra: 50,
} as const;

const comun = { version: 1, componente: "aerea_lenosa", admite_multifustal: false, apto_palmeras: false, estado: "aprobado" } as const;
const PILLSBURY = { confianza: "propia_urbana", fuente_rango: RANGO_PILLSBURY, limitaciones_modelo: LIMITACIONES_PILLSBURY } as const;

/**
 * CC-070, opción C2 (Valej, 2026-11-02). Ecuación de *Acer platanoides*
 * (McHale et al. 2009, tabla 1: Volumen (m³) = a·DAP(cm)^b; a = 1,9·10⁻³ y
 * b = 1,785 tal como los publica el artículo; R² 0,940). CARB 2010, tabla
 * B.1, publica a = 0,0019421 con el mismo b: se usa el valor del artículo
 * (decisión de Valej) y la diferencia queda documentada. Rango de DAP
 * 9,7-102,1 cm (CARB 2010, tabla B.1; el artículo no publica el rango por
 * especie). Sin variante con altura: la ecuación no la usa.
 */
const ACER_PSEUDOPLATANUS_SUSTITUTA = {
  especie: "acer pseudoplatanus",
  especie_ecuacion: "acer platanoides",
  dap_min_cm: 9.7,
  dap_max_cm: 102.1,
  altura_min_m: null,
  altura_max_m: null,
  densidad: {
    valor: 510,
    unidad: "kg/m3",
    tipo: "masa seca / volumen verde",
    fuente: "Sedlar, Šefc, Stojnić y Sinković 2021, Croatian Journal of Forest Engineering 42(3): 543-560, tabla 1 (densidad básica ρy = 0,51 g/cm³, ISO 13061-2)",
    version: "2021",
  },
  n_muestra: null,
  confianza: "sustituta_mismo_genero",
  fuente_rango: "California Air Resources Board 2010, Compliance Offset Protocol Urban Forest Projects, tabla B.1 (Acer platanoides)",
  limitaciones_modelo: [
    "Estimación indirecta: ecuación de otra especie del mismo género (Acer platanoides), no de Acer pseudoplatanus.",
    "Ecuación ajustada con árboles de calle de Fort Collins, Colorado (EE. UU.), con volumen medido por LiDAR terrestre (McHale et al. 2009).",
    "Densidad básica medida en árboles de bosque de Croacia (Sedlar et al. 2021), no en árboles urbanos.",
    "DAP de SIVU a 1,30 m; el de la ecuación, a 4,5 ft (1,37 m). Sin corrección.",
  ],
} as const;

const FUENTE_ACPL_D =
  "McHale, Burke, Lefsky, Peper y McPherson 2009, Urban Ecosystems 12: 95-113, tabla 1 (Acer platanoides, ACPL). Coeficientes del artículo (CC-070); CARB 2010, tabla B.1, publica a = 0,0019421";

/**
 * Modelos EXPLORATORIOS (autorización de la responsable, 2026-11-20): amplían
 * la cobertura con ecuaciones de otra especie del mismo género. No son
 * ecuaciones calibradas para los árboles de Valparaíso y sus resultados no
 * suman a los totales (estado «exploratorio»).
 */
const exploratorio = { version: 1, componente: "aerea_lenosa", admite_multifustal: false, apto_palmeras: false, estado: "exploratorio", confianza: "sustituta_mismo_genero" } as const;

/**
 * Acer negundo: la misma ecuación de Acer platanoides (McHale et al. 2009)
 * que ya usa Acer pseudoplatanus (CC-070). El Urban Tree Database asigna a
 * Acer negundo la ecuación de A. platanoides (PSW-GTR-253, tabla 11:
 * ACNE → ACPL) con densidad de 420 kg/m³. Comprobación del 2026-11-20: con
 * los árboles del Piloto, la variante solo con DAP implica alturas de 6,6 a
 * 9,5 m, coherentes con las medidas (5,4 a 10,7 m).
 */
const ACER_NEGUNDO_SUSTITUTA = {
  especie: "acer negundo",
  especie_ecuacion: "acer platanoides",
  dap_min_cm: 9.7,
  dap_max_cm: 102.1,
  altura_min_m: null,
  altura_max_m: null,
  densidad: {
    valor: 420,
    unidad: "kg/m3",
    tipo: "masa seca / volumen verde",
    fuente: "McPherson, van Doorn y Peper 2016, PSW-GTR-253, tabla 11 (Acer negundo, ACNE: 420 kg/m³; ecuación asignada ACPL). La Global Wood Density Database v2.2 da 0,44 g/cm³",
    version: "2016",
  },
  n_muestra: null,
  fuente_rango: "California Air Resources Board 2010, Compliance Offset Protocol Urban Forest Projects, tabla B.1 (Acer platanoides)",
  limitaciones_modelo: [
    "Exploratorio: ecuación de otra especie del mismo género (Acer platanoides), no de Acer negundo ni calibrada para Valparaíso.",
    "Ecuación ajustada con árboles de calle de Fort Collins, Colorado (EE. UU.), con volumen medido por LiDAR terrestre (McHale et al. 2009).",
    "Solo usa el DAP: en copas desmochadas o con poda intensa puede sobrestimar el volumen.",
    "DAP de SIVU a 1,30 m; el de la ecuación, a 4,5 ft (1,37 m). Sin corrección.",
  ],
} as const;

/**
 * Ulmus minor: ecuación de Ulmus pumila con DAP y altura (Lefsky y McHale
 * 2008, según PSW-GTR-253, tabla 9: V = 0,000338 · D^0,855 · H^2,041, en m³
 * por árbol; D en cm, H en m; rango de DAP 16-132 cm). Densidad básica
 * propia de Ulmus minor: 0,57 g/cm³ (Global Wood Density Database v2.2).
 * Comprobación del 2026-11-20: la variante solo con DAP de la misma tabla
 * implica alturas de 14 a 18 m y da 2 a 4 veces la biomasa de otros modelos
 * para los olmos del Piloto (7 a 12,6 m); la variante con altura queda en el
 * mismo orden de magnitud. Por eso solo se incorpora la variante con altura.
 */
const ULMUS_MINOR_SUSTITUTA = {
  especie: "ulmus minor",
  especie_ecuacion: "ulmus pumila",
  dap_min_cm: 16,
  dap_max_cm: 132,
  altura_min_m: null,
  altura_max_m: null,
  densidad: {
    valor: 570,
    unidad: "kg/m3",
    tipo: "masa seca / volumen verde",
    fuente: "Global Wood Density Database v2.2 (Zenodo, 2026-01-15; https://zenodo.org/records/18262736), gwddagg_v2.2_binomial.csv: Ulmus minor, wsg_est 0,57 (11 registros, 7 fuentes, 5 países; media sin ajustar 0,54)",
    version: "v2.2",
  },
  n_muestra: null,
  fuente_rango: "McPherson, van Doorn y Peper 2016, PSW-GTR-253, tabla 9 (Ulmus pumila, rango de DAP 16-132 cm; la tabla no publica el rango de altura)",
  limitaciones_modelo: [
    "Exploratorio: ecuación de otra especie del mismo género (Ulmus pumila), no de Ulmus minor ni calibrada para Valparaíso.",
    "Ecuación de árboles urbanos de EE. UU. (Lefsky y McHale 2008, recopilada en el Urban Tree Database); fuente original no revisada.",
    "La fuente no publica el rango de altura: la altura no se controla.",
    "DAP de SIVU a 1,30 m; el de la ecuación, a 4,5 ft (1,37 m). Sin corrección.",
  ],
} as const;

const FUENTE_ULPU_DH =
  "Lefsky y McHale 2008, según McPherson, van Doorn y Peper 2016 (PSW-GTR-253), tabla 9 (Ulmus pumila, ULPU, d.b.h. y altura). Fuente original no revisada";

export const MODELOS_VOLUMEN: readonly ModeloVolumen[] = [
  { ...comun, ...JACARANDA, ...PILLSBURY, id: "UTD-TS7-JAME-DH", variante: "dap_altura", a: 0.0000801, b: 2.18578, c: 0.548045, fuente: FUENTE_JAME_DH },
  { ...comun, ...JACARANDA, ...PILLSBURY, id: "UTD-TS7-JAME-D", variante: "dap", a: 0.0001005, b: 2.486248, c: 0, fuente: FUENTE_JAME_D },
  { ...comun, ...LIQUIDAMBAR, ...PILLSBURY, id: "UTD-TS7-LIST-DH", variante: "dap_altura", a: 0.0000631, b: 2.31582, c: 0.41571, fuente: FUENTE_LIST_DH },
  { ...comun, ...LIQUIDAMBAR, ...PILLSBURY, id: "UTD-TS7-LIST-D", variante: "dap", a: 0.0000799, b: 2.560469, c: 0, fuente: FUENTE_LIST_D },
  { ...comun, ...ACER_PSEUDOPLATANUS_SUSTITUTA, id: "MCH09-T1-ACPL-D-ACPS", variante: "dap", a: 0.0019, b: 1.785, c: 0, fuente: FUENTE_ACPL_D },
  // Exploratorios (2026-11-20): no suman a los totales.
  { ...exploratorio, ...ACER_NEGUNDO_SUSTITUTA, id: "MCH09-T1-ACPL-D-ACNE", variante: "dap", a: 0.0019, b: 1.785, c: 0, fuente: FUENTE_ACPL_D },
  { ...exploratorio, ...ULMUS_MINOR_SUSTITUTA, id: "UTD-T9-ULPU-DH-ULMI", variante: "dap_altura", a: 0.000338, b: 0.855, c: 2.041, fuente: FUENTE_ULPU_DH },
];

/**
 * Limitaciones generales que acompañan cada resultado (Valej, 2026-11-02).
 * Las propias de cada ecuación van en `limitaciones_modelo` (CC-070): el
 * DAP de SIVU se mide a 1,30 m (D-18) y el de las ecuaciones a 4,5 ft; no
 * se transforma.
 */
export const LIMITACIONES = [
  "Estimación de carbono aéreo leñoso almacenado: no es carbono total ni secuestro anual.",
  "Volumen exterior a la corteza × densidad de madera seca, sin corrección de corteza.",
  "Ecuaciones de árboles urbanos de EE. UU.; cada resultado indica su modelo, su nivel de confianza y sus limitaciones propias.",
  "DAP de SIVU a 1,30 m; el de las ecuaciones, a 4,5 ft (1,37 m). Sin corrección.",
  "Fracción de carbono 0,47 por defecto (IPCC 2006), no específica de la especie.",
] as const;

/**
 * Modelos de CARBONO DIRECTO (autorización de la responsable, 2026-11-21):
 * la ecuación entrega el carbono en kg sin pasar por volumen, densidad ni
 * fracción de carbono. Estiman otro componente (carbono aéreo total, con
 * hojas) y por eso se agregan en un indicador propio, nunca junto al carbono
 * aéreo leñoso. Pendientes de sincronización con el Excel maestro
 * (docs/plan/propuestas/carbono-directo-discrepancia-excel.md).
 */
export interface ModeloCarbonoDirecto {
  id: string;
  version: number;
  tipo: "carbono_directo";
  /** Clave de especie de B19 (claveEspecie). */
  especie: string;
  variante: "dap";
  /** C (kg) = a · D(cm)^b. */
  a: number;
  b: number;
  componente: "aerea_total";
  /** Partes del árbol que incluye y excluye la ecuación. */
  incluye: readonly string[];
  excluye: readonly string[];
  /** Rango de DAP de la muestra; límites incluidos. */
  dap_min_cm: number;
  dap_max_cm: number;
  /** Altura de medición del DAP en la fuente. */
  altura_medicion_dap_m: number;
  n_muestra: number;
  r2: number;
  /**
   * Contenido medio de carbono de la biomasa aérea seca en la fuente. SOLO
   * informativo: la ecuación ya lo incorpora y nunca se vuelve a aplicar.
   */
  fraccion_carbono_fuente: number;
  confianza: Extract<NivelConfianza, "propia_no_urbana">;
  estado: EstadoModelo;
  especie_ecuacion: string;
  fuente_rango: string;
  limitaciones_modelo: readonly string[];
  admite_multifustal: false;
  apto_palmeras: false;
  fuente: string;
  doi: string;
}

const FUENTE_CRUZ_2015 =
  "Cruz, P., Bascuñan, A., Velozo, J. y Rodríguez, M. (2015). Funciones alométricas de contenido de carbono para quillay, peumo, espino y litre. Bosque, 36(3), 375-381 (componentes: p. 376; contenido de carbono por componente: p. 379, cuadro 5; ecuaciones, muestras y rangos: p. 379, cuadro 6)";
const DOI_CRUZ_2015 = "https://doi.org/10.4067/S0717-92002015000300005";
const RANGO_CRUZ_2015 = "Cruz et al. 2015, p. 379, cuadro 6";
const LIMITACIONES_CRUZ_2015 = [
  "Exploratorio en SIVU: ecuación de la misma especie ajustada en el bosque mediterráneo chileno, no en árboles urbanos; su transferencia a los árboles de Valparaíso no está validada.",
  "Carbono aéreo total: incluye tallo, ramas, ramillas y hojas, y excluye raíces. No es comparable con el carbono aéreo leñoso ni se suma a él.",
  "La ecuación entrega el carbono directamente: no se aplica densidad de madera ni la fracción de carbono 0,47.",
  "Solo árboles de un fuste: la fuente no demuestra que el DAP equivalente de un multifustal pueda sustituir el DAP con que se ajustó la ecuación.",
] as const;
const carbonoDirecto = {
  version: 1,
  tipo: "carbono_directo",
  variante: "dap",
  componente: "aerea_total",
  incluye: ["tallo", "ramas", "ramillas", "hojas"],
  excluye: ["raíces"],
  altura_medicion_dap_m: 1.3,
  confianza: "propia_no_urbana",
  estado: "exploratorio",
  fuente_rango: RANGO_CRUZ_2015,
  limitaciones_modelo: LIMITACIONES_CRUZ_2015,
  admite_multifustal: false,
  apto_palmeras: false,
  fuente: FUENTE_CRUZ_2015,
  doi: DOI_CRUZ_2015,
} as const;

export const MODELOS_CARBONO_DIRECTO: readonly ModeloCarbonoDirecto[] = [
  { ...carbonoDirecto, id: "CRUZ15-C6-QUSA-D", especie: "quillaja saponaria", especie_ecuacion: "quillaja saponaria", a: 0.0736, b: 2.251, dap_min_cm: 5, dap_max_cm: 41, n_muestra: 80, r2: 0.95, fraccion_carbono_fuente: 0.493 },
  { ...carbonoDirecto, id: "CRUZ15-C6-CRAL-D", especie: "cryptocarya alba", especie_ecuacion: "cryptocarya alba", a: 0.0675, b: 2.352, dap_min_cm: 5, dap_max_cm: 37, n_muestra: 82, r2: 0.95, fraccion_carbono_fuente: 0.495 },
];

/** Limitaciones generales del carbono aéreo total (2026-11-21). */
export const LIMITACIONES_AEREO_TOTAL = [
  "Estimación de carbono aéreo total almacenado (tallo, ramas, ramillas y hojas; sin raíces): no es carbono leñoso, carbono total ni secuestro anual.",
  "Ecuaciones de carbono directo: el carbono sale de la ecuación, sin densidad de madera ni fracción de carbono adicional.",
  "Modelos exploratorios para árboles urbanos: se muestran rotulados y no suman a ningún total oficial.",
  "Indicador separado del carbono aéreo leñoso: sus resultados nunca se suman con él.",
] as const;

/**
 * Selección explícita de modelos (2026-11-21): por componente, especie y
 * estado metodológico. Una especie puede tener modelos de distintos
 * componentes, y dentro de un componente, si hay un modelo aprobado, se
 * descartan los exploratorios. Así cada árbol recibe a lo sumo un modelo
 * por componente (con la variante que elige cada cálculo) y cada indicador
 * agrega un solo componente.
 */
export function seleccionarModelos(componente: "aerea_lenosa", especie: string | null): ModeloVolumen[];
export function seleccionarModelos(componente: "aerea_total", especie: string | null): ModeloCarbonoDirecto[];
export function seleccionarModelos(componente: ComponenteCarbono, especie: string | null): (ModeloVolumen | ModeloCarbonoDirecto)[] {
  if (especie === null) return [];
  const catalogo: readonly (ModeloVolumen | ModeloCarbonoDirecto)[] = componente === "aerea_lenosa" ? MODELOS_VOLUMEN : MODELOS_CARBONO_DIRECTO;
  const deEspecie = catalogo.filter((m) => m.componente === componente && m.especie === especie);
  const aprobados = deEspecie.filter((m) => m.estado === "aprobado");
  return aprobados.length > 0 ? aprobados : deEspecie;
}
