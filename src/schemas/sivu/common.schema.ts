import { z } from "zod";

/**
 * Validadores compartidos por los esquemas de la Fase 6 (SIVU) — uno
 * por hoja de DICCIONARIO_CAMPOS (issue #54). No se comparten con los
 * schemas de la demo (`src/schemas/*.schema.ts`, sin subcarpeta), que
 * validan el modelo anterior contra `valpo-verde-conecta`.
 *
 * Patrón general (ver `docs/registro-cambios.md` y el plan de la Fase
 * 6): el motor de reglas (`src/services/rules/engine/`) es tolerante —
 * un dato faltante o inválido se vuelve `no_determinado`, nunca lanza.
 * Estos esquemas NO heredan esa tolerancia: rechazan con un error de
 * Zod (que el controller traduce a 400) antes de que el dato llegue al
 * motor o a la base. Guardar un dato corrupto no tiene excusa
 * metodológica, aunque calcular con uno ausente sí la tenga (CC-024).
 */

export function textoObligatorio(nombreCampo: string) {
  return z.string().trim().min(1, `${nombreCampo} es obligatorio`);
}

/**
 * D-9/D-10 (ARBOLES): coordenada UTM. El huso (19S) y el datum (WGS84)
 * son fijos en todo SIVU (D-11/D-12) — no son datos que ingrese el
 * usuario, así que este esquema valida solo el valor numérico. El
 * Excel no fija un rango explícito más allá de "valor numérico"; no se
 * inventa uno — solo se exige que sea un número finito y positivo.
 */
export const coordenadaUtm = z
  .number()
  .finite("debe ser un número finito")
  .positive("debe ser mayor que 0");

/**
 * D-265 (SECTORES.geometria_sector): "Delimitación en el mapa o
 * importación de archivo Google Earth en formato KML o KMZ." La
 * validación geométrica real (superficies válidas y no vacías, unión
 * sin duplicar áreas, exclusión de puntos/líneas, conservación de
 * huecos) se hace en el servicio contra PostGIS (ST_IsValid, ST_Union,
 * ST_Multi — ver ADR-017 y el bloque de integración de KML/KMZ, #56).
 * Este esquema solo valida la FORMA de lo que llega por API: o un
 * GeoJSON ya dibujado en el mapa, o un archivo KML/KMZ a convertir.
 */
export const geometriaSectorInput = z.union([
  z.object({
    formato: z.literal("geojson"),
    geometria: z.object({
      type: z.enum(["Polygon", "MultiPolygon"]),
      coordinates: z.array(z.unknown()),
    }),
  }),
  z.object({
    formato: z.enum(["kml", "kmz"]),
    archivoBase64: z.string().min(1, "archivoBase64 es obligatorio"),
  }),
]);

export type GeometriaSectorInput = z.infer<typeof geometriaSectorInput>;
