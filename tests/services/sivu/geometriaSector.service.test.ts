import {
  resolverGeometriaSector,
  resolverKmlParaVistaPrevia,
} from "../../../src/services/sivu/geometriaSector.service";

const KML = '<kml xmlns="http://www.opengis.net/kml/2.2"><Document></Document></kml>';
const KML_BASE64 = Buffer.from(KML, "utf-8").toString("base64");

describe("resolverGeometriaSector — indicesSeleccionados (D-265; CC-047)", () => {
  it("geojson: sin selección (un dibujo ya es lo que el usuario quiere)", async () => {
    const geometria = { type: "Polygon" as const, coordinates: [] };
    const r = await resolverGeometriaSector({ formato: "geojson", geometria });
    expect(r).toEqual({ formato: "geojson", geometriaGeojson: geometria, geometriaKml: null, indicesSeleccionados: null });
  });

  it("kml con selección: entrega el texto KML y los índices tal cual", async () => {
    const r = await resolverGeometriaSector({ formato: "kml", archivoBase64: KML_BASE64, indicesSeleccionados: [0, 2] });
    expect(r).toEqual({ formato: "kml", geometriaGeojson: null, geometriaKml: KML, indicesSeleccionados: [0, 2] });
  });

  it("kml sin selección: null — la base decide si hace falta (varias superficies → 422)", async () => {
    const r = await resolverGeometriaSector({ formato: "kml", archivoBase64: KML_BASE64 });
    expect(r.indicesSeleccionados).toBeNull();
  });
});

describe("resolverKmlParaVistaPrevia", () => {
  it("kml: devuelve el texto crudo", async () => {
    await expect(resolverKmlParaVistaPrevia({ formato: "kml", archivoBase64: KML_BASE64 })).resolves.toBe(KML);
  });

  it("kmz que no es un ZIP: se rechaza antes de llegar a la base", async () => {
    await expect(resolverKmlParaVistaPrevia({ formato: "kmz", archivoBase64: KML_BASE64 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
