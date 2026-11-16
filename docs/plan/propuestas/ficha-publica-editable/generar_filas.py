"""Genera las filas propuestas de DICCIONARIO_CAMPOS (12 columnas) en CSV y Markdown.

Uso: python -I gen_filas.py <carpeta_destino>
No lee ni modifica el Excel.
"""
import csv
import sys
from pathlib import Path

COLS = [
    "Hoja", "Campo", "Origen", "¿Quién lo ingresa?", "¿Cómo se obtiene?",
    "Definiciones o criterios aplicables:", "Tipo de dato", "Unidad / valores",
    "Tipo de obligatoriedad", "Fórmula / regla de cálculo", "Condición de activación",
    "Validación y dependencias",
]

UM_ADM = "Usuario municipal / Administrador"
CAT = "CATALOGO_ESPECIES"
FP = "FICHAS_PUBLICAS"
SIN_ESPECIE = ("Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, "
               "la ficha pública no muestra el bloque; no se reemplaza por un texto genérico.")
NO_TECNICO = ("Contenido de divulgación ciudadana: no participa en ninguna regla, indicador ni clasificación, "
              "y no modifica los datos botánicos del catálogo (D-257 a D-262), que mantiene el Inspector (CC-053).")

R = []

def fila(hoja, campo, origen, quien, como, defin, tipo, unidad, oblig, formula, activ, valid):
    R.append([hoja, campo, origen, quien, como, defin, tipo, unidad, oblig, formula, activ, valid])

# ---------------------------------------------------------------- CATALOGO_ESPECIES
fila(CAT, "nombre_comun_visualizacion", "Manual", UM_ADM,
     "Ingreso en el contenido ciudadano de la especie.",
     "Nombre común con que la especie se presenta en la ficha pública de Valpo Verde Conecta. Es una denominación de visualización ciudadana, no una nomenclatura oficial, y no reemplaza a ARBOLES.nombre_comun (D-14).",
     "Texto", "Hasta 60 caracteres", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "No vacío si se informa. La ficha pública muestra, en este orden: nombre_comun_visualizacion de la especie del árbol; si no existe, ARBOLES.nombre_comun (D-14); si tampoco existe, «Un árbol de Valparaíso». Editarlo no modifica D-14 en ningún árbol. " + NO_TECNICO)

fila(CAT, "articulo_nombre", "Manual", UM_ADM,
     "Selección en el contenido ciudadano de la especie.",
     "Artículo gramatical que acompaña a nombre_comun_visualizacion en los textos de la ficha (por ejemplo, «el Ginkgo», «la Araucaria brasileña»).",
     "Categoría", "El / La", "Condicional", "No aplica.",
     "Cuando nombre_comun_visualizacion tiene valor.",
     "Obligatorio si nombre_comun_visualizacion tiene valor; vacío en caso contrario.")

fila(CAT, "curiosidad_especie", "Manual", UM_ADM,
     "Redacción a partir de fuentes botánicas o históricas identificables.",
     "Dato breve y llamativo, propio de la especie, que encabeza la ficha pública. Estilo mixto (primera persona y botánica clara). No repite información genérica válida para cualquier árbol.",
     "Texto", "Hasta 200 caracteres", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Debe tener al menos una fuente asociada en fuentes_contenido_especie (bloque Curiosidad). " + SIN_ESPECIE + " Un árbol puede reemplazarlo con textos_personalizados (FICHAS_PUBLICAS).")

fila(CAT, "aportes_especie", "Manual", UM_ADM,
     "Selección del ícono e ingreso del título de cada aporte.",
     "Beneficios de la especie presentados de forma visual: cada aporte es un ícono y un título corto. Sin cuantificaciones ambientales que no tengan una metodología validada.",
     "Lista estructurada (ícono, título)",
     "Hasta 2 aportes. Ícono: Sombra / Frescor / Aves / Polinizadores / Flores / Siempreverde / Hito / Generaciones. Título: hasta 40 caracteres.",
     "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Cada aporte requiere ícono y título. No repetir el mismo ícono en una especie. El listado de íconos se agrega a LISTAS. " + SIN_ESPECIE)

fila(CAT, "quien_soy_especie", "Manual", UM_ADM,
     "Redacción a partir de fuentes botánicas identificables.",
     "Presentación breve de la especie: de dónde viene y un rasgo que la distingue.",
     "Texto", "Hasta 160 caracteres", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Debe ser coherente con origen_biogeografico (D-260): no presentar como nativa una especie Introducida. " + SIN_ESPECIE)

fila(CAT, "rasgos_reconocimiento", "Manual", UM_ADM,
     "Ingreso de la etiqueta y el texto de cada rasgo y carga opcional de su fotografía.",
     "Características que permiten reconocer la especie en terreno (hoja, flor, fruto, semilla, corteza, silueta), cada una con una etiqueta, un texto breve y, si existe, una fotografía de reconocimiento.",
     "Lista estructurada (etiqueta, texto, fotografía, crédito)",
     "Hasta 3 rasgos. Etiqueta: hasta 20 caracteres. Texto: hasta 120 caracteres. Fotografía: JPG, PNG o WebP. Crédito (autor y licencia): hasta 120 caracteres.",
     "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Cada rasgo requiere etiqueta y texto; la fotografía es opcional (sin fotografía, la ficha muestra «Foto próximamente»). Si hay fotografía, el crédito con autor y licencia es obligatorio; las fotografías propias del levantamiento se acreditan «Valpo Verde, levantamiento 2026-10-01». No se usan fotografías con marca de agua ni sin permiso de uso. La fotografía se guarda sin metadatos (EXIF, GPS ni datos de cámara) y en un almacenamiento público distinto del de las fotografías técnicas (D-27). No se usan fotografías de inspección para cumplir este campo.")

fila(CAT, "anio_estacional", "Manual", UM_ADM,
     "Redacción a partir de fuentes botánicas identificables.",
     "Cambios visibles de la especie en cada estación del año en Valparaíso (hemisferio sur): primavera, verano, otoño e invierno.",
     "Lista estructurada (estación, texto)", "Primavera / Verano / Otoño / Invierno. Texto: hasta 80 caracteres por estación.",
     "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Si se informa, debe completarse para las cuatro estaciones. Excluyente con ciclo_especie: una especie usa uno de los dos. Coherente con persistencia_follaje (D-261): una especie Perennifolia no se describe sin hojas.")

fila(CAT, "ciclo_especie", "Manual", UM_ADM,
     "Redacción a partir de fuentes botánicas identificables.",
     "Ciclo propio de la especie que reemplaza a anio_estacional cuando las estaciones no son lo más característico (por ejemplo, la maduración de la piña de la araucaria).",
     "Lista estructurada (título, pasos: etiqueta y texto)",
     "Título: hasta 30 caracteres. De 2 a 4 pasos; etiqueta: hasta 20 caracteres; texto: hasta 60 caracteres.",
     "Opcional", "No aplica.",
     "Cuando anio_estacional no tiene valor.",
     "Excluyente con anio_estacional. Cada paso requiere etiqueta y texto.")

fila(CAT, "historia_especie", "Manual", UM_ADM,
     "Redacción a partir de fuentes botánicas, históricas o culturales identificables.",
     "Antecedentes generales de la especie: origen de su nombre, historia, usos culturales o curiosidades botánicas. Es compartida por todos los ejemplares de la especie y es distinta de historia_ejemplar (FICHAS_PUBLICAS).",
     "Texto", "Hasta 300 caracteres", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Debe tener al menos una fuente asociada en fuentes_contenido_especie (bloque Historia de la especie). No incluir antecedentes de un ejemplar en particular: esos van en historia_ejemplar. " + SIN_ESPECIE)

fila(CAT, "consejo_cuidado", "Manual", UM_ADM,
     "Redacción a partir de fuentes de arboricultura identificables.",
     "Recomendación breve para que la ciudadanía cuide la especie o se relacione con ella de forma segura.",
     "Texto", "Hasta 160 caracteres", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "No indicar a la ciudadanía que pode, riegue con productos ni intervenga el árbol: las intervenciones se hacen mediante OT. " + SIN_ESPECIE + " Un árbol puede reemplazarlo con textos_personalizados.")

fila(CAT, "fuentes_contenido_especie", "Manual", UM_ADM,
     "Registro de la referencia consultada para cada bloque de contenido ciudadano.",
     "Fuentes que respaldan el contenido ciudadano de la especie, cada una asociada a uno o más bloques que respalda y al tema que sustenta. Se guardan en el sistema y no se citan en el cuerpo de la ficha; como máximo, la ficha ofrece un enlace discreto «Fuentes».",
     "Lista estructurada (bloques, tema, referencia, enlace)",
     "Bloques: uno o más de Curiosidad / Aportes / Quién soy / Reconóceme / Mi año / Historia de la especie / Consejo / General. Tema: hasta 120 caracteres. Referencia: hasta 300 caracteres, una obra por fuente. Enlace: URL opcional.",
     "Condicional", "No aplica.",
     "Cuando curiosidad_especie o historia_especie tienen valor.",
     "Curiosidad e Historia de la especie requieren al menos una fuente de su bloque. Las fuentes se registran por bloque; el bloque General se usa solo para una fuente que no respalda un bloque claro (decisión de Mari, 2026-11-16), y una fuente General no cuenta como fuente de Curiosidad ni de Historia de la especie. Cada fuente es una obra que respalda un tema, con todos los bloques donde aparece ese tema; si la misma obra respalda varios temas, se registra una vez por tema. El enlace, si se informa, debe ser una URL https válida.")

fila(CAT, "foto_referencial_especie", "Manual", UM_ADM,
     "Carga de una fotografía representativa de la especie.",
     "Fotografía general de la especie que la ficha pública usa como imagen principal solo mientras el ejemplar no tiene foto_publica_arbol. Se rotula «Foto referencial de la especie».",
     "Archivo de imagen", "Una fotografía. JPG, PNG o WebP.", "Opcional", "No aplica.",
     "Al completar o actualizar el contenido ciudadano de la especie.",
     "Se guarda sin metadatos (EXIF, GPS ni datos de cámara), en un almacenamiento público distinto del de las fotografías técnicas (D-27). Imagen principal de la ficha, en este orden: foto_publica_arbol; si no existe, foto_referencial_especie rotulada como referencial; si tampoco existe, «Fotografía no disponible». Requiere credito_foto_referencial.")

fila(CAT, "credito_foto_referencial", "Manual", UM_ADM,
     "Ingreso del autor y la licencia de la fotografía referencial.",
     "Autoría y licencia de foto_referencial_especie.",
     "Texto", "Hasta 120 caracteres", "Condicional", "No aplica.",
     "Cuando foto_referencial_especie tiene valor.",
     "Obligatorio si existe foto_referencial_especie: autor y licencia (decisión de Mari, 2026-11-16). No usar fotografías con marca de agua ni sin permiso de uso, salvo una fotografía de terceros cargada como temporal (foto_referencial_temporal = Sí), que se acredita «Foto de terceros, uso referencial temporal».")

fila(CAT, "foto_referencial_temporal", "Manual", UM_ADM,
     "Marca al cargar o reemplazar la fotografía referencial.",
     "Indica que foto_referencial_especie es una fotografía de terceros de uso referencial temporal, que debe reemplazarse por una fotografía oficial de SIVU (propia, con autor y licencia, sin marca de agua y sin datos de ubicación). No es la fotografía oficial de la especie.",
     "Categoría", "Sí / No", "Condicional",
     "Valor inicial: No.",
     "Cuando foto_referencial_especie tiene valor.",
     "Si es Sí, credito_foto_referencial = «Foto de terceros, uso referencial temporal» y la fotografía puede tener marca de agua; la ficha la sigue rotulando «Foto referencial de la especie». Vuelve a No al reemplazarla por una fotografía oficial. Excepción aprobada por Mari el 2026-11-16 para la fotografía actual del olmo (CC-073). Antes de dar por terminado Valpo Verde Conecta (retirar «Prototipo»), ninguna especie puede tener este campo en Sí.")

fila(CAT, "contenido_editado_por", "Vinculado por plataforma", "Sistema",
     "Usuario autenticado que guarda el contenido ciudadano de la especie.",
     "Último usuario que modificó el contenido ciudadano de la especie (los campos de esta hoja posteriores a tipo_hoja).",
     "Identificador (texto)", "No aplica", "Condicional", "No aplica.",
     "Al guardar el contenido ciudadano de la especie.",
     "Referencia válida a USUARIOS con Rol = Usuario municipal o Administrador y activo = Sí. No editable manualmente. Editar los datos botánicos del Inspector (D-257 a D-262) no lo modifica.")

fila(CAT, "fecha_edicion_contenido", "Generado por plataforma", "Sistema",
     "Fecha y hora del guardado, registradas por el sistema.",
     "Fecha de la última modificación del contenido ciudadano de la especie.",
     "Fecha", "dd/mm/aaaa hh:mm", "Condicional", "No aplica.",
     "Al guardar el contenido ciudadano de la especie.",
     "No editable manualmente. Hora de Chile. El contenido se publica al guardar, sin borrador, aprobación ni versionado (decisión P3).")

# ---------------------------------------------------------------- FICHAS_PUBLICAS
fila(FP, "id_arbol", "Vinculado por plataforma", "Sistema",
     "Vinculación al árbol cuya ficha pública se personaliza.",
     "Identificador del árbol al que corresponde la personalización de su ficha pública.",
     "Identificador (texto)", "No aplica", "Obligatorio", "No aplica.",
     "Al guardar por primera vez la ficha pública de un árbol.",
     "Referencia válida a ARBOLES.id_arbol. Una única fila por árbol. Si el árbol no tiene fila en FICHAS_PUBLICAS, su ficha pública muestra solo el contenido de la especie y ningún dato del ejemplar. No se publica id_arbol: la ficha se identifica por el código QR, nunca por el identificador del árbol (CC-062).")

for campo, dn, nombre in [
    ("mostrar_clase_edad", "D-25", "clase_edad"),
    ("mostrar_altura_total", "D-19", "altura_total_m"),
    ("mostrar_dap", "D-18", "dap_cm"),
    ("mostrar_diametro_copa", "D-22", "diametro_copa_m"),
    ("mostrar_rango_edad", "D-26", "rango_edad_estimada_anios"),
]:
    fila(FP, campo, "Manual", UM_ADM,
         "Activación o desactivación en la ficha pública del árbol.",
         f"Indica si la ficha pública muestra el valor vigente de ARBOLES.{nombre} ({dn}) del ejemplar.",
         "Categoría", "Sí / No", "Obligatorio",
         "Valor inicial: No (decisión de Valej, 2026-11-16).",
         "Al guardar la ficha pública del árbol.",
         f"El valor mostrado sale exclusivamente del inventario ({dn}, valor vigente); no se escribe desde la ficha. Si {nombre} no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. "
         + ("Se rotula como estimación (D-26: origen Estimado)." if dn == "D-26"
            else "Se rotula como clasificación del Inspector." if dn == "D-25"
            else "Se rotula «medida en terreno o estimada con escala»: el inventario no registra cuál de las dos se usó en cada árbol y no se agrega un campo de método (decisión de Valej, 2026-11-16)."))

fila(FP, "historia_ejemplar", "Manual", UM_ADM,
     "Redacción a partir de antecedentes del ejemplar.",
     "«Mi historia»: antecedentes históricos, culturales, patrimoniales o curiosidades particulares de este árbol. Es distinta de historia_especie (CATALOGO_ESPECIES) y no la repite.",
     "Texto", "Hasta 1.000 caracteres", "Opcional", "No aplica.",
     "Al guardar la ficha pública del árbol.",
     "Si está vacío, la sección «Mi historia» no se muestra. No presentar relatos inventados como hechos comprobados. Si incluye una afirmación histórica concreta, debe registrarse fuente_historia_ejemplar (decisión de la responsable, 2026-11-14); el sistema no lo exige al guardar y el formulario lo recuerda.")

fila(FP, "fuente_historia_ejemplar", "Manual", UM_ADM,
     "Registro de la fuente identificable de los antecedentes del ejemplar.",
     "Fuente que respalda historia_ejemplar: documentación municipal, publicaciones, archivos históricos, información institucional u otra fuente identificable.",
     "Texto", "Hasta 300 caracteres", "Opcional", "No aplica.",
     "Cuando historia_ejemplar tiene valor.",
     "Solo admite valor si historia_ejemplar tiene valor. Obligatoria en el criterio de la responsable cuando el texto contiene una afirmación histórica concreta; el sistema no puede verificarlo y no la exige al guardar. La ficha la muestra solo cuando existe.")

fila(FP, "foto_publica_arbol", "Manual", UM_ADM,
     "Carga de una fotografía del ejemplar para la ficha pública.",
     "Fotografía pública del ejemplar que identifica el QR. Es la imagen principal de su ficha. Es independiente de fotografias_arbol (D-27), que son registro técnico de la inspección.",
     "Archivo de imagen", "Una fotografía. JPG, PNG o WebP.", "Opcional", "No aplica.",
     "Al guardar la ficha pública del árbol.",
     "Se guarda sin metadatos (EXIF, GPS ni datos de cámara), en un almacenamiento público distinto del de las fotografías técnicas. No se reutilizan fotografías de D-27. Sin personas identificables ni patentes. Al reemplazarla o quitarla se elimina el archivo anterior. Si no existe, la ficha usa foto_referencial_especie (rotulada como referencial).")

fila(FP, "textos_personalizados", "Manual", UM_ADM,
     "Ingreso del texto propio del ejemplar para un bloque de la ficha.",
     "Textos que reemplazan, solo en la ficha de este árbol, el bloque correspondiente del contenido de la especie. Lo que no se personaliza se toma de CATALOGO_ESPECIES.",
     "Lista estructurada (bloque, texto, fuente)",
     "Bloque: Curiosidad / Quién soy / Consejo. Texto: el mismo límite del campo de la especie que reemplaza. Fuente: hasta 200 caracteres.",
     "Opcional", "No aplica.",
     "Al guardar la ficha pública del árbol.",
     "Un único texto por bloque. Si el texto queda vacío, se vuelve a mostrar el de la especie. Curiosidad requiere fuente. No se personalizan los rasgos de reconocimiento, el año ni la historia de la especie, que son botánicos y comunes a todos sus ejemplares.")

fila(FP, "editado_por", "Vinculado por plataforma", "Sistema",
     "Usuario autenticado que guarda la ficha pública del árbol.",
     "Último usuario que modificó la ficha pública del árbol.",
     "Identificador (texto)", "No aplica", "Obligatorio", "No aplica.",
     "Al guardar la ficha pública del árbol.",
     "Referencia válida a USUARIOS con Rol = Usuario municipal (miembro del proyecto del árbol) o Administrador, y activo = Sí. No editable manualmente.")

fila(FP, "fecha_edicion", "Generado por plataforma", "Sistema",
     "Fecha y hora del guardado, registradas por el sistema.",
     "Fecha de la última modificación de la ficha pública del árbol.",
     "Fecha", "dd/mm/aaaa hh:mm", "Obligatorio", "No aplica.",
     "Al guardar la ficha pública del árbol.",
     "No editable manualmente. Hora de Chile. Se publica al guardar, sin borrador, aprobación ni versionado (decisión P3).")


def main(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    primera = 280
    assert all(len(r) == 12 for r in R)
    with open(dest / "01-filas-diccionario.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["D-n (provisional)"] + COLS)
        for i, r in enumerate(R):
            w.writerow([f"D-{primera + i}"] + r)

    md = []
    md.append("# Filas propuestas para DICCIONARIO_CAMPOS — ficha pública editable\n")
    md.append("> **Versión para la revisión final de Mari (2026-11-16), con todas las respuestas de Mari y Valej** "
              "(`05-preguntas-para-mari.md`). **No modifica el Excel.** Generado junto con "
              "`01-filas-diccionario.csv` (mismas filas, listo para copiar en las 12 columnas de la hoja). "
              "Origen: decisiones del §1.3 de `docs/relevo/RELEVO_2026-11-15_mari.md` y `RESPUESTAS_FICHA_PUBLICA.md` (P1 a P11).\n")
    md.append("## Estructura vigente verificada\n")
    md.append("Leída del `.xlsx` con openpyxl (no del CSV), rama `feature/fase6-backend-api` en `1ba307e`:\n")
    md.append("- **DICCIONARIO_CAMPOS:** encabezado en la fila 1 y datos de **D-2 a D-279** (278 filas). 12 columnas con nombre: "
              + ", ".join(f"«{c}»" for c in COLS) + ". La columna 13 no tiene encabezado y solo trae una nota suelta en D-63.")
    md.append("- **CATALOGO_ESPECIES:** filas **D-257 a D-262** (`especie_cientifica`, `genero`, `familia`, `origen_biogeografico`, "
              "`persistencia_follaje`, `tipo_hoja`). La hoja CATALOGO_ESPECIES tiene esas seis columnas, sin datos.")
    md.append("- **Datos del ejemplar de P1:** D-18 `dap_cm`, D-19 `altura_total_m`, D-22 `diametro_copa_m`, D-25 `clase_edad`, "
              "D-26 `rango_edad_estimada_anios` (origen «Estimado», opcional por CC-039). D-27 `fotografias_arbol` son las fotos técnicas.")
    md.append("- **No existe** la hoja FICHAS_PUBLICAS ni ningún campo de contenido ciudadano.\n")
    md.append("## Numeración\n")
    md.append(f"- Las filas van **al final** (D-{primera} a D-{primera + len(R) - 1}), como D-268 a D-279, para no renumerar ninguna fila citada. "
              "Por eso las filas de CATALOGO_ESPECIES no quedan junto a D-257 a D-262.")
    md.append("- ⚠ **Los números son provisionales.** CC-068 (densidad de la madera, aprobado como propuesta) también agrega 4 filas a "
              "CATALOGO_ESPECIES que todavía no están en el Excel. Si entran antes, estas filas se corren 4 lugares. "
              "La numeración se ajusta al copiar las filas al Excel y no frena el CC (respuesta de Mari a la pregunta 12). "
              "Hay que verificar la fila real con `scripts/metodologia/fila_diccionario.py` al incorporarlas.\n")
    md.append("## Cambios en otras hojas (también para incorporar con estas filas)\n")
    md.append("- **Hoja nueva `FICHAS_PUBLICAS`:** encabezado de columnas = los campos de FICHAS_PUBLICAS de abajo, en el mismo orden "
              "(como la hoja CATALOGO_ESPECIES). Vinculada a ARBOLES por `id_arbol`.")
    md.append("- **Hoja CATALOGO_ESPECIES:** agregar como columnas los campos nuevos de abajo, después de `tipo_hoja`.")
    md.append("- **LISTAS:** dos listas nuevas: íconos de aporte (Sombra, Frescor, Aves, Polinizadores, Flores, Siempreverde, Hito, Generaciones) "
              "y bloques de contenido (Curiosidad, Aportes, Quién soy, Reconóceme, Mi año, Historia de la especie, Consejo, General). "
              "El Sí/No de los interruptores reutiliza el valor existente.\n")
    md.append("## Criterios usados\n")
    md.append("- **Límites de caracteres:** se fijaron por sobre el texto más largo aprobado en V5 (`contenidoEspecie.ts`): curiosidad 152 → 200; "
              "«quién soy» 79 → 160; consejo 74 → 160; aporte 27 → 40; rasgo 80 → 120; estación 48 → 80; paso de ciclo 32 → 60. "
              "La historia de la especie llega a 300 y «Mi historia» a 1.000 (P2). Aprobados por Mari el 2026-11-16 (pregunta 9).")
    md.append("- **Una fila por campo, también para los compuestos.** Igual que `dap_fustes_cm` (D-17, «Lista de valores numéricos»), los bloques con "
              "varias partes (aportes, rasgos, estaciones, ciclo, fuentes) se declaran como «Lista estructurada» y sus partes en «Unidad / valores».")
    md.append("- **Nada de esto entra en reglas.** Ningún campo participa en REGLAS_INDICADORES ni MATRICES_CALCULO, así que el cambio es PATCH "
              "(§14.10) y no genera `rule_version` nueva.\n")
    md.append("## Filas\n")
    hoja_actual = None
    for i, r in enumerate(R):
        if r[0] != hoja_actual:
            hoja_actual = r[0]
            md.append(f"### {hoja_actual}\n")
        md.append(f"#### D-{primera + i} · `{r[1]}`\n")
        md.append("| Columna | Valor |\n|---|---|")
        for c, v in zip(COLS, r):
            md.append(f"| {c} | {v.replace('|', '/') if v else '—'} |")
        md.append("")
    (dest / "01-filas-diccionario.md").write_text("\n".join(md), encoding="utf-8")
    print(len(R), "filas; D-%d a D-%d" % (primera, primera + len(R) - 1))
    for i, r in enumerate(R):
        print(f"D-{primera + i}", r[0], r[1])


if __name__ == "__main__":
    main(Path(sys.argv[1]))
