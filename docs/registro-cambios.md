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
| CC-003 | Composición normativa del Excel maestro y autoridad de cada artefacto (PR-002 v2.1) | 2 (+5) | APROBADO METODOLÓGICAMENTE | Diagnóstico de documentación y control de cambios; auditoría de hojas del Excel maestro | — (sin versión publicada) | — | 2026-10-04 |
| CC-004 | Relación entre LISTAS y DICCIONARIO_CAMPOS | 1 | DETECTADO | Diagnóstico de documentación y control de cambios | — | CC-003 | 2026-10-04 |
| CC-005 | Datos personales en la hoja USUARIOS | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-006 | Archivos fuente `.drawio` de los diagramas | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-007 | Inconsistencias documentales (README, roadmap, checkpoint, CLAUDE.md, workflow §13, frontend) | 5 | DETECTADO | Diagnóstico de documentación y control de cambios | — | — | 2026-10-04 |
| CC-008 | Columna `ambito` en DICCIONARIO_CAMPOS y ajuste de `workflow.md` §14.10 | 3 (+2) | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | CC-003 | 2026-10-04 |
| CC-009 | Validación de `clase_edad` en ARBOLES | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-010 | `nivel_riesgo` y `resultado_general` manuales en INSPECCIONES frente a `clasificacion_riesgo` (R04) | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-011 | `prioridad_reportada`, Prioridad de OT y `clasificacion_prioridad` (M05) | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-012 | Menús dependientes, rangos con nombre y validaciones técnicas de los anexos | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-013 | Cobertura de DICCIONARIO_CAMPOS para entidades operativas y normalización de nombres | 3 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-014 | Eliminar la duplicación de R01–R04 y M01–M05 en DICCIONARIO_CAMPOS | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | Sincronización del paquete 2.0.0 | 2026-10-04 |
| CC-015 | Consolidación de roles (PR-003, PR-004, PR-009, USUARIOS, "¿Quién lo ingresa?") | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-016 | Auditoría y eventual adopción de INDICES | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-017 | Ubicación de `cumplimiento_distancia_seguridad_bt_mt` | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-018 | Normalización y saneamiento de datos de ejemplo | 5 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |

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
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | PR-002; `docs/methodology/00-index.md` (propósito y estado de transición); `docs/workflow.md` §14.2 (lista de artefactos sincronizados). |
| Versión anterior | PR-002 v2.0: "hojas normativas MATRICES_CALCULO, DICCIONARIO_CAMPOS, REGLAS_INDICADORES y VERSION"; sin clasificación de las demás hojas ni reglas de autoridad entre artefactos. |
| Versión nueva | PR-002 v2.1: composición del Excel maestro (núcleo normativo: DICCIONARIO_CAMPOS, REGLAS_INDICADORES, MATRICES_CALCULO; gobernanza: VERSION; catálogo controlado subordinado: LISTAS; módulo metodológico en propuesta: INDICES; anexos operativos no normativos: ARBOLES, REGISTRO_EVALUACION, INCIDENCIA, INSPECCIONES, MANTENIMIENTO, ORDENES DE TRABAJO, USUARIOS), autoridad por tipo de información, frontera DICCIONARIO / REGLAS / MATRICES, principio "cada pieza de lógica en un solo lugar" y relación con el modelo de datos. `workflow.md` §14.2 incluye LISTAS. |
| Motivo | Sin una clasificación formal, las hojas operativas, LISTAS e INDICES funcionaban como fuentes paralelas de dominios, roles y resultados, y DICCIONARIO_CAMPOS repetía lógica de MATRICES_CALCULO. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-04 (aprobación de la dirección de CC-003 y ajustes finales). |
| Archivos afectados | `docs/project-rules.md` (solo PR-002), `docs/methodology/00-index.md`, `docs/workflow.md` (solo §14.2), `docs/registro-cambios.md`. |
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
| Commits / PR asociados | pendiente (sin commit hasta revisión) |
| Observaciones | No se corrige ninguna contradicción dentro de CC-003. Se amplía CC-004 y se abren CC-008 a CC-018 en estado DETECTADO. Otros documentos citan "PR-002 v2.0" (`CLAUDE.md`, `docs/workflow.md` §2/§5/§10, agentes `rules-engine` y `architect`, PR-011 v2.0, PR-016 v3.0); quedan fuera del alcance autorizado de CC-003. |

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
- [ ] Revisión final — pendiente de revisión por una aprobadora antes del commit.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Falta de definición de las hojas normativas del Excel maestro. |
| 2026-10-04 | EN REVISIÓN | — | Auditoría de las 13 hojas y propuesta de clasificación. |
| 2026-10-04 | APROBADO METODOLÓGICAMENTE | marybaxmann | Ficha final aprobada; implementación documental autorizada. Cambios escritos en la rama del repositorio backend, sin commit, pendientes de revisión. |

---

### CC-004 — Relación entre LISTAS y DICCIONARIO_CAMPOS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Diagnóstico de documentación y control de cambios (2026-10-04). |
| Tipo | 1 (probable) |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja LISTAS y columna "Unidad / valores" de DICCIONARIO_CAMPOS. |
| Versión anterior | Ambas hojas definen valores permitidos de forma independiente. Contradicciones detectadas (auditoría de CC-003): (1) acciones de OT: "Otra" figura bajo *Evaluación instrumental* en LISTAS y bajo *Reevaluación* en DICCIONARIO_CAMPOS (`subtipo_accion`); (2) Tipos_de_conflicto incluye "Deformación" pero no "Hundimiento", mientras DICCIONARIO_CAMPOS define `presenta_hundimiento_vereda`; (3) una sola lista Materialidad_infraestructura incluye "Baldosa", pero `materialidad_calzada` no la admite; (4) los catálogos de acción y subtipo de OT se mantienen a la vez en LISTAS y en DICCIONARIO_CAMPOS (`Accion_solicitada`, `subtipo_accion`). |
| Versión nueva | Por definir. |
| Motivo | Dos lugares que definen catálogos pueden contradecirse. Principio de entrada aprobado (2026-10-04): "Un catálogo, un solo lugar" (PR-002 v2.1). |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-003. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No resuelto. Ampliado en CC-003 con las contradicciones detectadas. Todavía no se decide qué catálogos y valores concretos permanecen en LISTAS. |

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

---

### CC-008 — Columna `ambito` en DICCIONARIO_CAMPOS y ajuste de `workflow.md` §14.10

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 3 (+2 gobernanza de versionado) |
| Estado | DETECTADO |
| Regla / campo afectado | DICCIONARIO_CAMPOS (nueva columna `ambito`); `docs/workflow.md` §14.10 (definición de MINOR/PATCH). |
| Versión anterior | DICCIONARIO_CAMPOS no distingue campos metodológicos de campos puramente operativos; §14.10 sube MINOR ante cualquier cambio de campos. |
| Versión nueva | Por definir. |
| Motivo | Un cambio en un campo solo operativo no debería generar una nueva `rule_version`. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro, `docs/workflow.md`. |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-003. |
| rule_version | por definir |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Necesidad aprobada conceptualmente (2026-10-04). Antes de implementar debe presentarse una propuesta con: valores permitidos, definición exacta de cada valor, efecto sobre `version_paquete` y efecto sobre `rule_version`. No modificar todavía DICCIONARIO_CAMPOS ni §14.10. |

---

### CC-009 — Validación de `clase_edad` en ARBOLES

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). |
| Tipo | 1 |
| Estado | DETECTADO |
| Regla / campo afectado | Hoja ARBOLES (anexo) y campo `clase_edad` de DICCIONARIO_CAMPOS. |
| Versión anterior | La validación de lista "Joven, Semimaduro, Maduro, Sobremaduro" está aplicada a la columna O (`dap_cm`) y no a la columna S (`clase_edad`); además tiene 4 valores, frente a 5 en DICCIONARIO_CAMPOS ("Tempranamente maduro"). |
| Versión nueva | Por definir. |
| Motivo | Validación aplicada al campo equivocado y dominio distinto del diccionario. |
| Fundamento / fuente | — |
| Archivos afectados | Excel maestro (hoja ARBOLES). |
| Impacto en diagramas · Excel · BD · backend · API · frontend | Por definir en revisión. |
| Pruebas necesarias | Por definir. |
| Dependencias | CC-003 (DICCIONARIO_CAMPOS es la autoridad sobre el dominio). |
| rule_version | sin cambio (anexo no normativo) |
| Aprobado por / Fecha de aprobación | — |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | No corregido en CC-003. |

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
| Observaciones | No resolver dentro de CC-003. |

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
| Observaciones | Distinto de CC-005 (privacidad y saneamiento de datos personales). CC-018 no elimina datos todavía; solo registra el problema. |
