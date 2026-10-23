/**
 * M04 — Clasificación global de afectación a infraestructura
 * (REGLAS_INDICADORES: IN-GEN-01, IN-VER-01 a 06, IN-CAL-01 a 06,
 * IN-ALC-01 a 05, IN-VRT-01 a 05, IN-RAE-01 a 06, IN-RSU-01 a 07;
 * MATRICES_CALCULO M04). Fuente: Excel maestro 2.1.0.
 *
 * Seis componentes: vereda, calzada, alcorque y superficie permeable,
 * infraestructura vertical, red aérea, red subterránea. Cada uno
 * devuelve una categoría parcial (No aplica / Sin afectación / Leve /
 * Moderada / Severa / No determinado). D-170: los componentes No
 * aplica y No determinado se tratan igual — se excluyen del cálculo
 * (a diferencia de R04, aquí No determinado NUNCA bloquea el
 * resultado global: clasificacion_infraestructura siempre es Bajo,
 * Moderado, Alto, Crítico o No aplica — nunca No determinado).
 *
 * P_I = suma de los puntajes de los componentes incluidos (Sin
 * afectación=0, Leve=1, Moderada=2, Severa=3). n = cantidad de
 * componentes incluidos. Si n = 0 → No aplica. Si n > 0:
 * P_I% = P_I / (3 × n) × 100, con < 15 % Bajo, < 35 % Moderado,
 * < 65 % Alto, ≥ 65 % Crítico.
 *
 * Mismo patrón que R01–R03: el motor nunca rellena, supone ni
 * sustituye un dato.
 *
 * `reglaId`: el ID exacto de REGLAS_INDICADORES que produjo el
 * resultado (p. ej. "IN-VER-03", "IN-GEN-01" cuando el gate es lo que
 * excluyó el componente). `null` cuando el resultado es un corte
 * genérico por dato faltante, fuera de dominio o combinación inválida
 * que el diccionario exige pero que REGLAS_INDICADORES no numera.
 *
 * Simplificación explícita de esta implementación (aprobada):
 * `cumplimiento_distancia_seguridad_bt_mt` (D-142) es "Calculado por
 * plataforma" — se calcula aquí desde `distancia_copa_red_aerea_m`
 * (D-140), no se acepta como entrada ya resuelta.
 *
 * CC-043 (decisión de la responsable, 2026-10-22): `tipo_red_aerea`
 * (D-139) es selección múltiple completa (catálogo `tipo_red_aerea`,
 * 5 valores). El Excel no define cómo tratar "Función no determinada"
 * en las reglas IN-RAE; la decisión (opción B) es: si la selección
 * incluye Función no determinada y NO incluye Eléctrica, el
 * componente queda no_determinado (podría ser eléctrica); si incluye
 * Eléctrica, se aplican IN-RAE-02 a 04 aunque también esté marcada
 * Función no determinada. Pendiente llevar el texto a REGLAS_
 * INDICADORES (IN-RAE) y a D-139 en la próxima versión del paquete.
 * Este caso de CC-043 no tiene un ID numerado de REGLAS_INDICADORES,
 * así que su `reglaId` queda `null` (igual que cualquier otro corte
 * genérico), con "CC-043" citado en el motivo.
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
  reduce_circulacion_peatonal: boolean | null; // D-105, condicional: dano_interferencia_vereda = Sí
  impide_paso_seguro: boolean | null; // D-107, condicional: dano_interferencia_vereda = Sí

  // Calzada (IN-CAL)
  existe_calzada: boolean | null; // D-108, condicional: infraestructura_inmediata = Sí
  dano_interferencia_calzada: boolean | null; // D-110, condicional: existe_calzada = Sí
  levantamiento_calzada: boolean | null; // D-111, condicional: dano_interferencia_calzada = Sí
  hundimiento_calzada: boolean | null; // D-113, condicional: dano_interferencia_calzada = Sí
  desnivel_max_calzada_cm: number | null; // D-115, condicional: levantamiento_calzada = Sí o hundimiento_calzada = Sí; cm > 0
  afecta_circulacion_vehicular: boolean | null; // D-117, condicional: dano_interferencia_calzada = Sí

  // Alcorque y superficie permeable (IN-ALC) — se evalúa siempre (IN-ALC-05)
  suelo_sellado_impermeabilizado: boolean | null; // D-128, obligatorio
  indicios_compactacion_superficial: boolean | null; // D-127, obligatorio
  obstaculos_crecimiento_radicular: boolean | null; // D-129, obligatorio

  // Infraestructura vertical (IN-VRT)
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

/** IN-GEN-01 (primera cláusula): infraestructura_inmediata = No excluye vereda, calzada, infraestructura vertical, red aérea y red subterránea. */
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
  if (necesitaGrieta && input.ancho_max_grieta_vereda_cm === null) {
    return noDeterminadoInfra("ancho_max_grieta_vereda_cm sin valor pese a presenta_grieta_vereda = Sí (D-102)");
  }
  const errorGrieta = medicionInvalida(input.ancho_max_grieta_vereda_cm, "ancho_max_grieta_vereda_cm");
  if (errorGrieta) return noDeterminadoInfra(errorGrieta);

  const desnivel = input.desnivel_max_vereda_cm;
  const grieta = input.ancho_max_grieta_vereda_cm;
  let base: CategoriaDeterminada;
  let baseRegla: string;
  if (desnivel !== null && desnivel > 5.0) {
    base = "severa";
    baseRegla = "IN-VER-03";
  } else if ((desnivel !== null && desnivel >= 2.5 && desnivel <= 5.0) || (grieta !== null && grieta >= 1)) {
    base = "moderada";
    baseRegla = "IN-VER-04";
  } else {
    base = "leve"; // ni levantamiento/hundimiento ni grieta activados (o activados bajo el umbral)
    baseRegla = "IN-VER-05";
  }

  if (input.reduce_circulacion_peatonal && input.impide_paso_seguro) {
    base = "severa"; // reemplaza la categoría obtenida en IN-VER-03 a 05
    baseRegla = "IN-VER-06";
  }
  return indicadorInfra(base, baseRegla);
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

/** IN-ALC-01 a 05. Se evalúa siempre (no la gatea infraestructura_inmediata). */
function evaluarAlcorque(input: M04Input): ResultadoComponenteInfraestructura {
  if (input.suelo_sellado_impermeabilizado === null) {
    return noDeterminadoInfra("suelo_sellado_impermeabilizado sin valor (D-128, obligatorio)");
  }
  if (!esBooleanoValido(input.suelo_sellado_impermeabilizado)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("suelo_sellado_impermeabilizado", input.suelo_sellado_impermeabilizado, "D-128"));
  }
  if (input.indicios_compactacion_superficial === null) {
    return noDeterminadoInfra("indicios_compactacion_superficial sin valor (D-127, obligatorio)");
  }
  if (!esBooleanoValido(input.indicios_compactacion_superficial)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("indicios_compactacion_superficial", input.indicios_compactacion_superficial, "D-127"));
  }
  if (input.obstaculos_crecimiento_radicular === null) {
    return noDeterminadoInfra("obstaculos_crecimiento_radicular sin valor (D-129, obligatorio)");
  }
  if (!esBooleanoValido(input.obstaculos_crecimiento_radicular)) {
    return noDeterminadoInfra(motivoFueraDominioSiNo("obstaculos_crecimiento_radicular", input.obstaculos_crecimiento_radicular, "D-129"));
  }

  const candidatos: Array<{ categoria: CategoriaDeterminada; reglaId: string }> = [];
  if (input.suelo_sellado_impermeabilizado) candidatos.push({ categoria: "severa", reglaId: "IN-ALC-01" });
  if (input.indicios_compactacion_superficial) candidatos.push({ categoria: "moderada", reglaId: "IN-ALC-02" });
  if (input.obstaculos_crecimiento_radicular) candidatos.push({ categoria: "leve", reglaId: "IN-ALC-03" });

  if (candidatos.length === 0) return indicadorInfra("sin_afectacion", "IN-ALC-05");
  if (candidatos.length === 1) return indicadorInfra(candidatos[0].categoria, candidatos[0].reglaId);
  // Dos o más condiciones: la más severa, bajo la regla de combinación IN-ALC-04.
  const masSevero = candidatos.reduce(masSeveraInfra);
  return indicadorInfra(masSevero.categoria, "IN-ALC-04");
}

/** IN-VRT-01 a 05. */
function evaluarInfraestructuraVertical(input: M04Input): ResultadoComponenteInfraestructura {
  const gate = gateInfraestructuraInmediata(input);
  if (gate !== null) return gate;

  if (input.contacto_interferencia_infraestructura_vertical === null) {
    return noDeterminadoInfra(
      "contacto_interferencia_infraestructura_vertical sin valor (D-131, condicional activado por infraestructura_inmediata = Sí)",
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

export interface M04Resultado {
  componentes: {
    vereda: ResultadoComponenteInfraestructura;
    calzada: ResultadoComponenteInfraestructura;
    alcorque: ResultadoComponenteInfraestructura;
    infraestructuraVertical: ResultadoComponenteInfraestructura;
    redAerea: ResultadoComponenteInfraestructura;
    redSubterranea: ResultadoComponenteInfraestructura;
  };
  puntajeInfraestructura: number | null; // P_I; null si n = 0
  pctInfraestructura: number | null; // P_I%; null si n = 0
  clasificacionInfraestructura: ClasificacionInfraestructuraCodigo; // nunca no_determinado (D-170)
}

function clasificarPct(pct: number): "bajo" | "moderado" | "alto" | "critico" {
  if (pct < 15) return "bajo";
  if (pct < 35) return "moderado";
  if (pct < 65) return "alto";
  return "critico"; // ≥ 65
}

export function evaluarM04(input: M04Input): M04Resultado {
  const vereda = evaluarVereda(input);
  const calzada = evaluarCalzada(input);
  const alcorque = evaluarAlcorque(input);
  const infraestructuraVertical = evaluarInfraestructuraVertical(input);
  const redAerea = evaluarRedAerea(input);
  const redSubterranea = evaluarRedSubterranea(input);

  const componentes = { vereda, calzada, alcorque, infraestructuraVertical, redAerea, redSubterranea };
  // D-170: No aplica y No determinado se excluyen por igual del cálculo.
  const incluidos = Object.values(componentes).filter((c) => c.puntaje !== null) as ResultadoComponenteInfraestructura[];
  const n = incluidos.length;

  if (n === 0) {
    return { componentes, puntajeInfraestructura: null, pctInfraestructura: null, clasificacionInfraestructura: "no_aplica" };
  }

  const puntajeInfraestructura = incluidos.reduce((acc, c) => acc + (c.puntaje as number), 0);
  const pctInfraestructura = (puntajeInfraestructura / (3 * n)) * 100;
  return {
    componentes,
    puntajeInfraestructura,
    pctInfraestructura,
    clasificacionInfraestructura: clasificarPct(pctInfraestructura),
  };
}
