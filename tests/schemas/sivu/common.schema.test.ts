import {
  coordenadaUtmEste,
  coordenadaUtmNorte,
  geometriaSectorInput,
  vistaPreviaSectorSchema,
} from "../../../src/schemas/sivu/common.schema";

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

describe("geometriaSectorInput — indicesSeleccionados (D-265; CC-047)", () => {
  const kml = { formato: "kml" as const, archivoBase64: "PGttbC8+" };

  it("acepta un KML sin selección (la base exige la selección solo si hay varias superficies)", () => {
    expect(geometriaSectorInput.safeParse(kml).success).toBe(true);
  });

  it("acepta una selección de índices no negativos", () => {
    const r = geometriaSectorInput.safeParse({ ...kml, indicesSeleccionados: [0, 2] });
    expect(r.success).toBe(true);
    if (r.success && r.data.formato !== "geojson") {
      expect(r.data.indicesSeleccionados).toEqual([0, 2]);
    }
  });

  it("rechaza una selección vacía", () => {
    expect(geometriaSectorInput.safeParse({ ...kml, indicesSeleccionados: [] }).success).toBe(false);
  });

  it.each([[[-1]], [[1.5]], [["0"]]])("rechaza índices no enteros o negativos: %j", (indices) => {
    expect(geometriaSectorInput.safeParse({ ...kml, indicesSeleccionados: indices }).success).toBe(false);
  });
});

describe("vistaPreviaSectorSchema (POST /api/sivu/projects/sector-preview)", () => {
  it.each(["kml", "kmz"])("acepta formato %s con archivo", (formato) => {
    expect(vistaPreviaSectorSchema.safeParse({ formato, archivoBase64: "UEs=" }).success).toBe(true);
  });

  it("rechaza geojson: un dibujo no tiene nada que previsualizar ni elegir", () => {
    expect(vistaPreviaSectorSchema.safeParse({ formato: "geojson", archivoBase64: "e30=" }).success).toBe(false);
  });

  it("rechaza indicesSeleccionados (la vista previa es lo que permite elegirlos)", () => {
    expect(
      vistaPreviaSectorSchema.safeParse({ formato: "kml", archivoBase64: "PGttbC8+", indicesSeleccionados: [0] }).success
    ).toBe(false);
  });

  it("rechaza un archivo vacío", () => {
    expect(vistaPreviaSectorSchema.safeParse({ formato: "kml", archivoBase64: "" }).success).toBe(false);
  });
});
