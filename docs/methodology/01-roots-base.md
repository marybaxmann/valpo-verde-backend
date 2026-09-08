# Evaluación de raíces y base

Estado metodológico: vigente parcial
Versión metodológica: 1.1

## Historial

- 1.0 — primera consolidación textual del diagrama de evaluación radicular.
- 1.1 — cierre de puntos 1–8 y nota de fórmula SL: se incorpora
  `SL ≥ 33 % → SEVERA` como vigente; se separan explícitamente las ramas de
  daño radicular e inclinación; se confirman las salidas de raíces expuestas
  y de cavidad/pudrición ausente; se documenta la suma simple `P` (máx. 7)
  como vigente; `SL < 33 %`, la tabla `P → probabilidad de falla` y la
  fórmula exacta de `SL` quedan pendientes; se descarta definitivamente el
  concepto de "umbral agravantes".

## Propósito

Definir la lógica de evaluación estructural correspondiente a raíces y base del árbol.

Este documento consolida textualmente la lógica vigente del diagrama de evaluación radicular. Ante una diferencia entre el diagrama y esta especificación, prevalece esta especificación (ver `docs/methodology/00-index.md`, "Regla de precedencia").

Las ramas marcadas como pendientes u obsoletas no deben implementarse.

---

## Entradas generales

La evaluación considera tres componentes:

1. raíces expuestas;
2. daño radicular / inclinación;
3. cavidad o pudrición basal.

Cada componente produce una severidad individual y su puntaje derivado:

- DESPRECIABLE = 0
- LEVE = 1
- MODERADA = 2
- SEVERA = 3

Escala máxima por componente:

- raíces expuestas: 0–1
- daño radicular / inclinación: 0–3
- cavidad / pudrición basal: 0–3

La agregación se define en la sección 5. La conversión de esa agregación a probabilidad de falla permanece pendiente.

---

# 1. Raíces expuestas

## Entrada

Determinar si existen raíces expuestas.

## Reglas vigentes

- Raíces expuestas = NO → DESPRECIABLE = 0
- Raíces expuestas = SÍ → LEVE = 1

No existen subcondiciones ni umbrales adicionales en esta rama.

---

# 2. Daño radicular / inclinación

"¿Existe daño radicular?" y "¿presenta inclinación?" son nodos distintos y no deben colapsarse.

## Reglas vigentes

- Daño radicular = NO → DESPRECIABLE = 0
- Daño radicular = SÍ → evaluar inclinación:
  - ¿Presenta inclinación? = NO → LEVE = 1
  - ¿Presenta inclinación? = SÍ → evaluar el ángulo θ:
    - 0° ≤ θ < 15° → LEVE = 1
    - 15° ≤ θ ≤ 30° → MODERADA = 2
    - θ > 30° → SEVERA = 3

No inferir condiciones adicionales.

---

# 3. Cavidad o pudrición basal

## Regla vigente de entrada

- Cavidad / pudrición basal = NO → DESPRECIABLE = 0
- Cavidad / pudrición basal = SÍ → continuar según exista o no síntoma externo (3.1 / 3.2).

---

## 3.1 Con cavidad/pudrición y SIN síntoma externo

1. calcular la relación `t/R` = espesor de pared residual (t) / radio del tronco (R);
2. comparar con el umbral vigente.

Reglas vigentes:

- `t/R ≤ 0,30` → SEVERA = 3
- `t/R > 0,30` → MODERADA = 2

No modificar estos umbrales por similitud con otras metodologías.

---

## 3.2 Con cavidad/pudrición y CON síntoma externo

Se evalúa mediante `SL` (pérdida estimada de resistencia).

### Regla vigente

- `SL ≥ 33 %` → SEVERA = 3

Esta regla es independiente de cualquier agravante.

### Rama pendiente: `SL < 33 %`

Estado: PENDIENTE

Al haberse eliminado la rama de agravantes (ver más abajo), actualmente no existe una salida consolidada para `SL < 33 %`. No inferir si corresponde LEVE, MODERADA u otra. No implementar.

### Rama obsoleta: `SL ≥ 20 % + agravantes`

Estado: OBSOLETA
Consecuencia: NO IMPLEMENTAR

El concepto de "umbral agravantes" queda descartado. No debe reconstruirse ni documentarse como regla futura. Puede seguir apareciendo en versiones anteriores del diagrama, pero no forma parte de la metodología vigente.

### Fórmula de `SL`

Estado: PENDIENTE DE VALIDACIÓN

La fórmula no se consolida como expresión matemática porque su parentización no puede determinarse con certeza desde el diagrama.

Variables visibles en el diagrama:

- `D`: diámetro del tronco;
- `d`: diámetro de la cavidad;
- `Cc`: longitud de la abertura;
- `C`: circunferencia del tronco.

No codificar la expresión hasta que la autora valide la fórmula exacta.

---

# 4. Severidad y puntajes individuales

| Severidad | Puntaje |
|---|---:|
| DESPRECIABLE | 0 |
| LEVE | 1 |
| MODERADA | 2 |
| SEVERA | 3 |

Los puntajes son resultados derivados. El evaluador ingresa observaciones o mediciones; no debe escribir manualmente el puntaje si este puede calcularse a partir de la lógica vigente.

---

# 5. Agregación del componente

## Suma simple — VIGENTE

El puntaje del componente raíces/base es la suma de los puntajes individuales:

`P = puntaje(raíces expuestas) + puntaje(daño radicular / inclinación) + puntaje(cavidad / pudrición basal)`

Rango resultante:

- `P` mínimo = 0
- `P` máximo = 1 + 3 + 3 = 7

## Conversión `P → probabilidad de falla` — PENDIENTE

Tabla visible en el diagrama:

```
0–1 → IMPROBABLE
2–3 → POSIBLE
4   → PROBABLE
5–7 → INMINENTE
```

Estado: PENDIENTE

No implementarla todavía. Se revisará después de consolidar raíces, tronco y copa.

No utilizar como fuente definitiva de esta conversión:
- rangos históricos del diagrama;
- `database/schema.sql`;
- `probability_thresholds`.

---

# 6. Reglas de implementación

El motor debe:

1. recibir observaciones / mediciones;
2. aplicar las reglas vigentes;
3. calcular la severidad de cada componente;
4. calcular el puntaje de cada componente;
5. calcular `P` como suma simple (sección 5);
6. preservar `rule_version`.

El motor no debe:

- inferir ramas no documentadas;
- completar criterios pendientes (`SL < 33 %`, fórmula de `SL`);
- reconstruir o usar "agravantes";
- aplicar la conversión `P → probabilidad de falla` todavía;
- permitir edición manual de resultados calculados.

---

# 7. Estado de las reglas

## Vigente

- raíces expuestas: NO → DESPRECIABLE (0); SÍ → LEVE (1);
- daño radicular: NO → DESPRECIABLE (0);
- daño radicular SÍ + sin inclinación → LEVE (1);
- umbrales de inclinación (0–15 LEVE / 15–30 MODERADA / >30 SEVERA);
- cavidad / pudrición basal: NO → DESPRECIABLE (0);
- sin síntoma externo: `t/R ≤ 0,30` → SEVERA (3); `t/R > 0,30` → MODERADA (2);
- con síntoma externo: `SL ≥ 33 %` → SEVERA (3);
- escala DESPRECIABLE / LEVE / MODERADA / SEVERA con puntajes 0–3;
- suma simple `P` (rango 0–7).

## Pendiente

- salida consolidada para `SL < 33 %` (con síntoma externo);
- fórmula exacta de `SL` (`PENDIENTE DE VALIDACIÓN`);
- conversión `P → probabilidad de falla` (tabla `0–1 / 2–3 / 4 / 5–7`).

## Obsoleta

- `SL ≥ 20 % + agravantes` y el concepto de "umbral agravantes".

---

# 8. Dependencias futuras

Este componente alimentará posteriormente:

- probabilidad de falla;
- probabilidad de impacto;
- consecuencias;
- riesgo final.

No implementar dependencias futuras hasta que estén vigentes.
