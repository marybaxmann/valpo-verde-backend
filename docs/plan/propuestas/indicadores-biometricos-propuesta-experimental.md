# Secuestro anual de CO₂ en SIVU: propuesta metodológica experimental consolidada

| | |
|---|---|
| **Estado** | Propuesta experimental. Se solicita al equipo **aprobar la integración experimental del backend en el entorno de pruebas** (sección 8.1), que es distinta de la aprobación metodológica definitiva (sección 8.2). **No es metodología vigente.** |
| **Versión** | 2026-11-21. Reemplaza las versiones anteriores de esta propuesta y el resumen `carbono-directo-revision-equipo.md`. |
| **Datos** | Piloto Valparaíso, base de pruebas: 98 árboles presentes, 49 con evaluación completa vigente y 18 especies identificadas. |
| **Excel maestro, OT y mediciones** | Sin cambios. |

## 1. Objetivo y justificación

**Objetivo.** Ampliar, con respaldo bibliográfico, la cobertura del secuestro anual de CO₂ a todas las especies evaluadas del Piloto en que exista un procedimiento defendible, y dejar a cada árbol con un estado metodológico justificado.

**Por qué ampliarla.**
- Con la metodología vigente, solo 25 de los 49 árboles evaluados tienen una simulación de secuestro, porque solo 5 especies tienen ecuación de carbono.
- La bibliografía ya verificada en el proyecto permite cubrir más especies sin coeficientes nuevos ni supuestos propios:
  - la Urban Tree Database (UTD), con sus ecuaciones generales urbanas y su asignación por especie;
  - la Global Wood Density Database (GWDD);
  - i-Tree Eco;
  - Cruz et al. 2015.

## 2. Metodología vigente frente a metodología experimental

### 2.1 Tres indicadores distintos

| Indicador | Definición | Unidad |
|---|---|---|
| **Carbono almacenado** | Carbono contenido hoy en el árbol, con la medición vigente (stock). | kg C por árbol |
| **Variación anual proyectada del carbono almacenado** («secuestro bruto anual», como en i-Tree Eco) | S_CO₂ = [C(DAP + ΔDAP) − C(DAP)] × 44/12 (flujo proyectado). | kg CO₂ por árbol y año |
| **Captura fotosintética** | CO₂ fijado por fotosíntesis, del que una parte se respira. | **SIVU no la calcula** |

El carbono **leñoso** (tronco y ramas) y el carbono **aéreo total** (con hojas) son componentes distintos. Cada uno tiene su propio indicador y **nunca se suman**.

### 2.2 Comparación

| Elemento | Vigente | Experimental |
|---|---|---|
| Ecuaciones de carbono leñoso | *Jacaranda mimosifolia* y *Liquidambar styraciflua* (CC-069); *Acer pseudoplatanus* (CC-070) | Además: ecuaciones generales urbanas de la UTD asignadas por especie; *Acer platanoides*; sustitutos de *Acer negundo* y *Ulmus minor* (ya en el catálogo como exploratorios) |
| Carbono aéreo total | — | *Quillaja saponaria* y *Cryptocarya alba* (Cruz et al. 2015), en un indicador aparte |
| Cadena del carbono leñoso | V × densidad básica × 0,47; CO₂ = C × 44/12 | Igual |
| Crecimiento diamétrico | i-Tree Eco: 0,58, 0,84 y 1,09 cm/año (lento, moderado y rápido) × factor de exposición lumínica de copa (CLE) × (1 − muerte regresiva); sin ajuste por heladas; altura constante | Igual. No hay tasas propias por especie |
| Multifustales | Excluidos | Exploratorio con el DAP equivalente por área basal de i-Tree Eco, **solo** en las ecuaciones de volumen urbano |
| Clasificación del resultado | Fundamentada solo con una categoría de crecimiento aprobada por especie; si no, simulación | Igual: **A** fundamentada, **B** simulación exploratoria, **C** no estimable |
| Totales oficiales | Suman solo resultados aprobados | Igual: ningún resultado experimental suma |

### 2.3 Criterios de clasificación

- **A. Estimación fundamentada.** La ecuación, la tasa de crecimiento de la especie, las variables, los componentes y las condiciones de aplicación tienen respaldo suficiente. No implica validación local.
- **B. Simulación exploratoria.** Cálculo posible con ecuaciones genéricas o sustitutas, multifustales con DAP equivalente o crecimiento por escenarios de i-Tree. La transferibilidad o la parametrización todavía no están justificadas.
- **C. No estimable.** Falta un dato indispensable o un procedimiento defendible.

**Por qué hoy no hay resultados A.** Ninguna especie del Piloto tiene una tasa o categoría de crecimiento documentada y aplicable:
- la tabla de especies de i-Tree no está disponible en el proyecto;
- los coeficientes de crecimiento de la UTD están en su conjunto de datos RDS-2016-0005, que no se revisó;
- el informe de Cruz et al. (2014) no estuvo accesible (sección 5.3).

No se eleva ninguna simulación a estimación fundamentada.

## 3. Las 18 especies del Piloto

- **Tasa:** para todas las especies con resultado, el crecimiento de i-Tree Eco de la sección 2.2, con el CLE y la muerte regresiva de cada árbol.
- **Rango de CO₂:** desde la categoría lenta del árbol menor hasta la rápida del mayor.
- **Columna «Evaluados»:** árboles con evaluación completa vigente; entre paréntesis, los multifustales.

| Especie | Evaluados (multif.) | Modelo y ecuación | Fuente | Tipo y transferibilidad | Clasificación | Cobertura | CO₂ anual simulado (kg/árbol) |
|---|---|---|---|---|---|---|---|
| *Acer negundo* | 12 (0) | V = 0,0019·D^1,785; ρ 420 | McHale et al. 2009, tabla 1; UTD tabla 11 | Sustituto del género (*A. platanoides*), urbano de EE. UU. | B | 11 B, 1 C (DAP 8,6 < 9,7 cm) | 6,64–38,27 |
| *Ulmus minor* | 11 (0) | V = 0,000338·D^0,855·H^2,041; ρ 570 | UTD tabla 9 (*U. pumila*); GWDD v2.2 | Sustituto del género, urbano de EE. UU. | B | 11 B | 4,95–29,48 |
| *Quillaja saponaria* | 5 (2) | C = 0,0736·D^2,251 (con hojas) | Cruz et al. 2015, cuadro 6 | Propio de la especie, no urbano | B (variación del carbono aéreo total) | 3 B, 2 C (multifustales) | 4,16–26,25 |
| *Acer pseudoplatanus* | 4 (2) | V = 0,0019·D^1,785; ρ 510 | CC-070 (McHale 2009; Sedlar et al. 2021) | Sustituto aprobado | B | 2 B (monofustales, modelo vigente) y 2 B (multifustales, DAP equivalente) | 11,75–29,74 |
| *Pittosporum undulatum* | 2 (0) | UGEB; ρ 745 | UTD tablas 9 y 11 | Genérico urbano asignado por la UTD | B | 2 B | 35,90–76,81 |
| *Beilschmiedia miersii* | 2 (0) | — | — | — | C | 2 C | — |
| *Cryptocarya alba* | 2 (1) | C = 0,0675·D^2,352 (con hojas) | Cruz et al. 2015, cuadro 6 | Propio de la especie, no urbano | B (variación del carbono aéreo total) | 1 B, 1 C (multifustal) | 5,70–11,18 |
| *Lagerstroemia indica* | 2 (1) | UGEB; ρ 571 (disponible) | UTD tablas 9 y 11 | Genérico urbano | C | 2 C (DAP 3,4 y 3,19 cm < 6 cm) | — |
| *Araucaria angustifolia* | 1 (0) | UGEC; ρ 450 | UTD tabla 9; GWDD v2.2 | Genérico urbano de coníferas | B | 1 B | 4,19–7,94 |
| *Ginkgo biloba* | 1 (0) | UGEB; ρ 520 | UTD tablas 9 y 11 | Genérico urbano asignado por la UTD | B, revisar medición | 1 B | 40,02–75,40 |
| *Schinus molle* | 1 (1) | UGEB; ρ 650; DAP equivalente | UTD tablas 9 y 11; Nowak 2024, p. 22 | Genérico urbano, multifustal | B | 1 B | 15,56–29,54 |
| *Jacaranda mimosifolia* | 1 (0) | V = 0,0000801·D^2,18578·H^0,548045; ρ 490 | CC-069 (Pillsbury et al. 1998; UTD) | Propio urbano, aprobado | B | 1 B | 6,47–12,23 |
| *Araucaria heterophylla* | 1 (0) | — | — | — | C | 1 C | — |
| *Ficus elastica* | 1 (0) | UGEB; ρ 500 | UTD tabla 9; GWDD v2.2 | Genérico urbano | B, revisar medición | 1 B | 46,21–86,99 |
| *Olea europaea* | 1 (0) | UGEB; ρ 700 | UTD tablas 9 y 11 | Genérico urbano asignado por la UTD | B | 1 B | 12,35–23,53 |
| *Acer platanoides* | 1 (0) | V = 0,0019·D^1,785; ρ 520 | McHale et al. 2009; UTD tablas 9 y 11 | Propio urbano | B | 1 B | 14,38–27,39 |
| *Pittosporum tobira* | 1 (0) | UGEB; ρ 650 | UTD tabla 9; GWDD v2.2 | Genérico urbano | B | 1 B | 4,75–9,23 |
| *Phoenix canariensis* | 0 | — | — | Palmera | Fuera del universo | Sin evaluación vigente | — |

Ecuaciones generales de la UTD (tabla 9), con V en m³ de madera verde, D en cm y H en m:
- **UGEB** (latifoliadas): V = 0,0001967 · D^1,951853 · H^0,664255, DAP 6 a 135 cm.
- **UGEC** (coníferas): V = 0,0000426 · D^2,24358 · H^0,64956, DAP 16 a 147 cm.

La densidad ρ está en kg/m³, como masa seca por volumen verde.

## 4. Resultados con los datos del Piloto Valparaíso

Resultados de la API local contra la base de pruebas, en solo lectura, para los 49 árboles con evaluación completa vigente.

| Resultado | Vigente | Experimental |
|---|---|---|
| A. Estimación fundamentada | 0 | **0** |
| B. Simulación del secuestro leñoso | 25 | **36** |
| B. Simulación de la variación del carbono aéreo total (indicador aparte) | — | **4** |
| **Árboles con alguna proyección anual** | 25 | **40 de 49** |
| C. No estimables | 24 | **9** |
| Carbono almacenado leñoso con modelo aprobado (suma al total) | 3 árboles, 141 kg C | 3 árboles, 141 kg C |
| Carbono almacenado leñoso exploratorio (no suma) | 22 | 33 |

Los 49 árboles presentes sin evaluación completa vigente quedan fuera del universo. Entre ellos están los quillayes A-000562 a A-000565, cuyas OT de inspección siguen en ejecución; no se usaron sus medidas registradas.

**Ejemplos verificados contra cálculos a mano:**

| Árbol | Datos | Resultado |
|---|---|---|
| A-000568 (quillay) | DAP 18,4 cm | 51,76 kg C aéreo total; variación de 13,73 a 26,25 kg CO₂/año |
| A-000505 (*Ginkgo biloba*) | DAP 84 cm, H 6,5 m | 950,2 kg C leñoso; 40,0 a 75,4 kg CO₂/año |
| A-000527 (*Schinus molle*, multifustal) | Fustes de 14,6 y 18,3 cm → DAP equivalente 23,41 cm | 86,7 kg C; 15,6 a 29,5 kg CO₂/año |

**Valores extremos:**
- El mayor carbono almacenado es 1.589 kg C (*Ficus elastica*, A-000534), por debajo del umbral de 7.500 kg C desde el cual i-Tree Eco limita el secuestro (Nowak 2024, p. 43).
- El mayor secuestro simulado es 87,0 kg CO₂/año, en ese mismo árbol.

## 5. Justificación de las exclusiones y de los resultados exploratorios

### 5.1 Los 9 no estimables

| Árbol(es) | Motivo | Por qué no se fuerza |
|---|---|---|
| *Acer negundo* (1), DAP 8,6 cm | Fuera del rango de su ecuación (9,7 a 102,1 cm) | Pasar a una ecuación genérica solo porque la específica no cubre el árbol sería elegir el modelo según el resultado |
| *Lagerstroemia indica* A-000552 (3,4 cm) y A-000561 (multifustal, 3,19 cm equivalente) | Bajo el mínimo de UGEB (6 cm) | Extrapolar fuera de rango. La UTD advierte que la especie suele desmocharse (p. 27) |
| *Beilschmiedia miersii* (2) y *Araucaria heterophylla* (1) | Sin densidad de la especie | No figuran en la tabla 11 de la UTD ni en la GWDD v1 (Zanne et al. 2009) ni en la v2.2. No se usan promedios de género. Sin densidad no hay biomasa |
| Quillay A-000538 y A-000540, peumo A-000558 (multifustales) | El carbono directo no admite multifustales | No se demostró que el DAP equivalente sea compatible con el ajuste de Cruz et al. (sección 5.3) |

### 5.2 Por qué los resultados B no son fundamentados

- **Crecimiento:** son escenarios de tres categorías de i-Tree, sin categoría asignada a la especie y sin calibrar para Valparaíso.
- **Ecuaciones generales y sustitutas:** son genéricas urbanas o de otra especie del género, ajustadas con árboles de EE. UU.
- **Multifustales (3 árboles):**
  - usan el DAP único de i-Tree Eco, DAP = (AB / 0,00007854)^0,5 = √Σdᵢ² (Nowak 2024, p. 22);
  - ese valor coincide con el DAP equivalente registrado en SIVU (se comprueba con una tolerancia de 0,05 cm);
  - es la convención con que i-Tree aplica ecuaciones de volumen urbano del mismo tipo, pero el protocolo de la UTD mide los multifustales bajo la bifurcación cuando puede (p. 49), así que no está demostrado que sea compatible con cada ecuación;
  - por eso son siempre B, incluso con el modelo aprobado de *Acer pseudoplatanus*.
- **Quillay y peumo:**
  - la ecuación es de la especie, pero fue ajustada en el bosque mediterráneo e incluye hojas;
  - su resultado es una variación del carbono aéreo total, que no se compara ni se suma con el secuestro leñoso.
- **Mediciones a revisar:**
  - *Ginkgo biloba* A-000505 tiene DAP 84 cm con 6,5 m de altura;
  - *Ficus elastica* A-000534 tiene DAP 80,1 cm;
  - ambas mediciones están dentro del rango de la ecuación y no contradicen el protocolo, por lo que siguen como B;
  - conviene verificarlas en terreno, porque dan los valores más altos.

### 5.3 Tasas de Cruz et al. (2014)

La instrucción era usar sus tasas chilenas como escenarios exploratorios para quillay y peumo.
- El informe no estuvo accesible el 2026-11-21: el dominio `gefmontanacurso.mma.gob.cl` no resuelve y no se encontró otra copia.
- No se usaron tasas de memoria ni de fuentes secundarias.
- Quillay y peumo conservan los tres escenarios de i-Tree.
- Para incorporar esas tasas como escenario adicional basta el PDF o las cifras con su página y tabla. El cálculo ya admite escenarios de crecimiento sin otros cambios.
- El mismo informe (p. 24) menciona individuos simpódicos; su método de medición decidirá si los multifustales de quillay y peumo pueden incorporarse.

### 5.4 Comprobaciones científicas realizadas

| Comprobación | Resultado |
|---|---|
| Volumen y densidad | Las ecuaciones de la UTD y de McHale estiman volumen de madera verde. Las densidades de la UTD (DW density) y de la GWDD (`wsg`: masa seca en estufa por volumen fresco) son densidades básicas. El producto da biomasa seca. Consistente |
| Componentes | Las ecuaciones de volumen dan tronco y ramas con corteza, sin hojas ni raíces: componente leñoso. Cruz et al. dan tallo, ramas, ramillas y hojas, sin raíces: componente aéreo total. Indicadores separados |
| DAP a 1,30 m frente a 1,37 m | SIVU y Cruz et al. miden a 1,30 m. La UTD y McHale miden a 1,37 m. No hay corrección publicada para estas especies: se documenta como limitación y no se corrige |
| Rangos | Se exige que el DAP vigente y el proyectado estén dentro del rango en las tres categorías. La altura se controla solo donde la fuente publica su rango |
| Compatibilidad con la diferencia de existencias | Todas las funciones son crecientes en el DAP (exponentes positivos), así que S_CO₂ ≥ 0. Se usa el mismo modelo en C(DAP) y en C(DAP + ΔDAP) |
| Dobles conversiones | El carbono directo no se multiplica por 0,47 ni por la densidad. Los factores 1,28 (raíces) y 0,5 de la UTD no se usan |
| Dobles conteos | Cada árbol recibe un modelo por componente. Los indicadores leñoso y aéreo total no se suman. Ningún resultado exploratorio entra en un total |
| Trazabilidad del crecimiento | Las tasas y los factores son los de Nowak 2024 (pp. 44-45), sin modificar. No se aplica el ajuste por días libres de heladas (decisión B) |
| Unidades y extremos | kg C y kg CO₂ por árbol y año. Ningún árbol supera los 7.500 kg C |

### 5.5 Verificación final antes de la integración experimental (2026-11-21)

Hecha con la API local contra la base de pruebas (49 árboles evaluados) y con las 1.922 pruebas del backend. **Ninguna verificación encontró errores que invaliden los cálculos.**

| Verificación | Evidencia | Resultado |
|---|---|---|
| 1. Volumen de UGEB y UGEC frente a densidad | UTD, tabla 9 (notas a y b, p. 71): V es el volumen aéreo en m³ por árbol; DW density es la biomasa seca en kg por m³. La p. 73 dice que las ecuaciones generales predicen volumen de madera fresca, que se multiplica por la densidad de peso seco para obtener biomasa aérea seca. La GWDD v1 define la densidad como masa seca en estufa por volumen fresco; los g/cm³ se multiplican por 1.000 para obtener kg/m³. Componente leñoso: las ecuaciones de volumen no incluyen follaje, y la UTD marca aparte las ecuaciones rurales a las que resta el follaje (tabla 10). | **Pasa** |
| 2. DAP a 1,30 m frente a 1,37 m | Las ecuaciones de la UTD y de McHale usan 1,37 m; SIVU y Cruz et al., 1,30 m. Ninguna fuente publica una corrección para estas especies. Es la misma limitación que la metodología vigente ya declara para CC-069 y CC-070. Por la conicidad del fuste, el sesgo esperado es una leve sobrestimación. | **Pasa, con limitación declarada.** Sin factor de corrección |
| 3. Dobles conversiones y conteos | La suma de los resultados aprobados es igual al total oficial (140,670 kg C). Ningún árbol tiene a la vez carbono leñoso y aéreo total. No se usan los factores 1,28 (raíces) ni 0,5 de la UTD. El carbono directo no se multiplica por 0,47. | **Pasa** |
| 4. Variación anual con carbono directo | En los 4 árboles y sus 3 categorías, el valor de la API es igual a [a·(D+ΔD)^b − a·D^b] × 44/12 (diferencia < 10⁻⁹), con D + ΔD dentro de 5 a 41 cm (quillay) o 5 a 37 cm (peumo). | **Pasa** |
| 5. Separación de resultados | 0 fundamentadas; 36 simulaciones leñosas y 4 de carbono aéreo total, sin total; 9 no estimables, cada uno con motivo. Ningún DAP proyectado sale de su rango. | **Pasa** |
| 6. Mediciones cuestionables | A-000505 (*Ginkgo biloba*: 6,5 m de altura con DAP de 84 cm) y A-000534 (*Ficus elastica*: DAP de 80,1 cm) siguen como simulación, con el aviso «Medición en revisión, resultado no validado» en la ficha, y se cuentan aparte (`simulacion_medicion_en_revision`). No se corrige ningún dato. | **Pasa, identificados como no validados** |

## 6. Referencias

1. McPherson, E. G., van Doorn, N. S. y Peper, P. J. (2016). *Urban Tree Database and Allometric Equations*. USDA Forest Service, General Technical Report PSW-GTR-253. https://doi.org/10.2737/PSW-GTR-253
   - Tabla 9, p. 70: ecuaciones de volumen, UGEB y UGEC.
   - Tabla 11, pp. 73-82: ecuación asignada y densidad por especie.
   - p. 73: uso de las ecuaciones generales.
   - p. 49: medición del DAP en multifustales.
   - p. 27: *Lagerstroemia*.
   - Copia verificada: SHA-256 `0765570c…97b1c7`.
2. Zanne, A. E. et al. (2009). Global Wood Density Database. Dryad. https://doi.org/10.5061/dryad.234
   - v1, consultada para *B. miersii* y *A. heterophylla*.
   - v2.2 (Zenodo, 2026): https://zenodo.org/records/18262736, `gwddagg_v2.2_binomial.csv`, columna `wsg_est` (SHA-256 `d7158322…49e975d`).
3. Nowak, D. J. (2024). *Understanding i-Tree: 2023 Summary of Programs and Methods*. USDA Forest Service, GTR NRS-200-2023.
   - p. 22: DAP de multifustales.
   - p. 43: límite para árboles grandes.
   - pp. 44-45: crecimiento diamétrico.
4. McHale, M. R., Burke, I. C., Lefsky, M. A., Peper, P. J. y McPherson, E. G. (2009). Urban forest biomass estimates: is it important to use allometric relationships developed specifically for urban trees? *Urban Ecosystems* 12: 95-113, tabla 1.
5. Cruz, P., Bascuñan, A., Velozo, J. y Rodríguez, M. (2015). Funciones alométricas de contenido de carbono para quillay, peumo, espino y litre. *Bosque* 36(3): 375-381. https://doi.org/10.4067/S0717-92002015000300005
   - p. 376: componentes.
   - p. 379, cuadros 5 y 6: carbono por componente, ecuaciones, muestras y rangos.
6. Cruz, P., Bascuñán, A. y Velozo, J. (2014). *Funciones alométricas para el bosque mediterráneo chileno*. Informe final OTERRA, Universidad Mayor. No accesible el 2026-11-21 (sección 5.3).
7. Pillsbury, N. H., Reimer, J. L. y Thompson, R. P. (1998). *Tree volume equations for fifteen urban species in California*. Urban Forest Ecosystems Institute, Cal Poly, tablas 6 a 8.
8. Sedlar, T., Šefc, B., Stojnić, S. y Sinković, T. (2021). *Croatian Journal of Forest Engineering* 42(3): 543-560, tabla 1.
9. IPCC (2006). *Guidelines for National Greenhouse Gas Inventories*, vol. 4, cap. 4, tabla 4.3 (fracción de carbono 0,47).

## 7. Limitaciones científicas y condiciones para una aprobación definitiva

**Limitaciones:**
- No hay tasas de crecimiento por especie ni calibración para Valparaíso.
- Ninguna ecuación genérica o sustituta se validó con árboles locales.
- El DAP se mide a alturas distintas (1,30 m y 1,37 m) y no se corrige.
- La densidad se aplica a madera con corteza.
- La altura se supone constante.
- Faltan la reducción de crecimiento cerca del diámetro máximo de la especie (i-Tree, Nowak 2024, p. 45) y la mortalidad.

**Condiciones para pasar un resultado de B a A:**
1. Una categoría o tasa de crecimiento por especie con fuente verificada y condiciones compatibles.
2. Una ecuación de la especie o una asignación aprobada por el equipo, con sus componentes declarados.
3. Para multifustales, demostrar que el método de DAP es compatible con el ajuste de cada ecuación.
4. Revisar en terreno las mediciones atípicas.
5. Registrar un CC y sincronizar el Excel.

## 8. Decisiones que debe tomar el equipo

La propuesta pide **dos aprobaciones distintas**. La primera habilita el módulo como **versión experimental en el entorno de pruebas**. La segunda, que vendrá después, lo convertiría en **metodología oficial**. Aprobar la primera no implica la segunda.

### 8.1 Aprobación de la integración experimental (la que se solicita ahora)

**Qué se aprueba.** Integrar el backend experimental en la rama de integración `feature/fase6-backend-api`, que no es producción, para probarlo con los datos del Piloto:
- el PR #94 primero;
- después el PR #95, actualizando antes su rama base a `feature/fase6-backend-api`.

**Condiciones que se mantienen después de integrar:**
1. Todo resultado nuevo sigue rotulado como **exploratorio o experimental** y **no suma a ningún total oficial**. Los totales oficiales siguen siendo los de la metodología vigente: 141 kg C de carbono leñoso almacenado y secuestro fundamentado nulo.
2. Los **40 árboles con proyección** se presentan como simulaciones, no como estimaciones fundamentadas:
   - 36 de secuestro leñoso;
   - 4 de variación del carbono aéreo total.
3. Los **9 no estimables** se conservan como tales, con sus motivos (sección 5.1). No se busca completar el 100 %.
4. Los **3 multifustales** siguen exploratorios. El DAP equivalente por área basal es una convención de i-Tree Eco, no una validación de su aplicación a cada ecuación de volumen.
5. A-000505 y A-000534 siguen identificados con «Medición en revisión».
6. El **frontend** (PR #37 y #38) **no se integra**, porque su rama de destino publica en sivu.cl. Se prueba con las vistas previas de Vercel hasta que su publicación se autorice aparte.
7. No se modifican el Excel maestro, las OT, las mediciones originales ni los cálculos oficiales.

**Puntos a confirmar para esta aprobación:**
- (a) que «secuestro anual» se presente como variación proyectada del carbono, nunca como captura fotosintética (sección 2.1);
- (b) que el carbono leñoso y el carbono aéreo total se muestren por separado y nunca se sumen;
- (c) que los modelos exploratorios de la sección 3 se usen solo para estas simulaciones.

### 8.2 Aprobación metodológica definitiva (posterior y separada)

Para que algún resultado pase a ser oficial o fundamentado, el equipo debe resolver, en una aprobación aparte:
1. La asignación de la UTD (tabla 11 y ecuaciones generales) y el nivel de confianza `generica_urbana`.
2. La regla de densidad: primero la tabla 11 de la UTD y luego la GWDD; sin densidad de la especie, no estimable.
3. El tratamiento de los multifustales, que requiere demostrar la compatibilidad con cada ecuación.
4. El carbono directo de quillay y peumo y su variación anual del carbono aéreo total como indicador oficial.
5. Las tasas o categorías de crecimiento por especie con fuente verificada, empezando por Cruz et al. (2014). Es la condición para que exista una estimación fundamentada.
6. La revisión en terreno de A-000505 y A-000534.
7. La formalización: registrar un CC, sincronizar el Excel (filas 14 y 15 de INDICES, hoja de modelos y VERSION) y solo entonces publicar en producción.

### 8.3 Registro de las decisiones

| Aprobación | Decisión del equipo | Fecha | Observaciones |
|---|---|---|---|
| 8.1 Integración experimental (backend #94 y #95 en `fase6`) | Pendiente | | |
| 8.2 Aprobación metodológica definitiva | Pendiente | | |
| Publicación del frontend (#37 y #38 en sivu.cl) | Pendiente | | |

## 9. Implementación, pruebas y PR

| Repositorio | PR (borrador) | Contenido |
|---|---|---|
| Backend | #94 | Carbono directo de quillay y peumo (indicador aparte) |
| Backend | #95, sobre #94 | Modelos de la UTD por especie, *Acer platanoides*, multifustales con DAP equivalente, variación anual del carbono aéreo total, avisos por origen de la ecuación y comprobaciones del catálogo |
| Frontend | #37 | Ficha con carbono aéreo total |
| Frontend | #38, sobre #37 | «Secuestro anual» explicado como variación proyectada, variación del carbono aéreo total, rótulos por origen de la ecuación y multifustal |

**Pruebas del backend:** `npx jest` pasa completo (94 suites, 1.922 pruebas). Cubren:
- valores por árbol calculados a mano;
- límites de rango;
- especies sin densidad;
- multifustales con y sin fustes, y con DAP inconsistente;
- separación de componentes;
- multifustal nunca fundamentado;
- no regresión de los totales oficiales;
- integración en la ficha y en la vista del proyecto.

**Pruebas del frontend:** `tsc`, `build` y `lint` sin errores. Revisión en el navegador con la API local y la base de pruebas.

**Fuera del alcance:** sin migraciones y sin cambios en el Excel maestro, las OT ni las mediciones. Nada se fusionó ni se desplegó.
