# Evaluación de vitalidad

Estado metodológico: vigente
Versión metodológica: 1.1

## Historial

- 1.0 — primera consolidación textual del diagrama de Vitalidad.
- 1.1 — cierre de puntos 1–4: las condiciones de Clase 0–3 se fijan como
  criterios visuales compuestos (una sola decisión Sí/No por clase, sin
  descomponer en variables booleanas independientes); se conserva la
  redacción literal del diagrama en todas las clases y en la primera
  decisión ("¿El árbol está muerto?"). Vitalidad queda VIGENTE sin
  pendientes metodológicos.

## Propósito

Definir la lógica de clasificación de vitalidad del árbol.

Este documento consolida textualmente la lógica vigente del diagrama de Vitalidad. Ante una diferencia entre el diagrama y el texto entregado, prevalece esta especificación (ver `docs/methodology/00-index.md`, "Regla de precedencia"); las diferencias se reportan sin resolverse automáticamente.

La vitalidad es una evaluación distinta de la evaluación estructural y de la probabilidad de falla.

---

## Salidas posibles

| Clase | Etiqueta del diagrama | Identificador interno |
|---|---|---|
| Sin vitalidad | `SIN VITALIDAD / MUERTO` | `sin_vitalidad` |
| Clase 0 | `CLASE 0 – EXPLORACIÓN / ÓPTIMA` | `clase_0` |
| Clase 1 | `CLASE 1 – DEGENERACIÓN / DECLIVE LEVE` | `clase_1` |
| Clase 2 | `CLASE 2 – ESTANCAMIENTO / CRECIMIENTO REDUCIDO` | `clase_2` |
| Clase 3 | `CLASE 3 – RESIGNACIÓN / DECAIMIENTO` | `clase_3` |
| No clasificable | `REQUIERE REVISIÓN / NO CLASIFICABLE` | `no_clasificable` |

Los identificadores internos coinciden con el enum `clase_vitalidad` de `database/schema.sql`.

---

## Naturaleza de las condiciones de clase (0–3)

Cada condición de clase es un **criterio visual compuesto**: se responde como una **única decisión Sí/No** sobre la descripción completa, tal como aparece en el diagrama.

- No descomponer internamente la condición en variables booleanas independientes (`A AND B AND C`) con inputs separados.
- El evaluador responde a la descripción íntegra de la clase.
- Si una futura versión metodológica define variables observables individuales, deberá documentarse como una **nueva versión metodológica**.

El flujo secuencial completo (§7) permanece VIGENTE.

---

# 1. Árbol sin vitalidad

Primera decisión del diagrama: **¿El árbol está muerto?**

- SÍ → `SIN VITALIDAD / MUERTO` (`sin_vitalidad`). No continuar.
- NO → continuar a Clase 0.

---

# 2. Clase 0

**¿Presenta crecimiento vigoroso de brotes, follaje denso y ausencia de muerte regresiva?**

- SÍ → `CLASE 0 – EXPLORACIÓN / ÓPTIMA` (`clase_0`).
- NO → continuar a Clase 1.

---

# 3. Clase 1

**¿Presenta crecimiento de brotes levemente reducido y follaje ligeramente retraído de la periferia?**

- SÍ → `CLASE 1 – DEGENERACIÓN / DECLIVE LEVE` (`clase_1`).
- NO → continuar a Clase 2.

---

# 4. Clase 2

**¿Presenta crecimiento de brotes claramente reducido, estructuras tipo "látigo/cepillo" y claros en la copa?**

- SÍ → `CLASE 2 – ESTANCAMIENTO / CRECIMIENTO REDUCIDO` (`clase_2`).
- NO → continuar a Clase 3.

---

# 5. Clase 3

**¿Presenta ausencia de elongación de brotes, muerte regresiva severa y pérdida importante de follaje?**

- SÍ → `CLASE 3 – RESIGNACIÓN / DECAIMIENTO` (`clase_3`).
- NO → `NO CLASIFICABLE`.

---

# 6. No clasificable

Si el árbol no está muerto y no cumple ninguna de las condiciones de Clase 0, 1, 2 ni 3:

→ `REQUIERE REVISIÓN / NO CLASIFICABLE` (`no_clasificable`).

No forzar este resultado a una clase por aproximación.

---

# 7. Orden de evaluación

Flujo secuencial (cascada). El orden es parte de la metodología.

```text
¿El árbol está muerto?
  Sí → SIN VITALIDAD / MUERTO
  No ↓
¿Crecimiento vigoroso de brotes, follaje denso y ausencia de muerte regresiva?
  Sí → CLASE 0
  No ↓
¿Crecimiento de brotes levemente reducido y follaje ligeramente retraído de la periferia?
  Sí → CLASE 1
  No ↓
¿Crecimiento de brotes claramente reducido, estructuras tipo "látigo/cepillo" y claros en la copa?
  Sí → CLASE 2
  No ↓
¿Ausencia de elongación de brotes, muerte regresiva severa y pérdida importante de follaje?
  Sí → CLASE 3
  No → NO CLASIFICABLE
```

No evaluar todas las clases de forma independiente y luego escoger la más cercana, salvo que una futura versión metodológica lo indique.

---

# 8. Naturaleza del resultado

La vitalidad:

- no produce por sí sola probabilidad de falla;
- no sustituye la evaluación de raíces/base, tronco ni copa/ramas.

Debe almacenarse/representarse como resultado metodológico separado (`vitality_assessments`).

---

# 9. Reglas de implementación

El motor debe:

1. recibir las observaciones necesarias;
2. aplicar el flujo secuencial vigente;
3. devolver una única clase;
4. registrar los criterios observados (`vitality_assessments.criterios_observados`);
5. preservar `rule_version`.

El motor no debe:

- inventar una clase intermedia;
- convertir `NO CLASIFICABLE` en otra clase;
- descomponer las condiciones compuestas de clase en variables booleanas independientes o múltiples inputs (salvo una nueva versión metodológica que lo defina);
- usar la vitalidad como sinónimo de riesgo;
- permitir modificación manual del resultado si se deriva del flujo.

---

# 10. Estado de las reglas

## Vigente

- las seis salidas (`sin_vitalidad`, `clase_0`, `clase_1`, `clase_2`, `clase_3`, `no_clasificable`);
- las condiciones de cada clase como criterio visual compuesto, con la redacción literal del diagrama (§1–§5);
- el orden secuencial en cascada del flujo (§7).

## Pendiente

- ninguno. Vitalidad está consolidada.
- Nota: descomponer las preguntas compuestas en variables observables individuales requeriría una nueva versión metodológica.

---

# 11. Puntos cerrados en la v1.1

1. **Semántica de las condiciones de clase**: se tratan como criterio visual compuesto (una decisión Sí/No por clase), sin descomponer en `A AND B AND C`. Una descomposición futura sería una nueva versión metodológica.
2. **Primera decisión**: redacción literal del diagrama — "¿El árbol está muerto?" → SÍ → `SIN VITALIDAD / MUERTO` (`sin_vitalidad`); NO → continuar con Clase 0.
3. **Descripciones de clase**: se conservan completas ("de brotes", "de la periferia", "estructuras tipo látigo/cepillo", y demás palabras de la fuente visual); no se simplifican.

Sin puntos abiertos.
