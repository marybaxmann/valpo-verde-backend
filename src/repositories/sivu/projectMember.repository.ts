import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";
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

export interface UsuarioDisponibleRow {
  id: string;
  nombre: string | null;
  codigo_usuario: string | null;
  activo: boolean;
  role: { nombre: string } | null;
}

/**
 * B11: usuarios que todavía no son miembros del proyecto. Lectura con el
 * JWT del Administrador: `user_profiles_select_admin` (017) le deja leer
 * todos los perfiles.
 */
export async function listarUsuariosNoMiembros(accessToken: string, projectId: string): Promise<UsuarioDisponibleRow[]> {
  const cliente = createUserScopedClient(accessToken);
  const [perfiles, miembros] = await Promise.all([
    cliente.from("user_profiles").select("id, nombre, codigo_usuario, activo, role:roles(nombre)").order("nombre", { ascending: true }),
    cliente.from("project_members").select("user_id").eq("project_id", projectId),
  ]);
  if (perfiles.error) throw new Error(perfiles.error.message, { cause: perfiles.error.code });
  if (miembros.error) throw new Error(miembros.error.message, { cause: miembros.error.code });
  const yaMiembros = new Set((miembros.data ?? []).map((m) => m.user_id as string));
  return ((perfiles.data ?? []) as unknown as UsuarioDisponibleRow[]).filter((p) => !yaMiembros.has(p.id));
}
