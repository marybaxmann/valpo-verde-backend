import { normalizarRut } from "../../src/utils/rut";

/** D-179: estructura y dígito verificador; se guarda sin puntos, con «K» mayúscula. */
describe("normalizarRut", () => {
  it("acepta con y sin puntos y devuelve la forma de la base", () => {
    expect(normalizarRut("12.345.678-5")).toBe("12345678-5");
    expect(normalizarRut(" 12345678-5 ")).toBe("12345678-5");
  });

  it("dígito verificador K (en minúscula también) y 0", () => {
    expect(normalizarRut("10.000.013-k")).toBe("10000013-K");
    expect(normalizarRut("11111111-1")).toBe("11111111-1");
    expect(normalizarRut("1-9")).toBe("1-9");
    expect(normalizarRut("28-0")).toBe("28-0");
    expect(normalizarRut("16-0")).toBeNull();
  });

  it("rechaza dígito verificador incorrecto o estructura inválida", () => {
    expect(normalizarRut("12.345.678-9")).toBeNull();
    expect(normalizarRut("12345678")).toBeNull();
    expect(normalizarRut("123456789-5")).toBeNull();
    expect(normalizarRut("12.345.678-X")).toBeNull();
    expect(normalizarRut("")).toBeNull();
  });
});
