import { readFileSync } from "fs";
import { join } from "path";

/**
 * Parser RFC4180 mínimo para los CSV de docs/excel/export (admite
 * comillas, comas y saltos de línea dentro de una celda). Solo para
 * tests: el motor no lee el Excel mientras funciona (PR-021).
 */
export function leerExportCsv(nombreArchivo: string): string[][] {
  const ruta = join(__dirname, "..", "..", "..", "..", "..", "docs", "excel", "export", nombreArchivo);
  const texto = readFileSync(ruta, "utf-8");
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          dentroComillas = false;
        }
      } else {
        celda += c;
      }
    } else if (c === '"') {
      dentroComillas = true;
    } else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n") {
      if (celda.endsWith("\r")) celda = celda.slice(0, -1);
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += c;
    }
  }
  if (celda.length > 0 || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}
