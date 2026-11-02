# Estimación de carbono aéreo leñoso: especificación definitiva de los modelos APTO (B19, CC-069 v1)

> **Estado (2026-11-02):** verificación documental cerrada contra el informe original. **Paso 1 implementado** (funciones puras y pruebas, sin conectar a endpoints): `src/services/rules/carbono/`. Sin migraciones, sin cambios en Supabase y sin push hasta la revisión de Valej.
>
> **Nombre del resultado:** «estimación de carbono aéreo leñoso» y su CO₂ equivalente. No es carbono total ni secuestro anual.

## 1. Fuentes

- **Ecuaciones:** Pillsbury, N. H.; Reimer, J. L.; Thompson, R. P. 1998. *Tree Volume Equations for Fifteen Urban Species in California.* Urban Forest Ecosystems Institute, Cal Poly. PDF entregado por Valej y leído en esta sesión: tablas 6, 7 y 8, y texto.
- **Coeficientes métricos y densidad:** Urban Tree Database (McPherson, van Doorn y Peper 2016, RDS-2016-0005; act. 21-01-2020), archivos TS7 y TS9 y metadatos; recopilados en PSW-GTR-253.
- **Fracción de carbono:** IPCC 2006, *Guidelines for National Greenhouse Gas Inventories*, Vol. 4, cap. 4, tabla 4.3. Es un valor por defecto, **no específico de cada especie** (decisión de Valej).
- **CO₂e:** C × 44/12 (razón de masas molares).

## 2. Verificación contra el informe original

| Punto | Pillsbury et al. 1998 | Modelo SIVU | Resultado |
|---|---|---|---|
| Ecuación solo DAP, Jacarandá | Tabla 6, ec. 14: `Vol (cf) = 0.036147 (dbh^2.486248)`, N = 49 | `0.0001005·D^2.486248` (UTD) | Exponente idéntico. Coeficiente convertido a métrico: 0,00010083. El de la UTD queda **−0,33 %** por redondeo. Se usa el de la UTD (decisión 2). |
| Ecuación solo DAP, Liquidámbar | Tabla 6, ec. 15: `0.030684 (dbh^2.560469)`, N = 50 | `0.0000799·D^2.560469` | Idéntico. Conversión 0,000079872: +0,04 %. |
| Ecuación DAP y altura, Jacarandá | Tabla 7, ec. 29: `0.011312 (dbh^2.185780)(ht^0.548045)`, N = 49 | `0.0000801·D^2.18578·H^0.548045` | Idéntico. Conversión 0,000080074: +0,03 %. |
| Ecuación DAP y altura, Liquidámbar | Tabla 7, ec. 30: `0.011773 (dbh^2.315815)(ht^0.415711)`, N = 50 | `0.0000631·D^2.31582·H^0.41571` | Idéntico (exponentes redondeados a 5 decimales). Conversión 0,000063083: +0,03 %. |
| Unidades del original | pies³, pulgadas, pies («cubic feet (outside bark)», tablas 13 y 14) | m³, cm, m | Conversión comprobada: `a_métrico = a · 0,0283168 / 2,54^b · 3,28084^c`. |
| Rangos | Tabla 8. Jacarandá: DAP 6,8-23,5 in y altura 22,5-57,5 ft. Liquidámbar: DAP 5,5-21,4 in y altura 24,0-65,5 ft. | Jacarandá 17,272-59,69 cm y 6,858-17,526 m. Liquidámbar 13,97-54,356 cm y 7,3152-19,9644 m. | Exacto. TS7 traía 17-60 y 14-54 cm, redondeados: **manda la tabla 8.** |
| Extrapolación | «tree sizes should fit into the range of data collected and extrapolation avoided» | Sin extrapolar | Coincide. |
| Componente | Volumen exterior a la corteza; tronco y ramas, con los segmentos terminales modelados desde unas 4 pulgadas hasta la punta; sin raíces ni follaje (confirmado por Valej) | `aerea_lenosa` | Se describe como volumen leñoso **estimado**, no como medición exhaustiva de todas las ramas. |
| DAP | A 4,5 ft (1,3716 m) | SIVU a 1,30 m (D-18) | **Limitación documentada, sin corrección.** |
| Multifustales | Los bifurcados a la altura del DAP o más abajo se trataron como dos árboles y en general quedaron fuera de la muestra | No se estiman | Coincide. |

## 3. Aproximación de corteza (decisión 6)

- **El volumen es exterior a la corteza.** La densidad de TS9 es de **madera**: masa seca sobre volumen verde.
- **Qué hace SIVU:** B = V × ρ, sin factor de corrección. Es el mismo procedimiento de la UTD («Fresh wood volume is then multiplied by the species' DW density factor»).
- **Por qué no se ajusta:** ninguna de las fuentes revisadas publica un factor de corteza para estas especies, así que no se agrega ninguno.
- **Efecto:** la corteza queda valorada con la densidad de la madera. No se conoce en qué sentido sesga el resultado. Queda en `LIMITACIONES`.

## 4. Catálogo de modelos (`src/services/rules/carbono/modelos.ts`)

| id | Variante | Fórmula (V en m³) | ρ (kg/m³, TS9) | DAP (cm) | Altura (m) |
|---|---|---|---|---|---|
| `UTD-TS7-JAME-DH` | DAP y altura | `0.0000801·D^2.18578·H^0.548045` | 490 | 17,272-59,69 | 6,858-17,526 |
| `UTD-TS7-JAME-D` | solo DAP | `0.0001005·D^2.486248` | 490 | 17,272-59,69 | no se controla |
| `UTD-TS7-LIST-DH` | DAP y altura | `0.0000631·D^2.31582·H^0.41571` | 460 | 13,97-54,356 | 7,3152-19,9644 |
| `UTD-TS7-LIST-D` | solo DAP | `0.0000799·D^2.560469` | 460 | 13,97-54,356 | no se controla |

- **Densidad:** se guarda dentro del catálogo de modelos, con unidad, tipo, fuente y versión (decisión 3). La tabla `species` no se toca.
- **Límites:** escritos como literales decimales exactos. En coma flotante, 22,5 × 0,3048 da 6,8580000000000005 y dejaría fuera el propio límite.

## 5. Cálculo y motivos de `null` (`src/services/rules/carbono/calculo.ts`)

`V = a·D^b·H^c` (o `a·D^b`) → `B = V·ρ` → `C = B·0,47` → `CO₂e = C·44/12`. Sin redondeos.

Se evalúa en este orden; la primera condición que falla da el motivo:

| # | Condición | Motivo |
|---|---|---|
| 1 | Especie a nivel específico con modelo aprobado (variedades y cultivares, en su especie) | `sin_modelo` |
| 2 | `tipo_hoja` distinto de `palmera` | `palmera_sin_modelo` |
| 3 | `multifustal` distinto de `true` | `multifustal_no_admitido` |
| 4 | `multifustal` conocido (no `null`) | `dap_medicion_no_equivalente` |
| 5 | DAP presente | `falta_dap` |
| 6 | Con altura: variante DAP y altura; sin altura: variante solo DAP | — |
| 7 | DAP dentro del rango | `fuera_de_rango` |
| 8 | Variante con altura: altura dentro del rango. **Si está fuera, no se usa la variante solo DAP**: el árbol queda fuera de la población muestreada. | `fuera_de_rango_altura` |
| 9 | Resultado finito y > 0 | `resultado_invalido` |

**`dap_medicion_no_equivalente`** (interpretación para que Valej confirme): según D-18, en un multifustal `dap_cm` es un diámetro **equivalente** calculado, no una medición directa. Si `multifustal` es `null`, no se puede saber si el DAP es directo; por eso se excluye. El DAP a 1,30 m **no** se marca con este motivo: es la limitación documentada en la sección 2 y no se transforma a 1,3716 m.

El agregado (`agregarCarbono`) toma solo los árboles presentes. Entrega `indicador: "estimacion_carbono_aereo_lenoso"`, el método, las limitaciones, la cobertura y los motivos, y los totales en t. Si ningún árbol tiene resultado, los totales son `null`.

## 6. Ejemplos reproducibles (los mismos valores que usan las pruebas)

| Caso | Modelo | D (cm) | H (m) | V (m³) | B (kg) | C (kg) | CO₂e (kg) |
|---|---|---|---|---|---|---|---|
| E1 | JAME-DH | 30 | 10 | 0.479005 | 234.7122 | 110.3147 | 404.4874 |
| E2 | JAME-D | 30 | — | 0.472776 | 231.6605 | 108.8804 | 399.2282 |
| E3 (límites inferiores) | JAME-DH | 17.272 | 6.858 | 0.116537 | 57.1033 | 26.8386 | 98.4080 |
| E4 (límites superiores) | JAME-DH | 59.69 | 17.526 | 2.930602 | 1435.9949 | 674.9176 | 2474.6979 |
| E5 | LIST-DH | 25 | 9 | 0.271703 | 124.9835 | 58.7423 | 215.3883 |
| E6 | LIST-D | 25 | — | 0.303339 | 139.5361 | 65.5820 | 240.4673 |
| E7 (límites inferiores) | LIST-DH | 13.97 | 7.3152 | 0.064769 | 29.7936 | 14.0030 | 51.3444 |
| E8 (límites superiores) | LIST-DH | 54.356 | 19.9644 | 2.286018 | 1051.5685 | 494.2372 | 1812.2030 |

## 7. Pruebas (`tests/services/rules/carbono/calculo.test.ts`)

Todas con árboles **ficticios**: no se lee ni se escribe en Supabase.

- **Catálogo:** coeficientes, rangos de la tabla 8, N, componente, densidad en kg/m³, 0,47 y 44/12.
- **E1 a E8:** comparación a 4-6 decimales.
- **Motivos de `null`:** DAP fuera de rango por arriba y por abajo, con y sin altura; altura fuera de rango por arriba y por abajo; altura fuera de rango sin caer a la variante solo DAP; multifustal; multifustal desconocido; sin DAP; palmera; Ginkgo; «Quercus sp.»; sin especie.
- **Otros casos:** el DAP se usa tal cual (sin transformar); una variedad o cultivar usa el modelo de su especie.
- **Agregado de 15 árboles ficticios de QA Fase 7 (QA-F-01 a QA-F-15):** 14 presentes, 6 con resultado, conteo por motivo y totales en t. Proyecto sin resultados: totales `null`.

## 8. Paso 2 (no iniciado; requiere autorización)

- Leer `multifustal`, `altura_total_m` y `tipo_hoja` en los repositorios de B19 y B2.
- Agregar el campo `estimacion_carbono_aereo_lenoso` a `GET /projects/:id/indicadores` y a la ficha, sin tocar los campos existentes.
- Pruebas de integración y de regresión.
- Contrato §6 bis, `coordinacion.md` y CC-069.

La prueba de sincronía con el Excel queda para cuando exista la hoja de modelos.
