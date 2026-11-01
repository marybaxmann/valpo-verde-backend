# Carbono: matriz de modelos por especie (investigación; NO implementado)

> Estado: investigación para decidir. No es metodología vigente: en la hoja INDICES, «Carbono almacenado» y «Secuestro anual de carbono» siguen «Pendiente» (filas 14 y 15) y CC-016 no los adopta. Nada de esto se calcula en SIVU hasta que Valej apruebe un método.
>
> Fecha: 2026-11-01. Especies: las tres que hoy tiene la base de pruebas (*Acer negundo*, *Acer pseudoplatanus*, *Lagerstroemia indica*). La lista del Informe Técnico Experto Final (Riquelme, 2026) no está en el repositorio; con ella se completa la matriz con el mismo procedimiento (sección 4).

## 1. Fuentes revisadas

| Fuente | Acceso | Qué aporta |
|---|---|---|
| Urban Tree Database (UTD): McPherson, E. G.; van Doorn, N. S.; Peper, P. J. 2016 (act. 21-ene-2020). Forest Service Research Data Archive, https://doi.org/10.2737/RDS-2016-0005 | Archivos TS1–TS9 y metadatos oficiales, desde la copia en GitHub `DDA8/-Plant-Growth-Sensor-Data-Project-` (incluye `_metadata_RDS-2016-0005.html`). El sitio del USDA está bloqueado en la red de la sesión. | TS7: ecuaciones de **volumen** de árboles urbanos. TS8: ecuaciones de volumen y biomasa de bosques rurales. TS9: densidad de madera seca (DW density, kg/m³) por especie y ecuación asignada. TS6: ecuaciones de crecimiento por región de EE. UU. (edad ↔ DAP, copa, altura, área foliar). |
| Dobbs, C.; Hernández, J.; Escobedo, F. 2011. Modelos de biomasa aérea y área foliar para árboles urbanos de Santiago (método no destructivo, muestreo aleatorio de ramas). Bosque. https://doi.org/10.4067/S0717-92002011000300010 | **No leído**: `www.scielo.cl` y `revistabosque.org` están bloqueados en la red de la sesión. Solo se vio un resumen en un buscador: 11 especies urbanas comunes de Santiago, con DAP y altura. | Sería la fuente local para **biomasa de copa** y área foliar. Lista de especies, ecuaciones y coeficientes: sin verificar. |

Lo que dicen los metadatos de la UTD (texto oficial): las ecuaciones de TS7 predicen «above ground volume (cubic meters per tree)» de madera fresca; «Fresh wood volume is then multiplied by the species’ DW density factor to obtain aboveground DW biomass». `dbhcm` = DAP en cm; `htm` = altura en m. **Los archivos no traen** la fracción de carbono, el factor de raíces ni el método para multifustales: eso está en el informe PSW-GTR-253, que no se pudo abrir.

## 2. Matriz por especie

Variables de SIVU: DAP = `dap_cm` (D-18; en multifustal, el DAP equivalente), H = `altura_total_m` (D-19).

| Especie | Componente | Ecuación (UTD, textual) | Coef. | Unidades | Variables | Rango de aplicación | Fuente | Observaciones |
|---|---|---|---|---|---|---|---|---|
| *Acer negundo* | Volumen aéreo de madera fresca (V) | `V = 0.001011 · DAP^1.533 · H^0.657` | a = 0.001011; b = 1.533; c = 0.657 | V en m³; DAP en cm; H en m | DAP, H | DAP 10–102 cm (muestra de la ecuación) | TS7, McHale 2007, ecuación de *Acer platanoides*; asignada a *A. negundo* por TS9 | Ecuación **sustituta** (otra especie del género). |
| *Acer negundo* | Volumen aéreo (V), solo DAP | `V = 0.0019421 · DAP^1.785` | a = 0.0019421; b = 1.785 | m³; cm | DAP | DAP 10–102 cm | ídem | Alternativa sin altura. |
| *Acer negundo* | Biomasa aérea seca | `B = V · 420` | ρ = 420 | kg (ρ en kg/m³) | V | el de V | TS9 (DW density de ACNE) | Incluye o no hojas y ramas finas: según el método de McHale 2007, sin verificar. |
| *Acer pseudoplatanus* | — | **Sin datos en la UTD** | — | — | — | — | TS9 no la incluye | Opciones: ecuación de *A. platanoides* (sustituta de género) o «Urb Gen Broadleaf», pero **las dos necesitan su densidad de madera**, que hay que tomar de la Global Wood Density Database (Zanne et al. 2009), no disponible aquí. **Bloqueada.** |
| *Lagerstroemia indica* | Volumen aéreo (V) | `V = 0.0001967 · DAP^1.951853 · H^0.664255` | a = 0.0001967; b = 1.951853; c = 0.664255 | m³; cm; m | DAP, H | DAP 6–135 cm | TS7, Aguaron y McPherson 2012, «Urb Gen Broadleaf» (genérica de latifoliadas urbanas); asignada por TS9 | Ecuación **genérica**, no de la especie. |
| *Lagerstroemia indica* | Volumen aéreo (V), solo DAP | `V = 0.0002835 · DAP^2.310647` | a = 0.0002835; b = 2.310647 | m³; cm | DAP | DAP 6–135 cm | ídem | Alternativa sin altura. |
| *Lagerstroemia indica* | Biomasa aérea seca | `B = V · 571` | ρ = 571 | kg | V | el de V | TS9 (DW density de LAIN) | Suele ser multifustal: hay que decidir cómo se aplica (sección 3). |

Ninguna de las tres tiene en la UTD una ecuación propia de biomasa de copa. TS8 (bosques rurales) no incluye estas especies.

### Componentes

| Componente | ¿Hay modelo hoy? | Qué falta |
|---|---|---|
| **Biomasa de copa** (ramas y hojas) | No en la UTD. TS5/TS6 dan biomasa **foliar** y área foliar (solo hojas), que no es la copa. | Leer Dobbs et al. 2011 (bloqueado), que modela la copa para especies de Santiago. |
| **Biomasa aérea total** | Sí, para *A. negundo* (sustituta) y *L. indica* (genérica): V × densidad. | Confirmar en PSW-GTR-253 qué componentes incluye el volumen; *A. pseudoplatanus*, sin densidad. |
| **Carbono almacenado** | No: los archivos no dan la fracción de carbono ni las raíces. | Fuente documentada de la fracción de carbono y decidir si se suman raíces (PSW-GTR-253 u otra). |
| **CO₂ equivalente** | Es una conversión: CO₂ = C × 44/12 (razón entre las masas molares de CO₂ y C). | Aprobación de Valej, aunque es una constante física. |
| **Secuestro anual** | Dos caminos, ninguno decidido: (a) INDICES fila 15: carbono al final menos al inicio del período, con DAP medido en dos inspecciones; (b) crecimiento modelado con TS6 (edad ↔ DAP). TS6 solo tiene regiones de EE. UU.: *A. negundo* en MidWst; *L. indica* en CenFla, GulfCo, InlEmp, InlVal y SacVal; *A. pseudoplatanus*, ninguna. | Decidir el camino. Con (b), aceptar extrapolar un clima de EE. UU. a Valparaíso o descartarlo. |

## 3. Decisiones necesarias antes de implementar

1. Método de biomasa: UTD (volumen × densidad, con ecuaciones sustitutas o genéricas) o modelos locales de Santiago (Dobbs et al. 2011), cuando se puedan leer.
2. Fracción de carbono y raíces: con fuente citada.
3. Multifustales: aplicar la ecuación al DAP equivalente de SIVU o fuste por fuste y sumar.
4. Fuera del rango de DAP de la ecuación: no calcular (`null` con motivo) o extrapolar.
5. Sin altura: usar la ecuación solo-DAP o no calcular.
6. Secuestro: diferencia entre inspecciones o crecimiento modelado.
7. Registrar el método en INDICES (filas 14 y 15) y en un CC antes del código.

## 4. Cómo completar la matriz con la lista de Riquelme

Para cada especie: (1) buscarla en TS9 → densidad y «Matched Equation Species»; (2) tomar esa ecuación de TS7 (o TS8) con su rango; (3) si no está en TS9, marcarla «sin datos» (sin densidad no se calcula); (4) buscarla en Dobbs et al. 2011 cuando sea legible. Los archivos están en el repositorio citado; el procedimiento es mecánico y no requiere inventar valores.
