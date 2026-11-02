# Carbono aéreo: verificación de modelos antes de implementar (B19)

> **Actualización 2026-11-01:** con las decisiones posteriores de Valej, la especificación definitiva de los modelos APTO está en `carbono-modelos-apto-especificacion.md`. Componentes: volumen × densidad estima **biomasa aérea leñosa**, no aérea total. Ginkgo con la genérica de latifoliadas: no autorizado. Los APTO CON LIMITACIONES se justifican uno por uno antes de activarse.

> **Estado:** verificación previa a la implementación. **Sin código ni cambios en Supabase.** Complementa y **corrige** la matriz v2 (`carbono-matriz-modelos.md`): el recuento de árboles de la sección 1 reemplaza al de la v2.
>
> **Decisiones de Valej (2026-11-01)** que esta verificación aplica:
> - (1) Prioridad: ecuación local de la especie, luego urbana de la especie y, solo si se justifica, sustituta o genérica.
> - (2) Fracción de carbono 0,47, provisional.
> - (3) CO₂e = C × 44/12.
> - (4) Primera versión: solo biomasa aérea y carbono aéreo; sin raíces y sin factor urbano 0,8.
> - (5) Chave 2014 no es universal, y una ecuación de dicotiledóneas no se aplica a palmeras.
> - (6) Multifustales: solo por fuste si el modelo lo admite; nada de DAP equivalente ni de sumas sin justificación.
> - (7) Fuera de rango, `null` con explicación.
> - (8) Densidad de madera en el catálogo (CC aparte).
> - (9) Identificaciones provisionales permitidas, marcando la incertidumbre.

## 1. Conciliación del informe de Riquelme (341 frente a 320 + 17)

| Concepto | Registros | Fuente |
|---|---|---|
| Universo original del estudio de 2023 | 341 | RIQ, pág. 8: «341 árboles individuales originales en el estudio de 2023 (algunos ya extraídos desde entonces)». |
| Filas con `id` en el Anexo 2 | 340 | Texto extraído del PDF. |
| − Filas que no son árboles (números de la grilla UTM de un mapa) | −3 | `id` 256440, 255820 y 255300, seguidos solo de números. |
| = Filas de árboles | 337 | |
| − Filas repetidas por un salto de página (Plaza Lord Cochrane: 4 Jacarandá y 2 Quillay) | −6 | `id` 134640, 134906, 98909, 132049 (Jacarandá) y 99001, 99031 (Quillay), que aparecen dos veces. |
| **= Registros únicos** | **331** | |
| − Tocones («No aplica (tocón)») | −17 | |
| − Retirados («No aplica (retirado)»: Morera, Falso acacio, Quillay, Ligustro y 2 Olmos) | −6 | |
| **= Árboles en pie evaluados** | **308** | Base de toda la cobertura de este documento. |
| Diferencia 341 − 331 | 10 | No están en el Anexo 2, que se titula «Muestra de la información contenida en planilla». La planilla completa no está en el PDF. |

**Corrección a la v2:** contaba 320 árboles porque incluía las 6 filas repetidas y los 6 retirados (320 − 6 − 6 = 308).

Otras diferencias entre el texto del informe y el Anexo 2:
- Jacarandá: 21 en el texto, 19 únicos en pie en el anexo.
- Palma chilena: 24 en el texto, 21 en el anexo.

**Importante:** el informe **no trae DAP ni altura por árbol**. Dice que se registraron «parámetros dendrométricos críticos» en una planilla que no viene en el PDF. Por eso la cobertura de RIQ es solo **potencial**: dice qué especies tendrían modelo, no cuántos árboles se pueden calcular.

## 2. Verificación de las ecuaciones

### 2.1 Unidades: ¿el volumen sale en m³?

- **Lo que dicen los metadatos de la UTD:** TS7 predice «above ground volume (cubic meters per tree)» con `dbhcm` en cm y `htm` en m, y TS9 da la densidad en kg/m³. Entonces V (m³) × ρ (kg/m³) = kg de materia seca.
- **Comprobación numérica** (esta sesión): evalué cada ecuación de TS7 en D/H = 20/8, 30/10 y 50/14 y la comparé con el cilindro de igual D y H.
  - Todas dan entre **0,54 y 1,62 veces el cilindro**, el orden de magnitud de un árbol en m³.
  - Ejemplo: Jacarandá con D = 30 cm y H = 10 m da 0,479 m³, frente a 0,707 m³ del cilindro.
  - Si la ecuación diera dm³, cm³ o pies³, la razón sería unas 1000 veces o unas 35 veces distinta.
  - En cada especie, la versión con D y H y la versión solo con D coinciden dentro de ±10 %.
  - **Conclusión (corregida el 2026-11-01, a pedido de Valej):** las unidades (m³, cm, m, kg/m³) están verificadas en la **documentación oficial del conjunto de datos** (metadatos de la UTD). La comparación con el cilindro es solo un control de plausibilidad, no una verificación. **El informe original de cada ecuación (Pillsbury et al. 1998, McHale 2007, Aguaron y McPherson 2012) no se leyó**; queda pendiente (ver `carbono-modelos-apto-especificacion.md`, §2.3).
- **Jenkins (TS8, «cedar/larch»):** con D = 30 cm da 284 kg, plausible para biomasa aérea en kg, que es la unidad de Jenkins et al. Es un modelo **directo de biomasa**: no usa densidad.
- **Palmeras (TS8, «General palms»):** con H = 10 da 69,7, pero el archivo no declara la unidad ni el tipo de altura. **No verificable.**

### 2.2 Componente de biomasa

| Ecuación | Tipo | Componente | Verificado |
|---|---|---|---|
| TS7 Pillsbury et al. 1998 (Jacaranda, Liquidambar, Acacia longifolia, Fraxinus velutina 'Modesto') | Volumen × densidad | **Biomasa aérea leñosa (sin follaje)**: «above ground volume» de madera (metadatos) × densidad de la madera | La unidad, sí. Si incluye ramas finas no se pudo confirmar: el informe de Pillsbury no se leyó. Da 0,54-0,70 veces el cilindro, compatible con fuste más ramas principales. |
| TS7 McHale 2007 (Gleditsia, Acer platanoides) | Volumen × densidad | **Biomasa aérea leñosa (sin follaje)**: volumen aéreo por escaneo láser terrestre (Lefsky y McHale 2008: «trees with complex architecture») | La unidad, sí. Da 1,08-1,62 veces el cilindro, compatible con un volumen que incluye ramas. |
| TS7 Aguaron y McPherson 2012 (Urb Gen Broadleaf) | Volumen × densidad | **Biomasa aérea leñosa (sin follaje)**: volumen aéreo, ecuación genérica de latifoliadas urbanas (Sacramento) | La unidad, sí. |
| TS8 Jenkins et al. 2004, cedar/larch | **Directo** | Biomasa aérea **menos follaje** («minus foliage ratio») | Sí (archivo y metadatos). |
| TS8 General palms (Frangi y Lugo 1985) | Directo | Sin confirmar | No. |
| Dobbs et al. 2011 | Directo | **Solo copa** (ramas + hojas); no incluye el fuste | Sí (artículo leído). |
| Chave et al. 2014 | Directo, con ρ | Biomasa aérea | Artículo no leído. |

### 2.3 Multifustales (decisión 6)

| Modelo | ¿Cómo mide el DAP en multifustales? | ¿Admite cálculo por fuste? | Conclusión para SIVU |
|---|---|---|---|
| UTD (protocolo de medición, metadatos) | «For multi-stemmed trees forking below 1.37 m measured above the butt flare and below the point where the stem begins forking»: **un solo diámetro bajo la bifurcación**. | No documentado | SIVU no registra ese diámetro: guarda `dap_fustes_cm` a 1,3 m por fuste y un DAP equivalente. **No hay forma justificada de aplicarlo: `null`.** |
| TS7 (Pillsbury, McHale, Aguaron) | No declarado en los archivos | No documentado | `null` en multifustales. |
| Jenkins (TS8) | Árboles de bosque, de un fuste | No documentado | `null` en multifustales. |
| Dobbs 2011 | Árboles sin poda ni daño; no menciona multifustales | No documentado | `null` en multifustales. |

**Resultado:** ningún modelo revisado justifica el cálculo por fuste ni el DAP equivalente. En la v1 del módulo, un árbol multifustal devuelve `null` con el motivo «el modelo no admite multifustales».

Además:
- La UTD mide el DAP a **1,37 m** y SIVU a **1,3 m** (D-18). Es una diferencia menor que se documenta como limitación, sin corrección.
- **Arbustos o arbolitos multifustales frecuentes** (Crespón, Coprosma, Hibiscus): quedarán casi siempre en `null`.

### 2.4 Variables que pide cada modelo

| Modelo | D | H | ρ | Observación |
|---|---|---|---|---|
| TS7, forma `a·D^b·H^c` | Sí | Sí | Sí (TS9) | Variante con D y H. |
| TS7, forma `a·D^b` | Sí | No | Sí | Variante solo con D, del mismo autor. |
| TS8 Jenkins | Sí | No | No | Directo. |
| Dobbs (copa) | Según especie | Según especie | No | Algunas solo con H. |
| Chave 2014 | Sí | Sí | Sí | No adoptado (decisión 5). |

**Regla propuesta (requiere tu aprobación):** si el árbol tiene H medida, se usa la variante con D y H; si no, la variante solo con D **del mismo autor**. Así la altura faltante no deja `null` cuando el autor publica las dos formas. **Alternativa más estricta:** solo la variante con D y H, y `null` sin altura.

## 3. Clasificación de modelos (biomasa aérea, v1)

- **APTO:** ecuación urbana de **la misma especie**, unidades verificadas, rango de D explícito y densidad de **la misma especie**.
- **APTO CON LIMITACIONES:** sustituta o genérica asignada por TS9, o modelo de bosque. Se puede aprobar, pero la confianza baja.
- **NO APTO:** no se puede usar en v1.

Rangos: el rango de D es el de la muestra de cada ecuación (TS7 y TS8). **Ninguna ecuación de TS7 o TS8 declara rango de H**: solo se controla D.

| # | Modelo | Especies (RIQ en pie / SIVU) | Clase | Causa |
|---|---|---|---|---|
| 1 | TS7 *Jacaranda mimosifolia*, Pillsbury 1998: `V = 0.0000801·D^2.18578·H^0.548045` · `V = 0.0001005·D^2.486248`; ρ = 490 | Jacarandá (19, nombre del informe) | **APTO** | Misma especie, urbana, m³ verificado, D 17-60 cm. Limitación general: clima de California. |
| 2 | TS7 *Liquidambar styraciflua*, Pillsbury 1998: `V = 0.0000631·D^2.31582·H^0.41571` · `V = 0.0000799·D^2.560469`; ρ = 460 | Liquidámbar (7, P) | **APTO** | Igual que el 1; D 14-54 cm. Identificación provisional. |
| 3 | TS7 *Gleditsia triacanthos*, McHale 2007: `V = 0.0004891·D^2.132·H^0.142` · `V = 0.0005055·D^2.22`; ρ = 660 (de *Robinia*) | Falso acacio (6, P) | APTO CON LIMITACIONES | Sustituta de la misma familia (Fabaceae), asignada por TS9; D 9-98 cm. |
| 4 | TS7 *Fraxinus velutina* 'Modesto', Pillsbury 1998: `V = 0.0000385·D^1.76296·H^1.42782` · `V = 0.000054·D^2.633462`; ρ = 560 | Fresno europeo (4, P) | APTO CON LIMITACIONES | Sustituta del mismo género. La densidad de TS9 es la del cultivar *F. excelsior* 'Hessei'. D 15-85 cm. |
| 5 | TS7 *Acacia longifolia*, Pillsbury 1998: `V = 0.0000904·D^2.18649·H^0.46736` · `V = 0.000154·D^2.34725`; ρ = 573 | Aromo australiano (1, P) | APTO CON LIMITACIONES | Sustituta del mismo género; D 15-57 cm. |
| 6 | TS7 *Acer platanoides*, McHale 2007 (cita correcta: **McHale et al. 2009**, *Urban Ecosystems* 12: 95-113, tabla 1; ver CC-070 y `docs/metodologia/carbono-referencias.md`): `V = 0.001011·D^1.533·H^0.657` · `V = 0.0019421·D^1.785`; ρ = 420 | *Acer negundo* (SIVU: 8) | APTO CON LIMITACIONES | Sustituta del mismo género; D 10-102 cm. |
| 7 | TS7 Urb Gen Broadleaf, Aguaron y McPherson 2012: `V = 0.0001967·D^1.951853·H^0.664255` · `V = 0.0002835·D^2.310647`; ρ de la especie en TS9 | Pitosporo 7 (ρ 745), Brachichito 5 (387), Crespón 4 (571), Ginkgo 3 (520), Níspero 2 (520), Castaño de la India 1 (500), Pimiento 1 (650); *Lagerstroemia indica* en SIVU (4) | APTO CON LIMITACIONES | Genérica de latifoliadas urbanas; D 6-135 cm. *Ginkgo* es una gimnosperma y TS9 la asigna igual: confirmar. Crespón suele ser multifustal, así que quedará en `null`. |
| 8 | TS8 Jenkins et al. 2004, cedar/larch: `B = EXP(-2.0336+2.2592·LN(D)) − EXP(-2.9584+4.4766/D)` | Cedro del Himalaya (3, P), Secuoya roja (1, P) | APTO CON LIMITACIONES | Modelo de bosque rural de EE. UU., por grupo de especies; directo; **sin follaje**; D 3-61 cm. Sin factor urbano (decisión 4). |
| 9 | Dobbs 2011 (copa) | Falso acacio, Liquidámbar, Quillay, Pimiento | NO APTO para biomasa aérea | Estima solo la copa (ramas + hojas). Se puede reservar para un indicador futuro de «biomasa de copa». |
| 10 | TS8 General palms (Frangi y Lugo 1985) | Palmera fénix 56, Palma chilena 21, Palma mexicana 12, Palma cocos plumosa 2 | NO APTO | Unidad y tipo de altura sin confirmar; basado en una palmera tropical delgada; *Jubaea chilensis* no se parece. |
| 11 | Chave et al. 2014 (y Gen Trop Chave 2005 de TS8) | — | NO APTO (v1) | Decisión 5: no universal; calibrado en bosque tropical; artículo no leído. |
| 12 | Cualquier modelo para especies solo a nivel de género | Olmo 53, Quercus 9, Coprosma 6, Gomero o Higuera 5, Sterculea 3, Casuarina 2, Ligustro sp 1, Tilo 1, Cedro 1, Hibiscus 1, Cotoneaster 1 | NO APTO | Sin especie no hay modelo. Se vuelven aptos al confirmar la especie en terreno (p. ej. *Ulmus pumila*, *U. parvifolia* o *U. americana* tienen ecuación propia en TS7). |
| 13 | Sin ecuación ni densidad en la UTD | Ligustro 17, Belloto 11, Araucarias 13, Quillay 5 (Dobbs: solo copa), Ceibo 5, Peumo 4, Acacia de Japón 3, Plátano oriental 3, Fresno de flor 2, Maitén 2, Lagunaria, Álamo negro, Paulonia, Ombú, Huingán; *Acer pseudoplatanus* en SIVU (10) | NO APTO | Sin ecuación de la especie ni densidad. Se puede revisar cuando esté el campo de densidad (CC-068) y una fuente para cada una. |

## 4. Cobertura

### 4.1 Potencial (Riquelme, 308 árboles en pie; especies provisionales salvo las 5 del informe)

| Clase | Árboles | % |
|---|---|---|
| APTO (modelos 1 y 2) | 26 | 8 % |
| APTO CON LIMITACIONES (modelos 3, 4, 5, 7 y 8) | 38 | 12 % |
| NO APTO: palmeras | 91 | 30 % |
| NO APTO: solo género | 83 | 27 % |
| NO APTO: sin modelo ni densidad (incluye Quillay, que solo tiene copa en Dobbs) | 70 | 23 % |

Es potencial: además hacen falta D (y H si se usa la variante con altura) dentro del rango y un solo fuste.

### 4.2 Real en SIVU hoy (base de pruebas, solo lectura)

| Proyecto | Especie | Presentes | Con D | Con D y H | Multifustales | Modelo | Calculables |
|---|---|---|---|---|---|---|---|
| Piloto Valparaíso | *Acer negundo* | 4 | 1 (D = 8,6) | 1 | 0 | 6 (D 10-102) | **0**: fuera de rango |
| Piloto Valparaíso | *Acer pseudoplatanus* | 5 | 3 | 3 | 2 | — | **0**: NO APTO |
| Piloto Valparaíso | *Lagerstroemia indica* | 2 | 0 | 0 | 0 | 7 | **0**: sin D |
| QA Fase 7 | *Acer negundo* | 4 | 0 | 0 | 0 | 6 | **0**: sin D |
| QA Fase 7 | *Acer pseudoplatanus* | 5 | 1 | 1 | 0 | — | **0**: NO APTO |
| QA Fase 7 | *Lagerstroemia indica* | 1 | 0 | 0 | 0 | 7 | **0**: sin D |

**Hoy no hay ningún árbol en SIVU con carbono calculable.** El módulo devolvería `null` con su motivo en todos. Para que haya resultados hace falta cargar el inventario de RIQ con D y H (la planilla que no viene en el PDF) o medir en terreno.

## 5. Fracción de carbono 0,47 (decisión 2)

- **Referencia propuesta:** IPCC 2006, *Guidelines for National Greenhouse Gas Inventories*, Vol. 4 (AFOLU), cap. 4, tabla 4.3 (fracción de carbono de la materia seca; valor por defecto 0,47). **(verificar)**: la cita no se pudo leer en esta sesión, porque la red bloquea los sitios externos. Hay que confirmar el texto antes de pasar el CC a FUENTE SINCRONIZADA.
- **Limitaciones:**
  - Es un valor por defecto global, no de cada especie: la fracción varía entre especies y entre tejidos.
  - La UTD y otros trabajos urbanos usan 0,5, así que los resultados no se comparan directo con estudios que usan 0,5.
  - Se aplica a la biomasa **aérea**; sin raíces (decisión 4).

## 6. Decisiones que quedan abiertas

1. Variante solo con D cuando falta H (regla propuesta en 2.4), o `null`.
2. Aprobar los modelos APTO CON LIMITACIONES uno por uno, o como grupo.
3. *Ginkgo biloba* con la genérica de latifoliadas, como la asigna TS9.
4. Cómo se cargan las mediciones del inventario de Riquelme (fuera de este alcance).
