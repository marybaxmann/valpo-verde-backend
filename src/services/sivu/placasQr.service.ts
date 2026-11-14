import PDFDocument from "pdfkit";
import { env } from "../../config/env";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectRole } from "../authorization.service";
import { listarArbolesParaPlacas, obtenerArbolParaQr } from "../../repositories/sivu/conecta.repository";
import { QrArbolQuery } from "../../schemas/sivu/conecta.schema";
import { contornoModulos, matrizQr, qrStl, qrSvg } from "./qrGeometria";

/**
 * GET /api/sivu/projects/:id/placas-qr — archivo imprimible de placas
 * (CC-062 punto 2), solo para el Usuario municipal del proyecto. Cada
 * QR lleva a la ficha pública por `qr_token` (nunca el `tree_code`).
 * Una placa por árbol en estado activo, 6 por página A4.
 *
 * El `tree_code` va impreso en letra chica para que quien instala
 * sepa en qué árbol va cada placa; no sirve para abrir la ficha.
 */

const COLUMNAS = 2;
const FILAS = 3;
const MARGEN = 36;

export async function generarPlacasQr(user: AuthenticatedUser, projectId: string, token: string): Promise<Buffer> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], token);
  const base = urlBaseConecta();
  const arboles = await listarArbolesParaPlacas(token, projectId);
  if (arboles.length === 0) {
    throw new AppError("El proyecto no tiene árboles activos para generar placas", 404);
  }

  const doc = new PDFDocument({ size: "A4", margin: MARGEN, info: { Title: "Placas QR — Valpo Verde Conecta" } });
  const partes: Buffer[] = [];
  doc.on("data", (b: Buffer) => partes.push(b));
  const terminado = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  const ancho = (doc.page.width - MARGEN * 2) / COLUMNAS;
  const alto = (doc.page.height - MARGEN * 2) / FILAS;
  const lado = Math.min(ancho, alto) - 90;

  for (let i = 0; i < arboles.length; i++) {
    const a = arboles[i];
    const enPagina = i % (COLUMNAS * FILAS);
    if (i > 0 && enPagina === 0) doc.addPage();
    const x = MARGEN + (enPagina % COLUMNAS) * ancho;
    const y = MARGEN + Math.floor(enPagina / COLUMNAS) * alto;

    doc.save().lineWidth(0.5).dash(3, { space: 3 }).rect(x + 4, y + 4, ancho - 8, alto - 8).stroke().undash().restore();
    doc.font("Helvetica-Bold").fontSize(12).text("Valpo Verde Conecta", x, y + 14, { width: ancho, align: "center" });

    dibujarQr(doc, `${base}/${a.qr_token}`, x + (ancho - lado) / 2, y + 34, lado);

    const nombre = a.nombre_comun ?? a.especie_cientifica ?? "";
    doc.font("Helvetica-Bold").fontSize(11).text(nombre, x + 10, y + 40 + lado, { width: ancho - 20, align: "center" });
    if (a.especie_cientifica && a.nombre_comun) {
      doc.font("Helvetica-Oblique").fontSize(9).text(a.especie_cientifica, x + 10, doc.y + 1, { width: ancho - 20, align: "center" });
    }
    doc.font("Helvetica").fontSize(7).fillColor("#666666").text(a.tree_code, x + 10, y + alto - 22, { width: ancho - 20, align: "right" }).fillColor("#000000");
  }

  doc.end();
  return terminado;
}

function urlBaseConecta(): string {
  if (!env.CONECTA_URL_BASE) {
    throw new AppError("Falta configurar la dirección pública de Conecta (CONECTA_URL_BASE) en el servidor", 503);
  }
  return env.CONECTA_URL_BASE.replace(/\/+$/, "");
}

/**
 * El QR como un único trazado vectorial de módulos cuadrados (el mismo
 * de `qrGeometria`), con margen silencioso de 4 módulos incluido en
 * `lado`: nítido al imprimir a cualquier tamaño.
 */
function dibujarQr(doc: PDFKit.PDFDocument, texto: string, x: number, y: number, lado: number): void {
  const matriz = matrizQr(texto);
  const paso = lado / matriz.total;
  doc.save().translate(x, y).scale(paso).path(contornoModulos(matriz)).fill("#000000").restore();
}

/**
 * GET /api/sivu/projects/:id/trees/:treeId/qr — el QR de un árbol para
 * modelarlo o imprimirlo en 3D, en SVG (placa + módulos) o STL (placa con
 * módulos en relieve o grabados). Mismo destino que la placa del PDF:
 * `${CONECTA_URL_BASE}/${qr_token}`; nunca el `tree_code`. Solo el
 * Usuario municipal (como las placas, CC-062) y solo árboles activos.
 */
export async function generarQrArbol(
  user: AuthenticatedUser,
  projectId: string,
  treeId: string,
  opciones: QrArbolQuery,
  token: string
): Promise<{ archivo: Buffer | string; tipo: string; nombre: string }> {
  await assertProjectRole(user, projectId, ["usuario_municipal"], token);
  const base = urlBaseConecta();
  const arbol = await obtenerArbolParaQr(token, projectId, treeId);
  if (!arbol) throw new AppError("Árbol no encontrado en este proyecto", 404);
  if (arbol.estado_ciclo_vida !== "activo") {
    throw new AppError(`El árbol ${arbol.tree_code} no está activo: no se le genera placa`, 409);
  }
  const url = `${base}/${arbol.qr_token}`;
  const modulo = opciones.lado_mm / matrizQr(url).total;
  if (modulo < 1) {
    throw new AppError(
      `Con lado_mm=${opciones.lado_mm} cada módulo mide ${modulo.toFixed(2)} mm; para que se lea impreso debe medir al menos 1 mm (aumenta lado_mm)`,
      400
    );
  }
  if (opciones.formato === "svg") {
    return { archivo: qrSvg(url, opciones.lado_mm, `QR ${arbol.tree_code} — Valpo Verde Conecta`), tipo: "image/svg+xml", nombre: `qr-${arbol.tree_code}.svg` };
  }
  return {
    archivo: qrStl(url, { ladoMm: opciones.lado_mm, baseMm: opciones.base_mm, relieveMm: opciones.relieve_mm, modo: opciones.modo }),
    tipo: "model/stl",
    nombre: `qr-${arbol.tree_code}-${opciones.modo}.stl`,
  };
}
