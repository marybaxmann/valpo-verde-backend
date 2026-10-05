import { InvalidLocationError, parseLocationPoint } from "../../src/utils/geoPoint";

describe("parseLocationPoint", () => {
  it("null/undefined -> null (árbol sin ubicación)", () => {
    expect(parseLocationPoint(null)).toBeNull();
    expect(parseLocationPoint(undefined)).toBeNull();
  });

  it("Point de PostGIS (con crs) -> [lon, lat]", () => {
    expect(
      parseLocationPoint({
        type: "Point",
        crs: { type: "name", properties: { name: "EPSG:4326" } },
        coordinates: [-71.6197, -33.0458],
      })
    ).toEqual([-71.6197, -33.0458]);
  });

  it("acepta los bordes de rango", () => {
    expect(parseLocationPoint({ type: "Point", coordinates: [-180, -90] })).toEqual([-180, -90]);
    expect(parseLocationPoint({ type: "Point", coordinates: [180, 90] })).toEqual([180, 90]);
  });

  it.each([
    ["texto EWKB", "0101000020E6100000"],
    ["número", 42],
    ["arreglo", [-71.6, -33.0]],
    ["otro tipo", { type: "Polygon", coordinates: [] }],
    ["sin coordenadas", { type: "Point" }],
    ["una coordenada", { type: "Point", coordinates: [-71.6] }],
    ["tres coordenadas", { type: "Point", coordinates: [-71.6, -33.0, 5] }],
    ["coordenada texto", { type: "Point", coordinates: ["-71.6", -33.0] }],
    ["NaN", { type: "Point", coordinates: [Number.NaN, -33.0] }],
    ["Infinity", { type: "Point", coordinates: [-71.6, Number.POSITIVE_INFINITY] }],
    ["longitud < -180", { type: "Point", coordinates: [-180.0001, 0] }],
    ["longitud > 180", { type: "Point", coordinates: [180.0001, 0] }],
    ["latitud < -90", { type: "Point", coordinates: [0, -90.0001] }],
    ["latitud > 90", { type: "Point", coordinates: [0, 90.0001] }],
  ])("rechaza %s", (_label, value) => {
    expect(() => parseLocationPoint(value)).toThrow(InvalidLocationError);
  });
});
