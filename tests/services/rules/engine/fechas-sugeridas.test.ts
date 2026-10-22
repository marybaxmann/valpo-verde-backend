import {
  calcularFechaProximaInspeccion,
  calcularFechaProximoMonitoreo,
} from "../../../../src/services/rules/engine/fechas-sugeridas";
import { ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

describe("D-212 — fecha_proxima_inspeccion", () => {
  it("Bajo: inicio del rango a 24 meses", () => {
    const r = calcularFechaProximaInspeccion("bajo", "2026-10-22");
    expect(r.fecha).toBe("2028-10-22");
    expect(r.noDeterminable).toBe(false);
  });
  it("Moderado: inicio del rango a 12 meses", () => {
    const r = calcularFechaProximaInspeccion("moderado", "2026-10-22");
    expect(r.fecha).toBe("2027-10-22");
  });
  it("Alto: inicio del rango de 1 a 3 meses → 1 mes", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-10-22");
    expect(r.fecha).toBe("2026-11-22");
  });
  it("Extremo: inicio del rango de 1 a 4 semanas → 1 semana", () => {
    const r = calcularFechaProximaInspeccion("extremo", "2026-10-22");
    expect(r.fecha).toBe("2026-10-29");
  });
  it("nivel_riesgo = no_determinado: se reporta como bloqueo, no se inventa una fecha", () => {
    const r = calcularFechaProximaInspeccion("no_determinado", "2026-10-22");
    expect(r.fecha).toBeNull();
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/no se inventa/);
    expect(r.motivo).toMatch(/D-212/);
  });
});

describe("D-213 — fecha_proximo_monitoreo", () => {
  it("Bajo: inicio del rango a 12 meses", () => {
    const r = calcularFechaProximoMonitoreo("bajo", "2026-10-22");
    expect(r.fecha).toBe("2027-10-22");
  });
  it("Moderado: inicio del rango de 3 a 6 meses → 3 meses", () => {
    const r = calcularFechaProximoMonitoreo("moderado", "2026-10-22");
    expect(r.fecha).toBe("2027-01-22");
  });
  it("Alto: inicio del rango de 2 a 4 semanas → 2 semanas", () => {
    const r = calcularFechaProximoMonitoreo("alto", "2026-10-22");
    expect(r.fecha).toBe("2026-11-05");
  });
  it("Extremo: inmediato y continuo — la fecha es la propia fecha de inspección, con la bandera activada", () => {
    const r = calcularFechaProximoMonitoreo("extremo", "2026-10-22");
    expect(r.fecha).toBe("2026-10-22");
    expect(r.inmediatoYContinuo).toBe(true);
    expect(r.noDeterminable).toBe(false);
  });
  it("nivel_riesgo = no_determinado: se reporta como bloqueo, no se inventa una fecha", () => {
    const r = calcularFechaProximoMonitoreo("no_determinado", "2026-10-22");
    expect(r.fecha).toBeNull();
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

describe("Normalización de fin de mes (nota documentada, a confirmar)", () => {
  it("31 de enero + 1 mes (Alto, D-212) → normaliza al 2 o 3 de marzo, porque febrero no tiene 31 días", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-01-31");
    // 2026 no es bisiesto: febrero tiene 28 días → el desborde cae en el 3 de marzo.
    expect(r.fecha).toBe("2026-03-03");
  });
});
