import { supabaseAdmin } from "../../config/supabase";
import { ProjectMemberRow } from "../../repositories/projectMember.repository";

/**
 * Escrituras de `project_members` para SIVU, con `service_role`
 * (ADR-014 v2.0; CC-033): en el modelo nuevo no queda ninguna policy de
 * escritura para `authenticated` (migración 017 retiró
 * `project_members_all_admin`), así que ya no sirve el patrón de la
 * demo (`projectMember.repository.ts`, sin subcarpeta, que escribe con
 * el JWT del usuario sobre una policy que en `valpo-verde-conecta-pruebas`
 * ya no existe).
 *
 * Las lecturas (`findMembership`, `listMembersByProject`) SÍ se
 * reutilizan directamente desde `projectMember.repository.ts`: las
 * policies de SELECT (`project_members_select_admin`,
 * `project_members_select_own`) siguen permitiéndolas con el JWT del
 * usuario, que es el patrón correcto (ADR-014 v2.0: lecturas con el
 * JWT, no con `service_role`). `authorization.service.ts` ya sigue
 * exactamente este mismo criterio para `findMembership`.
 */

const POSTGRES_UNIQUE_VIOLATION = "23505";

export class DuplicateMembershipError extends Error {
  constructor() {
    super("La membresía ya existe para este proyecto y usuario");
    this.name = "DuplicateMembershipError";
  }
}

export async function createMembershipSivu(
  projectId: string,
  userId: string,
  addedBy: string
): Promise<ProjectMemberRow> {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId, added_by: addedBy })
    .select("id, project_id, user_id, created_at, added_by")
    .single();

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      throw new DuplicateMembershipError();
    }
    throw new Error(`Error al agregar miembro: ${error.message}`);
  }

  return data as unknown as ProjectMemberRow;
}

/**
 * Devuelve true si existía y fue eliminada, false si no existía ninguna
 * fila. No hay trigger de proyecto cerrado sobre `project_members`
 * (migración 017, §3.2: el Administrador sigue gestionando miembros
 * con el proyecto cerrado).
 */
export async function deleteMembershipSivu(projectId: string, userId: string): Promise<boolean> {
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
