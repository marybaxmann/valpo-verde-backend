import { extractRoleName } from "../../src/repositories/userProfile.repository";

/**
 * `extractRoleName` es una función pura (no toca supabaseAdmin): se
 * prueba directamente contra el módulo real, sin mockear nada.
 */
describe("extractRoleName", () => {
  it("normaliza un rol como objeto {nombre}", () => {
    expect(extractRoleName({ nombre: "admin" })).toBe("admin");
  });

  it("normaliza un rol como arreglo de un elemento", () => {
    expect(extractRoleName([{ nombre: "usuario_municipal" }])).toBe(
      "usuario_municipal"
    );
  });

  it("devuelve null si el arreglo está vacío", () => {
    expect(extractRoleName([])).toBeNull();
  });

  it("devuelve null si no hay rol", () => {
    expect(extractRoleName(null)).toBeNull();
  });
});
