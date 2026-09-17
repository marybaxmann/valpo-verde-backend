import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import {
  createProject,
  findAllProjects,
  findProjectById,
  findProjectsForMember,
  ProjectRow,
} from "../repositories/project.repository";
import { assertAdmin, assertProjectAccess, isAdmin } from "./authorization.service";
import { CreateProjectBody } from "../schemas/project.schema";

/**
 * GET /api/projects (PR-003 v4.0 / PR-004 v4.0):
 * - admin → todos los proyectos.
 * - usuario_municipal → solo proyectos donde tiene fila en
 *   `project_members`.
 */
export async function listProjectsForUser(
  user: AuthenticatedUser,
  accessToken: string
): Promise<ProjectRow[]> {
  if (isAdmin(user)) {
    return findAllProjects(accessToken);
  }

  return findProjectsForMember(accessToken, user.id);
}

/**
 * POST /api/projects. Solo admin (PR-004 v4.0). `created_by` siempre
 * proviene de `user.id`, nunca del body — el schema Zod ya rechaza ese
 * campo si el cliente lo envía (defensa en profundidad).
 */
export async function createProjectForUser(
  user: AuthenticatedUser,
  body: CreateProjectBody,
  accessToken: string
): Promise<ProjectRow> {
  assertAdmin(user);

  return createProject(accessToken, {
    name: body.name,
    institution_name: body.institution_name,
    responsible_professional: body.responsible_professional ?? null,
    created_by: user.id,
  });
}

/**
 * GET /api/projects/:id (PR-003 v4.0 / PR-004 v4.0):
 * - admin → permitido siempre.
 * - usuario_municipal con membresía → permitido.
 * - usuario_municipal sin membresía → 403 (assertProjectAccess).
 *
 * El check de acceso se hace ANTES de buscar el proyecto: así, un
 * usuario_municipal sin membresía recibe 403 sin que el backend
 * distinga entre "proyecto existe pero no es tuyo" y "proyecto no
 * existe" (no revela existencia a quien no tiene acceso). Un admin sin
 * acceso restringido puede llegar a un proyecto inexistente, en cuyo
 * caso se traduce a 404.
 */
export async function getProjectByIdForUser(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<ProjectRow> {
  await assertProjectAccess(user, projectId, accessToken);

  const project = await findProjectById(accessToken, projectId);

  if (!project) {
    throw new AppError("Proyecto no encontrado", 404);
  }

  return project;
}
