"""Campos de REGISTRO_EVALUACION que el Inspector ingresa en una inspección
(alcance de "evaluación completa": Evaluación inicial, Reevaluación y
Levantamiento, CC-040 punto 1), leídos directamente del .xlsx.

Uso: python -I scripts/metodologia/campos_evaluacion_completa.py "docs/excel/Base de Datos Valpo Verde.xlsx"

Filtra la hoja DICCIONARIO_CAMPOS por Hoja = REGISTRO_EVALUACION y columna
"¿Quién lo ingresa?" (columna D) igual a "Inspector" (coincidencia exacta,
sin combinar con Sistema ni con otro rol) — ese filtro ya excluye:
  - los 16 campos "Calculado por plataforma" (quien_ingresa = Sistema;
    p. ej. SL_basal_pct, R_radio_basal_cm, t_R_basal y sus pares de tronco):
    no son datos que el Inspector ingrese, el motor los calcula al finalizar;
  - id_inspeccion / id_arbol (quien_ingresa = "Sistema / usuario autorizado"):
    son campos de vinculación (ya resueltos por `work_order_id`/`tree_id`/
    `inspection_id`), no datos de la evaluación;
  - clasificacion_riesgo / clasificacion_infraestructura / clasificacion_prioridad
    (quien_ingresa = "Sistema / Inspector"): son SALIDAS calculadas que el
    Inspector puede ajustar después de calcular (#59/#72) — nunca algo que
    se envíe como dato crudo en el borrador Preguardado.

Excluye además, a mano (EXCLUSIONES_MANUALES abajo, con su motivo), los
campos que SÍ quedan como "Inspector" puro en el filtro anterior pero que
igual no son datos crudos del borrador:
  - justificacion_ajuste_clasificacion: "Condicional" solo "cuando
    clasificacion_riesgo/infraestructura/prioridad difiere del valor
    calculado" (D-173) — es parte del AJUSTE posterior al cálculo, no del
    guardado Preguardado antes de que exista ningún valor calculado.

No modifica el Excel. La salida, en orden de fila, es la lista que debe
coincidir con `CAMPOS_EVALUACION_COMPLETA` en
`src/schemas/sivu/alcanceInspeccion.ts` — ver el test que compara ambas.
"""
import sys
import openpyxl

EXCLUSIONES_MANUALES = {
    "justificacion_ajuste_clasificacion": (
        "Condicional solo cuando una clasificación difiere del valor "
        "calculado (D-173) -- es parte del ajuste posterior al cálculo "
        "(#59/#72), no del guardado Preguardado."
    ),
}

src = sys.argv[1]
wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
ws = wb["DICCIONARIO_CAMPOS"]

campos = []
for fila, row in enumerate(ws.iter_rows(values_only=True), start=1):
    if fila == 1:
        continue
    hoja, campo, _origen, quien_ingresa = row[0], row[1], row[2], row[3]
    if hoja != "REGISTRO_EVALUACION" or campo is None:
        continue
    if (quien_ingresa or "").strip() != "Inspector":
        continue
    if campo in EXCLUSIONES_MANUALES:
        continue
    campos.append((fila, campo))

print(f"-- {len(campos)} campos (REGISTRO_EVALUACION, quien_ingresa = Inspector, sin exclusiones manuales) --")
for fila, campo in campos:
    print(f"D-{fila}  {campo}")
