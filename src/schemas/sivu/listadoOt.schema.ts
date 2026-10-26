import { z } from "zod";
import { esCodigoVigente } from "../../services/rules/engine/catalogs";

/**
 * Filtros de los listados de OT (B3, B4; CC-065 punto 4).
 *
 * `estado`: códigos de `estado_ot` separados por coma. Por defecto
 * Pendiente, Programada y En ejecución; Completada y Cancelada se piden
 * con el filtro, como historial de solo lectura (CC-064 n).
 */
export const ESTADOS_OT_POR_DEFECTO = ["pendiente", "programada", "en_ejecucion"] as const;

const estadoSchema = z
  .string()
  .trim()
  .min(1, "estado no puede venir vacío")
  .transform((v) => [...new Set(v.split(",").map((s) => s.trim()))])
  .refine((codigos) => codigos.every((c) => esCodigoVigente("estado_ot", c)), {
    message: "estado debe ser una lista de códigos de estado_ot separados por coma (D-239)",
  });

const comunes = {
  estado: estadoSchema.optional(),
  tipo_ot: z.enum(["inspeccion", "mantenimiento"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

/** GET /api/sivu/projects/:id/work-orders (B3). */
export const listarOtsProyectoQuerySchema = z.object(comunes).strict();

/** GET /api/sivu/work-orders/mine (B4): además, filtro opcional por proyecto. */
export const listarMisOtsQuerySchema = z
  .object({ ...comunes, project_id: z.string().uuid("project_id inválido").optional() })
  .strict();

export type ListarOtsProyectoQuery = z.infer<typeof listarOtsProyectoQuerySchema>;
export type ListarMisOtsQuery = z.infer<typeof listarMisOtsQuerySchema>;
