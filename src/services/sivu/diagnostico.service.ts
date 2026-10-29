import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO } from "../rules/engine/catalogs";
import {
  EvaluacionResultadoRow,
  EvaluacionVigenteRow,
  InspeccionFinalizadaRow,
  listarArbolesResumen,
  listarEstadosOt,
  listarEvaluacionesDeInspecciones,
  listarEvaluacionesVigentes,
  listarInspeccionesFinalizadas,
} from "../../repositories/sivu/diagnostico.repository";
import { obtenerMiembrosDeProyecto } from "../../repositories/sivu/workOrder.repository";

type Valor = { codigo: string; etiqueta: string | null } | null;

/** Código -> {codigo, etiqueta} del catálogo; etiqueta null si no está registrada (no se inventa). */
function conEtiqueta(catalogo: string, codigo: string | null): Valor {
  if (codigo === null) return null;
  const entrada = CATALOGO.find(c => c.catalogo === catalogo && c.codigo === codigo);
  return { codigo, etiqueta: entrada?.etiqueta ?? null };
}

function componente(prob: string | null, clas: string | null) {
  return {
    probabilidad_falla: conEtiqueta("probabilidad_falla", prob),
    clasificacion: conEtiqueta("clasificacion_riesgo", clas),
  };
}

/** Columnas de resultado (evaluations o tree_assessments) con sus etiquetas; el ajuste prevalece. */
function resultadoConEtiquetas(ev: Omit<EvaluacionResultadoRow, "inspection_id">) {
  return {
    clasificacion_riesgo: conEtiqueta("clasificacion_riesgo", ev.clasificacion_riesgo_ajustada ?? ev.clasificacion_riesgo_calculada),
    riesgo_ajustado: ev.clasificacion_riesgo_ajustada !== null,
    probabilidad_impacto: conEtiqueta("probabilidad_impacto", ev.probabilidad_impacto),
    componentes: {
      raices_cuello: componente(ev.probabilidad_falla_raices_cuello, ev.clasificacion_raices_cuello),
      tronco: componente(ev.probabilidad_falla_tronco, ev.clasificacion_tronco),
      copa_ramas: componente(ev.probabilidad_falla_copa_ramas, ev.clasificacion_copa_ramas),
    },
    infraestructura: {
      clasificacion: conEtiqueta(
        "clasificacion_infraestructura",
        ev.clasificacion_infraestructura_ajustada ?? ev.clasificacion_infraestructura_calculada
      ),
      ajustada: ev.clasificacion_infraestructura_ajustada !== null,
      puntaje: ev.puntaje_infraestructura,
      porcentaje: ev.pct_infraestructura,
    },
    prioridad: conEtiqueta("clasificacion_prioridad", ev.clasificacion_prioridad_ajustada ?? ev.clasificacion_prioridad_calculada),
    prioridad_ajustada: ev.clasificacion_prioridad_ajustada !== null,
    indicadores: ev.indicadores ?? null,
    rule_version: ev.rule_version,
  };
}

function diagnostico(ins: InspeccionFinalizadaRow, ev: EvaluacionResultadoRow | undefined, vig: EvaluacionVigenteRow | undefined) {
  return {
    tree_id: ins.tree_id,
    tree_code: ins.trees?.tree_code ?? null,
    especie_cientifica: ins.trees?.especie_cientifica ?? null,
    nombre_comun: ins.trees?.nombre_comun ?? null,
    // Diagnóstico finalizado: la última inspección finalizada, aunque su OT
    // no esté completada. La evaluación vigente (CC-050) va aparte, en `vigente`.
    estado: "finalizado" as const,
    inspection_id: ins.id,
    codigo_inspeccion: ins.codigo_inspeccion,
    work_order_id: ins.work_order_id,
    tipo_inspeccion: conEtiqueta("tipo_inspeccion_realizada", ins.tipo_inspeccion_realizada),
    subtipo_inspeccion: conEtiqueta("subtipo_inspeccion", ins.subtipo_inspeccion),
    fecha_inspeccion: ins.fecha_inspeccion,
    finalizada_at: ins.finalizada_at,
    requiere_mantenimiento: ins.requiere_mantenimiento,
    fecha_proxima_inspeccion: ins.fecha_proxima_inspeccion,
    fecha_proximo_monitoreo: ins.fecha_proximo_monitoreo,
    resultado: ev ? resultadoConEtiquetas(ev) : null,
    // Evaluación vigente del árbol (tree_assessments, la más reciente): null
    // mientras ninguna OT del árbol esté completada.
    vigente: vig
      ? {
          evento: vig.evento,
          work_order_id: vig.work_order_id,
          inspection_id: vig.inspection_id,
          desde: vig.created_at,
          requiere_revision_ajuste: vig.requiere_revision_ajuste,
          resultado: resultadoConEtiquetas(vig),
        }
      : null,
  };
}

/**
 * B18 mínimo: por árbol del proyecto, la última inspección finalizada con
 * su resultado y etiquetas. Todos los miembros del proyecto (CC-064 a).
 */
export async function listarDiagnosticos(user: AuthenticatedUser, projectId: string, token: string, treeId?: string) {
  await assertProjectAccess(user, projectId, token);
  const inspecciones = await listarInspeccionesFinalizadas(token, projectId, treeId);
  const ultimaPorArbol = new Map<string, InspeccionFinalizadaRow>();
  for (const ins of inspecciones) if (!ultimaPorArbol.has(ins.tree_id)) ultimaPorArbol.set(ins.tree_id, ins);
  const ultimas = [...ultimaPorArbol.values()];
  const [evaluaciones, vigentes] = await Promise.all([
    listarEvaluacionesDeInspecciones(token, ultimas.map(i => i.id)),
    listarEvaluacionesVigentes(token, projectId, treeId),
  ]);
  const porInspeccion = new Map(evaluaciones.map(e => [e.inspection_id, e]));
  const vigentePorArbol = new Map<string, EvaluacionVigenteRow>();
  for (const v of vigentes) if (!vigentePorArbol.has(v.tree_id)) vigentePorArbol.set(v.tree_id, v);
  return ultimas
    .map(ins => diagnostico(ins, porInspeccion.get(ins.id), vigentePorArbol.get(ins.tree_id)))
    .sort((a, b) => (a.tree_code ?? "").localeCompare(b.tree_code ?? ""));
}

function contarPor(valores: Array<string | null>, catalogo: string) {
  const conteo = new Map<string | null, number>();
  for (const v of valores) conteo.set(v, (conteo.get(v) ?? 0) + 1);
  const orden = (c: string | null) => CATALOGO.find(e => e.catalogo === catalogo && e.codigo === c)?.orden ?? 999;
  return [...conteo.entries()]
    .map(([codigo, total]) => ({ codigo, etiqueta: codigo === null ? null : conEtiqueta(catalogo, codigo)!.etiqueta, total }))
    .sort((a, b) => orden(a.codigo) - orden(b.codigo));
}

/**
 * B7: resumen del proyecto para el Dashboard. El riesgo cuenta el
 * diagnóstico finalizado (B18), no uno vigente.
 */
export async function resumenProyecto(user: AuthenticatedUser, projectId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  const [arboles, estadosOt, diagnosticos] = await Promise.all([
    listarArbolesResumen(token, projectId),
    listarEstadosOt(token, projectId),
    listarDiagnosticos(user, projectId, token),
  ]);
  const georreferenciados = arboles.filter(a => a.ubicacion !== null).length;
  const especies = new Map<string, { especie_cientifica: string; nombre_comun: string | null; total: number }>();
  for (const a of arboles) {
    if (!a.especie_cientifica) continue;
    const e = especies.get(a.especie_cientifica) ?? { especie_cientifica: a.especie_cientifica, nombre_comun: a.nombre_comun, total: 0 };
    e.total += 1;
    especies.set(a.especie_cientifica, e);
  }
  return {
    arboles_total: arboles.length,
    por_ciclo_vida: contarPor(arboles.map(a => a.estado_ciclo_vida), "estado_ciclo_vida"),
    georreferenciados,
    sin_georreferenciar: arboles.length - georreferenciados,
    con_diagnostico: diagnosticos.length,
    sin_evaluacion: arboles.length - diagnosticos.length,
    por_riesgo: contarPor(diagnosticos.map(d => d.resultado?.clasificacion_riesgo?.codigo ?? null), "clasificacion_riesgo"),
    especies_distintas: especies.size,
    especies_top: [...especies.values()].sort((a, b) => b.total - a.total || a.especie_cientifica.localeCompare(b.especie_cientifica)).slice(0, 10),
    ot_por_estado: contarPor(estadosOt.map(o => o.estado_ot), "estado_ot"),
  };
}

/** B14: miembros asignables del proyecto (fn_miembros_proyecto, 024), filtrables por rol. */
export async function listarMiembrosAsignables(user: AuthenticatedUser, projectId: string, token: string, rol?: string) {
  await assertProjectAccess(user, projectId, token);
  const miembros = await obtenerMiembrosDeProyecto(token, projectId);
  return rol ? miembros.filter(m => m.rol === rol) : miembros;
}

/** B15: catálogos vigentes de catalogs.ts, agrupados (PR-021). */
export function catalogosVigentes() {
  const salida: Record<string, Array<{ codigo: string; etiqueta: string; orden: number | null; padre: string | null }>> = {};
  for (const c of CATALOGO) {
    if (c.estado !== "vigente") continue;
    (salida[c.catalogo] ??= []).push({ codigo: c.codigo, etiqueta: c.etiqueta, orden: c.orden ?? null, padre: c.padre ?? null });
  }
  for (const lista of Object.values(salida)) lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return salida;
}
