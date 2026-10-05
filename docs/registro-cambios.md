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
| CC-001 | Fuente de verdad metodológica (PR-002 v2.0) y control de cambios | 2 (+5) | CERRADO (sin implementación) | Diagnóstico de documentación y control de cambios | — (sin versión publicada) | — | 2026-10-04 |
| CC-002 | Hojas REGLAS_INDICADORES y VERSION; registro de la versión previa a 2.0.0 | 3 | CERRADO (sin implementación) | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-003 | Composición normativa del Excel maestro y autoridad de cada artefacto (PR-002 v2.1) | 2 (+5) | CERRADO (sin implementación) | Diagnóstico de documentación y control de cambios; auditoría de hojas del Excel maestro | — (sin versión publicada) | — | 2026-10-04 |
| CC-004 | Relación entre LISTAS y DICCIONARIO_CAMPOS | 1 (+5) | CERRADO (sin implementación) | Diagnóstico de documentación y control de cambios; auditoría de hojas del Excel maestro (CC-003) | 2.0.0 (en preparación) | — | 2026-10-04 |
| CC-005 | Datos personales en la hoja USUARIOS | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-006 | Archivos fuente `.drawio` de los diagramas | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-007 | Inconsistencias documentales (README, roadmap, checkpoint, CLAUDE.md, workflow §13, frontend) | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-008 | Columna `ambito` en DICCIONARIO_CAMPOS y ajuste de `workflow.md` §14.10 | 3 (+2) | FUENTE SINCRONIZADA | Auditoría de hojas del Excel maestro (CC-003); decisión G1 (2026-10-05) | 2.0.0 (en preparación) | — | 2026-10-05 |
| CC-009 | Validación de `clase_edad` en ARBOLES | 1 | FUENTE SINCRONIZADA | Auditoría de hojas del Excel maestro (CC-003); resuelto junto con CC-020 | 2.0.0 (en preparación) | — | 2026-10-05 |
| CC-010 | `nivel_riesgo` y `resultado_general` manuales en INSPECCIONES frente a `clasificacion_riesgo` (R04) | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-011 | `prioridad_reportada`, Prioridad de OT y `clasificacion_prioridad` (M05) | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-012 | Menús dependientes, rangos con nombre y validaciones técnicas de los anexos | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-013 | Cobertura de DICCIONARIO_CAMPOS para entidades operativas y normalización de nombres | 3 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-014 | Eliminar la duplicación de R01–R04 y M01–M05 en DICCIONARIO_CAMPOS | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | Sincronización del paquete 2.0.0 | 2026-10-04 |
| CC-015 | Consolidación de roles (PR-003, PR-004, PR-009, USUARIOS, "¿Quién lo ingresa?") | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-016 | Auditoría y eventual adopción de INDICES | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-017 | Ubicación de `cumplimiento_distancia_seguridad_bt_mt` | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-018 | Normalización y saneamiento de datos de ejemplo | 5 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-019 | Arquitectura SIG con ArcGIS (ADR-015; ADR-010 v2.0; PR-015 v2.0; PR-006 v6.0) | 5 | CERRADO (sin implementación) | Decisión SIG-0 (auditoría SIG de backend y frontend) | — (fuera del paquete) | — | 2026-10-04 |
| CC-020 | Separación entre identidad del árbol y medición dendrométrica (ADR-016; PR-006 v7.0; PR-003 v5.0; PR-002 v2.2) | 3 (+1) | FUENTE SINCRONIZADA | Auditoría árbol / medición previa a INV-1 (2026-10-05) | 2.0.0 (en preparación) | — | 2026-10-05 |

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
| Estado | CERRADO (sin implementación) |
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
| Commits / PR asociados | `437109b` — [CC-001] Fuente de verdad metodológica (PR-002 v2.0) y control de cambios (rama `claude/valpo-verde-frontend-p2-kh1bcx`, repositorio backend). Cierre registrado en un commit documental posterior. |
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
- [x] Revisión final — revisado y aprobado por marybaxmann (2026-10-04) antes del commit; documentos verificados tras el commit `437109b`.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Contradicción entre PR-002 v1.0 y la fuente metodológica adoptada; ausencia de control de cambios. |
| 2026-10-04 | EN REVISIÓN | — | Diagnóstico de documentación y propuesta consolidada. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Propuesta consolidada aprobada; implementación autorizada solo para el alcance de CC-001. Cambios escritos en la rama `claude/valpo-verde-frontend-p2-kh1bcx` del repositorio backend, sin commit, pendientes de revisión. Al integrarse: `CERRADO` (sin implementación). |
| 2026-10-04 | CERRADO (sin implementación) | marybaxmann | Commit `437109b` publicado en la rama del repositorio backend; documentos verificados. Sin implementación en BD, backend, API ni frontend. |

---

### CC-002 — Hojas REGLAS_INDICADORES y VERSION; registro de la versión previa a 2.0.0

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 3 |
| Estado | CERRADO (sin implementación) |
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
| Fecha de implementación | 2026-10-04 (Excel maestro). Sin implementación en BD, backend, API ni frontend. |
| Commits / PR asociados | `3df0cd2` — [CC-002] Crear VERSION y REGLAS_INDICADORES en Excel maestro (rama `claude/valpo-verde-frontend-p2-kh1bcx`, repositorio backend). Cierre registrado en un commit documental posterior. |
| Observaciones | **Implementación (2026-10-04):** las dos hojas se agregaron como partes nuevas del archivo `.xlsx` (`xl/worksheets/sheet12.xml` y `sheet13.xml`), registradas en `workbook.xml`, `workbook.xml.rels`, `[Content_Types].xml` y `docProps/app.xml`. Las 11 hojas existentes, estilos, textos compartidos y rangos con nombre quedaron idénticos byte a byte. SHA-256 antes `5b5748a2…6c56022`, después `a71b289b…a4df905e37`. Validaciones agregadas solo para los catálogos y rangos aprobados. Revisión manual en Microsoft Excel por marybaxmann (2026-10-04): el archivo abre correctamente; VERSION y su fila inicial verificadas. **Estructura aprobada.** REGLAS_INDICADORES (21 columnas): `id_regla`, `componente`, `codigo_indicador`, `indicador`, `tipo_regla`, `orden`, `condicion`, `campos_utilizados`, `resultado`, `puntaje`, `regla_agregadora`, `max_indicador`, `residual`, `estado_regla` (vigente · pendiente · reemplazada · descartada), `version_desde`, `version_hasta`, `reemplazada_por`, `cc`, `fundamento_fuente`, `diagrama_ref`, `observaciones`; las reglas reemplazadas permanecen en la misma hoja y nunca se interpretan como activas. VERSION (10 columnas): `version_paquete`, `rule_version`, `estado` (en preparación · publicada · reemplazada · sin versión formal), `fecha_publicacion`, `cc_incluidos`, `aprobado_por`, `fecha_aprobacion`, `tag_git`, `version_anterior`, `observaciones`; fila inicial "previa a 2.0.0 — sin versión formal". |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES — hoja creada con las 21 columnas aprobadas y 0 reglas.
- [x] MATRICES_CALCULO — N/A: sin cambios (verificado).
- [x] DICCIONARIO_CAMPOS — N/A: sin cambios (verificado).
- [x] VERSION — hoja creada con las 10 columnas aprobadas y solo la fila "previa a 2.0.0".
- [x] docs/methodology/ — estado de transición de `00-index.md` actualizado (punto 1).
- [x] PR / ADR — N/A.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — puntos aplicables verificados: columnas, catálogos, fila inicial y ausencia de cambios en las demás hojas. Resto N/A (sin reglas cargadas ni versión publicada).
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [x] Revisión final — revisión manual en Microsoft Excel por marybaxmann (2026-10-04).

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Estructura aprobada; modificación del Excel maestro no autorizada todavía. |
| 2026-10-04 | FUENTE SINCRONIZADA | marybaxmann | Implementación autorizada; hojas creadas en el Excel maestro y revisadas manualmente en Microsoft Excel. `00-index.md` actualizado. Al verificarse el commit: `CERRADO` (sin implementación en BD, backend, API ni frontend). |
| 2026-10-04 | CERRADO (sin implementación) | marybaxmann | Commit `3df0cd2` publicado y verificado: REGLAS_INDICADORES con 0 reglas, VERSION solo con la fila "previa a 2.0.0", 11 hojas existentes sin cambios. Sin implementación en BD, backend, API ni frontend. |

---

### CC-003 — Composición normativa del Excel maestro y autoridad de cada artefacto

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios; auditoría de las 13 hojas del Excel maestro (commit `3df0cd2`). |
| Tipo | 2 — gobernanza metodológica: composición del paquete y autoridad (+5 documental) |
| Estado | CERRADO (sin implementación) |
| Regla / campo afectado | PR-002; `docs/methodology/00-index.md` (propósito y estado de transición); `docs/workflow.md` §14.2 (lista de artefactos sincronizados). |
| Versión anterior | PR-002 v2.0: "hojas normativas MATRICES_CALCULO, DICCIONARIO_CAMPOS, REGLAS_INDICADORES y VERSION"; sin clasificación de las demás hojas ni reglas de autoridad entre artefactos. |
| Versión nueva | PR-002 v2.1: composición del Excel maestro (núcleo normativo: DICCIONARIO_CAMPOS, REGLAS_INDICADORES, MATRICES_CALCULO; gobernanza: VERSION; catálogo controlado subordinado: LISTAS; módulo metodológico en propuesta: INDICES; anexos operativos no normativos: ARBOLES, REGISTRO_EVALUACION, INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS), autoridad por tipo de información, frontera DICCIONARIO / REGLAS / MATRICES, principio "cada pieza de lógica en un solo lugar" y relación con el modelo de datos. `workflow.md` §14.2 incluye LISTAS. |
| Motivo | Sin una clasificación formal, las hojas operativas, LISTAS e INDICES funcionaban como fuentes paralelas de dominios, roles y resultados, y DICCIONARIO_CAMPOS repetía lógica de MATRICES_CALCULO. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-04 (aprobación de la dirección de CC-003 y ajustes finales). |
| Archivos afectados | `docs/project-rules.md` (PR-002; referencias operativas en PR-011 v2.0 y PR-016 v3.0), `docs/methodology/00-index.md`, `docs/workflow.md` (§14.2; referencias operativas en §2, §5 y §10), `CLAUDE.md`, `.claude/agents/rules-engine.md`, `.claude/agents/architect.md`, `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno. Las contradicciones detectadas en las hojas se registran como CC separados. |
| Impacto en BD | Ninguno. Aclaración normativa: DICCIONARIO_CAMPOS define el contrato funcional de los campos, no el esquema físico. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | No aplica (documental). Verificación: ningún documento vigente atribuye a las hojas operativas, a USUARIOS ni a INDICES el carácter de fuente normativa vigente. |
| Dependencias | CC-001, CC-002. Habilita CC-004 y CC-008 a CC-018. |
| rule_version | sin cambio |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-04 |
| Fecha de implementación | sin implementación (cambio de gobernanza documental) |
| Commits / PR asociados | `99fcba0` — [CC-003] Definir composición y autoridad del paquete metodológico (rama `claude/valpo-verde-frontend-p2-kh1bcx`, repositorio backend). Cierre registrado en un commit documental posterior. |
| Observaciones | No se corrige ninguna contradicción dentro de CC-003. Se amplía CC-004 y se abren CC-008 a CC-018 en estado DETECTADO. Referencias operativas a "PR-002 v2.0" cambiadas a "PR-002" (opción (a) aprobada por marybaxmann el 2026-10-04) en `CLAUDE.md`, `docs/workflow.md` §2/§5/§10, agentes `rules-engine` y `architect`, PR-011 v2.0 y PR-016 v3.0; se conservan las referencias históricas (campos "Reemplaza"/"Reemplazada por", motivos de reemplazo y fichas CC). Pendiente: `docs/methodology/00-index.md`, sección "Regla de precedencia", mantiene la referencia operativa "PR-002 v2.0"; no estaba incluida en la lista autorizada para el ajuste. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES — N/A: sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios.
- [x] DICCIONARIO_CAMPOS — N/A: sin cambios.
- [x] VERSION — N/A: sin cambios.
- [x] docs/methodology/ — `00-index.md`: propósito y punto 7 del estado de transición.
- [x] PR / ADR — PR-002 v2.1. Sin ADR afectadas.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — N/A: no se modifican artefactos metodológicos.
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [x] Revisión final — revisado y aprobado por marybaxmann (2026-10-04) antes del commit; documentos verificados tras el commit `99fcba0`.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Falta de definición de las hojas normativas del Excel maestro. |
| 2026-10-04 | EN REVISIÓN | — | Auditoría de las 13 hojas y propuesta de clasificación. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Ficha final aprobada; implementación documental autorizada. Cambios escritos en la rama del repositorio backend, sin commit, pendientes de revisión. |
| 2026-10-04 | CERRADO (sin implementación) | marybaxmann | Commit `99fcba0` publicado y verificado. Sin implementación en Excel, diagramas, BD, backend, API ni frontend. |

---

### CC-004 — Relación entre LISTAS y DICCIONARIO_CAMPOS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04); auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 1 — corrección de inconsistencia entre artefactos de la fuente (+5 documental) |
| Estado | CERRADO (sin implementación) |
| Regla / campo afectado | Hoja LISTAS (nueva tabla P:X); DICCIONARIO_CAMPOS: "Unidad / valores" (H) de `cavidad_basal_interna`, `cavidad_interna_tronco`, `zona_objetivo`, `tasa_ocupacion_objetivo`, `probabilidad_impacto`, `consecuencia_*`, `probabilidad_falla_*`, `clasificacion_*` (componentes), `clasificacion_infraestructura`, `clasificacion_riesgo`, `clasificacion_prioridad`, `Accion_solicitada`, `subtipo_accion`; "Validación y dependencias" (L) de `probabilidad_impacto`, `probabilidad_falla_*`, `clasificacion_*` (componentes), `clasificacion_infraestructura`, `clasificacion_riesgo`, `clasificacion_prioridad`; hoja VERSION (fila 2.0.0 en preparación); `docs/workflow.md` §14.9. |
| Versión anterior | Ambas hojas definen valores permitidos de forma independiente. Contradicciones detectadas (auditoría de CC-003): (1) acciones de OT: "Otra" figura bajo *Evaluación instrumental* en LISTAS y bajo *Reevaluación* en DICCIONARIO_CAMPOS (`subtipo_accion`); (2) Tipos_de_conflicto incluye "Deformación" pero no "Hundimiento", mientras DICCIONARIO_CAMPOS define `presenta_hundimiento_vereda`; (3) una sola lista Materialidad_infraestructura incluye "Baldosa", pero `materialidad_calzada` no la admite; (4) los catálogos de acción y subtipo de OT se mantienen a la vez en LISTAS y en DICCIONARIO_CAMPOS (`Accion_solicitada`, `subtipo_accion`). |
| Versión nueva | LISTAS contiene en P:X la tabla normalizada de catálogos (`id_catalogo`, `codigo`, `etiqueta`, `orden`, `catalogo_padre`, `codigo_padre`, `estado_valor`, `cc`, `observaciones`): 12 catálogos y 70 valores `vigente` — `tipo_ot` (2), `accion` (12), `subtipo_accion` (21), `confirmacion_cavidad_interna` (3) y 8 escalas de 4 valores (`escala_probabilidad_falla`, `escala_nivel_riesgo`, `escala_consecuencia`, `escala_probabilidad_impacto`, `escala_zona_objetivo`, `escala_tasa_ocupacion`, `escala_clasificacion_infraestructura`, `escala_prioridad`). DICCIONARIO_CAMPOS referencia esos dominios como `LISTAS:<id_catalogo>` (19 celdas H, 10 celdas L). Convenciones en `docs/methodology/convenciones-catalogos.md`. |
| Motivo | Dos lugares que definen catálogos pueden contradecirse. Principio de entrada aprobado (2026-10-04): "Un catálogo, un solo lugar" (PR-002 v2.1). |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-04: (a) "Otra" solo bajo Evaluación instrumental, con observaciones obligatorias; (b) Retiro_residuos bajo Tala_retiro; (c) Tipos_de_conflicto descartada, no se migra; (d) materialidad de vereda y de calzada son dominios separados que permanecen en DICCIONARIO_CAMPOS (calzada no admite Baldosa) y Materialidad_infraestructura no se migra; (e) `codigo` persistente en snake_case ASCII, `etiqueta` solo de presentación. Criterio de ubicación (exclusivo y corto → DICCIONARIO; compartido, jerárquico o escala → LISTAS); Sí/No como dominio base; una sola jerarquía `tipo_ot → accion → subtipo_accion` con subtipo null para acciones sin subtipos; LISTAS solo representa escalas (autoridad: REGLAS_INDICADORES y MATRICES_CALCULO); transición del bloque A1:N9 hacia CC-012; F1 (etiqueta larga de `zona_objetivo`) y F2 (etiquetas aprobadas). |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx` (solo LISTAS, DICCIONARIO_CAMPOS y VERSION); `docs/methodology/convenciones-catalogos.md` (nuevo); `docs/workflow.md` §14.9; `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | LISTAS: tabla P1:X71 (encabezado + 70 filas), validación de lista en V2:V5000 y rótulo técnico en A11; bloque A1:N9 y los 14 rangos con nombre sin cambios. DICCIONARIO_CAMPOS: H32, H44, H133–H144, H146–H150 (contenido completo reemplazado por la referencia) y L135, L139–L144, L146–L148 (solo la frase de enumeración); el resto de las celdas sin cambios, incluido "Puntaje total válido 0–9" en L139–L141 (CC-014). VERSION: fila 3 `2.0.0` en preparación, `cc_incluidos` CC-004, sin `rule_version`. Sin cambios en MATRICES_CALCULO, REGLAS_INDICADORES, INDICES ni anexos. |
| Impacto en BD | Ninguno en CC-004. |
| Impacto en backend | Ninguno en CC-004. Necesidad documentada: la validación definitiva de los valores de catálogo es del backend, y se requiere un mecanismo de consulta de catálogos con su contrato funcional (sin endpoints definidos). |
| Impacto en API | Ninguno en CC-004 (no se definen endpoints). |
| Impacto en frontend | Ninguno en CC-004. Necesidad documentada: guardar `codigo` y mostrar `etiqueta`; selects dependientes filtrados por `codigo_padre`; limpiar hijos al cambiar el padre; no hardcodear catálogos compartidos en React. |
| Pruebas necesarias | Verificación del Excel: partes del `.xlsx` distintas de LISTAS, DICCIONARIO_CAMPOS y VERSION idénticas byte a byte; A1:N9 y rangos con nombre sin cambios; conteos por catálogo; unicidad (`id_catalogo`, `codigo`) y formato `^[a-z0-9_]+$`; relaciones padre-hijo; existencia de toda referencia `LISTAS:<id>`; ausencia de enumeraciones en las celdas H/L afectadas; etiquetas de escala frente a MATRICES_CALCULO; filas 2 y 3 de VERSION. Revisión manual en Microsoft Excel. |
| Dependencias | CC-003. Relación de los catálogos con `rule_version` / `version_paquete`: pendiente de CC-008. Regeneración de menús y retiro del bloque A1:N9: CC-012. |
| rule_version | sin cambio (2.0.0 en preparación, sin `rule_version` asignada) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-04 |
| Fecha de implementación | 2026-10-04 (Excel maestro y documentación). Sin implementación en BD, backend, API ni frontend. |
| Commits / PR asociados | `58a5db0` — [CC-004] Normalizar catálogos LISTAS y referencias del diccionario (rama `claude/valpo-verde-frontend-p2-kh1bcx`, repositorio backend). Cierre registrado en un commit documental posterior. |
| Observaciones | **Implementación:** solo se modificaron las partes `xl/worksheets/sheet8.xml` (LISTAS), `sheet9.xml` (DICCIONARIO_CAMPOS) y `sheet13.xml` (VERSION), con celdas `inlineStr` y estilos existentes (s=7 encabezado, s=13 texto); `sharedStrings.xml`, `styles.xml`, `workbook.xml` y demás partes idénticas byte a byte. SHA-256 antes `a71b289b…a4df905e37`, después `bc0520b8…c4b9c974`. **Pendiente registrado (F1):** las filas de M01 en MATRICES_CALCULO usan la forma corta de las etiquetas de `zona_objetivo`; LISTAS usa la forma larga de DICCIONARIO_CAMPOS. Se alinearán en la sincronización del paquete 2.0.0; MATRICES_CALCULO no se modifica en CC-004. **No migrados:** Tipos_de_conflicto (descartada) y Materialidad_infraestructura quedan solo en el bloque técnico A:N hasta CC-012. **Fuera de alcance:** menús (CC-012), datos de ejemplo que guardan la acción como su propio subtipo (CC-018), duplicación R/M y "0–9" (CC-014), ámbito y versionado de catálogos (CC-008); N13–N21 y MP1 siguen PENDIENTE. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios de lógica.
- [x] REGLAS_INDICADORES — N/A: sin cambios (autoridad de las escalas; LISTAS no redefine su lógica).
- [x] MATRICES_CALCULO — N/A: sin cambios (verificado byte a byte). Diferencia de etiquetas de `zona_objetivo` en M01 registrada para 2.0.0.
- [x] DICCIONARIO_CAMPOS — 19 celdas H y 10 celdas L remiten a `LISTAS:<id_catalogo>`.
- [x] VERSION — fila `2.0.0` en preparación con `cc_incluidos` CC-004; fila "previa a 2.0.0" sin cambios.
- [x] docs/methodology/ — `convenciones-catalogos.md` creado.
- [x] PR / ADR — N/A.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — controles de catálogos verificados; puntos de versión publicada, reglas y diagramas N/A (paquete 2.0.0 en preparación, sin reglas cargadas).
- [x] Migración + schema.sql — N/A: sin implementación en CC-004.
- [x] Backend (services/rules) — N/A: sin implementación en CC-004.
- [x] API / Zod — N/A: sin implementación en CC-004.
- [x] Frontend — N/A: sin implementación en CC-004.
- [x] Verificación §14.9 (implementación) — N/A: sin implementación en CC-004.
- [x] Revisión final — revisión del diff y de las verificaciones, y revisión manual en Microsoft Excel, aprobadas por marybaxmann (2026-10-04) antes del commit; verificado tras el commit `58a5db0`.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Catálogos definidos de forma independiente en LISTAS y DICCIONARIO_CAMPOS; contradicciones ampliadas en CC-003. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones (a)–(e), criterio de ubicación, esquema P:X, catálogos, códigos, etiquetas (F1, F2) y transición aprobados; implementación autorizada en el Excel maestro y la documentación. |
| 2026-10-04 | FUENTE SINCRONIZADA | marybaxmann | LISTAS P:X, DICCIONARIO_CAMPOS, VERSION, `convenciones-catalogos.md` y `workflow.md` §14.9 actualizados y verificados. Sin commit, pendiente de revisión manual en Microsoft Excel. Al verificarse el commit: `CERRADO` (sin implementación). |
| 2026-10-04 | CERRADO (sin implementación) | marybaxmann | Commit `58a5db0` publicado y verificado: 12 catálogos y 70 valores en LISTAS P:X, 29 referencias `LISTAS:<id>` en DICCIONARIO_CAMPOS, VERSION 2.0.0 en preparación sin `rule_version`; SHA-256 del Excel `bc0520b8…c4b9c974`. Sin implementación en BD, backend, API ni frontend. |

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
| Observaciones | (1) `README.md`: el árbol de `database/` lista solo las migraciones 001 y 002. (2) `docs/roadmap.md`: la sección "Frontend productivo" dice que el repositorio no está creado; la sección "Metodología" está superada; el formato de `rule_version` ya quedó definido (§14.10). (3) `docs/checkpoint-2026-09-16.md`: foto histórica con §14–§15 desactualizadas; decidir si se anota o se deja como histórico. (4) `CLAUDE.md`: "`valpo-verde-frontend` = nombre previsto… No asumir que hoy son el mismo repositorio"; el repositorio ya existe. (5) `docs/workflow.md` §13: dice que ningún subagente existe; ya existen cinco en `.claude/agents/`. (6) Frontend: `README.md` y `docs/frontend-architecture.md` indican F7 sin commit; está committeado (`142d293`). (7) Los `readme.md` de `docs/excel/` quedarán obsoletos al trasladar el paquete. (8) `docs/roadmap.md` línea 10: "ante cualquier diferencia con … `docs/methodology/`, esos documentos mandan" — debe remitir al paquete metodológico (PR-002 v2.0), como ya lo hace `CLAUDE.md`. (9) `docs/methodology/00-index.md`, sección "Regla de precedencia" (línea 261): referencia residual a "PR-002 v2.0" como fuente única; debe remitir a PR-002 (pendiente registrado en CC-003; anotado en CC-004). No resuelto en CC-001. |

---

### CC-008 — Columna `ambito` en DICCIONARIO_CAMPOS y ajuste de `workflow.md` §14.10

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). Retomado el 2026-10-05 para resolver la decisión G1 (implementación del inventario operativo antes de publicar el paquete 2.0.0), detectada al planificar CC-020. |
| Tipo | 3 (+2 gobernanza de versionado) |
| Estado | FUENTE SINCRONIZADA |
| Regla / campo afectado | DICCIONARIO_CAMPOS (nueva columna N `ambito`); `docs/workflow.md` §14.4 (tipo 4), §14.7, §14.9, §14.10 y nueva §14.12; PR-002 (autoridad de DICCIONARIO_CAMPOS, v2.2); `docs/methodology/00-index.md` (estado de transición, punto 8). |
| Versión anterior | DICCIONARIO_CAMPOS no distinguía campos metodológicos de campos operativos. §14.10 subía MINOR ante cualquier cambio de campos del DICCIONARIO. §14.4 y §14.7 exigían una versión publicada para toda implementación, con lo que ninguna especificación de inventario podía implementarse antes de publicar el paquete 2.0.0. |
| Versión nueva | Columna `ambito` con valores `operativo` y `metodologico`, definidos en `docs/workflow.md` §14.12; un campo sin valor se trata como `metodologico`. Una especificación de ámbito `operativo` puede pasar a implementación desde `FUENTE SINCRONIZADA`, sin esperar la publicación, si no ejecuta reglas metodológicas ni fórmulas pendientes (§14.12, regla 3). Las reglas de evaluación, clasificación, probabilidad de falla, riesgo, afectación global, priorización e indicadores siguen exigiendo una versión publicada y su `rule_version` (§14.12, regla 4). Un cambio limitado a campos `operativo` corresponde a PATCH y no altera `rule_version` (§14.10). Referencias cruzadas operativo → metodológico se evalúan en el mismo CC (§14.12, regla 5). |
| Motivo | Un cambio en un campo solo operativo no debería generar una nueva `rule_version`, y el inventario básico no ejecuta reglas metodológicas: no debe esperar la publicación del paquete de evaluación. |
| Fundamento / fuente | Necesidad aprobada conceptualmente (2026-10-04). Decisión G1 de `marybaxmann` (2026-10-05): las especificaciones operativas/estructurales del inventario que no ejecutan reglas metodológicas pueden pasar a implementación una vez aprobadas, sincronizadas y verificadas, sin esperar la publicación completa del paquete 2.0.0; las reglas de evaluación, clasificación, probabilidad de falla, riesgo, afectación global, priorización e indicadores siguen sujetas a publicación y versionado; sin excepción informal al workflow. Valores, definiciones y efectos redactados en §14.12 conforme a ese criterio. |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx` (DICCIONARIO_CAMPOS: columna N; VERSION); `docs/workflow.md`; `docs/project-rules.md` (PR-002 v2.2); `docs/methodology/00-index.md`; `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS: encabezado N1 `ambito`; `operativo` en las 29 filas de ARBOLES y MEDICIONES_DENDROMETRICAS (CC-020); `metodologico` en las 128 filas de REGISTRO_EVALUACION; las 2 filas de "Ordenes de trabajo" quedan sin valor (se tratan como `metodologico` hasta su clasificación, CC-013). La columna M conserva sin cambios su nota preexistente sin encabezado (M fila de `condición_heridas_tronco`). VERSION: CC-008 en `cc_incluidos` de 2.0.0. |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno en código. Consecuencia normativa: las especificaciones de ámbito `operativo` en `FUENTE SINCRONIZADA` pueden implementarse; `services/rules/` sigue bloqueado hasta una versión publicada. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | Verificación documental y del Excel: valores de `ambito` solo `operativo`, `metodologico` o vacío; ninguna regla metodológica exceptuada de la publicación; coherencia entre §14.4, §14.7, §14.9, §14.10 y §14.12. |
| Dependencias | CC-003. Relacionado con CC-020 (primer CC que usa la excepción reglada) y CC-013 (clasificación de los campos de Ordenes de trabajo). |
| rule_version | sin cambio (2.0.0 en preparación, sin `rule_version` asignada) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-05 |
| Fecha de implementación | sin implementación (gobernanza y Excel metodológico) |
| Commits / PR asociados | rama `cc-020-arbol-medicion`, repositorio backend. PR pendiente de revisión por la aprobadora. |
| Observaciones | Coherencia verificada antes de modificar el workflow: PR-002 v2.1/v2.2 y PR-011 v2.0 restringen a una versión publicada la implementación de *reglas*, no de especificaciones operativas; §14.5 ya exigía para el tipo 4 "un CC metodológico previo en `FUENTE SINCRONIZADA` o posterior". Las únicas reglas que suponían publicación para toda implementación (§14.4 tipo 4, §14.7 último párrafo y §14.9 "Para pasar a PROBADO") se ajustaron de forma explícita y trazable. No se modificaron PR-011, ADR-009 ni los controles de `rule_version`. Al integrarse el PR: `CERRADO` (sin implementación). |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios de lógica.
- [x] REGLAS_INDICADORES — N/A: sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios.
- [x] DICCIONARIO_CAMPOS — columna N `ambito` agregada y asignada.
- [x] VERSION — CC-008 en `cc_incluidos` de 2.0.0 (en preparación).
- [x] docs/methodology/ — `00-index.md`, punto 8 del estado de transición.
- [x] PR / ADR — PR-002 v2.2 (autoridad de DICCIONARIO_CAMPOS). Sin ADR afectadas.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — controles aplicables aprobados (ver CC-020).
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [ ] Revisión final — pendiente de revisión del PR por la aprobadora.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Auditoría de hojas del Excel maestro (CC-003). |
| 2026-10-05 | EN REVISIÓN | — | Retomado para resolver G1 (plan de sincronización de CC-020). |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisión G1: distinción entre inventario operativo/estructural y reglas metodológicas. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Excel, `workflow.md`, PR-002 v2.2 y `00-index.md` actualizados y verificados en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |

---

### CC-009 — Validación de `clase_edad` en ARBOLES

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). Resuelto junto con CC-020 (2026-10-05). |
| Tipo | 1 |
| Estado | FUENTE SINCRONIZADA |
| Regla / campo afectado | Hoja ARBOLES (anexo) y campo `clase_edad` de DICCIONARIO_CAMPOS. |
| Versión anterior | La validación de lista "Joven, Semimaduro, Maduro, Sobremaduro" está aplicada a la columna O (`dap_cm`) y no a la columna S (`clase_edad`); además tiene 4 valores, frente a 5 en DICCIONARIO_CAMPOS ("Tempranamente maduro"). |
| Versión nueva | `clase_edad` pasa a MEDICIONES_DENDROMETRICAS (CC-020) como estimación opcional. La validación errónea se elimina del anexo ARBOLES, que ya no contiene dimensiones. El dominio de 5 valores queda solo en DICCIONARIO_CAMPOS (autoridad, CC-003). El anexo MEDICIONES_DENDROMETRICAS se crea sin menús de captura; su generación corresponde a CC-012. |
| Motivo | Validación aplicada al campo equivocado y dominio distinto del diccionario. Corregirla de forma aislada habría quedado obsoleta con CC-020. |
| Fundamento / fuente | Decisión de `marybaxmann` (2026-10-05): sincronizar CC-009 junto con CC-020, sin corrección aislada. |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx` (ARBOLES, DICCIONARIO_CAMPOS, MEDICIONES_DENDROMETRICAS, VERSION). |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | ARBOLES: se elimina la única validación de datos (O2:O1048576). DICCIONARIO_CAMPOS: fila `clase_edad` con Hoja MEDICIONES_DENDROMETRICAS, obligatoriedad Opcional. VERSION: CC-009 en `cc_incluidos`. |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | Verificación del Excel: ARBOLES sin validaciones; `clase_edad` solo en MEDICIONES_DENDROMETRICAS; dominio solo en DICCIONARIO_CAMPOS. |
| Dependencias | CC-003 (DICCIONARIO_CAMPOS es la autoridad sobre el dominio); CC-020. |
| rule_version | sin cambio (anexo no normativo) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-05 |
| Fecha de implementación | sin implementación (anexo del Excel) |
| Commits / PR asociados | rama `cc-020-arbol-medicion`, repositorio backend. PR pendiente de revisión por la aprobadora. |
| Observaciones | Al integrarse el PR: `CERRADO` (sin implementación). |

**Checklist de sincronización**

- [x] Diagrama — N/A.
- [x] REGLAS_INDICADORES — N/A.
- [x] MATRICES_CALCULO — N/A.
- [x] DICCIONARIO_CAMPOS — `clase_edad` en MEDICIONES_DENDROMETRICAS (CC-020).
- [x] VERSION — CC-009 en `cc_incluidos` de 2.0.0 (en preparación).
- [x] docs/methodology/ — N/A.
- [x] PR / ADR — N/A.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — ningún dominio de `clase_edad` en dos fuentes editables.
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [ ] Revisión final — pendiente de revisión del PR por la aprobadora.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Auditoría de hojas del Excel maestro (CC-003). |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | Resolver junto con CC-020. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Excel actualizado y verificado en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |

---

### CC-010 — `nivel_riesgo` y `resultado_general` manuales en INSPECCIONES frente a `clasificacion_riesgo` (R04)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 2 |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja INSPECCIONES (anexo): `nivel_riesgo`, `resultado_general`; `clasificacion_riesgo` (R04). |
| Versión anterior | `nivel_riesgo` se ingresa manualmente con la escala Crítica / Alta / Media / Baja; `clasificacion_riesgo` se calcula con R04 con la escala Bajo / Moderado / Alto / Extremo. `resultado_general` es de ingreso manual. |
| Versión nueva | Por definir. |
| Motivo | Posible resultado de riesgo manual y paralelo al calculado (PR-008). |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro (INSPECCIONES; luego DICCIONARIO_CAMPOS). |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | Por determinar en la revisión (no se presupone dependencia de CC-013). |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Antes de sincronizar el diccionario debe resolverse conceptualmente: (1) si `nivel_riesgo` debe existir; (2) si representa algo distinto de `clasificacion_riesgo`; (3) si `resultado_general` es descriptivo o calculado; (4) quién puede ingresarlos; (5) si alguno debe eliminarse. |

---

### CC-011 — `prioridad_reportada`, Prioridad de OT y `clasificacion_prioridad` (M05)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 2 |
| Estado | DETECTADO |
| Regla / campo afectado | `prioridad_reportada` (INCIDENCIA), `Prioridad` (ORDENES DE TRABAJO), `clasificacion_prioridad` (M05). |
| Versión anterior | Los dos primeros se ingresan manualmente con las etiquetas Crítica / Alta / Media / Baja, las mismas de `clasificacion_prioridad`, que se calcula con M05. |
| Versión nueva | Por definir. |
| Motivo | Relación entre los tres campos no definida. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro (anexos; luego DICCIONARIO_CAMPOS). |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | Por determinar en la revisión. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No asumir que son el mismo concepto por compartir etiquetas. Primero debe definirse semánticamente cada campo; después se sincroniza el diccionario. |

---

### CC-012 — Menús dependientes, rangos con nombre y validaciones técnicas de los anexos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 1 (técnico) |
| Estado | DETECTADO |
| Regla / campo afectado | Hojas ORDENES DE TRABAJO, INSPECCIONES, MANTENIMIENTO (anexos) y rangos con nombre sobre LISTAS. |
| Versión anterior | Lista de `Tipo_ot` "Inspección, Mantenimiento" con un espacio que rompe el menú dependiente; menús dependientes limitados a pocas filas (D2:D10, E2:E4, fila 2 en INSPECCIONES y MANTENIMIENTO); rangos con nombre `Evaluación_inicial` y `Otra_Intervención` que apuntan a celdas de encabezado. |
| Versión nueva | Por definir. |
| Motivo | Los menús de captura no funcionan de forma consistente. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-004. |
| rule_version | sin cambio (anexos no normativos) |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No resolver dentro de CC-003. Nota de CC-009 / CC-020 (2026-10-05): el anexo ARBOLES queda sin validaciones y el anexo MEDICIONES_DENDROMETRICAS se crea sin menús de captura; si se requieren menús (p. ej. `clase_edad`, `estado_medicion`), se generan en este CC desde DICCIONARIO_CAMPOS. |

---

### CC-013 — Cobertura de DICCIONARIO_CAMPOS para entidades operativas y normalización de nombres

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 3 |
| Estado | DETECTADO |
| Regla / campo afectado | DICCIONARIO_CAMPOS; entidades INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS. |
| Versión anterior | Cobertura de campos en DICCIONARIO_CAMPOS: INCIDENCIA 0/13, INSPECCIONES 0/17, MANTENIMIENTO 0/18, ORDENES DE TRABAJO 2/13, USUARIOS 0/6. Nombres de OT sin convención (`ID_OT`, `ID_Árbol`, `OT_ creado_por`). |
| Versión nueva | Por definir. |
| Motivo | DICCIONARIO_CAMPOS no puede ejercer su autoridad sobre campos que no define. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-008 (ámbito), CC-015 (roles); debe considerar N19 de la auditoría de diagramas (convención de nombres). |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No implementar todavía. |

---

### CC-014 — Eliminar la duplicación de R01–R04 y M01–M05 en DICCIONARIO_CAMPOS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 1 |
| Estado | DETECTADO |
| Regla / campo afectado | Columna "Fórmula / regla de cálculo" de los campos de salida en DICCIONARIO_CAMPOS (`probabilidad_falla_*`, `clasificacion_*`, `probabilidad_impacto`, `clasificacion_prioridad`). |
| Versión anterior | DICCIONARIO_CAMPOS repite la lógica de R01–R04 y M01–M05; esa duplicación originó la diferencia de rangos de R02 y R03 con MATRICES_CALCULO. |
| Versión nueva | Por definir. |
| Motivo | Cada pieza de lógica debe existir en un solo lugar (PR-002 v2.1). |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | Sincronización metodológica del paquete 2.0.0 y decisiones D/N ya auditadas (en particular N11). |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | CC-014 no puede redefinir de forma independiente R01–R04 ni M01–M05. Objetivo: que DICCIONARIO_CAMPOS deje de duplicar la lógica y referencie los IDs de MATRICES_CALCULO. Se ejecuta coordinadamente con la sincronización del paquete 2.0.0. |

---

### CC-015 — Consolidación de roles

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 2 |
| Estado | DETECTADO |
| Regla / campo afectado | PR-003, PR-004, PR-009; hoja USUARIOS; columna "¿Quién lo ingresa?" de DICCIONARIO_CAMPOS. |
| Versión anterior | USUARIOS define 4 roles (Administrador, Usuario municipal, Inspector, Encargado de mantención) y dice que el usuario municipal "no registra evaluaciones"; "¿Quién lo ingresa?" usa 9 formas distintas; PR-003/PR-004/PR-009 asignan la evaluación al Administrador. Decisión de la autora pendiente de registrar: usuario municipal e inspector son el mismo rol; el Administrador solo crea proyectos y agrega usuarios. |
| Versión nueva | Por definir. |
| Motivo | Roles inconsistentes entre reglas, diccionario y datos de ejemplo. |
| Fundamento / fuente | — |
| Archivos afectados | `docs/project-rules.md`, Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | Por determinar en la revisión. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Queda explícitamente pendiente decidir si "Encargado de mantención" será un rol independiente. |

---

### CC-016 — Auditoría y eventual adopción de INDICES

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 2 |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja INDICES (11 indicadores con fórmula y fuente técnica). |
| Versión anterior | Módulo metodológico en propuesta (PR-002 v2.1). Dependencias no consolidadas: "Diámetro medio de copa" usa dos diámetros perpendiculares (D₁, D₂) que no existen como campos en DICCIONARIO_CAMPOS. |
| Versión nueva | Por definir. |
| Motivo | Adoptar o descartar los indicadores mediante auditoría. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-003. |
| rule_version | sin cambio mientras esté en propuesta |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | INDICES no es implementable ni normativa vigente hasta cerrar CC-016. Mientras siga en propuesta, sus cambios no modifican `rule_version`. |

---

### CC-017 — Ubicación de `cumplimiento_distancia_seguridad_bt_mt`

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 1 |
| Estado | DETECTADO |
| Regla / campo afectado | Campo `cumplimiento_distancia_seguridad_bt_mt` (DICCIONARIO_CAMPOS) y reglas de red aérea (REGLAS_INDICADORES). |
| Versión anterior | Definido como fórmula en DICCIONARIO_CAMPOS, pero aplica un umbral (2,00 m) que produce una categoría (Cumple / No cumple); según la frontera de PR-002 v2.1 podría corresponder a REGLAS_INDICADORES. |
| Versión nueva | Por definir. |
| Motivo | Determinar en qué artefacto vive esta lógica. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | Revisar junto con D20 y N6 de la auditoría de diagramas. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No mover todavía la lógica. |

---

### CC-018 — Normalización y saneamiento de datos de ejemplo

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 5 |
| Estado | DETECTADO |
| Regla / campo afectado | Filas de ejemplo de los anexos operativos (INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS, entre otras). |
| Versión anterior | Ejemplos que no cumplen las convenciones vigentes: código de árbol `A-000023` frente al formato `AV`; identificadores `USR-00x` frente al sistema real de identificación y autenticación; árboles y registros de ejemplo de OT, INSPECCIONES u otras hojas que no cumplen las convenciones vigentes. |
| Versión nueva | Por definir. |
| Motivo | Los datos de ejemplo no deben contradecir las convenciones vigentes. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | — |
| rule_version | sin cambio |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Distinto de CC-005 (privacidad y saneamiento de datos personales). CC-018 no elimina datos todavía; solo registra el problema. Caso agregado por CC-004: datos de ejemplo que guardan la acción como su propio subtipo, contrario a la convención "acción sin subtipos → subtipo vacío (null)" (`docs/methodology/convenciones-catalogos.md`): ORDENES DE TRABAJO `OT-I-000001` (`Accion_solicitada` y `subtipo_accion` = "Evaluación inicial") e INSPECCIONES `INS-000001` (`tipo_inspeccion_realizada` y `subtipo_inspeccion` = "Evaluación inicial"). No se corrigen en CC-004. |

---

### CC-019 — Arquitectura SIG con ArcGIS (SIG-0)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría SIG de backend y frontend (2026-10-04) y decisión SIG-0. |
| Tipo | 5 — documental (decisiones de arquitectura; sin cambio de lógica ni de datos) |
| Estado | CERRADO (sin implementación) |
| Regla / campo afectado | ADR-010, ADR-015 (nueva), PR-015, PR-006 (sección "Coordenadas"); referencia a ADR-010 en PR-005 v3.0 y ADR-005 v2.0. |
| Versión anterior | ADR-010 v1.0 (`propuesta`); PR-015 v1.0 (proveedor cartográfico no definido; "no implementar mapa definitivo todavía"); PR-006 v5.0 (coordenadas como estrategia propuesta no cerrada); sin ADR de arquitectura SIG. |
| Versión nueva | ADR-015 v1.0 — Arquitectura SIG con ArcGIS (vigente); ADR-010 v2.0 (vigente); PR-015 v2.0; PR-006 v6.0. |
| Motivo | Formalizar la integración de ArcGIS sin crear una segunda fuente de verdad de los datos espaciales y habilitar el mapa de inventario de árboles por proyecto. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-04: aprobación del plan documental SIG-0 con ajustes (transformación como responsabilidad de la capa servidor, sin fijar su mecanismo; acceso a servicios ArcGIS pendiente; corrección solo referencial en PR-005 y ADR-005). |
| Archivos afectados | `docs/architecture-decisions.md`, `docs/project-rules.md`, `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Ninguno en CC-019. Pendientes declarados en ADR-010 v2.0 (CRS/SRID y datum de captura, configuración del CRS, estructura de la coordenada original, mecanismo de transformación). |
| Impacto en backend | Ninguno en CC-019. Los endpoints de árboles para el mapa deben seguir ADR-014. |
| Impacto en API | Ninguno en CC-019 (no se definen endpoints). |
| Impacto en frontend | Ninguno en CC-019. Tecnología SIG adoptada: ArcGIS Maps SDK for JavaScript, con FeatureLayer client-side como primera alternativa (ADR-015). |
| Pruebas necesarias | No aplica (documental). Verificación: ninguna referencia vigente describe ADR-010 como `propuesta` ni prohíbe el mapa de inventario. |
| Dependencias | Ninguna. Pendiente antes de implementar un mapa que dependa de servicios cartográficos ArcGIS: seleccionar y validar el mecanismo de acceso/autenticación para desarrollo y producción (ADR-015). |
| rule_version | sin cambio (fuera del paquete metodológico) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-04 |
| Fecha de implementación | sin implementación (cambio documental) |
| Commits / PR asociados | `7e7f923` — [CC-019] Formalizar arquitectura SIG con ArcGIS (SIG-0) (rama `claude/valpo-verde-frontend-p2-kh1bcx`, repositorio backend). Cierre registrado en un commit documental posterior. |
| Observaciones | PR-005 v3.0 y ADR-005 v2.0: actualización de referencia documental, sin cambio sustantivo ni nueva versión: "(ADR-010 `propuesta`)" y "(ADR-010 sigue `propuesta`)" pasan a "(ADR-010 v2.0)". Las notas históricas ("Actualización 4.0" de PR-006, contenido de ADR-010 v1.0) se conservan. No modifica CC-005 a CC-018, el Excel maestro, la metodología, `database/`, `src/` ni el frontend. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES — N/A: sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios.
- [x] DICCIONARIO_CAMPOS — N/A: sin cambios.
- [x] VERSION — N/A: fuera del paquete metodológico.
- [x] docs/methodology/ — N/A: sin cambios.
- [x] PR / ADR — ADR-015 v1.0, ADR-010 v2.0, PR-015 v2.0, PR-006 v6.0; corrección referencial en PR-005 v3.0 y ADR-005 v2.0.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — N/A: no se modifican artefactos metodológicos.
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A.
- [x] Verificación §14.9 (implementación) — N/A.
- [x] Revisión final — revisado y aprobado por marybaxmann (2026-10-04) antes del commit; documentos verificados tras el commit `7e7f923`.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Proveedor cartográfico no definido (PR-015 v1.0) y ADR-010 en `propuesta`; auditoría SIG de backend y frontend. |
| 2026-10-04 | EN REVISIÓN | — | Plan documental SIG-0. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Plan SIG-0 aprobado con ajustes; implementación documental autorizada. Cambios escritos en la rama del repositorio backend, sin commit, pendientes de revisión. Al integrarse: `CERRADO` (sin implementación). |
| 2026-10-04 | CERRADO (sin implementación) | marybaxmann | Commit `7e7f923` publicado y verificado. Sin implementación en BD, backend, API ni frontend. |

---

### CC-020 — Separación entre identidad del árbol y medición dendrométrica

| Campo | Valor |
|---|---|
| Fecha | 2026-10-05 |
| Origen | Auditoría árbol / medición previa a INV-1 (registro básico del árbol), 2026-10-05: plan de sincronización aprobado por `marybaxmann`. |
| Tipo | 3 — modelo de datos (+1 corrección de inconsistencias: `altura_m` / `altura_total_m`; `nombre_comun` y `huso` frente a PR-006 y ADR-010) |
| Estado | FUENTE SINCRONIZADA |
| Regla / campo afectado | DICCIONARIO_CAMPOS (filas ARBOLES y nueva entidad MEDICIONES_DENDROMETRICAS; `zona_objetivo`); anexos ARBOLES y MEDICIONES_DENDROMETRICAS (nuevo); VERSION; PR-006; PR-003; PR-002 (composición); ADR-016 (nueva); `docs/methodology/modelo-arbol-medicion.md` (nuevo) y `00-index.md`; referencias a PR-006 en ADR-010 v2.0 y ADR-015. |
| Versión anterior | ARBOLES y DICCIONARIO_CAMPOS trataban `multifustal`, `numero_fustes`, `dap_fustes_cm`, `dap_cm`, `altura_m`, `diametro_copa_m`, `altura_primera_rama_m` y `clase_edad` como atributos del árbol sin fecha propia, todos obligatorios. `dap_cm` contenía la fórmula: "Si multifustal = No: ingreso manual del DAP. Si multifustal = Sí y 2 ≤ numero_fustes ≤ 5: dap_cm = √(d₁² + d₂² + … + dₙ²). Si multifustal = Sí y numero_fustes > 5: dap_cm = √(d̄² × n), donde d̄ = (d₁ + d₂ + … + dₙ) / n" (antecedente; no vigente). `zona_objetivo` citaba `altura_total_m`, campo inexistente (el campo se llamaba `altura_m`). ARBOLES no tenía ubicación WGS84; UTM y `huso` (fijo "19S") eran obligatorios. PR-006 v6.0, PR-003 v4.0, PR-002 v2.1. |
| Versión nueva | ÁRBOL (identidad relativamente estable) ≠ MEDICIÓN DENDROMÉTRICA (evento fechado); ARBOLES 1:N MEDICIONES_DENDROMETRICAS. **H-1:** la medición inicial exige configuración de fustes, DAP o diámetros por fuste según corresponda, `altura_total_m`, `diametro_copa_m` y `altura_primera_rama_m`; `clase_edad` es opcional; en ejemplares con más de un fuste se conservan los diámetros individuales y el DAP equivalente se calcula solo con regla aprobada (puede quedar pendiente sin impedir completar la medición). **H-2:** entidad MEDICIONES_DENDROMETRICAS, "registro fechado de las dimensiones y características dendrométricas observadas, medidas o estimadas de un ejemplar arbóreo". **H-3:** última medición válida = medición válida con la `fecha_medicion` más reciente; `fecha_registro` solo trazabilidad administrativa; anulación lógica (permanece en el historial con motivo, autor y fecha; no participa en el valor actual); corrección ≠ anulación ≠ nueva medición. Valor actual derivado, no editable. Ubicación canónica `ubicacion_wgs84` obligatoria para completar el alta; UTM y `huso` pasan a obligatoriedad Pendiente. `multifustal` se reemplaza por `configuracion_fustes` con categorías pendientes. ADR-016 v1.0, PR-006 v7.0, PR-003 v5.0, PR-002 v2.2. |
| Motivo | Las dimensiones cambian con el tiempo; sobrescribirlas borra el historial (ADR-012) y deja sin trazabilidad las evaluaciones que dependen de ellas (`zona_objetivo`, M01). |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-05: 21 decisiones del plan (ÁRBOL ≠ MEDICIÓN, medición inicial obligatoria en un único flujo, historial, corrección, valor actual derivado, especie y ubicación en el árbol, WGS84 obligatorio, `altura_total_m`, Usuario municipal puede medir, medición ≠ inspección) y decisiones H-1, H-2, H-3 y G1 (vía CC-008). |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx`; `docs/project-rules.md`; `docs/architecture-decisions.md`; `docs/methodology/modelo-arbol-medicion.md` (nuevo); `docs/methodology/00-index.md`; `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. Verificado: los diagramas no citan campos trasladados ni renombrados. |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS (150 → 160 filas): fila nueva `ubicacion_wgs84` (ARBOLES); `fecha_registro` aclarada como fecha del alta; `utm_este`, `utm_norte`, `huso` con obligatoriedad Pendiente; notas de pendiente en `especie_cientifica` y `nombre_comun`; 8 filas pasan a Hoja MEDICIONES_DENDROMETRICAS (`multifustal` → `configuracion_fustes`, `altura_m` → `altura_total_m`, `dap_cm` Condicional y fórmula PENDIENTE, `clase_edad` Opcional); 9 filas nuevas (`id_medicion`, `id_arbol`, `fecha_medicion`, `fecha_registro`, `registrado_por`, `estado_medicion`, `motivo_anulacion`, `anulado_por`, `fecha_anulacion`); `zona_objetivo` remite a `altura_total_m` de MEDICIONES_DENDROMETRICAS con la relación medición ↔ inspección pendiente; columna `ambito` = `operativo` en las 29 filas de ambas entidades (CC-008). ARBOLES: 12 columnas (sin dimensiones; con `ubicacion_wgs84`); sin validaciones (CC-009). MEDICIONES_DENDROMETRICAS: hoja nueva con 17 columnas, coherente con DICCIONARIO_CAMPOS. VERSION: CC-020 en `cc_incluidos` de 2.0.0. Partes del `.xlsx` no afectadas idénticas byte a byte. SHA-256 antes `bc0520b8…c4b9c974`, después `1fb165f1…413638ab` (tras la corrección previa al merge; versión intermedia `e5abca30…a162563b`). |
| Impacto en BD | Pendiente de diseño (no autorizado en esta ejecución). `trees` conserva columnas dimensionales sobrescribibles que no se ajustan a ADR-016; requiere migración y RLS de la entidad nueva (ADR-014). |
| Impacto en backend | Pendiente de diseño: alta de árbol + medición inicial en una sola operación; nuevas mediciones; corrección auditada; anulación lógica; valor actual derivado; permisos en dos capas. |
| Impacto en API | Pendiente de diseño. El endpoint de inventario SIG-1 (`GET /api/projects/:id/trees`) no expone dimensiones y no se ve afectado. |
| Impacto en frontend | Pendiente de diseño: formulario único de alta con bloque de medición inicial; ficha con valores actuales; historial de mediciones. |
| Pruebas necesarias | En implementación: el alta no queda completa sin árbol georreferenciado y medición inicial; una nueva medición no modifica las anteriores; una corrección no crea medición; una medición anulada no participa en el valor actual; la última medición válida se determina por `fecha_medicion` y no por `fecha_registro`; ejemplar con más de un fuste completa la medición sin DAP equivalente; permisos por rol en backend y RLS. |
| Dependencias | CC-008 (ámbito `operativo` y paso a implementación desde `FUENTE SINCRONIZADA`); CC-009 (resuelto junto). Relacionados sin bloqueo: CC-013 (convención de nombres), CC-015 (roles), CC-014 (fórmula de DAP equivalente, cuando se apruebe), CC-016 (indicadores por especie). |
| rule_version | sin cambio (especificación de ámbito `operativo`; 2.0.0 en preparación, sin `rule_version` asignada) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-05 |
| Fecha de implementación | — (sin implementación de software todavía) |
| Commits / PR asociados | rama `cc-020-arbol-medicion`, repositorio backend. PR pendiente de revisión por la aprobadora. |
| Observaciones | **Siguen abiertas (no se cierran en este CC):** categorías definitivas de configuración de fustes y regla de DAP equivalente; política de especie no determinada, catálogo y nombres comunes; UTM, datum, huso y coordenada original (ADR-010 v2.0); relación MEDICIÓN ↔ INSPECCIÓN y efecto de corregir o anular una medición usada por una inspección completada (ADR-007); obligatoriedad de campos en mediciones posteriores; tratamiento de `clase_edad`; correspondencia `sector` / `ubicacion_descriptiva` con comuna, dirección y lugar de referencia; permisos de anulación y de corrección de mediciones por el Usuario municipal. **No modificado:** `database/`, `src/`, migraciones, RLS, frontend, ArcGIS/SIG. Referencia a PR-003 v4.0 en ADR-014 se conserva (describe el estado validado de RLS). Al integrarse el PR, y por tratarse de una especificación de ámbito `operativo` (`docs/workflow.md` §14.12), el CC puede pasar a `PENDIENTE DE IMPLEMENTACIÓN` sin esperar la publicación de 2.0.0. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios de lógica; verificado que no citan campos trasladados.
- [x] REGLAS_INDICADORES — N/A: sin reglas cargadas; sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios (M01 cita "altura" de forma genérica).
- [x] DICCIONARIO_CAMPOS — ARBOLES y MEDICIONES_DENDROMETRICAS sincronizados; `zona_objetivo` actualizado.
- [x] VERSION — CC-020 en `cc_incluidos` de 2.0.0 (en preparación); no publicada.
- [x] docs/methodology/ — `modelo-arbol-medicion.md` (nuevo) y `00-index.md`.
- [x] PR / ADR — ADR-016 v1.0, PR-006 v7.0, PR-003 v5.0, PR-002 v2.2; referencias en ADR-010 v2.0 y ADR-015.
- [x] Export de texto — N/A: el export aún no existe.
- [x] Verificación §14.9 (fuente) — aprobada (2026-10-05): ningún campo trasladado permanece en ARBOLES (diccionario ni anexo); diccionario ↔ anexos con los mismos campos en el mismo orden; `altura_total_m` es el único nombre de la altura total (solo queda "antes altura_m" como nota de trazabilidad); todo campo citado (`zona_objetivo` → `altura_total_m`) existe en DICCIONARIO_CAMPOS; las 11 referencias `LISTAS:<id>` existen; `clase_edad` con un solo dominio editable; `ambito` solo `operativo` / `metodologico` / vacío; decisiones abiertas marcadas como PENDIENTE; 2.0.0 sigue "en preparación" sin `rule_version`, fecha de publicación ni tag. Puntos de reglas, intervalos y diagramas: N/A (sin reglas cargadas ni cambios de lógica).
- [ ] Migración + schema.sql — pendiente (no autorizado).
- [ ] Backend (services/rules) — pendiente (sin reglas; solo services de inventario).
- [ ] API / Zod — pendiente.
- [ ] Frontend — pendiente.
- [ ] Verificación §14.9 (implementación) — pendiente.
- [ ] Revisión final — pendiente.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-05 | DETECTADO | — | Auditoría de la decisión 5 (árbol vs. medición) al preparar INV-1. |
| 2026-10-05 | EN REVISIÓN | — | Plan de sincronización: impacto en ARBOLES, DICCIONARIO_CAMPOS, PR-006, CC relacionados. |
| 2026-10-05 | PENDIENTE DE DECISIÓN | — | Decisiones bloqueantes H-1, H-2, H-3 y G1. |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | H-1, H-2, H-3 adoptadas; G1 resuelta vía CC-008; sincronización autorizada. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Fuentes actualizadas y verificación §14.9 aprobada en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |
| 2026-10-05 | FUENTE SINCRONIZADA | marybaxmann | Corrección menor previa al merge (revisión de la aprobadora): `configuracion_fustes`, `numero_fustes` y `dap_fustes_cm` sin altura de referencia fija ni categorías candidatas (criterio/altura de referencia PENDIENTE); `huso` sin zona fija "19S". Verificación repetida y aprobada. |
