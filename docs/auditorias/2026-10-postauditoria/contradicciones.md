# Contradicciones documentales y de gobernanza — Auditoría postdemo 2026-10

Documento de evidencia, no normativo. Registra contradicciones **abiertas**. Ninguna se resuelve aquí: la autora instruyó (2026-10-11) **no cambiar las reglas del motor ni los permisos** para resolverlas, y conservar la evidencia y las decisiones pendientes.

Verificado sobre `main` (`7913a13`, que integra los PR #16 y #17).

---

## C1 — Motor de riesgo basado en reglas en estado de borrador · PRIORITARIA

| Campo | Contenido |
|---|---|
| Estado | **ABIERTA — PENDIENTE DE DECISIÓN** |
| Qué dice la regla | **PR-011 v2.0:** "Solo se implementan reglas vigentes de una versión publicada"; "`rule_version` corresponde a `MAJOR.MINOR` de la versión publicada del paquete metodológico (PR-002)". **`docs/methodology/00-index.md`**: "Versión vigente del paquete metodológico: ninguna publicada todavía"; "Mientras no exista una versión publicada no hay reglas vigentes implementables: no se implementa metodología en `services/rules/` (PR-002 v2.2, PR-011 v2.0)"; la hoja REGLAS_INDICADORES del Excel maestro tiene la estructura "pero sin reglas metodológicas cargadas (0 reglas)" |
| Qué hay implementado | `src/services/rules/treeRisk.ts` implementa R01–R03, M01–M03 y R04 desde `borrador_reglas_diagramas_v3.xlsx` (hojas REGLAS_INDICADORES y CHEQUEO_PUNTAJES del borrador), más MATRICES_CALCULO, DICCIONARIO_CAMPOS y LISTAS del Excel maestro. `tree_risk_assessments.rule_version` tiene por defecto `'borrador_reglas_diagramas_v3'` (no tiene formato `MAJOR.MINOR`). Está en `main` desde el PR #16 |
| Reconocimiento previo | CC-024 lo menciona ("`rule_version` sin cambio (`borrador_reglas_diagramas_v3`; sin versión publicada)") y `HANDOFF.md` lo describe como trabajo de la demo. **Ningún CC autoriza expresamente** implementar reglas antes de publicar 2.0.0 |
| Impacto | Los resultados de riesgo guardados (4, sintéticos) dependen de reglas no publicadas. Si el paquete 2.0.0 difiere, esos resultados no son reproducibles con la versión oficial. La regla de gobernanza (PR-011) y la implementación se contradicen en `main` |
| Opciones (para decidir; ninguna aprobada) | (a) Registrar una **excepción controlada**: un CC que autorice la implementación provisional para desarrollo/pruebas, con `rule_version` de borrador y condiciones de reemplazo. (b) Acelerar la **publicación del paquete 2.0.0** con las reglas del borrador v3 cargadas en REGLAS_INDICADORES y fijar `rule_version` en formato `MAJOR.MINOR`. (c) **Marcar los resultados como provisionales** en la interfaz y la API hasta (a) o (b) |
| Restricción vigente | No modificar el motor ni sus reglas para resolver C1 |
| Depende de | Decisión metodológica de la autora; afecta a C4 |
| Referencias | PR-002 v2.2, PR-011 v2.0, `workflow.md` §14.10 y §14.12, CC-024, `treeRisk.ts`, migración 007 |

## C2 — ADR-006 contradice CC-022 sobre las atribuciones del Administrador · PRIORITARIA

| Campo | Contenido |
|---|---|
| Estado | **ABIERTA — PENDIENTE DE DECISIÓN** |
| Qué dice ADR-006 v1.1 (vigente) | "`admin`: gestión; **evaluación técnica**; operaciones técnicas." · "El usuario municipal no es inspector técnico." |
| Qué dice CC-022 | **PR-004 v5.0:** el Administrador "no realiza: … evaluaciones técnicas (estructural, vitalidad, riesgo, infraestructura); registro de órdenes de trabajo o incidencias, ni cambios de su estado"; solo lectura de los datos del proyecto. **PR-003 v6.0:** el Usuario municipal registra OT y cambia estados; mientras CC-015 se resuelve, conserva el registro de evaluaciones en el entorno de desarrollo. **PR-009 v2.0:** las inspecciones "no son realizadas por el Administrador" |
| Qué hay implementado | CC-022 (migración 011, `assertProjectWriter`, interfaz de solo lectura): el administrador no escribe datos del proyecto |
| Cómo surgió | El checklist de sincronización de CC-022 marca "[x] PR / ADR — PR-003 v6.0, PR-004 v5.0, PR-009 v2.0", pero **ADR-006 no se actualizó**. Además, ADR-014 sigue citando "PR-003 v4.0 / PR-004 v4.0" como reglas relacionadas |
| Impacto | Un agente o persona que lea ADR-006 recibe una atribución de roles contraria a la vigente. Riesgo de regresión si se "corrige" el código según el ADR |
| Opciones (para decidir) | (a) **ADR-006 v2.0** alineada con CC-022 y con lo que siga pendiente en CC-015. (b) **Nota de reemplazo parcial** en ADR-006 v1.1 que remita a PR-003 v6.0 / PR-004 v5.0, dejando la versión nueva para el cierre de CC-015. (c) Reabrir el checklist de CC-022 y completar la sincronización dentro de ese CC |
| Restricción vigente | No modificar roles ni permisos para resolver C2 |
| Depende de | CC-015 (modelo de roles: Administrador, Usuario municipal, Inspector, Mantenimiento; varios roles por persona; rol por proyecto) |
| Referencias | ADR-006 v1.1, ADR-014 v1.0, PR-003 v6.0, PR-004 v5.0, PR-009 v2.0, CC-015, CC-022, migración 011 |

---

## C3 a C12 — Otras contradicciones o documentos desactualizados

| ID | Documento | Problema | Evidencia | Tratamiento propuesto | Estado |
|---|---|---|---|---|---|
| C3 | `architecture-decisions.md` ADR-014 v1.0 | Describe "RLS en 6 tablas, 15 policies" (migración 005); 007, 008, 010 y 011 la ampliaron. DA-01 revisará su decisión central | ADR-014, secciones Decisión y Consecuencias | Actualizar junto con la revisión de ADR-014 por DA-01, para no editarla dos veces | ABIERTA |
| C4 | `docs/methodology/01-roots-base.md` a `05-infrastructure.md` (v1.1) | Describen como pendientes reglas que el motor implementa (p. ej. la agregación del tronco en `02-trunk.md`) | `02-trunk.md` líneas 14-15 | Coherente con su advertencia de "contenido transitorio" (00-index punto 3). No se toca por separado: depende de C1 | ABIERTA |
| C5 | `HANDOFF.md` | Cabecera del 2026-10-06; "Rama vigente `main`"; "sin commit"; CC-024 "sin commit, en el worktree" (ya fusionado por el PR #17); la afirmación "project-rules dice R02 máx. 18 / R03 máx. 9" no se encontró en `project-rules.md` de `main` | Secciones Metadatos y Auditoría del motor | Cabecera, estado y punto de reanudación actualizados en la rama `docs/postauditoria-2026-10`; la afirmación R02/R03 queda marcada para verificar | EN ESTA RAMA (sin commit) |
| C6 | `README.md` (backend) | "8 suites / 68 tests"; la lista "no implementado" incluye el motor, la escritura de árboles e incidencias; el contrato documenta 2 de unos 27 endpoints | README, Estado actual y Contrato | Actualizar estado y contrato (cambio documental) | ABIERTA |
| C7 | `docs/roadmap.md` | Sin actualizar desde 2026-09-16 ("Frontend productivo … no iniciado"; "`services/rules/` … no creado todavía") | `git log` del archivo | Nota de vigencia y sección "Postauditoría 2026-10" en esta rama; las secciones antiguas se tachan solo cuando su documento de origen lo confirme (convención del propio archivo) | EN ESTA RAMA (parcial) |
| C8 | Frontend `docs/frontend-architecture.md` | Bitácora hasta SIG-1; "8/8 endpoints"; sin riesgo, módulos, caché, tema, CC-022 ni CC-024 | Secciones 4 y 7 | Rama `docs/` en el repositorio frontend | ABIERTA |
| C9 | Frontend `.env.example` | "Estas variables todavía no se consumen (F0/F1)" | Comentario | Corregir el comentario | ABIERTA |
| C10 | Comentarios de código | `IncidentsPage.tsx`, `MaintenancePage.tsx` ("solo Administrador"); `moduleRecords.repository.ts` ("el servicio exige admin"); `fn_create_tree_with_measurement` ("admin transversal") | Hallazgo M2 | Cambio pequeño de código (sin cambio de comportamiento), fuera de esta rama documental | ABIERTA |
| C11 | Excel maestro | Sincronizaciones pendientes: CC-022 (USUARIOS, "¿Quién lo ingresa?"), CC-024 (DUDAS N13, DICCIONARIO_CAMPOS); nueva inconsistencia X1 | Checklists de CC-022 y CC-024 | Dentro de sus CC; X1 como CC tipo 1 propuesto | ABIERTA |
| C12 | Tablero GitHub, issue #6 | "Merge a `main` solo con aprobación": los merges #16 y #17 los realizó la autora el 2026-10-10 | Historial de PR | Revisar y actualizar el issue | ABIERTA |
