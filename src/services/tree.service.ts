import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { InvalidLocationError, LonLat, parseLocationPoint } from "../utils/geoPoint";
import { findProjectById } from "../repositories/project.repository";
import { findTreesPage, TreeRow } from "../repositories/tree.repository";
import { assertProjectAccess } from "./authorization.service";

/**
 * Inventario espacial de un proyecto para el mapa (SIG-1, ADR-015,
 * ADR-010 v2.0). GeoJSON RFC 7946: WGS84, coordenadas [lon, lat], sin
 * miembro `crs`. Solo lectura: las coordenadas son derivadas de
 * `trees.ubicacion` y no se persisten en ningún otro lugar.
 */

export interface TreeFeatureProperties {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  estado_ciclo_vida: string;
  nombre_cientifico: string | null;
  nombre_comun: string | null;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
}

export interface TreeFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: LonLat };
  properties: TreeFeatureProperties;
}

export interface TreeInventory {
  data: { type: "FeatureCollection"; features: TreeFeature[] };
  meta: { total: number; con_ubicacion: number; sin_ubicacion: number };
}

/**
 * Lee TODOS los árboles del proyecto por cursor (`id > último id`). Termina
 * solo con una página vacía: una página corta no significa fin, porque el
 * tope por respuesta lo fija la configuración de Supabase, no este código.
 */
async function findAllProjectTrees(accessToken: string, projectId: string): Promise<TreeRow[]> {
  const rows: TreeRow[] = [];
  let afterId: string | null = null;

  for (;;) {
    const page = await findTreesPage(accessToken, projectId, afterId);
    if (page.length === 0) {
      return rows;
    }
    const lastId = page[page.length - 1].id;
    if (afterId !== null && lastId <= afterId) {
      // Defensa contra un bucle infinito si el orden por id no se respetara.
      throw new Error("La paginación de árboles no avanzó");
    }
    rows.push(...page);
    afterId = lastId;
  }
}

function toFeature(row: TreeRow, coordinates: LonLat): TreeFeature {
  return {
    type: "Feature",
    id: row.id,
    geometry: { type: "Point", coordinates },
    properties: {
      id: row.id,
      tree_code: row.tree_code,
      legacy_id: row.legacy_id,
      estado_ciclo_vida: row.estado_ciclo_vida,
      nombre_cientifico: row.species?.nombre_cientifico ?? null,
      nombre_comun: row.species?.nombre_comun ?? null,
      direccion: row.direccion,
      comuna: row.comuna,
      lugar_referencia: row.lugar_referencia,
    },
  };
}

/**
 * GET /api/projects/:id/trees. Mismo orden que GET /api/projects/:id:
 * primero el acceso (403 sin revelar existencia), luego 404 si el proyecto
 * no existe. Devuelve todos los estados de ciclo de vida, sin filtrar.
 * Los árboles sin ubicación se cuentan en `meta` pero no van en `features`.
 */
export async function listProjectTreesForUser(
  user: AuthenticatedUser,
  projectId: string,
  accessToken: string
): Promise<TreeInventory> {
  await assertProjectAccess(user, projectId, accessToken);
  const project = await findProjectById(accessToken, projectId);
  if (!project) {
    throw new AppError("Proyecto no encontrado", 404);
  }

  const rows = await findAllProjectTrees(accessToken, projectId);
  const features: TreeFeature[] = [];
  let sinUbicacion = 0;

  for (const row of rows) {
    let coordinates: LonLat | null;
    try {
      coordinates = parseLocationPoint(row.ubicacion);
    } catch (err) {
      if (err instanceof InvalidLocationError) {
        // Nunca se descarta un punto en silencio: el inventario no se
        // entrega incompleto. Se registra solo el id del árbol.
        console.error(`${err.message} (tree_id=${row.id})`);
        throw new AppError("Los datos espaciales del inventario tienen un formato inesperado", 500);
      }
      throw err;
    }

    if (coordinates === null) {
      sinUbicacion += 1;
    } else {
      features.push(toFeature(row, coordinates));
    }
  }

  return {
    data: { type: "FeatureCollection", features },
    meta: {
      total: rows.length,
      con_ubicacion: features.length,
      sin_ubicacion: sinUbicacion,
    },
  };
}
