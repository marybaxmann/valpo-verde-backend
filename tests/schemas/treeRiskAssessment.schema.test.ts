import { createTreeRiskAssessmentSchema, treeRiskVariablesSchema } from "../../src/schemas/treeRiskAssessment.schema";

/** Evaluación completa sin hallazgos: válida. */
const base = {
  levantamiento_plato_radicular: false,
  angulo_inclinacion: 0,
  raices_expuestas: false,
  necrosis_radicular: null,
  raices_cortadas: null,
  cavidad_pudricion_basal: false,
  cavidad_basal_externa: null,
  sl_basal_pct: null,
  t_r_basal: null,
  presenta_cavidad_pudricion_tronco: false,
  cavidad_externa_tronco: null,
  sl_tronco_pct: null,
  t_r_tronco: null,
  presenta_heridas_tronco: false,
  condicion_heridas_tronco: null,
  corteza_muerta_ausente: false,
  presenta_exudaciones: false,
  presenta_fisura_grieta_tronco: false,
  afectacion_fisura_grieta: null,
  direccion_grieta: null,
  troncos_codominantes: false,
  grieta_union_codominante: null,
  corteza_incluida: null,
  ramas_secas: false,
  ramas_secas_pct_copa: null,
  ramas_quebradas: false,
  desequilibrio_copa: false,
  zona_objetivo: "Bajo la copa",
  tasa_ocupacion_objetivo: "Constante",
  consecuencia_raices_cuello: "Severa",
  consecuencia_tronco: "Severa",
  consecuencia_copa_ramas: "Severa",
};

function errorPath(patch: Record<string, unknown>): string | undefined {
  const r = treeRiskVariablesSchema.safeParse({ ...base, ...patch });
  return r.success ? undefined : r.error.issues[0]?.path.join(".");
}

describe("treeRiskVariablesSchema — datos condicionales exigidos por las reglas", () => {
  it("acepta una evaluación completa sin hallazgos", () => {
    expect(treeRiskVariablesSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["raíces expuestas sin necrosis", { raices_expuestas: true, raices_cortadas: false }, "necrosis_radicular"],
    ["raíces expuestas sin raíces cortadas", { raices_expuestas: true, necrosis_radicular: false }, "raices_cortadas"],
    ["cavidad basal sin síntoma externo indicado", { cavidad_pudricion_basal: true }, "cavidad_basal_externa"],
    ["cavidad de tronco sin síntoma externo indicado", { presenta_cavidad_pudricion_tronco: true }, "cavidad_externa_tronco"],
    ["heridas sin condición", { presenta_heridas_tronco: true }, "condicion_heridas_tronco"],
    ["grieta sin afectación", { presenta_fisura_grieta_tronco: true }, "afectacion_fisura_grieta"],
    [
      "grieta que penetra en madera sin dirección",
      { presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "Penetra en madera" },
      "direccion_grieta",
    ],
    ["codominancia sin grieta en la unión", { troncos_codominantes: true }, "grieta_union_codominante"],
    [
      "codominancia sin grieta y sin corteza incluida",
      { troncos_codominantes: true, grieta_union_codominante: false },
      "corteza_incluida",
    ],
    ["ramas secas sin porcentaje", { ramas_secas: true }, "ramas_secas_pct_copa"],
    ["ramas secas con 0 %", { ramas_secas: true, ramas_secas_pct_copa: 0 }, "ramas_secas_pct_copa"],
    ["ramas secas sobre 100 %", { ramas_secas: true, ramas_secas_pct_copa: 250 }, "ramas_secas_pct_copa"],
    [
      "SL negativo",
      { presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true, sl_tronco_pct: -5 },
      "sl_tronco_pct",
    ],
    ["SL sobre 100", { cavidad_pudricion_basal: true, cavidad_basal_externa: true, sl_basal_pct: 120 }, "sl_basal_pct"],
    ["t/R mayor que 1", { cavidad_pudricion_basal: true, cavidad_basal_externa: false, t_r_basal: 1.5 }, "t_r_basal"],
  ])("rechaza %s", (_label, patch, path) => {
    expect(errorPath(patch)).toBe(path);
  });

  it.each([
    ["grieta solo en corteza (no exige dirección)", { presenta_fisura_grieta_tronco: true, afectacion_fisura_grieta: "Solo corteza" }],
    ["codominancia con grieta en la unión (no exige corteza incluida)", { troncos_codominantes: true, grieta_union_codominante: true }],
    ["ramas secas con 100 %", { ramas_secas: true, ramas_secas_pct_copa: 100 }],
    // SL y t/R vacíos: la regla los resuelve como "No determinado" (RC/TR-CAV-05 y -08).
    ["cavidad externa con SL no calculable", { presenta_cavidad_pudricion_tronco: true, cavidad_externa_tronco: true }],
    ["cavidad interna con t/R no medido", { cavidad_pudricion_basal: true, cavidad_basal_externa: false }],
  ])("acepta %s", (_label, patch) => {
    expect(errorPath(patch)).toBeUndefined();
  });
});

describe("createTreeRiskAssessmentSchema — fecha_evaluacion", () => {
  it("rechaza una fecha futura", () => {
    const r = createTreeRiskAssessmentSchema.safeParse({ fecha_evaluacion: "2999-01-01", variables: base });
    expect(r.success).toBe(false);
  });

  it("acepta una fecha pasada", () => {
    const r = createTreeRiskAssessmentSchema.safeParse({ fecha_evaluacion: "2026-01-01", variables: base });
    expect(r.success).toBe(true);
  });
});
