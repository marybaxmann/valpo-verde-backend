# Filas propuestas para DICCIONARIO_CAMPOS — ficha pública editable

> **Versión para la revisión final de Mari (2026-11-16), con todas las respuestas de Mari y Valej** (`05-preguntas-para-mari.md`). **No modifica el Excel.** Generado junto con `01-filas-diccionario.csv` (mismas filas, listo para copiar en las 12 columnas de la hoja). Origen: decisiones del §1.3 de `docs/relevo/RELEVO_2026-11-15_mari.md` y `RESPUESTAS_FICHA_PUBLICA.md` (P1 a P11).

## Estructura vigente verificada

Leída del `.xlsx` con openpyxl (no del CSV), rama `feature/fase6-backend-api` en `1ba307e`:

- **DICCIONARIO_CAMPOS:** encabezado en la fila 1 y datos de **D-2 a D-279** (278 filas). 12 columnas con nombre: «Hoja», «Campo», «Origen», «¿Quién lo ingresa?», «¿Cómo se obtiene?», «Definiciones o criterios aplicables:», «Tipo de dato», «Unidad / valores», «Tipo de obligatoriedad», «Fórmula / regla de cálculo», «Condición de activación», «Validación y dependencias». La columna 13 no tiene encabezado y solo trae una nota suelta en D-63.
- **CATALOGO_ESPECIES:** filas **D-257 a D-262** (`especie_cientifica`, `genero`, `familia`, `origen_biogeografico`, `persistencia_follaje`, `tipo_hoja`). La hoja CATALOGO_ESPECIES tiene esas seis columnas, sin datos.
- **Datos del ejemplar de P1:** D-18 `dap_cm`, D-19 `altura_total_m`, D-22 `diametro_copa_m`, D-25 `clase_edad`, D-26 `rango_edad_estimada_anios` (origen «Estimado», opcional por CC-039). D-27 `fotografias_arbol` son las fotos técnicas.
- **No existe** la hoja FICHAS_PUBLICAS ni ningún campo de contenido ciudadano.

## Numeración

- Las filas van **al final** (D-280 a D-307), como D-268 a D-279, para no renumerar ninguna fila citada. Por eso las filas de CATALOGO_ESPECIES no quedan junto a D-257 a D-262.
- ⚠ **Los números son provisionales.** CC-068 (densidad de la madera, aprobado como propuesta) también agrega 4 filas a CATALOGO_ESPECIES que todavía no están en el Excel. Si entran antes, estas filas se corren 4 lugares. La numeración se ajusta al copiar las filas al Excel y no frena el CC (respuesta de Mari a la pregunta 12). Hay que verificar la fila real con `scripts/metodologia/fila_diccionario.py` al incorporarlas.

## Cambios en otras hojas (también para incorporar con estas filas)

- **Hoja nueva `FICHAS_PUBLICAS`:** encabezado de columnas = los campos de FICHAS_PUBLICAS de abajo, en el mismo orden (como la hoja CATALOGO_ESPECIES). Vinculada a ARBOLES por `id_arbol`.
- **Hoja CATALOGO_ESPECIES:** agregar como columnas los campos nuevos de abajo, después de `tipo_hoja`.
- **LISTAS:** dos listas nuevas: íconos de aporte (Sombra, Frescor, Aves, Polinizadores, Flores, Siempreverde, Hito, Generaciones) y bloques de contenido (Curiosidad, Aportes, Quién soy, Reconóceme, Mi año, Historia de la especie, Consejo, General). El Sí/No de los interruptores reutiliza el valor existente.

## Criterios usados

- **Límites de caracteres:** se fijaron por sobre el texto más largo aprobado en V5 (`contenidoEspecie.ts`): curiosidad 152 → 200; «quién soy» 79 → 160; consejo 74 → 160; aporte 27 → 40; rasgo 80 → 120; estación 48 → 80; paso de ciclo 32 → 60. La historia de la especie llega a 300 y «Mi historia» a 1.000 (P2). Aprobados por Mari el 2026-11-16 (pregunta 9).
- **Una fila por campo, también para los compuestos.** Igual que `dap_fustes_cm` (D-17, «Lista de valores numéricos»), los bloques con varias partes (aportes, rasgos, estaciones, ciclo, fuentes) se declaran como «Lista estructurada» y sus partes en «Unidad / valores».
- **Nada de esto entra en reglas.** Ningún campo participa en REGLAS_INDICADORES ni MATRICES_CALCULO, así que el cambio es PATCH (§14.10) y no genera `rule_version` nueva.

## Filas

### CATALOGO_ESPECIES

#### D-280 · `nombre_comun_visualizacion`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | nombre_comun_visualizacion |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Ingreso en el contenido ciudadano de la especie. |
| Definiciones o criterios aplicables: | Nombre común con que la especie se presenta en la ficha pública de Valpo Verde Conecta. Es una denominación de visualización ciudadana, no una nomenclatura oficial, y no reemplaza a ARBOLES.nombre_comun (D-14). |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 60 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | No vacío si se informa. La ficha pública muestra, en este orden: nombre_comun_visualizacion de la especie del árbol; si no existe, ARBOLES.nombre_comun (D-14); si tampoco existe, «Un árbol de Valparaíso». Editarlo no modifica D-14 en ningún árbol. Contenido de divulgación ciudadana: no participa en ninguna regla, indicador ni clasificación, y no modifica los datos botánicos del catálogo (D-257 a D-262), que mantiene el Inspector (CC-053). |

#### D-281 · `articulo_nombre`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | articulo_nombre |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Selección en el contenido ciudadano de la especie. |
| Definiciones o criterios aplicables: | Artículo gramatical que acompaña a nombre_comun_visualizacion en los textos de la ficha (por ejemplo, «el Ginkgo», «la Araucaria brasileña»). |
| Tipo de dato | Categoría |
| Unidad / valores | El / La |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Cuando nombre_comun_visualizacion tiene valor. |
| Validación y dependencias | Obligatorio si nombre_comun_visualizacion tiene valor; vacío en caso contrario. |

#### D-282 · `curiosidad_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | curiosidad_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes botánicas o históricas identificables. |
| Definiciones o criterios aplicables: | Dato breve y llamativo, propio de la especie, que encabeza la ficha pública. Estilo mixto (primera persona y botánica clara). No repite información genérica válida para cualquier árbol. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 200 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Debe tener al menos una fuente asociada en fuentes_contenido_especie (bloque Curiosidad). Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, la ficha pública no muestra el bloque; no se reemplaza por un texto genérico. Un árbol puede reemplazarlo con textos_personalizados (FICHAS_PUBLICAS). |

#### D-283 · `aportes_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | aportes_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Selección del ícono e ingreso del título de cada aporte. |
| Definiciones o criterios aplicables: | Beneficios de la especie presentados de forma visual: cada aporte es un ícono y un título corto. Sin cuantificaciones ambientales que no tengan una metodología validada. |
| Tipo de dato | Lista estructurada (ícono, título) |
| Unidad / valores | Hasta 2 aportes. Ícono: Sombra / Frescor / Aves / Polinizadores / Flores / Siempreverde / Hito / Generaciones. Título: hasta 40 caracteres. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Cada aporte requiere ícono y título. No repetir el mismo ícono en una especie. El listado de íconos se agrega a LISTAS. Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, la ficha pública no muestra el bloque; no se reemplaza por un texto genérico. |

#### D-284 · `quien_soy_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | quien_soy_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes botánicas identificables. |
| Definiciones o criterios aplicables: | Presentación breve de la especie: de dónde viene y un rasgo que la distingue. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 160 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Debe ser coherente con origen_biogeografico (D-260): no presentar como nativa una especie Introducida. Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, la ficha pública no muestra el bloque; no se reemplaza por un texto genérico. |

#### D-285 · `rasgos_reconocimiento`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | rasgos_reconocimiento |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Ingreso de la etiqueta y el texto de cada rasgo y carga opcional de su fotografía. |
| Definiciones o criterios aplicables: | Características que permiten reconocer la especie en terreno (hoja, flor, fruto, semilla, corteza, silueta), cada una con una etiqueta, un texto breve y, si existe, una fotografía de reconocimiento. |
| Tipo de dato | Lista estructurada (etiqueta, texto, fotografía, crédito) |
| Unidad / valores | Hasta 3 rasgos. Etiqueta: hasta 20 caracteres. Texto: hasta 120 caracteres. Fotografía: JPG, PNG o WebP. Crédito (autor y licencia): hasta 120 caracteres. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Cada rasgo requiere etiqueta y texto; la fotografía es opcional (sin fotografía, la ficha muestra «Foto próximamente»). Si hay fotografía, el crédito con autor y licencia es obligatorio; las fotografías propias del levantamiento se acreditan «Valpo Verde, levantamiento 2026-10-01». No se usan fotografías con marca de agua ni sin permiso de uso. La fotografía se guarda sin metadatos (EXIF, GPS ni datos de cámara) y en un almacenamiento público distinto del de las fotografías técnicas (D-27). No se usan fotografías de inspección para cumplir este campo. |

#### D-286 · `anio_estacional`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | anio_estacional |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes botánicas identificables. |
| Definiciones o criterios aplicables: | Cambios visibles de la especie en cada estación del año en Valparaíso (hemisferio sur): primavera, verano, otoño e invierno. |
| Tipo de dato | Lista estructurada (estación, texto) |
| Unidad / valores | Primavera / Verano / Otoño / Invierno. Texto: hasta 80 caracteres por estación. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Si se informa, debe completarse para las cuatro estaciones. Excluyente con ciclo_especie: una especie usa uno de los dos. Coherente con persistencia_follaje (D-261): una especie Perennifolia no se describe sin hojas. |

#### D-287 · `ciclo_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | ciclo_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes botánicas identificables. |
| Definiciones o criterios aplicables: | Ciclo propio de la especie que reemplaza a anio_estacional cuando las estaciones no son lo más característico (por ejemplo, la maduración de la piña de la araucaria). |
| Tipo de dato | Lista estructurada (título, pasos: etiqueta y texto) |
| Unidad / valores | Título: hasta 30 caracteres. De 2 a 4 pasos; etiqueta: hasta 20 caracteres; texto: hasta 60 caracteres. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Cuando anio_estacional no tiene valor. |
| Validación y dependencias | Excluyente con anio_estacional. Cada paso requiere etiqueta y texto. |

#### D-288 · `historia_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | historia_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes botánicas, históricas o culturales identificables. |
| Definiciones o criterios aplicables: | Antecedentes generales de la especie: origen de su nombre, historia, usos culturales o curiosidades botánicas. Es compartida por todos los ejemplares de la especie y es distinta de historia_ejemplar (FICHAS_PUBLICAS). |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 300 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Debe tener al menos una fuente asociada en fuentes_contenido_especie (bloque Historia de la especie). No incluir antecedentes de un ejemplar en particular: esos van en historia_ejemplar. Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, la ficha pública no muestra el bloque; no se reemplaza por un texto genérico. |

#### D-289 · `consejo_cuidado`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | consejo_cuidado |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de fuentes de arboricultura identificables. |
| Definiciones o criterios aplicables: | Recomendación breve para que la ciudadanía cuide la especie o se relacione con ella de forma segura. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 160 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | No indicar a la ciudadanía que pode, riegue con productos ni intervenga el árbol: las intervenciones se hacen mediante OT. Si el árbol no tiene especie_cientifica vigente o la especie no tiene este contenido, la ficha pública no muestra el bloque; no se reemplaza por un texto genérico. Un árbol puede reemplazarlo con textos_personalizados. |

#### D-290 · `fuentes_contenido_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | fuentes_contenido_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Registro de la referencia consultada para cada bloque de contenido ciudadano. |
| Definiciones o criterios aplicables: | Fuentes que respaldan el contenido ciudadano de la especie, cada una asociada a uno o más bloques que respalda y al tema que sustenta. Se guardan en el sistema y no se citan en el cuerpo de la ficha; como máximo, la ficha ofrece un enlace discreto «Fuentes». |
| Tipo de dato | Lista estructurada (bloques, tema, referencia, enlace) |
| Unidad / valores | Bloques: uno o más de Curiosidad / Aportes / Quién soy / Reconóceme / Mi año / Historia de la especie / Consejo / General. Tema: hasta 120 caracteres. Referencia: hasta 300 caracteres, una obra por fuente. Enlace: URL opcional. |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Cuando curiosidad_especie o historia_especie tienen valor. |
| Validación y dependencias | Curiosidad e Historia de la especie requieren al menos una fuente de su bloque. Las fuentes se registran por bloque; el bloque General se usa solo para una fuente que no respalda un bloque claro (decisión de Mari, 2026-11-16), y una fuente General no cuenta como fuente de Curiosidad ni de Historia de la especie. Cada fuente es una obra que respalda un tema, con todos los bloques donde aparece ese tema; si la misma obra respalda varios temas, se registra una vez por tema. El enlace, si se informa, debe ser una URL https válida. |

#### D-291 · `foto_referencial_especie`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | foto_referencial_especie |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Carga de una fotografía representativa de la especie. |
| Definiciones o criterios aplicables: | Fotografía general de la especie que la ficha pública usa como imagen principal solo mientras el ejemplar no tiene foto_publica_arbol. Se rotula «Foto referencial de la especie». |
| Tipo de dato | Archivo de imagen |
| Unidad / valores | Una fotografía. JPG, PNG o WebP. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al completar o actualizar el contenido ciudadano de la especie. |
| Validación y dependencias | Se guarda sin metadatos (EXIF, GPS ni datos de cámara), en un almacenamiento público distinto del de las fotografías técnicas (D-27). Imagen principal de la ficha, en este orden: foto_publica_arbol; si no existe, foto_referencial_especie rotulada como referencial; si tampoco existe, «Fotografía no disponible». Requiere credito_foto_referencial. |

#### D-292 · `credito_foto_referencial`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | credito_foto_referencial |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Ingreso del autor y la licencia de la fotografía referencial. |
| Definiciones o criterios aplicables: | Autoría y licencia de foto_referencial_especie. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 120 caracteres |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Cuando foto_referencial_especie tiene valor. |
| Validación y dependencias | Obligatorio si existe foto_referencial_especie: autor y licencia (decisión de Mari, 2026-11-16). No usar fotografías con marca de agua ni sin permiso de uso, salvo una fotografía de terceros cargada como temporal (foto_referencial_temporal = Sí), que se acredita «Foto de terceros, uso referencial temporal». |

#### D-293 · `foto_referencial_temporal`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | foto_referencial_temporal |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Marca al cargar o reemplazar la fotografía referencial. |
| Definiciones o criterios aplicables: | Indica que foto_referencial_especie es una fotografía de terceros de uso referencial temporal, que debe reemplazarse por una fotografía oficial de SIVU (propia, con autor y licencia, sin marca de agua y sin datos de ubicación). No es la fotografía oficial de la especie. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | Valor inicial: No. |
| Condición de activación | Cuando foto_referencial_especie tiene valor. |
| Validación y dependencias | Si es Sí, credito_foto_referencial = «Foto de terceros, uso referencial temporal» y la fotografía puede tener marca de agua; la ficha la sigue rotulando «Foto referencial de la especie». Vuelve a No al reemplazarla por una fotografía oficial. Excepción aprobada por Mari el 2026-11-16 para la fotografía actual del olmo (CC-078). Antes de dar por terminado Valpo Verde Conecta (retirar «Prototipo»), ninguna especie puede tener este campo en Sí. |

#### D-294 · `contenido_editado_por`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | contenido_editado_por |
| Origen | Vinculado por plataforma |
| ¿Quién lo ingresa? | Sistema |
| ¿Cómo se obtiene? | Usuario autenticado que guarda el contenido ciudadano de la especie. |
| Definiciones o criterios aplicables: | Último usuario que modificó el contenido ciudadano de la especie (los campos de esta hoja posteriores a tipo_hoja). |
| Tipo de dato | Identificador (texto) |
| Unidad / valores | No aplica |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar el contenido ciudadano de la especie. |
| Validación y dependencias | Referencia válida a USUARIOS con Rol = Usuario municipal o Administrador y activo = Sí. No editable manualmente. Editar los datos botánicos del Inspector (D-257 a D-262) no lo modifica. |

#### D-295 · `fecha_edicion_contenido`

| Columna | Valor |
|---|---|
| Hoja | CATALOGO_ESPECIES |
| Campo | fecha_edicion_contenido |
| Origen | Generado por plataforma |
| ¿Quién lo ingresa? | Sistema |
| ¿Cómo se obtiene? | Fecha y hora del guardado, registradas por el sistema. |
| Definiciones o criterios aplicables: | Fecha de la última modificación del contenido ciudadano de la especie. |
| Tipo de dato | Fecha |
| Unidad / valores | dd/mm/aaaa hh:mm |
| Tipo de obligatoriedad | Condicional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar el contenido ciudadano de la especie. |
| Validación y dependencias | No editable manualmente. Hora de Chile. El contenido se publica al guardar, sin borrador, aprobación ni versionado (decisión P3). |

### FICHAS_PUBLICAS

#### D-296 · `id_arbol`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | id_arbol |
| Origen | Vinculado por plataforma |
| ¿Quién lo ingresa? | Sistema |
| ¿Cómo se obtiene? | Vinculación al árbol cuya ficha pública se personaliza. |
| Definiciones o criterios aplicables: | Identificador del árbol al que corresponde la personalización de su ficha pública. |
| Tipo de dato | Identificador (texto) |
| Unidad / valores | No aplica |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar por primera vez la ficha pública de un árbol. |
| Validación y dependencias | Referencia válida a ARBOLES.id_arbol. Una única fila por árbol. Si el árbol no tiene fila en FICHAS_PUBLICAS, su ficha pública muestra solo el contenido de la especie y ningún dato del ejemplar. No se publica id_arbol: la ficha se identifica por el código QR, nunca por el identificador del árbol (CC-062). |

#### D-297 · `mostrar_clase_edad`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | mostrar_clase_edad |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Activación o desactivación en la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Indica si la ficha pública muestra el valor vigente de ARBOLES.clase_edad (D-25) del ejemplar. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | Valor inicial: No (decisión de Valej, 2026-11-16). |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | El valor mostrado sale exclusivamente del inventario (D-25, valor vigente); no se escribe desde la ficha. Si clase_edad no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. Se rotula como clasificación del Inspector. |

#### D-298 · `mostrar_altura_total`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | mostrar_altura_total |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Activación o desactivación en la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Indica si la ficha pública muestra el valor vigente de ARBOLES.altura_total_m (D-19) del ejemplar. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | Valor inicial: No (decisión de Valej, 2026-11-16). |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | El valor mostrado sale exclusivamente del inventario (D-19, valor vigente); no se escribe desde la ficha. Si altura_total_m no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. Se rotula «medida en terreno o estimada con escala»: el inventario no registra cuál de las dos se usó en cada árbol y no se agrega un campo de método (decisión de Valej, 2026-11-16). |

#### D-299 · `mostrar_dap`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | mostrar_dap |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Activación o desactivación en la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Indica si la ficha pública muestra el valor vigente de ARBOLES.dap_cm (D-18) del ejemplar. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | Valor inicial: No (decisión de Valej, 2026-11-16). |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | El valor mostrado sale exclusivamente del inventario (D-18, valor vigente); no se escribe desde la ficha. Si dap_cm no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. Se rotula «medida en terreno o estimada con escala»: el inventario no registra cuál de las dos se usó en cada árbol y no se agrega un campo de método (decisión de Valej, 2026-11-16). |

#### D-300 · `mostrar_diametro_copa`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | mostrar_diametro_copa |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Activación o desactivación en la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Indica si la ficha pública muestra el valor vigente de ARBOLES.diametro_copa_m (D-22) del ejemplar. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | Valor inicial: No (decisión de Valej, 2026-11-16). |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | El valor mostrado sale exclusivamente del inventario (D-22, valor vigente); no se escribe desde la ficha. Si diametro_copa_m no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. Se rotula «medida en terreno o estimada con escala»: el inventario no registra cuál de las dos se usó en cada árbol y no se agrega un campo de método (decisión de Valej, 2026-11-16). |

#### D-301 · `mostrar_rango_edad`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | mostrar_rango_edad |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Activación o desactivación en la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Indica si la ficha pública muestra el valor vigente de ARBOLES.rango_edad_estimada_anios (D-26) del ejemplar. |
| Tipo de dato | Categoría |
| Unidad / valores | Sí / No |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | Valor inicial: No (decisión de Valej, 2026-11-16). |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | El valor mostrado sale exclusivamente del inventario (D-26, valor vigente); no se escribe desde la ficha. Si rango_edad_estimada_anios no tiene valor, no se muestra nada aunque el interruptor esté en Sí: ni un valor aproximado ni un texto de relleno. Se rotula como estimación (D-26: origen Estimado). |

#### D-302 · `historia_ejemplar`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | historia_ejemplar |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Redacción a partir de antecedentes del ejemplar. |
| Definiciones o criterios aplicables: | «Mi historia»: antecedentes históricos, culturales, patrimoniales o curiosidades particulares de este árbol. Es distinta de historia_especie (CATALOGO_ESPECIES) y no la repite. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 1.000 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | Si está vacío, la sección «Mi historia» no se muestra. No presentar relatos inventados como hechos comprobados. Si incluye una afirmación histórica concreta, debe registrarse fuente_historia_ejemplar (decisión de la responsable, 2026-11-14); el sistema no lo exige al guardar y el formulario lo recuerda. |

#### D-303 · `fuente_historia_ejemplar`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | fuente_historia_ejemplar |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Registro de la fuente identificable de los antecedentes del ejemplar. |
| Definiciones o criterios aplicables: | Fuente que respalda historia_ejemplar: documentación municipal, publicaciones, archivos históricos, información institucional u otra fuente identificable. |
| Tipo de dato | Texto |
| Unidad / valores | Hasta 300 caracteres |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Cuando historia_ejemplar tiene valor. |
| Validación y dependencias | Solo admite valor si historia_ejemplar tiene valor. Obligatoria en el criterio de la responsable cuando el texto contiene una afirmación histórica concreta; el sistema no puede verificarlo y no la exige al guardar. La ficha la muestra solo cuando existe. |

#### D-304 · `foto_publica_arbol`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | foto_publica_arbol |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Carga de una fotografía del ejemplar para la ficha pública. |
| Definiciones o criterios aplicables: | Fotografía pública del ejemplar que identifica el QR. Es la imagen principal de su ficha. Es independiente de fotografias_arbol (D-27), que son registro técnico de la inspección. |
| Tipo de dato | Archivo de imagen |
| Unidad / valores | Una fotografía. JPG, PNG o WebP. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | Se guarda sin metadatos (EXIF, GPS ni datos de cámara), en un almacenamiento público distinto del de las fotografías técnicas. No se reutilizan fotografías de D-27. Sin personas identificables ni patentes. Al reemplazarla o quitarla se elimina el archivo anterior. Si no existe, la ficha usa foto_referencial_especie (rotulada como referencial). |

#### D-305 · `textos_personalizados`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | textos_personalizados |
| Origen | Manual |
| ¿Quién lo ingresa? | Usuario municipal / Administrador |
| ¿Cómo se obtiene? | Ingreso del texto propio del ejemplar para un bloque de la ficha. |
| Definiciones o criterios aplicables: | Textos que reemplazan, solo en la ficha de este árbol, el bloque correspondiente del contenido de la especie. Lo que no se personaliza se toma de CATALOGO_ESPECIES. |
| Tipo de dato | Lista estructurada (bloque, texto, fuente) |
| Unidad / valores | Bloque: Curiosidad / Quién soy / Consejo. Texto: el mismo límite del campo de la especie que reemplaza. Fuente: hasta 200 caracteres. |
| Tipo de obligatoriedad | Opcional |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | Un único texto por bloque. Si el texto queda vacío, se vuelve a mostrar el de la especie. Curiosidad requiere fuente. No se personalizan los rasgos de reconocimiento, el año ni la historia de la especie, que son botánicos y comunes a todos sus ejemplares. |

#### D-306 · `editado_por`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | editado_por |
| Origen | Vinculado por plataforma |
| ¿Quién lo ingresa? | Sistema |
| ¿Cómo se obtiene? | Usuario autenticado que guarda la ficha pública del árbol. |
| Definiciones o criterios aplicables: | Último usuario que modificó la ficha pública del árbol. |
| Tipo de dato | Identificador (texto) |
| Unidad / valores | No aplica |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | Referencia válida a USUARIOS con Rol = Usuario municipal (miembro del proyecto del árbol) o Administrador, y activo = Sí. No editable manualmente. |

#### D-307 · `fecha_edicion`

| Columna | Valor |
|---|---|
| Hoja | FICHAS_PUBLICAS |
| Campo | fecha_edicion |
| Origen | Generado por plataforma |
| ¿Quién lo ingresa? | Sistema |
| ¿Cómo se obtiene? | Fecha y hora del guardado, registradas por el sistema. |
| Definiciones o criterios aplicables: | Fecha de la última modificación de la ficha pública del árbol. |
| Tipo de dato | Fecha |
| Unidad / valores | dd/mm/aaaa hh:mm |
| Tipo de obligatoriedad | Obligatorio |
| Fórmula / regla de cálculo | No aplica. |
| Condición de activación | Al guardar la ficha pública del árbol. |
| Validación y dependencias | No editable manualmente. Hora de Chile. Se publica al guardar, sin borrador, aprobación ni versionado (decisión P3). |
