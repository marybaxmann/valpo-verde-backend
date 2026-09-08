# Evaluación de infraestructura

Estado metodológico: vigente
Versión metodológica: 1.1

## Historial

- 1.0 — primera consolidación textual del diagrama de infraestructura; los
  seis flujos por componente se transcriben del diagrama.
- 1.1 — cierre de puntos 1–8: la "extensión" (Puntual / Localizada /
  Extendida) se fija como dato observado sin efecto en la severidad; se
  **corrige la duplicación de redacción del diagrama original** en la
  primera compuerta de solera y calzada (pasan a ser preguntas de
  existencia, en paralelo con acera); la ausencia del paso "Dimensionar
  extensión" en calzada se confirma como intencional; alcorque, la
  agregación por suma (`0 ≤ P ≤ 18`) y la tabla de nivel de conflicto
  (rangos enteros inclusivos) pasan a vigentes. Sin pendientes
  metodológicos → estado "vigente".

## Propósito

Definir la lógica de evaluación de conflicto entre árbol e infraestructura.

Este documento consolida textualmente la lógica vigente del diagrama de infraestructura. Ante una diferencia entre el diagrama y el texto entregado, prevalece esta especificación (ver `docs/methodology/00-index.md`, "Regla de precedencia"); las diferencias se reportan sin resolverse automáticamente.

La evaluación de infraestructura es independiente de la probabilidad de falla estructural del árbol.

---

## Componentes evaluados

1. acera;
2. solera;
3. calzada;
4. alcorque / superficie de plantación;
5. infraestructura vertical;
6. redes / servicios.

Cada componente produce una severidad individual.

Escala general:

- SIN AFECTACIÓN = 0
- LEVE = 1
- MODERADA = 2
- SEVERA = 3

---

# 1. Acera

Flujo del diagrama:

- ¿Existe acera como infraestructura inmediata? = NO → SIN AFECTACIÓN = 0
- SÍ → ¿Existe daño o interferencia? = NO → SIN AFECTACIÓN = 0
- SÍ →
  1. Seleccionar tipo/s de conflicto / daño: `Levantamiento`, `Grieta`, `Rotura`, `Hundimiento`, `Deformación`.
  2. Dimensionar extensión: `Puntual 20 %` / `Localizada 50 %` / `Extendida`, según m².
  3. ¿El daño afecta la circulación peatonal?
     - NO → LEVE = 1
     - SÍ → ¿Impide el paso seguro o la continuidad de la vereda?
       - NO → MODERADA = 2
       - SÍ → SEVERA = 3

La "extensión" (Puntual / Localizada / Extendida, según m²) se registra como dato observado/documentado. No modifica por sí sola la severidad, que se determina por las dos preguntas de circulación. No se aplican ponderaciones ni reglas adicionales.

---

# 2. Solera

Flujo (primera compuerta corregida respecto del diagrama — ver nota):

- ¿Existe solera como infraestructura inmediata? = NO → SIN AFECTACIÓN = 0
- SÍ → ¿Existe daño o interferencia? = NO → SIN AFECTACIÓN = 0
- SÍ →
  1. Seleccionar tipo/s de conflicto / daño: `Desplazamiento`, `Inclinación`, `Fractura`, `Separación`, `Levantamiento`.
  2. Dimensionar extensión: `Puntual 20 %` / `Localizada 50 %` / `Extendida`, según m² (dato observado; no modifica la severidad).
  3. ¿El daño afecta la circulación peatonal?
     - NO → LEVE = 1
     - SÍ → ¿Impide el paso seguro o la continuidad de la vereda?
       - NO → MODERADA = 2
       - SÍ → SEVERA = 3

## Corrección respecto del diagrama original

El diagrama dibuja la primera compuerta como "¿Existe daño o interferencia en la solera?", casi idéntica a la segunda ("¿Existe daño o interferencia?"). Por consistencia funcional con acera, esta versión la reemplaza por una pregunta de existencia: **"¿Existe solera como infraestructura inmediata?"** (`NO → SIN AFECTACIÓN = 0`). El significado de la segunda compuerta no cambia.

---

# 3. Calzada

Flujo (primera compuerta corregida respecto del diagrama — ver nota):

- ¿Existe calzada como infraestructura inmediata? = NO → SIN AFECTACIÓN = 0
- SÍ → ¿Existe daño o interferencia? = NO → SIN AFECTACIÓN = 0
- SÍ →
  1. Seleccionar tipo/s de conflicto / daño: `Levantamiento`, `Grieta / fisuración`, `Hundimiento`, `Rotura`, `Deformación`.
  2. ¿Afecta la circulación vehicular?
     - NO → LEVE = 1
     - SÍ → ¿Dificulta o compromete la circulación segura?
       - NO → MODERADA = 2
       - SÍ → SEVERA = 3

Calzada **no** incluye el paso "Dimensionar extensión" que sí aparece en acera y solera. Esta ausencia es **parte de la metodología vigente** (confirmada; no se agrega).

## Corrección respecto del diagrama original

El diagrama dibuja la primera compuerta como "¿Existe daño o interferencia en la calzada?", casi idéntica a la segunda. Por consistencia funcional con acera, esta versión la reemplaza por **"¿Existe calzada como infraestructura inmediata?"** (`NO → SIN AFECTACIÓN = 0`). El significado de la segunda compuerta no cambia.

---

# 4. Alcorque / superficie de plantación

Flujo del diagrama:

- ¿Existe alcorque o superficie de plantación / permeable disponible? = NO → SEVERA = 3
- SÍ → ¿El alcorque presenta condiciones adecuadas para el árbol?
  - SÍ → SIN AFECTACIÓN = 0
  - NO →
    1. Seleccionar tipo/s de conflicto / daño: `Alcorque insuficiente`, `Confinamiento radicular`, `Raíces sobresalientes`, `Rotura o deformación de bordes`, `Suelo compactado`, `Obstrucción del alcorque`, `Falta de superficie permeable`, `Rotura`, `Deformación`.
    2. ¿Presenta condiciones críticas de restricción o déficit hídrico?
       - NO → MODERADA = 2
       - SÍ → SEVERA = 3

Particularidades confirmadas como vigentes:
- la **ausencia** de alcorque / superficie permeable disponible se clasifica directamente como SEVERA = 3 (no como SIN AFECTACIÓN);
- este componente no utiliza la categoría LEVE = 1: sus salidas posibles son 0, 2 o 3.

---

# 5. Infraestructura vertical

Flujo del diagrama:

- ¿Existe contacto o interferencia con infraestructura vertical? = NO → SIN AFECTACIÓN = 0
- SÍ → ¿Existe daño físico observable en la infraestructura?
  - NO → LEVE = 1
  - SÍ → ¿El daño compromete estabilidad, funcionalidad o requiere reparación estructural?
    - NO → MODERADA = 2
    - SÍ → SEVERA = 3

---

# 6. Redes / servicios

- ¿Existe interferencia con redes o servicios? = NO → SIN AFECTACIÓN = 0
- SÍ → ¿Cuál es el tipo de red? → dos ramas separadas.

## 6.1 Red aérea

- ¿Existe contacto o proximidad crítica entre copa/ramas y la red?
  - NO → LEVE = 1
  - SÍ → ¿Existe contacto directo, riesgo de interrupción o necesidad de poda correctiva?
    - NO → MODERADA = 2
    - SÍ → SEVERA = 3

## 6.2 Red subterránea

- ¿Existe evidencia de interferencia radicular con la red?
  - NO → LEVE = 1
  - SÍ → ¿Existe daño, obstrucción, desplazamiento o necesidad de intervención de la red?
    - NO → MODERADA = 2
    - SÍ → SEVERA = 3

---

# 7. Puntajes individuales

| Severidad | Puntaje |
|---|---:|
| SIN AFECTACIÓN | 0 |
| LEVE | 1 |
| MODERADA | 2 |
| SEVERA | 3 |

Rango por componente: 0–3 (alcorque solo alcanza {0, 2, 3}).

---

# 8. Agregación del conflicto — VIGENTE (suma simple)

`P = puntaje(acera) + puntaje(solera) + puntaje(calzada) + puntaje(alcorque) + puntaje(infraestructura vertical) + puntaje(redes / servicios)`

Cada componente aporta 0–3, por lo que:

- `P` mínimo = 0
- `P` máximo = 6 × 3 = 18
- rango: `0 ≤ P ≤ 18`

---

# 9. Nivel global de conflicto — VIGENTE

Rangos enteros inclusivos sobre `P` (§8):

```
0 ≤ P ≤ 2    → SIN CONFLICTO
3 ≤ P ≤ 6    → CONFLICTO BAJO
7 ≤ P ≤ 11   → CONFLICTO MODERADO
12 ≤ P ≤ 18  → CONFLICTO ALTO
```

Los rangos son contiguos y cubren 0–18 sin huecos ni solapamientos.

---

# 10. Naturaleza del resultado

El nivel de conflicto de infraestructura:

- no equivale a probabilidad de falla;
- no equivale a riesgo del árbol;
- no sustituye vitalidad;
- no sustituye evaluación estructural.

Debe mantenerse como resultado independiente (`infrastructure_conflicts`).

---

# 11. Reglas de implementación

El motor debe:

1. recibir observaciones / mediciones de infraestructura;
2. aplicar únicamente reglas vigentes;
3. calcular severidad por componente;
4. calcular puntaje por componente;
5. calcular `P` (suma de los 6 puntajes) y el nivel global de conflicto (§8–§9);
6. preservar `rule_version`.

El motor no debe:

- inventar categorías ni salidas;
- mezclar infraestructura con probabilidad de falla;
- modificar manualmente resultados calculados;
- inferir criterios no presentes en el diagrama;
- aplicar ponderaciones a la "extensión" (Puntual / Localizada / Extendida): es dato observado, sin efecto en la severidad.

---

# 12. Estado de las reglas

## Vigente

- escala SIN AFECTACIÓN / LEVE / MODERADA / SEVERA = 0–3;
- flujos por componente (§1–§6): acera, solera, calzada, alcorque, infraestructura vertical, redes aéreas y subterráneas;
- primera compuerta de solera y calzada como pregunta de existencia (corrección respecto del diagrama);
- calzada sin paso "Dimensionar extensión" (intencional);
- "extensión" (Puntual / Localizada / Extendida) como dato observado, sin efecto en la severidad;
- alcorque: ausencia → SEVERA; sin categoría LEVE;
- agregación: suma simple, `0 ≤ P ≤ 18` (§8);
- nivel global de conflicto: `0–2` / `3–6` / `7–11` / `12–18`, rangos enteros inclusivos (§9).

## Pendiente

- ninguno.

## Obsoleta

- ninguna. Nota: la duplicación de la primera compuerta de solera/calzada del diagrama original queda corregida por esta versión (ver §2, §3).

---

# 13. Dependencias futuras

Los resultados de infraestructura podrán alimentar posteriormente:

- priorización;
- mantenimiento;
- indicadores;
- análisis territorial.

No asumir todavía una fórmula automática de priorización.

---

# 14. Puntos cerrados en la v1.1

1. **Estado**: "vigente parcial" → **vigente** (sin pendientes metodológicos).
2. **Extensión** (Puntual / Localizada / Extendida): dato observado / documentado; sin efecto en la severidad; sin ponderaciones.
3. **Primera compuerta de solera y calzada**: corregida a pregunta de existencia ("¿Existe solera / calzada como infraestructura inmediata?"), en paralelo con acera. Corrige una duplicación de redacción del diagrama original.
4. **Calzada sin "Dimensionar extensión"**: confirmado intencional; no se agrega.
5. **Alcorque**: ausencia → SEVERA (3); condiciones adecuadas → SIN AFECTACIÓN (0); no adecuadas + no críticas → MODERADA (2); críticas o déficit hídrico → SEVERA (3). No usa LEVE.
6. **Agregación**: `P = suma de los 6 puntajes`, `0 ≤ P ≤ 18`. Vigente.
7. **Nivel de conflicto**: `0–2` / `3–6` / `7–11` / `12–18`, rangos enteros inclusivos. Vigente.

Sin puntos abiertos.
