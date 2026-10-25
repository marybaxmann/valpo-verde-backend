import {
  CAMPOS_EVALUACION_COMPLETA,
  CAMPOS_EVALUACION_INSTRUMENTAL,
  CAMPOS_MONITOREO_ESTRUCTURAL,
  CAMPOS_MONITOREO_FITOSANITARIO,
  CAMPOS_MONITOREO_VITALIDAD,
  camposPermitidosPorTipo,
  tipoSubtipoValido,
} from "../../../src/schemas/sivu/alcanceInspeccion";
import { leerExportCsv } from "../../services/rules/engine/testUtils/csvExport";

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

  it("evaluacion_inicial, reevaluacion y levantamiento usan CAMPOS_EVALUACION_COMPLETA", () => {
    expect(camposPermitidosPorTipo("evaluacion_inicial", null)).toEqual(CAMPOS_EVALUACION_COMPLETA);
    expect(camposPermitidosPorTipo("reevaluacion", "seguimiento")).toEqual(CAMPOS_EVALUACION_COMPLETA);
    expect(camposPermitidosPorTipo("levantamiento", null)).toEqual(CAMPOS_EVALUACION_COMPLETA);
  });
});

/**
 * Compara CAMPOS_EVALUACION_COMPLETA contra DICCIONARIO_CAMPOS (mismo
 * criterio que `scripts/metodologia/campos_evaluacion_completa.py`:
 * Hoja = REGISTRO_EVALUACION, "¿Quién lo ingresa?" = "Inspector" exacto)
 * para que el código y el Excel no se desincronicen (CC-040 punto 1).
 * Lee el CSV ya exportado (docs/excel/export/), mismo mecanismo que
 * catalogs.test.ts — nunca el .xlsx desde Jest.
 */
describe("CAMPOS_EVALUACION_COMPLETA vs DICCIONARIO_CAMPOS (CC-040 punto 1)", () => {
  const EXCLUSIONES_MANUALES = new Set(["justificacion_ajuste_clasificacion"]);

  it("coincide exactamente con los campos de REGISTRO_EVALUACION que ingresa el Inspector (sin exclusiones manuales)", () => {
    const filas = leerExportCsv("DICCIONARIO_CAMPOS.csv").slice(1);
    const campoEnExcel = (fila: string[]) =>
      fila[0] === "REGISTRO_EVALUACION" &&
      fila[3]?.trim() === "Inspector" &&
      !EXCLUSIONES_MANUALES.has(fila[1]);
    const camposExcel = filas.filter(campoEnExcel).map((f) => f[1]);

    expect(new Set(CAMPOS_EVALUACION_COMPLETA)).toEqual(new Set(camposExcel));
    // Ningún duplicado ni en el código ni en el Excel (si lo hubiera, el
    // Set de arriba lo ocultaría).
    expect(CAMPOS_EVALUACION_COMPLETA.length).toBe(camposExcel.length);
  });
});
