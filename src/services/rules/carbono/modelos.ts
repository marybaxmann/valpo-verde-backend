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
  /** Solo se controla en la variante con altura; null en un modelo que solo tiene variante con DAP. */
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
  confianza: "propia_urbana" | "sustituta_mismo_genero";
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

const comun = { version: 1, componente: "aerea_lenosa", admite_multifustal: false, apto_palmeras: false } as const;
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

export const MODELOS_VOLUMEN: readonly ModeloVolumen[] = [
  { ...comun, ...JACARANDA, ...PILLSBURY, id: "UTD-TS7-JAME-DH", variante: "dap_altura", a: 0.0000801, b: 2.18578, c: 0.548045, fuente: FUENTE_JAME_DH },
  { ...comun, ...JACARANDA, ...PILLSBURY, id: "UTD-TS7-JAME-D", variante: "dap", a: 0.0001005, b: 2.486248, c: 0, fuente: FUENTE_JAME_D },
  { ...comun, ...LIQUIDAMBAR, ...PILLSBURY, id: "UTD-TS7-LIST-DH", variante: "dap_altura", a: 0.0000631, b: 2.31582, c: 0.41571, fuente: FUENTE_LIST_DH },
  { ...comun, ...LIQUIDAMBAR, ...PILLSBURY, id: "UTD-TS7-LIST-D", variante: "dap", a: 0.0000799, b: 2.560469, c: 0, fuente: FUENTE_LIST_D },
  { ...comun, ...ACER_PSEUDOPLATANUS_SUSTITUTA, id: "MCH09-T1-ACPL-D-ACPS", variante: "dap", a: 0.0019, b: 1.785, c: 0, fuente: FUENTE_ACPL_D },
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
