import { MARGEN_MODULOS, contornoModulos, matrizQr, qrStl, qrSvg } from "../../../src/services/sivu/qrGeometria";

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

  it("el SVG mide en milímetros y separa placa y módulos", () => {
    const svg = qrSvg(URL_PRUEBA, 80, "QR A-000421 <prueba>");
    expect(svg).toContain('width="80mm" height="80mm"');
    expect(svg).toContain(`viewBox="0 0 ${matriz.total} ${matriz.total}"`);
    expect(svg).toContain('id="placa"');
    expect(svg).toContain('id="modulos"');
    expect(svg).not.toMatch(/<circle|rx=|gradient/i);
    expect(svg).toContain("<title>QR A-000421 prueba</title>");
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
