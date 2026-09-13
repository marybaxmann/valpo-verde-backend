import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { findProjectById } from "../repositories/project.repository";
import {
  createMembership,
  deleteMembership,
  DuplicateMembershipError,
  listMembersByProject,
  ProjectMemberWithUserRow,
} from "../repositories/projectMember.repository";
import { findUserProfileById } from "../repositories/userProfile.repository";
import { assertAdmin } from "./authorization.service";

/**
 * Todas las operaciones de este service son admin-only (PR-003 v4.0:
 * usuario_municipal NO consulta lista de miembros ni agrega/elimina
 * membresías; PR-004 v4.0: admin gestiona miembros).
 */

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError("Proyecto no encontrado", 404);
  }
}

/**
 * GET /api/projects/:id/members. Admin-only.
 */
export async function listProjectMembers(
  user: AuthenticatedUser,
  projectId: string
): Promise<ProjectMemberWithUserRow[]> {
  assertAdmin(user);
  await assertProjectExists(projectId);

  return listMembersByProject(projectId);
}

/**
 * POST /api/projects/:id/members. Admin-only.
 *
 * Validaciones, en orden:
 * 1. rol admin (403 si no);
 * 2. proyecto existe (404 si no);
 * 3. usuario existe en user_profiles (404 si no);
 * 4. membresía no duplicada (409 si UNIQUE(project_id, user_id) falla).
 */
export async function addProjectMember(
  user: AuthenticatedUser,
  projectId: string,
  targetUserId: string
) {
  assertAdmin(user);
  await assertProjectExists(projectId);

  const targetProfile = await findUserProfileById(targetUserId);
  if (!targetProfile) {
    throw new AppError("Usuario no encontrado", 404);
  }

  try {
    return await createMembership(projectId, targetUserId, user.id);
  } catch (err) {
    if (err instanceof DuplicateMembershipError) {
      throw new AppError("El usuario ya es miembro de este proyecto", 409);
    }
    throw err;
  }
}

/**
 * DELETE /api/projects/:id/members/:userId. Admin-only.
 */
export async function removeProjectMember(
  user: AuthenticatedUser,
  projectId: string,
  targetUserId: string
): Promise<void> {
  assertAdmin(user);
  await assertProjectExists(projectId);

  const deleted = await deleteMembership(projectId, targetUserId);
  if (!deleted) {
    throw new AppError("Membresía no encontrada", 404);
  }
}
