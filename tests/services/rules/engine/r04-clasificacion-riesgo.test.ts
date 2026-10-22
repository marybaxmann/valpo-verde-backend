import { evaluarR04 } from "../../../../src/services/rules/engine/r04-clasificacion-riesgo";
import { ClasificacionRiesgoCodigo } from "../../../../src/services/rules/engine/catalogs";

describe("R04 — el nivel más alto entre los tres componentes (D-181)", () => {
  it("los tres Bajo → Bajo", () => {
    const r = evaluarR04("bajo", "bajo", "bajo");
    expect(r.clasificacionRiesgo).toBe("bajo");
  });
  it("un componente Alto, los otros Bajo → Alto", () => {
    const r = evaluarR04("alto", "bajo", "bajo");
    expect(r.clasificacionRiesgo).toBe("alto");
  });
  it("un componente Extremo, los otros Alto → Extremo", () => {
    const r = evaluarR04("alto", "extremo", "alto");
    expect(r.clasificacionRiesgo).toBe("extremo");
  });
  it("Moderado + Alto + Bajo → Alto", () => {
    const r = evaluarR04("moderado", "alto", "bajo");
    expect(r.clasificacionRiesgo).toBe("alto");
  });
  it("es simétrico ante el orden de los componentes", () => {
    const a = evaluarR04("bajo", "extremo", "moderado");
    const b = evaluarR04("extremo", "moderado", "bajo");
    expect(a.clasificacionRiesgo).toBe(b.clasificacionRiesgo);
    expect(a.clasificacionRiesgo).toBe("extremo");
  });
});

describe("R04 — no_determinado se propaga (D-181), nunca se calcula con los otros dos", () => {
  it("raíces y cuello = no_determinado, tronco y copa Bajo → no_determinado", () => {
    const r = evaluarR04("no_determinado", "bajo", "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/clasificacion_raices_cuello/);
    expect(r.motivo).toMatch(/D-181/);
  });
  it("tronco = no_determinado, aunque copa sea Extremo → no_determinado (no se ignora el que falta)", () => {
    const r = evaluarR04("bajo", "no_determinado", "extremo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/clasificacion_tronco/);
  });
  it("dos componentes no_determinado → no_determinado, cita a los dos", () => {
    const r = evaluarR04("no_determinado", "no_determinado", "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/clasificacion_raices_cuello/);
    expect(r.motivo).toMatch(/clasificacion_tronco/);
  });
});

describe("R04 — faltantes y fuera de dominio", () => {
  it("un componente null → no_determinado", () => {
    const r = evaluarR04(null, "bajo", "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/clasificacion_raices_cuello/);
  });
  it("los tres null → no_determinado, cita a los tres", () => {
    const r = evaluarR04(null, null, null);
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/clasificacion_raices_cuello/);
    expect(r.motivo).toMatch(/clasificacion_tronco/);
    expect(r.motivo).toMatch(/clasificacion_copa_ramas/);
  });
  it("un componente con código no reconocido → no_determinado, nunca se trata como un nivel conocido", () => {
    const r = evaluarR04("catastrofico" as unknown as ClasificacionRiesgoCodigo, "bajo", "bajo");
    expect(r.noDeterminado).toBe(true);
    expect(r.motivo).toMatch(/código no reconocido/);
  });
});
