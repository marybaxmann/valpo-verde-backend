import { z } from "zod";
import { coordenadaUtmEste, coordenadaUtmNorte, textoObligatorio } from "./common.schema";

/**
 * Body de POST /api/sivu/projects/:id/trees — alta municipal mínima
 * (PR-003 v8.0: "registrar el alta de un árbol solo con el nombre
 * común o científico y la ubicación: coordenadas UTM, sector y
 * descripción del lugar"). Solo `usuario_municipal`.
 *
 * - `sector`: D-7, obligatorio, no vacío (descripción territorial
 *   libre — no confundir con `sector_id`, que el servidor resuelve
 *   del proyecto, nunca del body).
 * - `ubicacion_descriptiva`: D-8, obligatorio, no vacío.
 * - `utm_este`/`utm_norte`: D-9/D-10, obligatorios.
 * - `especie_cientifica`/`nombre_comun`: D-13/D-14 — "en el alta
 *   municipal se permite ingresar nombre común o científico": al
 *   menos uno de los dos, no los dos obligatoriamente. La misma regla
 *   ya existe como CHECK en la base (`chk_trees_especie_o_comun`,
 *   migración 013) — este `.refine()` la repite en la API a propósito
 *   (defensa en profundidad, ADR-014 v2.0: nunca confiar solo en la
 *   base para una regla que el backend puede y debe rechazar antes).
 *
 * No incluye `multifustal`, `dap_cm`, `altura_total_m` ni ningún otro
 * dato técnico (D-15 en adelante): "no ingresa características de la
 * especie" ni datos dendrométricos — eso lo registra el Inspector
 * mediante OT (PR-003 v8.0, PR-019 v1.2), fuera del alcance de este
 * esquema.
 */
export const altaMunicipalArbolSchema = z
  .object({
    sector: textoObligatorio("sector"),
    ubicacion_descriptiva: textoObligatorio("ubicacion_descriptiva"),
    utm_este: coordenadaUtmEste,
    utm_norte: coordenadaUtmNorte,
    especie_cientifica: textoObligatorio("especie_cientifica").optional(),
    nombre_comun: textoObligatorio("nombre_comun").optional(),
  })
  .strict()
  .refine((body) => body.especie_cientifica !== undefined || body.nombre_comun !== undefined, {
    message: "debe incluir especie_cientifica o nombre_comun",
  });

export type AltaMunicipalArbolBody = z.infer<typeof altaMunicipalArbolSchema>;

/**
 * Body de POST /api/sivu/work-orders/:id/trees — alta durante una OT
 * de Levantamiento, por el Inspector, sin alta municipal previa
 * (PR-019 v1.2: "registrar árboles nuevos durante una OT de
 * Levantamiento, sin alta municipal previa"; PR-006 v10.0).
 *
 * Mismos campos mínimos que el alta municipal — el Inspector completa
 * los datos técnicos después, en la misma inspección de Levantamiento,
 * con los esquemas de REGISTRO_EVALUACION (fuera del alcance de este
 * bloque; ver #58).
 */
export const altaPorLevantamientoSchema = altaMunicipalArbolSchema;

export type AltaPorLevantamientoBody = z.infer<typeof altaPorLevantamientoSchema>;

export const arbolIdParamSchema = z.object({
  id: z.string().uuid("id de árbol inválido"),
});

export type ArbolIdParam = z.infer<typeof arbolIdParamSchema>;
