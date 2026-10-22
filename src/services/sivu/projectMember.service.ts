import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { findProyectoById } from "../../repositories/sivu/project.repository";
import {
  createMembershipSivu,
  deleteMembershipSivu,
  DuplicateMembershipError,
} from "../../repositories/sivu/projectMember.repository";
import {
  listMembersByProject,
  ProjectMemberWithUserRow,
} from "../../repositories/projectMember.repository";
import { findUserProfileById } from "../../repositories/userProfile.repository";
import { assertAdmin, invalidateMembership } from "../authorization.service";

/**
 * Gestión de miembros (MIEMBROS_PROYECTO). Todas las operaciones son
 * admin-only (PR-004 v7.0), igual que en la demo — el Administrador
 * sigue gestionando miembros aunque el proyecto esté cerrado (migración
 * 017, §3.2: sin trigger de proyecto cerrado sobre `project_members`).
 */

async function assertProyectoExists(accessToken: string, projectId: string): Promise<void> {
  const proyecto = await findProyectoById(accessToken, projectId);
  if (!proyecto) {
    throw new AppError("Proyecto no encontrado", 404);
  }
}

/** GET /api/sivu/projects/:id/members. Lectura con el JWT del usuario (ADR-014 v2.0). */
export async function listProyectoMembers(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<ProjectMemberWithUserRow[]> {
  assertAdmin(user);
  await assertProyectoExists(accessToken, projectId);

  return listMembersByProject(accessToken, projectId);
}

/**
 * POST /api/sivu/projects/:id/members. Orden: rol admin (403) → proyecto
 * existe (404) → usuario existe (404) → membresía no duplicada (409).
 * Escritura con `service_role` (ver projectMember.repository.ts, sivu).
 */
export async function addProyectoMember(
  user: AuthenticatedUser,
  projectId: string,
  targetUserId: string,
  accessToken: string
) {
  assertAdmin(user);
  await assertProyectoExists(accessToken, projectId);

  const targetProfile = await findUserProfileById(targetUserId);
  if (!targetProfile) {
    throw new AppError("Usuario no encontrado", 404);
  }

  try {
    return await createMembershipSivu(projectId, targetUserId, user.id);
  } catch (err) {
    if (err instanceof DuplicateMembershipError) {
      throw new AppError("El usuario ya es miembro de este proyecto", 409);
    }
    throw err;
  }
}

/**
 * DELETE /api/sivu/projects/:id/members/:userId. Tras eliminar, invalida
 * la membresía en caché (`membershipCache`, `authorization.service.ts`):
 * si no se invalida, un usuario recién removido podría seguir pasando
 * `assertProjectAccess`/`assertProjectRole` hasta 60 s después, pese a
 * que su fila en `project_members` ya no existe.
 */
export async function removeProyectoMember(
  user: AuthenticatedUser,
  projectId: string,
  targetUserId: string,
  accessToken: string
): Promise<void> {
  assertAdmin(user);
  await assertProyectoExists(accessToken, projectId);

  const deleted = await deleteMembershipSivu(projectId, targetUserId);
  if (!deleted) {
    throw new AppError("Membresía no encontrada", 404);
  }
  invalidateMembership(projectId, targetUserId);
}
