# Indicadores del arbolado y aportes ambientales en SIVU

**Qué se calcula, con qué datos y de dónde sale cada método**

| | |
|---|---|
| Estado | Metodología vigente desde el 2026-11-23 (CC-087, aprobada por la responsable y el equipo). Paquete metodológico 3.4.1. |
| Dónde se ve | Plataforma → Ciudadanía → Indicadores (vista del proyecto y ficha de cada árbol). |
| Código | Backend: `src/services/rules/indicadores/` y `src/services/rules/carbono/`. |

---

## 1. La idea en un párrafo

Los instrumentos climáticos nacionales y comunales piden indicadores que describan el arbolado y estimen lo que aporta al ambiente: la cobertura arbórea, el carbono que guarda y que captura cada año, los contaminantes que remueve del aire y la lluvia que intercepta. Esos indicadores se pueden estimar con variables básicas del inventario: especie, diámetro, altura y condición del árbol (Nowak, 2024). SIVU usa justamente esas variables, que el inspector registra en terreno, y les aplica los métodos de **i-Tree Eco**, la herramienta del Servicio Forestal de EE. UU. que es referencia internacional para el arbolado urbano. Donde i-Tree necesita datos del lugar (clima, contaminación), SIVU usa series públicas de Valparaíso.

---

## 2. Qué datos del árbol se usan

| Variable | Para qué sirve |
|---|---|
| **Especie** | Elegir la ecuación de biomasa, la densidad de la madera, el tipo de follaje y la velocidad de crecimiento. |
| **Diámetro (DAP, a 1,30 m)** | Tamaño del tronco: base del carbono y del crecimiento. En árboles con varios fustes se usa el DAP equivalente de i-Tree (√Σd²). |
| **Altura total** y **base de la copa viva** | Volumen del árbol y altura de la copa. |
| **Diámetros de copa** (norte-sur y este-oeste) | Área de sombra, cobertura y área de hojas. |
| **Condición**: copa faltante, muerte regresiva y exposición lumínica (CLE) | Reducir las hojas de un árbol dañado y ajustar su crecimiento. |
| **Ubicación** (coordenadas) | Unir las copas que se tocan para medir la cobertura. |

Solo entran los árboles **presentes** con una **evaluación completa vigente**: así todos los indicadores usan medidas revisadas y del mismo momento.

---

## 3. Indicadores, uno por uno

### 3.1 Resumen del arbolado

| Indicador | Qué es | Cómo se obtiene |
|---|---|---|
| Árboles presentes | Árboles en pie del proyecto | Conteo; cada árbol una vez. |
| Riqueza de especies | Cuántas especies distintas hay | Conteo de especies. |
| Diversidad de Shannon | Diversidad según cuántas especies hay y qué tan parejas son | H′ = −Σ pᵢ · ln pᵢ. |
| Densidad arbórea | Árboles por hectárea | Árboles ÷ hectáreas del sector. |
| Diámetro medio de copa | Ancho típico de las copas | Promedio de los diámetros de copa. |
| Área de copa | Sombra que proyectan las copas | Cada copa como elipse: π × (N-S/2) × (E-O/2), sumadas. |

Fuente: hoja INDICES del Excel maestro (filas 3 a 13).

### 3.2 Cobertura arbórea

**Qué es:** el porcentaje del sector cubierto por copas vistas desde arriba.

**Cómo se calcula:** se dibuja cada copa como una elipse en su ubicación real y se mide la superficie que cubren todas juntas. Donde dos copas se tocan, ese pedazo se cuenta **una sola vez** (por eso es algo menor que la suma de las áreas de copa). Luego se divide por la superficie del sector.

### 3.3 Carbono almacenado

**Qué es:** el carbono que el árbol tiene guardado hoy en su madera (y, según el modelo, en sus hojas).

**Cómo se calcula:** para cada árbol se elige el **mejor modelo disponible**, en este orden: ecuación de la especie → de su género → ecuación general urbana. Hay tres caminos:

1. **Volumen × densidad:** una ecuación da el volumen de madera a partir del diámetro y la altura; se multiplica por la densidad de la madera (masa seca) y por 0,47, la fracción de carbono de la madera seca (IPCC, 2006).
2. **Carbono directo:** para quillay y peumo hay ecuaciones chilenas que dan el carbono directamente (Cruz et al., 2015).
3. **Biomasa aérea:** para palmeras y para árboles muy pequeños se usan las ecuaciones de biomasa de i-Tree (Nowak, 2024, apéndice 10).

El carbono se expresa también como **CO₂ equivalente** (× 44/12).

| Especies del Piloto | Modelo |
|---|---|
| Jacarandá, liquidámbar | Ecuación de la especie (Pillsbury et al., 1998) |
| Arces (*Acer*) | Ecuación de *Acer platanoides* (McHale et al., 2009) |
| Olmo | Ecuación de *Ulmus pumila* (McPherson et al., 2016) |
| Olmo y acer negundo (total con raíces) | Biomasa del árbol completo (Zhang et al., 2026) |
| Pitosporos, ginkgo, olivo, pimiento, gomero, belloto | Ecuación general urbana de latifoliadas, UGEB (McPherson et al., 2016) |
| Araucarias | Ecuación general urbana de coníferas, UGEC (McPherson et al., 2016) |
| Quillay, peumo | Carbono directo (Cruz et al., 2015) |
| Crespón pequeño (< 6 cm) | Ecuación del género *Lagerstroemia* de i-Tree |
| Palmera canaria | Ecuación general de palmeras de i-Tree |

La densidad de la madera sale de la Urban Tree Database (McPherson et al., 2016) o, si la especie no está, de la Global Wood Density Database (Zanne et al., 2009; v2.2). Para el belloto y la *Araucaria heterophylla* se usa la densidad promedio de su género.

### 3.4 Secuestro anual de carbono

**Qué es:** cuánto CO₂ más guardará el árbol en un año por crecer. No es la fotosíntesis total, sino el aumento del carbono almacenado.

**Cómo se calcula:**
1. Se proyecta cuánto crecerá el diámetro en un año con las tasas de i-Tree: 0,58 cm (lento), 0,84 cm (moderado) o 1,09 cm (rápido), según la especie.
2. Esa tasa se ajusta por la luz que recibe la copa (CLE) y por su muerte regresiva.
3. Secuestro = carbono con el diámetro del próximo año − carbono de hoy, en CO₂.

La velocidad de crecimiento de cada especie es la que publica la base de especies de i-Tree. Dos especies sin ese dato (peumo y belloto) muestran el rango de los tres escenarios.

### 3.5 Proyección de crecimiento

**Qué es:** cómo cambiaría el diámetro del árbol en 1, 5, 10 y 20 años.

**Cómo se calcula:** con las mismas tasas y ajustes del secuestro, en los tres escenarios (lento, moderado y rápido). Supone condiciones constantes; no es una predicción.

### 3.6 Área foliar

**Qué es:** la superficie total de las hojas del árbol (una cara). Es la base de la remoción de contaminantes y de la interceptación de lluvia.

**Cómo se calcula:** con la ecuación de Nowak (1996), la misma de i-Tree, que usa la altura de la copa, su ancho y un factor de sombra (qué tan densa es la copa). Si la copa está incompleta, el resultado se reduce en el porcentaje de copa faltante. A las palmeras no se les aplica.

### 3.7 Remoción de contaminantes

**Qué es:** cuántos gramos de ozono (O₃), dióxido de nitrógeno (NO₂), dióxido de azufre (SO₂), material particulado (PM10) y monóxido de carbono (CO) quedan atrapados en las hojas en un año.

**Cómo se calcula:** hora a hora durante 2025, **contaminante en el aire × velocidad con que se deposita en las hojas × superficie de la copa**. La velocidad depende de cuántas hojas tiene el árbol y de si es de día. Cuando llueve no se cuenta. Los árboles de hoja caduca pierden casi todo su efecto de junio a agosto.

**Datos del lugar:** concentraciones horarias de contaminantes y clima de Valparaíso en 2025 (Open-Meteo, a partir de los servicios europeos Copernicus).

### 3.8 Interceptación de lluvia

**Qué es:** el agua de lluvia que las hojas retienen y se evapora sin llegar al suelo, lo que alivia los desagües.

**Cómo se calcula:** con el modelo de i-Tree, hora a hora. La copa funciona como una esponja pequeña: se llena con la lluvia hasta su capacidad, que depende de la cantidad de hojas, y se vacía al evaporarse. Se usa la lluvia y la evaporación horarias de Valparaíso en 2025.

---

## 4. Cómo se obtuvo cada índice

Todos salen de datos que SIVU ya registra en el inventario y en la evaluación del árbol. La columna «Fila» es la de la hoja INDICES del Excel maestro, donde está la definición oficial.

### 4.1 Estructura y composición del arbolado

| Índice | Datos que usa | Cómo se obtiene | Fuente | Fila |
|---|---|---|---|---|
| Número de árboles presentes | Presencia del árbol | Se cuenta cada árbol en pie una vez (incluye muertos en pie; excluye talados o retirados con OT aprobada). | Inventario de SIVU | 3 |
| Densidad arbórea | Árboles presentes, superficie del sector | Árboles ÷ (m² del sector ÷ 10.000). Solo por proyecto. | Inventario de SIVU | 4 |
| Riqueza de especies | Especie | Número de especies distintas. | Inventario de SIVU | 5 |
| Abundancia relativa | Especie | Árboles de la especie ÷ árboles presentes × 100. | Inventario de SIVU | 6 |
| Diversidad de Shannon (H′) | Especie | H′ = −Σ pᵢ · ln pᵢ, con pᵢ la proporción de cada especie. | Shannon (1948) | 7 |
| Regla 10-20-30 | Especie, género, familia | Porcentaje de árboles del taxón más común, comparado con ≤ 10 % por especie, ≤ 20 % por género y ≤ 30 % por familia. | Santamour (1990) | 8 |
| Proporción de nativos e introducidos | Origen de la especie (catálogo) | Árboles nativos o endémicos (o introducidos) ÷ árboles presentes × 100. | Catálogo de especies de SIVU | 9 y 10 |
| Clases diamétricas | DAP | Árboles por tramos de 10 cm de DAP. | Inventario de SIVU | 11 |
| Diámetro medio de copa | Diámetros de copa N-S y E-O | Promedio del diámetro de copa de cada árbol. | Inventario de SIVU | 12 |
| Área de copa | Diámetros de copa N-S y E-O | Cada copa como elipse, π × (N-S/2) × (E-O/2); se suman. | Inventario de SIVU | 13 |

### 4.2 Aportes ambientales (Nowak, 2024)

| Índice | Datos que usa | Cómo se obtiene | Fuente | Fila |
|---|---|---|---|---|
| Cobertura arbórea | Diámetros de copa, ubicación, superficie del sector | Unión de las copas (la superposición cuenta una vez) ÷ superficie × 100. | Método propio de SIVU sobre el área de copa (fila 13); concepto de Nowak (2024) | 16 |
| Carbono almacenado | Especie, DAP, altura | Mejor modelo por árbol: volumen × densidad × 0,47, carbono directo o biomasa × 0,47. | McPherson et al. (2016); Pillsbury et al. (1998); McHale et al. (2009); Cruz et al. (2015); Zhang et al. (2026); Zanne et al. (2009); Nowak (2024, ap. 10); IPCC (2006) | 14 |
| Secuestro anual | Especie, DAP, altura, CLE, muerte regresiva | Carbono con el DAP del próximo año − carbono de hoy, en CO₂. | Nowak (2024, pp. 44-45) y los modelos del carbono almacenado | 15 |
| Proyección de crecimiento | DAP, CLE, muerte regresiva | DAP + años × tasa de crecimiento ajustada, en tres escenarios. | Nowak (2024, pp. 44-45) | 17 |
| Área foliar | Especie, altura de copa, diámetro de copa, copa faltante | Ecuación de Nowak (1996) con los ajustes de rango de i-Tree. | Nowak (1996), según Nowak (2024, pp. 22-24) | 20 |
| Remoción de contaminantes | Área foliar, área de copa, follaje caduco o perenne | Hora a hora: concentración × velocidad de deposición × área de copa, sin lluvia. | Nowak et al. (2006); datos Open-Meteo (CAMS) 2025 | 22 |
| Interceptación de lluvia | Área foliar, área de copa | Modelo de la copa como esponja: se llena con la lluvia y se vacía al evaporarse. | Hirabayashi (2013); datos Open-Meteo (ERA5) 2025 | 24 |

### 4.3 Descripción del estado de los árboles

Son resúmenes de lo que el inspector registra (altura, proporción de copa viva, clase de edad, condición de copa). No aplican ecuaciones ni están en la hoja INDICES: describen el arbolado, pero no son aportes ambientales.

## 5. Supuestos y límites que conviene conocer

- Las ecuaciones de biomasa y los parámetros de i-Tree se ajustaron sobre todo con árboles de EE. UU.; ninguna se calibró en Valparaíso.
- La contaminación viene de un modelo (CAMS), no de una estación de monitoreo en la ciudad.
- Se supone que los árboles de hoja caduca están sin hojas de junio a agosto.
- La ecuación de palmeras proviene de palmeras tropicales más delgadas que la palmera canaria: su resultado es aproximado.
- En copas muy altas y angostas el área foliar se limita a 18 m² de hojas por m² de copa; esos árboles quedan marcados para revisar su medición.
- Todavía no se calculan la **biomasa foliar** (falta el factor de masa de hoja por especie) ni la **escorrentía evitada** (falta saber qué superficie hay bajo cada copa).

---

## 6. Bibliografía

1. **Nowak, D. J. (2024).** *Understanding i-Tree: 2023 Summary of Programs and Methods.* USDA Forest Service, General Technical Report NRS-200-2023. https://doi.org/10.2737/NRS-GTR-200-2023. Área foliar (pp. 22-24), crecimiento (pp. 44-45), DAP de multifustales (p. 22) y apéndice 10 (ecuaciones de biomasa).
2. **Nowak, D. J. (1996).** Estimating leaf area and leaf biomass of open-grown deciduous urban trees. *Forest Science*, 42(4), 504-507.
3. **Nowak, D. J., Crane, D. E. y Stevens, J. C. (2006).** Air pollution removal by urban trees and shrubs in the United States. *Urban Forestry & Urban Greening*, 4, 115-123.
4. **Hirabayashi, S. (2013).** *i-Tree Eco Precipitation Interception Model Descriptions*, v1.3. The Davey Tree Expert Company. Basado en Wang, J., Endreny, T. A. y Nowak, D. J. (2008), *Journal of the American Water Resources Association*.
5. **McPherson, E. G., van Doorn, N. S. y Peper, P. J. (2016).** *Urban Tree Database and Allometric Equations.* USDA Forest Service, General Technical Report PSW-GTR-253. https://doi.org/10.2737/PSW-GTR-253
6. **Pillsbury, N. H., Reimer, J. L. y Thompson, R. P. (1998).** *Tree volume equations for fifteen urban species in California.* Urban Forest Ecosystems Institute, Cal Poly.
7. **McHale, M. R., Burke, I. C., Lefsky, M. A., Peper, P. J. y McPherson, E. G. (2009).** Urban forest biomass estimates: is it important to use allometric relationships developed specifically for urban trees? *Urban Ecosystems*, 12, 95-113.
8. **Zhang, R., Wang, L., Tian, X. y Song, Y. (2026).** Carbon budget of common urban tree species in an arid city based on life cycle assessment. *PLoS ONE*, 21(4), e0345213. https://doi.org/10.1371/journal.pone.0345213
9. **Cruz, P., Bascuñán, A., Velozo, J. y Rodríguez, M. (2015).** Funciones alométricas de contenido de carbono para quillay, peumo, espino y litre. *Bosque*, 36(3), 375-381. https://doi.org/10.4067/S0717-92002015000300005
10. **Zanne, A. E. et al. (2009).** *Global Wood Density Database.* Dryad. https://doi.org/10.5061/dryad.234 (versión 2.2, Zenodo: https://zenodo.org/records/18262736).
11. **Peper, P. J. y McPherson, E. G. (1998).** Comparison of five methods for estimating leaf area index of open-grown deciduous trees. *Journal of Arboriculture*, 24(2), 98.
12. **IPCC (2006).** *Guidelines for National Greenhouse Gas Inventories*, vol. 4, cap. 4, tabla 4.3 (fracción de carbono 0,47).
13. **Shannon, C. E. (1948).** A Mathematical Theory of Communication. *Bell System Technical Journal*, 27, 379-423.
14. **Santamour, F. S. (1990).** Trees for Urban Planting: Diversity, Uniformity, and Common Sense. *Proceedings of the 7th Conference of the Metropolitan Tree Improvement Alliance (METRIA)*, 7, 57-65.
15. **Open-Meteo (2025).** Historical Weather API (ERA5, Copernicus/ECMWF) y Air Quality API (CAMS, Copernicus). Licencia CC BY 4.0. https://open-meteo.com

---

*Documento para lectura general. El detalle técnico de cada modelo está en `docs/metodologia/carbono-referencias.md` y en el registro de cambios (CC-069, CC-070 y CC-087).*
