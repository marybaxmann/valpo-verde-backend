import { resolveCurrentMeasurement } from "../../src/services/tree.service";
import { TreeMeasurementRow } from "../../src/repositories/treeMeasurement.repository";

function fakeMeasurement(
  id: string,
  fecha: string,
  overrides: Partial<TreeMeasurementRow> = {}
): TreeMeasurementRow {
  return {
    id,
    tree_id: "tree-1",
    fecha_medicion: fecha,
    configuracion_fustes: "monofuste_test",
    numero_fustes: null,
    dap_fustes_cm: null,
    dap_cm: 25.5,
    altura_total_m: 12.0,
    diametro_copa_m: 6.5,
    altura_primera_rama_m: 2.5,
    clase_edad: "Maduro",
    estado_medicion: "valida",
    motivo_anulacion: null,
    anulado_por: null,
    fecha_anulacion: null,
    created_by: "user-1",
    created_at: "2026-10-05T12:00:00Z",
    updated_at: "2026-10-05T12:00:00Z",
    ...overrides,
  };
}

describe("resolveCurrentMeasurement", () => {
  it("0 mediciones candidatas -> medicion_actual null con estado sin_mediciones", () => {
    const result = resolveCurrentMeasurement([]);
    expect(result).toEqual({
      medicion_actual: null,
      medicion_actual_estado: "sin_mediciones",
      medicion_actual_detalle: null,
    });
  });

  it("1 medición candidata -> devuelve esa medición con estado ok", () => {
    const m1 = fakeMeasurement("m-1", "2026-10-01");
    const result = resolveCurrentMeasurement([m1]);
    expect(result).toEqual({
      medicion_actual: m1,
      medicion_actual_estado: "ok",
      medicion_actual_detalle: null,
    });
  });

  it("2 candidatas con fecha máxima inequívoca (fecha[0] > fecha[1]) -> devuelve la más reciente con estado ok", () => {
    const m1 = fakeMeasurement("m-1", "2026-10-05");
    const m2 = fakeMeasurement("m-2", "2026-09-15");
    const result = resolveCurrentMeasurement([m1, m2]);
    expect(result).toEqual({
      medicion_actual: m1,
      medicion_actual_estado: "ok",
      medicion_actual_detalle: null,
    });
  });

  it("2 candidatas con misma fecha máxima -> estado controlado error_empate_fecha_maxima y medicion_actual null", () => {
    const m1 = fakeMeasurement("m-1", "2026-10-05");
    const m2 = fakeMeasurement("m-2", "2026-10-05");
    const result = resolveCurrentMeasurement([m1, m2]);
    expect(result.medicion_actual).toBeNull();
    expect(result.medicion_actual_estado).toBe("error_empate_fecha_maxima");
    expect(result.medicion_actual_detalle).toContain(
      "Existen múltiples mediciones válidas con la misma fecha máxima"
    );
  });

  it("más de 2 candidatas empatadas en fecha máxima (ej. 3) -> estado error_empate_fecha_maxima", () => {
    const m1 = fakeMeasurement("m-1", "2026-10-05");
    const m2 = fakeMeasurement("m-2", "2026-10-05");
    const m3 = fakeMeasurement("m-3", "2026-10-05");
    const result = resolveCurrentMeasurement([m1, m2, m3]);
    expect(result.medicion_actual).toBeNull();
    expect(result.medicion_actual_estado).toBe("error_empate_fecha_maxima");
  });
});
