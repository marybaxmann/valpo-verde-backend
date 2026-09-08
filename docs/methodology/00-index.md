# Metodología — Índice y estado

## Propósito

Este directorio contiene la especificación metodológica que debe seguir el motor de reglas de Valpo Verde.

Los diagramas originales entregados por la autora son evidencia metodológica.

La versión textual consolidada en `docs/methodology/` determina qué partes de cada diagrama están:
- vigentes;
- vigentes parciales;
- pendientes;
- obsoletas.

Si existe una diferencia entre un diagrama antiguo y su especificación textual consolidada, se debe respetar el estado y contenido de la especificación textual vigente.

No inferir ni completar metodología faltante.

---

## Estados metodológicos

Los estados metodológicos son distintos de los estados usados por las `PR-*`.

### vigente
La lógica está suficientemente definida para ser implementada.

### vigente parcial
Solo una parte de la lógica está definida e implementable.

Las secciones marcadas como pendientes dentro de ese mismo documento no deben implementarse.

### pendiente
La lógica todavía no está suficientemente definida.

No implementar.

### obsoleta
La lógica existió en una versión anterior o todavía aparece en un diagrama antiguo, pero ya no debe utilizarse.

No implementar.

### Estados de `PR-*` vs estados metodológicos

Los estados de `PR-*` y los estados metodológicos son vocabularios distintos. Para la rama `SL >= 20% + agravantes`, `PR-013 = descartada` y `methodology = obsoleta` expresan la misma consecuencia operativa: no implementar.

---

## Principios de interpretación

1. No inventar umbrales, categorías, fórmulas ni ramas de decisión.

2. No extrapolar reglas entre componentes por similitud.

3. No asumir que raíces/base, tronco y copa/ramas utilizan los mismos rangos globales de probabilidad de falla.

4. Las observaciones o mediciones ingresadas por el evaluador son entradas del motor.

5. Las severidades, puntajes y resultados derivados deben ser calculados por el motor cuando la metodología esté definida.

6. Los resultados calculados no se modifican manualmente.

7. Toda lógica implementada debe poder asociarse a una `rule_version`.

8. Una regla marcada como pendiente puede coexistir con otras reglas vigentes dentro del mismo componente.

9. Una regla marcada como obsoleta debe ignorarse aunque todavía aparezca visualmente en un diagrama anterior.

10. Si una nueva versión metodológica reemplaza una anterior, preservar el historial y documentar el cambio.

---

## Estructura metodológica

| Archivo | Componente | Estado actual |
|---|---|---|
| `01-roots-base.md` | Raíces y base | vigente parcial |
| `02-trunk.md` | Tronco | vigente parcial |
| `03-crown.md` | Copa y ramas | vigente parcial |
| `04-vitality.md` | Vitalidad | vigente |
| `05-infrastructure.md` | Infraestructura | vigente |
| `06-impact.md` | Probabilidad de impacto | pendiente |
| `07-consequences.md` | Consecuencias | pendiente |
| `08-final-risk.md` | Riesgo final | pendiente |

Los archivos `06-impact.md`, `07-consequences.md` y `08-final-risk.md` podrán crearse cuando exista contenido metodológico suficiente.

Los estados aquí declarados representan el estado metodológico consolidado esperado; los archivos específicos pueden permanecer temporalmente como placeholders hasta ser poblados.

---

## Estado general actual

### Raíces y base
Estado: vigente parcial

Definido:
- lógica de observación;
- raíces expuestas (NO → DESPRECIABLE / SÍ → LEVE);
- daño radicular e inclinación como nodos separados (daño SÍ sin inclinación → LEVE);
- umbrales de inclinación;
- cavidad/pudrición basal ausente → DESPRECIABLE;
- uso de t/R;
- regla `SL ≥ 33 % → SEVERA` (independiente de agravantes);
- severidades y puntajes individuales (0–3);
- suma simple del puntaje del componente `P` (rango 0–7).

Pendiente:
- salida consolidada para `SL < 33 %` (con síntoma externo);
- fórmula exacta de `SL` (parentización sin validar);
- conversión de `P` a probabilidad de falla.

Obsoleto:
- rama `SL >= 20% + agravantes` y el concepto de "umbral agravantes".

---

### Tronco
Estado: vigente parcial

Definido:
- cavidad/pudrición ausente → DESPRECIABLE;
- cavidad/pudrición + sin síntoma externo: t/R (`≤ 0,30 → SEVERA`, `> 0,30 → MODERADA`);
- cavidad/pudrición + con síntoma externo: `SL ≥ 33 % → SEVERA`;
- heridas (NO → DESPRECIABLE / SÍ → LEVE);
- exudaciones (NO → DESPRECIABLE / SÍ → LEVE);
- troncos codominantes / bifurcaciones (flujo consolidado);
- grietas: todos los caminos del diagrama (existencia, dirección, separación, superficialidad, profundidad en madera, apertura);
- severidades y puntajes individuales (cavidad 0–3, heridas 0–1, grietas 0–3, exudaciones 0–1, codominancia 0–3).

Pendiente:
- salida consolidada para `SL < 33 %` (con síntoma externo);
- fórmula exacta de `SL` (parentización sin validar);
- fórmula de agregación del puntaje del tronco (no explícita en el diagrama);
- conversión del puntaje del tronco a probabilidad de falla.

Obsoleto:
- rama `SL >= 20% + agravantes` y el concepto de "umbral agravantes".

---

### Copa y ramas
Estado: vigente parcial

Definido:
- ramas secas: NO → DESPRECIABLE; clasificación jerárquica exhaustiva — estructurales o `≥10 cm` → SEVERA; `≥5 cm` o extendida → MODERADA; `<5 cm` y localizada → LEVE;
- ramas quebradas: NO → DESPRECIABLE; clasificación jerárquica exhaustiva **corregida** — `≥10 cm` o suspendida → SEVERA; `5–10 cm` → MODERADA; `<5 cm` → LEVE;
- defoliación: `≤10 %` DESPRECIABLE / `10–25 %` LEVE / `25–60 %` MODERADA / `>60 %` SEVERA;
- clorosis/necrosis: NO → DESPRECIABLE / `0–25 %` LEVE / `25–50 %` MODERADA / `>50 %` SEVERA;
- desequilibrio de copa: NO → DESPRECIABLE / `<20 %` LEVE / `20 % ≤ x ≤ 40 %` MODERADA / `>40 %` SEVERA;
- severidades y puntajes individuales (0–3 en las cinco subevaluaciones);
- agregación: suma simple, `0 ≤ P ≤ 15`.

Pendiente:
- conversión del puntaje de copa a probabilidad de falla (tabla `0–2 / 3–5 / 6–10 / 11–15`).

---

### Vitalidad
Estado: vigente

Definido:
- las seis salidas: sin vitalidad, clase 0, clase 1, clase 2, clase 3, no clasificable;
- las condiciones de cada clase como criterio visual compuesto (una decisión Sí/No por clase), con la redacción literal del diagrama;
- el orden secuencial en cascada del flujo.

Pendiente:
- ninguno. Descomponer las preguntas compuestas en variables observables individuales requeriría una nueva versión metodológica.

---

### Infraestructura
Estado: vigente

Definido:
- flujos por componente: acera, solera, calzada, alcorque/superficie de plantación, infraestructura vertical, redes/servicios (aéreas y subterráneas);
- escala SIN AFECTACIÓN / LEVE / MODERADA / SEVERA = 0–3;
- primera compuerta de solera y calzada como pregunta de existencia (corrección respecto del diagrama; parte de la v1.1);
- calzada sin paso "Dimensionar extensión" (intencional);
- "extensión" (Puntual / Localizada / Extendida) como dato observado, sin efecto en la severidad;
- alcorque: ausencia → SEVERA; sin categoría LEVE ({0, 2, 3});
- agregación: suma simple de los seis puntajes, `0 ≤ P ≤ 18`;
- nivel global de conflicto: `0–2` SIN CONFLICTO / `3–6` BAJO / `7–11` MODERADO / `12–18` ALTO (rangos enteros inclusivos).

Pendiente:
- ninguno.

---

### Probabilidad de impacto
Estado: pendiente

No implementar hasta que exista diagrama/especificación vigente.

---

### Consecuencias
Estado: pendiente

No implementar hasta que exista diagrama/especificación vigente.

---

### Riesgo final
Estado: pendiente

No implementar hasta que probabilidad de impacto, consecuencias y matriz final estén definidas.

---

## Relación con el motor de reglas

La implementación futura debe vivir conceptualmente en:

`services/rules/`

La organización interna puede evolucionar, pero debe conservar separación por componente metodológico.

Ejemplo conceptual:

services/rules/
- roots-base
- trunk
- crown
- vitality
- infrastructure
- risk

No crear todavía estructura de código únicamente por existir este documento.

---

## Regla de precedencia

Existen dos jerarquías de precedencia distintas, una por ámbito. No compiten entre sí porque aplican a ámbitos distintos.

### Metodología técnica

1. especificación textual vigente en `docs/methodology/`;
2. diagramas originales entregados por la autora;
3. código existente;
4. prototipo visual;
5. referencias externas.

El prototipo visual nunca debe utilizarse como fuente de metodología.

### Flujo funcional / UX

1. prototipo propio `Valpo-Verde-Conecta`;
2. reglas funcionales / documentación del proyecto;
3. Groundzy;
4. otras referencias.

---

## Pendientes conocidos

- conversión definitiva de puntaje total a probabilidad de falla (las tablas del diagrama difieren entre raíces/base, tronco y copa/ramas);
- probabilidad de impacto;
- consecuencias;
- matriz de riesgo final;
- salida consolidada para `SL < 33 %` (raíces/base y tronco);
- fórmula exacta de `SL` (pendiente de validación);
- fórmula de agregación del puntaje del tronco (no explícita en su diagrama; en raíces/base, copa/ramas e infraestructura es suma simple vigente);
- formato definitivo de `rule_version`.

La estructura actual de `database/schema.sql` respecto de `probability_thresholds` refleja una decisión anterior y no debe utilizarse como fuente para cerrar la conversión puntaje → probabilidad de falla. Esa decisión permanece pendiente hasta consolidar la metodología.

No resolver estos puntos por inferencia.
