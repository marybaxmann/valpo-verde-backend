import { supabaseAdmin } from "../config/supabase";

/**
 * Fila de `project_members` (ver database/schema.sql — PR-005 v3.0 /
 * ADR-005 v2.0). Representa SOLO pertenencia; no lleva rol propio.
 */
export interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  added_by: string | null;
}

/**
 * Fila de `project_members` enriquecida con el nombre del usuario
 * (join a `user_profiles`), para el listado de miembros de un proyecto.
 */
export interface ProjectMemberWithUserRow extends ProjectMemberRow {
  user: { nombre: string | null } | null;
}

const MEMBER_COLUMNS = "id, project_id, user_id, created_at, added_by";

/**
 * Código de error de Postgres para violación de restricción UNIQUE.
 * Se usa para distinguir una membresía duplicada de cualquier otro error
 * de escritura, sin dejar pasar el error crudo del driver al service.
 */
const POSTGRES_UNIQUE_VIOLATION = "23505";

/**
 * Error de dominio que señala que la membresía ya existía
 * (`UNIQUE(project_id, user_id)`). El service la traduce a `AppError` 409.
 */
export class DuplicateMembershipError extends Error {
  constructor() {
    super("La membresía ya existe para este proyecto y usuario");
    this.name = "DuplicateMembershipError";
  }
}

/**
 * Verifica si existe una fila de pertenencia para (projectId, userId).
 * Es la consulta central de autorización de `usuario_municipal`
 * (PR-003 v4.0): se usa bajo demanda, no se precalcula en el middleware.
 */
export async function findMembership(
  projectId: string,
  userId: string
): Promise<ProjectMemberRow | null> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select(MEMBER_COLUMNS)
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as ProjectMemberRow;
}

/**
 * Lista los miembros de un proyecto (admin-only; la restricción de rol se
 * aplica en authorization.service, no aquí), con el nombre del usuario.
 */
export async function listMembersByProject(
  projectId: string
): Promise<ProjectMemberWithUserRow[]> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select(`${MEMBER_COLUMNS}, user:user_profiles(nombre)`)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar miembros del proyecto: ${error.message}`);
  }

  return (data ?? []) as unknown as ProjectMemberWithUserRow[];
}

/**
 * Crea una membresía. Lanza DuplicateMembershipError si ya existía una
 * fila para (projectId, userId) — el service la traduce a AppError 409.
 */
export async function createMembership(
  projectId: string,
  userId: string,
  addedBy: string
): Promise<ProjectMemberRow> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, added_by: addedBy })
    .select(MEMBER_COLUMNS)
    .single();

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      throw new DuplicateMembershipError();
    }
    throw new Error(`Error al agregar miembro: ${error.message}`);
  }

  if (!data) {
    throw new Error("Error al agregar miembro: sin datos de respuesta");
  }

  return data as unknown as ProjectMemberRow;
}

/**
 * Elimina la membresía de (projectId, userId). Devuelve true si existía y
 * fue eliminada, false si no existía ninguna fila — el service decide si
 * eso se traduce en un 404.
 */
export async function deleteMembership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    throw new Error(`Error al eliminar miembro: ${error.message}`);
  }

  return (data ?? []).length > 0;
}
