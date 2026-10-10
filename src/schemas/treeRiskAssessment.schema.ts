import { z } from "zod";

/**
 * Validación del Body de POST /api/trees/:treeId/risk-assessments.
 * Campos y dominios según REGISTRO_EVALUACION / DICCIONARIO_CAMPOS /
 * LISTAS de Base de Datos Valpo Verde.xlsx (ver src/services/rules/treeRisk.ts
 * para la cita exacta y el motor de cálculo).
 *
 * Campos condicionales: cuando una observación es "Sí", las condiciones de
 * REGLAS_INDICADORES (borrador v3) exigen el dato que la detalla. Si falta,
 * la evaluación se rechaza: el motor nunca debe asumir una severidad que
 * no se observó. Solo SL% y t/R pueden quedar vacíos, porque la propia
 * regla los resuelve como "No determinado" (RC/TR-CAV-05 y -08).
 */

const condicionalBool = z.boolean().nullable();
const SL_PCT = z.number().min(0, "El SL debe estar entre 0 y 100 %").max(100, "El SL debe estar entre 0 y 100 %").nullable();
const T_R = z.number().min(0, "La relación t/R debe estar entre 0 y 1").max(1, "La relación t/R debe estar entre 0 y 1").nullable();

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
    sl_basal_pct: SL_PCT,
    t_r_basal: T_R,

    // R02 — Tronco
    presenta_cavidad_pudricion_tronco: z.boolean(),
    cavidad_externa_tronco: condicionalBool,
    sl_tronco_pct: SL_PCT,
    t_r_tronco: T_R,
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
    ramas_secas_pct_copa: z.number().nullable(),
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
  .strict()
  .superRefine((v, ctx) => {
    const exigir = (falta: boolean, path: keyof typeof v, message: string) => {
      if (falta) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };

    // R01 — RC-REX-02..05 y RC-CAV-02..08
    exigir(v.raices_expuestas && v.necrosis_radicular === null, "necrosis_radicular",
      "Indica si hay necrosis radicular (raíces expuestas = Sí)");
    exigir(v.raices_expuestas && v.raices_cortadas === null, "raices_cortadas",
      "Indica si hay raíces cortadas (raíces expuestas = Sí)");
    exigir(v.cavidad_pudricion_basal && v.cavidad_basal_externa === null, "cavidad_basal_externa",
      "Indica si la cavidad o pudrición basal tiene síntoma externo");

    // R02 — TR-CAV-02..08, TR-HER-02..04, TR-GRI-02..04, TR-COD-02..04
    exigir(v.presenta_cavidad_pudricion_tronco && v.cavidad_externa_tronco === null, "cavidad_externa_tronco",
      "Indica si la cavidad o pudrición del tronco tiene síntoma externo");
    exigir(v.presenta_heridas_tronco && v.condicion_heridas_tronco === null, "condicion_heridas_tronco",
      "Indica la condición de las heridas del tronco");
    exigir(v.presenta_fisura_grieta_tronco && v.afectacion_fisura_grieta === null, "afectacion_fisura_grieta",
      "Indica la afectación de la fisura o grieta del tronco");
    exigir(
      v.presenta_fisura_grieta_tronco && v.afectacion_fisura_grieta === "Penetra en madera" && v.direccion_grieta === null,
      "direccion_grieta",
      "Indica la dirección de la grieta (penetra en madera)"
    );
    exigir(v.troncos_codominantes && v.grieta_union_codominante === null, "grieta_union_codominante",
      "Indica si hay grieta en la unión de los troncos codominantes");
    exigir(
      v.troncos_codominantes && v.grieta_union_codominante === false && v.corteza_incluida === null,
      "corteza_incluida",
      "Indica si hay corteza incluida en la unión codominante"
    );

    // R03 — CR-RSE-02..04 (sin fila "No determinado": el porcentaje es obligatorio)
    if (v.ramas_secas) {
      const pct = v.ramas_secas_pct_copa;
      exigir(pct === null, "ramas_secas_pct_copa", "Indica el porcentaje de copa con ramas secas");
      exigir(pct !== null && (pct <= 0 || pct > 100), "ramas_secas_pct_copa",
        "El porcentaje de copa con ramas secas debe ser mayor que 0 y como máximo 100");
    }
  });

/** Fecha de hoy en Chile (AAAA-MM-DD). En UTC, las últimas 3 o 4 horas del día chileno ya son el día siguiente. */
function hoyEnChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

export const createTreeRiskAssessmentSchema = z
  .object({
    fecha_evaluacion: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_evaluacion debe tener formato AAAA-MM-DD")
      .refine((val) => val <= hoyEnChile(), {
        message: "fecha_evaluacion no puede ser una fecha futura",
      }),
    variables: treeRiskVariablesSchema,
  })
  .strict();

export type CreateTreeRiskAssessmentBody = z.infer<typeof createTreeRiskAssessmentSchema>;
