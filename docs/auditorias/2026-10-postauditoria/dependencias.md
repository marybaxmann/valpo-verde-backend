# Dependencias y prioridades — Auditoría postdemo 2026-10

Documento de evidencia, no normativo. Las tareas `PA-xx` están en [`docs/roadmap.md`](../../roadmap.md), sección "Postauditoría 2026-10".

## 1. Matriz de dependencias entre decisiones

La fila depende de la columna. ✔ = bloquea; ◐ = condiciona en parte; — = misma decisión.

| ↓ depende de → | K1 base `main` | CC-015 roles | C1 motor | DA-01 | DA-02 | ADR-016 (A/B/C) | DA-03 | DA-04 | X1 Excel |
|---|---|---|---|---|---|---|---|---|---|
| Registrar cualquier CC nuevo | ✔ (resuelta) | | | | | | | | |
| C2 (ADR-006) versión definitiva | | ✔ | | | | | | | |
| C4 (`methodology/01–05`) | | | ✔ | | | | | | |
| DA-01 implementación | | | | — | | | | | |
| DA-02 diseño | | ✔ | ◐ | ◐ | — | ✔ | | ◐ | ✔ |
| DA-03 esquema | | ◐ | | ◐ | | | — | ◐ | |
| DA-03 implementación | | | | ✔ | | | — | ◐ | |
| DA-04 matrices | | ✔ | | | ◐ | | ◐ | — | ◐ (X3) |
| I1 identidades | | ✔ | | ◐ | ✔ | | | | |
| T1 expectativas finales (W1–W12) | | ◐ | | ✔ | | | | | |
| E-1 (ejecutar W1–W12) | | | | | | | | | |

E-1 depende de **Q3** (entorno de pruebas aislado), no de otra decisión.

**Sin dependencias:** CC-015, C1, X1 y Q3. **Por ahí conviene empezar.**

## 2. Prioridades

| Prioridad | Qué | Por qué |
|---|---|---|
| P0 · decisión | C1 (motor con borrador) | Afecta la validez de todos los resultados de riesgo; no depende de nada |
| P0 · decisión | CC-015 (roles) | Bloquea DA-02, DA-04, I1 y C2 |
| P0 · entorno | Q3: entorno de pruebas aislado | Habilita E-1 (W1–W12) y T1 |
| P1 · evidencia | E-1 a E-5 (DA-01) | Necesarias antes de pedir la aprobación técnica de DA-01 |
| P1 · decisión | DA-01 implementación | Cierra S1 (Alta) e I1; habilita DA-03 |
| P1 · decisión | C2 (ADR-006) | Contradicción vigente sobre roles |
| P2 · diseño | DA-03 esquema | Concepto aprobado; se puede diseñar en paralelo |
| P2 · decisión | X1 (`INSPECCIONES.nivel_riesgo`) | Previo a DA-02 |
| P3 · diseño | DA-04 matrices | Tras CC-015 |
| P3 · diseño | DA-02 INSPECCIONES | Tras CC-015, ADR-016 y X1 |
| P4 · implementación | F, A, R, M, T2, T3 | Sin decisiones de negocio; tras verificar la rama en el navegador |

## 3. Orden recomendado de implementación futura

| Fase | Contenido | Requiere | Criterio de aceptación |
|---|---|---|---|
| 0 · Documental | Esta carpeta; HANDOFF; roadmap | Autorización del commit documental | PR documental revisado y fusionado en `main` |
| 1 · Verificación | Probar en el navegador la rama del 2026-10-11 (P1–P7) | Servidores locales | Funciones verificadas; decidir el PR a `main` (K4) |
| 2 · Entorno | Reactivar el entorno de pruebas aislado; reproducir el esquema (E1) | Q3 | Esquema equivalente y datos sintéticos propios |
| 3 · Evidencia | E-1 a E-5 | Fase 2 | Resultados de W1–W12 documentados |
| 4 · DA-01 | Credencial, permisos, repositorios, ADR-014 v2.0 / PR-018 v3.0 | Aprobación técnica | Criterios de [decisiones.md §4](decisiones.md#4-da-01--alternativas-de-implementación-propuesta-sin-aprobación-técnica) |
| 5 · I1 | Autor registrado; nombres visibles según Q7 | Fase 4, Q7 | Toda escritura nueva tiene autor |
| 6 · DA-03 | Eventos de incidencias y OT | Fase 4, D1–D12 | Criterios de [decisiones.md §6](decisiones.md#6-da-03--modelo-conceptual-de-eventos-concepto-aprobado-esquema-sin-aprobar) |
| 7 · DA-04 | Matrices y datos por transición | CC-015, T-01 a T-13 | Transiciones fuera de la matriz rechazadas en el backend y en la base |
| 8 · DA-02 | INSPECCIONES, OT de inspección, vínculo con las evaluaciones | CC-015, ADR-016, X1, Q6–Q9 | Criterios de [decisiones.md §8](decisiones.md#8-da-02--evidencia-del-modelo-inspecciones) |
| Transversal | T1 en el repositorio y en CI contra el entorno de pruebas | Fase 2 | Las pruebas L y W corren en cada cambio de esquema o políticas |
