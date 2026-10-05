# Registro de cambios — Valpo Verde

## Propósito

Registro oficial de todos los cambios que afectan la fuente metodológica
(PR-002) o su implementación. Procedimiento, tipos, aprobación, estados,
matriz de impacto y versionado: `docs/workflow.md` §14.

Este registro no es fuente de reglas ni de versiones. Las reglas viven en
la fuente metodológica y en `docs/project-rules.md` /
`docs/architecture-decisions.md`. Las versiones publicadas viven en la
hoja VERSION del Excel maestro.

## Convenciones

- ID: `CC-NNN`, correlativo, nunca reutilizado.
- Tipos: 1 corrección de inconsistencia · 2 metodológico · 3 modelo de
  datos · 4 implementación · 5 documental.
- Estados: `workflow.md` §14.6.
- Aprobación: `marybaxmann` o `Valen-j211` (una basta), §14.5.
- Un CC agrupa todo lo que debe sincronizarse junto. El campo "Origen"
  conserva los IDs de auditoría (por ejemplo `Auditoría v3 · D14, D23, N11`).
- Las fichas no se borran. Un CC descartado o reemplazado mantiene su
  ficha con el estado correspondiente.

## Índice

| ID | Título | Tipo | Estado | Origen | Versión paquete | Bloqueado por | Fecha |
|---|---|---|---|---|---|---|---|
| CC-001 | Fuente de verdad metodológica (PR-002 v2.0) y control de cambios | 2 (+5) | APROBADO METODOLÓGICAMENTE | Diagnóstico de documentación y control de cambios | — (sin versión publicada) | — | 2026-10-04 |
| CC-002 | Hojas REGLAS_INDICADORES y VERSION; registro de la versión previa a 2.0.0 | 3 | APROBADO METODOLÓGICAMENTE | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-003 | Hojas normativas del Excel maestro | por definir | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-004 | Relación entre LISTAS y DICCIONARIO_CAMPOS | 1 | DETECTADO | Diagnóstico de documentación y control de cambios | — | CC-003 | 2026-10-04 |
| CC-005 | Datos personales en la hoja USUARIOS | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-006 | Archivos fuente `.drawio` de los diagramas | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-007 | Inconsistencias documentales (README, roadmap, checkpoint, CLAUDE.md, workflow §13, frontend) | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |

Las decisiones de la auditoría de diagramas (D1–D23, N1–N12) y sus
pendientes (N13–N21, MP1) se registrarán en CC posteriores, que
conformarán el paquete 2.0.0.

---

## Plantilla de ficha

### CC-NNN — Título breve

| Campo | Valor |
|---|---|
| Fecha | AAAA-MM-DD |
| Origen | |
| Tipo | principal (+ secundarios) |
| Estado | |
| Regla / campo afectado | |
| Versión anterior | (paquete / PR / ADR / regla) |
| Versión nueva | |
| Motivo | |
| Fundamento / fuente | |
| Archivos afectados | |
| Impacto en diagramas | |
| Impacto en Excel metodológico | (hojas y filas / celdas) |
| Impacto en BD | |
| Impacto en backend | |
| Impacto en API | |
| Impacto en frontend | |
| Pruebas necesarias | |
| Dependencias | |
| rule_version | anterior → nueva (o "sin cambio") |
| Aprobado por | marybaxmann / Valen-j211 |
| Fecha de aprobación | |
| Fecha de implementación | (o "sin implementación") |
| Commits / PR asociados | |
| Observaciones | |

**Checklist de sincronización** (lo que no aplica se marca `N/A` con su
motivo)

- [ ] Diagrama
- [ ] REGLAS_INDICADORES
- [ ] MATRICES_CALCULO
- [ ] DICCIONARIO_CAMPOS
- [ ] VERSION
- [ ] docs/methodology/
- [ ] PR / ADR
- [ ] Export de texto
- [ ] Verificación §14.9 (fuente)
- [ ] Migración + schema.sql
- [ ] Backend (services/rules)
- [ ] API / Zod
- [ ] Frontend
- [ ] Verificación §14.9 (implementación)
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| | | | |

---

## Fichas

### CC-001 — Fuente de verdad metodológica (PR-002 v2.0) y control de cambios

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04), derivado de la auditoría de diagramas (borrador v3). |
| Tipo | 2 — gobernanza metodológica: fuente de verdad y precedencia (+5 documental) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | PR-002, PR-011, PR-016; `docs/workflow.md` §2, §4, §5, §6, §10 y nueva §14; `CLAUDE.md` (orden de lectura, metodología técnica, reglas transversales); `docs/methodology/00-index.md` (propósito, estado de transición, precedencia, marcas de contenido transitorio); agentes `rules-engine`, `architect`, `qa`; creación de este registro. |
| Versión anterior | PR-002 v1.0 (el texto de `docs/methodology/` prevalecía sobre los diagramas); PR-011 v1.0; PR-016 v2.0; sin control de cambios formal ni formato de `rule_version`. |
| Versión nueva | PR-002 v2.0 (paquete metodológico versionado, sin precedencia interna); PR-011 v2.0; PR-016 v3.0; `docs/workflow.md` §14 (control de cambios, estados, matriz de impacto, verificación de sincronización, versionado `MAJOR.MINOR.PATCH` y `rule_version` = `MAJOR.MINOR`). |
| Motivo | La precedencia vigente contradecía la fuente metodológica adoptada (Excel maestro + diagramas) y permitía resolver contradicciones eligiendo un artefacto. No existía un registro de cambios con ID, impacto, estado ni trazabilidad. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-04: aprobación de la fuente de verdad como paquete versionado sin precedencia interna, de los IDs `CC-NNN`, del registro en Markdown, de la §14, de los estados, de las aprobadoras, del versionado y de la versión inicial 2.0.0. |
| Archivos afectados | Creado: `docs/registro-cambios.md`. Modificados: `docs/project-rules.md`, `docs/workflow.md`, `CLAUDE.md`, `docs/methodology/00-index.md`, `.claude/agents/rules-engine.md`, `.claude/agents/architect.md`, `.claude/agents/qa.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno. Las hojas REGLAS_INDICADORES y VERSION corresponden a CC-002. |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno en código. Consecuencia normativa: mientras no exista una versión publicada del paquete no se implementa metodología en `services/rules/` (hoy no existe código metodológico). |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | No aplica (sin implementación). Verificación documental: ninguna referencia vigente debe atribuir precedencia a la especificación textual sobre los diagramas ni remitir la fuente metodológica solo a `docs/methodology/`. |
| Dependencias | Ninguna. Habilita CC-002 y los CC del paquete 2.0.0. |
| rule_version | sin cambio (no existe versión publicada) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-04 |
| Fecha de implementación | sin implementación (cambio de gobernanza documental) |
| Commits / PR asociados | pendiente (sin commit hasta revisión) |
| Observaciones | Los documentos `docs/methodology/01-roots-base.md` a `05-infrastructure.md` no se modifican en este CC: `00-index.md` declara su condición transitoria y deja sin efecto sus frases de precedencia. Su reemplazo como historial ocurrirá con el paquete 2.0.0. Pendientes detectados durante este CC: CC-003 a CC-007. |

**Checklist de sincronización**

- [x] Diagrama — N/A: no se modifica lógica ni diagramas.
- [x] REGLAS_INDICADORES — N/A: la hoja aún no existe (CC-002).
- [x] MATRICES_CALCULO — N/A: sin cambio de contenido metodológico.
- [x] DICCIONARIO_CAMPOS — N/A: sin cambio de contenido metodológico.
- [x] VERSION — N/A: la hoja aún no existe (CC-002).
- [x] docs/methodology/ — `00-index.md` actualizado solo en gobernanza, precedencia y marcas de transición.
- [x] PR / ADR — PR-002 v2.0, PR-011 v2.0, PR-016 v3.0. Sin ADR afectadas.
- [x] Export de texto — N/A: no existe todavía.
- [x] Verificación §14.9 (fuente) — N/A: no se modifican artefactos metodológicos.
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [ ] Revisión final — pendiente de revisión por una aprobadora antes del commit.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Contradicción entre PR-002 v1.0 y la fuente metodológica adoptada; ausencia de control de cambios. |
| 2026-10-04 | EN REVISIÓN | — | Diagnóstico de documentación y propuesta consolidada. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Propuesta consolidada aprobada; implementación autorizada solo para el alcance de CC-001. Cambios escritos en la rama `claude/valpo-verde-frontend-p2-kh1bcx` del repositorio backend, sin commit, pendientes de revisión. Al integrarse: `CERRADO` (sin implementación). |

---

### CC-002 — Hojas REGLAS_INDICADORES y VERSION; registro de la versión previa a 2.0.0

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 3 |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | Excel maestro: creación de las hojas REGLAS_INDICADORES y VERSION con la estructura formal aprobada (ver Observaciones); registro del Excel actual como "previa a 2.0.0 — sin versión formal" en la hoja VERSION. |
| Versión anterior | Excel maestro sin versión formal, sin hojas REGLAS_INDICADORES ni VERSION. |
| Versión nueva | Excel maestro con ambas hojas creadas (estructura y fila inicial de VERSION), sin filas de reglas. Las reglas se cargan en los CC que conformarán el paquete 2.0.0. |
| Motivo | Preparar el paquete metodológico 2.0.0: las reglas por indicador no tienen lugar en MATRICES_CALCULO y el paquete necesita un registro interno de versiones (PR-002 v2.0). |
| Fundamento / fuente | Estructura de ambas hojas aprobada por `marybaxmann` el 2026-10-04, incluida la conservación de las reglas reemplazadas en la misma hoja REGLAS_INDICADORES y el registro del Excel actual como versión previa a 2.0.0. |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Dos hojas nuevas. Sin cambios en MATRICES_CALCULO, DICCIONARIO_CAMPOS ni otras hojas. |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | Verificar que ambas hojas tengan exactamente las columnas aprobadas, sus catálogos y la fila inicial de VERSION. |
| Dependencias | CC-001. |
| rule_version | sin cambio |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-04 |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No implementado: el Excel maestro no se modifica hasta una autorización explícita. **Estructura aprobada.** REGLAS_INDICADORES (21 columnas): `id_regla`, `componente`, `codigo_indicador`, `indicador`, `tipo_regla`, `orden`, `condicion`, `campos_utilizados`, `resultado`, `puntaje`, `regla_agregadora`, `max_indicador`, `residual`, `estado_regla` (vigente · pendiente · reemplazada · descartada), `version_desde`, `version_hasta`, `reemplazada_por`, `cc`, `fundamento_fuente`, `diagrama_ref`, `observaciones`; las reglas reemplazadas permanecen en la misma hoja y nunca se interpretan como activas. VERSION (10 columnas): `version_paquete`, `rule_version`, `estado` (en preparación · publicada · reemplazada · sin versión formal), `fecha_publicacion`, `cc_incluidos`, `aprobado_por`, `fecha_aprobacion`, `tag_git`, `version_anterior`, `observaciones`; fila inicial "previa a 2.0.0 — sin versión formal". |

**Checklist de sincronización**

- [ ] Diagrama — N/A: sin cambios.
- [ ] REGLAS_INDICADORES — crear hoja con la estructura aprobada (sin filas de reglas).
- [ ] MATRICES_CALCULO — N/A: sin cambios.
- [ ] DICCIONARIO_CAMPOS — N/A: sin cambios.
- [ ] VERSION — crear hoja con la estructura aprobada y la fila inicial.
- [ ] docs/methodology/ — actualizar el estado de transición de `00-index.md` al implementarse.
- [ ] PR / ADR — N/A.
- [ ] Export de texto — N/A hasta que exista el export.
- [ ] Verificación §14.9 (fuente) — solo los puntos aplicables a la estructura.
- [ ] Migración + schema.sql — N/A.
- [ ] Backend (services/rules) — N/A.
- [ ] API / Zod — N/A.
- [ ] Frontend — N/A.
- [ ] Verificación §14.9 (implementación) — N/A.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Estructura aprobada; modificación del Excel maestro no autorizada todavía. |

---

### CC-003 — Hojas normativas del Excel maestro

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | por definir en revisión |
| Estado | DETECTADO |
| Regla / campo afectado | Hojas del Excel maestro distintas de MATRICES_CALCULO, DICCIONARIO_CAMPOS, REGLAS_INDICADORES y VERSION: ARBOLES, REGISTRO_EVALUACION, INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS, LISTAS, INDICES. |
| Versión anterior | Sin definición. |
| Versión nueva | Por definir. |
| Motivo | PR-002 v2.0 enumera las hojas normativas; falta decidir si las demás forman parte del paquete o son anexos. |
| Fundamento / fuente | — |
| Archivos afectados | Por definir. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | — |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No resuelto en CC-001. |

---

### CC-004 — Relación entre LISTAS y DICCIONARIO_CAMPOS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 1 (probable) |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja LISTAS y columna "Unidad / valores" de DICCIONARIO_CAMPOS. |
| Versión anterior | Ambas hojas definen valores permitidos; el propio diccionario anota listas inconsistentes en algunos campos. |
| Versión nueva | Por definir. |
| Motivo | Dos lugares que definen catálogos pueden contradecirse. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-003. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No resuelto en CC-001. |

---

### CC-005 — Datos personales en la hoja USUARIOS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 5 (no metodológico) |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja USUARIOS del Excel maestro (nombres y correos reales) en un repositorio público. |
| Versión anterior | Datos personales reales. |
| Versión nueva | Por definir. |
| Motivo | Exposición de datos personales. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | — |
| Dependencias | — |
| rule_version | sin cambio |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Los datos también permanecen en el historial de git de versiones anteriores del Excel; el alcance del saneamiento debe decidirse en la revisión. No resuelto en CC-001. |

---

### CC-006 — Archivos fuente `.drawio` de los diagramas

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 5 |
| Estado | DETECTADO |
| Regla / campo afectado | Diagramas de decisión (radicular, tronco, copa y ramas, infraestructura). |
| Versión anterior | En el repositorio solo hay JPG y una exportación JSON que perdió las etiquetas Sí/No. |
| Versión nueva | Por definir: incorporar los `.drawio` fuente. |
| Motivo | PR-002 v2.0 requiere archivo fuente y exportación de cada diagrama. |
| Fundamento / fuente | — |
| Archivos afectados | `docs/excel/diagramas/` (ubicación futura según el paquete 2.0.0). |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | — |
| Dependencias | — |
| rule_version | sin cambio |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No resuelto en CC-001. |

---

### CC-007 — Inconsistencias documentales

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 5 |
| Estado | DETECTADO |
| Regla / campo afectado | Ver observaciones. |
| Versión anterior | Textos desactualizados. |
| Versión nueva | Por definir. |
| Motivo | Documentación que no refleja el estado real. |
| Fundamento / fuente | — |
| Archivos afectados | Backend: `README.md`, `docs/roadmap.md`, `docs/checkpoint-2026-09-16.md`, `CLAUDE.md`, `docs/workflow.md` §13, `docs/excel/readme.md`, `docs/excel/diagramas/readme.md`. Frontend (repositorio separado): `README.md`, `docs/frontend-architecture.md`. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Ninguno funcional. |
| Pruebas necesarias | — |
| Dependencias | — |
| rule_version | sin cambio |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | (1) `README.md`: el árbol de `database/` lista solo las migraciones 001 y 002. (2) `docs/roadmap.md`: la sección "Frontend productivo" dice que el repositorio no está creado; la sección "Metodología" está superada; el formato de `rule_version` ya quedó definido (§14.10). (3) `docs/checkpoint-2026-09-16.md`: foto histórica con §14–§15 desactualizadas; decidir si se anota o se deja como histórico. (4) `CLAUDE.md`: "`valpo-verde-frontend` = nombre previsto… No asumir que hoy son el mismo repositorio"; el repositorio ya existe. (5) `docs/workflow.md` §13: dice que ningún subagente existe; ya existen cinco en `.claude/agents/`. (6) Frontend: `README.md` y `docs/frontend-architecture.md` indican F7 sin commit; está committeado (`142d293`). (7) Los `readme.md` de `docs/excel/` quedarán obsoletos al trasladar el paquete. (8) `docs/roadmap.md` línea 10: "ante cualquier diferencia con … `docs/methodology/`, esos documentos mandan" — debe remitir al paquete metodológico (PR-002 v2.0), como ya lo hace `CLAUDE.md`. No resuelto en CC-001. |
