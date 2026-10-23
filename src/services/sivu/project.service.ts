import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import {
  crearProyectoConSectorRpc,
  findAllProyectos,
  findProyectoById,
  findProyectosForMember,
  findSectorByProyectoId,
  POSTGRES_RAISE_EXCEPTION,
  previsualizarSuperficiesKmlRpc,
  ProyectoRow,
  SectorRow,
  SQLSTATE_GEOMETRIA_SECTOR,
  updateEstadoProyecto,
  updateGeometriaSector,
  updateNombreProyecto,
  updateNombreSector,
  VistaPreviaSuperficies,
} from "../../repositories/sivu/project.repository";
import { assertAdmin, assertProjectAccess, isAdmin } from "../authorization.service";
import { resolverGeometriaSector, resolverKmlParaVistaPrevia } from "./geometriaSector.service";
import { VistaPreviaSectorBody } from "../../schemas/sivu/common.schema";
import {
  CambiarEstadoProyectoBody,
  CrearProyectoConSectorBody,
  EditarProyectoBody,
} from "../../schemas/sivu/proyectos.schema";

export interface ProyectoConSector {
  proyecto: ProyectoRow;
  sector: SectorRow | null;
}

export interface CrearProyectoConSectorResultado {
  projectId: string;
  sectorId: string;
  superficiesExcluidas: number;
}

export interface EditarProyectoResultado {
  superficiesExcluidas: number | null;
}

/**
 * GET /api/sivu/projects (PR-003 v8.0 / PR-004 v7.0):
 * - admin → todos los proyectos.
 * - resto de roles → solo proyectos donde tienen fila en `project_members`.
 */
export async function listProyectosForUser(
  user: AuthenticatedUser,
  accessToken: string
): Promise<ProyectoRow[]> {
  if (isAdmin(user)) {
    return findAllProyectos(accessToken);
  }

  return findProyectosForMember(accessToken, user.id);
}

/**
 * GET /api/sivu/projects/:id. El check de acceso va antes de buscar el
 * proyecto, para no revelar existencia a quien no tiene acceso (mismo
 * orden que `project.service.ts` de la demo).
 */
export async function getProyectoByIdForUser(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<ProyectoConSector> {
  await assertProjectAccess(user, projectId, accessToken);

  const proyecto = await findProyectoById(accessToken, projectId);
  if (!proyecto) {
    throw new AppError("Proyecto no encontrado", 404);
  }

  const sector = await findSectorByProyectoId(accessToken, projectId);
  return { proyecto, sector };
}

/**
 * POST /api/sivu/projects. Solo admin (PR-004 v7.0; PR-005 v4.0): crea
 * PROYECTOS + SECTORES en una sola transacción (diseño §3.3), vía
 * `fn_create_project_with_sector` (migración 018b).
 */
export async function crearProyectoConSector(
  user: AuthenticatedUser,
  body: CrearProyectoConSectorBody
): Promise<CrearProyectoConSectorResultado> {
  assertAdmin(user);

  const geometria = await resolverGeometriaSector(body.sector.geometria_sector);

  try {
    const { project_id, sector_id, superficies_excluidas } = await crearProyectoConSectorRpc(
      body.nombre_proyecto,
      body.sector.nombre_sector,
      geometria,
      user.id
    );
    return { projectId: project_id, sectorId: sector_id, superficiesExcluidas: superficies_excluidas };
  } catch (err: unknown) {
    throw traducirErrorProyectoOSector(err);
  }
}

/**
 * POST /api/sivu/projects/sector-preview. Solo admin; no guarda nada
 * (D-265: "mostrar una vista previa... antes de guardar"; "si existen
 * varias superficies, permitir seleccionar las que integrarán el
 * sector"). Lista cada elemento del archivo con su índice y su estado
 * (CC-047): `valida`, `invalida` (con motivo; no seleccionable) o
 * `excluida` (punto o línea). Esos índices son los que
 * `indicesSeleccionados` usa al crear o editar.
 */
export async function previsualizarSector(
  user: AuthenticatedUser,
  body: VistaPreviaSectorBody
): Promise<VistaPreviaSuperficies> {
  assertAdmin(user);

  const kml = await resolverKmlParaVistaPrevia(body);

  try {
    return await previsualizarSuperficiesKmlRpc(kml);
  } catch (err: unknown) {
    throw traducirErrorProyectoOSector(err);
  }
}

/**
 * PATCH /api/sivu/projects/:id. Solo admin. Si el proyecto está
 * cerrado, los triggers de CC-042 rechazan cualquiera de los dos
 * cambios (se traduce a 409 acá, no se repite ese check en Node).
 */
export async function editarProyecto(
  user: AuthenticatedUser,
  projectId: string,
  body: EditarProyectoBody,
  accessToken: string
): Promise<EditarProyectoResultado> {
  assertAdmin(user);
  await assertProyectoExists(accessToken, projectId);

  let superficiesExcluidas: number | null = null;

  try {
    if (body.nombre_proyecto !== undefined) {
      await updateNombreProyecto(projectId, body.nombre_proyecto);
    }

    if (body.sector !== undefined) {
      if (body.sector.nombre_sector !== undefined) {
        await updateNombreSector(projectId, body.sector.nombre_sector);
      }

      if (body.sector.geometria_sector !== undefined) {
        const sector = await findSectorByProyectoId(accessToken, projectId);
        if (!sector) {
          throw new AppError("Sector no encontrado", 404);
        }
        const geometria = await resolverGeometriaSector(body.sector.geometria_sector);
        const { superficies_excluidas } = await updateGeometriaSector(sector.id, geometria);
        superficiesExcluidas = superficies_excluidas;
      }
    }
  } catch (err: unknown) {
    throw traducirErrorProyectoOSector(err);
  }

  return { superficiesExcluidas };
}

/**
 * PATCH /api/sivu/projects/:id/estado (D-275; CC-042). Solo admin.
 */
export async function cambiarEstadoProyecto(
  user: AuthenticatedUser,
  projectId: string,
  body: CambiarEstadoProyectoBody
): Promise<ProyectoRow> {
  assertAdmin(user);

  try {
    const actualizado = await updateEstadoProyecto(projectId, body.estado_proyecto);
    if (!actualizado) {
      throw new AppError("Proyecto no encontrado", 404);
    }
    return actualizado;
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    throw traducirErrorProyectoOSector(err);
  }
}

async function assertProyectoExists(accessToken: string, projectId: string): Promise<void> {
  const proyecto = await findProyectoById(accessToken, projectId);
  if (!proyecto) {
    throw new AppError("Proyecto no encontrado", 404);
  }
}

/**
 * Traduce un error crudo de `fn_create_project_with_sector` /
 * `fn_update_sector_geometria` / `fn_extraer_superficies_kml` / los
 * triggers de CC-042 a un `AppError` con el código HTTP correcto. Se
 * distingue por `cause` (el código de Postgres, ver
 * `project.repository.ts`) antes de mirar el mensaje: un error de
 * infraestructura (sin ese código) nunca se confunde con un rechazo de
 * negocio.
 */
function traducirErrorProyectoOSector(err: unknown): Error {
  if (err instanceof AppError) {
    return err;
  }

  const error = err as Error;
  const cause = (error as { cause?: unknown }).cause;

  // Rechazo de la geometría del sector (D-265; CC-047): el pedido está
  // bien formado, pero su contenido no se puede aceptar.
  if (cause === SQLSTATE_GEOMETRIA_SECTOR) {
    return new AppError(error.message, 422);
  }

  const esRaiseDeNegocio = cause === POSTGRES_RAISE_EXCEPTION;
  if (!esRaiseDeNegocio) {
    return error;
  }

  const msg = error.message;

  if (msg.includes("está cerrado")) {
    return new AppError(msg, 409);
  }
  if (msg.includes("Sector no encontrado")) {
    return new AppError(msg, 404);
  }
  // Cualquier otro RAISE EXCEPTION de negocio sin código propio: dato
  // de entrada rechazado, 400.
  return new AppError(msg, 400);
}
