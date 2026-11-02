import PDFDocument from "pdfkit";
// pdfkit carga sus fuentes estándar con `require("#standard-fonts/…")`, un
// alias de su package.json que el empaquetado de Vercel no sigue: sin estas
// importaciones explícitas, las fuentes quedan fuera del despliegue y el PDF
// responde 500 (solo en Vercel; en local funciona). Son las tres que usa
// la placa: Helvetica (por defecto), Helvetica-Bold y Helvetica-Oblique.
import "pdfkit/standard-fonts/Helvetica";
import "pdfkit/standard-fonts/HelveticaBold";
import "pdfkit/standard-fonts/HelveticaOblique";
import QRCode from "qrcode";
import { env } from "../../config/env";
import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectRole } from "../authorization.service";
import { listarArbolesParaPlacas } from "../../repositories/sivu/conecta.repository";

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
  if (!env.CONECTA_URL_BASE) {
    throw new AppError("Falta configurar la dirección pública de Conecta (CONECTA_URL_BASE) en el servidor", 503);
  }
  const arboles = await listarArbolesParaPlacas(token, projectId);
  if (arboles.length === 0) {
    throw new AppError("El proyecto no tiene árboles activos para generar placas", 404);
  }
  const base = env.CONECTA_URL_BASE.replace(/\/+$/, "");

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

/**
 * El QR como cuadrados vectoriales (sin pasar por una imagen PNG):
 * nítido al imprimir a cualquier tamaño. Con un módulo de margen
 * blanco alrededor.
 */
function dibujarQr(doc: PDFKit.PDFDocument, texto: string, x: number, y: number, lado: number): void {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const paso = lado / (n + 2);
  doc.save().fillColor("#000000");
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (modules.get(fila, col)) doc.rect(x + (col + 1) * paso, y + (fila + 1) * paso, paso, paso);
    }
  }
  doc.fill().restore();
}
