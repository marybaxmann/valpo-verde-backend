/**
 * R02 — Tronco (REGLAS_INDICADORES: TR-CAV-01 a 11, TR-HER-01 a 04,
 * TR-COR-01 a 02, TR-GRI-01 a 06, TR-COD-01 a 04, TR-ADE-01 a 02,
 * TR-HON-01 a 03; MATRICES_CALCULO R02). Fuente: Excel maestro 3.0.0
 * (CC-070). No depende de treeRisk.ts ni de docs/methodology.
 *
 * Pisos, que se aplican primero: grieta en la unión codominante o
 * grieta transversal en la madera → Inminente; cavidad Severa o grieta
 * longitudinal ≥ 1/3 de dap_cm → mínimo Probable. Con un piso no se
 * calcula puntaje y un dato faltante en otro indicador no lo bloquea.
 *
 * Sin piso, P_T = suma de los siete indicadores. Tramos: 0 improbable;
 * 1–3 posible; 4 o más probable. Exudaciones (TR-EXU) es contexto: se
 * informa, sin puntaje.
 *
 * Mismo patrón que R01: el motor nunca rellena, supone ni sustituye un
 * dato. Sin piso, un campo obligatorio o condicional activado sin
 * valor, fuera de rango o una combinación imposible deja el indicador
 * no_determinado con motivo — nunca 0 (CC-024) — y se propaga.
 *
 * SL_tronco_pct, R_radio_tronco_cm y t_R_tronco son "Calculado por
 * plataforma": este módulo recibe las mediciones crudas y los calcula
 * con variables-calculo.ts — nunca los recibe ya calculados.
 *
 * `reglaId`: el ID exacto de REGLAS_INDICADORES que produjo el
 * resultado. `null` cuando el resultado es un corte genérico por dato
 * faltante, fuera de dominio o combinación inválida que el diccionario
 * prohíbe pero que REGLAS_INDICADORES no numera.
 */

import {
  AfectacionGrietaCodigo,
  CondicionHeridaCodigo,
  DireccionGrietaCodigo,
  esCodigoVigente,
  ProbabilidadFallaCodigo,
  ResultadoCavidadInternaCodigo,
  SeveridadCodigo,
} from "./catalogs";
import type { IndicadorCondicion } from "./condicion-copa";
import {
  calcularAberturaCavidadPct,
  calcularRRadioTroncoCm,
  calcularSLTroncoPct,
  calcularTRTronco,
  ResultadoCalculo,
} from "./variables-calculo";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";

export const ALERTA_MEDIR_PUDRICION = "Medir pudrición interna con instrumento";

export interface R02Input {
  // --- Cavidad del tronco (TR-CAV) ---
  presenta_cavidad_pudricion_tronco: boolean | null; // obligatorio
  cavidad_externa_tronco: boolean | null; // condicional: activado por presenta_cavidad_pudricion_tronco = Sí
  cavidad_interna_tronco: ResultadoCavidadInternaCodigo | null; // condicional: activado por presenta_cavidad_pudricion_tronco = Sí
  D_diametro_tronco_cm: number | null; // D-54, condicional: presenta_cavidad_pudricion_tronco = Sí
  d_diametro_cavidad_tronco_cm: number | null; // D-55, condicional: cavidad_externa_tronco = Sí
  Cc_longitud_abertura_tronco_cm: number | null; // D-56, condicional: cavidad_externa_tronco = Sí
  C_circunferencia_tronco_cm: number | null; // D-57, condicional: cavidad_externa_tronco = Sí
  t_pared_residual_tronco_cm: number | null; // D-59, condicional: cavidad_interna_tronco = "si"

  // --- Heridas (TR-HER) ---
  presenta_heridas_tronco: boolean | null; // obligatorio
  condicion_heridas_tronco: CondicionHeridaCodigo | null; // condicional: activado por presenta_heridas_tronco = Sí

  // --- Corteza muerta o ausente (TR-COR) ---
  corteza_muerta_ausente: boolean | null; // obligatorio

  // --- Exudaciones (TR-EXU): contexto, sin puntaje ---
  presenta_exudaciones: boolean | null; // obligatorio

  // --- Fisuras y grietas (TR-GRI) ---
  presenta_fisura_grieta_tronco: boolean | null; // obligatorio
  afectacion_fisura_grieta: AfectacionGrietaCodigo | null; // condicional: activado por presenta_fisura_grieta_tronco = Sí
  direccion_grieta: DireccionGrietaCodigo | null; // condicional: activado por afectacion_fisura_grieta = penetra_en_madera
  longitud_max_grieta_cm: number | null; // D-70, condicional: grieta longitudinal en la madera
  dap_cm: number | null; // D-18 (ARBOLES): referencia de la grieta longitudinal

  // --- Codominancia (TR-COD) ---
  troncos_codominantes: boolean | null; // obligatorio
  grieta_union_codominante: boolean | null; // condicional: activado por troncos_codominantes = Sí
  corteza_incluida: boolean | null; // condicional: activado por troncos_codominantes = Sí (relevante cuando grieta_union_codominante = No)

  // --- Adelgazamiento y hongos (TR-ADE, TR-HON) ---
  adelgazamiento_insuficiente_tronco: boolean | null; // obligatorio
  cuerpos_fructiferos_tronco: boolean | null; // obligatorio
}

export interface IndicadorResultado {
  severidad: SeveridadCodigo | null; // null = no_determinado
  puntaje: number | null;
  reglaId: string | null; // el ID de REGLAS_INDICADORES que produjo el resultado; null si es un corte genérico
  noDeterminado: boolean;
  motivo?: string; // presente solo si noDeterminado = true
  alerta?: string; // TR-HON-02: aviso para el Inspector; no modifica el puntaje
}

const PUNTAJE_SEVERIDAD: Record<SeveridadCodigo, number> = {
  despreciable: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

const ORDEN_SEVERIDAD: SeveridadCodigo[] = ["despreciable", "leve", "moderada", "severa"];

function indicador(severidad: SeveridadCodigo, reglaId: string): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], reglaId, noDeterminado: false };
}

function noDeterminado(motivo: string, reglaId: string | null = null): IndicadorResultado {
  return { severidad: null, puntaje: null, reglaId, noDeterminado: true, motivo };
}

function masSevera(a: SeveridadCodigo, b: SeveridadCodigo): SeveridadCodigo {
  return ORDEN_SEVERIDAD.indexOf(a) >= ORDEN_SEVERIDAD.indexOf(b) ? a : b;
}

/** Rama SL (TR-CAV-02 a 05), aplicable cuando cavidad_externa_tronco = Sí. */
function evaluarPorSL(sl: ResultadoCalculo): IndicadorResultado {
  if (sl.valor === null) return noDeterminado(`SL_tronco_pct no calculable (TR-CAV-05): ${sl.motivo}`, "TR-CAV-05");
  if (sl.valor < 20) return indicador("leve", "TR-CAV-02");
  if (sl.valor < 33) return indicador("moderada", "TR-CAV-03");
  return indicador("severa", "TR-CAV-04");
}

/** Rama t/R (TR-CAV-06, 07, 08 y 11), aplicable cuando cavidad_interna_tronco = "si". */
function evaluarPorTR(tR: ResultadoCalculo): IndicadorResultado {
  if (tR.valor === null) return noDeterminado(`t_R_tronco no calculable (TR-CAV-08): ${tR.motivo}`, "TR-CAV-08");
  if (tR.valor >= 0.42) return indicador("leve", "TR-CAV-06");
  if (tR.valor >= 0.3) return indicador("moderada", "TR-CAV-11");
  return indicador("severa", "TR-CAV-07");
}

interface CavidadTroncoResultado {
  indicador: IndicadorResultado;
  SL_tronco_pct?: ResultadoCalculo;
  R_radio_tronco_cm?: ResultadoCalculo;
  t_R_tronco?: ResultadoCalculo;
  abertura_cavidad_tronco_pct?: ResultadoCalculo;
}

/** TR-CAV-01 a 11. */
function evaluarCavidadTronco(input: R02Input): CavidadTroncoResultado {
  if (input.presenta_cavidad_pudricion_tronco === null) {
    return { indicador: noDeterminado("presenta_cavidad_pudricion_tronco sin valor (TR-CAV, obligatorio)") };
  }
  if (!esBooleanoValido(input.presenta_cavidad_pudricion_tronco)) {
    return {
      indicador: noDeterminado(motivoFueraDominioSiNo("presenta_cavidad_pudricion_tronco", input.presenta_cavidad_pudricion_tronco, "D-51")),
    };
  }
  if (!input.presenta_cavidad_pudricion_tronco) return { indicador: indicador("despreciable", "TR-CAV-01") };

  if (input.cavidad_interna_tronco === null) {
    return {
      indicador: noDeterminado("cavidad_interna_tronco sin valor (TR-CAV, condicional activado por presenta_cavidad_pudricion_tronco = Sí)"),
    };
  }
  if (!esCodigoVigente("resultado_cavidad_interna", input.cavidad_interna_tronco)) {
    return { indicador: noDeterminado(`cavidad_interna_tronco tiene un código no reconocido ("${input.cavidad_interna_tronco}")`) };
  }
  const requiereInstrumental = input.cavidad_interna_tronco === "requiere_evaluacion_instrumental";
  const noDeterminadoInstrumental = () =>
    noDeterminado("cavidad_interna_tronco = Requiere evaluación instrumental (TR-CAV-09)", "TR-CAV-09");

  if (input.cavidad_externa_tronco === null) {
    if (requiereInstrumental) return { indicador: noDeterminadoInstrumental() };
    return {
      indicador: noDeterminado("cavidad_externa_tronco sin valor (TR-CAV, condicional activado por presenta_cavidad_pudricion_tronco = Sí)"),
    };
  }
  if (!esBooleanoValido(input.cavidad_externa_tronco)) {
    return { indicador: noDeterminado(motivoFueraDominioSiNo("cavidad_externa_tronco", input.cavidad_externa_tronco, "D-52")) };
  }

  let SL_tronco_pct: ResultadoCalculo | undefined;
  let abertura_cavidad_tronco_pct: ResultadoCalculo | undefined;
  let porSL: IndicadorResultado | null = null;
  if (input.cavidad_externa_tronco) {
    SL_tronco_pct = calcularSLTroncoPct({
      D_diametro_tronco_cm: input.D_diametro_tronco_cm,
      d_diametro_cavidad_tronco_cm: input.d_diametro_cavidad_tronco_cm,
      Cc_longitud_abertura_tronco_cm: input.Cc_longitud_abertura_tronco_cm,
      C_circunferencia_tronco_cm: input.C_circunferencia_tronco_cm,
    });
    abertura_cavidad_tronco_pct = calcularAberturaCavidadPct(input.Cc_longitud_abertura_tronco_cm, input.C_circunferencia_tronco_cm);
    porSL = evaluarPorSL(SL_tronco_pct);
  }

  if (requiereInstrumental) {
    // TR-21: una cavidad externa Severa fija el piso aunque la interna esté sin resolver.
    return {
      indicador: porSL?.severidad === "severa" ? porSL : noDeterminadoInstrumental(),
      SL_tronco_pct,
      abertura_cavidad_tronco_pct,
    };
  }

  let R_radio_tronco_cm: ResultadoCalculo | undefined;
  let t_R_tronco: ResultadoCalculo | undefined;
  let porTR: IndicadorResultado | null = null;
  if (input.cavidad_interna_tronco === "si") {
    R_radio_tronco_cm = calcularRRadioTroncoCm(input.D_diametro_tronco_cm);
    t_R_tronco = calcularTRTronco(input.t_pared_residual_tronco_cm, input.D_diametro_tronco_cm);
    porTR = evaluarPorTR(t_R_tronco);
  }
  const variables = { SL_tronco_pct, R_radio_tronco_cm, t_R_tronco, abertura_cavidad_tronco_pct };

  if (porSL === null && porTR === null) {
    // D-52/D-53: con presenta_cavidad_pudricion_tronco = Sí, externa e
    // interna no pueden ser ambas No. No se inventa una categoría.
    return {
      indicador: noDeterminado(
        "Combinación inválida: presenta_cavidad_pudricion_tronco = Sí con cavidad_externa_tronco = No y " +
          "cavidad_interna_tronco = No; la Fase 6 debe rechazar esta combinación antes de guardar.",
      ),
      ...variables,
    };
  }
  if (porSL === null || porTR === null) {
    return { indicador: (porSL ?? porTR)!, ...variables };
  }

  // Ambas vías activas: la más severa (TR-CAV-10). Una vía Severa fija el piso aunque la otra no se determine.
  if (porSL.severidad === "severa" || porTR.severidad === "severa") {
    return { indicador: indicador("severa", "TR-CAV-10"), ...variables };
  }
  if (porSL.noDeterminado || porTR.noDeterminado) {
    const motivos = [porSL, porTR].filter((p) => p.noDeterminado).map((p) => p.motivo);
    return { indicador: noDeterminado(`TR-CAV-10 (combinación externa+interna): ${motivos.join("; ")}`, "TR-CAV-10"), ...variables };
  }
  return { indicador: indicador(masSevera(porSL.severidad!, porTR.severidad!), "TR-CAV-10"), ...variables };
}

/** TR-HER-01 a 04. */
function evaluarHeridas(input: R02Input): IndicadorResultado {
  if (input.presenta_heridas_tronco === null) {
    return noDeterminado("presenta_heridas_tronco sin valor (TR-HER, obligatorio)");
  }
  if (!esBooleanoValido(input.presenta_heridas_tronco)) {
    return noDeterminado(motivoFueraDominioSiNo("presenta_heridas_tronco", input.presenta_heridas_tronco, "D-62"));
  }
  if (!input.presenta_heridas_tronco) return indicador("despreciable", "TR-HER-01");

  if (input.condicion_heridas_tronco === null) {
    return noDeterminado("condicion_heridas_tronco sin valor (TR-HER, condicional activado por presenta_heridas_tronco = Sí)");
  }
  if (!esCodigoVigente("condicion_herida", input.condicion_heridas_tronco)) {
    return noDeterminado(`condicion_heridas_tronco tiene un código no reconocido ("${input.condicion_heridas_tronco}")`);
  }
  if (input.condicion_heridas_tronco === "cerrada") return indicador("despreciable", "TR-HER-02");
  if (input.condicion_heridas_tronco === "en_proceso_de_cierre") return indicador("leve", "TR-HER-03");
  return indicador("moderada", "TR-HER-04"); // abierta
}

/** TR-COR-01 a 02. */
function evaluarCortezaMuertaAusente(input: R02Input): IndicadorResultado {
  if (input.corteza_muerta_ausente === null) {
    return noDeterminado("corteza_muerta_ausente sin valor (TR-COR, obligatorio)");
  }
  if (!esBooleanoValido(input.corteza_muerta_ausente)) {
    return noDeterminado(motivoFueraDominioSiNo("corteza_muerta_ausente", input.corteza_muerta_ausente, "D-64"));
  }
  return input.corteza_muerta_ausente ? indicador("leve", "TR-COR-02") : indicador("despreciable", "TR-COR-01");
}

export type CategoriaExudaciones = "sin_exudaciones" | "con_exudaciones";

/** TR-EXU-01 a 02: contexto para el Inspector, sin puntaje. */
export function evaluarExudaciones(input: Pick<R02Input, "presenta_exudaciones">): IndicadorCondicion<CategoriaExudaciones> {
  if (input.presenta_exudaciones === null) {
    return { categoria: null, reglaId: null, noDeterminado: true, motivo: "presenta_exudaciones sin valor (TR-EXU)" };
  }
  if (!esBooleanoValido(input.presenta_exudaciones)) {
    return { categoria: null, reglaId: null, noDeterminado: true, motivo: motivoFueraDominioSiNo("presenta_exudaciones", input.presenta_exudaciones, "D-65") };
  }
  return input.presenta_exudaciones
    ? { categoria: "con_exudaciones", reglaId: "TR-EXU-02", noDeterminado: false }
    : { categoria: "sin_exudaciones", reglaId: "TR-EXU-01", noDeterminado: false };
}

/** Longitud y DAP válidos, o el motivo por el que la grieta longitudinal no se puede graduar (TR-GRI-06). */
function motivoMedicionGrieta(longitud: number | null, dap: number | null): string | null {
  for (const [nombre, valor] of [["longitud_max_grieta_cm", longitud], ["dap_cm", dap]] as const) {
    if (valor === null) return `${nombre} sin valor`;
    if (!Number.isFinite(valor) || valor <= 0) return `${nombre} debe ser un número > 0 (${valor})`;
  }
  return null;
}

/** TR-GRI-01 a 06. */
function evaluarFisurasGrietas(input: R02Input): IndicadorResultado {
  if (input.presenta_fisura_grieta_tronco === null) {
    return noDeterminado("presenta_fisura_grieta_tronco sin valor (TR-GRI, obligatorio)");
  }
  if (!esBooleanoValido(input.presenta_fisura_grieta_tronco)) {
    return noDeterminado(motivoFueraDominioSiNo("presenta_fisura_grieta_tronco", input.presenta_fisura_grieta_tronco, "D-67"));
  }
  if (!input.presenta_fisura_grieta_tronco) return indicador("despreciable", "TR-GRI-01");

  if (input.afectacion_fisura_grieta === null) {
    return noDeterminado("afectacion_fisura_grieta sin valor (TR-GRI, condicional activado por presenta_fisura_grieta_tronco = Sí)");
  }
  if (!esCodigoVigente("afectacion_grieta", input.afectacion_fisura_grieta)) {
    return noDeterminado(`afectacion_fisura_grieta tiene un código no reconocido ("${input.afectacion_fisura_grieta}")`);
  }
  if (input.afectacion_fisura_grieta === "solo_corteza") return indicador("despreciable", "TR-GRI-02");

  // afectacion_fisura_grieta = "penetra_en_madera"
  if (input.direccion_grieta === null) {
    return noDeterminado("direccion_grieta sin valor (TR-GRI, condicional activado por afectacion_fisura_grieta = penetra_en_madera)");
  }
  if (!esCodigoVigente("direccion_grieta", input.direccion_grieta)) {
    return noDeterminado(`direccion_grieta tiene un código no reconocido ("${input.direccion_grieta}")`);
  }
  if (input.direccion_grieta !== "longitudinal") return indicador("severa", "TR-GRI-04");

  const motivo = motivoMedicionGrieta(input.longitud_max_grieta_cm, input.dap_cm);
  if (motivo) return noDeterminado(`Grieta longitudinal sin medir (TR-GRI-06): ${motivo}`, "TR-GRI-06");
  // Se compara longitud × 3 con el DAP para evitar el error de redondeo de 1/3.
  return input.longitud_max_grieta_cm! * 3 < input.dap_cm! ? indicador("moderada", "TR-GRI-03") : indicador("severa", "TR-GRI-05");
}

/** TR-COD-01 a 04. */
function evaluarCodominancia(input: R02Input): IndicadorResultado {
  if (input.troncos_codominantes === null) {
    return noDeterminado("troncos_codominantes sin valor (TR-COD, obligatorio)");
  }
  if (!esBooleanoValido(input.troncos_codominantes)) {
    return noDeterminado(motivoFueraDominioSiNo("troncos_codominantes", input.troncos_codominantes, "D-72"));
  }
  if (!input.troncos_codominantes) return indicador("despreciable", "TR-COD-01");

  if (input.grieta_union_codominante === null) {
    return noDeterminado("grieta_union_codominante sin valor (TR-COD, condicional activado por troncos_codominantes = Sí)");
  }
  if (!esBooleanoValido(input.grieta_union_codominante)) {
    return noDeterminado(motivoFueraDominioSiNo("grieta_union_codominante", input.grieta_union_codominante, "D-74"));
  }
  if (input.grieta_union_codominante) return indicador("severa", "TR-COD-02");

  if (input.corteza_incluida === null) {
    return noDeterminado("corteza_incluida sin valor (TR-COD, condicional activado por troncos_codominantes = Sí)");
  }
  if (!esBooleanoValido(input.corteza_incluida)) {
    return noDeterminado(motivoFueraDominioSiNo("corteza_incluida", input.corteza_incluida, "D-73"));
  }
  return input.corteza_incluida ? indicador("moderada", "TR-COD-03") : indicador("leve", "TR-COD-04");
}

/** TR-ADE-01 a 02. */
function evaluarAdelgazamiento(input: R02Input): IndicadorResultado {
  const valor = input.adelgazamiento_insuficiente_tronco;
  if (valor === null) return noDeterminado("adelgazamiento_insuficiente_tronco sin valor (TR-ADE, obligatorio)");
  if (!esBooleanoValido(valor)) return noDeterminado(motivoFueraDominioSiNo("adelgazamiento_insuficiente_tronco", valor, "CC-070"));
  return valor ? indicador("leve", "TR-ADE-02") : indicador("despreciable", "TR-ADE-01");
}

/** TR-HON-01 a 03. Si ya hay cavidad registrada, la pudrición está valorada allí y no se cuenta dos veces. */
function evaluarHongos(input: R02Input): IndicadorResultado {
  const valor = input.cuerpos_fructiferos_tronco;
  if (valor === null) return noDeterminado("cuerpos_fructiferos_tronco sin valor (TR-HON, obligatorio)");
  if (!esBooleanoValido(valor)) return noDeterminado(motivoFueraDominioSiNo("cuerpos_fructiferos_tronco", valor, "CC-070"));
  if (!valor) return indicador("despreciable", "TR-HON-01");

  const cavidad = input.presenta_cavidad_pudricion_tronco;
  if (cavidad === null || !esBooleanoValido(cavidad)) {
    return noDeterminado("cuerpos_fructiferos_tronco = Sí sin un valor válido en presenta_cavidad_pudricion_tronco (TR-HON)");
  }
  if (cavidad) return indicador("despreciable", "TR-HON-03");
  return { ...indicador("leve", "TR-HON-02"), alerta: ALERTA_MEDIR_PUDRICION };
}

export interface R02Resultado {
  indicadores: {
    cavidadTronco: IndicadorResultado;
    heridas: IndicadorResultado;
    cortezaMuertaAusente: IndicadorResultado;
    fisurasGrietas: IndicadorResultado;
    codominancia: IndicadorResultado;
    adelgazamiento: IndicadorResultado;
    hongos: IndicadorResultado;
  };
  /** Variables calculadas, solo cuando la rama correspondiente se activó. */
  variablesCalculo: {
    SL_tronco_pct?: ResultadoCalculo;
    R_radio_tronco_cm?: ResultadoCalculo;
    t_R_tronco?: ResultadoCalculo;
    abertura_cavidad_tronco_pct?: ResultadoCalculo;
  };
  /** null si probabilidadFalla = no_determinado o si aplicó un piso. */
  puntaje: number | null;
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje === 0) return "improbable";
  if (puntaje <= 3) return "posible";
  return "probable"; // 4 o más
}

export function evaluarR02(input: R02Input): R02Resultado {
  const cavidad = evaluarCavidadTronco(input);
  const heridas = evaluarHeridas(input);
  const cortezaMuertaAusente = evaluarCortezaMuertaAusente(input);
  const fisurasGrietas = evaluarFisurasGrietas(input);
  const codominancia = evaluarCodominancia(input);
  const adelgazamiento = evaluarAdelgazamiento(input);
  const hongos = evaluarHongos(input);

  const indicadores = { cavidadTronco: cavidad.indicador, heridas, cortezaMuertaAusente, fisurasGrietas, codominancia, adelgazamiento, hongos };
  const variablesCalculo = {
    SL_tronco_pct: cavidad.SL_tronco_pct,
    R_radio_tronco_cm: cavidad.R_radio_tronco_cm,
    t_R_tronco: cavidad.t_R_tronco,
    abertura_cavidad_tronco_pct: cavidad.abertura_cavidad_tronco_pct,
  };

  // Los pisos se aplican antes de propagar No determinado (TR-19 e, TR-21).
  if (codominancia.reglaId === "TR-COD-02" || fisurasGrietas.reglaId === "TR-GRI-04") {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "inminente" };
  }
  if (cavidad.indicador.severidad === "severa" || fisurasGrietas.reglaId === "TR-GRI-05") {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "probable" };
  }

  const motivos: string[] = [];
  if (cavidad.indicador.noDeterminado) motivos.push(`Cavidad del tronco: ${cavidad.indicador.motivo}`);
  if (heridas.noDeterminado) motivos.push(`Heridas: ${heridas.motivo}`);
  if (cortezaMuertaAusente.noDeterminado) motivos.push(`Corteza muerta o ausente: ${cortezaMuertaAusente.motivo}`);
  if (fisurasGrietas.noDeterminado) motivos.push(`Fisuras y grietas: ${fisurasGrietas.motivo}`);
  if (codominancia.noDeterminado) motivos.push(`Codominancia: ${codominancia.motivo}`);
  if (adelgazamiento.noDeterminado) motivos.push(`Adelgazamiento: ${adelgazamiento.motivo}`);
  if (hongos.noDeterminado) motivos.push(`Hongos: ${hongos.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje = Object.values(indicadores).reduce((suma, i) => suma + i.puntaje!, 0);
  return { indicadores, variablesCalculo, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
