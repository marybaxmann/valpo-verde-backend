import { supabaseAdmin } from "../config/supabase";

/**
 * Fila de la tabla `projects` (ver database/schema.sql — PR-005 v3.0 /
 * ADR-005 v2.0). No incluye columnas derivadas ni de otras tablas.
 */
export interface ProjectRow {
  id: string;
  name: string;
  institution_name: string;
  responsible_professional: string | null;
  created_by: string | null;
  status: "activo" | "cerrado";
  created_at: string;
  updated_at: string;
}

const PROJECT_COLUMNS =
  "id, name, institution_name, responsible_professional, created_by, status, created_at, updated_at";

/**
 * Lista todos los proyectos. Uso exclusivo de `admin` (acceso transversal,
 * PR-004 v4.0) — la restricción de rol se aplica en authorization.service,
 * no aquí.
 */
export async function findAllProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar proyectos: ${error.message}`);
  }

  return (data ?? []) as unknown as ProjectRow[];
}

/**
 * Lista únicamente los proyectos donde el usuario tiene una fila en
 * `project_members` (PR-003 v4.0 / ADR-005 v2.0). Usa un inner join sobre
 * `project_members` filtrado por `user_id`: como `project_members` tiene
 * `UNIQUE(project_id, user_id)`, cada proyecto aparece a lo sumo una vez.
 */
export async function findProjectsForMember(
  userId: string
): Promise<ProjectRow[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`${PROJECT_COLUMNS}, project_members!inner(user_id)`)
    .eq("project_members.user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar proyectos del usuario: ${error.message}`);
  }

  return (data ?? []) as unknown as ProjectRow[];
}

/**
 * Busca un proyecto por id. Devuelve null si no existe — la
 * interpretación (404) queda a cargo del service que la invoque, mismo
 * patrón que auth.repository.ts / userProfile.repository.ts.
 */
export async function findProjectById(
  id: string
): Promise<ProjectRow | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as ProjectRow;
}

export interface CreateProjectInput {
  name: string;
  institution_name: string;
  responsible_professional?: string | null;
  created_by: string;
}

/**
 * Crea un proyecto. `created_by` siempre proviene de `req.user.id`
 * (resuelto en project.service.ts), nunca del body del cliente.
 */
export async function createProject(
  input: CreateProjectInput
): Promise<ProjectRow> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      name: input.name,
      institution_name: input.institution_name,
      responsible_professional: input.responsible_professional ?? null,
      created_by: input.created_by,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Error al crear proyecto: ${error?.message ?? "desconocido"}`);
  }

  return data as unknown as ProjectRow;
}
