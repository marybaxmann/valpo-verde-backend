import { coordenadaUtmEste, coordenadaUtmNorte } from "../../../src/schemas/sivu/common.schema";

describe("coordenadaUtmEste (D-9, UTM 19S: 166000–834000 m)", () => {
  it.each([166000, 500000, 834000])("acepta %d", (valor) => {
    expect(coordenadaUtmEste.safeParse(valor).success).toBe(true);
  });

  it.each([165999, 834001, -1, 0])("rechaza %d (fuera de rango)", (valor) => {
    expect(coordenadaUtmEste.safeParse(valor).success).toBe(false);
  });

  it("rechaza no numérico, NaN e Infinity", () => {
    expect(coordenadaUtmEste.safeParse("500000").success).toBe(false);
    expect(coordenadaUtmEste.safeParse(NaN).success).toBe(false);
    expect(coordenadaUtmEste.safeParse(Infinity).success).toBe(false);
  });
});

describe("coordenadaUtmNorte (D-10, falso norte hemisferio sur: 0–10000000 m)", () => {
  it.each([0, 6348000, 10000000])("acepta %d", (valor) => {
    expect(coordenadaUtmNorte.safeParse(valor).success).toBe(true);
  });

  it.each([-1, 10000001])("rechaza %d (fuera de rango)", (valor) => {
    expect(coordenadaUtmNorte.safeParse(valor).success).toBe(false);
  });

  it("rechaza no numérico, NaN e Infinity", () => {
    expect(coordenadaUtmNorte.safeParse("6348000").success).toBe(false);
    expect(coordenadaUtmNorte.safeParse(NaN).success).toBe(false);
    expect(coordenadaUtmNorte.safeParse(Infinity).success).toBe(false);
  });
});
