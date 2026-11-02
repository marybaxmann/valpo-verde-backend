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
  /** Solo se controla en la variante con altura. */
  altura_min_m: number;
  altura_max_m: number;
  densidad: { valor: number; unidad: "kg/m3"; tipo: "masa seca / volumen verde"; fuente: string; version: string };
  n_muestra: number;
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

const JACARANDA = {
  especie: "jacaranda mimosifolia",
  dap_min_cm: 17.272, // 6,8 in
  dap_max_cm: 59.69, // 23,5 in
  altura_min_m: 6.858, // 22,5 ft
  altura_max_m: 17.526, // 57,5 ft
  densidad: { valor: 490, unidad: "kg/m3", tipo: "masa seca / volumen verde", fuente: UTD_TS9, version: UTD_VERSION },
  n_muestra: 49,
} as const;

const LIQUIDAMBAR = {
  especie: "liquidambar styraciflua",
  dap_min_cm: 13.97, // 5,5 in
  dap_max_cm: 54.356, // 21,4 in
  altura_min_m: 7.3152, // 24,0 ft
  altura_max_m: 19.9644, // 65,5 ft
  densidad: { valor: 460, unidad: "kg/m3", tipo: "masa seca / volumen verde", fuente: UTD_TS9, version: UTD_VERSION },
  n_muestra: 50,
} as const;

const comun = { version: 1, componente: "aerea_lenosa", admite_multifustal: false, apto_palmeras: false } as const;

export const MODELOS_VOLUMEN: readonly ModeloVolumen[] = [
  { ...comun, ...JACARANDA, id: "UTD-TS7-JAME-DH", variante: "dap_altura", a: 0.0000801, b: 2.18578, c: 0.548045, fuente: FUENTE_JAME_DH },
  { ...comun, ...JACARANDA, id: "UTD-TS7-JAME-D", variante: "dap", a: 0.0001005, b: 2.486248, c: 0, fuente: FUENTE_JAME_D },
  { ...comun, ...LIQUIDAMBAR, id: "UTD-TS7-LIST-DH", variante: "dap_altura", a: 0.0000631, b: 2.31582, c: 0.41571, fuente: FUENTE_LIST_DH },
  { ...comun, ...LIQUIDAMBAR, id: "UTD-TS7-LIST-D", variante: "dap", a: 0.0000799, b: 2.560469, c: 0, fuente: FUENTE_LIST_D },
];

/**
 * Limitaciones que acompañan cada resultado (Valej, 2026-11-02): el DAP de
 * SIVU se mide a 1,30 m (D-18) y el de Pillsbury a 4,5 ft (1,3716 m); no se
 * transforma.
 */
export const LIMITACIONES = [
  "Estimación de carbono aéreo leñoso: no es carbono total ni secuestro anual.",
  "Volumen exterior a la corteza × densidad de madera seca, sin corrección de corteza.",
  "Ramas modeladas desde ~4 pulgadas de diámetro hasta la punta; no es una medición exhaustiva de todas las ramas.",
  "DAP de SIVU a 1,30 m; el de la ecuación, a 1,3716 m (4,5 ft). Sin corrección.",
  "Ecuación de árboles urbanos de California.",
  "Fracción de carbono 0,47 por defecto (IPCC 2006), no específica de la especie.",
] as const;
