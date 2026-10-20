"""Verificación §14.9 (preliminar) del Excel maestro de Valpo Verde.

Uso: python -I scripts/metodologia/verificar_14_9.py "docs/excel/Base de Datos Valpo Verde.xlsx"
Requiere openpyxl.
Solo lectura. Reporta los puntos automatizables de docs/workflow.md §14.9.
"""
import sys, re, unicodedata, collections
import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)

def norm(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[\s_]+", " ", s).strip()

# ---------- DICCIONARIO ----------
dic = wb["DICCIONARIO_CAMPOS"]
hdr = [c.value for c in dic[1]]
DIC = []
for r in dic.iter_rows(min_row=2, values_only=True):
    if r[1]:
        DIC.append(dict(zip(hdr, r)))
campos = {d["Campo"] for d in DIC}
by_campo = collections.defaultdict(list)
for d in DIC:
    by_campo[d["Campo"]].append(d)

# ---------- REGLAS_INDICADORES ----------
ri = list(wb["REGLAS_INDICADORES"].iter_rows(values_only=True))
RH = ri[0]
RI = [dict(zip(RH, r)) for r in ri[1:] if r[0]]
print(f"REGLAS_INDICADORES: {len(RI)} reglas; columnas: {list(RH)}")

hallazgos = []
def H(punto, msg):
    hallazgos.append((punto, msg))

# 1. Campos citados existen en DICCIONARIO
SNAKE = re.compile(r"\b[a-zA-Z]+(?:_[a-zA-Z0-9]+)+\b")
for r in RI:
    for f in re.split(r"[;,]", str(r["Campos de entrada"] or "")):
        f = f.strip()
        if f and f not in campos:
            H("Campos citados", f"{r['ID regla']}: '{f}' no existe en DICCIONARIO_CAMPOS")
mat = wb["MATRICES_CALCULO"]
mat_tokens = set()
for row in mat.iter_rows():
    for c in row:
        if isinstance(c.value, str):
            for tok in SNAKE.findall(c.value):
                mat_tokens.add((tok, c.coordinate))
# Nombres que no son campos del DICCIONARIO (00-index.md, "Convenciones de nombres en MATRICES_CALCULO"):
# hojas del Excel, puntajes P_* y los títulos genéricos _componente / resultado intermedio de M02.
IGNORAR = {"P_I", "P_RC", "P_T", "P_CR", "REGLAS_INDICADORES", "probabilidad_falla_componente",
           "consecuencia_componente", "clasificacion_riesgo_componente", "probabilidad_falla_impacto"}
for tok, coord in sorted(mat_tokens):
    if tok not in campos and tok not in IGNORAR and not re.match(r"^[A-Z]{2}-", tok):
        H("Campos citados", f"MATRICES_CALCULO {coord}: '{tok}' no existe en DICCIONARIO_CAMPOS")

# 2. Campos duplicados en DICCIONARIO (misma hoja + campo)
cnt = collections.Counter((d["Hoja"], d["Campo"]) for d in DIC)
for k, n in cnt.items():
    if n > 1:
        H("DICCIONARIO", f"campo duplicado {k} ({n} filas)")

# 3. max_indicador y máximo de cada agregadora
def num(p):
    try:
        return int(str(p).strip())
    except Exception:
        return None
maxind = collections.OrderedDict()
for r in RI:
    k = (r["Componente"], r["Indicador"])
    v = num(r["Puntaje"])
    if v is not None:
        maxind[k] = max(maxind.get(k, 0), v)
    else:
        maxind.setdefault(k, 0)
print("\nmax_indicador calculado (columna inexistente en el Excel):")
agg = collections.OrderedDict()
for (comp, ind), m in maxind.items():
    print(f"  {comp:22} | {ind:55} | {m}")
    agg[comp] = agg.get(comp, 0) + m
print("\nMáximo por agregadora (suma de max_indicador):")
for comp, m in agg.items():
    print(f"  {comp}: {m}")
ESPERADO = {"R01": 9, "R02": 14, "R03": 8}
for comp, m in agg.items():
    key = comp.split()[0]
    if key in ESPERADO and ESPERADO[key] != m:
        H("Máximos", f"{comp}: suma de max_indicador = {m}; MATRICES/DICCIONARIO dicen {ESPERADO[key]}")

# 4. Rangos de clasificación 0..max sin huecos (texto de MATRICES)
RANGO = re.compile(r"(\d+)\s*[–-]\s*(\d+)\s*=\s*([A-Za-zÁÉÍÓÚáéíóú]+)|(?<![–\d])(\d+)\s*=\s*([A-Za-zÁÉÍÓÚáéíóú]+)")
for row in mat.iter_rows():
    for c in row:
        v = c.value
        if isinstance(v, str) and "Clasificar el puntaje total" in v:
            m = re.search(r"P_(\w+)(?: \(máximo (\d+)\))?", v)
            tramos = []
            for a, b, cat, single, cat2 in RANGO.findall(v.split("como:")[-1]):
                if a:
                    tramos.append((int(a), int(b), cat))
                else:
                    tramos.append((int(single), int(single), cat2))
            tramos.sort()
            ok = tramos and tramos[0][0] == 0 and all(tramos[i][1] + 1 == tramos[i + 1][0] for i in range(len(tramos) - 1))
            print(f"\nRangos {c.coordinate}: {tramos} -> {'sin huecos' if ok else 'HUECO/SOLAPE'}")
            if not ok:
                H("Rangos", f"MATRICES {c.coordinate}: tramos con hueco o solape {tramos}")

# 5. Ninguna salida No determinado / No aplica con puntaje 0
for r in RI:
    cat = norm(r["Categoría parcial"])
    if ("no determinado" in cat or "no aplica" in cat) and num(r["Puntaje"]) == 0:
        H("ND/NA", f"{r['ID regla']}: '{r['Categoría parcial']}' con puntaje 0")

# 6. Estado de las reglas (PR-011 v2.0: estado_regla desde 2.0.0)
# PR-011 v3.0: el Excel no usa columnas estado_regla ni max_indicador; todas las reglas de
# REGLAS_INDICADORES de una versión publicada son vigentes y max_indicador se calcula arriba.

# 7. Catálogos: valores de LISTAS presentes en algún dominio de DICCIONARIO
dominios = " | ".join(norm(d.get("Unidad / valores") or "") + " " + norm(d.get("Validación y dependencias") or "") for d in DIC)
for col in wb["LISTAS"].iter_cols(values_only=True):
    head, vals = col[0], [v for v in col[1:] if v]
    for v in vals:
        if norm(v) not in dominios:
            H("Catálogos", f"LISTAS[{head}]: '{v}' no aparece en ningún dominio de DICCIONARIO_CAMPOS")

# 8. VERSION
ver = list(wb["VERSION"].iter_rows(values_only=True))
print("\nVERSION (última fila):", ver[-1][:5])

print("\n================ HALLAZGOS ================")
if not hallazgos:
    print("Ninguno en los puntos automatizables.")
for p, m in hallazgos:
    print(f"[{p}] {m}")
print(f"\nTotal: {len(hallazgos)}")
