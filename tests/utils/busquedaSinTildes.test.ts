import { patronSinTildes, quitarTildes } from "../../src/utils/busquedaSinTildes";

/** B-5: «platano» encuentra «plátano» y al revés. */
const coincide = (termino: string, texto: string) => new RegExp(patronSinTildes(termino), "i").test(texto);

describe("patronSinTildes", () => {
  it("sin tilde encuentra con tilde", () => {
    expect(coincide("platano", "Plátano oriental")).toBe(true);
    expect(coincide("arbol", "Árbol del cielo")).toBe(true);
  });

  it("con tilde encuentra sin tilde", () => {
    expect(coincide("plátano", "Platano de sombra")).toBe(true);
    expect(coincide("plátanus", "Platanus × hispanica")).toBe(true);
  });

  it("con y sin tilde dan el mismo patrón", () => {
    expect(patronSinTildes("plátano")).toBe(patronSinTildes("platano"));
    expect(patronSinTildes("  PLÁTANO ")).toBe(patronSinTildes("platano"));
  });

  it("ñ y n son la misma letra para buscar", () => {
    expect(coincide("pina", "Piña")).toBe(true);
    expect(coincide("piña", "Pina")).toBe(true);
  });

  it("no encuentra lo que no corresponde", () => {
    expect(coincide("platano", "Peumo")).toBe(false);
  });

  it("los caracteres reservados (coma, paréntesis, metacaracteres) pasan a «.»", () => {
    const patron = patronSinTildes("a,b(c)*.");
    expect(patron).not.toMatch(/[,()*]/);
    expect(patron).toBe("[aáàäâ].b.[cç]...");
  });

  it("quitarTildes", () => {
    expect(quitarTildes("Plátano Ñandú")).toBe("Platano Nandu");
  });
});
