import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess } from "../authorization.service";
import { etiquetaDe } from "../rules/engine/catalogs";
import {
  ArbolDeOtRow,
  FiltrosListadoOt,
  OtListadoRow,
  listarOrdenesTrabajo,
  obtenerArbolesDeOts,
  obtenerMiembrosDeProyecto,
  obtenerProyectosDeOts,
} from "../../repositories/sivu/workOrder.repository";
import {
  ESTADOS_OT_POR_DEFECTO,
  ListarMisOtsQuery,
  ListarOtsProyectoQuery,
} from "../../schemas/sivu/listadoOt.schema";

/**
 * Listados de OT (CC-061, CC-064, CC-065):
 *
 * - B3, GET /api/sivu/projects/:id/work-orders — OT del proyecto.
 *   Con `tipo_ot = mantenimiento`, todos los miembros ven todas, en
 *   solo lectura. Con `tipo_ot = inspeccion` (CC-061): el Usuario
 *   municipal y el Administrador, todas; el Inspector, solo las suyas
 *   como responsable actual; el Encargado de mantención, ninguna (403).
 * - B4, GET /api/sivu/work-orders/mine — las OT donde el usuario es el
 *   responsable actual, de todos los proyectos donde es miembro.
 *
 * Todo se lee con el JWT del usuario (PR-018 v6.0): la RLS de la 017
 * limita las filas a sus proyectos. El nombre del responsable sale de
 * `fn_miembros_proyecto` (024).
 */

export interface CodigoEtiqueta {
  codigo: string;
  etiqueta: string;
}

export interface OtListada {
  id: string;
  codigo_ot: string | null;
  tipo_ot: CodigoEtiqueta;
  accion: CodigoEtiqueta;
  subtipo: CodigoEtiqueta | null;
  prioridad: CodigoEtiqueta | null;
  estado: CodigoEtiqueta;
  fecha_accion_programada: string | null;
  fecha_creacion_ot: string;
  fecha_completada_ot: string | null;
  proyecto: { id: string; nombre_proyecto: string | null };
  /** `null` en una OT de Levantamiento (no tiene árbol todavía). */
  arbol: {
    id: string;
    tree_code: string;
    nombre_comun: string | null;
    especie_cientifica: string | null;
    ubicacion_descriptiva: string | null;
    ubicacion: { lng: number; lat: number } | null;
  } | null;
  requiere_revision_inspector: boolean | null;
  responsable: { id: string; nombre: string | null; fuera_del_proyecto?: true } | null;
  acciones: string[];
}

export interface ListadoOt {
  data: OtListada[];
  total: number;
  limit: number;
  offset: number;
}

/** B3 — OT del proyecto. */
export async function listarOtsDeProyecto(
  user: AuthenticatedUser,
  projectId: string,
  query: ListarOtsProyectoQuery,
  accessToken: string
): Promise<ListadoOt> {
  await assertProjectAccess(user, projectId, accessToken);

  const filtros: FiltrosListadoOt = {
    projectId,
    estados: query.estado ?? ESTADOS_OT_POR_DEFECTO,
    limit: query.limit,
    offset: query.offset,
  };

  if (user.role === "encargado_mantencion") {
    if (query.tipo_ot === "inspeccion") {
      throw new AppError("El Encargado de mantención no ve las OT de Inspección (CC-061)", 403);
    }
    filtros.tipoOt = "mantenimiento";
  } else if (user.role === "inspector") {
    if (query.tipo_ot === "inspeccion") {
      filtros.tipoOt = "inspeccion";
      filtros.responsableId = user.id;
    } else if (query.tipo_ot === "mantenimiento") {
      filtros.tipoOt = "mantenimiento";
    } else {
      filtros.mantenimientoOInspeccionDe = user.id;
    }
  } else {
    filtros.tipoOt = query.tipo_ot;
  }

  return armarListado(user, filtros, accessToken);
}

/** B4 — Mis OT. */
export async function listarMisOts(
  user: AuthenticatedUser,
  query: ListarMisOtsQuery,
  accessToken: string
): Promise<ListadoOt> {
  if (query.project_id) {
    await assertProjectAccess(user, query.project_id, accessToken);
  }

  // Defensa: el Inspector solo es responsable de OT de Inspección y el
  // Encargado de mantención solo de las de Mantenimiento (CC-050).
  const tipoDelRol =
    user.role === "inspector" ? "inspeccion" : user.role === "encargado_mantencion" ? "mantenimiento" : undefined;
  if (tipoDelRol && query.tipo_ot && query.tipo_ot !== tipoDelRol) {
    return { data: [], total: 0, limit: query.limit, offset: query.offset };
  }

  return armarListado(
    user,
    {
      projectId: query.project_id,
      responsableId: user.id,
      tipoOt: tipoDelRol ?? query.tipo_ot,
      estados: query.estado ?? ESTADOS_OT_POR_DEFECTO,
      limit: query.limit,
      offset: query.offset,
    },
    accessToken
  );
}

async function armarListado(user: AuthenticatedUser, filtros: FiltrosListadoOt, accessToken: string): Promise<ListadoOt> {
  const { filas, total } = await listarOrdenesTrabajo(accessToken, filtros);

  const treeIds = [...new Set(filas.map((f) => f.tree_id).filter((id): id is string => id !== null))];
  const projectIds = [...new Set(filas.map((f) => f.project_id))];

  const [arboles, proyectos, miembrosPorProyecto] = await Promise.all([
    obtenerArbolesDeOts(accessToken, treeIds),
    obtenerProyectosDeOts(accessToken, projectIds),
    Promise.all(projectIds.map(async (id) => [id, await obtenerMiembrosDeProyecto(accessToken, id)] as const)),
  ]);

  const arbolPorId = new Map(arboles.map((a) => [a.id, a]));
  const proyectoPorId = new Map(proyectos.map((p) => [p.id, p]));
  const miembrosPorProyectoMap = new Map(
    miembrosPorProyecto.map(([id, miembros]) => [id, new Map(miembros.map((m) => [m.id, m]))])
  );

  return {
    data: filas.map((fila) => {
      const responsableId = fila.responsable_accion_id;
      const miembro = responsableId
        ? miembrosPorProyectoMap.get(fila.project_id)?.get(responsableId)
        : undefined;
      const responsable = responsableId
        ? miembro
          ? { id: responsableId, nombre: miembro.nombre }
          : { id: responsableId, nombre: null, fuera_del_proyecto: true as const }
        : null;

      return aOtListada(user, fila, {
        arbol: fila.tree_id ? arbolPorId.get(fila.tree_id) ?? null : null,
        nombreProyecto: proyectoPorId.get(fila.project_id)?.nombre_proyecto ?? null,
        responsable,
      });
    }),
    total,
    limit: filtros.limit,
    offset: filtros.offset,
  };
}

function aOtListada(
  user: AuthenticatedUser,
  fila: OtListadoRow,
  extra: {
    arbol: ArbolDeOtRow | null;
    nombreProyecto: string | null;
    responsable: { id: string; nombre: string | null; fuera_del_proyecto?: true } | null;
  }
): OtListada {
  const esInspeccion = fila.tipo_ot === "inspeccion";
  const catalogoAccion = esInspeccion ? "tipo_inspeccion_realizada" : "accion_mantenimiento";
  const catalogoSubtipo = esInspeccion ? "subtipo_inspeccion" : "subtipo_mantenimiento";
  const coordenadas = extra.arbol?.ubicacion?.coordinates;

  return {
    id: fila.id,
    codigo_ot: fila.codigo_ot,
    tipo_ot: conEtiqueta("tipo_ot", fila.tipo_ot),
    accion: conEtiqueta(catalogoAccion, fila.accion_solicitada),
    subtipo: fila.subtipo_accion ? conEtiqueta(catalogoSubtipo, fila.subtipo_accion) : null,
    prioridad: fila.prioridad ? conEtiqueta("clasificacion_prioridad", fila.prioridad) : null,
    estado: conEtiqueta("estado_ot", fila.estado_ot),
    fecha_accion_programada: fila.fecha_accion_programada,
    fecha_creacion_ot: fila.fecha_creacion_ot,
    fecha_completada_ot: fila.fecha_completada_ot,
    proyecto: { id: fila.project_id, nombre_proyecto: extra.nombreProyecto },
    arbol: extra.arbol
      ? {
          id: extra.arbol.id,
          tree_code: extra.arbol.tree_code,
          nombre_comun: extra.arbol.nombre_comun,
          especie_cientifica: extra.arbol.especie_cientifica,
          ubicacion_descriptiva: extra.arbol.ubicacion_descriptiva,
          ubicacion: coordenadas ? { lng: coordenadas[0], lat: coordenadas[1] } : null,
        }
      : null,
    requiere_revision_inspector: fila.requiere_revision_inspector,
    responsable: extra.responsable,
    acciones: accionesDisponibles(user, fila),
  };
}

function conEtiqueta(catalogo: string, codigo: string): CodigoEtiqueta {
  return { codigo, etiqueta: etiquetaDe(catalogo, codigo) };
}

/**
 * Acciones que ya están implementadas (CC-065 punto 5): el Inspector
 * responsable de una OT de Inspección la programa, la inicia (018g) y
 * trabaja la inspección (#58, #59, #72). Completar, cancelar y reasignar
 * (Usuario municipal) y lo de Mantenimiento (#61) todavía no existen.
 */
function accionesDisponibles(user: AuthenticatedUser, fila: OtListadoRow): string[] {
  if (user.role !== "inspector" || fila.tipo_ot !== "inspeccion" || fila.responsable_accion_id !== user.id) {
    return [];
  }
  switch (fila.estado_ot) {
    case "pendiente":
      return ["programar"];
    case "programada":
      return ["iniciar"];
    case "en_ejecucion":
      return ["trabajar"];
    default:
      return [];
  }
}
