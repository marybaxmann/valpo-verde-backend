# Carbono aéreo leñoso: referencias bibliográficas y cómo se aplican

> Documento de trazabilidad de la estimación de carbono de SIVU (B19 y ficha del árbol B2). Registra **de dónde sale cada número** y **cómo se usa en el cálculo**. Decisiones: CC-069 v1 (método general) y CC-070 (modelo sustituto para *Acer pseudoplatanus*). Código: `src/services/rules/carbono/modelos.ts` y `calculo.ts`.
>
> **Carbono aéreo total (sección 4, propuesta experimental, no vigente):** desde el 2026-11-21, en rama experimental, *Quillaja saponaria* y *Cryptocarya alba* tienen modelos exploratorios de carbono directo (Cruz et al. 2015) en un indicador aparte, que incluye hojas y nunca se suma con el leñoso.
>
> **Qué estima SIVU:** **carbono aéreo leñoso almacenado** en el árbol, con la medición vigente (tronco y ramas, sin raíces ni follaje). **No estima el secuestro anual** (carbono capturado por año; INDICES fila 15, «Pendiente»), porque requiere dos mediciones del mismo árbol separadas en el tiempo.

## 1. Cadena de cálculo (igual para todos los modelos)

| Paso | Fórmula | Unidad | Fuente |
|---|---|---|---|
| 1. Volumen | `V = a · DAP^b · H^c` (variante con altura) o `V = a · DAP^b` (solo DAP) | m³ por árbol; DAP en cm; H en m | Ecuación del modelo (sección 3) |
| 2. Biomasa aérea leñosa | `B = V × ρ` | kg de materia seca | ρ = densidad básica (masa seca / volumen verde), sección 3 |
| 3. Carbono | `C = B × 0,47` | kg de C | IPCC 2006 (sección 2) |
| 4. CO₂ equivalente | `CO₂e = C × 44/12` | kg de CO₂ | Razón de masas molares CO₂/C (estequiometría) |

La densidad se aplica **una sola vez** (paso 2). No hay factor urbano, ni raíces, ni corrección de corteza (CC-069, decisión 4). Fuera del rango de la ecuación el resultado es `null` con su motivo, sin extrapolar (decisión 7). Los multifustales no se estiman (decisión 6).

## 2. Referencias generales

1. **IPCC 2006.** *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Vol. 4 (Agriculture, Forestry and Other Land Use), cap. 4, tabla 4.3. — **Aplicación:** fracción de carbono **0,47** de la biomasa seca, valor por defecto, no específico de la especie (paso 3). Estado: cita tomada de CC-069 («por verificar en el original»).
2. **McPherson, E. G.; van Doorn, N. S.; Peper, P. J. 2016** (actualizado 2020-01-21). *Urban tree database.* Fort Collins, CO: Forest Service Research Data Archive. https://doi.org/10.2737/RDS-2016-0005 — **Aplicación:** coeficientes métricos (TS7) y densidades (TS9) de los modelos de *Jacaranda mimosifolia* y *Liquidambar styraciflua*.

## 3. Referencias por modelo

### 3.1 *Jacaranda mimosifolia* y *Liquidambar styraciflua* (CC-069 v1; confianza «propia_urbana»)

3. **Pillsbury, N. H.; Reimer, J. L.; Thompson, R. P. 1998.** *Tree volume equations for fifteen urban species in California.* Urban Forest Ecosystems Institute, California Polytechnic State University (tablas 6, 7 y 8).
   - **Aplicación:** ecuaciones de volumen de la propia especie (variantes con altura y solo DAP) y rangos de DAP y altura (tabla 8, convertidos a cm y m). Densidad: 490 kg/m³ (Jacarandá) y 460 kg/m³ (Liquidámbar), de la UTD TS9.
   - Modelos: `UTD-TS7-JAME-DH`, `UTD-TS7-JAME-D`, `UTD-TS7-LIST-DH`, `UTD-TS7-LIST-D`. Detalle en `docs/plan/propuestas/carbono-modelos-apto-especificacion.md`.

### 3.2 *Acer pseudoplatanus* (CC-070, opción C2; confianza «sustituta_mismo_genero»)

Es una **estimación indirecta**: la ecuación es de *Acer platanoides*, otra especie del mismo género; la densidad sí es de *Acer pseudoplatanus*. Modelo: `MCH09-T1-ACPL-D-ACPS`.

4. **McHale, M. R.; Burke, I. C.; Lefsky, M. A.; Peper, P. J.; McPherson, E. G. 2009.** Urban forest biomass estimates: is it important to use allometric relationships developed specifically for urban trees? *Urban Ecosystems* 12(1): 95-113. https://doi.org/10.1007/s11252-009-0081-3
   - **Lo que se tomó:** tabla 1, *Acer platanoides* (ACPL): `Volumen (m³) = a · DBH(cm)^b`, con **a = 1,9 × 10⁻³** y **b = 1,785** (R² = 0,940; RMSE = 0,280).
   - **Cómo se aplica:** paso 1 con DAP = `dap_cm` (D-18) y sin altura: la ecuación **no usa la altura**, por eso no se controla un rango de altura y la altura registrada del árbol no cambia el resultado.
   - **Contexto de la muestra:** 184 árboles de calle de Fort Collins, Colorado (EE. UU.), 14 a 22 por especie, con el volumen total medido por LiDAR terrestre (método de Lefsky y McHale 2008). El artículo no publica el rango de DAP por especie.
   - **Verificación:** artículo leído (texto y tabla 1) el 2026-11-02. La UTD y `carbono-verificacion-modelos.md` citaban esta ecuación como «McHale 2007» (la tesis doctoral de McHale, Colorado State University, con los mismos datos): la cita correcta es la de 2009.
   - **No se usa:** la variante con altura que aparece en la UTD (`V = 0.001011·D^1.533·H^0.657`), porque no está en el artículo de 2009 y su origen no está verificado.
5. **California Air Resources Board 2010.** *Compliance Offset Protocol: Urban Forest Projects*, tabla B.1 (*Acer platanoides*).
   - **Lo que se tomó:** el **rango de DAP admisible, 9,7 a 102,1 cm**, que se aplica al modelo (límites incluidos).
   - **Diferencia de coeficientes:** esta tabla publica **a = 0,0019421** con el mismo b = 1,785. SIVU usa **a = 0,0019 del artículo original** (decisión de Valej, 2026-11-02): es la fuente primaria, y los decimales adicionales no tienen su origen documentado. La diferencia es de un 2,2 % en todo el rango (0,0019421 / 0,0019 = 1,0222). Para A-000419 (DAP 13,4 cm): con 0,0019 → 46,8 kg C y 171,6 kg CO₂e; con 0,0019421 → 47,8 kg C y 175,4 kg CO₂e.
   - **Verificación:** dato aportado por la responsable; el documento no se pudo descargar en esta sesión (el servidor responde 403). El rango coincide con el de la UTD (10-102 cm, redondeado).
6. **Sedlar, T.; Šefc, B.; Stojnić, S.; Sinković, T. 2021.** Wood quality characterization of sycamore maple (*Acer pseudoplatanus* L.) and its utilization in wood products industries. *Croatian Journal of Forest Engineering* 42(3): 543-560. https://doi.org/10.5552/crojfe.2021.1099
   - **Lo que se tomó:** **densidad básica ρy = 0,51 g/cm³ = 510 kg/m³** (rango 0,45-0,57 g/cm³), medida según ISO 13061-2 (masa anhidra / volumen verde), tabla 1 y texto de resultados.
   - **Cómo se aplica:** paso 2, ρ = 510 kg/m³. Es la misma definición de densidad que usan los demás modelos («masa seca / volumen verde»).
   - **Contexto de la muestra:** árboles de bosque de Medvednica (Croacia), no urbanos. La misma tabla cita 0,547 g/cm³ de Wagenführ (2007).
   - **Verificación:** artículo leído el 2026-11-02.
7. **Nowak, D. J. 2020.** *Understanding i-Tree: summary of programs and methods.* General Technical Report NRS-200. Madison, WI: USDA Forest Service, Northern Research Station. https://doi.org/10.2737/NRS-GTR-200 — **Aplicación:** según la responsable, el apéndice 11 informa 510 kg/m³ para *Acer pseudoplatanus*, el mismo valor de Sedlar et al. 2021. **No verificado en esta sesión:** el servidor del USDA bloquea la descarga de los apéndices. Fuente secundaria de respaldo; el valor aplicado se sostiene en Sedlar et al. 2021.

**Resultado de referencia, A-000419** (Piloto Valparaíso; *A. pseudoplatanus*, un fuste, DAP 13,4 cm), calculado a mano y comprobado por las pruebas automáticas:

| Paso | Cálculo | Resultado |
|---|---|---|
| Volumen | 0,0019 × 13,4^1,785 | 0,1953 m³ |
| Biomasa | 0,1953 × 510 | 99,6 kg |
| Carbono | 99,6 × 0,47 | 46,8 kg C |
| CO₂e | 46,8 × 44/12 | 171,6 kg CO₂e |

**Limitaciones de este modelo** (se entregan con cada resultado, en `modelo.limitaciones_modelo`): ecuación de otra especie del mismo género; ajustada en Fort Collins (clima semiárido continental, no mediterráneo); densidad de árboles de bosque de Croacia; DAP de SIVU a 1,30 m y el de la ecuación a 4,5 ft (1,37 m), sin corrección. Además, las limitaciones generales de CC-069.

## 4. PROPUESTA EXPERIMENTAL · Carbono aéreo total con modelos de carbono directo (2026-11-21)

> **No es metodología vigente.** Implementación experimental en la rama `feature/carbono-directo` (PR #94, borrador), pendiente de revisión y aprobación del equipo. No se fusiona ni se despliega hasta entonces. Resumen para la revisión: `docs/plan/propuestas/carbono-directo-revision-equipo.md`.

> **Otro componente, otro indicador.** Estos modelos estiman el **carbono aéreo total** (tallo, ramas, ramillas y hojas; sin raíces), no el carbono aéreo leñoso de las secciones 1 a 3. Se calculan en `rules/carbono/carbonoAereoTotal.ts` y se exponen como `estimacion_carbono_aereo_total` (ficha B2 y B19), **nunca sumados** con `estimacion_carbono_aereo_lenoso`. Son **exploratorios** para el arbolado urbano de Valparaíso: se muestran rotulados y no generan total oficial. **No alimentan el secuestro anual**, ni como simulación (decisión del 2026-11-21, temporal). Pendientes de sincronización con el Excel maestro: `docs/plan/propuestas/carbono-directo-discrepancia-excel.md`.

### 4.1 Cadena de cálculo

| Paso | Fórmula | Unidad |
|---|---|---|
| 1. Carbono aéreo total | `C = a · DAP^b` | kg de C; DAP en cm, medido a 1,30 m |
| 2. CO₂ equivalente | `CO₂e = C × 44/12` | kg de CO₂ |

La ecuación entrega el carbono **directamente**: no se aplica densidad de madera ni la fracción 0,47, ni se vuelve a aplicar la fracción de carbono de la fuente. La altura no interviene. Fuera del rango de DAP el resultado es `null` con su motivo, sin extrapolar.

### 4.2 Referencias

1. **Fuente principal.** Cruz, P., Bascuñan, A., Velozo, J. y Rodríguez, M. (2015). Funciones alométricas de contenido de carbono para quillay, peumo, espino y litre. *Bosque*, 36(3), 375–381. https://doi.org/10.4067/S0717-92002015000300005 (PDF: https://www.scielo.cl/pdf/bosque/v36n3/art05.pdf). — Componentes considerados: p. 376. Contenido de carbono por componente: p. 379, cuadro 5. Ecuaciones, muestras y rangos: p. 379, cuadro 6.
2. **Fuente metodológica complementaria.** Cruz, P., Bascuñán, A. y Velozo, J. (2014). *Funciones alométricas para el bosque mediterráneo chileno: modelos de biomasa y carbono para quillay, peumo, espino y litre.* Informe final OTERRA, Universidad Mayor. (PDF: https://gefmontanacurso.mma.gob.cl/wp-content/uploads/2021/01/modulos/clase_04/FUNCIONES_ALOMETRICAS_PARA_EL_BOSQUE_MED.pdf). — Selección de individuos monopódicos y simpódicos: p. 24. DAP a 1,30 m: p. 26, cuadro 3.2. Construcción de los modelos de biomasa y carbono: capítulos 7 y 8.

Parámetros entregados y verificados por la responsable (2026-11-21); SIVU no los redefine.

| Modelo | Especie | a | b | DAP (cm) | n | R² | Carbono de la biomasa aérea seca (solo informativo) |
|---|---|---|---|---|---|---|---|
| `CRUZ15-C6-QUSA-D` | *Quillaja saponaria* | 0,0736 | 2,251 | 5–41 | 80 | 0,95 | 49,3 % |
| `CRUZ15-C6-CRAL-D` | *Cryptocarya alba* | 0,0675 | 2,352 | 5–37 | 82 | 0,95 | 49,5 % |

Nivel de confianza: **`propia_no_urbana`** (ecuación de la misma especie ajustada fuera de la ciudad). Estado metodológico en SIVU: **exploratorio**. Son dos atributos distintos: el primero describe el origen de la ecuación; el segundo, su aplicación en SIVU.

### 4.3 Limitaciones (se entregan con cada resultado)

- **Transferencia a árboles urbanos no validada:** las ecuaciones se ajustaron en el bosque mediterráneo chileno; la arquitectura de copa de un árbol urbano (podas, competencia, espacio) puede diferir.
- **Componente no comparable con el leñoso:** incluye hojas. Por eso va en un indicador aparte y nunca se suma con el carbono aéreo leñoso.
- **Multifustales excluidos:** la fuente no demuestra que el DAP equivalente de un multifustal pueda sustituir el DAP con que se ajustó la ecuación. No se suma por fuste ni se usa el DAP equivalente hasta que se apruebe un tratamiento.
- **Sin secuestro anual:** las tasas de crecimiento y su transferibilidad al entorno urbano requieren validación.

### 4.4 Selección de modelos

Cada cálculo selecciona sus modelos por **componente**, **especie** y **estado** (`seleccionarModelos` en `modelos.ts`): dentro de un componente, si hay un modelo aprobado se descartan los exploratorios. Una especie puede tener modelos en ambos componentes; cada indicador agrega un solo componente, por lo que un árbol nunca se cuenta dos veces en un mismo total. Una prueba exige que, dentro de un componente, no haya dos modelos con la misma especie, estado y variante.

### 4.5 Ejemplares del Piloto (2026-11-21)

Con resultado (monofustales con evaluación completa vigente): A-000543 (quillay, DAP 6,9 cm: 5,69 kg C), A-000554 (quillay, 8,9 cm: 10,09 kg C), A-000568 (quillay, 18,4 cm: 51,76 kg C) y A-000537 (peumo, 7,8 cm: 8,46 kg C).
Excluidos: multifustales A-000538, A-000540 y A-000558; sin medidas vigentes (OT de inspección en ejecución) A-000562 a A-000565.

## 5. PROPUESTA EXPERIMENTAL · Modelos de volumen de la Urban Tree Database por especie (2026-11-21)

> **No es metodología vigente.** Rama `feature/indicadores-experimental`, pendiente de revisión del equipo. Propuesta consolidada: `docs/plan/propuestas/indicadores-biometricos-propuesta-experimental.md`. Componente: **carbono aéreo leñoso** (misma cadena de la sección 1); por eso el secuestro anual vigente se aplica sin cambios y sus resultados son simulaciones exploratorias que no suman.

**Fuente.** McPherson, E. G., van Doorn, N. S. y Peper, P. J. (2016). *Urban Tree Database and Allometric Equations*. USDA Forest Service, PSW-GTR-253. https://doi.org/10.2737/PSW-GTR-253 — tabla 9 (p. 70), ecuaciones; tabla 11 (pp. 73-82), ecuación asignada y densidad por especie; p. 73, uso de las ecuaciones generales con la densidad de la Global Wood Density Database cuando la especie no está listada. Densidades complementarias: Global Wood Density Database v2.2 (https://zenodo.org/records/18262736, `gwddagg_v2.2_binomial.csv`, `wsg_est` en g/cm³ × 1000).

| Modelo | Especie | Ecuación (V en m³; D en cm; H en m) | DAP (cm) | Densidad (kg/m³) y fuente | Confianza |
|---|---|---|---|---|---|
| `UTD-T9-UGEB-DH-GIBI` | *Ginkgo biloba* | UGEB: 0,0001967 · D^1,951853 · H^0,664255 | 6–135 | 520, tabla 11 | `generica_urbana` |
| `UTD-T9-UGEB-DH-LAIN` | *Lagerstroemia indica* | UGEB | 6–135 | 571, tabla 11 | `generica_urbana` |
| `UTD-T9-UGEB-DH-OLEU` | *Olea europaea* | UGEB | 6–135 | 700, tabla 11 | `generica_urbana` |
| `UTD-T9-UGEB-DH-PIUN` | *Pittosporum undulatum* | UGEB | 6–135 | 745, tabla 11 | `generica_urbana` |
| `UTD-T9-UGEB-DH-SCMO` | *Schinus molle* | UGEB | 6–135 | 650, tabla 11 | `generica_urbana` |
| `UTD-T9-UGEB-DH-FIEL` | *Ficus elastica* | UGEB | 6–135 | 500, GWDD v2.2 (no está en la tabla 11) | `generica_urbana` |
| `UTD-T9-UGEB-DH-PITO` | *Pittosporum tobira* | UGEB | 6–135 | 650, GWDD v2.2 (no está en la tabla 11) | `generica_urbana` |
| `UTD-T9-UGEC-DH-ARAN` | *Araucaria angustifolia* | UGEC: 0,0000426 · D^2,24358 · H^0,64956 | 16–147 | 450, GWDD v2.2 (no está en la tabla 11) | `generica_urbana` |
| `MCH09-T1-ACPL-D-ACPL` | *Acer platanoides* | 0,0019 · D^1,785 (McHale et al. 2009, igual que CC-070) | 9,7–102,1 | 520, tablas 9 y 11 | `propia_urbana` |

**Componentes:** volumen exterior a la corteza de tronco y ramas (madera verde) × densidad básica = biomasa aérea leñosa; sin hojas ni raíces. **No se usan** los factores de la UTD para raíces (1,28) ni su fracción 0,5: se mantiene la cadena de SIVU (× 0,47).

**Limitaciones:** las ecuaciones generales no son de la especie ni del género (árboles urbanos de EE. UU.); sin rango de altura publicado (la altura no se controla); densidad de madera aplicada al volumen con corteza; DAP a 1,30 m frente a 4,5 ft. Sin densidad de la especie no hay modelo (*Beilschmiedia miersii*, *Araucaria heterophylla*): no se usan promedios de género.

## 6. PROPUESTA EXPERIMENTAL · Variación anual del carbono aéreo total (2026-11-21)

Para las especies con carbono directo (sección 4): ΔDAP con el crecimiento de i-Tree Eco del secuestro anual (sin cambios) y variación = (C(DAP + ΔDAP) − C(DAP)) × 44/12 con la ecuación de Cruz et al. 2015. Incluye hojas: **no** es el secuestro leñoso de SIVU ni la captura fotosintética. Siempre simulación, sin total. Código: `rules/carbono/variacionAereoTotal.ts`.

## 7. PROPUESTA EXPERIMENTAL · Multifustales con el DAP equivalente de i-Tree Eco (2026-11-21)

Solo para las ecuaciones de volumen urbano (secciones 3 y 5), nunca para el carbono directo. Un multifustal con los diámetros de al menos dos fustes usa el DAP único de i-Tree Eco: DAP = (AB / 0,00007854)^0,5 = √Σdᵢ² (Nowak, D. J. 2024, *Understanding i-Tree: 2023 Summary of Programs and Methods*, GTR NRS-200-2023, p. 22), que debe coincidir con el DAP equivalente registrado (D-18) con una tolerancia de 0,05 cm. El resultado es siempre exploratorio (`estado_resultado`), aunque el modelo esté aprobado: no suma al total ni puede ser estimación fundamentada. Limitación: el protocolo de la UTD mide los multifustales bajo la bifurcación cuando es posible (PSW-GTR-253, p. 49), así que la compatibilidad con cada ecuación no está demostrada. Sin diámetros de fustes, o con un DAP que no coincide, no se estima.

## 8. Lo que queda pendiente

- Leer el apéndice 11 de Nowak 2020 y la tabla B.1 de CARB 2010 cuando se puedan descargar, y anotar su verificación aquí.
- Confirmar en el original la tabla 4.3 del IPCC 2006 (fracción 0,47), como pide CC-069.
- Llevar los modelos al Excel maestro (hoja de modelos propuesta en CC-069), con estas mismas referencias, incluidos los de carbono directo (sección 4).
- Carbono aéreo total: tratamiento de multifustales, validación urbana y secuestro anual de quillay y peumo (decisiones de la responsable).
