/**
 * Validación de la ubicación de un árbol tal como la entrega PostgREST al
 * pedir `ubicacion::geometry` (alternativa E1, SIG-1 / ADR-010 v2.0).
 *
 * PostGIS serializa un `geometry` como objeto GeoJSON, por ejemplo:
 *   {"type":"Point","crs":{...EPSG:4326...},"coordinates":[-71.62,-33.04]}
 *
 * Aquí NO se decodifica ningún formato binario (no hay parser EWKB): solo
 * se verifica que el objeto recibido sea un Point 2D en WGS84 válido y se
 * devuelven sus coordenadas [longitud, latitud]. El miembro `crs` se
 * descarta: la salida de la API sigue RFC 7946 (WGS84 implícito).
 */

export type LonLat = [number, number];

/** La ubicación existe pero no tiene la forma esperada. */
export class InvalidLocationError extends Error {
  constructor(reason: string) {
    super(`Ubicación con formato inesperado: ${reason}`);
    this.name = "InvalidLocationError";
  }
}

/**
 * - `null`/`undefined` → `null` (árbol sin ubicación; no es un error).
 * - Point 2D válido → `[lon, lat]`.
 * - Cualquier otra cosa (texto EWKB, otro tipo de geometría, coordenadas
 *   no finitas o fuera de rango, 3D) → `InvalidLocationError`.
 */
export function parseLocationPoint(value: unknown): LonLat | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidLocationError("no es un objeto GeoJSON");
  }

  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type !== "Point") {
    throw new InvalidLocationError("el tipo no es Point");
  }

  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) {
    throw new InvalidLocationError("se esperaban exactamente dos coordenadas");
  }

  const [lon, lat] = coords;
  if (typeof lon !== "number" || typeof lat !== "number" || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new InvalidLocationError("las coordenadas no son números finitos");
  }
  if (lon < -180 || lon > 180) {
    throw new InvalidLocationError("longitud fuera de rango");
  }
  if (lat < -90 || lat > 90) {
    throw new InvalidLocationError("latitud fuera de rango");
  }

  return [lon, lat];
}
