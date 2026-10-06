import { z } from "zod";

/**
 * Dominio aprobado de clase_edad (DICCIONARIO_CAMPOS fila 26).
 * Estimación opcional para captura de terreno (ámbito operativo).
 */
export const CLASE_EDAD_VALUES = [
  "Joven",
  "Semimaduro",
  "Tempranamente maduro",
  "Maduro",
  "Sobremaduro",
] as const;

export type ClaseEdad = (typeof CLASE_EDAD_VALUES)[number];

/**
 * Esquema de validación para la Medición Dendrométrica Inicial obligatoria
 * en el alta de árbol (INV-1A / CC-020 / DICCIONARIO_CAMPOS).
 */
export const initialMeasurementSchema = z
  .object({
    fecha_medicion: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_medicion debe tener formato AAAA-MM-DD")
      .refine(
        (val) => {
          const [year, month, day] = val.split("-").map(Number);
          if (month < 1 || month > 12) return false;
          const date = new Date(Date.UTC(year, month - 1, day));
          return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
          );
        },
        {
          message: "fecha_medicion no es una fecha válida en el calendario gregoriano",
        }
      )
      .refine(
        (val) => {
          const today = new Date().toISOString().slice(0, 10);
          return val <= today;
        },
        {
          message: "fecha_medicion no puede ser una fecha futura",
        }
      ),
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
    clase_edad: z
      .enum(CLASE_EDAD_VALUES, {
        errorMap: () => ({
          message:
            "clase_edad debe ser una de las categorías válidas: Joven, Semimaduro, Tempranamente maduro, Maduro, Sobremaduro",
        }),
      })
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      const hasDap = data.dap_cm !== null && data.dap_cm !== undefined;
      const hasDapFustes =
        data.dap_fustes_cm !== null &&
        data.dap_fustes_cm !== undefined &&
        data.dap_fustes_cm.length > 0;
      return hasDap || hasDapFustes;
    },
    {
      message:
        "La medición inicial requiere al menos un diámetro registrado (dap_cm o dap_fustes_cm)",
      path: ["dap_cm"],
    }
  )
  .refine(
    (data) => {
      if (data.numero_fustes !== null && data.numero_fustes !== undefined) {
        return data.dap_fustes_cm !== null && data.dap_fustes_cm !== undefined;
      }
      return true;
    },
    {
      message: "Si se registra numero_fustes, dap_fustes_cm es obligatorio",
      path: ["dap_fustes_cm"],
    }
  )
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
