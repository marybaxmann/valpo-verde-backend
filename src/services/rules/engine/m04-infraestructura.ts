/**
 * M04 — Clasificación global de infraestructura (REGLAS_INDICADORES:
 * IN-GEN-01, IN-VER-01 a 11, IN-CAL-01 a 06, IN-ALC-01 a 06, IN-VRT-01 a
 * 06, IN-RAE-01 a 06, IN-RSU-01 a 07, IN-SIT-01 a 05; MATRICES_CALCULO
 * M04). Fuente: Excel maestro 3.0.0 (CC-070).
 *
 * Seis componentes: vereda, calzada, alcorque, infraestructura vertical,
 * red aérea y red subterránea. Cada uno devuelve una categoría parcial
 * (No aplica / Sin afectación / Leve / Moderada / Severa / No
 * determinado). Los componentes No aplica y No determinado se excluyen
 * (D-170): No determinado nunca bloquea el resultado global, pero lo
 * marca como parcial (`componentesNoDeterminados`).
 *
 * Clasificación según el peor componente evaluado: Sin afectación o Leve
 * → Bajo; Moderada → Moderado; una Severa → Alto; dos o más Severas →
 * Crítico; sin componentes evaluados → No aplica. Los puntajes de los
 * componentes solo expresan el orden de severidad: P_I y P_I% ya no
 * existen, y `puntajeInfraestructura`/`pctInfraestructura` quedan null.
 *
 * La condición del sitio (IN-SIT) es un resultado propio: se calcula
 * siempre y, si hay alcorque, se considera en su clasificación.
 *
 * Mismo patrón que R01–R03: el motor nunca rellena, supone ni sustituye
 * un dato.
 *
 * `reglaId`: el ID exacto de REGLAS_INDICADORES que produjo el
 * resultado. `null` cuando el resultado es un corte genérico por dato
 * faltante, fuera de dominio o combinación inválida.
 *
 * CC-043: si `tipo_red_aerea` incluye Función no determinada y no
 * Eléctrica, el componente queda no_determinado; si incluye Eléctrica,
 * se aplican IN-RAE-02 a 04.
 */

import {
  CategoriaInfraestructuraCodigo,
  ClasificacionInfraestructuraCodigo,
  esCodigoVigente,
  SiNoNoDeterminadoCodigo,
  TipoRedAereaCodigo,
} from "./catalogs";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";

export interface M04Input {
  infraestructura_inmediata: boolean | null; // D-91, obligatorio
  interferencia_redes_servicios: boolean | null; // D-136, condicional: infraestructura_inmediata = Sí

  // Vereda (IN-VER)
  existe_vereda: boolean | null; // D-92, condicional: infraestructura_inmediata = Sí
  dano_interferencia_vereda: boolean | null; // D-94, condicional: existe_vereda = Sí
  presenta_levantamiento_vereda: boolean | null; // D-95, condicional: dano_interferencia_vereda = Sí
  presenta_grieta_vereda: boolean | null; // D-97, condicional: dano_interferencia_vereda = Sí
  presenta_hundimiento_vereda: boolean | null; // D-99, condicional: dano_interferencia_vereda = Sí
  desnivel_max_vereda_cm: number | null; // D-100, condicional: presenta_levantamiento_vereda = Sí o presenta_hundimiento_vereda = Sí; cm > 0
  ancho_max_grieta_vereda_cm: number | null; // D-102, condicional: presenta_grieta_vereda = Sí; cm > 0
  numero_grietas_vereda: number | null; // D-101, condicional: presenta_grieta_vereda = Sí; entero ≥ 1
  longitud_max_grieta_vereda_cm: number | null; // D-103, condicional: presenta_grieta_vereda = Sí; cm > 0
  ancho_libre_remanente_m: number | null; // D-106, necesario si reduce_circulacion_peatonal = Sí; m ≥ 0
  reduce_circulacion_peatonal: boolean | null; // D-105, condicional: dano_interferencia_vereda = Sí
  impide_paso_seguro: boolean | null; // D-107, condicional: dano_interferencia_vereda = Sí

  // Calzada (IN-CAL)
  existe_calzada: boolean | null; // D-108, condicional: infraestructura_inmediata = Sí
  dano_interferencia_calzada: boolean | null; // D-110, condicional: existe_calzada = Sí
  levantamiento_calzada: boolean | null; // D-111, condicional: dano_interferencia_calzada = Sí
  hundimiento_calzada: boolean | null; // D-113, condicional: dano_interferencia_calzada = Sí
  desnivel_max_calzada_cm: number | null; // D-115, condicional: levantamiento_calzada = Sí o hundimiento_calzada = Sí; cm > 0
  afecta_circulacion_vehicular: boolean | null; // D-117, condicional: dano_interferencia_calzada = Sí

  // Alcorque (IN-ALC) y condición del sitio (IN-SIT)
  existe_alcorque: boolean | null; // D-120, condicional: infraestructura_inmediata = Sí
  dano_interferencia_alcorque: boolean | null; // D-126, condicional: existe_alcorque = Sí
  suelo_sellado_impermeabilizado: boolean | null; // D-128, obligatorio
  indicios_compactacion_superficial: boolean | null; // D-127, obligatorio
  obstaculos_crecimiento_radicular: boolean | null; // D-129, obligatorio

  // Infraestructura vertical (IN-VRT)
  existe_elemento_vertical: boolean | null; // D-130, condicional: infraestructura_inmediata = Sí
  contacto_interferencia_infraestructura_vertical: boolean | null; // D-131, condicional: infraestructura_inmediata = Sí
  dano_fisico_observable_infraestructura_vertical: boolean | null; // D-134, condicional: contacto = Sí
  compromete_estabilidad_funcionalidad: boolean | null; // D-135, condicional: contacto = Sí

  // Red aérea (IN-RAE)
  red_aerea_presente: boolean | null; // D-137, condicional: interferencia_redes_servicios = Sí
  tipo_red_aerea: TipoRedAereaCodigo[] | null; // D-139, selección múltiple, condicional: red_aerea_presente = Sí
  distancia_copa_red_aerea_m: number | null; // D-140, condicional: tipo_red_aerea incluye Eléctrica
  dano_interferencia_red_aerea: boolean | null; // D-141, condicional: red_aerea_presente = Sí

  // Red subterránea (IN-RSU)
  red_subterranea_presente: SiNoNoDeterminadoCodigo | null; // D-138, condicional: interferencia_redes_servicios = Sí
  afectacion_fisica_red_subterranea: boolean | null; // D-145, condicional: red_subterranea_presente = Sí
  compromete_funcionalidad_red_subterranea: SiNoNoDeterminadoCodigo | null; // D-146, condicional: red_subterranea_presente = Sí
}

export interface ResultadoComponenteInfraestructura {
  categoria: CategoriaInfraestructuraCodigo;
  puntaje: number | null; // null cuando categoria = no_aplica o no_determinado (D-170: excluidos de P_I y n)
  reglaId: string | null; // el ID de REGLAS_INDICADORES que produjo el resultado; null si es un corte genérico
  motivo?: string; // presente cuando categoria = no_aplica o no_determinado
}

type CategoriaDeterminada = "sin_afectacion" | "leve" | "moderada" | "severa";

const PUNTAJE_CATEGORIA: Record<CategoriaDeterminada, number> = {
  sin_afectacion: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

const ORDEN_CATEGORIA: CategoriaDeterminada[] = ["sin_afectacion", "leve", "moderada", "severa"];

function masSeveraInfra(
  a: { categoria: CategoriaDeterminada; reglaId: string },
  b: { categoria: CategoriaDeterminada; reglaId: string },
): { categoria: CategoriaDeterminada; reglaId: string } {
  return ORDEN_CATEGORIA.indexOf(a.categoria) >= ORDEN_CATEGORIA.indexOf(b.categoria) ? a : b;
}

function indicadorInfra(categoria: CategoriaDeterminada, reglaId: string): ResultadoComponenteInfraestructura {
  return { categoria, puntaje: PUNTAJE_CATEGORIA[categoria], reglaId };
}

function noAplica(motivo: string, reglaId: string | null = null): ResultadoComponenteInfraestructura {
  return { categoria: "no_aplica", puntaje: null, reglaId, motivo };
}

function noDeterminadoInfra(motivo: string, reglaId: string | null = null): ResultadoComponenteInfraestructura {
  return { categoria: "no_determinado", puntaje: null, reglaId, motivo };
}

/** Valida que una medición numérica opcional, si se informa, sea un número finito > 0. */
function medicionInvalida(valor: number | null, nombre: string): string | null {
  if (valor === null) return null; // no informada: válida — "no cumple la condición", no es un error (IN-VER-05/IN-CAL-05)
  if (!Number.isFinite(valor)) return `${nombre} no es un número finito (${valor})`;
  if (valor <= 0) return `${nombre} debe ser > 0 si se informa (${valor})`;
  return null;
}

/** IN-GEN-01 (primera cláusula): infraestructura_inmediata = No excluye todos los componentes, incluido el alcorque. */
function gateInfraestructuraInmediata(input: M04Input): ResultadoComponenteInfraestructura | null {
  if (input.infraestructura_inmediata === null) {
    return noDeterminadoInfra("infraestructura_inmediata sin valor (D-91, obligatorio)");
  }
  if (!esBooleanoValido(input.infraestructura_inmediata)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("infraestructura_inmediata", input.infraestructura_inmediata, "D-91"));
  }
  if (!input.infraestructura_inmediata) {
    return noAplica("infraestructura_inmediata = No (IN-GEN-01): queda sin activar", "IN-GEN-01");
  }
  return null; // el gate pasa; el componente sigue evaluándose
}

/** IN-GEN-01 (segunda cláusula): interferencia_redes_servicios = No excluye red aérea y red subterránea. */
function gateRedesServicios(input: M04Input): ResultadoComponenteInfraestructura | null {
  const gateGeneral = gateInfraestructuraInmediata(input);
  if (gateGeneral !== null) return gateGeneral;
  if (input.interferencia_redes_servicios === null) {
    return noDeterminadoInfra("interferencia_redes_servicios sin valor (D-136, condicional activado por infraestructura_inmediata = Sí)");
  }
  if (!esBooleanoValido(input.interferencia_redes_servicios)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("interferencia_redes_servicios", input.interferencia_redes_servicios, "D-136"));
  }
  if (!input.interferencia_redes_servicios) {
    return noAplica("interferencia_redes_servicios = No (IN-GEN-01): queda sin activar", "IN-GEN-01");
  }
  return null;
}

/** IN-VER-01 a 06. */
function evaluarVereda(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateInfraestructuraInmediata(input);
  if (gate !== null) return gate;

  if (input.existe_vereda === null) {
    return noDeterminadoInfra("existe_vereda sin valor (D-92, condicional activado por infraestructura_inmediata = Sí)");
  }
  if (!esBooleanoValido(input.existe_vereda)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("existe_vereda", input.existe_vereda, "D-92"));
  }
  if (!input.existe_vereda) return noAplica("existe_vereda = No (IN-VER-01)", "IN-VER-01");

  if (input.dano_interferencia_vereda === null) {
    return noDeterminadoInfra("dano_interferencia_vereda sin valor (D-94, condicional activado por existe_vereda = Sí)");
  }
  if (!esBooleanoValido(input.dano_interferencia_vereda)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("dano_interferencia_vereda", input.dano_interferencia_vereda, "D-94"));
  }
  if (!input.dano_interferencia_vereda) return indicadorInfra("sin_afectacion", "IN-VER-02");

  // Activadores de las mediciones (D-95, D-97, D-99): una vez que el
  // daño está confirmado, estos tres son obligatorios — no se ignoran.
  if (input.presenta_levantamiento_vereda === null) {
    return noDeterminadoInfra("presenta_levantamiento_vereda sin valor (D-95, condicional activado por dano_interferencia_vereda = Sí)");
  }
  if (!esBooleanoValido(input.presenta_levantamiento_vereda)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("presenta_levantamiento_vereda", input.presenta_levantamiento_vereda, "D-95"));
  }
  if (input.presenta_hundimiento_vereda === null) {
    return noDeterminadoInfra("presenta_hundimiento_vereda sin valor (D-99, condicional activado por dano_interferencia_vereda = Sí)");
  }
  if (!esBooleanoValido(input.presenta_hundimiento_vereda)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("presenta_hundimiento_vereda", input.presenta_hundimiento_vereda, "D-99"));
  }
  if (input.presenta_grieta_vereda === null) {
    return noDeterminadoInfra("presenta_grieta_vereda sin valor (D-97, condicional activado por dano_interferencia_vereda = Sí)");
  }
  if (!esBooleanoValido(input.presenta_grieta_vereda)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("presenta_grieta_vereda", input.presenta_grieta_vereda, "D-97"));
  }
  if (input.reduce_circulacion_peatonal === null) {
    return noDeterminadoInfra("reduce_circulacion_peatonal sin valor (D-105, condicional activado por dano_interferencia_vereda = Sí)");
  }
  if (!esBooleanoValido(input.reduce_circulacion_peatonal)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("reduce_circulacion_peatonal", input.reduce_circulacion_peatonal, "D-105"));
  }
  if (input.impide_paso_seguro === null) {
    return noDeterminadoInfra("impide_paso_seguro sin valor (D-107, condicional activado por dano_interferencia_vereda = Sí)");
  }
  if (!esBooleanoValido(input.impide_paso_seguro)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("impide_paso_seguro", input.impide_paso_seguro, "D-107"));
  }

  // Si el activador correspondiente es Sí, la medición debe estar
  // informada — no se trata como "no cumple" (eso solo vale cuando el
  // activador es No: IN-VER-05).
  const necesitaDesnivel = input.presenta_levantamiento_vereda || input.presenta_hundimiento_vereda;
  if (necesitaDesnivel && input.desnivel_max_vereda_cm === null) {
    return noDeterminadoInfra(
      "desnivel_max_vereda_cm sin valor pese a presenta_levantamiento_vereda o presenta_hundimiento_vereda = Sí (D-100)",
    );
  }
  const errorDesnivel = medicionInvalida(input.desnivel_max_vereda_cm, "desnivel_max_vereda_cm");
  if (errorDesnivel) return noDeterminadoInfra(errorDesnivel);

  const necesitaGrieta = input.presenta_grieta_vereda;
  if (necesitaGrieta) {
    for (const [valor, nombre, fila] of [
      [input.ancho_max_grieta_vereda_cm, "ancho_max_grieta_vereda_cm", "D-102"],
      [input.numero_grietas_vereda, "numero_grietas_vereda", "D-101"],
      [input.longitud_max_grieta_vereda_cm, "longitud_max_grieta_vereda_cm", "D-103"],
    ] as const) {
      if (valor === null) return noDeterminadoInfra(`${nombre} sin valor pese a presenta_grieta_vereda = Sí (${fila})`);
    }
    if (!Number.isInteger(input.numero_grietas_vereda) || input.numero_grietas_vereda! < 1) {
      return noDeterminadoInfra(`numero_grietas_vereda debe ser un entero ≥ 1 (${input.numero_grietas_vereda}) (D-101)`);
    }
  }
  for (const [valor, nombre] of [
    [input.ancho_max_grieta_vereda_cm, "ancho_max_grieta_vereda_cm"],
    [input.longitud_max_grieta_vereda_cm, "longitud_max_grieta_vereda_cm"],
  ] as const) {
    const error = medicionInvalida(valor, nombre);
    if (error) return noDeterminadoInfra(error);
  }

  const ancho = input.ancho_libre_remanente_m;
  if (input.reduce_circulacion_peatonal) {
    if (ancho === null) return noDeterminadoInfra("ancho_libre_remanente_m sin valor pese a reduce_circulacion_peatonal = Sí (D-106)");
    if (!Number.isFinite(ancho) || ancho < 0) return noDeterminadoInfra(`ancho_libre_remanente_m debe ser un número ≥ 0 (${ancho}) (D-106)`);
  }

  const candidatos: Array<{ categoria: CategoriaDeterminada; reglaId: string }> = [];
  const desnivel = input.desnivel_max_vereda_cm;
  if (desnivel !== null && desnivel > 5.0) candidatos.push({ categoria: "severa", reglaId: "IN-VER-03" });
  else if (desnivel !== null && desnivel >= 2.5) candidatos.push({ categoria: "moderada", reglaId: "IN-VER-04" });

  if (necesitaGrieta) {
    const n = input.numero_grietas_vereda!;
    const w = input.ancho_max_grieta_vereda_cm!;
    const l = input.longitud_max_grieta_vereda_cm!;
    if (n === 1 && w < 1 && l <= 30) candidatos.push({ categoria: "leve", reglaId: "IN-VER-07" });
    else if (n >= 2 && w >= 1 && l > 60) candidatos.push({ categoria: "severa", reglaId: "IN-VER-08" });
    else candidatos.push({ categoria: "moderada", reglaId: "IN-VER-09" });
  }

  if (input.reduce_circulacion_peatonal) {
    if (ancho! < 0.9) candidatos.push({ categoria: "severa", reglaId: "IN-VER-11" });
    else if (ancho! < 1.2) candidatos.push({ categoria: "moderada", reglaId: "IN-VER-10" });
    if (input.impide_paso_seguro) candidatos.push({ categoria: "severa", reglaId: "IN-VER-06" });
  }

  // Sin ninguna condición anterior, el daño confirmado es Leve (IN-VER-05). La vereda toma la más severa.
  const resultado = [...candidatos, { categoria: "leve" as const, reglaId: "IN-VER-05" }].reduce(masSeveraInfra);
  return indicadorInfra(resultado.categoria, resultado.reglaId);
}

/** IN-CAL-01 a 06. */
function evaluarCalzada(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateInfraestructuraInmediata(input);
  if (gate !== null) return gate;

  if (input.existe_calzada === null) {
    return noDeterminadoInfra("existe_calzada sin valor (D-108, condicional activado por infraestructura_inmediata = Sí)");
  }
  if (!esBooleanoValido(input.existe_calzada)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("existe_calzada", input.existe_calzada, "D-108"));
  }
  if (!input.existe_calzada) return noAplica("existe_calzada = No (IN-CAL-01)", "IN-CAL-01");

  if (input.dano_interferencia_calzada === null) {
    return noDeterminadoInfra("dano_interferencia_calzada sin valor (D-110, condicional activado por existe_calzada = Sí)");
  }
  if (!esBooleanoValido(input.dano_interferencia_calzada)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("dano_interferencia_calzada", input.dano_interferencia_calzada, "D-110"));
  }
  if (!input.dano_interferencia_calzada) return indicadorInfra("sin_afectacion", "IN-CAL-02");

  if (input.levantamiento_calzada === null) {
    return noDeterminadoInfra("levantamiento_calzada sin valor (D-111, condicional activado por dano_interferencia_calzada = Sí)");
  }
  if (!esBooleanoValido(input.levantamiento_calzada)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("levantamiento_calzada", input.levantamiento_calzada, "D-111"));
  }
  if (input.hundimiento_calzada === null) {
    return noDeterminadoInfra("hundimiento_calzada sin valor (D-113, condicional activado por dano_interferencia_calzada = Sí)");
  }
  if (!esBooleanoValido(input.hundimiento_calzada)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("hundimiento_calzada", input.hundimiento_calzada, "D-113"));
  }
  if (input.afecta_circulacion_vehicular === null) {
    return noDeterminadoInfra("afecta_circulacion_vehicular sin valor (D-117, condicional activado por dano_interferencia_calzada = Sí)");
  }
  if (!esBooleanoValido(input.afecta_circulacion_vehicular)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("afecta_circulacion_vehicular", input.afecta_circulacion_vehicular, "D-117"));
  }

  const necesitaDesnivel = input.levantamiento_calzada || input.hundimiento_calzada;
  if (necesitaDesnivel && input.desnivel_max_calzada_cm === null) {
    return noDeterminadoInfra("desnivel_max_calzada_cm sin valor pese a levantamiento_calzada o hundimiento_calzada = Sí (D-115)");
  }
  const errorDesnivel = medicionInvalida(input.desnivel_max_calzada_cm, "desnivel_max_calzada_cm");
  if (errorDesnivel) return noDeterminadoInfra(errorDesnivel);

  const desnivel = input.desnivel_max_calzada_cm;
  let base: CategoriaDeterminada;
  let baseRegla: string;
  if (desnivel !== null && desnivel > 5.0) {
    base = "severa";
    baseRegla = "IN-CAL-03";
  } else if (desnivel !== null && desnivel >= 2.5 && desnivel <= 5.0) {
    base = "moderada";
    baseRegla = "IN-CAL-04";
  } else {
    base = "leve"; // levantamiento/hundimiento no activados (o activados bajo el umbral)
    baseRegla = "IN-CAL-05";
  }

  if (input.afecta_circulacion_vehicular && base === "leve") {
    base = "moderada"; // IN-CAL-06: Leve pasa a Moderada; Moderada y Severa se mantienen
    baseRegla = "IN-CAL-06";
  }
  return indicadorInfra(base, baseRegla);
}

type CondicionesSitio = { sellado: boolean; compactacion: boolean; obstaculos: boolean };

/** Las tres condiciones del sitio ya validadas, o el motivo por el que no se pueden usar. */
function leerCondicionesSitio(input: M04Input): CondicionesSitio | { motivo: string } {
  for (const [valor, nombre, fila] of [
    [input.suelo_sellado_impermeabilizado, "suelo_sellado_impermeabilizado", "D-128"],
    [input.indicios_compactacion_superficial, "indicios_compactacion_superficial", "D-127"],
    [input.obstaculos_crecimiento_radicular, "obstaculos_crecimiento_radicular", "D-129"],
  ] as const) {
    if (valor === null) return { motivo: `${nombre} sin valor (${fila}, obligatorio)` };
    if (!esBooleanoValido(valor)) return { motivo: motivoFueraDominioSiNo(nombre, valor, fila) };
  }
  return {
    sellado: input.suelo_sellado_impermeabilizado!,
    compactacion: input.indicios_compactacion_superficial!,
    obstaculos: input.obstaculos_crecimiento_radicular!,
  };
}

export type CategoriaCondicionSitio = "sin_restriccion" | "leve" | "moderada" | "severa";

export interface CondicionSitioResultado {
  categoria: CategoriaCondicionSitio | null; // null = no_determinado
  reglaId: string | null;
  motivo?: string;
}

/** IN-SIT-01 a 05. Se calcula siempre, también con infraestructura_inmediata = No. */
export function evaluarCondicionSitio(input: M04Input): CondicionSitioResultado {
  const c = leerCondicionesSitio(input);
  if ("motivo" in c) return { categoria: null, reglaId: null, motivo: c.motivo };
  const presentes = [c.obstaculos, c.compactacion, c.sellado].filter(Boolean).length;
  if (presentes === 0) return { categoria: "sin_restriccion", reglaId: "IN-SIT-01" };
  const categoria: CategoriaCondicionSitio = c.sellado ? "severa" : c.compactacion ? "moderada" : "leve";
  if (presentes > 1) return { categoria, reglaId: "IN-SIT-05" };
  return { categoria, reglaId: c.sellado ? "IN-SIT-04" : c.compactacion ? "IN-SIT-03" : "IN-SIT-02" };
}

/** IN-ALC-01 a 06: daño en sus límites combinado con la condición del sitio (IF-19). Nunca llega a Severa. */
function evaluarAlcorque(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateInfraestructuraInmediata(input);
  if (gate !== null) return gate;

  if (input.existe_alcorque === null) {
    return noDeterminadoInfra("existe_alcorque sin valor (D-120, condicional activado por infraestructura_inmediata = Sí)");
  }
  if (!esBooleanoValido(input.existe_alcorque)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("existe_alcorque", input.existe_alcorque, "D-120"));
  }
  if (!input.existe_alcorque) return noAplica("existe_alcorque = No (IN-ALC-01)", "IN-ALC-01");

  if (input.dano_interferencia_alcorque === null) {
    return noDeterminadoInfra("dano_interferencia_alcorque sin valor (D-126, condicional activado por existe_alcorque = Sí)");
  }
  if (!esBooleanoValido(input.dano_interferencia_alcorque)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("dano_interferencia_alcorque", input.dano_interferencia_alcorque, "D-126"));
  }
  const c = leerCondicionesSitio(input);
  if ("motivo" in c) return noDeterminadoInfra(c.motivo);

  const conCondicion = c.sellado || c.compactacion || c.obstaculos;
  if (input.dano_interferencia_alcorque) {
    return conCondicion ? indicadorInfra("moderada", "IN-ALC-06") : indicadorInfra("leve", "IN-ALC-05");
  }
  if (c.sellado) return indicadorInfra("moderada", "IN-ALC-04");
  return conCondicion ? indicadorInfra("leve", "IN-ALC-03") : indicadorInfra("sin_afectacion", "IN-ALC-02");
}

/** IN-VRT-01 a 06. */
function evaluarInfraestructuraVertical(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateInfraestructuraInmediata(input);
  if (gate !== null) return gate;

  if (input.existe_elemento_vertical === null) {
    return noDeterminadoInfra("existe_elemento_vertical sin valor (D-130, condicional activado por infraestructura_inmediata = Sí)");
  }
  if (!esBooleanoValido(input.existe_elemento_vertical)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("existe_elemento_vertical", input.existe_elemento_vertical, "D-130"));
  }
  if (!input.existe_elemento_vertical) return noAplica("existe_elemento_vertical = No (IN-VRT-06)", "IN-VRT-06");

  if (input.contacto_interferencia_infraestructura_vertical === null) {
    return noDeterminadoInfra(
      "contacto_interferencia_infraestructura_vertical sin valor (D-131, condicional activado por existe_elemento_vertical = Sí)",
    );
  }
  if (!esBooleanoValido(input.contacto_interferencia_infraestructura_vertical)) {
    return noDeterminadoInfra(
      motivoFueraDominioSiNo(
        "contacto_interferencia_infraestructura_vertical",
        input.contacto_interferencia_infraestructura_vertical,
        "D-131",
      ),
    );
  }
  if (!input.contacto_interferencia_infraestructura_vertical) return indicadorInfra("sin_afectacion", "IN-VRT-01");

  if (input.dano_fisico_observable_infraestructura_vertical === null) {
    return noDeterminadoInfra(
      "dano_fisico_observable_infraestructura_vertical sin valor (D-134, condicional activado por contacto = Sí)",
    );
  }
  if (!esBooleanoValido(input.dano_fisico_observable_infraestructura_vertical)) {
    return noDeterminadoInfra(
      motivoFueraDominioSiNo(
        "dano_fisico_observable_infraestructura_vertical",
        input.dano_fisico_observable_infraestructura_vertical,
        "D-134",
      ),
    );
  }
  if (input.compromete_estabilidad_funcionalidad === null) {
    return noDeterminadoInfra("compromete_estabilidad_funcionalidad sin valor (D-135, condicional activado por contacto = Sí)");
  }
  if (!esBooleanoValido(input.compromete_estabilidad_funcionalidad)) {
    return noDeterminadoInfra(
      motivoFueraDominioSiNo("compromete_estabilidad_funcionalidad", input.compromete_estabilidad_funcionalidad, "D-135"),
    );
  }

  const dano = input.dano_fisico_observable_infraestructura_vertical;
  const compromete = input.compromete_estabilidad_funcionalidad;
  if (!dano && !compromete) return indicadorInfra("leve", "IN-VRT-02");
  if (!dano && compromete) return indicadorInfra("moderada", "IN-VRT-03");
  if (dano && !compromete) return indicadorInfra("moderada", "IN-VRT-04");
  return indicadorInfra("severa", "IN-VRT-05");
}

/**
 * D-142: cumplimiento_distancia_seguridad_bt_mt, calculado desde
 * distancia_copa_red_aerea_m (D-140). Exportada para que el ensamblaje
 * (ensamblaje.ts) pueda incluirla en `calculados` sin duplicar la
 * fórmula — M04 la usa internamente para IN-RAE-02/03/04.
 */
export function calcularCumplimientoDistanciaSeguridad(distancia: number | null): "cumple" | "no_cumple" | null {
  if (distancia === null || !Number.isFinite(distancia) || distancia < 0) return null;
  return distancia >= 2.0 ? "cumple" : "no_cumple";
}

/** IN-RAE-01 a 06. */
function evaluarRedAerea(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateRedesServicios(input);
  if (gate !== null) return gate;

  if (input.red_aerea_presente === null) {
    return noDeterminadoInfra("red_aerea_presente sin valor (D-137, condicional activado por interferencia_redes_servicios = Sí)");
  }
  if (!esBooleanoValido(input.red_aerea_presente)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("red_aerea_presente", input.red_aerea_presente, "D-137"));
  }
  if (!input.red_aerea_presente) return noAplica("red_aerea_presente = No (IN-RAE-01)", "IN-RAE-01");

  if (input.tipo_red_aerea === null) {
    return noDeterminadoInfra("tipo_red_aerea sin valor (D-139, condicional activado por red_aerea_presente = Sí)");
  }
  if (!Array.isArray(input.tipo_red_aerea)) {
    return noDeterminadoInfra("tipo_red_aerea debe ser una lista de códigos (D-139)");
  }
  if (input.tipo_red_aerea.length === 0) {
    return noDeterminadoInfra("tipo_red_aerea sin selección: lista vacía (D-139)");
  }
  for (const codigo of input.tipo_red_aerea) {
    if (!esCodigoVigente("tipo_red_aerea", codigo)) {
      return noDeterminadoInfra(`tipo_red_aerea contiene un código no reconocido ("${codigo}")`);
    }
  }
  if (input.dano_interferencia_red_aerea === null) {
    return noDeterminadoInfra("dano_interferencia_red_aerea sin valor (D-141, condicional activado por red_aerea_presente = Sí)");
  }
  if (!esBooleanoValido(input.dano_interferencia_red_aerea)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("dano_interferencia_red_aerea", input.dano_interferencia_red_aerea, "D-141"));
  }

  const incluyeElectrica = input.tipo_red_aerea.includes("electrica");
  const incluyeFuncionNoDeterminada = input.tipo_red_aerea.includes("funcion_no_determinada");

  if (!incluyeElectrica && incluyeFuncionNoDeterminada) {
    // CC-043 (decisión de la responsable, 2026-10-22, opción B): si la
    // selección no incluye Eléctrica pero sí Función no determinada, no
    // se puede descartar que la red sea eléctrica — queda no_determinado.
    // No tiene un ID numerado de REGLAS_INDICADORES: reglaId queda null.
    return noDeterminadoInfra("función de la red no determinada: podría ser eléctrica (CC-043)");
  }

  if (!incluyeElectrica) {
    // IN-RAE-05 / IN-RAE-06 (sin Eléctrica ni Función no determinada)
    return input.dano_interferencia_red_aerea ? indicadorInfra("moderada", "IN-RAE-06") : indicadorInfra("leve", "IN-RAE-05");
  }

  // incluyeElectrica = true: se aplican IN-RAE-02 a 04, aunque la
  // selección también incluya Función no determinada (CC-043).
  const cumplimiento = calcularCumplimientoDistanciaSeguridad(input.distancia_copa_red_aerea_m);
  if (cumplimiento === null) {
    return noDeterminadoInfra("distancia_copa_red_aerea_m no calculable (D-140/D-142): sin valor, no finita o negativa");
  }
  if (cumplimiento === "no_cumple") return indicadorInfra("severa", "IN-RAE-02");
  // cumplimiento === "cumple"
  return input.dano_interferencia_red_aerea ? indicadorInfra("moderada", "IN-RAE-04") : indicadorInfra("leve", "IN-RAE-03");
}

/** IN-RSU-01 a 07. */
function evaluarRedSubterranea(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateRedesServicios(input);
  if (gate !== null) return gate;

  if (input.red_subterranea_presente === null) {
    return noDeterminadoInfra("red_subterranea_presente sin valor (D-138, condicional activado por interferencia_redes_servicios = Sí)");
  }
  if (!esCodigoVigente("si_no_no_determinado", input.red_subterranea_presente)) {
    return noDeterminadoInfra(`red_subterranea_presente tiene un código no reconocido ("${input.red_subterranea_presente}")`);
  }
  if (input.red_subterranea_presente === "no") return noAplica("red_subterranea_presente = No (IN-RSU-01)", "IN-RSU-01");
  if (input.red_subterranea_presente === "no_determinado") {
    return noDeterminadoInfra("red_subterranea_presente = No determinado (IN-RSU-02)", "IN-RSU-02");
  }

  // red_subterranea_presente === "si"
  if (input.afectacion_fisica_red_subterranea === null) {
    return noDeterminadoInfra("afectacion_fisica_red_subterranea sin valor (D-145, condicional activado por red_subterranea_presente = Sí)");
  }
  if (!esBooleanoValido(input.afectacion_fisica_red_subterranea)) {
    return noDeterminadoInfra(
      motivoFueraDominioSiNo("afectacion_fisica_red_subterranea", input.afectacion_fisica_red_subterranea, "D-145"),
    );
  }
  if (input.compromete_funcionalidad_red_subterranea === null) {
    return noDeterminadoInfra(
      "compromete_funcionalidad_red_subterranea sin valor (D-146, condicional activado por red_subterranea_presente = Sí)",
    );
  }
  if (!esCodigoVigente("si_no_no_determinado", input.compromete_funcionalidad_red_subterranea)) {
    return noDeterminadoInfra(
      `compromete_funcionalidad_red_subterranea tiene un código no reconocido ("${input.compromete_funcionalidad_red_subterranea}")`,
    );
  }

  const afectacion = input.afectacion_fisica_red_subterranea;
  const compromete = input.compromete_funcionalidad_red_subterranea;
  if (compromete === "si") return indicadorInfra("severa", "IN-RSU-03"); // con o sin afectación física
  if (afectacion && compromete === "no") return indicadorInfra("moderada", "IN-RSU-04");
  if (afectacion && compromete === "no_determinado") return indicadorInfra("moderada", "IN-RSU-05");
  if (!afectacion && compromete === "no") return indicadorInfra("sin_afectacion", "IN-RSU-06");
  // !afectacion && compromete === "no_determinado"
  return noDeterminadoInfra(
    "afectacion_fisica_red_subterranea = No y compromete_funcionalidad_red_subterranea = No determinado (IN-RSU-07)",
    "IN-RSU-07",
  );
}

export type ComponenteInfraestructura = "vereda" | "calzada" | "alcorque" | "infraestructuraVertical" | "redAerea" | "redSubterranea";

export interface M04Resultado {
  componentes: Record<ComponenteInfraestructura, ResultadoComponenteInfraestructura>;
  /** Ya no se calculan (peor componente): se mantienen en null por compatibilidad con la versión 2.1. */
  puntajeInfraestructura: null;
  pctInfraestructura: null;
  clasificacionInfraestructura: ClasificacionInfraestructuraCodigo; // nunca no_determinado (D-170)
  /** Componentes excluidos por No determinado. Con elementos, la clasificación es parcial (IF-21). */
  componentesNoDeterminados: ComponenteInfraestructura[];
  condicionSitio: CondicionSitioResultado;
}

function clasificarPeorComponente(categorias: CategoriaDeterminada[]): "bajo" | "moderado" | "alto" | "critico" {
  const severas = categorias.filter((c) => c === "severa").length;
  if (severas >= 2) return "critico";
  if (severas === 1) return "alto";
  return categorias.includes("moderada") ? "moderado" : "bajo";
}

export function evaluarM04(input: M04Input): M04Resultado {
  const componentes: M04Resultado["componentes"] = {
    vereda: evaluarVereda(input),
    calzada: evaluarCalzada(input),
    alcorque: evaluarAlcorque(input),
    infraestructuraVertical: evaluarInfraestructuraVertical(input),
    redAerea: evaluarRedAerea(input),
    redSubterranea: evaluarRedSubterranea(input),
  };
  const comunes = {
    componentes,
    puntajeInfraestructura: null,
    pctInfraestructura: null,
    componentesNoDeterminados: (Object.keys(componentes) as ComponenteInfraestructura[]).filter((k) => componentes[k].categoria === "no_determinado"),
    condicionSitio: evaluarCondicionSitio(input),
  };
  // D-170: No aplica y No determinado se excluyen por igual.
  const incluidas = Object.values(componentes)
    .filter((c) => c.puntaje !== null)
    .map((c) => c.categoria as CategoriaDeterminada);

  return { ...comunes, clasificacionInfraestructura: incluidas.length === 0 ? "no_aplica" : clasificarPeorComponente(incluidas) };
}
