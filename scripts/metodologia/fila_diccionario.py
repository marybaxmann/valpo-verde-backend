"""Fila real de un campo en la hoja DICCIONARIO_CAMPOS del Excel maestro.

Uso: python -I scripts/metodologia/fila_diccionario.py "docs/excel/Base de Datos Valpo Verde.xlsx" <campo> [hoja]

D-n se cita como la fila de la hoja DICCIONARIO_CAMPOS en el .xlsx (encabezado
en la fila 1; D-2 es la primera fila de datos), nunca la línea del CSV
exportado por exportar_excel.py: ese CSV usa comillas y saltos de línea dentro
de una celda (campo "Validación y dependencias", el más largo), así que una
fila de la hoja puede ocupar varias líneas físicas del CSV — la numeración se
desfasa a partir de la primera celda con salto de línea.

Busca por el valor exacto de la columna "Campo" (sin distinguir mayúsculas),
opcionalmente filtrado por "Hoja" cuando el nombre de campo se repite en más
de una hoja (p. ej. id_arbol en ARBOLES y en REGISTRO_EVALUACION). Imprime
cada coincidencia como "D-<fila>  <Hoja>.<Campo>". No modifica el Excel.
"""
import sys
import openpyxl

src = sys.argv[1]
campo_buscado = sys.argv[2].strip().lower()
hoja_filtro = sys.argv[3].strip().upper() if len(sys.argv) > 3 else None

wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
ws = wb["DICCIONARIO_CAMPOS"]

encontrados = []
for fila, row in enumerate(ws.iter_rows(values_only=True), start=1):
    if fila == 1:
        continue
    hoja, campo = row[0], row[1]
    if campo is None:
        continue
    if str(campo).strip().lower() != campo_buscado:
        continue
    if hoja_filtro and str(hoja).strip().upper() != hoja_filtro:
        continue
    encontrados.append((fila, hoja, campo))

if not encontrados:
    sys.exit(f"Sin coincidencias para campo={campo_buscado!r} hoja={hoja_filtro!r}")

for fila, hoja, campo in encontrados:
    print(f"D-{fila}  {hoja}.{campo}")
