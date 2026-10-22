import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import {
  crearProyectoConSectorRpc,
  findAllProyectos,
  findProyectoById,
  findProyectosForMember,
  findSectorByProyectoId,
  POSTGRES_RAISE_EXCEPTION,
  ProyectoRow,
  SectorRow,
  updateEstadoProyecto,
  updateGeometriaSector,
  updateNombreProyecto,
  updateNombreSector,
} from "../../repositories/sivu/project.repository";
import { assertAdmin, assertProjectAccess, isAdmin } from "../authorization.service";
import { resolverGeometriaSector } from "./geometriaSector.service";
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
    const { project_id, sector_id } = await crearProyectoConSectorRpc(
      body.nombre_proyecto,
      body.sector.nombre_sector,
      geometria,
      user.id
    );
    return { projectId: project_id, sectorId: sector_id };
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
): Promise<void> {
  assertAdmin(user);
  await assertProyectoExists(accessToken, projectId);

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
        await updateGeometriaSector(sector.id, geometria);
      }
    }
  } catch (err: unknown) {
    throw traducirErrorProyectoOSector(err);
  }
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
 * `fn_update_sector_geometria` / los triggers de CC-042 a un `AppError`
 * con el código HTTP correcto. Se distingue por `cause` (el código de
 * Postgres, ver `project.repository.ts`) antes de mirar el mensaje: un
 * error de infraestructura (sin ese código) nunca se confunde con un
 * rechazo de negocio.
 */
function traducirErrorProyectoOSector(err: unknown): Error {
  if (err instanceof AppError) {
    return err;
  }

  const error = err as Error;
  const esRaiseDeNegocio = (error as { cause?: unknown }).cause === POSTGRES_RAISE_EXCEPTION;
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
  // Cualquier otro RAISE EXCEPTION de fn_build_sector_geometria
  // (GeoJSON/KML inválido, tipo no admitido, coordenadas fuera de
  // rango, geometría inválida o vacía): dato de entrada rechazado, 400.
  return new AppError(msg, 400);
}
