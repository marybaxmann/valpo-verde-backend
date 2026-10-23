import {
  resolverGeometriaSector,
  quitarBom,
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

/** CRC-32 (IEEE) para armar un ZIP mínimo en el test, sin dependencias. */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** KMZ mínimo: un ZIP con una sola entrada sin comprimir (método 0). */
function kmzCon(nombre: string, contenido: Buffer): Buffer {
  const nombreBuf = Buffer.from(nombre, "utf-8");
  const crc = crc32(contenido);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(contenido.length, 18);
  local.writeUInt32LE(contenido.length, 22);
  local.writeUInt16LE(nombreBuf.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(contenido.length, 20);
  central.writeUInt32LE(contenido.length, 24);
  central.writeUInt16LE(nombreBuf.length, 28);

  const offsetCentral = local.length + nombreBuf.length + contenido.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(1, 8);
  fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(central.length + nombreBuf.length, 12);
  fin.writeUInt32LE(offsetCentral, 16);

  return Buffer.concat([local, nombreBuf, contenido, central, nombreBuf, fin]);
}

describe("BOM inicial (U+FEFF): se quita siempre antes de enviar el KML a la base", () => {
  const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
  const kmlConBom = Buffer.concat([BOM, Buffer.from(KML, "utf-8")]);

  it("quitarBom: quita solo la marca inicial, nada más", () => {
    expect(quitarBom("\ufeff<kml/>")).toBe("<kml/>");
    expect(quitarBom("<kml/>")).toBe("<kml/>");
    expect(quitarBom("<kml>\ufeff</kml>")).toBe("<kml>\ufeff</kml>");
  });

  it("kml con BOM, al crear o editar", async () => {
    const r = await resolverGeometriaSector({ formato: "kml", archivoBase64: kmlConBom.toString("base64") });
    expect(r.geometriaKml).toBe(KML);
  });

  it("kml con BOM, en la vista previa", async () => {
    await expect(
      resolverKmlParaVistaPrevia({ formato: "kml", archivoBase64: kmlConBom.toString("base64") })
    ).resolves.toBe(KML);
  });

  it("kml con BOM dentro de un KMZ, al crear o editar y en la vista previa", async () => {
    const kmz = kmzCon("doc.kml", kmlConBom).toString("base64");

    const r = await resolverGeometriaSector({ formato: "kmz", archivoBase64: kmz, indicesSeleccionados: [0] });
    expect(r).toEqual({ formato: "kml", geometriaGeojson: null, geometriaKml: KML, indicesSeleccionados: [0] });

    await expect(resolverKmlParaVistaPrevia({ formato: "kmz", archivoBase64: kmz })).resolves.toBe(KML);
  });
});
