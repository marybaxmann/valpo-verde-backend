import { z } from "zod";

/**
 * Query params de GET /api/sivu/projects/:id/trees (B1).
 *
 * Todos los filtros son opcionales; la paginación tiene valores por defecto
 * razonables para el frontend (50 filas, página 0).
 *
 * `busqueda`: búsqueda parcial por especie_cientifica o nombre_comun (ILIKE).
 * `sector_id`: filtro por UUID de sector del proyecto.
 * `estado_ciclo_vida`: 'activo' | 'retirado' | 'tocon' (catálogo mínimo vigente).
 */
export const inventarioQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    sector_id: z.string().uuid("sector_id inválido").optional(),
    estado_ciclo_vida: z
      .enum(["activo", "retirado", "tocon"], {
        errorMap: () => ({
          message: "estado_ciclo_vida debe ser 'activo', 'retirado' o 'tocon'",
        }),
      })
      .optional(),
    /** Máximo 200 caracteres para evitar consultas ILIKE excesivamente largas. */
    busqueda: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export type InventarioQuery = z.infer<typeof inventarioQuerySchema>;
