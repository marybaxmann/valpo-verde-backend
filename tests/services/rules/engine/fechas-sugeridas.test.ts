import {
  calcularFechaProximaInspeccion,
  calcularFechaProximaInspeccionMonitoreo,
  calcularFechaProximoMonitoreo,
  MOTIVO_CONSERVA_VIGENTE,
  MOTIVO_REINSPECCION_ATRASADA,
} from "../../../../src/services/rules/engine/fechas-sugeridas";
import { ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

describe("D-202 — fecha_proxima_inspeccion", () => {
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
  it("CC-045 (b): nivel_riesgo = no_determinado → rango de Extremo (1 a 4 semanas), con motivo de precaución, nunca sin fecha", () => {
    const r = calcularFechaProximaInspeccion("no_determinado", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-10-29");
    expect(r.fechaFin).toBe("2026-11-19");
    expect(r.noDeterminable).toBe(false);
    expect(r.motivo).toMatch(/CC-045/);
    expect(r.motivo).toMatch(/precaución/);
  });
});

describe("D-203 — fecha_proximo_monitoreo", () => {
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
  it("CC-045 (b): nivel_riesgo = no_determinado → inmediato y continuo (igual que Extremo), con motivo de precaución", () => {
    const r = calcularFechaProximoMonitoreo("no_determinado", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-10-22");
    expect(r.fechaFin).toBeNull();
    expect(r.inmediatoYContinuo).toBe(true);
    expect(r.noDeterminable).toBe(false);
    expect(r.motivo).toMatch(/CC-045/);
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
  it("31 de enero de 2026 (no bisiesto) + 1 mes (Alto, D-202) → 28 de febrero de 2026", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-01-31");
    expect(r.fechaInicio).toBe("2026-02-28");
  });
  it("31 de agosto de 2026 + 1 mes (Alto, D-202) → 30 de septiembre de 2026", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-08-31");
    expect(r.fechaInicio).toBe("2026-09-30");
  });
  it("31 de enero de 2030 (no bisiesto) + 1 mes (Alto, D-202) → 28 de febrero de 2030", () => {
    const r = calcularFechaProximaInspeccion("alto", "2030-01-31");
    expect(r.fechaInicio).toBe("2030-02-28");
  });
  it("31 de enero de 2028 (bisiesto) + 1 mes (Alto, D-202) → 29 de febrero de 2028", () => {
    const r = calcularFechaProximaInspeccion("alto", "2028-01-31");
    expect(r.fechaInicio).toBe("2028-02-29");
  });
  it("31 de octubre + 24 meses (Bajo, D-202, cruza dos fines de año) → 31 de octubre dos años después (ambos destinos tienen 31 días)", () => {
    const r = calcularFechaProximaInspeccion("bajo", "2026-10-31");
    expect(r.fechaInicio).toBe("2028-10-31");
  });
  it("31 de diciembre + 3 meses (Alto, D-202, fin de rango) → 31 de marzo (cruza año)", () => {
    const r = calcularFechaProximaInspeccion("alto", "2026-12-31");
    expect(r.fechaFin).toBe("2027-03-31");
  });
});

describe("CC-055 — D-202 en un Monitoreo (adelanta, nunca atrasa)", () => {
  // fecha_inspeccion 2026-10-22. Bajo calcula 2028-10-22; Alto calcula 2026-11-22 (rango hasta 2027-01-22).
  it("sin fecha vigente → la calculada, idéntica a calcularFechaProximaInspeccion", () => {
    expect(calcularFechaProximaInspeccionMonitoreo("bajo", "2026-10-22", null)).toEqual(
      calcularFechaProximaInspeccion("bajo", "2026-10-22"),
    );
  });
  it("adelanta: el riesgo nuevo (Alto) da una fecha anterior a la vigente → la calculada, con su rango", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("alto", "2026-10-22", "2027-06-01");
    expect(r).toEqual(calcularFechaProximaInspeccion("alto", "2026-10-22"));
    expect(r.fechaInicio).toBe("2026-11-22");
  });
  it("no atrasa: la vigente es anterior a la calculada (Bajo, 24 meses) → se conserva la vigente, con motivo", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("bajo", "2026-10-22", "2027-03-15");
    expect(r.fechaInicio).toBe("2027-03-15");
    expect(r.fechaFin).toBe("2027-03-15");
    expect(r.noDeterminable).toBe(false);
    expect(r.motivo).toBe(MOTIVO_CONSERVA_VIGENTE);
  });
  it("vigente igual al inicio de la calculada → la calculada (no hay nada que conservar)", () => {
    expect(calcularFechaProximaInspeccionMonitoreo("alto", "2026-10-22", "2026-11-22")).toEqual(
      calcularFechaProximaInspeccion("alto", "2026-10-22"),
    );
  });
  it("vigente = día siguiente a fecha_inspeccion → se conserva (es posterior, D-202)", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("bajo", "2026-10-22", "2026-10-23");
    expect(r.fechaInicio).toBe("2026-10-23");
    expect(r.motivo).toBe(MOTIVO_CONSERVA_VIGENTE);
  });
  it("reinspección atrasada: vigente anterior a fecha_inspeccion → el día siguiente a fecha_inspeccion, con motivo", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("bajo", "2026-10-22", "2026-09-01");
    expect(r.fechaInicio).toBe("2026-10-23");
    expect(r.fechaFin).toBe("2026-10-23");
    expect(r.noDeterminable).toBe(false);
    expect(r.motivo).toBe(MOTIVO_REINSPECCION_ATRASADA);
  });
  it("reinspección atrasada: vigente igual a fecha_inspeccion → el día siguiente (D-202 exige posterior)", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("extremo", "2026-10-22", "2026-10-22");
    expect(r.fechaInicio).toBe("2026-10-23");
    expect(r.motivo).toBe(MOTIVO_REINSPECCION_ATRASADA);
  });
  it("reinspección atrasada cruza fin de mes y de año: 31 dic → 1 ene", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("bajo", "2026-12-31", "2026-06-30");
    expect(r.fechaInicio).toBe("2027-01-01");
  });
  it("CC-045 (b) con vigente posterior → la calculada de precaución, con su motivo", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("no_determinado", "2026-10-22", "2027-06-01");
    expect(r.fechaInicio).toBe("2026-10-29");
    expect(r.motivo).toMatch(/CC-045/);
  });
  it("CC-045 (b) con vigente anterior a la de precaución → se conserva la vigente", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("no_determinado", "2026-10-22", "2026-10-25");
    expect(r.fechaInicio).toBe("2026-10-25");
    expect(r.motivo).toBe(MOTIVO_CONSERVA_VIGENTE);
  });
  it("nivel_riesgo sin valor → no determinable aunque haya vigente (nunca se usa la vigente para tapar un dato faltante)", () => {
    const r = calcularFechaProximaInspeccionMonitoreo(null, "2026-10-22", "2027-03-15");
    expect(r.noDeterminable).toBe(true);
    expect(r.fechaInicio).toBeNull();
  });
  it("vigente con formato inválido → no determinable, con motivo", () => {
    const r = calcularFechaProximaInspeccionMonitoreo("bajo", "2026-10-22", "2027-02-30");
    expect(r.noDeterminable).toBe(true);
    expect(r.motivo).toMatch(/vigente/);
  });
});
