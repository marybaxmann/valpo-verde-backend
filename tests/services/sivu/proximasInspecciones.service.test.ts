/** B5 (CC-037): rango de cada recordatorio y lista por proyecto. Casos tomados de la base de pruebas (2026-11-01). */
jest.mock("../../../src/services/authorization.service");
jest.mock("../../../src/repositories/sivu/proximasInspecciones.repository");

import { hoyEnChile, listarProximasInspecciones, rangoDe } from "../../../src/services/sivu/proximasInspecciones.service";
import { assertProjectAccess } from "../../../src/services/authorization.service";
import { listarArbolesPorId, listarProximas } from "../../../src/repositories/sivu/proximasInspecciones.repository";

const fila = (extra: Record<string, unknown>) => ({
  tree_id: "t1", tipo: "inspeccion", fecha: "2026-11-30", ajustada: false, inspection_id: "i1", fecha_inspeccion: "2026-10-30", nivel_riesgo: "alto", ...extra,
}) as Parameters<typeof rangoDe>[0];

describe("rangoDe (tabla de plazos D-202/D-203)", () => {
  it("Alto, inspección: 1 a 3 meses (A-000423)", () => {
    expect(rangoDe(fila({}))).toEqual({ inicio: "2026-11-30", termino: "2027-01-30", inmediato_y_continuo: false });
  });

  it("Alto, monitoreo: 2 a 4 semanas", () => {
    expect(rangoDe(fila({ tipo: "monitoreo", fecha: "2026-11-13" }))).toEqual({ inicio: "2026-11-13", termino: "2026-11-27", inmediato_y_continuo: false });
  });

  it("Moderado: inspección con un solo valor; monitoreo 3 a 6 meses (A-000419)", () => {
    expect(rangoDe(fila({ fecha: "2027-10-30", nivel_riesgo: "moderado" }))).toEqual({ inicio: "2027-10-30", termino: "2027-10-30", inmediato_y_continuo: false });
    expect(rangoDe(fila({ tipo: "monitoreo", fecha: "2027-01-30", nivel_riesgo: "moderado" }))).toEqual({ inicio: "2027-01-30", termino: "2027-04-30", inmediato_y_continuo: false });
  });

  it("Extremo, monitoreo: inmediato y continuo, sin término", () => {
    expect(rangoDe(fila({ tipo: "monitoreo", fecha: "2026-10-30", nivel_riesgo: "extremo" }))).toEqual({ inicio: "2026-10-30", termino: null, inmediato_y_continuo: true });
  });

  it("fecha ajustada por el Inspector: inicio y término = la ajustada (A-000346, monitoreo)", () => {
    expect(rangoDe(fila({ tipo: "monitoreo", fecha: "2027-10-30", nivel_riesgo: "bajo", fecha_inspeccion: "2026-10-31", ajustada: true })))
      .toEqual({ inicio: "2027-10-30", termino: "2027-10-30", inmediato_y_continuo: false });
  });

  it("fecha vigente distinta del inicio de la tabla (Monitoreo conserva D-202, CC-055): un solo valor", () => {
    expect(rangoDe(fila({ fecha: "2026-12-15" }))).toEqual({ inicio: "2026-12-15", termino: "2026-12-15", inmediato_y_continuo: false });
  });
});

describe("listarProximasInspecciones (B5)", () => {
  beforeEach(() => {
    (assertProjectAccess as jest.Mock).mockResolvedValue(undefined);
    (listarProximas as jest.Mock).mockResolvedValue([
      fila({ tree_id: "t2", tipo: "inspeccion", fecha: "2027-10-30", nivel_riesgo: "moderado" }),
      fila({ tree_id: "t1", tipo: "monitoreo", fecha: "2026-11-13" }),
    ]);
    (listarArbolesPorId as jest.Mock).mockResolvedValue([
      { id: "t1", tree_code: "A-000423", especie_cientifica: null, nombre_comun: "Pimiento", ubicacion_descriptiva: "Plaza" },
      { id: "t2", tree_code: "A-000419", especie_cientifica: null, nombre_comun: "Peumo", ubicacion_descriptiva: "Calle" },
    ]);
  });

  it("verifica acceso, ordena por inicio, etiqueta el riesgo y marca los que ya avisan", async () => {
    const r = await listarProximasInspecciones({ id: "u", email: undefined, nombre: null, role: "usuario_municipal", activo: true }, "p1", "tk", { soloActivos: false, hoy: "2026-11-20" });
    expect(assertProjectAccess).toHaveBeenCalled();
    expect(r.map((p) => p.arbol.tree_code)).toEqual(["A-000423", "A-000419"]);
    expect(r[0]).toMatchObject({ tipo: "monitoreo", inicio: "2026-11-13", termino: "2026-11-27", recordatorio_activo: true, nivel_riesgo: { codigo: "alto", etiqueta: "Alto" } });
    expect(r[1].recordatorio_activo).toBe(false);
  });

  it("solo_activos deja solo los que ya avisan", async () => {
    const r = await listarProximasInspecciones({ id: "u", email: undefined, nombre: null, role: "inspector", activo: true }, "p1", "tk", { soloActivos: true, hoy: "2026-11-20" });
    expect(r.map((p) => p.arbol.tree_code)).toEqual(["A-000423"]);
  });
});

describe("hoyEnChile", () => {
  it("usa la fecha de Santiago, no la UTC", () => {
    // 2026-11-02 01:30 UTC = 2026-11-01 22:30 en Chile (UTC−3).
    expect(hoyEnChile(new Date("2026-11-02T01:30:00Z"))).toBe("2026-11-01");
  });
});
