import { z } from "zod";

/**
 * Validación del Body de POST /api/trees/:treeId/risk-assessments.
 * Campos y dominios según REGISTRO_EVALUACION / DICCIONARIO_CAMPOS /
 * LISTAS de Base de Datos Valpo Verde.xlsx (ver src/services/rules/treeRisk.ts
 * para la cita exacta y el motor de cálculo).
 */

const condicionalBool = z.boolean().nullable();
const condicionalNumero = z.number().nullable();

export const treeRiskVariablesSchema = z
  .object({
    // R01 — Raíces y cuello
    levantamiento_plato_radicular: z.boolean(),
    angulo_inclinacion: z.number().min(0).max(90),
    raices_expuestas: z.boolean(),
    necrosis_radicular: condicionalBool,
    raices_cortadas: condicionalBool,
    cavidad_pudricion_basal: z.boolean(),
    cavidad_basal_externa: condicionalBool,
    sl_basal_pct: condicionalNumero,
    t_r_basal: condicionalNumero,

    // R02 — Tronco
    presenta_cavidad_pudricion_tronco: z.boolean(),
    cavidad_externa_tronco: condicionalBool,
    sl_tronco_pct: condicionalNumero,
    t_r_tronco: condicionalNumero,
    presenta_heridas_tronco: z.boolean(),
    condicion_heridas_tronco: z.enum(["Cerrada", "En proceso de cierre", "Abierta"]).nullable(),
    corteza_muerta_ausente: z.boolean(),
    presenta_exudaciones: z.boolean(),
    presenta_fisura_grieta_tronco: z.boolean(),
    afectacion_fisura_grieta: z.enum(["Solo corteza", "Penetra en madera"]).nullable(),
    direccion_grieta: z.enum(["Longitudinal", "Transversal"]).nullable(),
    troncos_codominantes: z.boolean(),
    grieta_union_codominante: condicionalBool,
    corteza_incluida: condicionalBool,

    // R03 — Copa y ramas
    ramas_secas: z.boolean(),
    ramas_secas_pct_copa: condicionalNumero,
    ramas_quebradas: z.boolean(),
    desequilibrio_copa: z.boolean(),

    // M01 — Probabilidad de impacto
    zona_objetivo: z.enum([
      "Bajo la copa",
      "Entre el límite de la copa y 1× la altura del árbol",
      "Entre 1× y 1,5× la altura del árbol",
      "Más allá de 1,5× la altura del árbol",
    ]),
    tasa_ocupacion_objetivo: z.enum(["Rara", "Ocasional", "Frecuente", "Constante"]),

    // Consecuencias por componente (observadas, no calculadas)
    consecuencia_raices_cuello: z.enum(["Despreciable", "Menor", "Significativa", "Severa"]),
    consecuencia_tronco: z.enum(["Despreciable", "Menor", "Significativa", "Severa"]),
    consecuencia_copa_ramas: z.enum(["Despreciable", "Menor", "Significativa", "Severa"]),
  })
  .strict();

export const createTreeRiskAssessmentSchema = z
  .object({
    fecha_evaluacion: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_evaluacion debe tener formato AAAA-MM-DD")
      .refine((val) => val <= new Date().toISOString().slice(0, 10), {
        message: "fecha_evaluacion no puede ser una fecha futura",
      }),
    variables: treeRiskVariablesSchema,
  })
  .strict();

export type CreateTreeRiskAssessmentBody = z.infer<typeof createTreeRiskAssessmentSchema>;
