import { z } from "zod";

/**
 * Esquemas de fotografías (CC-049; D-27: las 4 vistas obligatorias).
 */

export const inspectionIdParamSchema = z.object({
  inspectionId: z.string().uuid("id de inspección inválido"),
});

export type InspectionIdParam = z.infer<typeof inspectionIdParamSchema>;

/**
 * `vista` llega como campo de texto en el `multipart/form-data` (junto
 * al archivo) — D-27, dominio ya vigente de `photos.vista`. Opcional
 * en la forma: el service exige o prohíbe según `tipo_inspeccion_realizada`
 * de la inspección (D-27: obligatoria en Evaluación inicial/Reevaluación/
 * Levantamiento, opcional en Monitoreo, ninguna foto en Evaluación
 * instrumental) — ese cruce no se puede validar aquí, no se conoce la
 * inspección en este punto.
 */
export const subirFotoInspeccionSchema = z
  .object({
    vista: z.enum(["arbol_completo", "base", "tronco", "copa"]).optional(),
  })
  .strict();

export type SubirFotoInspeccionBody = z.infer<typeof subirFotoInspeccionSchema>;
