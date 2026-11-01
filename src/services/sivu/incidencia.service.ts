import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess, assertProjectRole } from "../authorization.service";
import { etiquetaDe } from "../rules/engine/catalogs";
import { eliminarArchivoDeStorage, generarUrlFirmada } from "../../repositories/sivu/photo.repository";
import {
  IncidenciaRow,
  listarFotosIncidencia,
  listarIncidenciasProyecto,
  obtenerIncidencia,
  revisarIncidencia,
} from "../../repositories/sivu/conecta.repository";
import { obtenerMiembrosDeProyecto } from "../../repositories/sivu/workOrder.repository";
import { ListarIncidenciasQuery, RevisionIncidenciaBody } from "../../schemas/sivu/conecta.schema";

/**
 * Incidencias del proyecto, parte interna (#62): B9 (listado y detalle)
 * y revisión municipal. Todos los miembros ven las incidencias (CC-064
 * a); el nombre y el RUT, solo el Usuario municipal miembro (PR-022
 * v2.0): la RLS de la 017 ya los oculta a los demás y el service no los
 * entrega a otro rol aunque llegaran.
 */

const conEtiqueta = (catalogo: string, codigo: string | null) =>
  codigo === null ? null : { codigo, etiqueta: etiquetaDe(catalogo, codigo) };

type Miembros = Map<string, { nombre: string | null }>;

/**
 * Nombres de los revisores con fn_miembros_proyecto (024), como B3: la
 * RLS de user_profiles no deja leer el perfil de otra persona. Solo se
 * consulta si alguna fila tiene revisor.
 */
async function miembrosSiHaceFalta(filas: IncidenciaRow[], projectId: string, token: string): Promise<Miembros> {
  if (!filas.some((f) => f.revisado_por)) return new Map();
  const miembros = await obtenerMiembrosDeProyecto(token, projectId);
  return new Map(miembros.map((m) => [m.id, { nombre: m.nombre }]));
}

function incidencia(fila: IncidenciaRow, user: AuthenticatedUser, miembros: Miembros) {
  const revisor = fila.revisado_por;
  const verReportante = user.role === "usuario_municipal";
  return {
    id: fila.id,
    codigo_incidencia: fila.codigo_incidencia,
    arbol: fila.trees
      ? { id: fila.tree_id, tree_code: fila.trees.tree_code, especie_cientifica: fila.trees.especie_cientifica, nombre_comun: fila.trees.nombre_comun }
      : { id: fila.tree_id, tree_code: null, especie_cientifica: null, nombre_comun: null },
    tipo_incidencia: conEtiqueta("tipo_incidencia", fila.tipo_incidencia),
    descripcion: fila.descripcion,
    ubicacion: fila.ubicacion,
    fecha_reporte: fila.fecha_reporte,
    origen_reporte: conEtiqueta("origen_reporte", fila.origen_reporte),
    estado_incidencia: conEtiqueta("estado_incidencia", fila.estado_incidencia),
    fecha_actualizacion_estado: fila.fecha_actualizacion_estado,
    resultado_revision: conEtiqueta("resultado_revision", fila.resultado_revision),
    observaciones_revision: fila.observaciones_revision,
    prioridad_municipal: conEtiqueta("prioridad_municipal", fila.prioridad_municipal),
    fecha_revision: fila.fecha_revision,
    // { id, nombre } del miembro; fuera del proyecto: nombre null y fuera_del_proyecto (como B3).
    revisado_por: !revisor
      ? null
      : miembros.has(revisor)
        ? { id: revisor, nombre: miembros.get(revisor)!.nombre }
        : { id: revisor, nombre: null, fuera_del_proyecto: true as const },
    cantidad_fotos: fila.photos?.[0]?.count ?? 0,
    // Todas las OT creadas con esta incidencia, de la más antigua a la más reciente (created_at, id).
    ot_derivadas: [...(fila.work_orders ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .map((ot) => ({ id: ot.id, codigo_ot: ot.codigo_ot, estado: conEtiqueta("estado_ot", ot.estado_ot) })),
    // null también cuando ya se borraron (Validada o Descartada).
    reportante: verReportante && fila.incident_reporters
      ? { nombre: fila.incident_reporters.nombre_reportante, rut: fila.incident_reporters.rut_reportante }
      : null,
  };
}

/** B2 — incidencias de un árbol para su ficha (hasta 200). Sin autorización: la hace quien llama. */
export async function listarIncidenciasDeArbol(user: AuthenticatedUser, projectId: string, treeId: string, token: string) {
  const { filas } = await listarIncidenciasProyecto(token, { projectId, treeId, limit: 200, offset: 0 });
  const miembros = await miembrosSiHaceFalta(filas, projectId, token);
  return filas.map((f) => incidencia(f, user, miembros));
}

/** B9 — GET /api/sivu/projects/:id/incidencias */
export async function listarIncidencias(user: AuthenticatedUser, projectId: string, query: ListarIncidenciasQuery, token: string) {
  await assertProjectAccess(user, projectId, token);
  const { filas, total } = await listarIncidenciasProyecto(token, {
    projectId,
    estado: query.estado,
    origen: query.origen,
    tipo: query.tipo,
    limit: query.limit,
    offset: query.offset,
  });
  const miembros = await miembrosSiHaceFalta(filas, projectId, token);
  return { data: filas.map((f) => incidencia(f, user, miembros)), total, limit: query.limit, offset: query.offset };
}

/** B9 — GET /api/sivu/projects/:id/incidencias/:incidentId, con sus fotos (enlaces firmados, CC-049). */
export async function detalleIncidencia(user: AuthenticatedUser, projectId: string, incidentId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  const fila = await obtenerIncidencia(token, projectId, incidentId);
  if (!fila) throw new AppError("La incidencia no existe en este proyecto", 404);
  const [fotos, miembros] = await Promise.all([listarFotosIncidencia(token, incidentId), miembrosSiHaceFalta([fila], projectId, token)]);
  return {
    ...incidencia(fila, user, miembros),
    fotos: await Promise.all(fotos.map(async (f) => ({ id: f.id, url: await generarUrlFirmada(f.storage_path), created_at: f.created_at }))),
  };
}

/**
 * PATCH /api/sivu/projects/:id/incidencias/:incidentId/revision — solo
 * el Usuario municipal miembro (D-184 a D-189). Con Descartada, la
 * función borra las filas de las fotos y aquí se borran los archivos
 * (CC-049 punto 6). La derivación a inspección es una OT con
 * `incident_id` (POST /projects/:id/work-orders, CC-036).
 */
export async function revisar(user: AuthenticatedUser, projectId: string, incidentId: string, body: RevisionIncidenciaBody, token: string) {
  await assertProjectRole(user, projectId, ["usuario_municipal"], token);
  const fila = await obtenerIncidencia(token, projectId, incidentId);
  if (!fila) throw new AppError("La incidencia no existe en este proyecto", 404);

  let r;
  try {
    r = await revisarIncidencia({
      incidentId,
      usuario: user.id,
      estado: body.estado_incidencia,
      resultado: body.resultado_revision,
      observaciones: body.observaciones_revision,
      prioridad: body.prioridad_municipal,
    });
  } catch (err) {
    const error = err as Error;
    if ((error as { cause?: unknown }).cause === "SV071") throw new AppError(error.message, 422);
    if (/está cerrado/.test(error.message)) throw new AppError("El proyecto está cerrado: solo consulta", 409);
    throw error;
  }

  await Promise.all(r.fotos_borradas.map((ruta) => eliminarArchivoDeStorage(ruta)));
  const actualizada = await obtenerIncidencia(token, projectId, incidentId);
  const miembros = await miembrosSiHaceFalta([actualizada!], projectId, token);
  return { ...incidencia(actualizada!, user, miembros), fotos_borradas: r.fotos_borradas.length };
}
