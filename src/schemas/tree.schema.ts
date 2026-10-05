import { z } from "zod";

/**
 * Esquema de validación para la Medición Dendrométrica Inicial obligatoria
 * en el alta de árbol (INV-1A / CC-020 / DICCIONARIO_CAMPOS).
 */
export const initialMeasurementSchema = z
  .object({
    fecha_medicion: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_medicion debe tener formato AAAA-MM-DD"),
    configuracion_fustes: z
      .string()
      .trim()
      .min(1, "configuracion_fustes es obligatoria"),
    numero_fustes: z
      .number()
      .int("numero_fustes debe ser un número entero")
      .min(2, "numero_fustes debe ser mayor o igual a 2 cuando se registra")
      .optional()
      .nullable(),
    dap_fustes_cm: z
      .array(z.number().positive("cada valor de dap_fustes_cm debe ser mayor a 0"))
      .min(2, "dap_fustes_cm debe contener al menos 2 diámetros cuando se registra")
      .optional()
      .nullable(),
    dap_cm: z
      .number()
      .positive("dap_cm debe ser mayor a 0")
      .optional()
      .nullable(),
    altura_total_m: z
      .number()
      .min(0, "altura_total_m debe ser mayor o igual a 0"),
    diametro_copa_m: z
      .number()
      .min(0, "diametro_copa_m debe ser mayor o igual a 0"),
    altura_primera_rama_m: z
      .number()
      .min(0, "altura_primera_rama_m debe ser mayor o igual a 0"),
    clase_edad: z.string().trim().min(1).optional().nullable(),
  })
  .refine((data) => data.altura_primera_rama_m <= data.altura_total_m, {
    message: "altura_primera_rama_m no puede ser mayor que altura_total_m",
    path: ["altura_primera_rama_m"],
  })
  .refine(
    (data) => {
      if (data.numero_fustes && data.dap_fustes_cm) {
        return data.dap_fustes_cm.length === data.numero_fustes;
      }
      return true;
    },
    {
      message: "La cantidad de valores en dap_fustes_cm debe coincidir con numero_fustes",
      path: ["dap_fustes_cm"],
    }
  );

export type InitialMeasurementInput = z.infer<typeof initialMeasurementSchema>;

/**
 * Esquema del Body de POST /api/projects/:projectId/trees
 * Operación atómica de Alta de Árbol + Medición Inicial (PR-006 v7.0, ADR-016).
 */
export const createTreeSchema = z
  .object({
    species_id: z.string().uuid("species_id debe ser un UUID válido"),
    public_space_id: z.string().uuid("public_space_id debe ser un UUID válido").optional().nullable(),
    direccion: z.string().trim().optional().nullable(),
    comuna: z.string().trim().optional().nullable(),
    lugar_referencia: z.string().trim().optional().nullable(),
    ubicacion: z.object({
      lon: z.number().min(-180, "lon debe estar entre -180 y 180").max(180, "lon debe estar entre -180 y 180"),
      lat: z.number().min(-90, "lat debe estar entre -90 y 90").max(90, "lat debe estar entre -90 y 90"),
    }),
    medicion_inicial: initialMeasurementSchema,
  })
  .strict();

export type CreateTreeBody = z.infer<typeof createTreeSchema>;

/**
 * Validador para parámetro :treeId (o :id) de árbol.
 */
export const treeIdParamSchema = z
  .object({
    treeId: z.string().uuid("treeId debe ser un UUID válido").optional(),
    id: z.string().uuid("id debe ser un UUID válido").optional(),
  })
  .refine((data) => data.treeId !== undefined || data.id !== undefined, {
    message: "Debe proveer un identificador de árbol válido",
  });

export type TreeIdParam = z.infer<typeof treeIdParamSchema>;
