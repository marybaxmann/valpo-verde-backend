import { mensajeAltaFueraDeSector, mensajeCheck } from "../../src/utils/mensajesBase";

/** B-4: mensajes claros para errores de la base. */
describe("mensajeAltaFueraDeSector (SV046; CC-046)", () => {
  it("no nombra el tree_code de un árbol que no se creó", () => {
    const m = mensajeAltaFueraDeSector("El árbol A-000123 queda fuera de la delimitación del sector de su proyecto");
    expect(m).not.toMatch(/A-\d+/);
    expect(m).toContain("queda fuera del sector del proyecto");
  });

  it("sector no encontrado, sin código ni id", () => {
    const m = mensajeAltaFueraDeSector("No se encontró el sector 3f1c… del árbol A-000124 (o no es visible)");
    expect(m).toBe("El árbol no se registró: no se encontró el sector del proyecto.");
  });

  it("otro mensaje se conserva", () => {
    expect(mensajeAltaFueraDeSector("otro")).toBe("otro");
  });
});

describe("mensajeCheck (23514)", () => {
  it("especie inválida (D-13, D-257; 022) en palabras simples", () => {
    const m = mensajeCheck('new row for relation "species" violates check constraint "chk_species_especie_cientifica_valida"');
    expect(m).not.toContain("chk_");
    expect(m).toContain("«Género sp.», «Género spp.» ni «No determinado»");
  });

  it("alta sin especie ni nombre común", () => {
    const m = mensajeCheck('new row for relation "trees" violates check constraint "chk_trees_especie_o_comun"');
    expect(m).toBe("Indique la especie científica o el nombre común del árbol.");
  });

  it("una restricción no conocida conserva el mensaje", () => {
    const original = 'new row for relation "x" violates check constraint "chk_otra"';
    expect(mensajeCheck(original)).toBe(original);
  });
});
