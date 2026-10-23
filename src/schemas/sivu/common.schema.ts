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
 * D-9/D-10 (ARBOLES): coordenadas UTM huso 19S, datum WGS84 (EPSG:32719).
 * El huso y el datum son fijos en todo SIVU (D-11/D-12) — no son datos
 * que ingrese el usuario. El Excel no fija un rango numérico explícito
 * más allá de "valor numérico"; los rangos de abajo son del dominio de
 * la proyección UTM (no se inventan, son una propiedad matemática fija
 * del huso 19S en el hemisferio sur, dada por la responsable) y no una
 * regla metodológica adicional:
 * - `utm_este`: 166000–834000 m (ancho de una zona UTM de 6° a cualquier
 *   latitud, con el margen estándar de 500000 ± 334000).
 * - `utm_norte`: 0–10000000 m (falso norte del hemisferio sur: 0 en el
 *   polo Sur, 10000000 en el ecuador).
 *
 * Esquemas separados porque un valor de Este fuera de rango y uno de
 * Norte fuera de rango son errores distintos (D-9 vs. D-10), con
 * mensajes propios.
 */
export const coordenadaUtmEste = z
  .number()
  .finite("debe ser un número finito")
  .min(166000, "utm_este fuera de rango para UTM 19S (166000–834000 m)")
  .max(834000, "utm_este fuera de rango para UTM 19S (166000–834000 m)");

export const coordenadaUtmNorte = z
  .number()
  .finite("debe ser un número finito")
  .min(0, "utm_norte fuera de rango para el hemisferio sur (0–10000000 m)")
  .max(10000000, "utm_norte fuera de rango para el hemisferio sur (0–10000000 m)");

/**
 * D-265 (SECTORES.geometria_sector): "Delimitación en el mapa o
 * importación de archivo Google Earth en formato KML o KMZ." La
 * validación geométrica real (superficies válidas y no vacías, unión
 * sin duplicar áreas, exclusión de puntos/líneas, conservación de
 * huecos) se hace en la base contra PostGIS (migración 018b:
 * `fn_extraer_superficies_kml`, `fn_unir_y_validar_superficies`). Este
 * esquema solo valida la FORMA de lo que llega por API: o un GeoJSON ya
 * dibujado en el mapa (una sola geometría, sin selección — el dibujo ya
 * es lo que el usuario quiere), o un archivo KML/KMZ a convertir.
 *
 * `indicesSeleccionados` (solo KML/KMZ): un archivo puede traer varias
 * superficies (D-265: "permitir seleccionar las que integrarán el
 * sector"); son los índices devueltos por la vista previa
 * (`POST /api/sivu/projects/sector-preview`). Opcional en la forma,
 * pero la base lo exige si el archivo trae más de una superficie —
 * nunca se incluyen todas por defecto — y rechaza un índice inválido o
 * excluido (CC-047; `fn_build_sector_geometria`, 422).
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
    indicesSeleccionados: z
      .array(z.number().int().nonnegative())
      .min(1, "debe seleccionar al menos una superficie")
      .optional(),
  }),
]);

export type GeometriaSectorInput = z.infer<typeof geometriaSectorInput>;

/**
 * Body de POST /api/sivu/projects/sector-preview: solo el archivo, sin
 * `indicesSeleccionados` (la vista previa es justamente lo que permite
 * elegirlos después). Solo KML/KMZ: un GeoJSON ya es una única
 * geometría dibujada, sin nada que previsualizar o elegir.
 */
export const vistaPreviaSectorSchema = z
  .object({
    formato: z.enum(["kml", "kmz"]),
    archivoBase64: z.string().min(1, "archivoBase64 es obligatorio"),
  })
  .strict();

export type VistaPreviaSectorBody = z.infer<typeof vistaPreviaSectorSchema>;
