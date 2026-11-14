import QRCode from "qrcode";

/**
 * Geometría del QR de las placas de Conecta, pensada para imprimir o
 * modelar en 3D: solo módulos cuadrados sobre una grilla regular, sin
 * redondeos, degradados ni adornos. El contenido del QR no cambia: sigue
 * siendo la dirección pública de la ficha por `qr_token` (CC-062).
 *
 * - Margen silencioso de 4 módulos (el mínimo del estándar ISO/IEC 18004).
 * - Corrección de errores Q (~25 %): tolera mejor el desgaste, las
 *   imperfecciones de impresión y las sombras del relieve que el nivel M.
 */

export const MARGEN_MODULOS = 4;
export const NIVEL_CORRECCION = "Q" as const;

export interface MatrizQr {
  /** Módulos por lado, con el margen silencioso incluido. */
  total: number;
  /** `true` = módulo oscuro. Indexado [fila][columna], margen incluido. */
  oscuro: boolean[][];
}

export function matrizQr(texto: string): MatrizQr {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: NIVEL_CORRECCION });
  const n = modules.size;
  const total = n + MARGEN_MODULOS * 2;
  const oscuro: boolean[][] = Array.from({ length: total }, () => new Array<boolean>(total).fill(false));
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(f, c)) oscuro[f + MARGEN_MODULOS][c + MARGEN_MODULOS] = true;
    }
  }
  return { total, oscuro };
}

/**
 * Contorno de los módulos oscuros como un único trazado SVG (en unidades
 * de módulo): los módulos vecinos se funden en polígonos cerrados, sin
 * aristas internas, y los huecos quedan con el sentido contrario (regla
 * nonzero). Dos módulos que solo se tocan por una esquina quedan como
 * polígonos separados. Es la forma que se extruye directamente en
 * Blender, Fusion, Tinkercad u OpenSCAD.
 */
export function contornoModulos({ total, oscuro }: MatrizQr): string {
  // Aristas de cada módulo en sentido horario (y hacia abajo); las que
  // comparten dos módulos oscuros se anulan entre sí.
  const aristas = new Map<string, [number, number, number, number]>();
  const agregar = (x1: number, y1: number, x2: number, y2: number) => {
    const inversa = `${x2},${y2},${x1},${y1}`;
    if (aristas.has(inversa)) aristas.delete(inversa);
    else aristas.set(`${x1},${y1},${x2},${y2}`, [x1, y1, x2, y2]);
  };
  for (let y = 0; y < total; y++) {
    for (let x = 0; x < total; x++) {
      if (!oscuro[y][x]) continue;
      agregar(x, y, x + 1, y);
      agregar(x + 1, y, x + 1, y + 1);
      agregar(x + 1, y + 1, x, y + 1);
      agregar(x, y + 1, x, y);
    }
  }

  const salientes = new Map<string, Array<[number, number, number, number]>>();
  for (const a of aristas.values()) {
    const k = `${a[0]},${a[1]}`;
    const lista = salientes.get(k);
    if (lista) lista.push(a);
    else salientes.set(k, [a]);
  }
  const quitar = (a: [number, number, number, number]) => {
    const k = `${a[0]},${a[1]}`;
    const lista = salientes.get(k)!;
    lista.splice(lista.indexOf(a), 1);
    if (lista.length === 0) salientes.delete(k);
  };

  const trazos: string[] = [];
  while (salientes.size > 0) {
    const inicio = salientes.values().next().value![0];
    quitar(inicio);
    const puntos: Array<[number, number]> = [[inicio[0], inicio[1]]];
    let [, , x, y] = inicio;
    let dx = inicio[2] - inicio[0];
    let dy = inicio[3] - inicio[1];
    while (x !== inicio[0] || y !== inicio[1]) {
      const opciones = salientes.get(`${x},${y}`)!;
      // En un vértice con dos salidas (módulos que se tocan en diagonal)
      // se gira a la derecha: el contorno no cruza al otro módulo.
      const preferencia: Array<[number, number]> = [[-dy, dx], [dx, dy], [dy, -dx]];
      let siguiente = opciones[0];
      for (const [px, py] of preferencia) {
        const hallada = opciones.find((o) => o[2] - o[0] === px && o[3] - o[1] === py);
        if (hallada) {
          siguiente = hallada;
          break;
        }
      }
      quitar(siguiente);
      const ndx = siguiente[2] - siguiente[0];
      const ndy = siguiente[3] - siguiente[1];
      if (ndx !== dx || ndy !== dy) puntos.push([x, y]);
      dx = ndx;
      dy = ndy;
      x = siguiente[2];
      y = siguiente[3];
    }
    let d = `M${puntos[0][0]} ${puntos[0][1]}`;
    for (let i = 1; i < puntos.length; i++) {
      d += puntos[i][1] === puntos[i - 1][1] ? `H${puntos[i][0]}` : `V${puntos[i][1]}`;
    }
    trazos.push(`${d}Z`);
  }
  return trazos.join("");
}

/**
 * SVG del QR con dos piezas con nombre, listas para separar al modelar:
 * `placa` (el cuadrado blanco completo, margen incluido) y `modulos`
 * (un solo trazado negro). Medidas reales en milímetros.
 */
export function qrSvg(texto: string, ladoMm: number, titulo: string): string {
  const matriz = matrizQr(texto);
  const t = matriz.total;
  const tituloSeguro = titulo.replace(/[<>&"']/g, "");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ladoMm}mm" height="${ladoMm}mm" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges">` +
    `<title>${tituloSeguro}</title>` +
    `<rect id="placa" width="${t}" height="${t}" fill="#ffffff"/>` +
    `<path id="modulos" fill="#000000" fill-rule="nonzero" d="${contornoModulos(matriz)}"/>` +
    `</svg>\n`
  );
}

export interface OpcionesStl {
  /** Lado de la placa en mm, margen silencioso incluido. */
  ladoMm: number;
  /** Espesor de la placa base en mm. */
  baseMm: number;
  /** Altura del relieve (o profundidad del grabado) en mm. */
  relieveMm: number;
  /** `relieve`: módulos oscuros elevados; `grabado`: hundidos en la placa. */
  modo: "relieve" | "grabado";
}

/**
 * STL binario de la placa: una base de `baseMm` y, encima, una capa de
 * `relieveMm` que ocupa los módulos oscuros (relieve) o todo lo demás
 * (grabado). Se arma como superficie de vóxeles: solo se emiten las caras
 * entre lleno y vacío, así la malla es cerrada y sin caras internas.
 * Origen en la esquina de la placa; el eje Y queda hacia arriba para que
 * el QR no salga espejado.
 */
export function qrStl(texto: string, opciones: OpcionesStl): Buffer {
  const { total: t, oscuro } = matrizQr(texto);
  const m = opciones.ladoMm / t;
  const zCapa = [0, opciones.baseMm, opciones.baseMm + opciones.relieveMm];
  const lleno = (x: number, y: number, z: number): boolean => {
    if (x < 0 || y < 0 || x >= t || y >= t || z < 0 || z > 1) return false;
    if (z === 0) return true;
    return opciones.modo === "relieve" ? oscuro[y][x] : !oscuro[y][x];
  };
  // Coordenadas del mundo: X = columna, Y = fila invertida, Z = capa.
  const px = (x: number) => x * m;
  const py = (y: number) => (t - y) * m;

  const triangulos: number[][] = [];
  const quad = (n: [number, number, number], a: number[], b: number[], c: number[], d: number[]) => {
    triangulos.push([...n, ...a, ...b, ...c], [...n, ...a, ...c, ...d]);
  };
  for (let z = 0; z <= 1; z++) {
    const z0 = zCapa[z];
    const z1 = zCapa[z + 1];
    for (let y = 0; y < t; y++) {
      for (let x = 0; x < t; x++) {
        if (!lleno(x, y, z)) continue;
        const x0 = px(x), x1 = px(x + 1), y0 = py(y + 1), y1 = py(y);
        // Vértices en sentido antihorario visto desde fuera.
        if (!lleno(x, y, z + 1)) quad([0, 0, 1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
        if (!lleno(x, y, z - 1)) quad([0, 0, -1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
        if (!lleno(x - 1, y, z)) quad([-1, 0, 0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
        if (!lleno(x + 1, y, z)) quad([1, 0, 0], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
        // Fila y-1 está "arriba" (Y mayor); fila y+1, "abajo".
        if (!lleno(x, y - 1, z)) quad([0, 1, 0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
        if (!lleno(x, y + 1, z)) quad([0, -1, 0], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
      }
    }
  }

  const buf = Buffer.alloc(84 + triangulos.length * 50);
  buf.write("SIVU placa QR (Valpo Verde Conecta)", 0, "ascii");
  buf.writeUInt32LE(triangulos.length, 80);
  let o = 84;
  for (const tri of triangulos) {
    for (const v of tri) {
      buf.writeFloatLE(v, o);
      o += 4;
    }
    o += 2; // atributo, en cero
  }
  return buf;
}
