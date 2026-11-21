# Indicadores biométricos y secuestro anual de CO₂: propuesta experimental consolidada

| | |
|---|---|
| **Estado** | **Propuesta experimental para revisión del equipo.** No es metodología vigente. |
| **Implementación** | Backend `feature/indicadores-experimental`, sobre `feature/carbono-directo` (PR #94). Frontend `feature/indicadores-experimental`, sobre `feature/carbono-aereo-total` (PR #37). Todos los PR están en borrador y **no se fusionan ni despliegan sin aprobación**. |
| **Excel maestro** | Sin cambios. Las reglas vigentes no se reemplazan. |
| **Fecha y datos** | 2026-11-21. Piloto Valparaíso en la base de pruebas: 98 árboles presentes, 49 con evaluación completa vigente y 18 especies identificadas. |

Este documento reemplaza como propuesta única a `carbono-directo-revision-equipo.md`, que queda como antecedente.

## 1. Tres indicadores distintos

| Indicador | Qué mide | En SIVU |
|---|---|---|
| **Carbono almacenado** | Carbono contenido hoy en el árbol, con la medición vigente. Es un *stock*. | **Leñoso** (tronco y ramas, sin hojas ni raíces): CC-069 y CC-070, **vigente**. **Aéreo total** (con hojas, sin raíces): propuesta experimental. |
| **Variación anual proyectada del carbono** («secuestro bruto anual», como en i-Tree Eco) | Aumento del carbono almacenado entre este año y el siguiente por crecimiento diamétrico: (C₁ − C₀) × 44/12. Es un *flujo proyectado*. | **Leñoso**: secuestro anual v1 (decisiones A a C; la decisión D sigue pendiente). **Aéreo total**: propuesta experimental separada, porque incluye hojas. |
| **Captura fotosintética** | CO₂ fijado por fotosíntesis, del que una parte vuelve por respiración. | **SIVU no la estima.** Ningún valor de SIVU debe presentarse como captura fotosintética. |

## 2. Qué permanece vigente e intacto

- **Carbono leñoso con modelos aprobados:** *Jacaranda mimosifolia*, *Liquidambar styraciflua* y *Acer pseudoplatanus*. En el Piloto, el total oficial sigue en 141 kg C (3 árboles).
- **Secuestro anual v1:**
  - mismo crecimiento de i-Tree Eco (0,58, 0,84 y 1,09 cm/año, según la categoría);
  - mismos factores de CLE y de muerte regresiva;
  - sin ajuste por heladas y con altura constante;
  - sin categorías aprobadas por especie, por lo que hoy no hay estimaciones fundamentadas;
  - el total oficial sigue en null.
- **Exclusiones vigentes:** multifustales, palmeras, árboles fuera de rango y árboles sin evaluación completa vigente.
- **Datos:** no hay migraciones ni cambios en datos, OT o vigencias.

## 3. Qué propone el desarrollo experimental

1. **Modelos sustitutos documentados y verificados para el carbono leñoso** (ya estaban en el catálogo como exploratorios, sin cambios): *Acer negundo* y *Ulmus minor*.
2. **Modelos de volumen de la Urban Tree Database** (nuevos y exploratorios), aplicados según la asignación que publica la propia UTD:
   - La UTD asigna la ecuación general urbana de latifoliadas (UGEB) a *Ginkgo biloba*, *Lagerstroemia indica*, *Olea europaea*, *Pittosporum undulatum* y *Schinus molle* (tabla 11). La densidad de cada especie sale de la misma tabla.
   - La UTD recomienda la ecuación general (latifoliadas UGEB o coníferas UGEC) con la densidad de la especie en la Global Wood Density Database cuando la especie no figura en la tabla 11 (p. 73). Así se aplica a *Ficus elastica* y *Pittosporum tobira* (UGEB) y a *Araucaria angustifolia* (UGEC).
   - *Acer platanoides* usa su propia ecuación (McHale et al. 2009), con los mismos coeficientes que el catálogo ya usa como sustituta, y su densidad de la UTD.
   - El cálculo es la cadena vigente: V × densidad × 0,47 × 44/12. Las ecuaciones UTD estiman volumen leñoso, así que el **secuestro anual vigente se aplica sin cambios**. Sus resultados son simulaciones exploratorias que no suman.
3. **Carbono directo de quillay y peumo** (Cruz et al. 2015; PR #94): carbono aéreo total con hojas, en un indicador aparte.
4. **Variación anual del carbono aéreo total** (nuevo): para las especies con carbono directo, el mismo procedimiento de crecimiento aplicado a la ecuación de carbono directo.
   - Es un tratamiento **separado** del secuestro leñoso, porque el componente incluye hojas.
   - Siempre es una simulación, sin total, y no es captura fotosintética.
5. **Nivel de confianza `generica_urbana`** para las ecuaciones generales. Los avisos de cada árbol indican el origen de la ecuación: propia, del mismo género o general.

## 4. Las 18 especies del Piloto

El rango anual va desde la categoría lenta del árbol menor hasta la rápida del mayor, con el CLE y la muerte regresiva registrados en cada árbol. Con evaluación vigente y monofustal significa que el árbol tiene evaluación completa vigente y un solo fuste.

| Especie | Con evaluación vigente (monofustales) | Procedimiento | Modelo y fuente | Tipo y transferibilidad | Tasa diamétrica | CO₂ anual simulado (kg/árbol) | Estado |
|---|---|---|---|---|---|---|---|
| *Acer negundo* | 12 (12) | Secuestro leñoso | MCH09-T1-ACPL-D-ACNE: McHale et al. 2009 (*A. platanoides*); densidad 420 (PSW-GTR-253, tabla 11) | Sustituto del mismo género, urbano de EE. UU. | i-Tree 0,58 / 0,84 / 1,09 cm/año × CLE × condición | 6,64–38,27 (11 árboles; 1 fuera de rango, DAP 8,6 cm) | Exploratorio (ya incorporado) |
| *Ulmus minor* | 11 (11) | Secuestro leñoso | UTD-T9-ULPU-DH-ULMI: *U. pumila* (PSW-GTR-253, tabla 9); densidad 570 (GWDD v2.2) | Sustituto del mismo género, urbano de EE. UU. | Ídem | 4,95–29,48 (11) | Exploratorio (ya incorporado) |
| *Quillaja saponaria* | 5 (3) | Variación del carbono aéreo total | CRUZ15-C6-QUSA-D: Cruz et al. 2015 | Propio de la especie, no urbano (bosque mediterráneo chileno) | Ídem | 4,16–26,25 (3; 2 multifustales excluidos) | Propuesta experimental |
| *Acer pseudoplatanus* | 4 (2) | Secuestro leñoso | MCH09-T1-ACPL-D-ACPS (CC-070) | Sustituto aprobado | Ídem | 11,75–25,71 (2; 2 multifustales excluidos) | Modelo **vigente**; simulación del secuestro v1 |
| *Pittosporum undulatum* | 2 (2) | Secuestro leñoso | UTD-T9-UGEB-DH-PIUN: UGEB; densidad 745 (tabla 11) | Genérico urbano (asignación de la UTD) | Ídem | 35,90–76,81 (2) | Propuesta experimental |
| *Beilschmiedia miersii* | 2 (2) | No estimable | — | — | — | — | Falta la densidad de la especie (no está en la tabla 11 ni en la GWDD v2.2) |
| *Cryptocarya alba* | 2 (1) | Variación del carbono aéreo total | CRUZ15-C6-CRAL-D: Cruz et al. 2015 | Propio de la especie, no urbano | Ídem | 5,70–11,18 (1; 1 multifustal excluido) | Propuesta experimental |
| *Lagerstroemia indica* | 2 (1) | No estimable | UTD-T9-UGEB-DH-LAIN (disponible) | Genérico urbano | — | — | DAP 3,4 cm, bajo el mínimo de 6 cm; el otro árbol es multifustal |
| *Araucaria angustifolia* | 1 (1) | Secuestro leñoso | UTD-T9-UGEC-DH-ARAN: UGEC; densidad 450 (GWDD v2.2) | Genérico urbano de coníferas | Ídem | 4,19–7,94 (1) | Propuesta experimental |
| *Ginkgo biloba* | 1 (1) | Secuestro leñoso | UTD-T9-UGEB-DH-GIBI: UGEB; densidad 520 (tabla 11) | Genérico urbano (asignación de la UTD) | Ídem | 40,02–75,40 (1) | Propuesta experimental |
| *Schinus molle* | 1 (0) | No estimable | UTD-T9-UGEB-DH-SCMO (disponible) | Genérico urbano | — | — | Multifustal |
| *Jacaranda mimosifolia* | 1 (1) | Secuestro leñoso | UTD-TS7-JAME-DH (CC-069) | Propio urbano, aprobado | Ídem | 6,47–12,23 (1) | Modelo **vigente**; simulación del secuestro v1 |
| *Araucaria heterophylla* | 1 (1) | No estimable | — | — | — | — | Falta la densidad de la especie (no está en la tabla 11 ni en la GWDD v2.2) |
| *Ficus elastica* | 1 (1) | Secuestro leñoso | UTD-T9-UGEB-DH-FIEL: UGEB; densidad 500 (GWDD v2.2) | Genérico urbano | Ídem | 46,21–86,99 (1) | Propuesta experimental |
| *Olea europaea* | 1 (1) | Secuestro leñoso | UTD-T9-UGEB-DH-OLEU: UGEB; densidad 700 (tabla 11) | Genérico urbano (asignación de la UTD) | Ídem | 12,35–23,53 (1) | Propuesta experimental |
| *Acer platanoides* | 1 (1) | Secuestro leñoso | MCH09-T1-ACPL-D-ACPL: McHale et al. 2009; densidad 520 (tablas 9 y 11) | Propio urbano | Ídem | 14,38–27,39 (1) | Propuesta experimental |
| *Pittosporum tobira* | 1 (1) | Secuestro leñoso | UTD-T9-UGEB-DH-PITO: UGEB; densidad 650 (GWDD v2.2) | Genérico urbano | Ídem | 4,75–9,23 (1) | Propuesta experimental |
| *Phoenix canariensis* | 0 | Fuera del universo | — | — | — | — | Sin evaluación vigente; además es palmera, sin modelo |

**Candidatos documentados que no se usan:**
- **Massuquetto (2018), para *A. angustifolia*:** su rango no está verificado (P-01) y la ecuación no es monótona (O-01).
- **Dobbs et al. (2011):** solo modela componentes de copa (O-32).
- **Tabacchi et al. (2011):** es un modelo de grupo europeo y no está confirmado si incluye follaje (O-24).

## 5. Cobertura (Piloto, 49 árboles con evaluación completa vigente)

| Resultado | Árboles |
|---|---|
| Estimación fundamentada (suma al total oficial) | **0**, igual que hoy |
| Simulación del secuestro leñoso | **33** (antes 25): 3 con modelo vigente, 22 con los sustitutos ya incorporados y 8 con la propuesta UTD |
| Simulación de la variación del carbono aéreo total (indicador aparte) | **4**: quillay A-000543, A-000554 y A-000568; peumo A-000537 |
| **Con alguna proyección anual** | **37 de 49** |
| No estimables | **12**: 7 multifustales, 2 fuera de rango (*A. negundo* con 8,6 cm y *L. indica* con 3,4 cm) y 3 sin densidad de la especie (*B. miersii* ×2, *A. heterophylla*) |

Fuera del universo quedan 49 árboles presentes sin evaluación completa vigente, entre ellos los quillayes A-000562 a A-000565, cuyas OT siguen en ejecución.

**Carbono almacenado leñoso:**
- 3 árboles con modelo aprobado (141 kg C), igual que hoy;
- 30 con modelos exploratorios, que no suman (antes 22).

## 6. Bibliografía

1. McPherson, E. G., van Doorn, N. S. y Peper, P. J. (2016). *Urban Tree Database and Allometric Equations*. USDA Forest Service, General Technical Report PSW-GTR-253. https://doi.org/10.2737/PSW-GTR-253
   - Tabla 9 (p. 70): UGEB, `V = 0,0001967 · D^1,951853 · H^0,664255`, DAP 6 a 135 cm; UGEC, `V = 0,0000426 · D^2,24358 · H^0,64956`, DAP 16 a 147 cm. V en m³ de madera verde, D en cm y H en m.
   - Tabla 11 (pp. 73-82): ecuación asignada y densidad por especie.
   - p. 73: uso de las ecuaciones generales.
   - Copia verificada: `BITACORAS_SIVU/secuestro-carbono/verificaciones/P-05_P-13/fuentes/McPherson_2016_PSW-GTR-253.pdf` (SHA-256 `0765570c…97b1c7`).
2. Global Wood Density Database v2.2 (Zenodo, 2026-01-15). https://zenodo.org/records/18262736. Archivo `gwddagg_v2.2_binomial.csv` (SHA-256 `d7158322…49e975d`), columna `wsg_est` en g/cm³.
3. McHale, M. R., Burke, I. C., Lefsky, M. A., Peper, P. J. y McPherson, E. G. (2009). Urban forest biomass estimates: is it important to use allometric relationships developed specifically for urban trees? *Urban Ecosystems* 12: 95-113, tabla 1 (*Acer platanoides*).
4. Cruz, P., Bascuñan, A., Velozo, J. y Rodríguez, M. (2015). Funciones alométricas de contenido de carbono para quillay, peumo, espino y litre. *Bosque*, 36(3), 375-381. https://doi.org/10.4067/S0717-92002015000300005
5. Cruz, P., Bascuñán, A. y Velozo, J. (2014). *Funciones alométricas para el bosque mediterráneo chileno*. Informe final OTERRA, Universidad Mayor.
6. Nowak, D. J. (2024). *Understanding i-Tree: 2023 Summary of Programs and Methods*. USDA Forest Service, GTR NRS-200-2023, pp. 44-45 (crecimiento diamétrico).
7. Pillsbury, N. H., Reimer, J. L. y Thompson, R. P. (1998). *Tree volume equations for fifteen urban species in California*. Cal Poly (CC-069).
8. IPCC (2006). *Guidelines for National Greenhouse Gas Inventories*, Vol. 4, cap. 4, tabla 4.3 (fracción de carbono 0,47).

Las ecuaciones, unidades, componentes, rangos y limitaciones de cada modelo están en `docs/metodologia/carbono-referencias.md` (secciones 3 a 5) y en cada resultado de la API (`modelo.fuente`, `modelo.limitaciones_modelo`).

## 7. Limitaciones principales

- **Ninguna tasa de crecimiento está asignada a una especie.** Toda proyección es un rango de tres categorías de i-Tree, sin calibrar para Valparaíso y sin ajuste por temporada.
- **Las ecuaciones generales de la UTD** no son de la especie ni del género. Se ajustaron con árboles urbanos de EE. UU. y no publican un rango de altura, así que la altura no se controla.
- **Las densidades** se aplican a la madera con corteza sin corrección. Las de la GWDD son promedios de especie de otros países.
- **DAP:** SIVU mide a 1,30 m; las ecuaciones de EE. UU. usan 1,37 m. No se aplica corrección.
- **Valores altos en dos árboles:** *Ginkgo biloba* (A-000505: DAP 84 cm con 6,5 m de altura, posible poda) y *Ficus elastica* (A-000534: 80 cm) dan los valores anuales más altos. Conviene revisar sus mediciones.
- **Quillay y peumo:** sus resultados incluyen hojas y no se suman ni se comparan con el carbono leñoso.

## 8. Decisiones que debe tomar el equipo

1. Aprobar la separación de los tres indicadores (sección 1) y los nombres visibles: «secuestro anual» como aumento proyectado del carbono, nunca como captura fotosintética.
2. Aprobar la asignación de la UTD (tabla 11 y ecuaciones generales) y el nivel `generica_urbana`.
3. Aprobar la regla de densidad: primero la tabla 11 de la UTD; si la especie no figura, la GWDD v2.2; sin densidad de la especie, no estimable (sin promedios de género).
4. Aprobar el carbono directo de quillay y peumo y su variación anual del carbono aéreo total (ver también `carbono-directo-revision-equipo.md`).
5. Asignar categorías de crecimiento por especie con fuente. Es la condición para pasar de simulación a estimación fundamentada.
6. Definir el tratamiento de los multifustales: hoy se excluyen 7 árboles.
7. Revisar las mediciones de A-000505 y A-000534.
8. Al aprobar: registrar un CC, sincronizar el Excel (filas 14 y 15 de INDICES, hoja de modelos y VERSION) y, solo entonces, fusionar y desplegar.
