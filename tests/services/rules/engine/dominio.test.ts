import { esBooleanoValido, motivoFueraDominioSiNo } from "../../../../src/services/rules/engine/dominio";

describe("esBooleanoValido", () => {
  it("true para true y false", () => {
    expect(esBooleanoValido(true)).toBe(true);
    expect(esBooleanoValido(false)).toBe(true);
  });
  it.each(["Sí", "no", 1, 0, "true", "false", null, undefined, {}, []])(
    "false para %p (no es un booleano de JavaScript)",
    (valor) => {
      expect(esBooleanoValido(valor)).toBe(false);
    },
  );
});

describe("motivoFueraDominioSiNo", () => {
  it("incluye el nombre del campo, el valor recibido y la cita del Excel", () => {
    const motivo = motivoFueraDominioSiNo("ramas_secas", "Sí", "D-86");
    expect(motivo).toMatch(/ramas_secas/);
    expect(motivo).toMatch(/D-86/);
    expect(motivo).toMatch(/Sí/);
  });
});
