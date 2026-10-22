import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";
import { GeometriaParaRpc } from "../../services/sivu/geometriaSector.service";

/**
 * Fila de `projects` en el modelo nuevo (PR-005 v4.0; migración 012 +
 * 018b). Separada de `ProjectRow` de la demo (`project.repository.ts`,
 * sin subcarpeta): esa interfaz todavía tiene `institution_name` y
 * `responsible_professional`, columnas que la 018b retiró — pero solo
 * en `valpo-verde-conecta-pruebas`. La demo sigue contra
 * `valpo-verde-conecta`, sin esta migración, así que su interfaz sigue
 * siendo correcta para esa base.
 */
export interface ProyectoRow {
  id: string;
  nombre_proyecto: string;
  estado_proyecto: "activo" | "cerrado";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectorRow {
  id: string;
  project_id: string;
  nombre_sector: string;
  superficie_sector_m2: number;
  created_at: string;
  updated_at: string;
}

const PROYECTO_COLUMNS = "id, nombre_proyecto, estado_proyecto, created_by, created_at, updated_at";
const SECTOR_COLUMNS = "id, project_id, nombre_sector, superficie_sector_m2, created_at, updated_at";

/**
 * Código de Postgres para un RAISE EXCEPTION sin ERRCODE explícito —
 * el que usan `fn_create_project_with_sector`, `fn_update_sector_geometria`
 * y los triggers de CC-042 (proyecto cerrado) en sus mensajes de
 * negocio. El service lo distingue de un error de infraestructura
 * (falló la conexión, etc.) por este código, antes de clasificar el
 * mensaje.
 */
export const POSTGRES_RAISE_EXCEPTION = "P0001";

/**
 * Lista todos los proyectos. Uso exclusivo de `admin` (acceso
 * transversal, PR-004 v7.0) — la restricción de rol se aplica en
 * authorization.service, no aquí. Lectura con el JWT del usuario
 * (ADR-014 v2.0); las policies `projects_select_admin` /
 * `projects_select_project_roles` (migración 017) ya filtran.
 */
export async function findAllProyectos(accessToken: string): Promise<ProyectoRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("projects")
    .select(PROYECTO_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar proyectos: ${error.message}`);
  }

  return (data ?? []) as unknown as ProyectoRow[];
}

/**
 * Lista únicamente los proyectos donde el usuario tiene una fila en
 * `project_members` (PR-003 v8.0).
 */
export async function findProyectosForMember(
  accessToken: string,
  userId: string
): Promise<ProyectoRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROYECTO_COLUMNS}, project_members!inner(user_id)`)
    .eq("project_members.user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al listar proyectos del usuario: ${error.message}`);
  }

  return (data ?? []) as unknown as ProyectoRow[];
}

export async function findProyectoById(
  accessToken: string,
  id: string
): Promise<ProyectoRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("projects")
    .select(PROYECTO_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as ProyectoRow;
}

/**
 * El sector del proyecto (uno por proyecto, `sectors.project_id` es
 * UNIQUE — ver schema.sql).
 */
export async function findSectorByProyectoId(
  accessToken: string,
  projectId: string
): Promise<SectorRow | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("sectors")
    .select(SECTOR_COLUMNS)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as SectorRow;
}

export interface CrearProyectoConSectorResult {
  project_id: string;
  sector_id: string;
}

/**
 * Invoca `fn_create_project_with_sector` (migración 018b): PROYECTOS +
 * SECTORES en una sola transacción (una sola invocación de la función
 * ya lo es), con la validación geométrica de D-265 hecha en SQL. Con
 * `supabaseAdmin` (`service_role`): la autorización (`assertAdmin`) ya
 * ocurrió en el service antes de llamar esto (ADR-014 v2.0; ADR-017
 * v1.1) — no se repite el patrón de `fn_create_tree_with_measurement`,
 * que valida auth.uid() adentro porque se invoca con el JWT del usuario.
 */
export async function crearProyectoConSectorRpc(
  nombreProyecto: string,
  nombreSector: string,
  geometria: GeometriaParaRpc,
  createdBy: string
): Promise<CrearProyectoConSectorResult> {
  const { data, error } = await supabaseAdmin.rpc("fn_create_project_with_sector", {
    p_nombre_proyecto: nombreProyecto,
    p_nombre_sector: nombreSector,
    p_formato: geometria.formato,
    p_geometria_geojson: geometria.geometriaGeojson,
    p_geometria_kml: geometria.geometriaKml,
    p_created_by: createdBy,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as CrearProyectoConSectorResult;
}

/**
 * PATCH nombre_proyecto. El trigger `trg_projects_self_closed`
 * (migración 017, CC-042) rechaza esto si el proyecto está cerrado.
 */
export async function updateNombreProyecto(id: string, nombreProyecto: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ nombre_proyecto: nombreProyecto })
    .eq("id", id);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
}

/** PATCH nombre_sector. Bloqueado si el proyecto está cerrado (trg_sectors_proyecto_cerrado). */
export async function updateNombreSector(projectId: string, nombreSector: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sectors")
    .update({ nombre_sector: nombreSector })
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
}

/**
 * PATCH geometria_sector, vía `fn_update_sector_geometria` (migración
 * 018b): misma validación de D-265 que al crear. Bloqueado si el
 * proyecto está cerrado (trg_sectors_proyecto_cerrado).
 */
export async function updateGeometriaSector(
  sectorId: string,
  geometria: GeometriaParaRpc
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("fn_update_sector_geometria", {
    p_sector_id: sectorId,
    p_formato: geometria.formato,
    p_geometria_geojson: geometria.geometriaGeojson,
    p_geometria_kml: geometria.geometriaKml,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
}

/**
 * PATCH estado_proyecto (D-275; CC-042). El trigger `trg_projects_self_closed`
 * solo deja pasar la transición de estado (cerrar/reabrir), nunca otro
 * cambio mientras está cerrado.
 */
export async function updateEstadoProyecto(
  id: string,
  estado: "activo" | "cerrado"
): Promise<ProyectoRow | null> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ estado_proyecto: estado })
    .eq("id", id)
    .select(PROYECTO_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as ProyectoRow | null;
}
