import {
  CAMPOS_EVALUACION_INSTRUMENTAL,
  CAMPOS_MONITOREO_ESTRUCTURAL,
  CAMPOS_MONITOREO_FITOSANITARIO,
  CAMPOS_MONITOREO_VITALIDAD,
  camposPermitidosPorTipo,
  tipoSubtipoValido,
} from "../../../src/schemas/sivu/alcanceInspeccion";

describe("tipoSubtipoValido (D-196/D-197)", () => {
  it("evaluacion_inicial y levantamiento solo aceptan subtipo null", () => {
    expect(tipoSubtipoValido("evaluacion_inicial", null)).toBe(true);
    expect(tipoSubtipoValido("evaluacion_inicial", "seguimiento")).toBe(false);
    expect(tipoSubtipoValido("levantamiento", null)).toBe(true);
    expect(tipoSubtipoValido("levantamiento", "fitosanitario")).toBe(false);
  });

  it("reevaluacion acepta null, seguimiento o post_intervencion", () => {
    expect(tipoSubtipoValido("reevaluacion", null)).toBe(true);
    expect(tipoSubtipoValido("reevaluacion", "seguimiento")).toBe(true);
    expect(tipoSubtipoValido("reevaluacion", "post_intervencion")).toBe(true);
    expect(tipoSubtipoValido("reevaluacion", "fitosanitario")).toBe(false);
  });

  it("evaluacion_instrumental acepta null o sus tres subtipos", () => {
    expect(tipoSubtipoValido("evaluacion_instrumental", null)).toBe(true);
    expect(tipoSubtipoValido("evaluacion_instrumental", "tomografia_sonica")).toBe(true);
    expect(tipoSubtipoValido("evaluacion_instrumental", "resistografia")).toBe(true);
    expect(tipoSubtipoValido("evaluacion_instrumental", "otra_instrumental")).toBe(true);
    expect(tipoSubtipoValido("evaluacion_instrumental", "seguimiento")).toBe(false);
  });

  it("monitoreo exige uno de sus tres subtipos, nunca null", () => {
    expect(tipoSubtipoValido("monitoreo", null)).toBe(false);
    expect(tipoSubtipoValido("monitoreo", "fitosanitario")).toBe(true);
    expect(tipoSubtipoValido("monitoreo", "estructural")).toBe(true);
    expect(tipoSubtipoValido("monitoreo", "vitalidad")).toBe(true);
    expect(tipoSubtipoValido("monitoreo", "tomografia_sonica")).toBe(false);
  });

  it("un tipo fuera del catálogo vigente se rechaza siempre", () => {
    expect(tipoSubtipoValido("tipo_inexistente", null)).toBe(false);
  });
});

describe("camposPermitidosPorTipo (CC-040)", () => {
  it("evaluacion_instrumental: exactamente los campos de cavidad basal y tronco, sin los calculados", () => {
    const permitidos = camposPermitidosPorTipo("evaluacion_instrumental", null);
    expect(permitidos).toEqual(CAMPOS_EVALUACION_INSTRUMENTAL);
    expect(permitidos).not.toContain("SL_basal_pct");
    expect(permitidos).not.toContain("R_radio_basal_cm");
    expect(permitidos).not.toContain("t_R_basal");
  });

  it("monitoreo/fitosanitario: los 5 campos de CC-040 (a)", () => {
    expect(camposPermitidosPorTipo("monitoreo", "fitosanitario")).toEqual(CAMPOS_MONITOREO_FITOSANITARIO);
  });

  it("monitoreo/estructural: incluye raíces, cavidad/tronco y ramas, excluye defoliación/clorosis/necrosis", () => {
    const permitidos = camposPermitidosPorTipo("monitoreo", "estructural");
    expect(permitidos).toEqual(CAMPOS_MONITOREO_ESTRUCTURAL);
    expect(permitidos).toContain("raices_expuestas");
    expect(permitidos).toContain("desequilibrio_copa");
    expect(permitidos).not.toContain("defoliacion_estimada_pct");
    expect(permitidos).not.toContain("clorosis_pct");
    expect(permitidos).not.toContain("necrosis_pct");
  });

  it("monitoreo/vitalidad: solo clasificacion_vitalidad", () => {
    expect(camposPermitidosPorTipo("monitoreo", "vitalidad")).toEqual(CAMPOS_MONITOREO_VITALIDAD);
  });

  it("evaluacion_inicial, reevaluacion y levantamiento devuelven null (evaluación completa, sin lista cerrada todavía)", () => {
    expect(camposPermitidosPorTipo("evaluacion_inicial", null)).toBeNull();
    expect(camposPermitidosPorTipo("reevaluacion", "seguimiento")).toBeNull();
    expect(camposPermitidosPorTipo("levantamiento", null)).toBeNull();
  });
});
