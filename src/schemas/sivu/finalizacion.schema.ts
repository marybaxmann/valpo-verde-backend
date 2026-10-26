import { z } from "zod";

/**
 * Bodies de POST /api/sivu/inspections/:inspectionId/calcular y
 * .../finalizar (#59/#72; CC-054, CC-055, CC-056).
 *
 * Ajustes (D-171, D-170, D-172, D-173; CC-044): el valor ajustado
 * siempre es una categoría determinada — nunca `no_determinado` ni
 * `no_aplica` — y lleva su justificación. Que el valor ajustado difiera
 * del calculado se verifica en el service, porque el calculado no se
 * conoce aquí.
 */
function ajuste<T extends readonly [string, ...string[]]>(codigos: T) {
  return z
    .object({
      valor_ajustado: z.enum(codigos),
      justificacion_ajuste_clasificacion: z
        .string({ required_error: "justificacion_ajuste_clasificacion es obligatoria (D-173)" })
        .trim()
        .min(1, "justificacion_ajuste_clasificacion es obligatoria (D-173)"),
    })
    .strict();
}

export const ajustesSchema = z
  .object({
    clasificacion_riesgo: ajuste(["bajo", "moderado", "alto", "extremo"] as const).optional(),
    clasificacion_infraestructura: ajuste(["bajo", "moderado", "alto", "critico"] as const).optional(),
    clasificacion_prioridad: ajuste(["baja", "media", "alta", "critica"] as const).optional(),
  })
  .strict();

export type AjustesBody = z.infer<typeof ajustesSchema>;

const fechaISO = (campo: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${campo} debe tener formato AAAA-MM-DD`)
    .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), {
      message: `${campo} no es una fecha válida`,
    });

/** POST .../calcular — no escribe nada; los ajustes son opcionales, para ver su efecto. */
export const calcularInspeccionSchema = z
  .object({
    ajustes: ajustesSchema.optional(),
  })
  .strict();

export type CalcularInspeccionBody = z.infer<typeof calcularInspeccionSchema>;

/**
 * POST .../finalizar. `huella` es la que devolvió /calcular: si el
 * borrador o los datos vigentes cambiaron desde entonces, se rechaza
 * (409) y hay que volver a calcular. Sin `fecha_proxima_inspeccion` /
 * `fecha_proximo_monitoreo` se usan las sugeridas; una fecha distinta
 * de su sugerida exige `justificacion_ajuste_fecha` (D-204).
 */
export const finalizarInspeccionSchema = z
  .object({
    huella: z.string().regex(/^[0-9a-f]{64}$/, "huella inválida: use la que devolvió /calcular"),
    ajustes: ajustesSchema.optional(),
    fecha_proxima_inspeccion: fechaISO("fecha_proxima_inspeccion").optional(),
    fecha_proximo_monitoreo: fechaISO("fecha_proximo_monitoreo").optional(),
    justificacion_ajuste_fecha: z.string().trim().min(1, "justificacion_ajuste_fecha no puede venir vacía").optional(),
  })
  .strict();

export type FinalizarInspeccionBody = z.infer<typeof finalizarInspeccionSchema>;
