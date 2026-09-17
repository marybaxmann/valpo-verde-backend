import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { findMembership } from "../repositories/projectMember.repository";

/**
 * Autorización centralizada del modelo multiproyecto (PR-003 v4.0,
 * PR-004 v4.0, PR-005 v3.0, ADR-005 v2.0).
 *
 * Objetivo de este archivo: que un cambio futuro en los permisos de
 * `usuario_municipal` (o en qué cuenta como "acceso a un proyecto") se
 * pueda hacer principalmente acá, no disperso en `if (user.role === ...)`
 * por controllers/services/repositories.
 *
 * El rol es global (`user_profiles`, ya resuelto en `req.user.role` por
 * auth.middleware.ts). La pertenencia (`project_members`) se resuelve
 * SIEMPRE bajo demanda contra la base de datos, nunca precalculada ni
 * cacheada en `req.user`.
 *
 * Nota para uso futuro (scoping de trees/inspections/incidents/
 * maintenance/infrastructure_conflicts — fuera de alcance de esta
 * implementación, ver PR-005 v3.0 / ADR-005 v2.0): un `project_id NULL`
 * en `trees`/`incidents`/`public_spaces` NUNCA debe interpretarse como
 * perteneciente a un proyecto de `usuario_municipal`. Este archivo no
 * consulta esas tablas directamente; cualquier helper que se agregue más
 * adelante para ese scoping debe respetar esa regla explícitamente (por
 * ejemplo, filtrando `project_id IS NOT NULL` antes de comparar contra
 * los proyectos accesibles del usuario) y debe apoyarse en
 * `assertProjectAccess` / `isAdmin` en vez de reimplementar el check de
 * rol.
 */

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin";
}

/**
 * Exige rol `admin`. Uso: crear proyectos, listar/gestionar miembros —
 * operaciones que PR-003 v4.0 / PR-004 v4.0 reservan exclusivamente al
 * Administrador.
 */
export function assertAdmin(user: AuthenticatedUser): void {
  if (!isAdmin(user)) {
    throw new AppError("Requiere rol administrador", 403);
  }
}

/**
 * Exige acceso a un proyecto puntual:
 * - `admin` → acceso transversal, no-op (PR-004 v4.0).
 * - `usuario_municipal` → exige una fila en `project_members` para
 *   (projectId, user.id) (PR-003 v4.0). Sin membresía → 403.
 *
 * No verifica que el proyecto exista: si `projectId` no corresponde a
 * ningún proyecto real, un `usuario_municipal` tampoco tendrá membresía
 * (la FK de `project_members` lo impide), por lo que este check también
 * devuelve 403 en ese caso. La distinción con "proyecto inexistente"
 * (404) queda a cargo del service, que además intenta obtener el
 * proyecto por id.
 */
export async function assertProjectAccess(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<void> {
  if (isAdmin(user)) {
    return;
  }

  const membership = await findMembership(accessToken, projectId, user.id);

  if (!membership) {
    throw new AppError("No tiene acceso a este proyecto", 403);
  }
}
