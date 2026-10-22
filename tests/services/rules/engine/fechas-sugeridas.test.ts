import {
  calcularFechaProximaInspeccion,
  calcularFechaProximoMonitoreo,
} from "../../../../src/services/rules/engine/fechas-sugeridas";
import { ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

describe("D-212 — fecha_proxima_inspeccion", () => {
  it("Bajo: 24 meses, sin rango (inicio = fin)", () => {
    const r = calcularFechaProximaInspeccion("bajo", "2026-10-22");
    expect(r.fechaInicio).toBe("2028-10-22");
    expect(r.fechaFin).toBe("2028-10-22");
    expect(r.noDeterminable).toBe(false);
  });
  it("Moderado: 12 meses, sin rango (inicio = fin)", () => {
    const r = calcularFechaProximaInspeccion("moderado", "2026-10-22");
    expect(r.fechaInicio).toBe("2027-10-22");
    expect(r.fechaFin).toBe("2027-10-22");
  });
  it("Alto: rango de 1 a 3 meses", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-11-22");
    expect(r.fechaFin).toBe("2027-01-22");
  });
  it("Extremo: rango de 1 a 4 semanas", () => {
    const r = calcularFechaProximaInspeccion("extremo", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-10-29");
    expect(r.fechaFin).toBe("2026-11-19");
  });
  it("nivel_riesgo = no_determinado: se reporta como bloqueo, no se inventa una fecha", () => {
    const r = calcularFechaProximaInspeccion("no_determinado", "2026-10-22");
    expect(r.fechaInicio).toBeNull();
    expect(r.fechaFin).toBeNull();
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/no se inventa/);
    expect(r.motivo).toMatch(/D-212/);
  });
});

describe("D-213 — fecha_proximo_monitoreo", () => {
  it("Bajo: 12 meses, sin rango (inicio = fin)", () => {
    const r = calcularFechaProximoMonitoreo("bajo", "2026-10-22");
    expect(r.fechaInicio).toBe("2027-10-22");
    expect(r.fechaFin).toBe("2027-10-22");
  });
  it("Moderado: rango de 3 a 6 meses", () => {
    const r = calcularFechaProximoMonitoreo("moderado", "2026-10-22");
    expect(r.fechaInicio).toBe("2027-01-22");
    expect(r.fechaFin).toBe("2027-04-22");
  });
  it("Alto: rango de 2 a 4 semanas", () => {
    const r = calcularFechaProximoMonitoreo("alto", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-11-05");
    expect(r.fechaFin).toBe("2026-11-19");
  });
  it("Extremo: inmediato y continuo — fechaInicio es la propia fecha de inspección, sin fin", () => {
    const r = calcularFechaProximoMonitoreo("extremo", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-10-22");
    expect(r.fechaFin).toBeNull();
    expect(r.inmediatoYContinuo).toBe(true);
    expect(r.noDeterminable).toBe(false);
  });
  it("nivel_riesgo = no_determinado: se reporta como bloqueo, no se inventa una fecha", () => {
    const r = calcularFechaProximoMonitoreo("no_determinado", "2026-10-22");
    expect(r.fechaInicio).toBeNull();
    expect(r.fechaFin).toBeNull();
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/D-213/);
  });
});

describe("Faltantes y fuera de dominio (ambas funciones)", () => {
  it("fecha_inspeccion = null → no determinable", () => {
    const r = calcularFechaProximaInspeccion("bajo", null);
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/fecha_inspeccion/);
  });
  it("fecha_inspeccion con formato inválido → no determinable", () => {
    const r = calcularFechaProximaInspeccion("bajo", "22/10/2026");
    expect(r.noDeterminable).toBe(true);
  });
  it("fecha_inspeccion con una fecha de calendario inexistente (31 de abril) → no determinable", () => {
    const r = calcularFechaProximaInspeccion("bajo", "2026-04-31");
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/fecha de calendario válida/);
  });
  it("nivel_riesgo = null → no determinable", () => {
    const r = calcularFechaProximoMonitoreo(null, "2026-10-22");
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/nivel_riesgo/);
  });
  it("nivel_riesgo con código no reconocido → no determinable", () => {
    const r = calcularFechaProximoMonitoreo("catastrofico" as unknown as ClasificacionRiesgoCodigo, "2026-10-22");
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});

describe("Fin de mes — se recorta al último día del mes de destino, nunca se desborda al mes siguiente", () => {
  it("31 de enero de 2026 (no bisiesto) + 1 mes (Alto, D-212) → 28 de febrero de 2026", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-01-31");
    expect(r.fechaInicio).toBe("2026-02-28");
  });
  it("31 de agosto de 2026 + 1 mes (Alto, D-212) → 30 de septiembre de 2026", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-08-31");
    expect(r.fechaInicio).toBe("2026-09-30");
  });
  it("31 de enero de 2030 (no bisiesto) + 1 mes (Alto, D-212) → 28 de febrero de 2030", () => {
    const r = calcularFechaProximaInspeccion("alto", "2030-01-31");
    expect(r.fechaInicio).toBe("2030-02-28");
  });
  it("31 de enero de 2028 (bisiesto) + 1 mes (Alto, D-212) → 29 de febrero de 2028", () => {
    const r = calcularFechaProximaInspeccion("alto", "2028-01-31");
    expect(r.fechaInicio).toBe("2028-02-29");
  });
  it("31 de octubre + 24 meses (Bajo, D-212, cruza dos fines de año) → 31 de octubre dos años después (ambos destinos tienen 31 días)", () => {
    const r = calcularFechaProximaInspeccion("bajo", "2026-10-31");
    expect(r.fechaInicio).toBe("2028-10-31");
  });
  it("31 de diciembre + 3 meses (Alto, D-212, fin de rango) → 31 de marzo (cruza año)", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-12-31");
    expect(r.fechaFin).toBe("2027-03-31");
  });
});
