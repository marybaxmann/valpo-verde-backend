# Evaluación de copa y ramas

Estado metodológico: vigente parcial
Versión metodológica: 1.1

## Historial

- 1.0 — primera consolidación textual del diagrama de evaluación de copa y ramas.
- 1.1 — cierre de puntos 1–6: `ramas secas` y `ramas quebradas` reorganizadas
  como clasificación jerárquica exhaustiva (se elimina el camino sin salida
  del diagrama); **se corrige un error de orden/severidad del diagrama
  original en `ramas quebradas`** (`<5 cm` es LEVE y `5–10 cm` es MODERADA,
  no al revés); se fijan los operadores del tramo intermedio de
  `desequilibrio de copa` (`20 % ≤ x ≤ 40 %`); la agregación pasa a suma
  simple vigente (`0 ≤ P ≤ 15`). La conversión `P → probabilidad de falla`
  sigue pendiente. Defoliación y clorosis/necrosis sin cambios.

## Propósito

Definir la lógica de evaluación estructural correspondiente a copa y ramas.

Este documento consolida textualmente la lógica vigente del diagrama de evaluación de copa y ramas. Ante una diferencia entre el diagrama y esta especificación, prevalece esta especificación (ver `docs/methodology/00-index.md`, "Regla de precedencia"); las diferencias detectadas se reportan sin resolverse automáticamente.

Las ramas marcadas como pendientes no deben implementarse.

---

## Componentes evaluados

1. ramas secas;
2. ramas quebradas;
3. defoliación;
4. clorosis / necrosis;
5. desequilibrio de copa.

Escala general:

- DESPRECIABLE = 0
- LEVE = 1
- MODERADA = 2
- SEVERA = 3

---

# 1. Ramas secas

Clasificación jerárquica y exhaustiva, evaluada de mayor a menor severidad. Conserva las categorías del diagrama, elimina el camino sin salida y resuelve el solapamiento por prioridad de severidad.

- ¿Presenta ramas secas? = NO → DESPRECIABLE = 0
- SÍ:
  1. ¿Existen ramas estructurales secas o ramas secas de diámetro ≥ 10 cm? → SÍ → SEVERA = 3
  2. si NO: ¿Existen ramas secas de diámetro ≥ 5 cm o presencia extendida en la copa? → SÍ → MODERADA = 2
  3. si NO: ramas secas de diámetro < 5 cm y presencia localizada → LEVE = 1

---

# 2. Ramas quebradas

Clasificación jerárquica y exhaustiva, evaluada de mayor a menor severidad.

- ¿Presenta ramas quebradas? = NO → DESPRECIABLE = 0
- SÍ:
  1. diámetro ≥ 10 cm o rama suspendida → SEVERA = 3
  2. 5 cm ≤ diámetro < 10 cm → MODERADA = 2
  3. diámetro < 5 cm → LEVE = 1

## Corrección respecto del diagrama original

El diagrama dibuja `5–10 cm → LEVE` y `< 5 cm → MODERADA` (orden invertido). Esta versión **corrige ese error de orden/severidad**: `< 5 cm → LEVE`, `5 cm ≤ diámetro < 10 cm → MODERADA`. La clasificación del diagrama (`5–10 cm → LEVE`, `< 5 cm → MODERADA`) no se conserva como vigente.

---

# 3. Defoliación

Operadores y rangos literales del diagrama:

- `0 % ≤ defoliación ≤ 10 %` → DESPRECIABLE = 0
- `10 % < defoliación ≤ 25 %` → LEVE = 1
- `25 % < defoliación ≤ 60 %` → MODERADA = 2
- `defoliación > 60 %` → SEVERA = 3

`¿Presenta defoliación? = NO` conduce también a DESPRECIABLE = 0 (equivalente al rango `≤ 10 %`).

Rangos legibles y consistentes con el texto entregado → VIGENTE.

---

# 4. Clorosis / necrosis

- `¿Presenta clorosis o necrosis? = NO` → DESPRECIABLE = 0
- `0 % < afectación ≤ 25 %` → LEVE = 1
- `25 % < afectación ≤ 50 %` → MODERADA = 2
- `afectación > 50 %` → SEVERA = 3

Operadores literales del diagrama: límite inferior estricto (`>`), límite superior inclusivo (`≤`); el tramo superior es `>`. Rangos legibles → VIGENTE.

---

# 5. Desequilibrio de copa

Se evalúa el desplazamiento lateral del centro de copa respecto del radio de copa.

- ¿Presenta un desequilibrio de copa? = NO → DESPRECIABLE = 0
- desplazamiento < 20 % del radio de copa → LEVE = 1
- 20 % ≤ desplazamiento ≤ 40 % del radio de copa → MODERADA = 2
- desplazamiento > 40 % del radio de copa → SEVERA = 3

Operadores del tramo intermedio confirmados como inclusivos en ambos extremos → VIGENTE.

---

# 6. Puntajes individuales

| Severidad | Puntaje |
|---|---:|
| DESPRECIABLE | 0 |
| LEVE | 1 |
| MODERADA | 2 |
| SEVERA | 3 |

Rango de cada subevaluación: 0–3 (las cinco).

## Agregación — VIGENTE (suma simple)

`P = puntaje(ramas secas) + puntaje(ramas quebradas) + puntaje(defoliación) + puntaje(clorosis/necrosis) + puntaje(desequilibrio de copa)`

Cada subevaluación tiene rango 0–3, por lo que:

- `P` mínimo = 0
- `P` máximo = 5 × 3 = 15
- rango: `0 ≤ P ≤ 15`

---

# 7. Probabilidad de falla

Tabla visible en el diagrama de copa y ramas (evidencia histórica, **no vigente**):

```
0 ≤ P ≤ 2   → IMPROBABLE
3 ≤ P ≤ 5   → POSIBLE
6 ≤ P ≤ 10  → PROBABLE
11 ≤ P ≤ 15 → INMINENTE
```

Estado: PENDIENTE

Estos rangos **difieren** de los de raíces/base (`01-roots-base.md` §5) y de los de tronco (`02-trunk.md` §7). La conversión `puntaje de copa → probabilidad de falla` no se implementa hasta la consolidación conjunta de raíces/base, tronco y copa/ramas.

No utilizar como fuente definitiva:
- rangos del diagrama;
- `database/schema.sql`;
- `probability_thresholds`.

---

# 8. Reglas de implementación

El motor debe:

1. recibir observaciones / mediciones;
2. aplicar únicamente reglas vigentes;
3. calcular severidad;
4. calcular puntaje;
5. preservar `rule_version`.

El motor no debe:

- permitir edición manual de resultados calculados;
- inventar rangos ni salidas;
- copiar reglas desde otros componentes;
- aplicar una fórmula de agregación no consolidada;
- implementar aún la conversión puntaje → probabilidad de falla.

---

# 9. Estado de las reglas

## Vigente

- escala DESPRECIABLE / LEVE / MODERADA / SEVERA = 0–3;
- ramas secas: clasificación jerárquica exhaustiva de §1 (NO → DESPRECIABLE; estructurales o `≥ 10 cm` → SEVERA; `≥ 5 cm` o extendida → MODERADA; `< 5 cm` y localizada → LEVE);
- ramas quebradas: clasificación jerárquica exhaustiva de §2, **corregida** (NO → DESPRECIABLE; `≥ 10 cm` o suspendida → SEVERA; `5 cm ≤ d < 10 cm` → MODERADA; `< 5 cm` → LEVE);
- defoliación: `≤ 10 %` DESPRECIABLE / `10–25 %` LEVE / `25–60 %` MODERADA / `> 60 %` SEVERA;
- clorosis/necrosis: NO → DESPRECIABLE (0); `0–25 %` LEVE / `25–50 %` MODERADA / `> 50 %` SEVERA;
- desequilibrio de copa: NO → DESPRECIABLE (0); `< 20 %` LEVE / `20 % ≤ x ≤ 40 %` MODERADA / `> 40 %` SEVERA;
- rango 0–3 por subevaluación;
- agregación del puntaje de copa: suma simple, `0 ≤ P ≤ 15` (§6).

## Pendiente

- conversión `puntaje de copa → probabilidad de falla` (tabla `0–2 / 3–5 / 6–10 / 11–15`).

---

# 10. Dependencias futuras

Los resultados de copa y ramas alimentarán posteriormente:

- probabilidad de falla;
- probabilidad de impacto;
- consecuencias;
- riesgo final.

No implementar esas dependencias mientras estén pendientes.

---

# 11. Puntos abiertos (decisión metodológica de la autora)

Cerrados en la v1.1: reorganización jerárquica exhaustiva de `ramas secas` y `ramas quebradas` (sin caminos sin salida); corrección del orden/severidad de `ramas quebradas` (`< 5 cm → LEVE`, `5–10 cm → MODERADA`); operadores del tramo `20 % ≤ x ≤ 40 %` de `desequilibrio de copa`; agregación por suma simple (`0 ≤ P ≤ 15`).

Sigue abierto:

1. Tabla `P → probabilidad de falla` de copa (`0–2 / 3–5 / 6–10 / 11–15`), distinta de las de raíces/base y tronco; confirmar si se descarta, reemplaza o readopta tras la consolidación conjunta de los tres componentes.
