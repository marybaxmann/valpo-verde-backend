# Carbono y beneficios ecosistémicos: matriz de modelos (investigación v2; NO implementado)

> **Corregido por `carbono-verificacion-modelos.md` (2026-11-01):** el Anexo 2 tiene 308 árboles en pie (331 registros únicos, menos 17 tocones y 6 retirados); los 320 de esta versión incluían 6 filas repetidas y los retirados. La cobertura y la clasificación vigentes están en ese documento.

> **Estado:** investigación para decidir. No es metodología vigente. En la hoja INDICES, «Carbono almacenado» (fila 14), «Secuestro anual» (fila 15) y el resto de indicadores ecosistémicos siguen «Pendiente», y CC-016 no los adopta. Nada de esto se calcula en SIVU hasta que Valej apruebe un método, se registre en el Excel y en un CC.
>
> **Fecha:** 2026-11-01 (v2, reemplaza la v1 del mismo día). **No se inventó ningún coeficiente:** todo coeficiente de este documento está copiado de una fuente leída en esta sesión (sección 1). Lo que viene de memoria y no se pudo contrastar con la fuente original se marca **«(verificar)»** y no tiene coeficientes propios.

## 1. Fuentes

| Id | Fuente | Cómo se leyó |
|---|---|---|
| **DOB** | Dobbs, C.; Hernández, J.; Escobedo, F. 2011. Above ground biomass and leaf area models based on a non destructive method for urban trees of two communes in Central Chile. *Bosque* 32(3): 287-296. https://doi.org/10.4067/S0717-92002011000300010 | PDF completo entregado por Valej; tablas 1, 2 y 3 revisadas en la imagen de la página. |
| **UTD** | McPherson, E. G.; van Doorn, N. S.; Peper, P. J. 2016 (act. 21-ene-2020). Urban tree database. Forest Service Research Data Archive. https://doi.org/10.2737/RDS-2016-0005 | Archivos TS1-TS9 y metadatos oficiales (`_metadata_RDS-2016-0005.html`), desde la copia en GitHub `DDA8/-Plant-Growth-Sensor-Data-Project-`. |
| **RIQ** | Riquelme, F. 2026. Informe Técnico Experto Final (arbolado de 7 espacios públicos del plan de Valparaíso). | PDF entregado por Valej; Anexo 2 («Muestra de la información contenida en planilla y matriz de peligro») y sección de composición. |
| **CHV14** | Chave, J. et al. 2014. Improved allometric models to estimate the aboveground biomass of tropical trees. *Global Change Biology* 20: 3177-3190. | **No leído.** Fórmula entregada por Valej: `AGB = 0.0673 × (ρ D² H)^0.976`. Lo demás sobre este modelo es **(verificar)**. |

## 2. Especies del informe de Riquelme (RIQ)

- El informe evalúa 341 árboles en 7 espacios. El Anexo 2 trae 337 filas (331 `id` distintos) con nombre **común**. Sin las 17 filas «Tocón», quedan **320 árboles**.
- El informe da nombre científico solo para 5 especies: *Phoenix canariensis*, *Ulmus* sp., *Jubaea chilensis*, *Jacaranda mimosifolia* y *Ligustrum lucidum*. **Todos los demás nombres científicos de esta tabla son identificaciones PROVISIONALES de esta investigación**, hechas a partir del nombre común y marcadas con «(P)». Ninguna se cargó en Supabase.
- «Ambiguo»: el nombre común corresponde a varias especies o solo a un género. En esos casos no se elige un modelo hasta confirmar la especie en terreno.

Leyenda de la columna «Modelo de biomasa aérea»:
- **A**: ecuación UTD de la propia especie.
- **B**: ecuación UTD sustituta o genérica, asignada por TS9.
- **P**: modelo general de palmeras.
- **—**: sin modelo.

DOB indica si hay ecuaciones chilenas de copa (ramas y hojas) o de área foliar.

| Nombre común (RIQ) | n | Nombre científico | ρ en TS9 (kg/m³) | Modelo de biomasa aérea | DOB |
|---|---|---|---|---|---|
| Palmera Fénix | 56 | *Phoenix canariensis* (RIQ) | 370 | P | — |
| Olmo | 55 | *Ulmus* sp. (RIQ): solo género | varía por especie (460-730) | — (ambiguo: TS7 tiene *U. americana*, *U. parvifolia* y *U. pumila*, con ecuaciones distintas) | — |
| Jacarandá | 23 | *Jacaranda mimosifolia* (RIQ) | 490 | A | — |
| Palma chilena | 21 | *Jubaea chilensis* (RIQ) | sin dato | P, con reservas (sección 4.4) | — |
| Ligustro (+1 «Ligustro sp») | 19 | *Ligustrum lucidum* (RIQ) | sin dato | — | — |
| Palma mexicana | 12 | *Washingtonia robusta* (P); ambiguo con *W. filifera* | 370 (las dos) | P | — |
| Belloto del norte | 11 | *Beilschmiedia miersii* (P) | sin dato | — | — |
| Quercus sp | 9 | *Quercus* sp.: solo género | varía (550-820) | — (ambiguo) | — |
| Quillay | 8 | *Quillaja saponaria* (P) | sin dato | — | ramas y hojas |
| Pitosporo ondulado | 7 | *Pittosporum undulatum* (P) | 745 | B (Urb Gen Broadleaf) | — |
| Liquidámbar | 7 | *Liquidambar styraciflua* (P) | 460 | A | ramas y hojas |
| Falso acacio | 7 | *Robinia pseudoacacia* (P) | 660 | B (*Gleditsia triacanthos*) | ramas, hojas y área foliar |
| Araucaria excelsa / australiana / brasilera | 6 / 6 / 1 | *Araucaria heterophylla* / ambiguo / *A. angustifolia* (P) | sin dato | — | — |
| Coprosma | 6 | *Coprosma* sp.: solo género | sin dato | — | — |
| Ceibo | 5 | *Erythrina crista-galli* (P) | sin dato | — | — |
| Brachichito | 5 | *Brachychiton populneus* (P) | 387 | B (Urb Gen Broadleaf) | — |
| Gomero / Higuera australiana | 4 / 1 | *Ficus* sp. (P): ambiguo | sin dato para la especie | — | — |
| Fresno europeo | 4 | *Fraxinus excelsior* (P) | 560 (cultivar 'Hessei') | B (*F. velutina* 'Modesto') | — |
| Peumo | 4 | *Cryptocarya alba* (P) | sin dato | — | — |
| Crespón | 4 | *Lagerstroemia indica* (P) | 571 | B (Urb Gen Broadleaf) | — |
| Acacia de Japón | 3 | *Styphnolobium japonicum* (P) | sin dato | — | — |
| Ginkgo | 3 | *Ginkgo biloba* (P) | 520 | B (Urb Gen Broadleaf) | — |
| Cedro del Himalaya | 3 | *Cedrus deodara* (P) | 410 | B (Jenkins, cedar/larch) | — |
| Plátano oriental | 3 | *Platanus orientalis* (P) | sin dato (sí *P. × acerifolia*) | — | — |
| Sterculea rosada | 3 | *Brachychiton* sp. (P): ambiguo | — | — | — |
| Fresno de flor | 2 | *Fraxinus ornus* (P) | sin dato | — | — |
| Maitén | 2 | *Maytenus boaria* (P) | sin dato | — | área foliar |
| Palma cocos plumosa | 2 | *Syagrus romanzoffiana* (P) | 370 | P | — |
| Casuarina | 2 | *Casuarina* sp.: solo género | 728 (solo *C. equisetifolia*) | — (ambiguo) | — |
| Níspero | 2 | *Eriobotrya japonica* (P) | 520 | B (Urb Gen Broadleaf) | — |
| Secuoya roja | 1 | *Sequoia sempervirens* (P) | 360 | B (Jenkins, cedar/larch) | — |
| Aromo australiano | 1 | *Acacia melanoxylon* (P) | 573 | B (*Acacia longifolia*) | — (en DOB no supera R² 0,40) |
| Morera | 1 | *Morus* sp. (P) | 520 (*Morus species*) | B (Urb Gen Broadleaf) | — |
| Castaño de la India | 1 | *Aesculus hippocastanum* (P) | 500 | B (Urb Gen Broadleaf) | — |
| Pimiento | 1 | *Schinus molle* (P) | 650 | B (Urb Gen Broadleaf) | ramas y hojas |
| Tilo | 1 | *Tilia* sp.: solo género | 320-420 | — (ambiguo) | — |
| Lagunaria, Álamo negro, Paulonia, Ombú, Cedro, Hibiscus, Huingán, Cotoneaster | 1 c/u | *Lagunaria patersonii*, *Populus nigra*, *Paulownia tomentosa*, *Phytolacca dioica*, *Cedrus* sp., *Hibiscus* sp., *Schinus polygama*, *Cotoneaster* sp. (P) | sin dato | — | — |

**Cobertura sobre los 320 árboles**, con las identificaciones provisionales:

| Disponibilidad de modelo | Árboles | % |
|---|---|---|
| Ecuación UTD de la propia especie (A) | 30 | 9 % |
| Ecuación UTD sustituta o genérica (B) | 40 | 13 % |
| Modelo general de palmeras (P) | 91 | 28 % |
| Sin modelo, incluidos los ambiguos | 159 | 50 % |
| Además, copa chilena de DOB | 23 | 7 % |

Olmo (55) es el mayor vacío: con la especie confirmada en terreno, entraría en A.

## 3. Modelos con fórmula exacta

Variables de SIVU: D = `dap_cm` (D-18; en multifustal, el DAP equivalente), H = `altura_total_m` (D-19). ln = logaritmo natural.

### 3.1 Dobbs et al. 2011 (Chile central): copa y área foliar

Sobre DOB:
- **Componente:** la «crown biomass» es la suma de ramas y hojas. **No incluye el fuste**, así que DOB no estima la biomasa aérea total.
- **Muestra:** n = 10 árboles por especie, crecidos sin competencia, sin poda ni estrés, en Lo Barnechea y La Reina (Santiago), medidos en 2004-2005.
- **Unidades:** biomasa en kg (figuras 2 y 3); D en cm; H en m.
- **Selección de ecuaciones:** el artículo solo publica las que tienen R² > 0,40.

| Especie | Componente | Ecuación (textual, tabla 2 o 3) | R² | MSE | Rango de la muestra (tabla 1) |
|---|---|---|---|---|---|
| *Acer negundo* | Ramas | `B = 7.130020 + 0.000938 · D² · H` | 0.51 | 16.24 | D 7-45; H 4-10 |
| *Acer negundo* | Hojas | `Bfol = 0.0023 · H^3.6976` | 0.77 | 3.55 | ídem |
| *Acer negundo* | Área foliar | Impresa como `LA = 13.16 e^-27.1760 + 13.16 e^-1.6832`, **sin D**. Probable errata (la de *Ailanthus* tiene la forma `17.8 e^a + 17.8 D e^b`). **No usable sin confirmar con los autores.** | 0.47 | 8.17 | ídem |
| *Ailanthus altissima* | Ramas | `B = 0.000007 · D^4.422943` | 0.71 | 69.17 | D 6-45; H 5-22 |
| *Ailanthus altissima* | Hojas | `Bfol = 0.0007 · D^2.6478` | 0.61 | 15.89 | ídem |
| *Ailanthus altissima* | Área foliar | `LA = 17.8 e^-27.0249 + 17.8 · D · e^-1.4109` | 0.43 | 23.51 | ídem |
| *Robinia pseudoacacia* | Ramas | `B = 2.050230 · H^1.686937` | 0.54 | 135.40 | D 7-60; H 4-15 |
| *Robinia pseudoacacia* | Hojas | `Bfol = 0.0582 · H^2.6808` | 0.84 | 51.57 | ídem |
| *Robinia pseudoacacia* | Área foliar | `LA = 1.335 + 0.0103 · D² · H` | 0.74 | 188.60 | ídem |
| *Liquidambar styraciflua* | Ramas | `B = 0.000107 · H^5.102728` | 0.45 | 18.90 | D 6-30; H 4-10 |
| *Liquidambar styraciflua* | Hojas | `Bfol = 0.0164 · H^2.1705` | 0.47 | 0.83 | ídem |
| *Schinus molle* | Ramas | `B = 0.270671 · H^1.339925` | 0.70 | 24.10 | D 8-45; H 2.5-9 |
| *Schinus molle* | Hojas | `Bfol = 0.1577 + 0.004 · D² · H` | 0.80 | 0.94 | ídem |
| *Quillaja saponaria* | Ramas | `B = 0.000306 · D^3.762624` | 0.71 | 24.50 | D 6-25; H 3-6 |
| *Quillaja saponaria* | Hojas | `Bfol = 0.0028 · D^2.6821` | 0.60 | 10.63 | ídem |
| *Prunus cerasifera* | Área foliar | `LA = 24.63 + 0.0105 · D² · H` | 0.90 | 6.28 | D 7-42; H 4-13 |
| *Maytenus boaria* | Área foliar | `LA = 6.26 e^-0.6769 + 6.26 · D · e^-1.9775` | 0.60 | 10.63 | D 8-21; H 4-6 |

Copa = ramas + hojas, solo para las 6 especies que tienen las dos ecuaciones: *A. negundo*, *A. altissima*, *R. pseudoacacia*, *L. styraciflua*, *S. molle* y *Q. saponaria*.

**Observaciones sobre DOB:**
- La unidad de LA no está declarada en la tabla 3. La tabla 4 compara en m², pero hay que confirmarlo.
- El encabezado de la tabla 3 dice «Weight / area ratio» y la nota dice «leaf area/weight ratio en cm²/g».
- La tabla 5 da la proporción hojas / ramas / fuste por especie (promedio 7 / 24 / 69 %). **No es una ecuación de biomasa total**: escalar la copa a biomasa aérea con esas proporciones sería una regla nueva y no se propone sin aprobación.

### 3.2 Urban Tree Database (TS6-TS9)

- **Metadatos oficiales:** TS7 predice «above ground volume (cubic meters per tree)» de madera fresca, y «Fresh wood volume is then multiplied by the species’ DW density factor to obtain aboveground DW biomass».
- **Componente:** biomasa aérea leñosa.
- **Lo que no traen los archivos:** la fracción de carbono, las raíces y el tratamiento de los multifustales.

| Ecuación (especie de TS7/TS8) | Aplica a (RIQ) | Fórmula (textual) | Rango D (cm) | Fuente | Resultado |
|---|---|---|---|---|---|
| *Jacaranda mimosifolia* | Jacarandá (propia) | `V = 0.0000801·D^2.18578·H^0.548045` · alt. `V = 0.0001005·D^2.486248` | 17-60 | Pillsbury, Reimer y Thompson 1998 | V (m³) × 490 |
| *Liquidambar styraciflua* | Liquidámbar (propia) | `V = 0.0000631·D^2.31582·H^0.41571` · alt. `V = 0.0000799·D^2.560469` | 14-54 | Pillsbury et al. 1998 | V × 460 |
| *Gleditsia triacanthos* | Falso acacio (sustituta) | `V = 0.0004891·D^2.132·H^0.142` · alt. `V = 0.0005055·D^2.22` | 9-98 | McHale 2007 | V × 660 |
| *Fraxinus velutina* 'Modesto' | Fresno europeo (sustituta) | `V = 0.0000385·D^1.76296·H^1.42782` · alt. `V = 0.000054·D^2.633462` | 15-85 | Pillsbury et al. 1998 | V × 560 |
| *Acacia longifolia* | Aromo australiano (sustituta) | `V = 0.0000904·D^2.18649·H^0.46736` · alt. `V = 0.000154·D^2.34725` | 15-57 | Pillsbury et al. 1998 | V × 573 |
| Urb Gen Broadleaf | Pitosporo, Brachichito, Crespón, Ginkgo, Níspero, Morera, Castaño de la India, Pimiento | `V = 0.0001967·D^1.951853·H^0.664255` · alt. `V = 0.0002835·D^2.310647` | 6-135 | Aguaron y McPherson 2012 | V × ρ de la especie (TS9) |
| Gen Sftwd cedar/larch | Cedro del Himalaya, Secuoya roja | `B = EXP(-2.0336+2.2592·LN(D)) − EXP(-2.9584+4.4766/D)` | 3-61 | Jenkins et al. 2004, menos la fracción foliar | B, biomasa seca sin follaje; unidad no declarada en el archivo (Jenkins usa kg) |
| General palms (TS9 la asigna como «Prestoea montana») | Palmeras | `B = (6·H+0.8)+(0.8·H+0.9)` | límite superior «170» sin unidad clara | Frangi y Lugo 1985 | B, biomasa seca; unidad y si H es altura total o de estípite: **sin confirmar** |

TS6 (crecimiento por región de EE. UU.) da, por especie y región, ecuaciones de edad ↔ DAP, diámetro y alto de copa, altura y **área foliar**. Por ejemplo, *Jacaranda mimosifolia* y *Liquidambar styraciflua* en varias regiones. Sirve para área foliar y para modelar crecimiento, pero en climas de EE. UU.

### 3.3 Chave et al. 2014 (pantropical)

- **Fórmula** (la entregada por Valej): `AGB = 0.0673 × (ρ · D² · H)^0.976`, con AGB en kg, ρ en g/cm³, D en cm y H en m.
- **Densidad:** ρ podría tomarse de TS9 (kg/m³ ÷ 1000), que es masa seca sobre volumen verde.
- **Aplicabilidad a Valparaíso (verificar):**
  - Se calibró con árboles de bosques **tropicales** cosechados destructivamente; Valparaíso es mediterráneo templado.
  - No es para **palmeras**, que no tienen crecimiento secundario.
  - Los árboles urbanos crecidos sin competencia y podados reparten la biomasa distinto que los de bosque (DOB y la UTD lo señalan).
  - Exige ρ de cada especie, y la mitad de los árboles del informe no la tienen.
- **Conclusión:** no usarla como modelo universal. A lo más, como **último recurso, con aprobación expresa**, solo para latifoliadas con ρ documentada y marcando el resultado como de baja confianza.
- La UTD trae una variante anterior de Chave para «Gen Trop» (Chave et al. 2005, `0.112·(ρ·D²·H)^0.916`) que tiene las mismas limitaciones.

### 3.4 Ecuaciones forestales de la forma `B = a·D^b·H^c`

- La forma es la misma que las de volumen de TS7. Los coeficientes son siempre de cada estudio.
- Las únicas con coeficientes verificados en esta sesión son las de TS7 (volumen) y TS8 (biomasa; Jenkins y otros, de bosques rurales de EE. UU.).
- Para especies nativas chilenas (Quillay, Peumo, Belloto, Maitén) hay que buscar ecuaciones forestales chilenas publicadas: **no se encontraron ni se leyeron en esta sesión.** No se proponen coeficientes.

## 4. Análisis por alternativa

| Alternativa | A favor | En contra | Componente |
|---|---|---|---|
| 1. DOB (Chile) | Local, árboles urbanos, mismo clima mediterráneo | Solo 11 especies (n = 10 cada una), R² moderados, rangos chicos; **solo copa** | Ramas, hojas y área foliar |
| 2. UTD | Árboles urbanos; densidades por especie; cubre 22 % de los árboles de RIQ con A o B | Climas de EE. UU.; muchas sustitutas o genéricas; volumen × densidad | Aérea leñosa |
| 3. Forestales (Chave, Jenkins) | Bien documentadas y con muestras grandes | Bosque, no ciudad; Chave es tropical; necesitan ρ | Aérea (Chave) o aérea sin follaje (Jenkins) |
| 4. Palmeras (Frangi y Lugo, vía UTD) | Única opción para el 28 % de RIQ | Una palmera tropical delgada como base; *Jubaea* (estípite muy grueso) y *Phoenix* son muy distintas; unidad y tipo de altura sin confirmar | Aérea |

**4.4 Palmeras:** antes de aplicarlo a *Jubaea chilensis* o *Phoenix canariensis* hay que leer Frangi y Lugo 1985 y buscar modelos de palmeras subtropicales. Mientras tanto, no se calcula.

## 5. Variables en SIVU

| Variable | ¿Existe? | Observación |
|---|---|---|
| D (`dap_cm`, D-18) | Sí | En multifustal es el DAP equivalente. Falta decidir si las ecuaciones se aplican a ese valor o fuste por fuste (`dap_fustes_cm`). |
| H (`altura_total_m`, D-19) | Sí | Cobertura baja en los datos de prueba. Para palmeras puede hacer falta la altura del estípite, que **no existe**. |
| Especie (D-13, catálogo) | Sí | Hoy las especies del informe solo tienen nombre común: hay que confirmarlas (migración 032 para marcar provisional/confirmada). |
| Palmera o no | Sí, indirecto | `tipo_hoja = palmera` (D-262) en el catálogo. |
| Densidad de la madera ρ | **No** | Habría que agregar al catálogo de especies un campo de densidad con su fuente (CC). |
| Diámetros de copa (D-20, D-21) | Sí | No los usan los modelos de biomasa revisados. |
| Mediciones repetidas en el tiempo | Sí (historial en `tree_data_versions`) | Hoy casi todos los árboles tienen una sola medición. |
| Meteorología horaria, contaminantes, viviendas, costos | **No** | Datos externos. |

## 6. Carbono y CO₂ equivalente: propuesta

1. **Biomasa** (kg de materia seca) con el modelo que elija el selector (sección 8), solo dentro de su rango.
2. **Carbono:** C = B × FC. Candidatos para FC, todos **(verificar)** en la fuente original antes de aprobar:
   - 0,5, la convención de la UTD y de i-Tree (McPherson et al.; Nowak y Crane 2002);
   - 0,47, el valor por defecto del IPCC 2006 (Vol. 4, cap. 4).
3. **Raíces** (opcional, decidir): relación raíz/vástago 0,26 (Cairns et al. 1997, usada por i-Tree) **(verificar)**. Si no se suman, el resultado se llama «carbono aéreo».
4. **Ajuste urbano** de 0,8 sobre ecuaciones de bosque (Nowak 1994, i-Tree) **(verificar)**. No aplica a las ecuaciones urbanas de TS7.
5. **CO₂ equivalente:** CO₂e = C × 44/12 (≈ 3,667), la razón entre las masas molares del CO₂ y del C. Es estequiometría, no un supuesto.
6. **Lo que se informa:** cobertura (árboles con resultado / presentes), el modelo de cada árbol y la confianza: propia, sustituta, genérica o de bosque. Si la especie es provisional, el resultado también lo es.

## 7. Secuestro anual

- **Hoy no es viable.** Se necesita B al inicio y al final del período (INDICES fila 15: carbono final menos inicial), es decir, D y H medidos al menos dos veces por árbol con un año o más de diferencia. SIVU ya guarda el historial (`tree_data_versions`), pero casi no hay remediciones.
- **Alternativa (decidir):** crecimiento modelado con TS6, que relaciona edad y DAP. Sus regiones son de EE. UU. y SIVU no registra la edad en años (solo la clase de edad). No se recomienda.

## 8. Selector de modelos para el backend (propuesta, sin código)

- **Dónde viven los modelos:** en una **hoja nueva del Excel** (p. ej. `MODELOS_BIOMASA`), por CC, porque la fuente metodológica es el Excel. El backend la copia a `services/rules/` como catálogo versionado, igual que `catalogs.ts`.
- **Cada modelo:** `id`, taxón (especie, género o grupo), componente (`copa`, `ramas`, `hojas`, `aerea`, `aerea_sin_follaje`, `area_foliar`), forma y coeficientes, unidades, variables requeridas (D, H, ρ), rango de D y H, fuente, nivel de confianza (`propia_local`, `propia_urbana`, `sustituta`, `generica`, `forestal`) y si sirve para palmeras.
- **Orden de selección, por componente y por árbol:**
  1. el modelo chileno de la propia especie (DOB), si el componente es copa, hojas o área foliar;
  2. la ecuación urbana de la propia especie (UTD A);
  3. la ecuación urbana sustituta o genérica asignada en TS9 (UTD B);
  4. palmeras (`tipo_hoja = palmera`): solo el modelo de palmeras aprobado; nunca una ecuación de latifoliadas;
  5. Chave 2014, solo si se aprueba expresamente, para latifoliadas con ρ documentada;
  6. si no hay modelo: `null` con el motivo («sin modelo», «especie solo a nivel de género», «fuera de rango», «falta H», «falta ρ»).
- **Fuera del rango de D o H:** `null`, sin extrapolar (decidir).
- **Trazabilidad:** cada resultado guarda el `id` y la versión del modelo y si la especie era provisional.

## 9. Qué indicadores ecosistémicos caben en B19

| Indicador (INDICES) | ¿Con los datos actuales? | Qué falta |
|---|---|---|
| Área proyectada de copa | **Sí, ya implementado** | — |
| Biomasa aérea, carbono almacenado y CO₂e | **Parcial** (≈ 22 % de RIQ con modelo urbano; palmeras en espera) | Aprobar método, factores y selector; confirmar especies; H en los árboles; ρ en el catálogo |
| Biomasa de copa | **Parcial** (6 especies de DOB; 23 árboles de RIQ) | Aprobar DOB; H y D dentro de rango |
| Área foliar y biomasa foliar | **Parcial** (DOB: 4 especies con área foliar usable; UTD TS6 por región de EE. UU.) | Aprobar método |
| Secuestro anual | **No** | Remediciones de D y H |
| Remoción de contaminantes, escorrentía, transpiración, VOC | **No** | Series horarias de meteorología y contaminantes, parámetros de modelo, área foliar |
| Energía en viviendas | **No** | Datos de viviendas, distancia y orientación, tarifas |
| Valor compensatorio | **No** | Método y costos locales |
| Hábitat de aves, radiación UV | **No** | Modelos y datos de hábitat o de radiación |

## 10. Decisiones pendientes (Valej)

1. Aprobar o descartar cada alternativa (DOB, UTD A/B, Chave, palmeras) y su orden en el selector.
2. Fracción de carbono, raíces y ajuste urbano, con la fuente leída.
3. Multifustales: DAP equivalente o fuste por fuste.
4. Fuera de rango: `null` o extrapolar.
5. Agregar la densidad de la madera al catálogo de especies (CC).
6. Registrar los modelos en el Excel (hoja nueva) y en un CC antes del código.
7. Confirmar en terreno las especies ambiguas (Olmo, Quercus, Gomero, Palma mexicana, Araucaria australiana, Casuarina, Tilo, Coprosma).
8. Pedir a los autores de DOB la ecuación de área foliar de *Acer negundo* (probable errata).
