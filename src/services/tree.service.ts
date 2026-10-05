import { AuthenticatedUser } from "../types/auth";
import { AppError } from "../utils/AppError";
import { InvalidLocationError, LonLat, parseLocationPoint } from "../utils/geoPoint";
import { findProjectById } from "../repositories/project.repository";
import {
  createTreeWithMeasurementRpc,
  findTreeById,
  findTreesPage,
  TreeDetailRow,
  TreeRow,
} from "../repositories/tree.repository";
import {
  findLatestValidMeasurementsCandidates,
  findMeasurementsByTreeId,
  TreeMeasurementRow,
} from "../repositories/treeMeasurement.repository";
import { CreateTreeBody } from "../schemas/tree.schema";
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

export interface TreeDetailDTO {
  id: string;
  tree_code: string;
  legacy_id: string | null;
  project_id: string;
  public_space_id: string | null;
  direccion: string | null;
  comuna: string | null;
  lugar_referencia: string | null;
  ubicacion: { lon: number; lat: number } | null;
  estado_ciclo_vida: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  species: { id: string; nombre_cientifico: string; nombre_comun: string | null } | null;
  public_spaces: { id: string; nombre: string; tipo: string | null } | null;
  medicion_actual: TreeMeasurementRow | null;
  medicion_actual_estado: "sin_mediciones" | "ok" | "error_empate_fecha_maxima";
  medicion_actual_detalle: string | null;
}

/**
 * Resuelve la medición actual de un árbol a partir de sus candidatas de fecha máxima
 * respetando estrictamente la Decisión 2 de INV-1A (sin desempates arbitrarios).
 */
export function resolveCurrentMeasurement(candidates: TreeMeasurementRow[]): {
  medicion_actual: TreeMeasurementRow | null;
  medicion_actual_estado: "sin_mediciones" | "ok" | "error_empate_fecha_maxima";
  medicion_actual_detalle: string | null;
} {
  if (candidates.length === 0) {
    return {
      medicion_actual: null,
      medicion_actual_estado: "sin_mediciones",
      medicion_actual_detalle: null,
    };
  }

  if (candidates.length === 1 || candidates[0].fecha_medicion > candidates[1].fecha_medicion) {
    return {
      medicion_actual: candidates[0],
      medicion_actual_estado: "ok",
      medicion_actual_detalle: null,
    };
  }

  // Empate de dos o más mediciones válidas con la misma fecha_medicion máxima
  return {
    medicion_actual: null,
    medicion_actual_estado: "error_empate_fecha_maxima",
    medicion_actual_detalle:
      "Existen múltiples mediciones válidas con la misma fecha máxima; requiere resolución metodológica",
  };
}

/**
 * Alta atómica de árbol y medición dendrométrica inicial (PR-006 v7.0, ADR-016).
 */
export async function createTreeForUser(
  user: AuthenticatedUser,
  projectId: string,
  body: CreateTreeBody,
  accessToken: string
): Promise<{ data: TreeDetailDTO }> {
  await assertProjectAccess(user, projectId, accessToken);
  const project = await findProjectById(accessToken, projectId);
  if (!project) {
    throw new AppError("Proyecto no encontrado", 404);
  }

  const rpcResult = await createTreeWithMeasurementRpc(accessToken, {
    p_project_id: projectId,
    p_species_id: body.species_id,
    p_public_space_id: body.public_space_id ?? null,
    p_direccion: body.direccion ?? null,
    p_comuna: body.comuna ?? null,
    p_lugar_referencia: body.lugar_referencia ?? null,
    p_lon: body.ubicacion.lon,
    p_lat: body.ubicacion.lat,
    p_medicion: {
      fecha_medicion: body.medicion_inicial.fecha_medicion,
      configuracion_fustes: body.medicion_inicial.configuracion_fustes,
      numero_fustes: body.medicion_inicial.numero_fustes ?? null,
      dap_fustes_cm: body.medicion_inicial.dap_fustes_cm ?? null,
      dap_cm: body.medicion_inicial.dap_cm ?? null,
      altura_total_m: body.medicion_inicial.altura_total_m,
      diametro_copa_m: body.medicion_inicial.diametro_copa_m,
      altura_primera_rama_m: body.medicion_inicial.altura_primera_rama_m,
      clase_edad: body.medicion_inicial.clase_edad ?? null,
    },
  });

  return getTreeDetailForUser(user, rpcResult.tree_id, accessToken);
}

/**
 * Consulta la ficha completa de un árbol con su medición actual resuelta.
 */
export async function getTreeDetailForUser(
  user: AuthenticatedUser,
  treeId: string,
  accessToken: string
): Promise<{ data: TreeDetailDTO }> {
  const tree = await findTreeById(accessToken, treeId);
  if (!tree) {
    throw new AppError("Árbol no encontrado", 404);
  }

  await assertProjectAccess(user, tree.project_id, accessToken);

  const candidates = await findLatestValidMeasurementsCandidates(accessToken, treeId);
  const { medicion_actual, medicion_actual_estado, medicion_actual_detalle } =
    resolveCurrentMeasurement(candidates);

  let coords: { lon: number; lat: number } | null = null;
  if (tree.ubicacion) {
    const pt = parseLocationPoint(tree.ubicacion);
    if (pt) {
      coords = { lon: pt[0], lat: pt[1] };
    }
  }

  return {
    data: {
      id: tree.id,
      tree_code: tree.tree_code,
      legacy_id: tree.legacy_id,
      project_id: tree.project_id,
      public_space_id: tree.public_space_id,
      direccion: tree.direccion,
      comuna: tree.comuna,
      lugar_referencia: tree.lugar_referencia,
      ubicacion: coords,
      estado_ciclo_vida: tree.estado_ciclo_vida,
      created_by: tree.created_by,
      created_at: tree.created_at,
      updated_at: tree.updated_at,
      species: tree.species,
      public_spaces: tree.public_spaces,
      medicion_actual,
      medicion_actual_estado,
      medicion_actual_detalle,
    },
  };
}

/**
 * Consulta el historial de mediciones dendrométricas de un árbol (solo lectura).
 */
export async function listTreeMeasurementsForUser(
  user: AuthenticatedUser,
  treeId: string,
  accessToken: string,
  includeAnuladas: boolean = false
): Promise<{ data: TreeMeasurementRow[]; meta: { total: number } }> {
  const tree = await findTreeById(accessToken, treeId);
  if (!tree) {
    throw new AppError("Árbol no encontrado", 404);
  }

  await assertProjectAccess(user, tree.project_id, accessToken);

  const measurements = await findMeasurementsByTreeId(accessToken, treeId, includeAnuladas);
  return {
    data: measurements,
    meta: {
      total: measurements.length,
    },
  };
}
