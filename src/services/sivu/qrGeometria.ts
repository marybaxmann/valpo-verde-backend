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
 *
 * `holgura` (en módulos, por defecto 0) mete todo el contorno hacia
 * dentro de lo oscuro. Con 0, dos módulos en diagonal comparten un
 * vértice y, al extruirlos, una arista: OpenSCAD/CGAL rechaza esa malla
 * («The given mesh is not closed») al unirla con la placa. Con una
 * holgura mínima quedan separados por 2 × holgura y cada polígono es
 * cerrado y simple. El PDF usa 0: en papel no importa.
 */
export function contornoModulos({ total, oscuro }: MatrizQr, holgura = 0): string {
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
    // Cada vértice guarda la dirección con que se llega y con que se sale.
    const puntos: Array<{ x: number; y: number; ex: number; ey: number; sx: number; sy: number }> = [];
    let [, , x, y] = inicio;
    let dx = inicio[2] - inicio[0];
    let dy = inicio[3] - inicio[1];
    puntos.push({ x: inicio[0], y: inicio[1], ex: 0, ey: 0, sx: dx, sy: dy });
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
      if (ndx !== dx || ndy !== dy) puntos.push({ x, y, ex: dx, ey: dy, sx: ndx, sy: ndy });
      dx = ndx;
      dy = ndy;
      x = siguiente[2];
      y = siguiente[3];
    }
    // Al cerrar, se llega al primer vértice con la última dirección.
    puntos[0].ex = dx;
    puntos[0].ey = dy;

    // Lo oscuro queda a la derecha de cada arista: normal interior
    // (-dy, dx) con el eje Y hacia abajo. En una esquina se suman las
    // dos normales, en un tramo recto basta una.
    const desplazado = puntos.map((p) => {
      if (holgura === 0) return [p.x, p.y];
      const recto = p.ex === p.sx && p.ey === p.sy;
      const nx = -p.ey + (recto ? 0 : -p.sy);
      const ny = p.ex + (recto ? 0 : p.sx);
      return [p.x + holgura * nx, p.y + holgura * ny];
    });
    const num = (v: number) => String(Math.round(v * 1e4) / 1e4);
    let d = `M${num(desplazado[0][0])} ${num(desplazado[0][1])}`;
    for (let i = 1; i < desplazado.length; i++) {
      d += puntos[i].y === puntos[i - 1].y ? `H${num(desplazado[i][0])}` : `V${num(desplazado[i][1])}`;
    }
    trazos.push(`${d}Z`);
  }
  return trazos.join("");
}

/**
 * SVG del QR para impresión 3D: **solo** la geometría de los módulos
 * oscuros, en un único trazado `modulos` de polígonos cerrados. No lleva
 * fondo, rectángulo blanco ni ninguna otra forma: OpenSCAD (`import()`)
 * y los demás programas de modelado convierten en sólido toda forma
 * rellena, así que un fondo se extruiría como una losa encima del QR.
 *
 * El margen silencioso de 4 módulos queda como espacio vacío: el
 * `viewBox` (y el ancho y alto en mm) incluye el margen, pero ningún
 * trazado entra en él. Al imprimir en papel, el fondo lo pone la hoja.
 *
 * Los módulos llevan una holgura de `HOLGURA_SVG_MODULOS` por lado
 * (0,5 % del módulo, ~0,009 mm en una placa de 80 mm): imperceptible e
 * irrelevante para el escaneo, y evita que dos módulos en diagonal se
 * toquen (ver `contornoModulos`).
 */
export const HOLGURA_SVG_MODULOS = 0.005;

export function qrSvg(texto: string, ladoMm: number, titulo: string): string {
  const matriz = matrizQr(texto);
  const t = matriz.total;
  const tituloSeguro = titulo.replace(/[<>&"']/g, "");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ladoMm}mm" height="${ladoMm}mm" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges">` +
    `<title>${tituloSeguro}</title>` +
    `<path id="modulos" fill="#000000" fill-rule="nonzero" d="${contornoModulos(matriz, HOLGURA_SVG_MODULOS)}"/>` +
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
