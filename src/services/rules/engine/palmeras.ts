/**
 * PALM-01 — Probabilidad de falla de palmeras (CC-082, SIVU 3.4.0).
 * Fuente: Excel maestro, REGLAS_INDICADORES PB-, PE- y PC- (filas 132 a
 * 188) y MATRICES_CALCULO R01-P, R02-P y R03-P (filas 20 a 33); hoja
 * PALMERAS para las definiciones adaptadas. No depende de treeRisk.ts.
 *
 * Solo se usa cuando `tipo_hoja = "palmera"` y la versión del motor
 * incluye palmeras (ver `incluyePalmeras` en version.ts). Con cualquier
 * otro `tipo_hoja` (o nulo) se aplican R01, R02 y R03 de árboles, sin
 * cambios (superposición, REGLAS_GENERALES fila 30).
 *
 * Mismas reglas que los árboles:
 * - los pisos se aplican primero y un dato faltante en otro indicador no
 *   los bloquea;
 * - sin piso, se suman los indicadores y se clasifica por bandas;
 * - un campo sin valor, fuera de dominio o una combinación imposible deja
 *   el indicador no_determinado con motivo (nunca 0, CC-024) y se
 *   propaga al componente.
 *
 * Diferencias por la anatomía de las palmeras (E4e): sin SL ni t/R (la
 * cavidad confirmada vale 2), sin umbrales de inclinación en grados, la
 * herida vale 2 (no cicatriza) y la grieta longitudinal no usa la regla
 * de 1/3 del DAP. La consecuencia, M01–M03 y R04 son comunes.
 */

import { esCodigoVigente, ProbabilidadFallaCodigo, ResultadoCavidadInternaCodigo, SeveridadCodigo, SiNoNoDeterminadoCodigo } from "./catalogs";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";
import { ALERTA_MEDIR_PUDRICION } from "./r02-tronco";

// ---------------------------------------------------------------------
// Dominios de los campos nuevos (DICCIONARIO_CAMPOS D-309 a D-317)
// ---------------------------------------------------------------------

/** D-312. */
export const CODIGOS_ANOMALIA_COGOLLO = ["ninguna", "desviacion", "pudricion", "colapso", "ausencia", "no_determinado"] as const;
export type AnomaliaCogolloCodigo = (typeof CODIGOS_ANOMALIA_COGOLLO)[number];

/** D-313, selección múltiple. "no" y "no_determinado" son excluyentes. */
export const CODIGOS_PLAGA_PALMERA = ["no", "corona", "estipite", "base", "no_determinado"] as const;
export type PlagaPalmeraCodigo = (typeof CODIGOS_PLAGA_PALMERA)[number];

/** D-316. */
export const CODIGOS_RAICES_ADVENTICIAS = ["si", "no", "no_aplica_especie"] as const;
export type RaicesAdventiciasCodigo = (typeof CODIGOS_RAICES_ADVENTICIAS)[number];

/** D-309 y D-310: clases 0 a 6 (catálogo clase_copa_palmera, códigos "0" a "6"); 6 = no determinable. */
export const CLASES_COPA_PALMERA = ["0", "1", "2", "3", "4", "5", "6"] as const;
export type ClaseCopaPalmeraCodigo = (typeof CLASES_COPA_PALMERA)[number];

export const ALERTA_FITOSANITARIA = "Indicios de plaga: evaluación fitosanitaria especializada";
export const ALERTA_RAICES_ADVENTICIAS = "Raíces adventicias en altura: revisar Base y raíces";

export interface EntradasPalmera {
  calidad_copa_palmera?: ClaseCopaPalmeraCodigo | null;
  proporcion_frondas_vivas?: ClaseCopaPalmeraCodigo | null;
  anomalia_cogollo?: AnomaliaCogolloCodigo | null;
  indicios_plaga_palmera?: PlagaPalmeraCodigo[] | null;
  estrechamiento_estipite?: SiNoNoDeterminadoCodigo | null;
  angulacion_grave_estipite?: boolean | null;
  raices_adventicias_altura?: RaicesAdventiciasCodigo | null;
  inclinacion_corregida?: SiNoNoDeterminadoCodigo | null;
}

/** Campos de árboles que las reglas de palmeras reutilizan (hoja PALMERAS, sección A, y campos iguales). */
export interface EntradasReutilizadasPalmera {
  levantamiento_del_plato_radicular: boolean | null;
  angulo_inclinacion: number | null;
  raices_expuestas: boolean | null;
  necrosis_radicular: boolean | null;
  raices_cortadas: boolean | null;
  cavidad_pudricion_basal: boolean | null;
  cavidad_basal_externa: boolean | null;
  cavidad_basal_interna: ResultadoCavidadInternaCodigo | null;
  anillamiento: boolean | null;
  cuerpos_fructiferos_base: boolean | null;
  presenta_cavidad_pudricion_tronco: boolean | null;
  cavidad_externa_tronco: boolean | null;
  cavidad_interna_tronco: ResultadoCavidadInternaCodigo | null;
  presenta_fisura_grieta_tronco: boolean | null;
  afectacion_fisura_grieta: string | null;
  direccion_grieta: string | null;
  presenta_heridas_tronco: boolean | null;
  cuerpos_fructiferos_tronco: boolean | null;
  ramas_secas: boolean | null;
  ramas_secas_pct_copa: number | null;
  ramas_quebradas: boolean | null;
  permanece_suspendida: boolean | null;
}

export type PalmeraInput = EntradasReutilizadasPalmera & EntradasPalmera;

export interface IndicadorPalmera {
  /** null = no_determinado, piso sin severidad o alerta sin puntaje. */
  severidad: SeveridadCodigo | null;
  puntaje: number | null;
  reglaId: string | null;
  noDeterminado: boolean;
  motivo?: string;
  alerta?: string;
  /** Piso que fija el indicador (PE-GRI-03, PC-FQU-03, PC-COG-02). */
  piso?: "inminente" | "probable";
}

export interface ComponentePalmeraResultado<K extends string> {
  indicadores: Record<K, IndicadorPalmera>;
  /** null si probabilidadFalla = no_determinado o si aplicó un piso. */
  puntaje: number | null;
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string;
}

const PUNTAJE: Record<SeveridadCodigo, number> = { despreciable: 0, leve: 1, moderada: 2, severa: 3 };

function ind(severidad: SeveridadCodigo, reglaId: string, alerta?: string): IndicadorPalmera {
  return { severidad, puntaje: PUNTAJE[severidad], reglaId, noDeterminado: false, ...(alerta && { alerta }) };
}

function nd(motivo: string, reglaId: string | null = null): IndicadorPalmera {
  return { severidad: null, puntaje: null, reglaId, noDeterminado: true, motivo };
}

function piso(piso: "inminente" | "probable", reglaId: string): IndicadorPalmera {
  return { severidad: null, puntaje: null, reglaId, noDeterminado: false, piso };
}

/** Valida un Sí/No obligatorio o condicional; devuelve el motivo de No determinado o null si es válido. */
function faltaSiNo(nombre: string, valor: unknown, cita: string, regla: string): string | null {
  if (valor === null || valor === undefined) return `${nombre} sin valor (${regla})`;
  if (!esBooleanoValido(valor)) return motivoFueraDominioSiNo(nombre, valor, cita);
  return null;
}

// ---------------------------------------------------------------------
// Indicadores comunes a varios componentes
// ---------------------------------------------------------------------

type UbicacionPlaga = "corona" | "estipite" | "base";

/** PB-PLA, PE-PLA y PC-PLA. `cavidad` = cavidad registrada en el componente (undefined en la corona). */
function evaluarPlaga(
  input: PalmeraInput,
  ubicacion: UbicacionPlaga,
  prefijo: "PB" | "PE" | "PC",
  cavidad?: boolean | null,
): IndicadorPalmera {
  const valor = input.indicios_plaga_palmera;
  if (valor === null || valor === undefined) return nd(`indicios_plaga_palmera sin valor (${prefijo}-PLA, D-313)`);
  if (!Array.isArray(valor) || valor.length === 0 || new Set(valor).size !== valor.length || !valor.every((c) => typeof c === "string" && esCodigoVigente("plaga_palmera", c))) {
    return nd(`indicios_plaga_palmera fuera de dominio (D-313): ${JSON.stringify(valor)}`);
  }
  const exclusivo = valor.includes("no") || valor.includes("no_determinado");
  if (exclusivo && valor.length > 1) {
    return nd(`indicios_plaga_palmera combina «No» o «No determinado» con otras opciones (D-313): ${JSON.stringify(valor)}`);
  }
  const ultimo = prefijo === "PC" ? "03" : "04";
  if (valor.includes("no_determinado")) return nd("indicios_plaga_palmera = No determinado", `${prefijo}-PLA-${ultimo}`);
  if (!valor.includes(ubicacion)) return ind("despreciable", `${prefijo}-PLA-01`);
  if (prefijo === "PC") return ind("leve", "PC-PLA-02", ALERTA_FITOSANITARIA);
  if (cavidad === null || cavidad === undefined || !esBooleanoValido(cavidad)) {
    return nd(`indicios_plaga_palmera incluye ${ubicacion} sin un valor válido de cavidad en el componente (${prefijo}-PLA)`);
  }
  if (cavidad) return { ...ind("despreciable", `${prefijo}-PLA-03`), alerta: ALERTA_FITOSANITARIA };
  return ind("leve", `${prefijo}-PLA-02`, ALERTA_FITOSANITARIA);
}

/** PB-CAV y PE-CAV: la cavidad confirmada vale 2, sin SL ni t/R. */
function evaluarCavidad(
  hay: boolean | null,
  externa: boolean | null,
  interna: ResultadoCavidadInternaCodigo | null,
  nombres: { hay: string; externa: string; interna: string; citaHay: string },
  prefijo: "PB" | "PE",
): IndicadorPalmera {
  const falta = faltaSiNo(nombres.hay, hay, nombres.citaHay, `${prefijo}-CAV, obligatorio`);
  if (falta) return nd(falta);
  if (!hay) return ind("despreciable", `${prefijo}-CAV-01`);
  if (externa !== null && !esBooleanoValido(externa)) return nd(motivoFueraDominioSiNo(nombres.externa, externa, `${prefijo}-CAV`));
  if (interna !== null && !esCodigoVigente("resultado_cavidad_interna", interna)) {
    return nd(`${nombres.interna} tiene un código no reconocido ("${interna}")`);
  }
  if (externa === true || interna === "si") return ind("moderada", `${prefijo}-CAV-02`);
  if (interna === "requiere_evaluacion_instrumental") {
    return nd(`${nombres.interna} = Requiere evaluación instrumental (${prefijo}-CAV-03)`, `${prefijo}-CAV-03`);
  }
  if (externa === null || interna === null) {
    return nd(`${nombres.externa} o ${nombres.interna} sin valor (${prefijo}-CAV, condicional activado por ${nombres.hay} = Sí)`);
  }
  return nd(`Combinación inválida: ${nombres.hay} = Sí con ${nombres.externa} = No y ${nombres.interna} = No`);
}

/** PB-HON y PE-HON: hongos suman 1 solo sin cavidad registrada (igual que RC-HON y TR-HON). */
function evaluarHongos(hongos: boolean | null, cavidad: boolean | null, nombre: string, prefijo: "PB" | "PE"): IndicadorPalmera {
  const falta = faltaSiNo(nombre, hongos, `${prefijo}-HON`, `${prefijo}-HON, obligatorio`);
  if (falta) return nd(falta);
  if (!hongos) return ind("despreciable", `${prefijo}-HON-01`);
  if (cavidad === null || !esBooleanoValido(cavidad)) return nd(`${nombre} = Sí sin un valor válido de cavidad (${prefijo}-HON)`);
  if (cavidad) return ind("despreciable", `${prefijo}-HON-03`);
  return ind("leve", `${prefijo}-HON-02`, ALERTA_MEDIR_PUDRICION);
}

function sumar<K extends string>(indicadores: Record<K, IndicadorPalmera>, etiquetas: Record<K, string>) {
  const motivos = (Object.keys(indicadores) as K[])
    .filter((k) => indicadores[k].noDeterminado)
    .map((k) => `${etiquetas[k]}: ${indicadores[k].motivo}`);
  if (motivos.length > 0) return { puntaje: null, motivo: motivos.join(" | ") };
  const puntaje = (Object.values(indicadores) as IndicadorPalmera[]).reduce((s, i) => s + (i.puntaje ?? 0), 0);
  return { puntaje, motivo: undefined };
}

function banda(puntaje: number, limitePosible: number): ProbabilidadFallaCodigo {
  if (puntaje === 0) return "improbable";
  return puntaje <= limitePosible ? "posible" : "probable";
}

// ---------------------------------------------------------------------
// R01-P · Base y raíces
// ---------------------------------------------------------------------

export type IndicadoresR01P = "plato" | "inclinacion" | "raices" | "cavidadBasal" | "anillamiento" | "hongos" | "plaga";

/** PB-INC-01 a 04: sin umbrales en grados. */
function evaluarInclinacion(input: PalmeraInput): IndicadorPalmera {
  const angulo = input.angulo_inclinacion;
  if (angulo === null || angulo === undefined) return nd("angulo_inclinacion sin valor (PB-INC, obligatorio)");
  if (!Number.isFinite(angulo) || angulo < 0 || angulo > 90) return nd(`angulo_inclinacion fuera de rango 0°–90° (${angulo}) (D-37)`);
  if (angulo === 0) return ind("despreciable", "PB-INC-01");
  const corregida = input.inclinacion_corregida;
  if (corregida === null || corregida === undefined) {
    return nd("inclinacion_corregida sin valor (PB-INC, condicional activado por angulo_inclinacion > 0°, D-317)");
  }
  if (!esCodigoVigente("si_no_no_determinado", corregida)) return nd(`inclinacion_corregida fuera de dominio ("${corregida}") (D-317)`);
  if (corregida === "si") return ind("despreciable", "PB-INC-02");
  if (corregida === "no") return ind("moderada", "PB-INC-03");
  return nd("inclinacion_corregida = No determinado", "PB-INC-04");
}

/** PB-REX-01 a 05: misma lógica que RC-REX. */
function evaluarRaices(input: PalmeraInput): IndicadorPalmera {
  const faltaExp = faltaSiNo("raices_expuestas", input.raices_expuestas, "D-33", "PB-REX, obligatorio");
  if (faltaExp) return nd(faltaExp);
  const faltaCort = faltaSiNo("raices_cortadas", input.raices_cortadas, "D-35", "PB-REX, obligatorio");
  if (faltaCort) return nd(faltaCort);
  const cortadas = input.raices_cortadas!;
  if (!input.raices_expuestas) return cortadas ? ind("moderada", "PB-REX-04") : ind("despreciable", "PB-REX-01");
  const faltaNec = faltaSiNo("necrosis_radicular", input.necrosis_radicular, "D-34", "PB-REX, condicional activado por raices_expuestas = Sí");
  if (faltaNec) return nd(faltaNec);
  const necrosis = input.necrosis_radicular!;
  if (!necrosis && !cortadas) return ind("despreciable", "PB-REX-02");
  if (necrosis && !cortadas) return ind("moderada", "PB-REX-03");
  if (!necrosis && cortadas) return ind("moderada", "PB-REX-04");
  return ind("severa", "PB-REX-05");
}

export function evaluarR01Palmera(input: PalmeraInput): ComponentePalmeraResultado<IndicadoresR01P> {
  // El plato no puntúa: solo fija pisos. Sin su valor el componente no se determina (salvo otro piso).
  const faltaPlato = faltaSiNo("levantamiento_del_plato_radicular", input.levantamiento_del_plato_radicular, "D-36", "R01-P, obligatorio");
  const plato: IndicadorPalmera = faltaPlato
    ? nd(faltaPlato)
    : { severidad: null, puntaje: 0, reglaId: null, noDeterminado: false };
  const indicadores: Record<IndicadoresR01P, IndicadorPalmera> = {
    plato,
    inclinacion: evaluarInclinacion(input),
    raices: evaluarRaices(input),
    cavidadBasal: evaluarCavidad(
      input.cavidad_pudricion_basal,
      input.cavidad_basal_externa,
      input.cavidad_basal_interna,
      { hay: "cavidad_pudricion_basal", externa: "cavidad_basal_externa", interna: "cavidad_basal_interna", citaHay: "D-39" },
      "PB",
    ),
    anillamiento: (() => {
      const falta = faltaSiNo("anillamiento", input.anillamiento, "D-276", "PB-ANI, obligatorio");
      if (falta) return nd(falta);
      return input.anillamiento ? ind("leve", "PB-ANI-02") : ind("despreciable", "PB-ANI-01");
    })(),
    hongos: evaluarHongos(input.cuerpos_fructiferos_base, input.cavidad_pudricion_basal, "cuerpos_fructiferos_base", "PB"),
    plaga: evaluarPlaga(input, "base", "PB", input.cavidad_pudricion_basal),
  };

  // Pisos (MATRICES R01-P): plato levantado con inclinación no corregida → Inminente;
  // plato levantado con el estípite vertical o corregido (o sin determinar) → mínimo Probable.
  if (input.levantamiento_del_plato_radicular === true) {
    const noCorregida = typeof input.angulo_inclinacion === "number" && input.angulo_inclinacion > 0 && input.inclinacion_corregida === "no";
    return { indicadores, puntaje: null, probabilidadFalla: noCorregida ? "inminente" : "probable" };
  }

  const { puntaje, motivo } = sumar(indicadores, {
    plato: "Plato radicular", inclinacion: "Inclinación", raices: "Raíces", cavidadBasal: "Cavidad basal",
    anillamiento: "Anillamiento", hongos: "Hongos", plaga: "Plaga",
  });
  if (puntaje === null) return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo };
  return { indicadores, puntaje, probabilidadFalla: banda(puntaje, 3) };
}

// ---------------------------------------------------------------------
// R02-P · Estípite
// ---------------------------------------------------------------------

export type IndicadoresR02P = "cavidad" | "grietas" | "heridas" | "estrechamiento" | "angulacion" | "hongos" | "plaga" | "raicesAdventicias";

/** PE-GRI-01 a 03: la transversal que penetra fija Inminente; la longitudinal vale 2 sin la regla de 1/3 del DAP. */
function evaluarGrietas(input: PalmeraInput): IndicadorPalmera {
  const falta = faltaSiNo("presenta_fisura_grieta_tronco", input.presenta_fisura_grieta_tronco, "D-67", "PE-GRI, obligatorio");
  if (falta) return nd(falta);
  if (!input.presenta_fisura_grieta_tronco) return ind("despreciable", "PE-GRI-01");
  const afectacion = input.afectacion_fisura_grieta;
  if (afectacion === null || afectacion === undefined) return nd("afectacion_fisura_grieta sin valor (PE-GRI, condicional)");
  if (!esCodigoVigente("afectacion_grieta", afectacion)) return nd(`afectacion_fisura_grieta fuera de dominio ("${afectacion}")`);
  if (afectacion === "solo_corteza") return ind("despreciable", "PE-GRI-01");
  const direccion = input.direccion_grieta;
  if (direccion === null || direccion === undefined) return nd("direccion_grieta sin valor (PE-GRI, condicional)");
  if (!esCodigoVigente("direccion_grieta", direccion)) return nd(`direccion_grieta fuera de dominio ("${direccion}")`);
  return direccion === "transversal" ? piso("inminente", "PE-GRI-03") : ind("moderada", "PE-GRI-02");
}

function evaluarSiNoNd(valor: SiNoNoDeterminadoCodigo | null | undefined, nombre: string, prefijo: string, cita: string): IndicadorPalmera {
  if (valor === null || valor === undefined) return nd(`${nombre} sin valor (${prefijo}, ${cita})`);
  if (!esCodigoVigente("si_no_no_determinado", valor)) return nd(`${nombre} fuera de dominio ("${valor}") (${cita})`);
  if (valor === "no") return ind("despreciable", `${prefijo}-01`);
  if (valor === "si") return ind("moderada", `${prefijo}-02`);
  return nd(`${nombre} = No determinado`, `${prefijo}-03`);
}

export function evaluarR02Palmera(input: PalmeraInput): ComponentePalmeraResultado<IndicadoresR02P> {
  const raicesAdventicias: IndicadorPalmera = (() => {
    const v = input.raices_adventicias_altura;
    // Sin puntaje: nunca bloquea el componente (PE-RAD-01 es solo una alerta).
    const base: IndicadorPalmera = { severidad: null, puntaje: 0, reglaId: null, noDeterminado: false };
    if (v === "si") return { ...base, reglaId: "PE-RAD-01", alerta: ALERTA_RAICES_ADVENTICIAS };
    return base;
  })();
  const indicadores: Record<IndicadoresR02P, IndicadorPalmera> = {
    cavidad: evaluarCavidad(
      input.presenta_cavidad_pudricion_tronco,
      input.cavidad_externa_tronco,
      input.cavidad_interna_tronco,
      { hay: "presenta_cavidad_pudricion_tronco", externa: "cavidad_externa_tronco", interna: "cavidad_interna_tronco", citaHay: "D-51" },
      "PE",
    ),
    grietas: evaluarGrietas(input),
    heridas: (() => {
      const falta = faltaSiNo("presenta_heridas_tronco", input.presenta_heridas_tronco, "D-62", "PE-HER, obligatorio");
      if (falta) return nd(falta);
      // En palmeras la herida no cicatriza: equivale a Abierta (PE-HER-02).
      return input.presenta_heridas_tronco ? ind("moderada", "PE-HER-02") : ind("despreciable", "PE-HER-01");
    })(),
    estrechamiento: evaluarSiNoNd(input.estrechamiento_estipite, "estrechamiento_estipite", "PE-EST", "D-314"),
    angulacion: (() => {
      const falta = faltaSiNo("angulacion_grave_estipite", input.angulacion_grave_estipite, "D-315", "PE-ANG, condicional");
      if (falta) return nd(falta);
      return input.angulacion_grave_estipite ? ind("moderada", "PE-ANG-02") : ind("despreciable", "PE-ANG-01");
    })(),
    hongos: evaluarHongos(input.cuerpos_fructiferos_tronco, input.presenta_cavidad_pudricion_tronco, "cuerpos_fructiferos_tronco", "PE"),
    plaga: evaluarPlaga(input, "estipite", "PE", input.presenta_cavidad_pudricion_tronco),
    raicesAdventicias,
  };

  // Piso (MATRICES R02-P): grieta transversal que penetra → Inminente. No hay piso Probable.
  if (indicadores.grietas.piso === "inminente") return { indicadores, puntaje: null, probabilidadFalla: "inminente" };

  const { puntaje, motivo } = sumar(indicadores, {
    cavidad: "Cavidad", grietas: "Grietas", heridas: "Heridas", estrechamiento: "Estrechamiento",
    angulacion: "Angulación", hongos: "Hongos", plaga: "Plaga", raicesAdventicias: "Raíces adventicias",
  });
  if (puntaje === null) return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo };
  return { indicadores, puntaje, probabilidadFalla: banda(puntaje, 3) };
}

// ---------------------------------------------------------------------
// R03-P · Corona
// ---------------------------------------------------------------------

export type IndicadoresR03P = "frondasSecas" | "frondasQuebradas" | "cogollo" | "plaga";

/** PC-FSE-01 a 05: tramos de CR-RSE; la falda cuenta como fronda seca. */
function evaluarFrondasSecas(input: PalmeraInput): IndicadorPalmera {
  const falta = faltaSiNo("ramas_secas", input.ramas_secas, "D-76", "PC-FSE, obligatorio");
  if (falta) return nd(falta);
  if (!input.ramas_secas) return ind("despreciable", "PC-FSE-01");
  const pct = input.ramas_secas_pct_copa;
  if (pct === null || pct === undefined) return nd("ramas_secas_pct_copa sin registrar (PC-FSE-05)", "PC-FSE-05");
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return nd(`ramas_secas_pct_copa fuera de rango (0–100 %, > 0) (${pct}) (D-77)`);
  if (pct < 10) return ind("leve", "PC-FSE-02");
  if (pct <= 50) return ind("moderada", "PC-FSE-03");
  return ind("severa", "PC-FSE-04");
}

/** PC-FQU-01 a 04: la pieza suspendida fija Inminente. */
function evaluarFrondasQuebradas(input: PalmeraInput): IndicadorPalmera {
  const falta = faltaSiNo("ramas_quebradas", input.ramas_quebradas, "D-79", "PC-FQU, obligatorio");
  if (falta) return nd(falta);
  if (!input.ramas_quebradas) return ind("despreciable", "PC-FQU-01");
  const s = input.permanece_suspendida;
  if (s === null || s === undefined) return nd("permanece_suspendida sin registrar (PC-FQU-04)", "PC-FQU-04");
  if (!esBooleanoValido(s)) return nd(motivoFueraDominioSiNo("permanece_suspendida", s, "D-82"));
  return s ? piso("inminente", "PC-FQU-03") : ind("leve", "PC-FQU-02");
}

/** PC-COG-01 a 03: pudrición, colapso o ausencia fijan mínimo Probable; la desviación es solo observación. */
function evaluarCogollo(input: PalmeraInput): IndicadorPalmera {
  const v = input.anomalia_cogollo;
  if (v === null || v === undefined) return nd("anomalia_cogollo sin valor (PC-COG, D-312)");
  if (!esCodigoVigente("anomalia_cogollo", v)) return nd(`anomalia_cogollo fuera de dominio ("${v}") (D-312)`);
  if (v === "ninguna" || v === "desviacion") return ind("despreciable", "PC-COG-01");
  if (v === "no_determinado") return nd("anomalia_cogollo = No determinado", "PC-COG-03");
  return piso("probable", "PC-COG-02");
}

export function evaluarR03Palmera(input: PalmeraInput): ComponentePalmeraResultado<IndicadoresR03P> {
  const indicadores: Record<IndicadoresR03P, IndicadorPalmera> = {
    frondasSecas: evaluarFrondasSecas(input),
    frondasQuebradas: evaluarFrondasQuebradas(input),
    cogollo: evaluarCogollo(input),
    plaga: evaluarPlaga(input, "corona", "PC"),
  };
  if (indicadores.frondasQuebradas.piso === "inminente") return { indicadores, puntaje: null, probabilidadFalla: "inminente" };
  // Piso Probable: el máximo de la banda también es Probable, así que el resultado es Probable.
  if (indicadores.cogollo.piso === "probable") return { indicadores, puntaje: null, probabilidadFalla: "probable" };

  const { puntaje, motivo } = sumar(indicadores, {
    frondasSecas: "Frondas secas", frondasQuebradas: "Frondas o racimos quebrados", cogollo: "Cogollo", plaga: "Plaga",
  });
  if (puntaje === null) return { indicadores, puntaje: null, probabilidadFalla: "no_determinado", motivo };
  return { indicadores, puntaje, probabilidadFalla: banda(puntaje, 2) };
}

// ---------------------------------------------------------------------
// Condición fisiológica (Salida A): no entra en el riesgo
// ---------------------------------------------------------------------

export type VitalidadPalmera = 0 | 1 | 2 | 3 | 4 | 5 | "no_determinado";

/** D-311: la menor entre calidad y proporción; No determinado si alguna vale 6. null si falta un dato o está fuera de dominio. */
export function calcularVitalidadPalmera(input: EntradasPalmera): VitalidadPalmera | null {
  const c = input.calidad_copa_palmera;
  const p = input.proporcion_frondas_vivas;
  const valida = (x: unknown): x is ClaseCopaPalmeraCodigo => typeof x === "string" && esCodigoVigente("clase_copa_palmera", x);
  if (!valida(c) || !valida(p)) return null;
  if (c === "6" || p === "6") return "no_determinado";
  return Math.min(Number(c), Number(p)) as VitalidadPalmera;
}
