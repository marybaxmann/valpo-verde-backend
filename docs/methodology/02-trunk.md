# Evaluación de tronco

Estado metodológico: vigente parcial
Versión metodológica: 1.1

## Historial

- 1.0 — primera consolidación textual del diagrama de evaluación de tronco.
- 1.1 — cierre de puntos 1–7: `SL ≥ 33 % → SEVERA` pasa a vigente; se
  consolidan las etiquetas Sí/No de la superficialidad de grieta vertical y
  la profundidad en madera como clasificación exhaustiva; se fija la
  formulación de codominancia del diagrama; se registran los rangos
  individuales por subevaluación. `SL < 33 %`, la fórmula de `SL`, la
  agregación del puntaje del tronco y la conversión `P → probabilidad de
  falla` siguen pendientes.

## Propósito

Definir la lógica de evaluación estructural correspondiente al tronco.

Este documento consolida textualmente la lógica vigente del diagrama de evaluación de tronco. Ante una diferencia entre el diagrama y esta especificación, prevalece esta especificación (ver `docs/methodology/00-index.md`, "Regla de precedencia"); las diferencias detectadas se reportan sin resolverse automáticamente.

Las ramas marcadas como pendientes u obsoletas no deben implementarse.

---

## Componentes evaluados

1. cavidad o pudrición;
2. heridas;
3. grietas;
4. exudaciones;
5. troncos codominantes / bifurcaciones.

Escala general:

- DESPRECIABLE = 0
- LEVE = 1
- MODERADA = 2
- SEVERA = 3

Cada subevaluación produce un resultado derivado (severidad + puntaje).

---

# 1. Cavidad o pudrición

## 1.1 Ausencia de cavidad/pudrición

- ¿Existe cavidad / pudrición? = NO → DESPRECIABLE = 0

## 1.2 Presencia de cavidad/pudrición

- ¿Existe cavidad / pudrición? = SÍ → evaluar síntoma externo.

### 1.2.1 Sin síntoma externo

Calcular `t/R` = espesor de pared residual (t) / radio del tronco (R).

Reglas vigentes:

- `t/R ≤ 0,30` → SEVERA = 3
- `t/R > 0,30` → MODERADA = 2

### 1.2.2 Con síntoma externo

Se evalúa mediante `SL` (pérdida estimada de resistencia).

**Regla vigente:**

- `SL ≥ 33 %` → SEVERA = 3

Es independiente de agravantes y coincide con la regla vigente de raíces/base (`01-roots-base.md` §3.2).

**Rama pendiente: `SL < 33 %`**

Estado: PENDIENTE

Tras eliminarse la rama de agravantes, el diagrama no deja una salida consolidada para `SL < 33 %` sin agravantes. No inferir LEVE, MODERADA u otra. No implementar.

**Rama obsoleta: `SL ≥ 20 % + agravantes`**

Estado: OBSOLETA — NO IMPLEMENTAR.

El concepto de "umbral agravantes" queda descartado. No reconstruirlo ni documentarlo como regla futura.

**Fórmula de `SL`**

Estado: PENDIENTE DE VALIDACIÓN.

La parentización no puede determinarse con certeza desde el diagrama. Variables legibles:

- `D`: diámetro del tronco;
- `d`: diámetro de la cavidad;
- `Cc`: longitud de la abertura;
- `C`: circunferencia del tronco.

No codificar la expresión hasta validación de la autora.

---

# 2. Heridas

- ¿Presenta heridas? = NO → DESPRECIABLE = 0
- ¿Presenta heridas? = SÍ → LEVE = 1

El diagrama no define grados adicionales. No inferirlos.

---

# 3. Grietas

Rama con lógica interna; no se simplifica. Transcripción del diagrama:

## 3.1 Existencia

- ¿Presenta grietas? = NO → DESPRECIABLE = 0
- ¿Presenta grietas? = SÍ → evaluar dirección (3.2).

## 3.2 Dirección de la grieta

- ¿La dirección de la grieta es vertical? = NO → evaluar separación (3.3).
- ¿La dirección de la grieta es vertical? = SÍ → evaluar superficialidad (3.4).

## 3.3 Grieta NO vertical — separación

- ¿Con separación visible? = SÍ → SEVERA = 3
- ¿Con separación visible? = NO → MODERADA = 2

## 3.4 Grieta vertical — superficialidad

- ¿Se presenta solo superficialmente en la corteza? = SÍ → medir apertura (3.4.2).
- ¿Se presenta solo superficialmente en la corteza? = NO → medir profundidad en la madera (3.4.1).

La rama "Sí" está explícitamente identificada en el diagrama; la rama restante corresponde a "No".

### 3.4.1 Profundidad de la grieta en la madera (grieta vertical, no solo superficial)

- profundidad en madera < 10 % del radio → LEVE = 1
- profundidad en madera entre 10 % y 25 % del radio → MODERADA = 2
- profundidad en madera > 25 % del radio → SEVERA = 3

Los tres rangos se consideran clasificación exhaustiva.

### 3.4.2 Apertura (grieta vertical, solo superficial en la corteza)

- ¿Ancho de apertura ≥ 0,5 cm y/o se desprende? = NO → LEVE = 1
- ¿Ancho de apertura ≥ 0,5 cm y/o se desprende? = SÍ → MODERADA = 2

## 3.5 Salidas de la rama grietas

Todas quedan dentro de DESPRECIABLE (0) / LEVE (1) / MODERADA (2) / SEVERA (3), según los caminos anteriores. No agregar caminos que no estén en el diagrama.

---

# 4. Exudaciones

- ¿Presenta exudaciones? = NO → DESPRECIABLE = 0
- ¿Presenta exudaciones? = SÍ → LEVE = 1

El diagrama no define severidades superiores. No inferirlas.

---

# 5. Troncos codominantes / bifurcaciones

Estructura consolidada del diagrama:

```text
¿Presenta troncos codominantes / bifurcación?

NO
→ DESPRECIABLE = 0

SÍ
↓
¿La unión presenta corteza incluida?

NO
→ LEVE = 1

SÍ
↓
¿Presenta grieta, separación o pudrición en la unión?

NO
→ MODERADA = 2

SÍ
→ SEVERA = 3
```

Diferencia de formulación respecto del texto entregado (significado equivalente; se conserva la del diagrama):

- entregado: "¿Presenta unión con corteza incluida?" — diagrama: "¿La unión presenta corteza incluida?"
- entregado: "¿Presenta grieta, separación o pudrición asociada?" — diagrama: "¿Presenta grieta, separación o pudrición en la unión?"

---

# 6. Puntaje del componente

Cada subevaluación aporta un puntaje según su severidad. Rangos individuales vigentes:

| Subevaluación | Rango de puntaje |
|---|---|
| cavidad / pudrición | 0–3 |
| heridas | 0–1 |
| grietas | 0–3 |
| exudaciones | 0–1 |
| codominancia / bifurcación | 0–3 |

El diagrama de tronco **no muestra** una fórmula de agregación (suma, promedio, máximo o ponderación) de estos puntajes. Solo son legibles la tabla de categoría → puntaje (DESPRECIABLE 0 / LEVE 1 / MODERADA 2 / SEVERA 3) y la tabla `P → probabilidad de falla` (sección 7).

Por tanto, la construcción de `P` permanece:

PENDIENTE

Requiere decisión metodológica explícita de la autora. No asumir suma simple, promedio, máximo ni ponderación.

---

# 7. Probabilidad de falla

Tabla visible en el diagrama de tronco (evidencia histórica, **no vigente**):

```
P ≤ 1      → IMPROBABLE
2 ≤ P ≤ 3  → POSIBLE
4 ≤ P ≤ 5  → PROBABLE
P ≥ 6      → INMINENTE
```

Estado: PENDIENTE

Estos rangos **difieren** de los del diagrama de raíces/base (`01-roots-base.md` §5: `4 → PROBABLE`, `5–7 → INMINENTE`). La conversión `puntaje del tronco → probabilidad de falla` no se implementa hasta la consolidación conjunta de raíces/base, tronco y copa/ramas.

No utilizar como fuente definitiva:
- rangos del diagrama;
- `database/schema.sql`;
- `probability_thresholds`.

---

# 8. Reglas de implementación

El motor debe:

1. recibir observaciones y mediciones;
2. aplicar únicamente reglas vigentes;
3. calcular severidades;
4. calcular puntajes;
5. preservar `rule_version`.

El motor no debe:

- permitir edición manual del resultado calculado;
- utilizar o reconstruir "agravantes";
- inferir metodología faltante;
- aplicar rangos de probabilidad de falla todavía;
- aplicar una fórmula de agregación no consolidada;
- copiar reglas desde raíces/base por similitud salvo que el propio diagrama de tronco las defina.

---

# 9. Estado de las reglas

## Vigente

- escala DESPRECIABLE / LEVE / MODERADA / SEVERA = 0–3;
- cavidad/pudrición ausente → DESPRECIABLE (0);
- cavidad/pudrición + sin síntoma externo: `t/R ≤ 0,30 → SEVERA (3)`, `t/R > 0,30 → MODERADA (2)`;
- cavidad/pudrición + con síntoma externo: `SL ≥ 33 % → SEVERA (3)`;
- heridas: NO → DESPRECIABLE (0), SÍ → LEVE (1);
- exudaciones: NO → DESPRECIABLE (0), SÍ → LEVE (1);
- codominancia / bifurcación: flujo consolidado de la sección 5;
- grietas: todos los caminos del diagrama (3.1–3.4.2), incluidas las etiquetas Sí/No de 3.4.

## Pendiente

- salida consolidada para `SL < 33 %` (con síntoma externo);
- fórmula exacta de `SL` (`PENDIENTE DE VALIDACIÓN`);
- fórmula de agregación del puntaje del tronco (no explícita en el diagrama);
- conversión `puntaje del tronco → probabilidad de falla` (tabla `≤1 / 2–3 / 4–5 / ≥6`).

## Obsoleta

- `SL ≥ 20 % + agravantes` y el concepto de "umbral agravantes".

---

# 10. Dependencias futuras

Los resultados de tronco alimentarán posteriormente:

- probabilidad de falla;
- probabilidad de impacto;
- consecuencias;
- riesgo final.

No implementar esas dependencias mientras estén pendientes.

---

# 11. Puntos abiertos (decisión metodológica de la autora)

Cerrados en la v1.1: `SL ≥ 33 % → SEVERA` (vigente); etiquetas Sí/No de superficialidad de grieta vertical; profundidad en madera como clasificación exhaustiva; formulación de codominancia según el diagrama.

Siguen abiertos:

1. Salida para `SL < 33 %` sin agravantes (el diagrama solo la resolvía por la rama obsoleta).
2. Fórmula exacta de `SL` (parentización ambigua; `PENDIENTE DE VALIDACIÓN`).
3. Fórmula de agregación de los cinco puntajes del tronco (no explícita en el diagrama).
4. Tabla `P → probabilidad de falla` de tronco (`≤1 / 2–3 / 4–5 / ≥6`), distinta de la de raíces/base; confirmar si se descarta, reemplaza o readopta tras la consolidación conjunta.
