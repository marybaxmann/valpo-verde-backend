/**
 * R02 — Tronco (REGLAS_INDICADORES: TR-CAV-01 a 10, TR-HER-01 a 04,
 * TR-COR-01 a 02, TR-EXU-01 a 02, TR-GRI-01 a 04, TR-COD-01 a 04;
 * MATRICES_CALCULO R02). Fuente: Excel maestro 2.1.0. No depende de
 * treeRisk.ts ni de docs/methodology.
 *
 * Seis indicadores parciales (Cavidad del tronco, Heridas, Corteza
 * muerta o ausente, Exudaciones, Fisuras y grietas, Codominancia).
 * Puntaje total P_T = suma de los seis, máximo 14. Tramos: 0–1
 * improbable; 2–4 posible; 5–7 probable; 8–14 inminente.
 *
 * Mismo patrón que R01 (src/services/rules/engine/r01-raices-cuello.ts):
 * el motor nunca rellena, supone ni sustituye un dato. Un campo
 * obligatorio o condicional activado sin valor, un valor fuera del
 * rango del diccionario, o una combinación imposible, deja el
 * indicador no_determinado con motivo — nunca 0 (CC-024) — y se
 * propaga al resultado completo.
 *
 * SL_tronco_pct, R_radio_tronco_cm y t_R_tronco son "Calculado por
 * plataforma... No admite ingreso manual" (D-68, D-70, D-71): este
 * módulo recibe las mediciones crudas y los calcula con
 * variables-calculo.ts — nunca los recibe ya calculados.
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
import { calcularRRadioTroncoCm, calcularSLTroncoPct, calcularTRTronco, ResultadoCalculo } from "./variables-calculo";
import { esBooleanoValido, motivoFueraDominioSiNo } from "./dominio";

export interface R02Input {
  // --- Cavidad del tronco (TR-CAV) ---
  presenta_cavidad_pudricion_tronco: boolean | null; // obligatorio
  cavidad_externa_tronco: boolean | null; // condicional: activado por presenta_cavidad_pudricion_tronco = Sí
  cavidad_interna_tronco: ResultadoCavidadInternaCodigo | null; // condicional: activado por presenta_cavidad_pudricion_tronco = Sí
  D_diametro_tronco_cm: number | null; // D-64, condicional: presenta_cavidad_pudricion_tronco = Sí
  d_diametro_cavidad_tronco_cm: number | null; // D-65, condicional: cavidad_externa_tronco = Sí
  Cc_longitud_abertura_tronco_cm: number | null; // D-66, condicional: cavidad_externa_tronco = Sí
  C_circunferencia_tronco_cm: number | null; // D-67, condicional: cavidad_externa_tronco = Sí
  t_pared_residual_tronco_cm: number | null; // D-69, condicional: cavidad_interna_tronco = "si"

  // --- Heridas (TR-HER) ---
  presenta_heridas_tronco: boolean | null; // obligatorio
  condicion_heridas_tronco: CondicionHeridaCodigo | null; // condicional: activado por presenta_heridas_tronco = Sí

  // --- Corteza muerta o ausente (TR-COR) ---
  corteza_muerta_ausente: boolean | null; // obligatorio

  // --- Exudaciones (TR-EXU) ---
  presenta_exudaciones: boolean | null; // obligatorio

  // --- Fisuras y grietas (TR-GRI) ---
  presenta_fisura_grieta_tronco: boolean | null; // obligatorio
  afectacion_fisura_grieta: AfectacionGrietaCodigo | null; // condicional: activado por presenta_fisura_grieta_tronco = Sí
  direccion_grieta: DireccionGrietaCodigo | null; // condicional: activado por afectacion_fisura_grieta = penetra_en_madera

  // --- Codominancia (TR-COD) ---
  troncos_codominantes: boolean | null; // obligatorio
  grieta_union_codominante: boolean | null; // condicional: activado por troncos_codominantes = Sí
  corteza_incluida: boolean | null; // condicional: activado por troncos_codominantes = Sí (relevante cuando grieta_union_codominante = No)
}

export interface IndicadorResultado {
  severidad: SeveridadCodigo | null; // null = no_determinado
  puntaje: number | null;
  noDeterminado: boolean;
  motivo?: string; // presente solo si noDeterminado = true
}

const PUNTAJE_SEVERIDAD: Record<SeveridadCodigo, number> = {
  despreciable: 0,
  leve: 1,
  moderada: 2,
  severa: 3,
};

const ORDEN_SEVERIDAD: SeveridadCodigo[] = ["despreciable", "leve", "moderada", "severa"];

function indicador(severidad: SeveridadCodigo): IndicadorResultado {
  return { severidad, puntaje: PUNTAJE_SEVERIDAD[severidad], noDeterminado: false };
}

function noDeterminado(motivo: string): IndicadorResultado {
  return { severidad: null, puntaje: null, noDeterminado: true, motivo };
}

function masSevera(a: SeveridadCodigo, b: SeveridadCodigo): SeveridadCodigo {
  return ORDEN_SEVERIDAD.indexOf(a) >= ORDEN_SEVERIDAD.indexOf(b) ? a : b;
}

/** Rama SL (TR-CAV-02 a 05), aplicable cuando cavidad_externa_tronco = Sí. */
function evaluarPorSL(sl: ResultadoCalculo): IndicadorResultado {
  if (sl.valor === null) return noDeterminado(`SL_tronco_pct no calculable (TR-CAV-05): ${sl.motivo}`);
  if (sl.valor < 20) return indicador("leve"); // TR-CAV-02
  if (sl.valor < 33) return indicador("moderada"); // TR-CAV-03
  return indicador("severa"); // TR-CAV-04
}

/** Rama t/R (TR-CAV-06 a 08), aplicable cuando cavidad_interna_tronco = "si". */
function evaluarPorTR(tR: ResultadoCalculo): IndicadorResultado {
  if (tR.valor === null) return noDeterminado(`t_R_tronco no calculable (TR-CAV-08): ${tR.motivo}`);
  if (tR.valor > 0.3) return indicador("moderada"); // TR-CAV-06
  return indicador("severa"); // TR-CAV-07
}

interface CavidadTroncoResultado {
  indicador: IndicadorResultado;
  SL_tronco_pct?: ResultadoCalculo;
  R_radio_tronco_cm?: ResultadoCalculo;
  t_R_tronco?: ResultadoCalculo;
}

/** TR-CAV-01 a 10. */
function evaluarCavidadTronco(input: R02Input): CavidadTroncoResultado {
  if (input.presenta_cavidad_pudricion_tronco === null) {
    return { indicador: noDeterminado("presenta_cavidad_pudricion_tronco sin valor (TR-CAV, obligatorio)") };
  }
  if (!esBooleanoValido(input.presenta_cavidad_pudricion_tronco)) {
    return {
      indicador: noDeterminado(motivoFueraDominioSiNo("presenta_cavidad_pudricion_tronco", input.presenta_cavidad_pudricion_tronco, "D-61")),
    };
  }
  if (!input.presenta_cavidad_pudricion_tronco) return { indicador: indicador("despreciable") }; // TR-CAV-01

  if (input.cavidad_interna_tronco === null) {
    return {
      indicador: noDeterminado("cavidad_interna_tronco sin valor (TR-CAV, condicional activado por presenta_cavidad_pudricion_tronco = Sí)"),
    };
  }
  if (!esCodigoVigente("resultado_cavidad_interna", input.cavidad_interna_tronco)) {
    return { indicador: noDeterminado(`cavidad_interna_tronco tiene un código no reconocido ("${input.cavidad_interna_tronco}")`) };
  }
  if (input.cavidad_interna_tronco === "requiere_evaluacion_instrumental") {
    return { indicador: noDeterminado("cavidad_interna_tronco = Requiere evaluación instrumental (TR-CAV-09)") };
  }
  if (input.cavidad_externa_tronco === null) {
    return {
      indicador: noDeterminado("cavidad_externa_tronco sin valor (TR-CAV, condicional activado por presenta_cavidad_pudricion_tronco = Sí)"),
    };
  }
  if (!esBooleanoValido(input.cavidad_externa_tronco)) {
    return { indicador: noDeterminado(motivoFueraDominioSiNo("cavidad_externa_tronco", input.cavidad_externa_tronco, "D-62")) };
  }

  let SL_tronco_pct: ResultadoCalculo | undefined;
  let porSL: IndicadorResultado | null = null;
  if (input.cavidad_externa_tronco) {
    SL_tronco_pct = calcularSLTroncoPct({
      D_diametro_tronco_cm: input.D_diametro_tronco_cm,
      d_diametro_cavidad_tronco_cm: input.d_diametro_cavidad_tronco_cm,
      Cc_longitud_abertura_tronco_cm: input.Cc_longitud_abertura_tronco_cm,
      C_circunferencia_tronco_cm: input.C_circunferencia_tronco_cm,
    });
    porSL = evaluarPorSL(SL_tronco_pct);
  }

  let R_radio_tronco_cm: ResultadoCalculo | undefined;
  let t_R_tronco: ResultadoCalculo | undefined;
  let porTR: IndicadorResultado | null = null;
  if (input.cavidad_interna_tronco === "si") {
    R_radio_tronco_cm = calcularRRadioTroncoCm(input.D_diametro_tronco_cm);
    t_R_tronco = calcularTRTronco(input.t_pared_residual_tronco_cm, input.D_diametro_tronco_cm);
    porTR = evaluarPorTR(t_R_tronco);
  }

  if (porSL === null && porTR === null) {
    // D-62/D-63: con presenta_cavidad_pudricion_tronco = Sí, externa e
    // interna no pueden ser ambas No. No se inventa una categoría.
    return {
      indicador: noDeterminado(
        "Combinación inválida: presenta_cavidad_pudricion_tronco = Sí con cavidad_externa_tronco = No y " +
          "cavidad_interna_tronco = No; la Fase 6 debe rechazar esta combinación antes de guardar.",
      ),
      SL_tronco_pct,
      R_radio_tronco_cm,
      t_R_tronco,
    };
  }
  if (porSL?.noDeterminado || porTR?.noDeterminado) {
    // TR-CAV-10: si alguna de las dos vías es no_determinado, el
    // resultado combinado es no_determinado.
    const motivos = [porSL, porTR]
      .filter((p): p is IndicadorResultado => p !== null && p.noDeterminado)
      .map((p) => p.motivo);
    return {
      indicador: noDeterminado(`TR-CAV-10 (combinación externa+interna): ${motivos.join("; ")}`),
      SL_tronco_pct,
      R_radio_tronco_cm,
      t_R_tronco,
    };
  }

  const candidatos = [porSL, porTR].filter((c): c is IndicadorResultado => c !== null);
  const indicadorFinal =
    candidatos.length === 1
      ? candidatos[0] // solo externa o solo interna aplicable
      : indicador(masSevera(candidatos[0].severidad!, candidatos[1].severidad!)); // TR-CAV-10
  return { indicador: indicadorFinal, SL_tronco_pct, R_radio_tronco_cm, t_R_tronco };
}

/** TR-HER-01 a 04. */
function evaluarHeridas(input: R02Input): IndicadorResultado {
  if (input.presenta_heridas_tronco === null) {
    return noDeterminado("presenta_heridas_tronco sin valor (TR-HER, obligatorio)");
  }
  if (!esBooleanoValido(input.presenta_heridas_tronco)) {
    return noDeterminado(motivoFueraDominioSiNo("presenta_heridas_tronco", input.presenta_heridas_tronco, "D-72"));
  }
  if (!input.presenta_heridas_tronco) return indicador("despreciable"); // TR-HER-01

  if (input.condicion_heridas_tronco === null) {
    return noDeterminado("condicion_heridas_tronco sin valor (TR-HER, condicional activado por presenta_heridas_tronco = Sí)");
  }
  if (!esCodigoVigente("condicion_herida", input.condicion_heridas_tronco)) {
    return noDeterminado(`condicion_heridas_tronco tiene un código no reconocido ("${input.condicion_heridas_tronco}")`);
  }
  if (input.condicion_heridas_tronco === "cerrada") return indicador("despreciable"); // TR-HER-02
  if (input.condicion_heridas_tronco === "en_proceso_de_cierre") return indicador("leve"); // TR-HER-03
  return indicador("moderada"); // TR-HER-04 (abierta)
}

/** TR-COR-01 a 02. */
function evaluarCortezaMuertaAusente(input: R02Input): IndicadorResultado {
  if (input.corteza_muerta_ausente === null) {
    return noDeterminado("corteza_muerta_ausente sin valor (TR-COR, obligatorio)");
  }
  if (!esBooleanoValido(input.corteza_muerta_ausente)) {
    return noDeterminado(motivoFueraDominioSiNo("corteza_muerta_ausente", input.corteza_muerta_ausente, "D-74"));
  }
  return input.corteza_muerta_ausente ? indicador("moderada") : indicador("despreciable"); // TR-COR-02 / TR-COR-01
}

/** TR-EXU-01 a 02. */
function evaluarExudaciones(input: R02Input): IndicadorResultado {
  if (input.presenta_exudaciones === null) {
    return noDeterminado("presenta_exudaciones sin valor (TR-EXU, obligatorio)");
  }
  if (!esBooleanoValido(input.presenta_exudaciones)) {
    return noDeterminado(motivoFueraDominioSiNo("presenta_exudaciones", input.presenta_exudaciones, "D-75"));
  }
  return input.presenta_exudaciones ? indicador("leve") : indicador("despreciable"); // TR-EXU-02 / TR-EXU-01
}

/** TR-GRI-01 a 04. */
function evaluarFisurasGrietas(input: R02Input): IndicadorResultado {
  if (input.presenta_fisura_grieta_tronco === null) {
    return noDeterminado("presenta_fisura_grieta_tronco sin valor (TR-GRI, obligatorio)");
  }
  if (!esBooleanoValido(input.presenta_fisura_grieta_tronco)) {
    return noDeterminado(motivoFueraDominioSiNo("presenta_fisura_grieta_tronco", input.presenta_fisura_grieta_tronco, "D-77"));
  }
  if (!input.presenta_fisura_grieta_tronco) return indicador("despreciable"); // TR-GRI-01

  if (input.afectacion_fisura_grieta === null) {
    return noDeterminado("afectacion_fisura_grieta sin valor (TR-GRI, condicional activado por presenta_fisura_grieta_tronco = Sí)");
  }
  if (!esCodigoVigente("afectacion_grieta", input.afectacion_fisura_grieta)) {
    return noDeterminado(`afectacion_fisura_grieta tiene un código no reconocido ("${input.afectacion_fisura_grieta}")`);
  }
  if (input.afectacion_fisura_grieta === "solo_corteza") return indicador("leve"); // TR-GRI-02

  // afectacion_fisura_grieta = "penetra_en_madera"
  if (input.direccion_grieta === null) {
    return noDeterminado("direccion_grieta sin valor (TR-GRI, condicional activado por afectacion_fisura_grieta = penetra_en_madera)");
  }
  if (!esCodigoVigente("direccion_grieta", input.direccion_grieta)) {
    return noDeterminado(`direccion_grieta tiene un código no reconocido ("${input.direccion_grieta}")`);
  }
  return input.direccion_grieta === "longitudinal" ? indicador("moderada") : indicador("severa"); // TR-GRI-03 / TR-GRI-04
}

/** TR-COD-01 a 04. */
function evaluarCodominancia(input: R02Input): IndicadorResultado {
  if (input.troncos_codominantes === null) {
    return noDeterminado("troncos_codominantes sin valor (TR-COD, obligatorio)");
  }
  if (!esBooleanoValido(input.troncos_codominantes)) {
    return noDeterminado(motivoFueraDominioSiNo("troncos_codominantes", input.troncos_codominantes, "D-82"));
  }
  if (!input.troncos_codominantes) return indicador("despreciable"); // TR-COD-01

  if (input.grieta_union_codominante === null) {
    return noDeterminado("grieta_union_codominante sin valor (TR-COD, condicional activado por troncos_codominantes = Sí)");
  }
  if (!esBooleanoValido(input.grieta_union_codominante)) {
    return noDeterminado(motivoFueraDominioSiNo("grieta_union_codominante", input.grieta_union_codominante, "D-84"));
  }
  if (input.grieta_union_codominante) return indicador("severa"); // TR-COD-02

  if (input.corteza_incluida === null) {
    return noDeterminado("corteza_incluida sin valor (TR-COD, condicional activado por troncos_codominantes = Sí)");
  }
  if (!esBooleanoValido(input.corteza_incluida)) {
    return noDeterminado(motivoFueraDominioSiNo("corteza_incluida", input.corteza_incluida, "D-83"));
  }
  return input.corteza_incluida ? indicador("moderada") : indicador("leve"); // TR-COD-03 / TR-COD-04
}

export interface R02Resultado {
  indicadores: {
    cavidadTronco: IndicadorResultado;
    heridas: IndicadorResultado;
    cortezaMuertaAusente: IndicadorResultado;
    exudaciones: IndicadorResultado;
    fisurasGrietas: IndicadorResultado;
    codominancia: IndicadorResultado;
  };
  /** Variables calculadas (D-68, D-70, D-71), solo cuando la rama correspondiente se activó. */
  variablesCalculo: {
    SL_tronco_pct?: ResultadoCalculo;
    R_radio_tronco_cm?: ResultadoCalculo;
    t_R_tronco?: ResultadoCalculo;
  };
  puntaje: number | null; // null si probabilidadFalla = no_determinado
  probabilidadFalla: ProbabilidadFallaCodigo;
  motivo?: string; // presente solo si probabilidadFalla = no_determinado
}

function clasificarPuntaje(puntaje: number): ProbabilidadFallaCodigo {
  if (puntaje <= 1) return "improbable";
  if (puntaje <= 4) return "posible";
  if (puntaje <= 7) return "probable";
  return "inminente"; // 8–14
}

export function evaluarR02(input: R02Input): R02Resultado {
  const cavidad = evaluarCavidadTronco(input);
  const heridas = evaluarHeridas(input);
  const cortezaMuertaAusente = evaluarCortezaMuertaAusente(input);
  const exudaciones = evaluarExudaciones(input);
  const fisurasGrietas = evaluarFisurasGrietas(input);
  const codominancia = evaluarCodominancia(input);

  const indicadores = {
    cavidadTronco: cavidad.indicador,
    heridas,
    cortezaMuertaAusente,
    exudaciones,
    fisurasGrietas,
    codominancia,
  };
  const variablesCalculo = {
    SL_tronco_pct: cavidad.SL_tronco_pct,
    R_radio_tronco_cm: cavidad.R_radio_tronco_cm,
    t_R_tronco: cavidad.t_R_tronco,
  };

  const motivos: string[] = [];
  if (cavidad.indicador.noDeterminado) motivos.push(`Cavidad del tronco: ${cavidad.indicador.motivo}`);
  if (heridas.noDeterminado) motivos.push(`Heridas: ${heridas.motivo}`);
  if (cortezaMuertaAusente.noDeterminado) motivos.push(`Corteza muerta o ausente: ${cortezaMuertaAusente.motivo}`);
  if (exudaciones.noDeterminado) motivos.push(`Exudaciones: ${exudaciones.motivo}`);
  if (fisurasGrietas.noDeterminado) motivos.push(`Fisuras y grietas: ${fisurasGrietas.motivo}`);
  if (codominancia.noDeterminado) motivos.push(`Codominancia: ${codominancia.motivo}`);

  if (motivos.length > 0) {
    return { indicadores, variablesCalculo, puntaje: null, probabilidadFalla: "no_determinado", motivo: motivos.join(" | ") };
  }

  const puntaje =
    cavidad.indicador.puntaje! +
    heridas.puntaje! +
    cortezaMuertaAusente.puntaje! +
    exudaciones.puntaje! +
    fisurasGrietas.puntaje! +
    codominancia.puntaje!;
  return { indicadores, variablesCalculo, puntaje, probabilidadFalla: clasificarPuntaje(puntaje) };
}
