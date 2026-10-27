import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO } from "../rules/engine/catalogs";
import {
  EvaluacionResultadoRow,
  InspeccionFinalizadaRow,
  listarEvaluacionesDeInspecciones,
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

function diagnostico(ins: InspeccionFinalizadaRow, ev: EvaluacionResultadoRow | undefined) {
  const componente = (prob: string | null, clas: string | null) => ({
    probabilidad_falla: conEtiqueta("probabilidad_falla", prob),
    clasificacion: conEtiqueta("clasificacion_riesgo", clas),
  });
  return {
    tree_id: ins.tree_id,
    tree_code: ins.trees?.tree_code ?? null,
    especie_cientifica: ins.trees?.especie_cientifica ?? null,
    nombre_comun: ins.trees?.nombre_comun ?? null,
    // Inspección finalizada; la vigencia llega al completar la OT (CC-050),
    // que esta versión no expone. Nunca se presenta como vigente.
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
    resultado: ev
      ? {
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
  const evaluaciones = await listarEvaluacionesDeInspecciones(token, ultimas.map(i => i.id));
  const porInspeccion = new Map(evaluaciones.map(e => [e.inspection_id, e]));
  return ultimas
    .map(ins => diagnostico(ins, porInspeccion.get(ins.id)))
    .sort((a, b) => (a.tree_code ?? "").localeCompare(b.tree_code ?? ""));
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
