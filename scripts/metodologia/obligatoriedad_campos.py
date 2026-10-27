"""Tabla de completitud para finalizar una inspección (CC-056), generada
desde DICCIONARIO_CAMPOS del Excel maestro.

Uso: python scripts/metodologia/obligatoriedad_campos.py "docs/excel/Base de Datos Valpo Verde.xlsx" [salida.ts]

Sin `salida.ts` imprime el TypeScript generado; con `salida.ts` lo escribe
(destino previsto: src/schemas/sivu/completitudInspeccion.ts). Requiere
openpyxl. No modifica el Excel.

Lee, para cada fila de las hojas ARBOLES y REGISTRO_EVALUACION, las
columnas "¿Quién lo ingresa?" (D), "Unidad / valores" (H), "Tipo de
obligatoriedad" (I) y "Condición de activación" (K), y clasifica el campo:

  - EXIGIDO: se exige para finalizar cuando su condición de activación se
    cumple (CC-056 puntos 2 y 3). Para ARBOLES el origen sale de la
    columna D: "Inspector / Usuario Municipal" puede venir de lo vigente;
    el resto tiene que estar registrado en esta inspección.
  - NO EXIGIDO: lo asigna o calcula el Sistema, es Opcional, o es parte
    del ajuste posterior al cálculo (con su motivo).

Reglas automáticas (sin traducción a mano):
  - D = "Sistema", "Sistema / Administrador Plataforma" o
    "Sistema / usuario autorizado" -> no exigido (asignado por el Sistema);
  - I = "Opcional" -> no exigido;
  - I = "Obligatorio" con K vacía -> siempre exigido;
  - I = "Condicional" con K de la forma "[Se activa cuando ]campo = Etiqueta"
    (o varias unidas por " o ") -> exigido cuando se cumple.

La etiqueta de una condición se traduce al valor guardado según el
dominio del campo que la activa: "Sí / No" es un dominio base, no un
catálogo (PR-021) -> booleano; si no, el código vigente de su catálogo en
src/services/rules/engine/catalogs.ts (CATALOGO_DE_CAMPO abajo). La
generación FALLA si una etiqueta no tiene código, si el campo que la
activa no tiene dominio conocido, o si una fila no encaja en ninguna
regla automática ni en TRADUCCIONES_CC056.

TRADUCCIONES_CC056: las condiciones en prosa y las categorías mixtas,
con la traducción aprobada por la responsable (CC-056, 2026-10-26).
Cada una guarda el texto de la columna K para el que se aprobó: si el
Excel cambia ese texto, la generación falla hasta revisar la traducción.

ADICIONES_CC056: campos que no tienen fila propia en el diccionario pero
que la metodología exige (superficie_alcorque_m2_manual, D-125 "Irregular
-> ingreso manual").
"""
import json
import os
import re
import sys

import openpyxl

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RUTA_CATALOGOS = os.path.join(RAIZ, "src", "services", "rules", "engine", "catalogs.ts")

HOJAS = ("ARBOLES", "REGISTRO_EVALUACION")

D_SOLO_SISTEMA = {"Sistema", "Sistema / Administrador Plataforma", "Sistema / usuario autorizado"}

# Campo que activa una condición -> catálogo de catalogs.ts cuando su
# dominio no es "Sí / No".
CATALOGO_DE_CAMPO = {
    "cavidad_basal_interna": "resultado_cavidad_interna",
    "cavidad_interna_tronco": "resultado_cavidad_interna",
    "afectacion_fisura_grieta": "afectacion_grieta",
    "forma_alcorque": "forma_alcorque",
    "red_subterranea_presente": "si_no_no_determinado",
    "compromete_funcionalidad_red_subterranea": "si_no_no_determinado",
    "tipo_infraestructura_vertical": "tipo_infraestructura_vertical",
    "tipo_tutorado": "tipo_tutorado",
}

# Columnas de la BD (trees / tree_data_versions) que no son campos del
# diccionario pero que usan las traducciones de copa y de "responder".
MARCAS_BD = ("copa_no_presenta", "altura_primera_rama_no_presenta", "altura_base_copa_viva_no_presenta")

SIEMPRE = {"op": "siempre"}


def igual(campo, valor):
    return {"op": "igual", "campo": campo, "valor": valor}


def no_verdadero(campo):
    return {"op": "no_verdadero", "campo": campo}


def y(*conds):
    return {"op": "y", "condiciones": list(conds)}


def o(*conds):
    return {"op": "o", "condiciones": list(conds)}


EXISTE_COPA = no_verdadero("copa_no_presenta")

# (hoja, campo) -> traducción aprobada. "k" es el texto de la columna K
# para el que se aprobó; "i", el de la columna I. Si "exigido" es False,
# "motivo" explica por qué no se exige.
TRADUCCIONES_CC056 = {
    # --- ARBOLES ---
    ("ARBOLES", "fecha_registro"): {
        "i": "Obligatorio", "k": "", "exigido": False,
        "motivo": "Lo asigna el Sistema al dar el alta del árbol (CC-056)."},
    ("ARBOLES", "registrado_por"): {
        "i": "Obligatorio", "k": "", "exigido": False,
        "motivo": "Lo asigna el Sistema al dar el alta del árbol (CC-056)."},
    ("ARBOLES", "sector"): {
        "i": "Obligatorio", "k": "Al registrar la ubicación del árbol.", "exigido": True,
        "activacion": SIEMPRE, "nota": "La columna K describe el momento, no una condición."},
    ("ARBOLES", "ubicacion_descriptiva"): {
        "i": "Obligatorio", "k": "Al registrar la ubicación del árbol.", "exigido": True,
        "activacion": SIEMPRE, "nota": "La columna K describe el momento, no una condición."},
    ("ARBOLES", "especie_cientifica"): {
        "i": "Obligatorio", "k": "Al registrar o confirmar la identificación del árbol.", "exigido": True,
        "activacion": SIEMPRE,
        "nota": "La columna K describe el momento. D-13: sin «Género sp.» ni «No determinado», "
                "sobre el valor que quede; solo en EI/R/L (interpretación de la responsable, CC-056)."},
    ("ARBOLES", "nombre_comun"): {
        "i": "Obligatorio", "k": "Al registrar la identificación del árbol.", "exigido": True,
        "activacion": SIEMPRE, "nota": "La columna K describe el momento, no una condición."},
    ("ARBOLES", "dap_cm"): {
        "i": "Obligatorio", "k": "", "exigido": True,
        "activacion": igual("multifustal", False),
        "nota": "D-18: con multifustal = No se ingresa a mano; con multifustal = Sí lo calcula "
                "la plataforma desde dap_fustes_cm y no se pide al Inspector."},
    ("ARBOLES", "diametro_copa_ns_m"): {
        "i": "Obligatorio cuando existe copa",
        "k": "Durante el levantamiento o actualización de las dimensiones de copa mediante OT.",
        "exigido": True, "activacion": EXISTE_COPA,
        "nota": "«Existe copa» = copa_no_presenta distinto de verdadero; la columna K describe el momento."},
    ("ARBOLES", "diametro_copa_eo_m"): {
        "i": "Obligatorio cuando existe copa",
        "k": "Durante el levantamiento o actualización de las dimensiones de copa mediante OT.",
        "exigido": True, "activacion": EXISTE_COPA,
        "nota": "«Existe copa» = copa_no_presenta distinto de verdadero; la columna K describe el momento."},
    ("ARBOLES", "diametro_copa_m"): {
        "i": "Condicional", "k": "Ambas mediciones de copa disponibles.", "exigido": False,
        "motivo": "Lo calcula el Sistema (D = Sistema)."},
    ("ARBOLES", "altura_primera_rama_m"): {
        "i": "Obligatorio responder para completar la evaluación",
        "k": "Cuando el árbol presenta una primera rama principal viva identificable.",
        "exigido": True, "activacion": SIEMPRE, "exigencia": "valor_o_marca",
        "marca": "altura_primera_rama_no_presenta",
        "nota": "«Responder» = valor o altura_primera_rama_no_presenta = verdadero."},
    ("ARBOLES", "altura_base_copa_viva_m"): {
        "i": "Obligatorio responder para completar la evaluación",
        "k": "Cuando el árbol presenta copa viva.",
        "exigido": True, "activacion": SIEMPRE, "exigencia": "valor_o_marca",
        "marca": "altura_base_copa_viva_no_presenta",
        "nota": "«Responder» = valor o altura_base_copa_viva_no_presenta = verdadero."},
    ("ARBOLES", "fotografias_arbol"): {
        "i": "Obligatorio para finalizar la Evaluación inicial, la Reevaluación y el Levantamiento",
        "k": "En la inspección de Evaluación inicial, Reevaluación o Levantamiento mediante OT. "
             "No aplica en la Evaluación instrumental; en el Monitoreo no es obligatoria.",
        "exigido": True, "activacion": SIEMPRE, "exigencia": "fotos_d27",
        "nota": "D-27: las cuatro vistas (árbol completo, base, tronco y copa), fotos nuevas de esta inspección."},
    # --- REGISTRO_EVALUACION ---
    ("REGISTRO_EVALUACION", "direccion_inclinacion"): {
        "i": "Condicional", "k": "angulo_inclinacion > 15°", "exigido": True,
        "activacion": {"op": "mayor_que", "campo": "angulo_inclinacion", "valor": 15},
        "nota": "angulo_inclinacion es decimal, en grados."},
    ("REGISTRO_EVALUACION", "profundidad_grieta_cm"): {
        "i": "Condicional / Opcional", "k": "afectacion_fisura_grieta = Penetra en madera", "exigido": False,
        "motivo": "«Condicional / Opcional» se trata como Opcional (CC-056)."},
    ("REGISTRO_EVALUACION", "ancho_apertura_cm"): {
        "i": "Condicional / Opcional", "k": "afectacion_fisura_grieta = Penetra en madera", "exigido": False,
        "motivo": "«Condicional / Opcional» se trata como Opcional (CC-056)."},
    ("REGISTRO_EVALUACION", "copa_faltante_pct"): {
        "i": "Obligatorio cuando existe copa evaluable", "k": "Cuando existe copa evaluable.",
        "exigido": True, "activacion": EXISTE_COPA,
        "nota": "«Existe copa evaluable» = copa_no_presenta distinto de verdadero."},
    ("REGISTRO_EVALUACION", "muerte_regresiva_copa_pct"): {
        "i": "Obligatorio cuando existe copa evaluable", "k": "Cuando existe copa evaluable.",
        "exigido": True, "activacion": EXISTE_COPA,
        "nota": "«Existe copa evaluable» = copa_no_presenta distinto de verdadero."},
    ("REGISTRO_EVALUACION", "exposicion_luminica_copa_cle"): {
        "i": "Obligatorio cuando existe copa viva evaluable", "k": "Cuando existe copa viva evaluable.",
        "exigido": True,
        "activacion": y(EXISTE_COPA, no_verdadero("altura_base_copa_viva_no_presenta")),
        "nota": "«Copa viva evaluable» = copa_no_presenta y altura_base_copa_viva_no_presenta distintos de verdadero."},
    ("REGISTRO_EVALUACION", "observaciones_infraestructura"): {
        "i": "Condicional",
        "k": "Cuando se selecciona más de un tipo en tipo_infraestructura_vertical, tipo_red_aerea o "
             "tipo_red_subterranea, cuando una condición registrada como Sí involucra varios elementos, "
             "o cuando compromete_funcionalidad_red_subterranea = No determinado.",
        "exigido": True,
        "activacion": o(
            {"op": "mas_de_un_valor", "campo": "tipo_infraestructura_vertical"},
            {"op": "mas_de_un_valor", "campo": "tipo_red_aerea"},
            {"op": "mas_de_un_valor", "campo": "tipo_red_subterranea"},
            ("ETIQUETA", "compromete_funcionalidad_red_subterranea", "No determinado"),
        ),
        "nota": "El caso «una condición registrada como Sí involucra varios elementos» no se verifica: "
                "no se puede deducir de los datos (CC-056)."},
    ("REGISTRO_EVALUACION", "presenta_tutorado"): {
        "i": "Condicional", "k": "dap_cm menor a 10 cm", "exigido": True,
        "activacion": {"op": "menor_que", "campo": "dap_cm", "valor": 10},
        "nota": "Con el dap_cm que quede (en un multifustal, el DAP equivalente calculado, D-18). "
                "Sin dap_cm no se activa."},
    ("REGISTRO_EVALUACION", "clasificacion_vitalidad"): {
        "i": "Obligatorio en los casos con metodología aplicable", "k": "En cada evaluación de vitalidad.",
        "exigido": True, "activacion": SIEMPRE,
        "nota": "Se exige en EI/R/L y en Monitoreo Vitalidad, también en palmeras (CC-056); la nota "
                "de D-169 sobre palmeras queda como revisión futura, sin efecto en la completitud."},
    ("REGISTRO_EVALUACION", "clasificacion_infraestructura"): {
        "i": "Obligatorio", "k": "", "exigido": False,
        "motivo": "Salida calculada; el ajuste del Inspector se valida en /finalizar (D-173)."},
    ("REGISTRO_EVALUACION", "clasificacion_riesgo"): {
        "i": "Obligatorio", "k": "", "exigido": False,
        "motivo": "Salida calculada; el ajuste del Inspector se valida en /finalizar (D-173)."},
    ("REGISTRO_EVALUACION", "clasificacion_prioridad"): {
        "i": "Obligatorio", "k": "", "exigido": False,
        "motivo": "Salida calculada; el ajuste del Inspector se valida en /finalizar (D-173)."},
    ("REGISTRO_EVALUACION", "justificacion_ajuste_clasificacion"): {
        "i": "Condicional",
        "k": "Cuando clasificacion_riesgo, clasificacion_infraestructura o clasificacion_prioridad "
             "difiere del valor calculado por la plataforma.",
        "exigido": False,
        "motivo": "Parte de los ajustes de /finalizar (D-173), no del borrador."},
}

# Campos sin fila propia en el diccionario. "base" es la fila cuyo texto
# respalda la adición; "j_contiene", el texto que tiene que seguir ahí.
ADICIONES_CC056 = [
    {
        "hoja": "REGISTRO_EVALUACION", "campo": "superficie_alcorque_m2_manual",
        "base": ("REGISTRO_EVALUACION", "superficie_alcorque_m2"), "j_contiene": "Irregular → ingreso manual",
        "activacion": y(igual("existe_alcorque", True), ("ETIQUETA", "forma_alcorque", "Irregular")),
        "nota": "D-125: con forma Irregular la superficie se ingresa a mano (CC-056; corrige el alcance del borrador, #58).",
    },
]


def texto(v):
    return "" if v is None else str(v).replace("\r\n", "\n").strip()


def leer_catalogos():
    with open(RUTA_CATALOGOS, encoding="utf-8") as f:
        fuente = f.read()
    patron = re.compile(
        r'\{\s*catalogo:\s*"([^"]+)",\s*codigo:\s*"([^"]+)",\s*etiqueta:\s*"([^"]+)"[^}]*estado:\s*"([^"]+)"'
    )
    catalogos = {}
    for catalogo, codigo, etiqueta, estado in patron.findall(fuente):
        if estado == "vigente":
            catalogos.setdefault(catalogo, {})[etiqueta] = codigo
    return catalogos


class ErrorGeneracion(Exception):
    pass


def main():
    src = sys.argv[1]
    salida = sys.argv[2] if len(sys.argv) > 2 else None

    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb["DICCIONARIO_CAMPOS"]
    catalogos = leer_catalogos()

    filas = []
    for fila, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if fila == 1 or row[0] not in HOJAS or row[1] is None:
            continue
        filas.append({
            "fila": fila, "hoja": row[0], "campo": texto(row[1]),
            "d": texto(row[3]), "h": texto(row[7]), "i": texto(row[8]),
            "j": texto(row[9]), "k": texto(row[10]),
            "tipoDato": texto(row[6]), "unidadValores": texto(row[7]),
        })
    por_campo = {}
    for f in filas:
        por_campo.setdefault(f["campo"], f)

    errores = []

    def valor_de(campo, etiqueta, contexto):
        """Etiqueta del Excel -> valor guardado, según el dominio del campo que activa."""
        disparador = por_campo.get(campo)
        if disparador is None:
            raise ErrorGeneracion(f"{contexto}: el campo «{campo}» de la condición no está en el diccionario")
        if disparador["h"] == "Sí / No":
            if etiqueta == "Sí":
                return True
            if etiqueta == "No":
                return False
            raise ErrorGeneracion(f"{contexto}: «{etiqueta}» no es Sí ni No (dominio de {campo}: Sí / No)")
        catalogo = CATALOGO_DE_CAMPO.get(campo)
        if catalogo is None:
            raise ErrorGeneracion(
                f"{contexto}: «{campo}» no tiene dominio Sí / No ni catálogo asignado "
                f"(dominio del Excel: {disparador['h']!r})")
        codigos = catalogos.get(catalogo)
        if codigos is None:
            raise ErrorGeneracion(
                f"{contexto}: el catálogo «{catalogo}» de {campo} no existe en catalogs.ts "
                f"(dominio del Excel: {disparador['h']!r})")
        if etiqueta not in codigos:
            raise ErrorGeneracion(
                f"{contexto}: la etiqueta «{etiqueta}» no tiene código vigente en el catálogo «{catalogo}»")
        return codigos[etiqueta]

    def resolver(cond, contexto):
        """Reemplaza los ("ETIQUETA", campo, etiqueta) de una traducción por su valor."""
        if isinstance(cond, tuple):
            _, campo, etiqueta = cond
            return igual(campo, valor_de(campo, etiqueta, contexto))
        if cond["op"] in ("y", "o"):
            return {"op": cond["op"], "condiciones": [resolver(c, contexto) for c in cond["condiciones"]]}
        return cond

    def condicion_simple(k, contexto):
        cuerpo = k[len("Se activa cuando "):] if k.startswith("Se activa cuando ") else k
        partes = cuerpo.split(" o ")
        conds = []
        for parte in partes:
            m = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*) = (.+)", parte.strip())
            if not m:
                raise ErrorGeneracion(f"{contexto}: condición sin traducción aprobada: {k!r}")
            conds.append(igual(m.group(1), valor_de(m.group(1), m.group(2).strip(), contexto)))
        return conds[0] if len(conds) == 1 else o(*conds)

    exigidos, no_exigidos = [], []
    usados = set()
    for f in filas:
        clave = (f["hoja"], f["campo"])
        contexto = f"D-{f['fila']} {f['hoja']}.{f['campo']}"
        base = {
            "fila": f["fila"], "hoja": f["hoja"], "campo": f["campo"],
            "quienIngresa": f["d"], "obligatoriedadExcel": f["i"], "condicionExcel": f["k"],
        }
        origen = "vigente_o_registrado" if f["d"] == "Inspector / Usuario Municipal" else "registrado"
        try:
            if clave in TRADUCCIONES_CC056:
                t = TRADUCCIONES_CC056[clave]
                usados.add(clave)
                if t["i"] != f["i"] or t["k"] != f["k"]:
                    raise ErrorGeneracion(
                        f"{contexto}: el Excel cambió desde la traducción aprobada "
                        f"(I={f['i']!r}, K={f['k']!r}; aprobada para I={t['i']!r}, K={t['k']!r})")
                if not t["exigido"]:
                    no_exigidos.append({**base, "motivo": t["motivo"]})
                    continue
                regla = {**base, "exigencia": t.get("exigencia", "valor"), "origen": origen,
                         "activacion": resolver(t["activacion"], contexto), "traduccion": "cc056",
                         "nota": t["nota"]}
                if "marca" in t:
                    regla["marca"] = t["marca"]
                exigidos.append(regla)
            elif f["d"].strip() in D_SOLO_SISTEMA:
                no_exigidos.append({**base, "motivo": "Lo asigna o calcula el Sistema."})
            elif f["i"] == "Opcional":
                no_exigidos.append({**base, "motivo": "Opcional."})
            elif f["i"] == "Obligatorio" and f["k"] == "":
                exigidos.append({**base, "exigencia": "valor", "origen": origen,
                                 "activacion": SIEMPRE, "traduccion": "automatica"})
            elif f["i"] == "Condicional" and f["k"] != "":
                exigidos.append({**base, "exigencia": "valor", "origen": origen,
                                 "activacion": condicion_simple(f["k"], contexto), "traduccion": "automatica"})
            else:
                raise ErrorGeneracion(
                    f"{contexto}: sin regla automática ni traducción aprobada (D={f['d']!r}, I={f['i']!r}, K={f['k']!r})")
        except ErrorGeneracion as e:
            errores.append(str(e))

    sobrantes = set(TRADUCCIONES_CC056) - usados
    for hoja, campo in sorted(sobrantes):
        errores.append(f"{hoja}.{campo}: tiene traducción aprobada pero ya no está en el diccionario")

    for a in ADICIONES_CC056:
        contexto = f"adición {a['hoja']}.{a['campo']}"
        fb = next((f for f in filas if (f["hoja"], f["campo"]) == a["base"]), None)
        if fb is None or a["j_contiene"] not in fb["j"]:
            errores.append(f"{contexto}: la fila base {a['base']} ya no dice {a['j_contiene']!r}")
            continue
        try:
            exigidos.append({
                "fila": fb["fila"], "hoja": a["hoja"], "campo": a["campo"],
                "quienIngresa": "Inspector", "obligatoriedadExcel": fb["i"], "condicionExcel": fb["k"],
                "exigencia": "valor", "origen": "registrado",
                "activacion": resolver(a["activacion"], contexto), "traduccion": "cc056", "nota": a["nota"],
            })
        except ErrorGeneracion as e:
            errores.append(str(e))

    if errores:
        print("ERROR: no se genera la tabla de completitud.", file=sys.stderr)
        for e in errores:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)

    ts = generar_ts(exigidos, no_exigidos, filas)
    if salida:
        with open(salida, "w", encoding="utf-8", newline="\n") as f:
            f.write(ts)
        print(f"{len(exigidos)} reglas de completitud y {len(no_exigidos)} campos no exigidos -> {salida}")
    else:
        sys.stdout.write(ts)


def js(v):
    return json.dumps(v, ensure_ascii=False)


def entrada(r):
    """Una entrada por bloque, una clave por línea; `activacion` en una sola línea."""
    cuerpo = ",\n".join(f"    {k}: {js(v)}" for k, v in r.items())
    return "  {\n" + cuerpo + ",\n  },"


def generar_ts(exigidos, no_exigidos, filas):
    lineas = [
        "// GENERADO por scripts/metodologia/obligatoriedad_campos.py desde DICCIONARIO_CAMPOS",
        "// (columnas D, I y K de ARBOLES y REGISTRO_EVALUACION) y las traducciones aprobadas",
        "// en CC-056. No editar a mano: corregir el script o el Excel y volver a generar.",
        "// tests/schemas/sivu/completitudInspeccion.test.ts compara esta tabla contra el Excel.",
        "",
        "/**",
        " * Condición de activación de un campo (CC-056). `igual` sobre un campo de",
        " * selección múltiple (arreglo) se cumple si el arreglo incluye el valor.",
        " * `no_verdadero`: el valor es distinto de `true` (incluye vacío).",
        " * `mas_de_un_valor`: arreglo con más de un elemento.",
        " */",
        "export type CondicionActivacion =",
        '  | { op: "siempre" }',
        '  | { op: "igual"; campo: string; valor: boolean | string }',
        '  | { op: "no_verdadero"; campo: string }',
        '  | { op: "mayor_que"; campo: string; valor: number }',
        '  | { op: "menor_que"; campo: string; valor: number }',
        '  | { op: "mas_de_un_valor"; campo: string }',
        '  | { op: "y" | "o"; condiciones: CondicionActivacion[] };',
        "",
        "export interface ReglaCompletitud {",
        "  /** Fila de DICCIONARIO_CAMPOS (D-n). En una adición, la fila que la respalda. */",
        "  fila: number;",
        '  hoja: "ARBOLES" | "REGISTRO_EVALUACION";',
        "  campo: string;",
        "  /** Columnas D, I y K del Excel, tal cual. */",
        "  quienIngresa: string;",
        "  obligatoriedadExcel: string;",
        "  condicionExcel: string;",
        "  /** `valor`: con valor; `valor_o_marca`: con valor o `marca` = true; `fotos_d27`: las cuatro vistas. */",
        '  exigencia: "valor" | "valor_o_marca" | "fotos_d27";',
        "  marca?: string;",
        "  /** ARBOLES: «Inspector / Usuario Municipal» puede venir de lo vigente (CC-056 punto 3). */",
        '  origen: "vigente_o_registrado" | "registrado";',
        "  activacion: CondicionActivacion;",
        '  traduccion: "automatica" | "cc056";',
        "  nota?: string;",
        "}",
        "",
        "export interface CampoNoExigido {",
        "  fila: number;",
        '  hoja: "ARBOLES" | "REGISTRO_EVALUACION";',
        "  campo: string;",
        "  quienIngresa: string;",
        "  obligatoriedadExcel: string;",
        "  condicionExcel: string;",
        "  motivo: string;",
        "}",
        "",
        f"export const MARCAS_BD = {js(list(MARCAS_BD))} as const;",
        "",
        "export const REGLAS_COMPLETITUD: readonly ReglaCompletitud[] = [",
    ]
    for r in exigidos:
        lineas.append(entrada(r))
    lineas += ["];", "", "export const CAMPOS_NO_EXIGIDOS: readonly CampoNoExigido[] = ["]
    for r in no_exigidos:
        lineas.append(entrada(r))
    lineas += ["];", ""]
    lineas += ["/** Metadatos literales de DICCIONARIO_CAMPOS, columnas G y H. */", "export const METADATOS_DICCIONARIO: readonly { hoja: string; campo: string; tipoDato: string; unidadValores: string }[] = ["]
    for f in filas:
        lineas.append(entrada({k: f[k] for k in ("hoja", "campo", "tipoDato", "unidadValores")}))
    lineas += ["] as const;", ""]
    return "\n".join(lineas)


if __name__ == "__main__":
    main()
