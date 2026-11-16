import { HOLGURA_SVG_MODULOS, MARGEN_MODULOS, contornoModulos, matrizQr, qrStl, qrSvg } from "../../../src/services/sivu/qrGeometria";

const URL_PRUEBA = "https://conecta.example.cl/arbol/8b7c6d5e-4f3a-4b2c-9d1e-0f9a8b7c6d5e";

/** Convierte el trazado (M/H/V/Z) en polígonos de vértices enteros. */
function poligonos(d: string): Array<Array<[number, number]>> {
  const out: Array<Array<[number, number]>> = [];
  let actual: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MHVZ])([^MHVZ]*)/g)) {
    const n = args.trim().split(/\s+/).filter(Boolean).map(Number);
    if (cmd === "M") {
      [x, y] = n;
      actual = [[x, y]];
    } else if (cmd === "H") {
      x = n[0];
      actual.push([x, y]);
    } else if (cmd === "V") {
      y = n[0];
      actual.push([x, y]);
    } else {
      out.push(actual);
    }
  }
  return out;
}

/** Regla nonzero: número de vueltas de los polígonos alrededor de (px, py). */
function vueltas(polis: Array<Array<[number, number]>>, px: number, py: number): number {
  let w = 0;
  for (const p of polis) {
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i];
      const [x2, y2] = p[(i + 1) % p.length];
      if (x1 !== x2) continue; // solo aristas verticales cruzan un rayo horizontal
      if (x1 <= px) continue;
      if (y1 <= py && y2 > py) w += 1;
      else if (y2 <= py && y1 > py) w -= 1;
    }
  }
  return w;
}

describe("qrGeometria", () => {
  const matriz = matrizQr(URL_PRUEBA);

  it("deja un margen silencioso de 4 módulos claros por lado", () => {
    const t = matriz.total;
    for (let i = 0; i < t; i++) {
      for (let k = 0; k < MARGEN_MODULOS; k++) {
        expect(matriz.oscuro[k][i]).toBe(false);
        expect(matriz.oscuro[t - 1 - k][i]).toBe(false);
        expect(matriz.oscuro[i][k]).toBe(false);
        expect(matriz.oscuro[i][t - 1 - k]).toBe(false);
      }
    }
    // El patrón de posición de arriba a la izquierda empieza justo tras el margen.
    expect(matriz.oscuro[MARGEN_MODULOS][MARGEN_MODULOS]).toBe(true);
  });

  it("el trazado único cubre exactamente los módulos oscuros (solo líneas horizontales y verticales)", () => {
    const d = contornoModulos(matriz);
    expect(d).toMatch(/^[MHVZ0-9 ]+$/);
    const polis = poligonos(d);
    for (let f = 0; f < matriz.total; f++) {
      for (let c = 0; c < matriz.total; c++) {
        expect(vueltas(polis, c + 0.5, f + 0.5) !== 0).toBe(matriz.oscuro[f][c]);
      }
    }
  });

  it("el SVG mide en milímetros y trae solo el trazado de los módulos", () => {
    const svg = qrSvg(URL_PRUEBA, 80, "QR A-000421 <prueba>");
    expect(svg).toContain('width="80mm" height="80mm"');
    expect(svg).toContain(`viewBox="0 0 ${matriz.total} ${matriz.total}"`);
    expect(svg).toContain('id="modulos"');
    expect(svg).toContain("<title>QR A-000421 prueba</title>");
    // Sin fondo ni ninguna otra forma: OpenSCAD extruiría cualquier relleno.
    expect(svg).not.toMatch(/<rect|<circle|<ellipse|<polygon|<polyline|<line|<image|<use|<g[\s>]|id="placa"|#fff|white|rx=|gradient/i);
    const elementos = [...svg.matchAll(/<([a-z]+)[\s>]/gi)].map((m) => m[1]);
    expect(elementos).toEqual(["svg", "title", "path"]);
  });

  it("sin holgura (PDF) el trazado sigue en coordenadas enteras", () => {
    expect(contornoModulos(matriz)).toMatch(/^[MHVZ0-9 ]+$/);
  });

  it("con la holgura del SVG cubre los mismos módulos y ningún polígono toca a otro", () => {
    const d = qrSvg(URL_PRUEBA, 80, "QR").match(/ d="([^"]+)"/)![1];
    expect(d).toBe(contornoModulos(matriz, HOLGURA_SVG_MODULOS));
    const polis = poligonos(d);
    for (let f = 0; f < matriz.total; f++) {
      for (let c = 0; c < matriz.total; c++) {
        expect(vueltas(polis, c + 0.5, f + 0.5) !== 0).toBe(matriz.oscuro[f][c]);
      }
    }
    // Ningún vértice repetido, ni dentro de un polígono ni entre polígonos:
    // los módulos en diagonal ya no comparten esquina.
    const vistos = new Set<string>();
    for (const p of polis) {
      for (const [x, y] of p) {
        const k = `${x},${y}`;
        expect(vistos.has(k)).toBe(false);
        vistos.add(k);
      }
    }
    // La holgura es mínima: ningún vértice se aleja más de 0,005 módulos
    // de la grilla (el punto de partida de un trazado puede estar en
    // medio de un tramo recto y moverse en un solo eje).
    for (const p of polis) {
      for (const [x, y] of p) {
        expect(Math.abs(x - Math.round(x))).toBeLessThanOrEqual(HOLGURA_SVG_MODULOS + 1e-9);
        expect(Math.abs(y - Math.round(y))).toBeLessThanOrEqual(HOLGURA_SVG_MODULOS + 1e-9);
      }
    }
  });

  it("el margen silencioso del SVG queda vacío: ningún vértice entra en los 4 módulos del borde", () => {
    const d = qrSvg(URL_PRUEBA, 80, "QR").match(/ d="([^"]+)"/)![1];
    const t = matriz.total;
    for (const p of poligonos(d)) {
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(MARGEN_MODULOS);
        expect(y).toBeGreaterThanOrEqual(MARGEN_MODULOS);
        expect(x).toBeLessThanOrEqual(t - MARGEN_MODULOS);
        expect(y).toBeLessThanOrEqual(t - MARGEN_MODULOS);
      }
    }
  });

  function leerStl(buf: Buffer) {
    const n = buf.readUInt32LE(80);
    expect(buf.length).toBe(84 + n * 50);
    const tris: number[][][] = [];
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12;
      const v: number[][] = [];
      for (let k = 0; k < 3; k++) v.push([buf.readFloatLE(o + k * 12), buf.readFloatLE(o + k * 12 + 4), buf.readFloatLE(o + k * 12 + 8)]);
      tris.push(v);
    }
    return tris;
  }
  const volumen = (tris: number[][][]) =>
    tris.reduce((acc, [a, b, c]) => acc + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
  const oscuros = matriz.oscuro.flat().filter(Boolean).length;

  it("STL en relieve: volumen de la base más los módulos oscuros, malla cerrada", () => {
    const tris = leerStl(qrStl(URL_PRUEBA, { ladoMm: 80, baseMm: 2, relieveMm: 1, modo: "relieve" }));
    const m = 80 / matriz.total;
    expect(volumen(tris)).toBeCloseTo(80 * 80 * 2 + oscuros * m * m * 1, 0);
    // Cerrada: cada arista dirigida tiene su inversa.
    const clave = (p: number[]) => p.map((v) => v.toFixed(3)).join(",");
    const aristas = new Map<string, number>();
    for (const t of tris) {
      for (let i = 0; i < 3; i++) {
        const k = `${clave(t[i])}>${clave(t[(i + 1) % 3])}`;
        aristas.set(k, (aristas.get(k) ?? 0) + 1);
      }
    }
    for (const [k, n] of aristas) {
      const [a, b] = k.split(">");
      expect(aristas.get(`${b}>${a}`)).toBe(n);
    }
  });

  it("STL grabado: la capa superior ocupa los módulos claros", () => {
    const tris = leerStl(qrStl(URL_PRUEBA, { ladoMm: 80, baseMm: 2, relieveMm: 1, modo: "grabado" }));
    const m = 80 / matriz.total;
    const claros = matriz.total * matriz.total - oscuros;
    expect(volumen(tris)).toBeCloseTo(80 * 80 * 2 + claros * m * m * 1, 0);
  });
});
