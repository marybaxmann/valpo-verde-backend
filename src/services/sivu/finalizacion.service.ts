import { createHash } from "crypto";
import { env } from "../../config/env";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectRole } from "../authorization.service";
import {
  AjusteFinalizacion,
  FinalizarInspeccionResultado,
  InspeccionRow,
  SQLSTATE_FINALIZAR_INSPECCION,
  finalizarInspeccion as finalizarInspeccionRepo,
  obtenerArbolVigente,
  obtenerEntradasVigentes,
  obtenerFechaProximaInspeccionVigente,
  obtenerInspeccionPorId,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../repositories/sivu/inspection.repository";
import { listarFotosPorInspeccion } from "../../repositories/sivu/photo.repository";
import { OrdenTrabajoRow, obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import { AjustesBody, CalcularInspeccionBody, FinalizarInspeccionBody } from "../../schemas/sivu/finalizacion.schema";
import { tipoSubtipoValido } from "../../schemas/sivu/alcanceInspeccion";
import {
  AjustesEntrada,
  NucleoEntradas,
  ResultadoEvaluacion,
  ensamblarResultadoEvaluacion,
} from "../rules/engine/ensamblaje";
import { SubtipoInspeccionCodigo, TipoInspeccionRealizadaCodigo } from "../rules/engine/catalogs";
import { FechaSugeridaResultado } from "../rules/engine/fechas-sugeridas";
import { RULE_VERSION } from "../rules/engine/version";
import { CampoFaltante, evaluarCompletitud } from "./completitud";

/**
 * Cierre de una inspección en dos pasos (#59/#72; CC-054):
 *
 * - POST .../calcular: compone las entradas, corre el motor en memoria
 *   y devuelve el resultado, las fechas sugeridas, los campos faltantes
 *   y una `huella` de las entradas. No escribe nada.
 * - POST .../finalizar: repite el cálculo, exige la misma `huella`
 *   (409 si el borrador o lo vigente cambió), y si todo está completo
 *   invoca `fn_finalizar_inspeccion` (020) UNA sola vez. Si falta algo,
 *   no la llama: la inspección sigue en Preguardado (CC-054).
 */

/**
 * Las 76 entradas del núcleo del motor (`NucleoEntradas`): R01, R02,
 * R03, M04, alcorque y M01/consecuencias. El chequeo de tipos de abajo
 * falla si el motor agrega o quita una entrada y esta lista no se
 * actualiza.
 */
const CLAVES_NUCLEO = [
  "levantamiento_del_plato_radicular", "angulo_inclinacion", "raices_expuestas", "necrosis_radicular",
  "raices_cortadas", "cavidad_pudricion_basal", "cavidad_basal_externa", "cavidad_basal_interna",
  "D_diametro_basal_tronco_cm", "d_diametro_cavidad_basal_cm", "Cc_longitud_abertura_cavidad_cm",
  "C_circunferencia_basal_cm", "t_pared_residual_basal_cm",
  "presenta_cavidad_pudricion_tronco", "cavidad_externa_tronco", "cavidad_interna_tronco",
  "D_diametro_tronco_cm", "d_diametro_cavidad_tronco_cm", "Cc_longitud_abertura_tronco_cm",
  "C_circunferencia_tronco_cm", "t_pared_residual_tronco_cm",
  "presenta_heridas_tronco", "condicion_heridas_tronco", "corteza_muerta_ausente", "presenta_exudaciones",
  "presenta_fisura_grieta_tronco", "afectacion_fisura_grieta", "direccion_grieta",
  "troncos_codominantes", "grieta_union_codominante", "corteza_incluida",
  "ramas_secas", "ramas_secas_pct_copa", "ramas_quebradas", "desequilibrio_copa", "defoliacion_estimada_pct",
  "infraestructura_inmediata", "interferencia_redes_servicios",
  "existe_vereda", "dano_interferencia_vereda", "presenta_levantamiento_vereda", "presenta_grieta_vereda",
  "presenta_hundimiento_vereda", "desnivel_max_vereda_cm", "ancho_max_grieta_vereda_cm",
  "reduce_circulacion_peatonal", "impide_paso_seguro",
  "existe_calzada", "dano_interferencia_calzada", "levantamiento_calzada", "hundimiento_calzada",
  "desnivel_max_calzada_cm", "afecta_circulacion_vehicular",
  "suelo_sellado_impermeabilizado", "indicios_compactacion_superficial", "obstaculos_crecimiento_radicular",
  "contacto_interferencia_infraestructura_vertical", "dano_fisico_observable_infraestructura_vertical",
  "compromete_estabilidad_funcionalidad",
  "red_aerea_presente", "tipo_red_aerea", "distancia_copa_red_aerea_m", "dano_interferencia_red_aerea",
  "red_subterranea_presente", "afectacion_fisica_red_subterranea", "compromete_funcionalidad_red_subterranea",
  "forma_alcorque", "largo_alcorque_m", "ancho_alcorque_m", "diametro_alcorque_m", "superficie_alcorque_m2_manual",
  "zona_objetivo", "tasa_ocupacion_objetivo",
  "consecuencia_raices_cuello", "consecuencia_tronco", "consecuencia_copa_ramas",
] as const satisfies readonly (keyof NucleoEntradas)[];

type ClaveNucleoSinListar = Exclude<keyof NucleoEntradas, (typeof CLAVES_NUCLEO)[number]>;
const nucleoCompleto: [ClaveNucleoSinListar] extends [never] ? true : ClaveNucleoSinListar = true;
void nucleoCompleto;

type CampoAjuste = AjusteFinalizacion["campo"];

export interface FechaSugeridaRespuesta {
  /** Inicio del rango sugerido: la fecha que se guarda como sugerida (CC-037). */
  fecha: string;
  rango_inicio: string;
  rango_fin: string | null;
  inmediato_y_continuo: boolean;
  motivo: string | null;
}

export interface CalculoRespuesta {
  inspection_id: string;
  tipo_inspeccion_realizada: string;
  subtipo_inspeccion: string | null;
  resultado: Omit<ResultadoEvaluacion, "variables" | "inspeccion" | "alcance" | "ajustesDescartados">;
  nivel_riesgo: string;
  fechas_sugeridas: {
    fecha_proxima_inspeccion: FechaSugeridaRespuesta;
    fecha_proximo_monitoreo: FechaSugeridaRespuesta;
  };
  fecha_proxima_inspeccion_vigente: string | null;
  valores_no_permitidos: string[];
  campos_faltantes: CampoFaltante[];
  puede_finalizar: boolean;
  huella: string;
}

export type FinalizacionRespuesta =
  | { finalizada: false; estado_registro: "preguardado"; campos_faltantes: CampoFaltante[] }
  | (FinalizarInspeccionResultado & {
      finalizada: true;
      fecha_proxima_inspeccion_sugerida: string;
      fecha_proximo_monitoreo_sugerida: string;
      fecha_proxima_inspeccion: string;
      fecha_proximo_monitoreo: string;
    });

interface Calculo {
  respuesta: CalculoRespuesta;
  resultado: ResultadoEvaluacion;
  completa: boolean;
}

/** POST /api/sivu/inspections/:inspectionId/calcular — no escribe nada. */
export async function calcularInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: CalcularInspeccionBody,
  accessToken: string
): Promise<CalculoRespuesta> {
  const { inspeccion } = await autorizarCierre(user, inspectionId, accessToken);
  const calculo = await calcular(inspeccion, body.ajustes, accessToken);
  return calculo.respuesta;
}

/** POST /api/sivu/inspections/:inspectionId/finalizar */
export async function finalizarInspeccion(
  user: AuthenticatedUser,
  inspectionId: string,
  body: FinalizarInspeccionBody,
  accessToken: string
): Promise<FinalizacionRespuesta> {
  const { inspeccion } = await autorizarCierre(user, inspectionId, accessToken);
  const { respuesta, resultado, completa } = await calcular(inspeccion, body.ajustes, accessToken);

  if (body.huella !== respuesta.huella) {
    throw new AppError(
      "El borrador o los datos vigentes del árbol cambiaron desde el cálculo: vuelva a calcular antes de finalizar",
      409
    );
  }
  if (respuesta.valores_no_permitidos.length > 0) {
    throw new AppError(respuesta.valores_no_permitidos.join("; "), 422);
  }
  if (!completa) {
    return { finalizada: false, estado_registro: "preguardado", campos_faltantes: respuesta.campos_faltantes };
  }

  const sugeridaInspeccion = respuesta.fechas_sugeridas.fecha_proxima_inspeccion.fecha;
  const sugeridaMonitoreo = respuesta.fechas_sugeridas.fecha_proximo_monitoreo.fecha;
  const fechaInspeccion = body.fecha_proxima_inspeccion ?? sugeridaInspeccion;
  const fechaMonitoreo = body.fecha_proximo_monitoreo ?? sugeridaMonitoreo;
  const justificacion = body.justificacion_ajuste_fecha ?? null;
  const difiere = fechaInspeccion !== sugeridaInspeccion || fechaMonitoreo !== sugeridaMonitoreo;

  if (difiere && justificacion === null) {
    throw new AppError("Una fecha distinta de su sugerida exige justificacion_ajuste_fecha (D-204)", 400);
  }
  if (!difiere && justificacion !== null) {
    throw new AppError(
      "justificacion_ajuste_fecha solo se registra cuando alguna fecha difiere de su sugerida (D-204; CC-055)",
      422
    );
  }

  try {
    const finalizada = await finalizarInspeccionRepo({
      inspectionId: inspeccion.id,
      usuario: user.id,
      resultado: resultadoParaFuncion(resultado),
      ajustes: ajustesParaFuncion(resultado, body.ajustes),
      fechaProximaInspeccionSugerida: sugeridaInspeccion,
      fechaProximoMonitoreoSugerida: sugeridaMonitoreo,
      fechaProximaInspeccion: fechaInspeccion,
      fechaProximoMonitoreo: fechaMonitoreo,
      justificacionAjusteFecha: justificacion,
    });
    return {
      ...finalizada,
      finalizada: true,
      fecha_proxima_inspeccion_sugerida: sugeridaInspeccion,
      fecha_proximo_monitoreo_sugerida: sugeridaMonitoreo,
      fecha_proxima_inspeccion: fechaInspeccion,
      fecha_proximo_monitoreo: fechaMonitoreo,
    };
  } catch (err: unknown) {
    throw traducirErrorFinalizar(err);
  }
}

/**
 * Mismo criterio que `photo.service.ts` (CC-048/CC-050): solo el
 * Inspector responsable ACTUAL de una OT de Inspección En ejecución,
 * sobre una inspección en Preguardado. `fn_finalizar_inspeccion` lo
 * vuelve a verificar con la fila bloqueada; esto rechaza antes, con
 * mensaje claro, y protege /calcular, que no llama a la función.
 */
async function autorizarCierre(
  user: AuthenticatedUser,
  inspectionId: string,
  accessToken: string
): Promise<{ inspeccion: InspeccionRow; ot: OrdenTrabajoRow }> {
  const inspeccion = await obtenerInspeccionPorId(inspectionId);
  if (!inspeccion) {
    throw new AppError("La inspección no existe", 404);
  }

  const ot = await obtenerOrdenTrabajoPorId(inspeccion.work_order_id);
  if (!ot) {
    throw new AppError("La orden de trabajo de la inspección no existe", 404);
  }
  if (ot.tipo_ot !== "inspeccion") {
    throw new AppError("La orden de trabajo no es de tipo Inspección", 422);
  }

  await assertProjectRole(user, ot.project_id, ["inspector"], accessToken);

  if (ot.responsable_accion_id !== user.id) {
    throw new AppError("Solo el Inspector responsable asignado de esta orden de trabajo puede calcular o finalizar la inspección", 403);
  }
  if (ot.estado_ot !== "en_ejecucion") {
    throw new AppError("La orden de trabajo no está En ejecución", 422);
  }
  if (inspeccion.estado_registro !== "preguardado") {
    throw new AppError("La inspección no está en Preguardado", 422);
  }

  return { inspeccion, ot };
}

/**
 * Todo lo que entra en la respuesta y en la huella se lee con el JWT del
 * usuario (PR-018 v5.0, CC-064 decisión h): la RLS actúa como segunda
 * capa. La inspección y la OT que lee `autorizarCierre` solo sirven para
 * autorizar y siguen con la credencial de servicio.
 */
async function calcular(
  inspeccion: InspeccionRow,
  ajustesBody: AjustesBody | undefined,
  accessToken: string
): Promise<Calculo> {
  const tipo = inspeccion.tipo_inspeccion_realizada;
  const subtipo = inspeccion.subtipo_inspeccion;
  if (tipo === null || !tipoSubtipoValido(tipo, subtipo)) {
    throw new AppError("La inspección no tiene un tipo/subtipo válido (D-196/D-197)", 422);
  }

  const [variablesRegistradas, versionArbol, arbolVigente, variablesVigentes, fechaVigente, fotos] = await Promise.all([
    obtenerVariablesBorrador(accessToken, inspeccion.id),
    obtenerVersionArbolDeInspeccion(accessToken, inspeccion.id),
    obtenerArbolVigente(accessToken, inspeccion.tree_id),
    obtenerEntradasVigentes(accessToken, inspeccion.tree_id),
    obtenerFechaProximaInspeccionVigente(accessToken, inspeccion.tree_id),
    listarFotosPorInspeccion(accessToken, inspeccion.id),
  ]);
  if (variablesRegistradas === null) {
    throw new AppError("La inspección no tiene borrador de evaluación: guárdelo antes de calcular", 422);
  }
  if (arbolVigente === null) {
    throw new AppError("El árbol de la inspección no existe", 404);
  }

  const variablesCalculo = componerVariablesCalculo(variablesVigentes, variablesRegistradas);
  const huella = huellaCalculo({
    variablesCalculo,
    tipo,
    subtipo,
    fechaInspeccion: inspeccion.fecha_inspeccion,
    fechaVigente,
  });

  const resultado = ensamblarConAjustes(
    {
      variables: variablesRegistradas,
      variablesCalculo,
      tipoInspeccionRealizada: tipo as TipoInspeccionRealizadaCodigo,
      subtipoInspeccion: subtipo as SubtipoInspeccionCodigo | null,
      fechaInspeccionISO: inspeccion.fecha_inspeccion,
      fechaProximaInspeccionVigenteISO: fechaVigente,
      motorCommit: env.MOTOR_COMMIT,
    },
    ajustesBody
  );

  const completitud = evaluarCompletitud({
    tipo,
    subtipo,
    variablesRegistradas,
    variablesVigentes,
    arbolRegistrado: versionArbol?.campos ?? {},
    camposRegistradosArbol: versionArbol?.camposRegistrados ?? [],
    arbolVigente,
    vistasFotos: fotos.map((f) => f.vista),
  });

  const valoresNoPermitidos = resultado.alcance.valoresNoPermitidosEnAlcance;
  const { variables: _v, inspeccion: _i, alcance: _a, ajustesDescartados: _d, ...columnas } = resultado;

  return {
    resultado,
    completa: completitud.completa,
    respuesta: {
      inspection_id: inspeccion.id,
      tipo_inspeccion_realizada: tipo,
      subtipo_inspeccion: subtipo,
      resultado: columnas,
      nivel_riesgo: resultado.inspeccion.nivelRiesgo,
      fechas_sugeridas: {
        fecha_proxima_inspeccion: fechaSugerida(resultado.inspeccion.fechaProximaInspeccionSugerida, "fecha_proxima_inspeccion"),
        fecha_proximo_monitoreo: fechaSugerida(resultado.inspeccion.fechaProximoMonitoreoSugerida, "fecha_proximo_monitoreo"),
      },
      fecha_proxima_inspeccion_vigente: fechaVigente,
      valores_no_permitidos: valoresNoPermitidos,
      campos_faltantes: completitud.campos_faltantes,
      puede_finalizar: completitud.completa && valoresNoPermitidos.length === 0,
      huella,
    },
  };
}

/**
 * `variables_calculo` (diseño Fase 3, §3.9): cada entrada del núcleo
 * con lo registrado en esta inspección; si no lo registró, el valor
 * vigente del árbol; si tampoco hay, null. Solo las 76 claves del
 * núcleo: lo demás del borrador (observaciones, vitalidad, etc.) no
 * entra al cálculo.
 */
export function componerVariablesCalculo(
  vigentes: Readonly<Record<string, unknown>>,
  registradas: Readonly<Record<string, unknown>>
): NucleoEntradas {
  const entradas: Record<string, unknown> = {};
  for (const clave of CLAVES_NUCLEO) {
    if (Object.prototype.hasOwnProperty.call(registradas, clave)) entradas[clave] = registradas[clave] ?? null;
    else if (Object.prototype.hasOwnProperty.call(vigentes, clave)) entradas[clave] = vigentes[clave] ?? null;
    else entradas[clave] = null;
  }
  return entradas as unknown as NucleoEntradas;
}

/**
 * sha256 del JSON canónico (claves ordenadas) de todo lo que determina
 * el resultado y las fechas sugeridas: las entradas compuestas, el
 * tipo/subtipo, la fecha de la inspección, la fecha vigente y la
 * versión de reglas. Los ajustes no entran: se envían de nuevo en
 * /finalizar.
 */
export function huellaCalculo(args: {
  variablesCalculo: NucleoEntradas;
  tipo: string;
  subtipo: string | null;
  fechaInspeccion: string;
  fechaVigente: string | null;
}): string {
  const contenido = {
    variables_calculo: args.variablesCalculo,
    tipo_inspeccion_realizada: args.tipo,
    subtipo_inspeccion: args.subtipo,
    fecha_inspeccion: args.fechaInspeccion,
    fecha_proxima_inspeccion_vigente: args.fechaVigente,
    rule_version: RULE_VERSION,
  };
  return createHash("sha256").update(jsonCanonico(contenido)).digest("hex");
}

function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (valor !== null && typeof valor === "object") {
    const claves = Object.keys(valor as Record<string, unknown>).sort();
    return `{${claves.map((k) => `${JSON.stringify(k)}:${jsonCanonico((valor as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor ?? null);
}

/**
 * Corre el motor con los ajustes del Inspector como `AjustesEntrada`,
 * con `valorCalculadoEnElAjuste` = el valor calculado ahora (CC-044):
 * así el ajuste siempre se mantiene. La prioridad calculada depende del
 * riesgo y la infraestructura efectivos (M05), por eso se calcula en
 * tres pasos. Un ajuste igual al valor calculado se rechaza (D-173:
 * solo se ajusta lo que difiere).
 */
function ensamblarConAjustes(
  args: Omit<Parameters<typeof ensamblarResultadoEvaluacion>[0], "ajustes">,
  ajustesBody: AjustesBody | undefined
): ResultadoEvaluacion {
  const sinAjustes = ensamblarResultadoEvaluacion(args);
  if (!ajustesBody || Object.keys(ajustesBody).length === 0) {
    return verificarFechas(sinAjustes);
  }

  const ajustes: AjustesEntrada = {};
  const riesgo = ajustesBody.clasificacion_riesgo;
  if (riesgo) {
    rechazarSiIgual("clasificacion_riesgo", riesgo.valor_ajustado, sinAjustes.clasificacion_riesgo_calculada);
    ajustes.riesgo = {
      valorAjustado: riesgo.valor_ajustado,
      valorCalculadoEnElAjuste: sinAjustes.clasificacion_riesgo_calculada,
      adjustmentId: "nuevo:clasificacion_riesgo",
    };
  }
  const infraestructura = ajustesBody.clasificacion_infraestructura;
  if (infraestructura) {
    rechazarSiIgual(
      "clasificacion_infraestructura",
      infraestructura.valor_ajustado,
      sinAjustes.clasificacion_infraestructura_calculada
    );
    ajustes.infraestructura = {
      valorAjustado: infraestructura.valor_ajustado,
      valorCalculadoEnElAjuste: sinAjustes.clasificacion_infraestructura_calculada,
      adjustmentId: "nuevo:clasificacion_infraestructura",
    };
  }

  const conRiesgoEInfraestructura = ensamblarResultadoEvaluacion({ ...args, ajustes });
  const prioridad = ajustesBody.clasificacion_prioridad;
  if (!prioridad) return verificarFechas(conRiesgoEInfraestructura);

  rechazarSiIgual(
    "clasificacion_prioridad",
    prioridad.valor_ajustado,
    conRiesgoEInfraestructura.clasificacion_prioridad_calculada
  );
  ajustes.prioridad = {
    valorAjustado: prioridad.valor_ajustado,
    valorCalculadoEnElAjuste: conRiesgoEInfraestructura.clasificacion_prioridad_calculada,
    adjustmentId: "nuevo:clasificacion_prioridad",
  };
  return verificarFechas(ensamblarResultadoEvaluacion({ ...args, ajustes }));
}

function rechazarSiIgual(campo: CampoAjuste, ajustado: string, calculado: string): void {
  if (ajustado === calculado) {
    throw new AppError(`El ajuste de ${campo} (${ajustado}) es igual al valor calculado: no hay nada que ajustar (D-173)`, 422);
  }
}

/**
 * CC-045 (b): con `nivel_riesgo` No determinado el motor ya sugiere los
 * rangos de Extremo con el motivo de precaución. `noDeterminable` solo
 * ocurre con un riesgo vacío o desconocido o una fecha inválida: es un
 * error interno (500, registrado por el middleware), no un faltante.
 */
function verificarFechas(resultado: ResultadoEvaluacion): ResultadoEvaluacion {
  const { fechaProximaInspeccionSugerida: pi, fechaProximoMonitoreoSugerida: pm } = resultado.inspeccion;
  if (pi.noDeterminable || pm.noDeterminable || pi.fechaInicio === null || pm.fechaInicio === null) {
    throw new Error(
      `Fecha sugerida no determinable (nivel_riesgo=${resultado.inspeccion.nivelRiesgo}): ` +
        `${pi.motivo ?? "-"} / ${pm.motivo ?? "-"}`
    );
  }
  return resultado;
}

function fechaSugerida(f: FechaSugeridaResultado, campo: string): FechaSugeridaRespuesta {
  if (f.fechaInicio === null) {
    // verificarFechas ya lo descartó; defensa en profundidad.
    throw new Error(`${campo}: fecha sugerida sin inicio`);
  }
  return {
    fecha: f.fechaInicio,
    rango_inicio: f.fechaInicio,
    rango_fin: f.fechaFin,
    inmediato_y_continuo: f.inmediatoYContinuo === true,
    motivo: f.motivo ?? null,
  };
}

/** `p_resultado`: exactamente las columnas de `evaluations_resultado_input` (020). */
function resultadoParaFuncion(r: ResultadoEvaluacion): Record<string, unknown> {
  return {
    variables_calculo: r.variables_calculo,
    calculados: r.calculados,
    indicadores: r.indicadores,
    puntaje_raices_cuello: r.puntaje_raices_cuello,
    probabilidad_falla_raices_cuello: r.probabilidad_falla_raices_cuello,
    puntaje_tronco: r.puntaje_tronco,
    probabilidad_falla_tronco: r.probabilidad_falla_tronco,
    puntaje_copa_ramas: r.puntaje_copa_ramas,
    probabilidad_falla_copa_ramas: r.probabilidad_falla_copa_ramas,
    probabilidad_impacto: r.probabilidad_impacto,
    clasificacion_raices_cuello: r.clasificacion_raices_cuello,
    clasificacion_tronco: r.clasificacion_tronco,
    clasificacion_copa_ramas: r.clasificacion_copa_ramas,
    clasificacion_riesgo_calculada: r.clasificacion_riesgo_calculada,
    puntaje_infraestructura: r.puntaje_infraestructura,
    pct_infraestructura: r.pct_infraestructura,
    clasificacion_infraestructura_calculada: r.clasificacion_infraestructura_calculada,
    clasificacion_prioridad_calculada: r.clasificacion_prioridad_calculada,
    clasificacion_riesgo_ajustada: r.clasificacion_riesgo_ajustada,
    clasificacion_infraestructura_ajustada: r.clasificacion_infraestructura_ajustada,
    clasificacion_prioridad_ajustada: r.clasificacion_prioridad_ajustada,
    rule_version: r.rule_version,
    motor_commit: r.motor_commit,
  };
}

/** `p_ajustes`: un objeto por clasificación ajustada que el motor mantuvo (CC-044). */
function ajustesParaFuncion(r: ResultadoEvaluacion, ajustesBody: AjustesBody | undefined): AjusteFinalizacion[] {
  const pares: Array<[CampoAjuste, string | null, string]> = [
    ["clasificacion_riesgo", r.clasificacion_riesgo_ajustada, r.clasificacion_riesgo_calculada],
    ["clasificacion_infraestructura", r.clasificacion_infraestructura_ajustada, r.clasificacion_infraestructura_calculada],
    ["clasificacion_prioridad", r.clasificacion_prioridad_ajustada, r.clasificacion_prioridad_calculada],
  ];
  const ajustes: AjusteFinalizacion[] = [];
  for (const [campo, ajustada, calculada] of pares) {
    const justificacion = ajustesBody?.[campo]?.justificacion_ajuste_clasificacion;
    if (ajustada === null || justificacion === undefined) continue;
    ajustes.push({
      campo,
      valor_calculado: calculada,
      valor_ajustado: ajustada,
      justificacion_ajuste_clasificacion: justificacion,
    });
  }
  return ajustes;
}

function traducirErrorFinalizar(err: unknown): Error {
  if (err instanceof AppError) {
    return err;
  }
  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  if (cause === SQLSTATE_FINALIZAR_INSPECCION) {
    return new AppError(error.message, 422);
  }
  if (cause === "23514") {
    return new AppError(error.message, 400);
  }
  return error;
}
