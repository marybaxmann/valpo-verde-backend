# Metodología — Índice y estado

## Propósito

Este directorio documenta la metodología técnica de Valpo Verde y su versión, como parte del paquete metodológico definido en PR-002 v3.0.

La fuente de verdad metodológica es un paquete versionado y sincronizado compuesto por:

- Excel maestro (nombre fijo), **única fuente de verdad**; la composición y el carácter de cada hoja se definen en PR-002 v3.0, sección "Composición del Excel maestro";
- la documentación metodológica de este directorio, que documenta la versión sin definir reglas.

Si esta documentación difiere del Excel, manda el Excel y la documentación se corrige mediante un CC (`docs/workflow.md` §14). Los diagramas de decisión no forman parte del paquete (CC-030): son ilustraciones que pueden actualizarse a partir del Excel.

La implementación (base de datos, backend, API, frontend) deriva del paquete y nunca lo define.

No inferir ni completar metodología faltante.

---

## Versión vigente

Versión vigente del paquete metodológico: **2.1.0** (`rule_version` **2.1**), publicada el 2026-10-21, tag `metodologia-v2.1.0` (CC-040, CC-042). Versión anterior: 2.0.0, publicada el 2026-10-20, tag `metodologia-v2.0.0` (CC-030).

- **Fuente única:** el Excel maestro `docs/excel/Base de Datos Valpo Verde.xlsx` (PR-002 v3.0). Su export de texto está en `docs/excel/export/`.
- **Reglas vigentes:** todas las de REGLAS_INDICADORES (98), MATRICES_CALCULO y REGLAS_GENERALES de esta versión (PR-011 v3.0). 2.1.0 cambia REGLAS_GENERALES (alcance de la evaluación por tipo de inspección, evaluación vigente compuesta por campo; CC-040) y agrega `estado_proyecto` (CC-042); no agrega ni quita reglas de REGLAS_INDICADORES.
- **INDICES** sigue en propuesta y no es implementable (CC-016; DM-09). Los índices de proporción de árboles nativos e introducidos no se adoptan en 2.0.0 (CC-039).
- **Diagramas:** no forman parte del paquete (CC-030); son ilustraciones en `docs/excel/diagramas/` (imágenes, el `.drawio` de consolidación y `docs/excel/Diagrama actualizados.json`). Si difieren del Excel, manda el Excel.
- **Documentos `01-roots-base.md` a `05-infrastructure.md` (v1.1)** y las secciones de este índice marcadas como reemplazadas son historial de la metodología textual previa; no se usan para implementar.

### Convenciones de nombres en MATRICES_CALCULO

- `probabilidad_falla_componente`, `consecuencia_componente` y `clasificacion_riesgo_componente` son **títulos genéricos** de las matrices M02 y M03: se aplican a cada componente (raíces y cuello, tronco, copa y ramas) con los campos `probabilidad_falla_raices_cuello` / `_tronco` / `_copa_ramas`, `consecuencia_raices_cuello` / `_tronco` / `_copa_ramas` y `clasificacion_raices_cuello` / `_tronco` / `_copa_ramas` de DICCIONARIO_CAMPOS (decisión C de AM-08).
- `probabilidad_falla_impacto` es el **resultado intermedio** de M02. No se guarda: solo se usa para obtener la clasificación de M03.
- Los puntajes `P_RC`, `P_T`, `P_CR` y `P_I` son valores de cálculo de R01, R02, R03 y M04, no campos.

### Historial: estado de transición hasta la publicación de 2.0.0

> **REEMPLAZADO por la publicación de 2.0.0.** Se conserva como historial.

1. El Excel maestro (`docs/excel/Base de Datos Valpo Verde.xlsx`) contiene, desde CC-028, el Excel auditado el 2026-10-18 y es la única fuente metodológica. Incluye REGLAS_GENERALES, REGLAS_INDICADORES (98 reglas) y la hoja VERSION, que registra el 2.0.0 en preparación sin versión publicada. No existe una `rule_version` publicada. CC-030 decidió publicar 2.0.0 (`rule_version` 2.0) antes de implementar; la publicación requiere la aprobación explícita de la autora. El contenido anterior del Excel queda solo en el historial de git.
2. En `docs/excel/diagramas/` solo el diagrama de consolidación (R01–R04, M01–M03) tiene archivo fuente `.drawio`; los diagramas por componente son imágenes sin fuente. Ninguno refleja todavía CC-027 (R03 con defoliación, cavidades 09 y 10, M04 y M05). Quedan fuera del paquete 2.0.0 (CC-030, opción B): son ilustraciones, no fuente.
3. Los documentos `01-roots-base.md` a `05-infrastructure.md` (versión 1.1) y las secciones de este índice marcadas como **CONTENIDO TRANSITORIO** corresponden a la metodología textual previa. No incorporan decisiones metodológicas posteriores ni el Excel maestro. Se conservarán como historial, marcados como reemplazados, cuando se publique el paquete 2.0.0.
4. Las frases de esos documentos que declaran que la especificación textual prevalece sobre el diagrama quedan sin efecto por PR-002 (v2.0 y siguientes).
5. Mientras no exista una versión publicada no hay reglas vigentes implementables: no se implementa metodología en `services/rules/` (PR-002 v2.2, PR-011 v2.0).
6. Las decisiones metodológicas ya tomadas y aún no sincronizadas se registran como CC en `docs/registro-cambios.md`. No se incorporan a estos documentos fuera de su CC.
7. La hoja INDICES es un módulo metodológico en propuesta (CC-016): no es fuente normativa vigente y sus fórmulas no son implementables. Las hojas ARBOLES, REGISTRO_EVALUACION, INSPECCION, ORDENES DE TRABAJO, MANTENIMIENTO, INCIDENCIA, USUARIOS, PROYECTOS, MIEMBROS_PROYECTO, SECTORES y CATALOGO_ESPECIES son anexos operativos no normativos (PR-002 v3.0, CC-003); las contradicciones detectadas en ellas están registradas como CC y no se corrigen fuera de su CC.
8. ~~Desde CC-008, DICCIONARIO_CAMPOS registra el ámbito de cada campo y las especificaciones operativas pueden implementarse antes de publicar.~~ Sin efecto por CC-028 (P8) y CC-035: no hay columna `ambito` ni excepción operativa. Ninguna especificación ni regla se implementa antes de publicar 2.0.0 (CC-030).
9. El modelo conceptual ÁRBOL / datos técnicos con historial por inspección está en ADR-016 v4.0 y PR-006 v10.0 (CC-026, CC-028, CC-031, CC-039). `modelo-arbol-medicion.md` describe el modelo anterior de CC-020 y se conserva como historial (reemplazado).
10. CC-028 resuelve a favor del Excel auditado los conflictos P1–P9 de CC-026: entre otros, la hoja MEDICIONES_DENDROMETRICAS y la columna `ambito` de DICCIONARIO_CAMPOS ya no forman parte del Excel maestro. Los puntos 7 a 9 y los documentos que los desarrollan se actualizaron en AM-07 (Fase 2, 2026-10-20).

---

## Estados metodológicos

> **REEMPLAZADO por el paquete 2.0.0 (historial).** Antes: CONTENIDO TRANSITORIO — vocabulario de la metodología textual previa (v1.1). A partir del paquete 2.0.0, el estado de cada regla se expresa con `estado_regla` en REGLAS_INDICADORES (vigente · pendiente · reemplazada · descartada), según PR-011 v2.0.

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

> **REEMPLAZADO por el paquete 2.0.0 (historial).** Antes: CONTENIDO TRANSITORIO — metodología textual previa (v1.1). No refleja decisiones metodológicas posteriores ni el Excel maestro y no debe usarse como base de implementación. Se reemplazará con el paquete 2.0.0 (ver "Versión vigente y estado de transición").

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

> **REEMPLAZADO por el paquete 2.0.0 (historial).** Antes: CONTENIDO TRANSITORIO — metodología textual previa (v1.1). No refleja decisiones metodológicas posteriores ni el Excel maestro y no debe usarse como base de implementación. Se reemplazará con el paquete 2.0.0 (ver "Versión vigente y estado de transición").

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

La metodología técnica tiene su propia regla (abajo). Para producto, funcionalidad y UX rige la jerarquía única de fuentes de PR-016 v4.0, en la que la metodología ocupa el primer nivel.

### Metodología técnica

Fuente única: el Excel maestro del paquete vigente (PR-002 v3.0). Este directorio lo documenta; los diagramas de decisión no forman parte del paquete (CC-030). Una diferencia con el Excel se corrige mediante un CC (`docs/workflow.md` §14).

No son fuente metodológica:

- el código existente y `database/schema.sql`;
- el prototipo visual, que nunca debe utilizarse como fuente de metodología;
- Groundzy.

Las referencias técnicas externas son fundamento citado dentro del paquete, no fuente directa.

### Flujo funcional / UX

Jerarquía única (PR-016 v4.0, CC-021): metodología y fuentes vigentes → decisiones controladas → backend/API vigente → documentación vigente → Figma y prototipo histórico (solo intención funcional) → referencias visuales aprobadas (solo UX/UI).

---

## Pendientes conocidos

> **REEMPLAZADO por el paquete 2.0.0 (historial).** Antes: CONTENIDO TRANSITORIO — metodología textual previa (v1.1). No refleja decisiones metodológicas posteriores ni el Excel maestro y no debe usarse como base de implementación. Se reemplazará con el paquete 2.0.0 (ver "Versión vigente y estado de transición").

> Nota (CC-001): el formato de `rule_version` quedó definido en `docs/workflow.md` §14.10.

- conversión definitiva de puntaje total a probabilidad de falla (las tablas del diagrama difieren entre raíces/base, tronco y copa/ramas);
- probabilidad de impacto;
- consecuencias;
- matriz de riesgo final;
- salida consolidada para `SL < 33 %` (raíces/base y tronco);
- fórmula exacta de `SL` (pendiente de validación);
- fórmula de agregación del puntaje del tronco (no explícita en su diagrama; en raíces/base, copa/ramas e infraestructura es suma simple vigente);
- ~~formato definitivo de `rule_version`~~ (resuelto: `workflow.md` §14.10 y CC-030).

Todos los puntos anteriores quedaron resueltos en el Excel maestro 2.0.0 (R01–R04, M01–M05; PR-012 v2.0, PR-014 v2.0).

La estructura actual de `database/schema.sql` respecto de `probability_thresholds` refleja una decisión anterior y no debe utilizarse como fuente para cerrar la conversión puntaje → probabilidad de falla. Esa decisión permanece pendiente hasta consolidar la metodología.

No resolver estos puntos por inferencia.
