# Carbono aéreo leñoso: especificación definitiva de los modelos APTO (B19, CC-069)

> **Estado:** especificación. **No implementado**, sin migraciones, sin cambios en árboles de Supabase.
>
> **Bloqueo de activación (decisión 4 de Valej, «previa verificación directa de ecuaciones y unidades»):** el informe original de las dos ecuaciones (Pillsbury, Reimer y Thompson 1998) **no se pudo leer**, porque la red de la sesión bloquea `ufei.calpoly.edu`. Hasta leerlo, los dos modelos quedan **especificados pero no activables**. Lo que falta confirmar en ese informe está en la sección 2.3.
>
> Decisiones de Valej aplicadas (2026-11-01):
> - Fracción de carbono 0,47 por defecto (IPCC 2006, Vol. 4, cap. 4, tabla 4.3), **no** como un factor de cada especie.
> - CO₂e = C × 44/12.
> - Sin altura, la ecuación solo con DAP únicamente si está publicada, es aplicable y estima el **mismo componente**.
> - Solo modelos APTO.
> - Multifustales y palmeras, sin estimación.
> - Sin extrapolar.

## 1. Componentes de biomasa (vocabulario fijo)

| Componente | Qué incluye | Modelos que lo estiman |
|---|---|---|
| **Biomasa aérea total** | Fuste, ramas y follaje | Ninguno aprobado. Chave 2014 lo estima, pero no se adopta. |
| **Biomasa aérea leñosa (sin follaje)** | Fuste y ramas, según la definición de volumen de cada fuente | Ecuaciones de **volumen de madera × densidad de la madera** (UTD TS7 × TS9). Jenkins (TS8, «minus foliage»). |
| **Biomasa de copa** | Ramas y hojas, sin fuste | Dobbs et al. 2011 |

El producto de volumen de madera por densidad de la madera es **biomasa leñosa**: no puede incluir hojas. Por eso los modelos APTO estiman **biomasa aérea leñosa**, no la aérea total. El indicador se llama **«carbono aéreo leñoso»**.

## 2. Modelos APTO

### 2.1 Fichas

Fuente de las dos: UTD (McPherson, van Doorn y Peper 2016, RDS-2016-0005), archivo TS7 («Volume_eqns_from_urban») y archivo TS9 («Biomass_density_factors»). Ecuación original: Pillsbury, N.; Reimer, J. L.; Thompson, R. 1998. *Tree volume equations for fifteen urban species in California.* Urban Forest Ecosystems Institute, Cal Poly, Technical Report 7.

| id | Especie | Variables | Ecuación (textual de TS7) | Resultado | ρ (TS9) | Rango de D (TS7) | Rango de H |
|---|---|---|---|---|---|---|---|
| `UTD-TS7-JAME-DH` | *Jacaranda mimosifolia* | D, H | `V = 0.0000801 · D^2.18578 · H^0.548045` | V (m³) | 490 kg/m³ | 17-60 cm | no publicado en TS7 |
| `UTD-TS7-JAME-D` | *Jacaranda mimosifolia* | D | `V = 0.0001005 · D^2.486248` | V (m³) | 490 kg/m³ | 17-60 cm | — |
| `UTD-TS7-LIST-DH` | *Liquidambar styraciflua* | D, H | `V = 0.0000631 · D^2.31582 · H^0.41571` | V (m³) | 460 kg/m³ | 14-54 cm | no publicado en TS7 |
| `UTD-TS7-LIST-D` | *Liquidambar styraciflua* | D | `V = 0.0000799 · D^2.560469` | V (m³) | 460 kg/m³ | 14-54 cm | — |

Las variantes solo con D (decisión 3):
- **Publicadas:** están en TS7, del mismo autor.
- **Mismo componente:** las dos filas de TS7 dicen «Predicts: Volume».
- **Aplicables:** misma especie y mismo rango de D.
- **Sin confirmar:** que el informe original las presente como alternativas para el mismo volumen (sección 2.3).

### 2.2 Qué está verificado y dónde

| Punto | Documentación | Verificado |
|---|---|---|
| D en cm y H en m | Metadatos oficiales de la UTD (TS7): «dbhcm = diameter at breast height [centimeters] and htm = height [meters]» | Sí, en la documentación del conjunto de datos |
| V en m³ por árbol | Metadatos UTD (TS7): «Predicts = … above ground volume (cubic meters per tree)» | Sí, en la documentación del conjunto de datos |
| ρ en kg/m³ y V × ρ = biomasa seca | Metadatos UTD (TS7): «Fresh wood volume is then multiplied by the species’ DW density factor to obtain aboveground DW biomass. Resulting units are kilograms per cubic meter» (sic; el producto da kg) | Sí. La frase de unidades del metadato está mal redactada: V (m³) × ρ (kg/m³) = kg. |
| Rango de D | Metadatos UTD: «DBH lower/upper (cm) = Lower/Upper range of dbh … of the trees used to derive the equations» | Sí |
| Valores de ρ 490 y 460 | TS9: «DW Density», con «Matched Equation Species» = la misma especie | Sí |
| Coeficientes | TS7 (copia de GitHub del archivo oficial, con `_metadata_RDS-2016-0005.html`) | Copiados textualmente. **Sin cotejar** con el informe de Pillsbury. |

### 2.3 Qué falta confirmar en el informe original (Pillsbury et al. 1998)

1. Que los coeficientes de TS7 coinciden con los publicados, o con su conversión al sistema métrico si el original usa pies y pulgadas.
2. Qué incluye el «volumen»: solo fuste o fuste y ramas, el diámetro mínimo de ramas y si incluye corteza.
3. Rango de H de la muestra.
4. Cómo se midieron los multifustales y a qué altura se tomó el DAP.
5. Tamaño de muestra por especie.

Para eso hace falta habilitar `ufei.calpoly.edu` en **Network access → Allowed domains** del entorno, o subir el PDF del informe.

### 2.4 Limitaciones que se informan con cada resultado

- Árboles medidos en California: la ecuación es urbana, pero de otro clima.
- DAP medido a 1,37 m en la UTD y a 1,3 m en SIVU (D-18), sin corrección.
- La fracción de carbono 0,47 es un valor por defecto, no de la especie.
- El resultado es biomasa **leñosa**: no incluye follaje ni raíces.

## 3. Cálculo

```
V   = forma(D, H)              m³     (DH si hay H; si no, D)
B   = V × ρ                    kg     biomasa aérea leñosa seca
C   = B × 0.47                 kg C   carbono aéreo leñoso
CO2e = C × 44 / 12             kg CO₂e
```

Sin redondeos en el cálculo ni en la respuesta, como el resto de B19: el frontend formatea.

### 3.1 Condiciones para que haya resultado (en este orden; la primera que falle da el motivo)

| # | Condición | Motivo si falla |
|---|---|---|
| 1 | Árbol presente (D-28) | El árbol no se considera. |
| 2 | Especie determinada a nivel específico y con modelo APTO activo | `sin_modelo` |
| 3 | `tipo_hoja` distinto de `palmera` | `palmera_sin_modelo` |
| 4 | `multifustal` distinto de `true` | `multifustal_no_admitido` |
| 5 | D presente | `falta_dap` |
| 6 | D dentro del rango (límites incluidos) | `fuera_de_rango`, con el rango en el detalle |
| 7 | Con H: variante DH; sin H: variante D | Nunca falla en los APTO, porque las dos variantes existen. |
| 8 | Resultado finito y > 0 | `resultado_invalido` |

### 3.2 Ejemplos reproducibles

Calculados con precisión doble con las fórmulas de 2.1. Para reproducirlos, en Python: `V = 0.0000801*30**2.18578*10**0.548045`.

| Caso | Modelo | D (cm) | H (m) | V (m³) | B (kg) | C (kg) | CO₂e (kg) |
|---|---|---|---|---|---|---|---|
| E1 | JAME-DH | 30 | 10 | 0.479005 | 234.7122 | 110.3147 | 404.4874 |
| E2 | JAME-D | 30 | — | 0.472776 | 231.6605 | 108.8804 | 399.2282 |
| E3 (límite inferior) | JAME-DH | 17 | 6 | 0.104613 | 51.2603 | 24.0923 | 88.3386 |
| E4 (límite superior) | JAME-DH | 60 | 15 | 2.721641 | 1333.6042 | 626.7940 | 2298.2447 |
| E5 | LIST-DH | 25 | 9 | 0.271703 | 124.9835 | 58.7423 | 215.3883 |
| E6 | LIST-D | 25 | — | 0.303339 | 139.5361 | 65.5820 | 240.4673 |
| E7 (límite inferior) | LIST-DH | 14 | 5 | 0.055568 | 25.5613 | 12.0138 | 44.0506 |
| E8 (límite superior) | LIST-DH | 54 | 16 | 2.053554 | 944.6350 | 443.9784 | 1627.9210 |

E1 frente a E2 y E5 frente a E6 muestran cuánto cambia el resultado sin altura: −1,3 % en Jacarandá y +11,6 % en Liquidámbar. La respuesta dice qué variante se usó.

## 4. Pruebas previstas: árboles ficticios del proyecto QA Fase 7

- **Son ficticios:** fixtures de Jest con repositorios simulados. **No se insertan en Supabase** ni se modifica ningún árbol real.
- **`project_id`:** el de QA Fase 7 se lee en la prueba como constante simulada.

| Prueba | Árbol ficticio | Esperado |
|---|---|---|
| P1 | `QA-F-01`, *Jacaranda mimosifolia*, presente, D 30, H 10, un fuste | E1, modelo `UTD-TS7-JAME-DH`, componente `aerea_lenosa` |
| P2 | `QA-F-02`, ídem sin H | E2, modelo `UTD-TS7-JAME-D` |
| P3 | `QA-F-03`, D 17, H 6 | E3: límite incluido |
| P4 | `QA-F-04`, D 16.9 | `null`, `fuera_de_rango`, detalle «17-60 cm» |
| P5 | `QA-F-05`, D 60.1 | `null`, `fuera_de_rango` |
| P6 | `QA-F-06`, *Liquidambar styraciflua*, D 25, H 9 | E5 |
| P7 | `QA-F-07`, ídem sin H | E6 |
| P8 | `QA-F-08`, *Jacaranda mimosifolia*, multifustal | `null`, `multifustal_no_admitido` |
| P9 | `QA-F-09`, *Phoenix canariensis* (`tipo_hoja = palmera`) | `null`, `palmera_sin_modelo` |
| P10 | `QA-F-10`, *Ginkgo biloba*, D 30 | `null`, `sin_modelo` (decisión 6) |
| P11 | `QA-F-11`, «Quercus sp.» | `null`, `sin_modelo` (no identificado a nivel de especie) |
| P12 | `QA-F-12`, *Jacaranda mimosifolia* sin D | `null`, `falta_dap` |
| P13 | `QA-F-13`, *Jacaranda* var. o cultivar | Se agrupa en la especie (decisión 10) y usa el mismo modelo |
| P14 | `QA-F-14`, talado (no presente) | No se considera |
| P15 | Agregado de P1 a P14 | `presentes = 13` (P14 no cuenta); `con_resultado = 6` (P1, P2, P3, P6, P7, P13); totales en t = Σ kg / 1000 de esos seis; motivos: `fuera_de_rango` 2, `multifustal_no_admitido` 1, `palmera_sin_modelo` 1, `sin_modelo` 2, `falta_dap` 1 |
| P16 | Proyecto sin ningún resultado | Totales `null`, no 0 |
| P17 | Regresión | Los indicadores existentes de B19 no cambian |
| P18 | Sincronía | El catálogo de modelos coincide con la hoja del Excel (cuando exista) |


Comparación numérica en las pruebas: `toBeCloseTo(valor, 4)` contra la tabla 3.2.

## 5. Cobertura real en SIVU (base de pruebas, 2026-11-01, solo lectura)

| Proyecto | Especie | Presentes | Con D | Con D y H | Multifustales | ¿Modelo APTO? | Con resultado |
|---|---|---|---|---|---|---|---|
| Piloto Valparaíso | *Acer negundo* | 4 | 1 | 1 | 0 | No | 0 |
| Piloto Valparaíso | *Acer pseudoplatanus* | 5 | 3 | 3 | 2 | No | 0 |
| Piloto Valparaíso | *Lagerstroemia indica* | 2 | 0 | 0 | 0 | No | 0 |
| QA Fase 7 | *Acer negundo* | 4 | 0 | 0 | 0 | No | 0 |
| QA Fase 7 | *Acer pseudoplatanus* | 5 | 1 | 1 | 0 | No | 0 |
| QA Fase 7 | *Lagerstroemia indica* | 1 | 0 | 0 | 0 | No | 0 |

- **Hoy ningún árbol registrado en SIVU es de una especie con modelo APTO**, y solo 6 de 21 presentes tienen DAP.
- **Con los modelos APTO activos, la cobertura real sería 0.**
- **El informe de Riquelme no cambia esto:** no trae DAP ni altura, así que no aporta mediciones.
- **Lo que haría falta:** medir en terreno Jacarandás y Liquidámbares (y especies con modelos que se aprueben después) y registrarlos en SIVU por el flujo normal de alta e inspección.

## 6. Activación (cuando se cumpla todo)

1. Leer el informe de Pillsbury et al. 1998 y cerrar la sección 2.3.
2. Registrar en el Excel maestro la hoja de modelos (CC-069), la fila 14 de INDICES y la densidad del catálogo (CC-068).
3. Autorizar la migración de CC-068. Mientras tanto, la densidad de estos dos modelos puede ir en el catálogo de modelos, porque es dato de TS9 asociado a la ecuación. **Decisión pendiente de Valej.**
4. Implementar según `carbono-modulo-especificacion.md`, con las pruebas de la sección 4, separado de los indicadores existentes.
