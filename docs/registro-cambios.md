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
| CC-008 | Columna `ambito` en DICCIONARIO_CAMPOS y ajuste de `workflow.md` §14.10 | 3 (+2) | REEMPLAZADO (CC-028, CC-035) | Auditoría de hojas del Excel maestro (CC-003); decisión G1 (2026-10-05) | 2.0.0 (en preparación) | — | 2026-10-05 |
| CC-009 | Validación de `clase_edad` en ARBOLES | 1 | REEMPLAZADO (CC-026, CC-028) | Auditoría de hojas del Excel maestro (CC-003); resuelto junto con CC-020 | 2.0.0 (en preparación) | — | 2026-10-05 |
| CC-010 | `nivel_riesgo` y `resultado_general` manuales en INSPECCIONES frente a `clasificacion_riesgo` (R04) | 2 | DETECTADO (decidido en CC-026) | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-011 | `prioridad_reportada`, Prioridad de OT y `clasificacion_prioridad` (M05) | 2 | DETECTADO (Prioridad de OT decidida en CC-026) | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-012 | Menús dependientes, rangos con nombre y validaciones técnicas de los anexos | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-013 | Cobertura de DICCIONARIO_CAMPOS para entidades operativas y normalización de nombres | 3 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-014 | Eliminar la duplicación de R01–R04 y M01–M05 en DICCIONARIO_CAMPOS | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | Sincronización del paquete 2.0.0 | 2026-10-04 |
| CC-015 | Consolidación de roles (PR-003, PR-004, PR-009, USUARIOS, "¿Quién lo ingresa?") | 2 | EN REVISIÓN (modelo de roles decidido en CC-026) | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-016 | Auditoría y eventual adopción de INDICES | 2 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-017 | Ubicación de `cumplimiento_distancia_seguridad_bt_mt` | 1 | DETECTADO | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-018 | Normalización y saneamiento de datos de ejemplo | 5 | DETECTADO (ejemplos eliminados en el Excel auditado, CC-026) | Auditoría de hojas del Excel maestro (CC-003) | — | — | 2026-10-04 |
| CC-019 | Arquitectura SIG con ArcGIS (ADR-015; ADR-010 v2.0; PR-015 v2.0; PR-006 v6.0) | 5 | CERRADO (sin implementación) | Decisión SIG-0 (auditoría SIG de backend y frontend) | — (fuera del paquete) | — | 2026-10-04 |
| CC-020 | Separación entre identidad del árbol y medición dendrométrica (ADR-016; PR-006 v7.0; PR-003 v5.0; PR-002 v2.2) | 3 (+1) | REEMPLAZADO (CC-026, CC-028, CC-031, CC-032) | Auditoría árbol / medición previa a INV-1 (2026-10-05) | 2.0.0 (en preparación) | — | 2026-10-05 |
| CC-021 | Jerarquía de fuentes de producto: el prototipo histórico no prevalece sobre decisiones posteriores (PR-001 v3.0; PR-016 v4.0) | 5 | APROBADO METODOLÓGICAMENTE | Definición del agente frontend-ux y revisión de referencias de producto | — (fuera del paquete) | — | 2026-10-06 |
| CC-022 | Alcance del Administrador (solo lectura) y gestión de estados por el Usuario municipal (PR-003 v6.0, PR-004 v5.0, PR-009 v2.0) | 2 | PROBADO | Decisión parcial de CC-015 (autora y equipo) | — (fuera del paquete) | — | 2026-10-09 |
| CC-023 | Referencias visuales complementarias de inspiración UX/UI, incluida la vista de árbol de Groundzy (PR-016 v5.0) | 5 | APROBADO METODOLÓGICAMENTE | Rediseño visual post-demo | — (fuera del paquete) | — | 2026-10-09 |
| CC-024 | N13: componente con indicador "No determinado" → árbol sin clasificación de riesgo, independiente de infraestructura | 2 (+4) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Auditoría del motor de riesgo (2026-10-10) | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-10 |
| CC-025 | Prototipo visual "SIVU Territorio" como referencia visual principal del frontend (PR-016 v6.0) | 5 | APROBADO METODOLÓGICAMENTE | Exploración visual UX/UI posterior a CC-023 | — (fuera del paquete) | — | 2026-10-16 |
| CC-026 | Auditoría funcional del modelo de datos: roles, alta del árbol, historial, inspección y revisión de mantenimiento (PR-003 v7.0, PR-004 v6.0, PR-006 v8.0, PR-009 v3.0, PR-010 v2.0, PR-019, PR-020, PR-008 v2.0, ADR-006 v2.0, ADR-016 v2.0) | 3 (+2, +1) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Auditoría del modelo de datos (2026-10-18) · AMD-01…AMD-42 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-18 |
| CC-027 | Sincronización del motor de riesgo con MATRICES_CALCULO y REGLAS_INDICADORES del Excel auditado (R03, cavidades, etiquetas, M04, M05) | 2 (+4) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Revisión de matrices e índices (2026-10-18) · DM-01…DM-09 | 2.0.0 (publicada el 2026-10-20) | C1 (postauditoría) | 2026-10-18 |
| CC-028 | El Excel auditado es la única fuente metodológica; se elimina el Excel anterior y se resuelven P1–P9 a su favor | 2 (+3) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Decisión de la autora (2026-10-18) | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-18 |
| CC-029 | M05: `clasificacion_prioridad` = No determinado cuando `clasificacion_riesgo` = No determinado | 2 | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Decisión de la autora (2026-10-20), Fase 0 de la implementación | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-030 | Publicación del paquete 2.0.0 antes de implementar; `rule_version` en cada resultado calculado (C1 / PA-01) | 2 (+5) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 de la implementación de CC-026 a CC-029 · decisión 1 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-031 | Corrección y anulación de una inspección según su `estado_registro` (P3) | 3 (+2) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisión 2 (P3 de CC-026, sin regla tras CC-028) | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-032 | Transición del modelo físico: UTM canónica, retiro de `tree_measurements` y de las tablas de inspección de 001, identificadores de rol (ADR-010 v3.0, ADR-016 v3.0, PR-006 v9.0, PR-019 v1.1, PR-020 v1.1) | 3 (+4) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisiones 3, 4 y 5; respuestas de la Fase 0 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-033 | Escrituras solo por el backend con credencial de servicio; RLS sin escritura directa (DA-01 / PA-04; ADR-014 v2.0, PR-018 v3.0) | 3 (+4) | APROBADO METODOLÓGICAMENTE | Fase 1 · decisión 8; postauditoría DA-01 | — (fuera del paquete) | — | 2026-10-20 |
| CC-034 | Códigos de catálogo definidos en el backend, sin tabla de códigos en LISTAS (PR-021 v1.0) | 5 (+4) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisión 7; Fase 0 · contradicción 1 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-035 | Eliminación del ámbito operativo / metodológico de los campos (`workflow.md` §14.12; PR-002 v3.0) | 5 | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisión 6; CC-028 P8 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-036 | Incidencias ciudadanas por QR: formulario público, visibilidad y conservación del nombre y el RUT (PR-022 v1.0, PR-010 v3.0) | 3 (+4) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisión 9 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-037 | Recordatorio de próxima inspección y monitoreo en lugar de agenda automática (AMD-38; PR-009 v4.0) | 3 (+5) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Fase 1 · decisión 10 | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-038 | Datos simulados fuera de la base de producción: producción nueva y vacía; seed solo para desarrollo | 4 | APROBADO METODOLÓGICAMENTE | Fase 1 · respuesta 0 | — (fuera del paquete) | — | 2026-10-20 |
| CC-039 | Catálogo botánico: `persistencia_follaje`, `tipo_hoja` y `origen_biogeografico` en CATALOGO_ESPECIES; `rango_edad_estimada_anios` en ARBOLES | 2 (+3) | FUENTE SINCRONIZADA (2.0.0 publicada el 2026-10-20) | Decisión de la autora (2026-10-20) | 2.0.0 (publicada el 2026-10-20) | — | 2026-10-20 |
| CC-040 | Alcance de la evaluación según el tipo de inspección, evaluación vigente compuesta por campo y fotografías por tipo (PR-006 v11.0, PR-009 v5.0, PR-010 v4.0, ADR-016 v5.0) | 2 (+3) | FUENTE SINCRONIZADA (2.1.0 publicada el 2026-10-21) | Fase 3 · respuesta 3 de la autora | 2.1.0 (publicada el 2026-10-21) | — | 2026-10-20 |
| CC-041 | Decisiones de diseño de la Fase 3: sector obligatorio al crear el proyecto, eliminación de lo que no está en el Excel, ajuste antes de finalizar, `motor_commit` y `codigo_usuario` (PR-004 v7.0, PR-005 v4.0) | 3 (+4) | APROBADO METODOLÓGICAMENTE | Fase 3 · respuestas 1, 2, 4, 5 y 6 de la autora | — | — | 2026-10-20 |
| CC-042 | Estado del proyecto: `estado_proyecto` (Activo / Cerrado) en PROYECTOS; proyecto Cerrado en solo consulta | 3 | FUENTE SINCRONIZADA (2.1.0 publicada el 2026-10-21) | Decisión de la autora (2026-10-20), revisión del diseño de la Fase 3 (PR #31) | 2.1.0 (publicada el 2026-10-21) | — | 2026-10-20 |

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
| Estado | CERRADO (sin implementación) |
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
| Commits / PR asociados | `6af04ec` — [CC-020] Separar identidad del árbol y medición dendrométrica (+CC-008, CC-009); `15c9994` — [CC-020] Corrección previa al merge (rama `cc-020-arbol-medicion`, repositorio backend). Integrados en `main` mediante PR #3 (merge `637db1a`). Cierre registrado en un commit documental posterior. |
| Observaciones | Coherencia verificada antes de modificar el workflow: PR-002 v2.1/v2.2 y PR-011 v2.0 restringen a una versión publicada la implementación de *reglas*, no de especificaciones operativas; §14.5 ya exigía para el tipo 4 "un CC metodológico previo en `FUENTE SINCRONIZADA` o posterior". Las únicas reglas que suponían publicación para toda implementación (§14.4 tipo 4, §14.7 último párrafo y §14.9 "Para pasar a PROBADO") se ajustaron de forma explícita y trazable. No se modificaron PR-011, ADR-009 ni los controles de `rule_version`. Integrado mediante PR #3 (merge `637db1a`): `CERRADO` (sin implementación). Sin componente de software, como CC-001 y CC-004. |

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
- [x] Revisión final — revisado y aprobado por marybaxmann en el PR #3 (merge `637db1a`, 2026-10-05).

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Auditoría de hojas del Excel maestro (CC-003). |
| 2026-10-05 | EN REVISIÓN | — | Retomado para resolver G1 (plan de sincronización de CC-020). |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisión G1: distinción entre inventario operativo/estructural y reglas metodológicas. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Excel, `workflow.md`, PR-002 v2.2 y `00-index.md` actualizados y verificados en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |
| 2026-10-05 | CERRADO (sin implementación) | marybaxmann | PR #3 revisado e integrado en `main` (merge `637db1a`; commits `6af04ec`, `15c9994`). Sin implementación en BD, backend, API ni frontend. |
| 2026-10-20 | REEMPLAZADO | marybaxmann | CC-028 (P8) eliminó la columna `ambito` del Excel maestro y CC-035 elimina la excepción operativa de `workflow.md` §14.12. AM-07. |

---

### CC-009 — Validación de `clase_edad` en ARBOLES

| Campo | Valor |
|---|---|
| Fecha | 2026-10-04 |
| Origen | Auditoría de hojas del Excel maestro (CC-003). Resuelto junto con CC-020 (2026-10-05). |
| Tipo | 1 |
| Estado | CERRADO (sin implementación) |
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
| Commits / PR asociados | `6af04ec` — [CC-020] Separar identidad del árbol y medición dendrométrica (+CC-008, CC-009); `15c9994` — [CC-020] Corrección previa al merge (rama `cc-020-arbol-medicion`, repositorio backend). Integrados en `main` mediante PR #3 (merge `637db1a`). Cierre registrado en un commit documental posterior. |
| Observaciones | Resuelto dentro de CC-020. Integrado mediante PR #3 (merge `637db1a`): `CERRADO` (sin implementación), como CC-004. |

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
- [x] Revisión final — revisado y aprobado por marybaxmann en el PR #3 (merge `637db1a`, 2026-10-05).

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-04 | DETECTADO | — | Auditoría de hojas del Excel maestro (CC-003). |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | Resolver junto con CC-020. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Excel actualizado y verificado en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |
| 2026-10-05 | CERRADO (sin implementación) | marybaxmann | PR #3 revisado e integrado en `main` (merge `637db1a`). Sin implementación. |

| 2026-10-18 | CERRADO (sin implementación) | marybaxmann | Reemplazo parcial por CC-026: `clase_edad` vuelve a ARBOLES como obligatoria, con su validación de 5 valores en la columna correcta (pendiente P5 frente a CC-020). |
| 2026-10-20 | REEMPLAZADO | marybaxmann | CC-028 (P5): `clase_edad` es obligatoria en ARBOLES; ya no existe la hoja MEDICIONES_DENDROMETRICAS. AM-07. |
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
| Observaciones | Antes de sincronizar el diccionario debe resolverse conceptualmente: (1) si `nivel_riesgo` debe existir; (2) si representa algo distinto de `clasificacion_riesgo`; (3) si `resultado_general` es descriptivo o calculado; (4) quién puede ingresarlos; (5) si alguno debe eliminarse. **Decisión (2026-10-18) → CC-026 (AMD-37):** `nivel_riesgo` se hereda de `clasificacion_riesgo` del REGISTRO_EVALUACION vinculado (incluido el ajuste del Inspector, PR-008 v2.0), escala Bajo / Moderado / Alto / Extremo, no editable; `resultado_general` es texto libre. |

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
| Observaciones | No asumir que son el mismo concepto por compartir etiquetas. Primero debe definirse semánticamente cada campo; después se sincroniza el diccionario. **Decisión parcial (2026-10-18) → CC-026 (AMD-39):** la Prioridad de la OT se propone por defecto desde la `clasificacion_prioridad` vigente del árbol y el Usuario municipal puede modificarla. |

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
| Estado | EN REVISIÓN |
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
| Observaciones | Queda explícitamente pendiente decidir si "Encargado de mantención" será un rol independiente. **Decisión parcial (2026-10-09) → CC-022:** el Administrador crea proyectos, agrega usuarios y ve el proyecto completo en modo de solo lectura; el Usuario municipal registra órdenes de trabajo y actualiza el estado de órdenes e incidencias (PR-003 v6.0, PR-004 v5.0, PR-009 v2.0). **Siguen pendientes en este CC:** (1) si el Usuario municipal es también el Inspector y realiza la evaluación técnica (mientras tanto, con el Administrador en solo lectura, el entorno de desarrollo conserva el registro de evaluaciones por el Usuario municipal); (2) el rol "Encargado de mantención"; (3) quién corrige datos ya registrados (especie, mediciones, ubicación); (4) sincronización de la hoja USUARIOS y de la columna "¿Quién lo ingresa?" del Excel maestro. **Decisión (2026-10-18) → CC-026:** cuatro roles distintos (Administrador, Usuario municipal, Inspector, Encargado de mantención); el Usuario municipal no es el Inspector y no registra datos técnicos; el Inspector corrige los datos registrados mediante OT; "Encargado de mantención" es un rol independiente (PR-019, PR-020). Siguen pendientes los identificadores internos de los roles nuevos, si una persona puede tener varios roles y si el rol es por proyecto. |

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
| Observaciones | Distinto de CC-005 (privacidad y saneamiento de datos personales). CC-018 no elimina datos todavía; solo registra el problema. Caso agregado por CC-004: datos de ejemplo que guardan la acción como su propio subtipo, contrario a la convención "acción sin subtipos → subtipo vacío (null)" (`docs/methodology/convenciones-catalogos.md`): ORDENES DE TRABAJO `OT-I-000001` (`Accion_solicitada` y `subtipo_accion` = "Evaluación inicial") e INSPECCIONES `INS-000001` (`tipo_inspeccion_realizada` y `subtipo_inspeccion` = "Evaluación inicial"). No se corrigen en CC-004. **Avance (2026-10-18) → CC-026 (AMD-42):** el Excel auditado elimina los datos de ejemplo de los anexos; pendiente de sincronizar en el Excel maestro. |

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
| Estado | PENDIENTE DE IMPLEMENTACIÓN |
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
| Commits / PR asociados | `6af04ec` — [CC-020] Separar identidad del árbol y medición dendrométrica (+CC-008, CC-009); `15c9994` — [CC-020] Corrección previa al merge (rama `cc-020-arbol-medicion`, repositorio backend). Integrados en `main` mediante PR #3 (merge `637db1a`). Cierre registrado en un commit documental posterior. |
| Observaciones | **Siguen abiertas (no se cierran en este CC):** categorías definitivas de configuración de fustes y regla de DAP equivalente; política de especie no determinada, catálogo y nombres comunes; UTM, datum, huso y coordenada original (ADR-010 v2.0); relación MEDICIÓN ↔ INSPECCIÓN y efecto de corregir o anular una medición usada por una inspección completada (ADR-007); obligatoriedad de campos en mediciones posteriores; tratamiento de `clase_edad`; correspondencia `sector` / `ubicacion_descriptiva` con comuna, dirección y lugar de referencia; permisos de anulación y de corrección de mediciones por el Usuario municipal. **No modificado:** `database/`, `src/`, migraciones, RLS, frontend, ArcGIS/SIG. Referencia a PR-003 v4.0 en ADR-014 se conserva (describe el estado validado de RLS). Integrado mediante PR #3 (merge `637db1a`). Por tratarse de una especificación de ámbito `operativo` (`docs/workflow.md` §14.12), pasa a `PENDIENTE DE IMPLEMENTACIÓN` sin esperar la publicación de 2.0.0. Próximo paso: diseño técnico (INV-1A); la implementación no está autorizada todavía. |

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
- [ ] Revisión final — pendiente (tras la implementación). Revisión de la fuente: aprobada por marybaxmann en el PR #3 (merge `637db1a`, 2026-10-05).

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-05 | DETECTADO | — | Auditoría de la decisión 5 (árbol vs. medición) al preparar INV-1. |
| 2026-10-05 | EN REVISIÓN | — | Plan de sincronización: impacto en ARBOLES, DICCIONARIO_CAMPOS, PR-006, CC relacionados. |
| 2026-10-05 | PENDIENTE DE DECISIÓN | — | Decisiones bloqueantes H-1, H-2, H-3 y G1. |
| 2026-10-05 | APROBADO METODOLÓGICAMENTE | marybaxmann | H-1, H-2, H-3 adoptadas; G1 resuelta vía CC-008; sincronización autorizada. |
| 2026-10-05 | FUENTE SINCRONIZADA | — | Fuentes actualizadas y verificación §14.9 aprobada en la rama `cc-020-arbol-medicion`, repositorio backend. Pendiente de integración del PR. |
| 2026-10-05 | FUENTE SINCRONIZADA | marybaxmann | Corrección menor previa al merge (revisión de la aprobadora): `configuracion_fustes`, `numero_fustes` y `dap_fustes_cm` sin altura de referencia fija ni categorías candidatas (criterio/altura de referencia PENDIENTE); `huso` sin zona fija "19S". Verificación repetida y aprobada. |
| 2026-10-05 | PENDIENTE DE IMPLEMENTACIÓN | marybaxmann | PR #3 revisado e integrado en `main` (merge `637db1a`; commits `6af04ec`, `15c9994`). Especificación de ámbito `operativo` (§14.12). Siguiente: diseño técnico INV-1A; sin implementación de software todavía. |

| 2026-10-18 | PENDIENTE DE IMPLEMENTACIÓN | marybaxmann | Reemplazo parcial por CC-026: el alta municipal no exige medición; las mediciones las registra el Inspector en la inspección; la vigencia se determina por la OT completada más reciente (`fecha_completada_ot`). ADR-016 v2.0, PR-006 v8.0. |
| 2026-10-20 | REEMPLAZADO | marybaxmann | CC-028 (P1, P3, P4, P5) dejó sin efecto la entidad MEDICIONES_DENDROMETRICAS, `configuracion_fustes` y la ubicación canónica WGS84 de ingreso; CC-031 define la corrección y anulación, y CC-032 el retiro físico de `tree_measurements` y de la función de alta con medición. No se implementa. AM-07. |
---

### CC-021 — Jerarquía de fuentes de producto: el prototipo histórico no prevalece sobre decisiones posteriores

| Campo | Valor |
|---|---|
| Fecha | 2026-10-06 |
| Origen | Definición del `CLAUDE.md` del frontend y del agente `frontend-ux`; revisión de las referencias de producto (Figma original, prototipo navegable y referencias visuales). |
| Tipo | 5 — documental (gobernanza de referencias; sin cambio de lógica ni de datos) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | PR-001, PR-016; referencia a Groundzy en PR-015 v2.0; descripción del prototipo en el contexto de ADR-001 v1.1; `CLAUDE.md` (sección de fuentes funcional/UX); `docs/workflow.md` §10; `docs/methodology/00-index.md` (regla de precedencia, flujo funcional/UX). |
| Versión anterior | PR-001 v2.0: `Valpo-Verde-Conecta` como "referencia funcional actual". PR-016 v3.0: prioridad de referencias con el prototipo en primer lugar para lo funcional/UX, por encima de la documentación, y Groundzy como referencia visual secundaria. |
| Versión nueva | PR-016 v4.0: jerarquía única — (1) metodología y fuentes vigentes; (2) decisiones controladas ADR/PR/CC; (3) backend y API vigentes; (4) documentación vigente; (5) Figma y prototipo histórico, solo intención funcional; (6) referencias visuales aprobadas, solo UX/UI. Referencia visual principal y única oficial: `03_CityDashboardsButton.jpg`; Groundzy retirada como referencia oficial. PR-001 v3.0: prototipo y Figma original como referencias históricas de intención funcional. |
| Motivo | Con el prototipo en primer lugar, una pantalla histórica podía contradecir decisiones posteriores (módulos reorganizados, campos y categorías superados). Mantener varias referencias visuales oficiales podía mezclar lenguajes visuales. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-06: aprobación de la jerarquía de seis niveles; el Figma histórico conserva valor como evidencia de intención funcional y de producto, pero no puede restablecer decisiones que posteriormente fueron modificadas, reemplazadas o eliminadas; `03_CityDashboardsButton.jpg` como referencia visual principal aprobada; retiro de Groundzy; los diagramas de decisión metodológicos no son referencias de UI. |
| Archivos afectados | `docs/project-rules.md`, `docs/architecture-decisions.md`, `CLAUDE.md`, `docs/workflow.md`, `docs/methodology/00-index.md`, `docs/registro-cambios.md`, `HANDOFF.md`. Repositorio frontend (sin versionar todavía): `docs/referencias/figma-original/` (8 pantallas), `docs/referencias/visuales/03_CityDashboardsButton.jpg`. |
| Impacto en diagramas | Ninguno. Los diagramas de decisión no se copian al frontend ni se usan como referencia de UI. |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno en código. El `CLAUDE.md` del frontend y el agente `frontend-ux` se rigen por esta jerarquía. |
| Pruebas necesarias | No aplica (documental). Verificación: ninguna referencia vigente ubica el prototipo o el Figma por encima de la documentación, el backend o la metodología, ni cita a Groundzy como referencia visual vigente. |
| Dependencias | Ninguna. |
| rule_version | sin cambio (fuera del paquete metodológico) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-06 |
| Fecha de implementación | sin implementación (cambio documental) |
| Commits / PR asociados | Pendiente (sin commit; cambios en la rama `docs/cc-021-jerarquia-fuentes` del repositorio backend, pendientes de revisión). |
| Observaciones | PR-015 v2.0: actualización solo referencial, sin nueva versión — "experiencia territorial similar conceptualmente a Groundzy (referencia de UX, PR-016)" pasa a "experiencia territorial que permita:"; la lista de objetivos no cambia. ADR-001 v1.1: actualización solo referencial, sin nueva versión ni cambio de decisión técnica — el prototipo pasa de "referencia funcional v2 (ver PR-001)" a "referencia histórica de intención funcional (ver PR-001 v3.0 y PR-016 v4.0): no constituye fuente funcional vigente ni prevalece sobre decisiones posteriores". Distinción vigente: `clasificacion_prioridad` es un resultado metodológico (M05, versión en preparación) que el frontend podrá representar cuando exista el contrato backend; "Priorización" como módulo independiente del Figma histórico no se reconstruye por su sola presencia allí. Se conservan como historial las menciones a Groundzy y al prototipo en versiones reemplazadas, en `docs/checkpoint-2026-09-16.md` y en `docs/roadmap.md`. Ejemplo que motivó la regla: "Priorización" figura como módulo propio en el Figma histórico; su presencia allí no autoriza a recrearlo como módulo independiente. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES — N/A: sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios.
- [x] DICCIONARIO_CAMPOS — N/A: sin cambios.
- [x] VERSION — N/A: fuera del paquete metodológico.
- [x] docs/methodology/ — `00-index.md` (regla de precedencia y flujo funcional/UX).
- [x] PR / ADR — PR-001 v3.0, PR-016 v4.0; referencias en PR-015 v2.0 y ADR-001 v1.1.
- [x] Export de texto — N/A.
- [x] Verificación §14.9 (fuente) — N/A: no se modifican artefactos metodológicos.
- [x] Migración + schema.sql — N/A.
- [x] Backend (services/rules) — N/A.
- [x] API / Zod — N/A.
- [x] Frontend — N/A en código.
- [x] Verificación §14.9 (implementación) — N/A.
- [ ] Revisión final — pendiente: revisión de marybaxmann antes del commit.

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-06 | DETECTADO | — | PR-016 v3.0 y `CLAUDE.md` ubicaban el prototipo por encima de la documentación vigente para lo funcional/UX. |
| 2026-10-06 | APROBADO METODOLÓGICAMENTE | marybaxmann | Jerarquía de seis niveles, referencia visual principal y retiro de Groundzy aprobados; implementación documental autorizada. Cambios escritos en la rama del repositorio backend, sin commit, pendientes de revisión. Al integrarse: `CERRADO` (sin implementación). |
| 2026-10-06 | APROBADO METODOLÓGICAMENTE | marybaxmann | Se incorpora la actualización referencial de ADR-001 y el relevo en `HANDOFF.md`. Verificación sin contradicciones activas sobre la jerarquía de fuentes. Preparado para integración mediante PR desde la rama `docs/cc-021-jerarquia-fuentes`; tras el merge se registra el commit y se cierra como `CERRADO` (sin implementación). |

---

### CC-022 — Alcance del Administrador (solo lectura) y gestión de estados por el Usuario municipal

| Campo | Valor |
|---|---|
| Fecha | 2026-10-09 |
| Origen | Decisión parcial de CC-015 (Consolidación de roles), definida por la autora con su equipo durante la auditoría post-demo. |
| Tipo | 2 — regla de negocio / permisos |
| Estado | PROBADO |
| Regla / campo afectado | PR-003, PR-004, PR-009. |
| Versión anterior | PR-004 v4.0: el Administrador "realiza la evaluación del arbolado" y gestiona inventarios, infraestructura, incidencias y mantenimiento. PR-003 v5.0: el Usuario municipal reporta y consulta incidencias y solo consulta mantenimiento. PR-009 v1.0: las inspecciones las realiza el Administrador. |
| Versión nueva | PR-004 v5.0: el Administrador crea y gestiona proyectos, gestiona sus miembros y consulta toda la información del proyecto en modo de solo lectura; no registra ni modifica datos de árboles, mediciones, evaluaciones, infraestructura, órdenes ni incidencias. PR-003 v6.0: el Usuario municipal registra órdenes de trabajo y actualiza el estado de órdenes e incidencias. PR-009 v2.0: las inspecciones no las realiza el Administrador; el rol que las realiza se define en CC-015. |
| Motivo | Separar la administración de la plataforma (proyectos y usuarios) de la operación técnica del arbolado, que recae en el equipo municipal. |
| Fundamento / fuente | Decisión de `marybaxmann` y su equipo del 2026-10-09: "para admin está la opción de que vea el proyecto, pero solo eso" (confirmado: todo el proyecto en modo de solo lectura); "el usuario municipal sí puede cambiar y actualizar estados"; el resto de CC-015 queda pendiente. |
| Archivos afectados | `docs/project-rules.md`, `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Hoja USUARIOS y columna "¿Quién lo ingresa?" de DICCIONARIO_CAMPOS: pendientes de sincronizar junto con CC-015. |
| Impacto en BD | RLS: el Administrador pasa de acceso total a solo lectura en `trees`, `tree_risk_assessments`, `tree_infrastructure_assessments`, `maintenance` e `incidents`; el Usuario municipal obtiene UPDATE sobre `maintenance` e `incidents` de su proyecto; `fn_create_tree_with_measurement` deja de aceptar al Administrador. Migración 011. |
| Impacto en backend | El Administrador recibe 403 en altas y ediciones (árbol, evaluaciones, órdenes, incidencias, estados); el cambio de estado pasa del Administrador al Usuario municipal. |
| Impacto en API | Mismos endpoints; cambia quién está autorizado. |
| Impacto en frontend | Para el Administrador se ocultan las acciones de registro, edición y cambio de estado; el Usuario municipal ve la actualización de estados. |
| Pruebas necesarias | Ejecutadas 2026-10-09: 162/162 tests backend (incluye 403 del Administrador en altas y cambios de estado, y cambio de estado por el Usuario municipal); RLS verificada con simulación de roles en Supabase (Administrador: lectura sí, escritura y alta por RPC rechazadas; Usuario municipal: actualización de órdenes e incidencias y alta de árbol permitidas). Criterios: Administrador: lectura de proyecto, inventario, fichas y módulos; 403 en altas, ediciones y cambios de estado (backend y RLS). Usuario municipal: actualización de estado de órdenes e incidencias de su proyecto; sin acceso a proyectos ajenos. |
| Dependencias | CC-015 (pendientes: evaluación técnica por el Usuario municipal/Inspector, "Encargado de mantención", corrección de datos, sincronización del Excel). |
| rule_version | sin cambio (permisos fuera del paquete metodológico) |
| Aprobado por | marybaxmann (con su equipo) |
| Fecha de aprobación | 2026-10-09 |
| Fecha de implementación | 2026-10-09 (desarrollo/pruebas, ADR-013) |
| Commits / PR asociados | Documentación: rama `docs/cc-022-roles`. Implementación en `feature/demo-sivu`: backend `be1707b` (migración 011, `assertProjectWriter`, tests), frontend `4cef105` (interfaz de solo lectura). |
| Observaciones | Con el Administrador en solo lectura, ningún rol vigente tiene asignada formalmente la evaluación técnica hasta que se resuelva CC-015; el entorno de desarrollo conserva el registro de evaluaciones por el Usuario municipal (cálculo siempre por el motor, sin modificación manual). |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES — N/A: sin cambios.
- [x] MATRICES_CALCULO — N/A: sin cambios.
- [ ] DICCIONARIO_CAMPOS — columna "¿Quién lo ingresa?": pendiente (con CC-015).
- [ ] Hoja USUARIOS — pendiente (con CC-015).
- [x] VERSION — N/A: fuera del paquete metodológico.
- [x] PR / ADR — PR-003 v6.0, PR-004 v5.0, PR-009 v2.0.

---

### CC-023 — Referencias visuales complementarias de inspiración UX/UI

| Campo | Valor |
|---|---|
| Fecha | 2026-10-09 |
| Origen | Rediseño visual post-demo: la autora aporta referencias de diseño y aprueba una maqueta de prueba. |
| Tipo | 5 — documental (gobernanza de referencias; sin cambio de lógica ni de datos) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | PR-016. |
| Versión anterior | PR-016 v4.0: `03_CityDashboardsButton.jpg` como única referencia visual oficial; Groundzy retirada, reincorporable solo mediante decisión explícita. |
| Versión nueva | PR-016 v5.0: se mantiene la referencia principal y se agregan cuatro referencias complementarias de inspiración UX/UI (vista de árbol de Groundzy, tablero agrícola en tablet, Farm Management System, Wisetown), con reglas de uso: adaptar sin copiar, paleta de riesgo intacta, sin elementos que impliquen funciones inexistentes, gráficos solo con datos reales y validación previa con maqueta. |
| Motivo | Dar más color y contexto territorial a la interfaz sin perder la identidad de SIVU ni contradecir la jerarquía de fuentes. |
| Fundamento / fuente | Decisión de `marybaxmann` del 2026-10-09: le gustan los pines, el resumen rápido, la estructura de la ficha y los gráficos por módulo; pide mantener su paleta de riesgo y que el diseño no parezca un plagio de Groundzy, sino una adaptación a la arquitectura de SIVU. |
| Archivos afectados | `docs/project-rules.md`, `docs/registro-cambios.md`; `valpo-verde-frontend/CLAUDE.md` (tabla de referencias). Las imágenes no se versionan: son material de terceros y el repositorio es público. |
| Impacto en diagramas · Excel · BD · backend · API | Ninguno. |
| Impacto en frontend | Ninguno en código hasta aprobar la maqueta v2; el rediseño posterior se rige por las reglas de PR-016 v5.0. |
| Pruebas necesarias | No aplica (documental). |
| Dependencias | CC-021 (jerarquía de fuentes). |
| rule_version | sin cambio (fuera del paquete metodológico) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-09 |
| Fecha de implementación | sin implementación (cambio documental) |
| Commits / PR asociados | Rama `docs/cc-023-referencias-visuales`. |
| Observaciones | Maqueta de prueba v1 validada por la autora el 2026-10-09; la maqueta v2 incorpora la diferenciación respecto de Groundzy antes del rediseño. |


### CC-024 — N13: componente "No determinado" y árbol sin clasificación de riesgo

| Campo | Valor |
|---|---|
| Fecha | 2026-10-10 |
| Origen | Auditoría del motor de riesgo (`services/rules/treeRisk.ts`) contra `borrador_reglas_diagramas_v3.xlsx` y el Excel maestro. Resuelve la duda N13 (hoja DUDAS, PENDIENTE). |
| Tipo | 2 — cambio metodológico: salida cuando un indicador parcial queda "No determinado" (+4 implementación ya existente, + validación de entrada) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | R01, R02 (y R03 por coherencia) → `probabilidad_falla_*`; M02 + M03 → `clasificacion_raices_cuello / _tronco / _copa_ramas`; R04 → `clasificacion_riesgo`. |
| Versión anterior | N1 define que un indicador parcial "No determinado" no recibe puntaje ni equivale a 0 (RC/TR-CAV-05 y -08). N13 dejaba abierto qué pasa con la probabilidad de falla del componente y con M02, M03 y R04: (a) No determinada, (b) puntaje parcial con advertencia, (c) otra. |
| Versión nueva | Opción (a). Si un indicador parcial del componente queda "No determinado", la probabilidad de falla del componente es **No determinada**, su clasificación (M02 + M03) también, y el árbol queda **sin clasificación de riesgo** (R04 sin valor) hasta completar la medición. No se usa un puntaje parcial. La clasificación del árbol es independiente de la clasificación de infraestructura (M04): un árbol sin clasificación no la afecta ni se mezcla con ella. En la interfaz se rotula "Sin clasificación" y se distingue de "Sin evaluación" (árbol nunca evaluado). |
| Motivo | Evitar que el riesgo de un árbol se calcule con información incompleta y mantener separadas la evaluación del árbol y la de infraestructura. |
| Fundamento / fuente | Decisión de `marybaxmann` del 2026-10-10: "queda sin clasificación, pero diferenciado entre árbol y lo que es infraestructura". |
| Archivos afectados | Fuente (pendiente de sincronizar): borrador `REGLAS_INDICADORES` / `DUDAS` (N13 → RESUELTA), `DICCIONARIO_CAMPOS` (`probabilidad_falla_*`, `clasificacion_*`, `clasificacion_riesgo`), `docs/methodology/`. Implementación: `src/services/rules/treeRisk.ts` (comentario), `src/schemas/treeRiskAssessment.schema.ts`; frontend `RiskAssessmentModal`, ficha, paneles, mapa y leyenda. |
| Impacto en diagramas | Agregar la salida "No determinado / sin clasificación" en los diagramas de R01 y R02 al sincronizar el paquete 2.0.0. |
| Impacto en Excel metodológico | DUDAS: N13 → RESUELTA (opción a). DICCIONARIO_CAMPOS: en `probabilidad_falla_raices_cuello` y `_tronco`, la nota de "No determinado"; en `clasificacion_riesgo`, "Requiere clasificaciones válidas de los tres componentes; si alguna falta, sin clasificación". Sin cambios en MATRICES_CALCULO. |
| Impacto en BD | Ninguno: `clasificacion_*` y `probabilidad_falla_*` ya admiten NULL (migración 007). |
| Impacto en backend | El motor ya se comportaba así (R04 = null si un componente es null); solo se corrige el comentario, que decía lo contrario. Además, la validación de entrada rechaza evaluaciones con datos condicionales faltantes o fuera de rango, para que el motor no asuma severidades no observadas (heridas sin condición, grieta sin afectación o dirección, codominancia sin grieta en la unión ni corteza incluida, ramas secas sin porcentaje o con 0 % / >100 %, SL fuera de 0–100, t/R fuera de 0–1) y valida la fecha futura con la hora de Chile. SL% y t/R vacíos siguen permitidos: la regla los resuelve como "No determinado". |
| Impacto en API | POST `/api/trees/:treeId/risk-assessments` responde 400 con el dato faltante en lugar de guardar un resultado con una severidad asumida. |
| Impacto en frontend | El asistente no deja avanzar hasta completar los datos condicionales; las preguntas Sí/No condicionales aparecen sin responder. "Sin clasificación" reemplaza "No determinado" como rótulo del riesgo del árbol; el mapa usa un pin blanco con borde neutro para "Sin clasificación", distinto del pin neutro relleno de "Sin evaluación". |
| Pruebas necesarias | `tests/schemas/treeRiskAssessment.schema.test.ts` (23 casos); suite completa del backend; recálculo de las evaluaciones guardadas. |
| Dependencias | N1 (resuelta). N21 (M04 sin componentes aplicables) sigue PENDIENTE y no se resuelve aquí. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-10 |
| Fecha de implementación | 2026-10-10 (en `feature/demo-sivu`, sin commit a la fecha de esta ficha) |
| Commits / PR asociados | Rama `docs/cc-024-n13-sin-clasificacion` (esta ficha). |
| Observaciones | Auditoría: las reglas de REGLAS_INDICADORES v3, los rangos de R01–R03, las matrices M01–M03 y R04 coinciden con el motor; las 4 evaluaciones guardadas se recalcularon y coinciden. Deuda conocida: el motor implementa el borrador v3 sin paquete publicado (00-index, punto 5), aceptado para la demo. |

**Checklist de sincronización**

- [ ] Diagrama
- [ ] REGLAS_INDICADORES / DUDAS (N13)
- [x] MATRICES_CALCULO — N/A (sin cambios)
- [ ] DICCIONARIO_CAMPOS
- [ ] VERSION
- [ ] docs/methodology/
- [x] PR / ADR — N/A
- [ ] Export de texto
- [ ] Verificación §14.9 (fuente)
- [x] Migración + schema.sql — N/A (las columnas ya admiten NULL)
- [x] Backend (services/rules) — comentario corregido; comportamiento ya conforme
- [x] API / Zod — validación de datos condicionales y rangos
- [x] Frontend — asistente, rótulos, mapa y leyenda
- [ ] Verificación §14.9 (implementación)
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-10 | DETECTADO | auditoría | Comentario del motor contradice al código; N13 pendiente. |
| 2026-10-10 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción (a), árbol diferenciado de infraestructura. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-025 — Prototipo visual "SIVU Territorio" como referencia visual principal del frontend

| Campo | Valor |
|---|---|
| Fecha | 2026-10-16 |
| Origen | Exploración visual UX/UI posterior a CC-023 (sesión de diseño del 2026-10-13). La autora aprueba el prototipo "SIVU Territorio" como dirección visual del futuro frontend. |
| Tipo | 5 — documental (gobernanza de referencias; sin cambio de lógica ni de datos) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | PR-016. |
| Versión anterior | PR-016 v5.0: `03_CityDashboardsButton.jpg` como referencia visual principal; cuatro referencias complementarias de terceros (CC-023). |
| Versión nueva | PR-016 v6.0: el prototipo "SIVU Territorio" (repositorio frontend, rama `prototype/sivu-territorio-v1`, commit `c852104`, carpeta `prototypes/sivu-territorio-lab/`) es la referencia visual principal, en el nivel 6 de la jerarquía de fuentes. La aprobación corresponde a la dirección visual, no a cada componente, contenido o interacción. `03_CityDashboardsButton.jpg` pasa a antecedente e inspiración complementaria. Se agregan reglas de integración, roles, datos y cartografía. |
| Motivo | Fijar una dirección visual concreta y navegable para el rediseño, sin confundirla con una implementación funcional ni con decisiones de datos, metodología o permisos. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-16: adopta la maqueta como diseño de referencia del frontend ("me gustó mucho el diseño moderno"), con detalles por corregir; opción 1 de la decisión B; redacción de la regla 2; precisiones 1 a 5. |
| Archivos afectados | Backend: `docs/project-rules.md`, `docs/registro-cambios.md`, `docs/roadmap.md`, `CLAUDE.md`, `HANDOFF.md`. Frontend: `CLAUDE.md`, `.claude/agents/frontend-ux.md`. El prototipo y su rama no se modifican. |
| Impacto en diagramas · Excel · BD · backend · API | Ninguno. |
| Impacto en frontend | Ninguno en código con este CC. La integración posterior se rige por PR-016 v6.0. |
| Pruebas necesarias | No aplica (documental). |
| Dependencias | CC-021 (jerarquía de fuentes), CC-023 (referencias complementarias), CC-015 (roles, EN REVISIÓN), CC-019 / ADR-015 (arquitectura SIG). |
| rule_version | sin cambio (fuera del paquete metodológico) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-16 |
| Fecha de implementación | sin implementación (cambio documental) |
| Commits / PR asociados | Prototipo: frontend `prototype/sivu-territorio-v1` @ `c852104` (respaldo; sin fusión con `main`, sin PR de integración, sin despliegue). Documentación: rama `docs/cc-025-prototipo-visual` en ambos repositorios. |
| Observaciones | **Trazabilidad:** maqueta de prueba v1 (2026-10-09, validada, CC-023); v2 (2026-10-10) descartada por su parecido con Groundzy; v3 (2026-10-10) con la diferenciación, cuyas ideas pasaron al código de la demo. El 2026-10-13 la autora pidió una nueva exploración ("Libertad de rediseño UX/UI", "Segunda exploración visual"); de ella surge SIVU Territorio, revisado según la instrucción "Conservación funcional". Se registra como **prototipo de referencia nuevo, sucesor de la línea abierta por CC-023, no como su maqueta v2**. El "v1" de la rama numera la serie SIVU Territorio. **Verificación:** compilar `c852104` con la imagen excluida reproduce byte a byte el JS y el CSS de la publicación revisada por la autora. **Detalles por corregir en la integración:** el aviso "Proyecto piloto" usa el ámbar de Moderado; la ficha muestra "Coordenadas WGS84"; el selector "Ver como" es solo de revisión. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios.
- [x] REGLAS_INDICADORES · MATRICES_CALCULO · DICCIONARIO_CAMPOS — N/A: sin cambios; el Excel maestro conserva su autoridad.
- [x] VERSION · export de texto · docs/methodology/ — N/A: fuera del paquete metodológico.
- [ ] PR / ADR — PR-016 v6.0.
- [x] Verificación §14.9 (fuente) — N/A: gobernanza en `docs/`.
- [x] Migración + schema.sql · Backend · API / Zod — N/A.
- [ ] Frontend — solo documentación (`CLAUDE.md`, agente `frontend-ux`); sin código.
- [x] Verificación §14.9 (implementación) — N/A: sin implementación.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-16 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisión previa a la ficha (B opción 1; regla 2; precisiones 1–5); pasa directo desde EN REVISIÓN (§14.6). |

---

### CC-026 — Auditoría funcional del modelo de datos: roles, alta del árbol, historial, inspección y revisión de mantenimiento

| Campo | Valor |
|---|---|
| Fecha | 2026-10-18 |
| Origen | Auditoría funcional express del modelo de datos SIVU (2026-10-18), sobre `Base de Datos SIVU AUDITAR.xlsx` y el documento de continuidad de la auditoría anterior. Evidencia: `docs/auditorias/2026-10-18-modelo-datos/` (decisiones AMD-01 a AMD-42). |
| Tipo | 3 — modelo de datos (+2 regla de negocio / roles, +1 corrección de inconsistencias) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | Roles (CC-015); PR-003, PR-004, PR-006, PR-008, PR-009, PR-010; PR-019 y PR-020 (nuevas); ADR-006, ADR-016; DICCIONARIO_CAMPOS de ARBOLES, REGISTRO_EVALUACION, ORDENES DE TRABAJO, INSPECCION (antes INSPECCIONES), MANTENIMIENTO, INCIDENCIA, SECTORES, LISTAS y CATALOGO_ESPECIES; hojas nuevas REGLAS_GENERALES, PROYECTOS y MIEMBROS_PROYECTO. |
| Versión anterior | PR-003 v6.0 (el Usuario municipal registra mediciones y evaluaciones en desarrollo); PR-004 v5.0; PR-006 v7.0 (medición inicial obligatoria en el alta; vigencia por `fecha_medicion`); PR-009 v2.0 (rol de inspección pendiente); PR-010 v1.0 (hasta 20 fotos por árbol, sin vistas obligatorias); ADR-006 v1.1 (el Administrador evalúa; contradicción C2); ADR-016 v1.0 (relación medición ↔ inspección pendiente). |
| Versión nueva | PR-003 v7.0, PR-004 v6.0, PR-006 v8.0, PR-008 v2.0 (ajuste justificado de clasificaciones por el Inspector), PR-009 v3.0, PR-010 v2.0, PR-019 v1.0 (Inspector), PR-020 v1.0 (Encargado de mantención y revisión de mantenimiento), ADR-006 v2.0, ADR-016 v2.0. Resumen: cuatro roles; el Usuario municipal da de alta el árbol solo con nombre y ubicación; el Inspector registra todos los datos técnicos mediante OT (incluida la OT de Levantamiento); las mediciones se registran en la inspección y se hacen vigentes al completar la OT (`fecha_completada_ot`); `estado_registro` Preguardado / Finalizado; cuatro fotos nuevas por inspección; revisión de mantenimiento opcional definida por el Usuario municipal, obligatoria en Tala y Retiro_tocón; ajuste justificado de clasificaciones; fechas sugeridas de próxima inspección y monitoreo según `nivel_riesgo`; proyectos y membresía (PROYECTOS, MIEMBROS_PROYECTO). |
| Motivo | Fijar en la plataforma el modelo de datos auditado. Por decisión de la autora, lo decidido en esta auditoría prevalece sobre las versiones anteriores que lo contradicen. |
| Fundamento / fuente | Decisiones de `marybaxmann` del 2026-10-18 (AMD-01 a AMD-42, `decisiones.md`; AMD-31 a AMD-42 registradas por la autora directamente en el Excel auditado) y su instrucción: "lo actualizado en esta sesión es la verdad absoluta de la plataforma". |
| Archivos afectados | Backend: `docs/project-rules.md`, `docs/architecture-decisions.md`, `docs/registro-cambios.md`, `docs/methodology/modelo-arbol-medicion.md`, `docs/auditorias/2026-10-18-modelo-datos/` (nuevo), `docs/roadmap.md`, `HANDOFF.md`, `CLAUDE.md`. Frontend: `docs/frontend-architecture.md`, `docs/thesis-frontend-development.md`. |
| Impacto en diagramas | Ninguno (la metodología no se modificó; solo se actualizaron nombres de campo en las referencias). |
| Impacto en Excel metodológico | **Pendiente (no sincronizado).** La copia auditada (fuera del repositorio) contiene, además de lo indicado a continuación, las decisiones AMD-31 a AMD-42: hojas PROYECTOS y MIEMBROS_PROYECTO, INSPECCIONES renombrada INSPECCION, Hoja4 eliminada, campos `justificacion_ajuste_clasificacion`, `fecha_proximo_monitoreo`, `justificacion_ajuste_fecha` e `id_incidencia`, `requiere_nueva_inspeccion` eliminado y datos de ejemplo eliminados. Detalle de la primera etapa: DICCIONARIO_CAMPOS 249 → 253 filas (6 campos nuevos: `dano_interferencia_alcorque`, `dano_interferencia_red_aerea`, `observaciones_tutorado`, `estado_registro`, `fecha_completada_ot`, `requiere_revision_inspector`; 2 filas duplicadas eliminadas; 281 celdas corregidas); cabeceras de ARBOLES, REGISTRO_EVALUACION, INSPECCIONES y ORDENES DE TRABAJO; LISTAS y sus rangos con nombre; referencias de nombre en MATRICES_CALCULO (T4, Z5); hoja nueva REGLAS_GENERALES. El Excel maestro del repositorio no se modificó: por decisión de la autora, en esta etapa solo se actualiza la documentación. |
| Impacto en BD | Pendiente de diseño: roles Inspector y Encargado de mantención (RLS); alta sin medición; `estado_registro`; `fecha_completada_ot`; `requiere_revision_inspector`; varios registros de mantenimiento por OT; OT de Levantamiento sin árbol. |
| Impacto en backend | Pendiente: permisos por rol (el Usuario municipal deja de registrar mediciones y evaluaciones); cierre automático de OT de Mantenimiento; bloqueo de Completada con inspecciones preguardadas. |
| Impacto en API | Pendiente de diseño. |
| Impacto en frontend | Pendiente: formularios por rol, alta municipal reducida, cuatro vistas fotográficas, revisión de mantenimiento. |
| Pruebas necesarias | En implementación: el Usuario municipal no puede registrar datos técnicos; una OT con inspección preguardada no se completa; la evaluación vigente es la de la OT completada más reciente aunque su inspección sea anterior; una OT de Mantenimiento sin revisión se cierra con ejecución y evidencia; Tala y Retiro_tocón no se cierran sin aprobación; un rechazo conserva la OT y agrega un registro nuevo. |
| Dependencias | CC-015 (decide su modelo de roles); CC-020 y CC-009 (reemplazo parcial); CC-022 (compatible: Administrador sin escritura de datos técnicos; Usuario municipal gestiona estados); CC-004, CC-012, CC-013, CC-018 (avance parcial); CC-017 (pendiente P6); DA-02 y DA-04 de la postauditoría (avance parcial). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-18 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-026-auditoria-modelo-datos` en ambos repositorios. |
| Observaciones | **Reemplaza** la nota de CC-015 "usuario municipal e inspector son el mismo rol": son roles distintos (AMD-01). **Reemplaza parcialmente** CC-020 (medición inicial obligatoria en el alta, registro de mediciones por el Usuario municipal y vigencia por `fecha_medicion`) y CC-009 (ubicación de `clase_edad`). Resuelve también CC-010 (`nivel_riesgo` heredado, AMD-37) y la Prioridad de OT de CC-011 (AMD-39). **No decide** (pendientes de `pendientes.md`): ubicación canónica WGS84 frente a UTM manual (P1), `nombre_comun` en el árbol o en el catálogo (P2), entidad de mediciones con corrección y anulación (P3), configuración de fustes (P4), clase de edad (P5), BT/MT (P6), identificadores internos de los roles nuevos (P7), columna `ambito` (P8), límite de fotografías (P9). **Sin auditar:** MATRICES_CALCULO e INDICES (P15, P16), en revisión por la autora. La implementación en desarrollo (CC-020, CC-022) queda desalineada hasta su implementación. |

**Checklist de sincronización**

- [x] Diagrama — N/A: sin cambios de lógica.
- [x] REGLAS_INDICADORES · MATRICES_CALCULO — N/A en lógica; solo nombres de campo en la copia auditada.
- [ ] DICCIONARIO_CAMPOS — pendiente en el Excel maestro (hecho en la copia auditada).
- [ ] VERSION — pendiente.
- [x] docs/methodology/ — nota de vigencia en `modelo-arbol-medicion.md`.
- [x] PR / ADR — PR-003 v7.0, PR-004 v6.0, PR-006 v8.0, PR-008 v2.0, PR-009 v3.0, PR-010 v2.0, PR-019 v1.0, PR-020 v1.0, ADR-006 v2.0, ADR-016 v2.0.
- [ ] Export de texto — pendiente (no existe todavía).
- [ ] Verificación §14.9 (fuente) — pendiente de la sincronización del Excel maestro. Verificada en la copia auditada: cabeceras = diccionario en el mismo orden, sin campos duplicados, sin referencias a nombres antiguos.
- [ ] Migración + schema.sql — pendiente.
- [ ] Backend (services/rules) — pendiente (sin cambios en reglas).
- [ ] API / Zod — pendiente.
- [ ] Frontend — pendiente (solo documentación en este CC).
- [ ] Verificación §14.9 (implementación) — pendiente.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-18 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones AMD-01 a AMD-30 tomadas en la auditoría; pasa directo desde EN REVISIÓN (§14.6). Sincronización del Excel maestro e implementación pendientes. |
| 2026-10-18 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones complementarias AMD-31 a AMD-42, registradas por la autora en el Excel auditado: responden P7 (parcial) y P10–P14; agregan PR-008 v2.0. Quedan sin auditar MATRICES_CALCULO e INDICES. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-027 — Sincronización del motor de riesgo con MATRICES_CALCULO y REGLAS_INDICADORES del Excel auditado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-18 |
| Origen | Revisión de MATRICES_CALCULO, REGLAS_INDICADORES e INDICES del Excel auditado (sesión "SIVU auditoría funcional", 2026-10-18), pendiente P15–P16 de CC-026. Evidencia: `docs/auditorias/2026-10-18-modelo-datos/diferencias-motor.md` (DM-01 a DM-09). |
| Tipo | 2 — metodológico (+4 implementación) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | R02, R03, R04, M02, M04, M05; reglas RC-CAV y TR-CAV 01 a 10, CR-DEF-01 a 04, IN-*; etiquetas de consecuencia y de M02; INDICES. |
| Versión anterior | Motor del backend (`treeRisk.ts`, migración 007): `borrador_reglas_diagramas_v3` + Excel del 2026-10-06. R03 con máximo 5 y sin defoliación; t/R cuando cavidad externa = No; etiquetas "Despreciable" e "Improbable"; M04 y M05 sin implementar. |
| Versión nueva | Fuente vigente (decisión de la autora, M1 = a): `Base de Datos SIVU AUDITADO (2026-10-18).xlsx` — MATRICES_CALCULO, REGLAS_INDICADORES (98 reglas), DICCIONARIO_CAMPOS e INDICES. R03 con máximo 8 e incluye la defoliación; cavidades con SL (externa = Sí), t/R (interna = Sí), reglas 09 y 10 y validación de pudrición; etiquetas del maestro "Insignificante" y "Poco probable" (M3); M04 y M05 definidas. R02 y "No determinado" (CC-024) ya coinciden con el código. |
| Motivo | El motor implementa una versión anterior de las reglas (contradicción C1 de la postauditoría). |
| Fundamento / fuente | Decisiones de la autora M1 = a (fuente vigente) y M3 = mantener las etiquetas del maestro, transmitidas por la sesión "SIVU auditoría funcional" el 2026-10-18. A confirmar en la revisión del PR. |
| Archivos afectados | `docs/registro-cambios.md`, `docs/auditorias/2026-10-18-modelo-datos/` (`diferencias-motor.md`, `pendientes.md`, `README.md`), `docs/roadmap.md`, `HANDOFF.md`. |
| Impacto en diagramas | Por verificar al sincronizar (R03 con defoliación; cavidades 09 y 10). |
| Impacto en Excel metodológico | Desde CC-028, el Excel maestro del repositorio (`docs/excel/Base de Datos Valpo Verde.xlsx`) es el Excel auditado, con REGLAS_INDICADORES (98 reglas), MATRICES_CALCULO y VERSION. |
| Impacto en BD | Pendiente: `rule_version` y almacenamiento de M04, M05 y los ajustes del Inspector. |
| Impacto en backend | Pendiente: actualizar R03, etiquetas y cavidades (DM-02 a DM-04); implementar M04 y M05 (DM-06, DM-07). Sin cambios en esta ficha. |
| Impacto en API | Pendiente. |
| Impacto en frontend | Pendiente: etiquetas y resultados de infraestructura y prioridad. |
| Pruebas necesarias | En implementación: valores borde de R03 (0–2, 3–4, 5–6, 7–8) y de las clases de defoliación; cavidades con externa e interna en todas las combinaciones, incluido "Requiere evaluación instrumental"; M04 con componentes excluidos (No aplica, No determinado) y umbrales de P_I%; M05. |
| Dependencias | C1 de la postauditoría (formato de `rule_version` y publicación del paquete); CC-024; CC-026 (DM-08); CC-014 (duplicación de reglas en DICCIONARIO_CAMPOS). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-18 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-026-auditoria-modelo-datos` (PR #20). |
| Observaciones | Solo registro: no se modificaron código, Supabase ni migraciones. INDICES queda pendiente de una revisión posterior (DM-09). |

**Checklist de sincronización**

- [ ] Diagrama — por verificar.
- [x] REGLAS_INDICADORES · MATRICES_CALCULO · DICCIONARIO_CAMPOS — sincronizados en el Excel maestro (CC-028).
- [ ] VERSION · export de texto · docs/methodology/ — pendientes.
- [x] PR / ADR — N/A.
- [x] Verificación §14.9 (fuente) — AM-08, 2026-10-20.
- [ ] Migración + schema.sql — pendiente.
- [ ] Backend (services/rules) — pendiente.
- [ ] API / Zod — pendiente.
- [ ] Frontend — pendiente.
- [ ] Verificación §14.9 (implementación) — pendiente.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-18 | APROBADO METODOLÓGICAMENTE | marybaxmann | Fuente vigente definida (M1 = a; M3). Diferencias DM-01 a DM-09 registradas; implementación no autorizada. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

### CC-028 — El Excel auditado es la única fuente metodológica; se elimina el Excel anterior

| Campo | Valor |
|---|---|
| Fecha | 2026-10-18 |
| Origen | Decisión de la autora tras la incorporación del Excel auditado (AM-01 de CC-026): "Hacemos del Excel auditado la única fuente y eliminamos el anterior". |
| Tipo | 2 — metodológico (+3 modelo de datos) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | Excel maestro completo; conflictos P1–P9 de CC-026 (`docs/auditorias/2026-10-18-modelo-datos/pendientes.md`). |
| Versión anterior | Excel maestro previo (`docs/excel/Base de Datos Valpo Verde.xlsx` hasta el commit 2e775b0), con las hojas MEDICIONES_DENDROMETRICAS y VERSION y la columna `ambito` de DICCIONARIO_CAMPOS; copia auditada agregada como archivo aparte. Conflictos P1–P9 sin decidir. |
| Versión nueva | Un solo Excel maestro con nombre fijo (`docs/workflow.md` §14.10): `docs/excel/Base de Datos Valpo Verde.xlsx` contiene el Excel auditado el 2026-10-18 más la hoja VERSION (filas anteriores conservadas y fila nueva de CC-028). Se elimina la copia con fecha. El Excel auditado prevalece en P1–P9: **P1** coordenadas UTM de ingreso manual y obligatorias, con `huso` 19S y `datum` WGS84 fijos; **P2** `nombre_comun` es un campo del árbol, obligatorio para finalizar; **P3** dimensiones en ARBOLES con versiones por inspección, sin la entidad MEDICIONES_DENDROMETRICAS (la corrección y anulación lógica de una medición quedan sin regla, pendientes); **P4** `multifustal`, `numero_fustes`, `dap_fustes_cm` y la fórmula de `dap_cm` del Excel auditado, sin `configuracion_fustes`; **P5** `clase_edad` obligatoria en ARBOLES; **P6** con varias redes aéreas se registra la menor distancia, sin cambiar el umbral; **P7** el rol es global (ya resuelto, AMD-31); los identificadores internos de Inspector y Encargado de mantención se definen al implementar; **P8** DICCIONARIO_CAMPOS sin columna `ambito`; **P9** varias fotografías por árbol e inspección, sin límite fijo. |
| Motivo | Evitar dos fuentes metodológicas en el repositorio y resolver las contradicciones P1–P9 con la versión auditada. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-18, en la sesión de auditoría del modelo de datos. |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx` (reemplazado por el Excel auditado + VERSION); `docs/excel/Base de Datos SIVU AUDITADO (2026-10-18).xlsx` (eliminado); `docs/excel/readme.md`; `docs/registro-cambios.md`; `docs/roadmap.md`; `docs/methodology/00-index.md`; `docs/auditorias/2026-10-18-modelo-datos/` (`README.md`, `pendientes.md`); `HANDOFF.md`. |
| Impacto en diagramas | Ninguno en esta ficha. |
| Impacto en Excel metodológico | El Excel maestro del repositorio es el Excel auditado. El contenido anterior queda solo en el historial de git (hasta el commit 2e775b0). |
| Impacto en BD | Pendiente: la tabla `tree_measurements` (migración 006, CC-020), `ubicacion_wgs84` y `configuracion_fustes` quedan desalineadas con la fuente (AM-04). Sin cambios en esta ficha. |
| Impacto en backend | Pendiente (AM-04): ubicación UTM, `nombre_comun` en el árbol, dimensiones en el árbol con historial por inspección, `clase_edad` obligatoria, fotografías sin límite fijo. |
| Impacto en API | Pendiente (AM-04). |
| Impacto en frontend | Pendiente (AM-04): formularios de alta y medición. |
| Pruebas necesarias | En implementación: las de AM-04 y AM-06. |
| Dependencias | CC-026, CC-027; reemplaza en lo que contradigan a CC-008, CC-009, CC-020, ADR-010 v2.0, ADR-016 v1.0, PR-006 v7.0 y PR-010 v1.0. La actualización de esos textos queda pendiente (AM-07). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-18 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-026-auditoria-modelo-datos` (PR #20). |
| Observaciones | No se modificaron código, migraciones, RLS ni Supabase. Los registros históricos que nombran el Excel anterior (fichas CC previas, postauditoría, comentarios de migraciones) no se reescriben. |

**Checklist de sincronización**

- [x] Excel maestro — reemplazado por el Excel auditado, con VERSION.
- [ ] PR / ADR / `docs/methodology/` / `workflow.md` §14.12 — pendientes (AM-07).
- [ ] Migración + schema.sql — pendiente (AM-04).
- [ ] Backend — pendiente (AM-04).
- [ ] API / Zod — pendiente (AM-04).
- [ ] Frontend — pendiente (AM-04).
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |


### CC-029 — M05: prioridad No determinado cuando el riesgo es No determinado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 0 de la implementación de CC-026 a CC-028: M05 no definía el caso `clasificacion_riesgo` = No determinado (CC-024). |
| Tipo | 2 — metodológico |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | M05 (MATRICES_CALCULO AW5); `clasificacion_prioridad` (DICCIONARIO_CAMPOS fila 172, columnas H, J y L); VERSION. |
| Versión anterior | `clasificacion_prioridad` solo admitía Baja / Media / Alta / Crítica. M05 definía el caso `clasificacion_infraestructura` = No aplica (columna Bajo), pero no el de riesgo No determinado. |
| Versión nueva | Si `clasificacion_riesgo` = No determinado, `clasificacion_prioridad` = No determinado. Valores permitidos: Baja / Media / Alta / Crítica / No determinado. Mismo criterio que CC-024: "No determinado" nunca se sustituye por otra categoría. |
| Motivo | Completar M05 para que un árbol sin clasificación de riesgo no reciba una prioridad calculada. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20. |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx` (DICCIONARIO_CAMPOS H172, J172, L172; MATRICES_CALCULO AW5; VERSION E4); `docs/registro-cambios.md`; `HANDOFF.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | 5 celdas, indicadas en Archivos afectados. |
| Impacto en BD | Pendiente (AM-06): el valor No determinado debe ser admitido donde se almacene `clasificacion_prioridad`. |
| Impacto en backend | Pendiente (AM-06, DM-07): implementar M05 con este caso. |
| Impacto en API | Pendiente (AM-06). |
| Impacto en frontend | Pendiente (AM-06): mostrar la prioridad No determinado. |
| Pruebas necesarias | En implementación: M05 con riesgo No determinado e infraestructura en todas sus categorías, incluida No aplica. |
| Dependencias | CC-024, CC-027 (DM-07), CC-028. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-029-prioridad-no-determinado`. |
| Observaciones | No se modificaron código, migraciones, RLS ni Supabase. |

**Checklist de sincronización**

- [x] Excel maestro — M05, DICCIONARIO_CAMPOS y VERSION.
- [ ] Migración + schema.sql — pendiente (AM-06).
- [ ] Backend — pendiente (AM-06).
- [ ] API / Zod — pendiente (AM-06).
- [ ] Frontend — pendiente (AM-06).
- [ ] Revisión final

---

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |


### CC-030 — Publicación del paquete 2.0.0 antes de implementar; `rule_version` en cada resultado calculado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1 de la implementación de CC-026 a CC-029, decisión 1. Contradicción C1 de la postauditoría (PA-01): el motor (`treeRisk.ts`, migración 007) guarda `rule_version = borrador_reglas_diagramas_v3`, que no es una versión publicada. |
| Tipo | 2 — metodológico, gobernanza de versión (+5 documental) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | `rule_version` de todo resultado calculado; hoja VERSION; tag `metodologia-v2.0.0`; `docs/methodology/00-index.md`; diagramas de decisión. |
| Versión anterior | El formato de `rule_version` ya estaba definido (`workflow.md` §14.10: `MAJOR.MINOR` de la versión publicada), pero no había ninguna versión publicada. Se proponían tres caminos: excepción controlada, publicación de 2.0.0 o resultados provisionales. |
| Versión nueva | 1. **Se publica el paquete 2.0.0 antes de implementar** cualquier especificación del paquete. Con CC-035 desaparece la excepción operativa, así que la publicación es previa a la Fase 4 (base de datos) y no solo a la Fase 5 (motor). 2. Todo resultado calculado nuevo guarda `rule_version = "2.0"`: riesgo (R01–R04, M01–M03), infraestructura (M04) y prioridad (M05). 3. Un ajuste del Inspector (PR-008 v2.0) conserva la `rule_version` del valor calculado al que se aplica. 4. Propuesta, sin decidir: guardar también `motor_commit` (hash del código que calculó) para rastrear errores de implementación. 5. Los resultados guardados con `borrador_reglas_diagramas_v3` son datos de la demo y se descartan con ellos (CC-038); no se re-marcan como 2.0. 6. **La publicación requiere la aprobación explícita de la autora**: verificación §14.9 sobre el Excel maestro, fila de VERSION con fecha de publicación, tag de git, `00-index.md` actualizado y documentos `01–05` marcados como reemplazados (PA-19). |
| Motivo | Cerrar C1: ningún resultado puede quedar asociado a reglas de un borrador no publicado (PR-011 v2.0). |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1: "recomendaciones OK" en la decisión 1, con el matiz de los diagramas. |
| Diagramas (decisión 2026-10-20: opción B) | Los diagramas de decisión **quedan fuera del paquete 2.0.0**. El Excel maestro es la única fuente de verdad (CC-028). Más adelante los diagramas podrán actualizarse a partir del Excel, como ilustración, pero no son fuente: si un diagrama difiere del Excel, manda el Excel. Se descartó la opción A (sincronizarlos para 2.0.0), porque la mayoría no tiene archivo fuente. |
| Decisiones de AM-08 (2026-10-20) | **B:** todas las reglas de REGLAS_INDICADORES de 2.0.0 son vigentes según la fila de VERSION; PR-011 v3.0 deja de exigir `estado_regla` y `max_indicador`. **C:** los nombres `_componente` de MATRICES_CALCULO son títulos genéricos y `probabilidad_falla_impacto` es un resultado intermedio que no se guarda (`00-index.md`). **D:** AM-11 cerrado sin regla nueva: la defoliación se estima respecto de la copa de referencia de la misma especie y condición estacional (AM-10). **E:** `rango_edad_estimada_anios` opcional (CC-039). **Observaciones de la verificación final (2026-10-20):** (1) IN-RAE: la red aérea con "Función no determinada" se mantiene como estaba definida (reglas de red no eléctrica, IN-RAE-05 y 06); no cambia nada. (2) IN-RSU-05: con `afectacion_fisica_red_subterranea` = Sí y `compromete_funcionalidad_red_subterranea` = No determinado, la categoría parcial pasa de Leve (1) a **Moderada (2)**, el mínimo por el daño físico confirmado, para que no quede por debajo de IN-RSU-04 (REGLAS_INDICADORES F97 y G97; PR #29). **VERSION:** fila 5 agregada por la autora en AM-10, con estado "aprobación de publicación pendiente"; al publicar completa `fecha_publicacion`, `aprobado_por`, `fecha_aprobacion` y `tag_git`. |
| Archivos afectados | Esta ficha; PR-002 v3.0 (composición del paquete sin diagramas); `docs/workflow.md` §14.2, §14.7, §14.8 y §14.9; `docs/methodology/00-index.md`; `CLAUDE.md`. Al publicar: Excel (VERSION), `docs/methodology/00-index.md`, `docs/methodology/01–05` y tag de git. |
| Impacto en diagramas | Quedan fuera del paquete 2.0.0; se conservan en `docs/excel/diagramas/` como ilustración, sin autoridad. |
| Impacto en Excel metodológico | Al publicar: fila de VERSION con `rule_version` 2.0, estado publicado, fecha y tag. |
| Impacto en BD | Fase 3: columna `rule_version` en cada tabla de resultados calculados (y `motor_commit`, si se aprueba). |
| Impacto en backend | Fase 5: el motor declara `RULE_VERSION = "2.0"` y la guarda en cada resultado. |
| Impacto en API | Exponer `rule_version` junto a cada resultado. |
| Impacto en frontend | Mostrar con qué versión se calculó cada resultado. |
| Pruebas necesarias | Cada resultado calculado se guarda con `rule_version` 2.0; un ajuste conserva la versión del valor calculado. |
| Dependencias | CC-024 a CC-029 sincronizados en el Excel; CC-035; CC-038 (descarte de los resultados del borrador). Resuelve PA-01 y desbloquea PA-19. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann (decisión de fondo) |
| Fecha de aprobación | 2026-10-20 (decisión de fondo) |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | No se publica nada sin aprobación explícita. |

**Checklist de sincronización**

- [x] Decisión sobre los diagramas: opción B (fuera del paquete).
- [x] Verificación §14.9 del Excel maestro (AM-08, 2026-10-20: sin hallazgos automáticos; revisión manual de activaciones y cobertura).
- [x] VERSION (fila 5, PR #30), `00-index.md` y `01–05` — 2.0.0 publicada el 2026-10-20 (aprobación expresa de marybaxmann).
- [ ] Tag `metodologia-v2.0.0` sobre el commit de `main` que fusiona el PR #27.
- [ ] Migración + schema.sql (columna `rule_version`) — Fase 3/4.
- [ ] Backend, API y frontend — Fases 5 a 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | PENDIENTE DE DECISIÓN | marybaxmann | Decisión de fondo aprobada (publicar 2.0.0 antes de implementar; `rule_version` en cada resultado). Pendientes: diagramas (A/B) y autorización de la publicación. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción B: los diagramas quedan fuera del paquete 2.0.0; el Excel es la única fuente. Confirmado: la publicación de 2.0.0 es previa a la Fase 4 (AM-08). |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |
| 2026-10-20 | FUENTE SINCRONIZADA | marybaxmann | Observaciones de la verificación final: IN-RAE sin cambios; IN-RSU-05 pasa a Moderada (2) (PR #29, solo el Excel). |
| 2026-10-20 | FUENTE SINCRONIZADA | marybaxmann | Publicación de 2.0.0 aprobada expresamente: VERSION fila 5 "publicada" (2026-10-20, PR #30); `00-index.md` y `01–05` con la fecha; verificación §14.9 sin hallazgos. El tag se crea sobre el merge del PR #27. |

---

### CC-031 — Corrección y anulación de una inspección según su `estado_registro`

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisión 2. Pendiente P3 de CC-026: CC-028 eliminó MEDICIONES_DENDROMETRICAS y dejó sin regla la corrección y anulación de una medición. |
| Tipo | 3 — modelo de datos (+2) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | INSPECCION (`estado_registro`, campos nuevos de anulación); REGLAS_GENERALES ("Historial y vigencia"); vigencia de los datos técnicos (ADR-016, PR-009). |
| Versión anterior | ADR-016 v1.0 (CC-020) permitía corregir un dato de una medición con auditoría y anular lógicamente una medición. CC-028 dejó esa regla sin efecto y P3 quedó abierta. |
| Versión nueva | 1. Mientras la inspección está **Preguardado**, el Inspector la modifica libremente, incluidos los datos técnicos del árbol registrados en ella. 2. Una inspección **Finalizado** no se edita. Si contiene un error, el Inspector la **anula**: anulación lógica de la inspección completa, con motivo, autor y fecha. 3. La inspección anulada permanece en el historial con todos sus valores, pero deja de contar para la vigencia: el valor vigente pasa a ser el de la OT completada más reciente cuya inspección no esté anulada. 4. Los datos correctos se registran en una nueva inspección: **en la misma OT si todavía no está completada; si lo está, en una nueva OT**. 5. **Solo el Inspector anula.** El Usuario municipal, el Administrador y el Encargado de mantención no anulan. |
| Texto propuesto para el Excel (lo actualiza la autora) | **REGLAS_GENERALES, fila nueva** · A: `Historial y vigencia` · B: `Mientras una inspección está Preguardado, el Inspector puede modificar todos sus datos. Una inspección Finalizado no se modifica: si contiene un error, el Inspector la anula registrando motivo_anulacion. La inspección anulada se conserva en el historial y deja de considerarse para la vigencia. Los datos correctos se registran en una nueva inspección: en la misma OT si todavía no está completada; si lo está, en una nueva OT. Solo el Inspector anula inspecciones.` · C: `estado_registro; motivo_anulacion; anulado_por; fecha_anulacion` · D: `INSPECCION; ARBOLES; REGISTRO_EVALUACION; ORDENES DE TRABAJO`. **DICCIONARIO_CAMPOS, `estado_registro` (INSPECCION, fila 209), columnas que cambian:** D `Sistema / Inspector (solo la anulación)` · E `Asignación automática según la completitud de los datos obligatorios aplicables de la inspección. El valor Anulado lo registra el Inspector.` · F `Estado del registro de la inspección. Preguardado: falta al menos un dato obligatorio aplicable. Finalizado: todos los datos obligatorios aplicables están registrados. Anulado: inspección finalizada que el Inspector anuló por contener un error; se conserva en el historial y no se considera para la vigencia.` · H `Preguardado / Finalizado / Anulado` · J `Finalizado cuando están completos todos los campos obligatorios y los condicionales activados de la inspección, de su REGISTRO_EVALUACION y de los datos técnicos del árbol registrados en ella; en otro caso, Preguardado. Anulado solo desde Finalizado, cuando el Inspector registra motivo_anulacion.` · L `No editable manualmente, salvo la anulación por el Inspector. Valor inicial: Preguardado. Una inspección Preguardado o Anulado no modifica la evaluación vigente del árbol. Mientras alguna inspección vinculada esté Preguardado, la OT no puede pasar a estado_ot = Completada. Una medición pendiente no equivale a cero ni a No presenta.` **Filas nuevas en DICCIONARIO_CAMPOS (INSPECCION), las 12 columnas en orden A · B · C · D · E · F · G · H · I · J · K · L:** (1) `INSPECCION` · `motivo_anulacion` · `Manual` · `Inspector` · `Descripción libre del Inspector al anular la inspección.` · `Fundamento de la anulación de una inspección finalizada que contiene un error.` · `Texto` · `No aplica` · `Condicional` · `No aplica.` · `estado_registro = Anulado` · `Texto libre, no vacío. Solo el Inspector anula. No editable después de registrar la anulación.` (2) `INSPECCION` · `anulado_por` · `Vinculado por plataforma` · `Sistema` · `Usuario autenticado que anula la inspección.` · `Inspector que anuló la inspección.` · `Identificador (texto)` · `No aplica` · `Condicional` · `No aplica.` · `estado_registro = Anulado` · `Referencia válida a USUARIOS con rol Inspector. Conservar autoría histórica.` (3) `INSPECCION` · `fecha_anulacion` · `Sistema` · `Sistema` · `Fecha y hora asignadas por el sistema al registrar la anulación.` · `Momento en que la inspección fue anulada.` · `Fecha y hora` · `dd/mm/aaaa HH:mm` · `Condicional` · `No aplica.` · `estado_registro = Anulado` · `Igual o posterior a fecha_registro. No editable.` |
| Motivo | Mantener el historial inmutable (ADR-012) y coherente con el preguardado y con la vigencia por OT completada (CC-026). |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1: opción B; "El Usuario municipal no puede anular". |
| Archivos afectados | Esta ficha; PR-009 v4.0; ADR-016 v3.0; `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Fila nueva en REGLAS_GENERALES y cambios en DICCIONARIO_CAMPOS (texto propuesto arriba). |
| Impacto en BD | Fase 3: estado Anulado y campos de anulación en la inspección; la vigencia excluye las inspecciones anuladas. |
| Impacto en backend | Fase 6: edición solo en Preguardado; endpoint de anulación solo para el Inspector; vigencia sin anuladas. |
| Impacto en API | Endpoint de anulación con motivo obligatorio. |
| Impacto en frontend | Acción "Anular inspección" solo para el Inspector, con motivo. |
| Pruebas necesarias | Edición permitida en Preguardado y rechazada en Finalizado; anulación solo por el Inspector y con motivo; la vigencia retrocede a la OT completada anterior; los demás roles reciben 403. |
| Dependencias | CC-026, CC-028; PR-019 (rol Inspector). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | Resuelto (2026-10-20): si la OT todavía no está completada, la nueva inspección puede ir en la misma OT. |

**Checklist de sincronización**

- [x] PR-009 v4.0 y ADR-016 v3.0.
- [ ] Excel maestro (REGLAS_GENERALES y DICCIONARIO_CAMPOS) — lo actualiza la autora con el texto propuesto.
- [ ] Migración + schema.sql — Fase 3/4.
- [ ] Backend, API y frontend — Fases 6 y 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción B de la Fase 1. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Nueva inspección en la misma OT si no está completada; si lo está, en una nueva OT. Texto completo de los tres campos de anulación. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-032 — Transición del modelo físico: UTM canónica, retiro de `tree_measurements` y de las tablas de inspección de 001, identificadores de rol

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisiones 3, 4 y 5, y respuestas de la autora a la Fase 0 (2026-10-20). |
| Tipo | 3 — modelo de datos (+4) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | `trees.ubicacion`; `tree_measurements` y `fn_create_tree_with_measurement` (006); tablas `inspections`, `defect_observations`, `defect_results`, `component_assessments`, `probability_thresholds`, `vitality_assessments` y `risk_evaluations` (001); tabla `roles`; `estado_presencia` y `fecha_cambio_estado_presencia`; `origen_biogeografico`. |
| Versión anterior | ADR-010 v2.0: ubicación canónica `geography(Point,4326)`, con el CRS de captura pendiente. ADR-016 v2.0 y CC-020: mediciones en `tree_measurements`. Migración 001: modelo de inspección por defecto que nunca se usó. PR-019 y PR-020 v1.0: identificadores de rol pendientes. |
| Versión nueva | 1. **Ubicación:** las coordenadas canónicas son `utm_este` y `utm_norte` en UTM 19S (EPSG:32719, datum WGS84), de ingreso manual y obligatorio (CC-028 P1). La geometría `geography(Point,4326)` para el mapa y las consultas espaciales se **deriva** de la UTM con una transformación estándar (PostGIS `ST_Transform` 32719 → 4326) y es de solo lectura. No es regla metodológica (ADR-010 v3.0). 2. **`tree_measurements`:** se deja de escribir. Sus filas son datos de la demo y se descartan (CC-038). La tabla y `fn_create_tree_with_measurement` se retiran en una migración posterior, con autorización expresa. 3. **Dimensiones:** viven en el árbol, con una versión por inspección (CC-028 P3; ADR-016 v3.0). El diseño físico se define en la Fase 3. 4. **Inspección:** `inspections` (001) se reutiliza como INSPECCION (`estado` → `estado_registro`, más `id_ot` y los campos de CC-026). REGISTRO_EVALUACION es una fila por inspección: variables en JSONB y resultados en columnas. **Las validaciones siguen exactamente DICCIONARIO_CAMPOS** (obligatoriedad, condición de activación, dominio, unidad y rango); que el almacenamiento sea JSONB no relaja ninguna validación. Las otras seis tablas de 001 se retiran después de verificar que están vacías, en una migración aparte con autorización (PA-40). 5. **Roles:** identificadores internos `inspector` y `encargado_mantencion`. Cada usuario tiene un solo rol global (AMD-31). 6. **Valores derivados:** `estado_presencia` y `fecha_cambio_estado_presencia` no son columnas físicas de ARBOLES; se derivan de las OT completadas y de los MANTENIMIENTO aprobados (PR-020). 7. ~~**`origen_biogeografico`:** opcional en el alta municipal y obligatorio para finalizar la inspección.~~ Reemplazado por CC-039: es una característica de la especie en CATALOGO_ESPECIES. 8. **Mapa del alta como ayuda (2026-10-20):** al marcar el punto en el mapa del formulario, la plataforma convierte la posición a UTM 19S y rellena `utm_este` y `utm_norte`, que siguen siendo editables. Lo guardado son siempre las coordenadas UTM del formulario. |
| Texto propuesto para el Excel (lo actualiza la autora) | **DICCIONARIO_CAMPOS, `utm_este` (ARBOLES, fila 9):** E `Ingreso manual de la coordenada del árbol obtenida en terreno. Como ayuda, al marcar el punto en el mapa del formulario la plataforma rellena utm_este y utm_norte, que siguen siendo editables.` · L `Coordenada UTM huso 19S, datum WGS84 (EPSG:32719). Este y Norte deben ser coherentes con el huso y el datum fijos. Si proviene del punto marcado en el mapa, la plataforma la convierte a UTM y puede editarse antes de guardar.` **`utm_norte` (fila 10):** E igual que `utm_este` · L `Coordenada UTM huso 19S, datum WGS84 (EPSG:32719). Norte y Este deben ser coherentes con el huso y el datum fijos. Si proviene del punto marcado en el mapa, la plataforma la convierte a UTM y puede editarse antes de guardar.` (Se reemplaza "No fijar SRID sin verificar configuración del proyecto", que contradice el huso y el datum fijos de CC-028 P1.) |
| Motivo | Alinear la base con CC-026 y CC-028 sin mantener dos modelos de medición ni dos modelos de inspección. |
| Fundamento / fuente | Decisiones de la autora (marybaxmann), 2026-10-20 (Fase 0, respuestas 2, 3, 5 y 7; Fase 1, "recomendaciones OK" en las decisiones 3, 4 y 5, con el matiz de que las validaciones siguen exactamente DICCIONARIO_CAMPOS). |
| Archivos afectados | Esta ficha; ADR-010 v3.0; ADR-016 v3.0; PR-006 v9.0; PR-019 v1.1; PR-020 v1.1; `CLAUDE.md` (Roles); `docs/methodology/modelo-arbol-medicion.md` (nota de reemplazo). |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS, filas 9 y 10 (texto propuesto arriba). |
| Impacto en BD | Fase 3/4: columnas UTM y geometría derivada; modelo de versiones de dimensiones; adaptación de `inspections`; roles nuevos; retiro de tablas (migraciones aparte, con autorización). |
| Impacto en backend | Fase 6: alta con UTM; validación de REGISTRO_EVALUACION con DICCIONARIO_CAMPOS; roles nuevos en `authorization.service.ts`. |
| Impacto en API | Coordenadas UTM de entrada; longitud y latitud derivadas, de solo lectura, en la salida. |
| Impacto en frontend | Formulario de alta con UTM; el mapa usa la geometría derivada. |
| Pruebas necesarias | Conversión UTM → WGS84 con puntos conocidos; validaciones de REGISTRO_EVALUACION por campo, contra DICCIONARIO_CAMPOS; permisos de los cuatro roles. |
| Dependencias | CC-026, CC-028, CC-030 (publicación previa), CC-033 (RLS), CC-038 (datos). Resuelve PA-03 (identificadores y rol único) y la decisión de PA-40. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | Resuelto (2026-10-20): el punto del mapa se mantiene como ayuda para rellenar las coordenadas UTM (punto 8). |

**Checklist de sincronización**

- [x] ADR-010 v3.0, ADR-016 v3.0, PR-006 v9.0, PR-019 v1.1, PR-020 v1.1, `CLAUDE.md`.
- [ ] Diseño físico — Fase 3.
- [ ] Migraciones + schema.sql — Fase 4.
- [ ] Backend, API y frontend — Fases 6 y 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones 3, 4 y 5 de la Fase 1 y respuestas de la Fase 0. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | El mapa del alta se mantiene como ayuda que rellena las coordenadas UTM, editables. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Punto 7 reemplazado por CC-039: `origen_biogeografico` es una característica de la especie en CATALOGO_ESPECIES y ya no se registra en el alta ni en la inspección. CC-039 entra en el diseño de la Fase 3 y en las migraciones de la Fase 4. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-033 — Escrituras solo por el backend con credencial de servicio; RLS sin escritura directa

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisión 8. Postauditoría: DA-01 (principio aprobado el 2026-10-11) y PA-04 (implementación pendiente). |
| Tipo | 3 — arquitectura de datos y permisos (+4) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | ADR-014; PR-018; políticas RLS de escritura de todas las tablas de datos. |
| Versión anterior | ADR-014 v1.0 y PR-018 v2.0: el backend consulta y escribe con el JWT del usuario y las RLS permiten escribir a los roles autorizados, por lo que una escritura también puede llegar a la base sin pasar por las validaciones del backend (hallazgo S1). |
| Versión nueva | 1. **Toda escritura pasa por el backend.** Después de su autorización funcional y de las validaciones (DICCIONARIO_CAMPOS, PR por rol), el backend escribe con la credencial de servicio. 2. **Las RLS no permiten escrituras directas** a los roles de sesión (`authenticated`, `anon`) en las tablas de datos. 3. **Las lecturas mantienen ADR-014:** el backend lee con el JWT del usuario y las RLS filtran por proyecto y rol (dos capas). 4. **Autor explícito:** el backend registra quién crea o modifica cada fila con el usuario autenticado, sin depender de valores por defecto de la sesión. 5. **La credencial de servicio nunca llega al frontend ni queda en el repositorio:** vive solo en las variables de entorno del servidor; no aparece en el código, en `.env.example`, en registros ni en respuestas de la API. 6. El formulario ciudadano (PR-022) es un endpoint público del backend que escribe con la misma credencial, después de validar y limitar las solicitudes. |
| Motivo | Cerrar S1: que ninguna escritura evite las validaciones y la autorización del backend. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1: "recomendaciones OK" en la decisión 8, con el matiz de que la credencial nunca llega al frontend ni queda en el repositorio. |
| Archivos afectados | Esta ficha; ADR-014 v2.0; PR-018 v3.0. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Fase 3/4: políticas RLS de escritura reemplazadas por denegación a los roles de sesión; se mantienen las de lectura. |
| Impacto en backend | Fase 6: cliente de escritura con la credencial de servicio, usado solo después de la autorización; autor explícito. |
| Impacto en API | Ninguno visible. |
| Impacto en frontend | Ninguno: el frontend ya no escribe en Supabase. |
| Pruebas necesarias | Escenarios W1–W12 (`escenarios-rls.md`) en un entorno aislado (PA-13, PA-14): ninguna escritura directa con una sesión de usuario prospera; las lecturas siguen filtradas por proyecto. Búsqueda en el repositorio y en el paquete del frontend que confirme que la credencial no aparece. |
| Dependencias | PA-13 (entorno de pruebas aislado). Resuelve PA-04; desbloquea PA-20, PA-25, PA-26 y PA-35. |
| rule_version | no aplica |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | El repositorio es público: esta ficha describe el tipo de protección, no escenarios de explotación. |

**Checklist de sincronización**

- [x] ADR-014 v2.0 y PR-018 v3.0.
- [ ] RLS y migración — Fase 3/4.
- [ ] Backend — Fase 6.
- [ ] Pruebas W1–W12 en entorno aislado.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción A de la decisión 8 de la Fase 1. |

---

### CC-034 — Códigos de catálogo definidos en el backend, sin tabla de códigos en LISTAS

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 0, contradicción 1: el Excel auditado no tiene la tabla de códigos de LISTAS (columnas P:X, CC-004). Fase 1, decisión 7. La autora no tiene ni quiere esa tabla en el Excel. |
| Tipo | 5 — documental (+4) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | Códigos persistentes de todos los catálogos; `docs/methodology/convenciones-catalogos.md` (CC-004); `workflow.md` §14.2 y §14.9 (catálogos); `src/services/rules/moduleCatalogs.ts`. |
| Versión anterior | CC-004: LISTAS (P:X) era la fuente de `id_catalogo`, `codigo`, `etiqueta`, `orden`, jerarquía, `estado_valor` y `cc`; DICCIONARIO_CAMPOS la referenciaba con `LISTAS:<id_catalogo>`. |
| Versión nueva | PR-021 v1.0. 1. El Excel (DICCIONARIO_CAMPOS, "Unidad / valores", y los menús de LISTAS) define los valores permitidos y sus etiquetas. 2. El backend define el **código persistente** de cada valor en un único registro de catálogos, que reemplaza a `moduleCatalogs.ts`. 3. **Los códigos ya guardados en la base no cambian.** 4. Un test automático compara las etiquetas del registro con el Excel del repositorio y falla si difieren; el sistema nunca lee el Excel mientras funciona. 5. El frontend obtiene los catálogos desde la API. |
| Motivo | Mantener códigos estables sin depender de una tabla que el Excel ya no tiene. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20: Fase 1, "recomendaciones OK" en la decisión 7; "no existe ni se restaurará una tabla de códigos en el Excel". |
| Archivos afectados | Esta ficha; PR-021 v1.0; PR-002 v3.0; `docs/methodology/convenciones-catalogos.md` (nota de reemplazo); `docs/workflow.md` §14.2 y §14.9. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno: LISTAS queda como hoja de menús (AMD-30). |
| Impacto en BD | Fase 3: validación de los códigos (CHECK o clave foránea). |
| Impacto en backend | Fase 6: registro de catálogos y test de consistencia con el Excel. |
| Impacto en API | Endpoint de catálogos con código y etiqueta. |
| Impacto en frontend | Los catálogos se leen desde la API; no se escriben en el código. |
| Pruebas necesarias | Test de consistencia de etiquetas con el Excel; los códigos existentes se conservan. |
| Dependencias | CC-004 (lo reemplaza en lo relativo a códigos), CC-028. ADR-015 cita `convenciones-catalogos.md` como mecanismo de códigos: la referencia se entiende hecha a PR-021. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | — |

**Checklist de sincronización**

- [x] PR-021 v1.0, PR-002 v3.0, `convenciones-catalogos.md`, `workflow.md`.
- [ ] Backend (registro y test) — Fase 6.
- [ ] Frontend — Fase 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción A de la decisión 7 de la Fase 1. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-035 — Eliminación del ámbito operativo / metodológico de los campos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisión 6. CC-028 (P8) eliminó la columna `ambito` de DICCIONARIO_CAMPOS; sin ella, la regla 1 de §14.12 trataba todo campo como metodológico. |
| Tipo | 5 — documental (gobernanza) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | `docs/workflow.md` §14.4, §14.7, §14.9, §14.10 y §14.12; PR-002; `docs/methodology/00-index.md` (punto 8). |
| Versión anterior | CC-008: DICCIONARIO_CAMPOS registraba el ámbito de cada campo y las especificaciones operativas podían implementarse desde `FUENTE SINCRONIZADA`, sin esperar la publicación del paquete. |
| Versión nueva | Se elimina la distinción y su excepción. Toda implementación de una especificación del paquete requiere una versión publicada (CC-030). §14.12 queda marcada como reemplazada; su texto se conserva como historial. |
| Motivo | La columna ya no existe (CC-028) y CC-030 publica 2.0.0 antes de implementar, así que la excepción no tiene uso. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1: "recomendaciones OK" en la decisión 6 (opción A). |
| Archivos afectados | Esta ficha; `docs/workflow.md`; PR-002 v3.0; `docs/methodology/00-index.md`; ADR-016 v3.0. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno (la columna ya no está). |
| Impacto en BD | Ninguno. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | N/A (documental). |
| Dependencias | CC-008 (lo reemplaza), CC-028, CC-030. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | Consecuencia: la Fase 4 (base de datos) también espera la publicación de 2.0.0, no solo la Fase 5. |

**Checklist de sincronización**

- [x] `workflow.md`, PR-002 v3.0, `00-index.md`, ADR-016 v3.0.
- [ ] Revisión final (merge del PR) → `CERRADO` (sin implementación).

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Opción A de la decisión 6 de la Fase 1. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-036 — Incidencias ciudadanas por QR: formulario público, visibilidad y conservación del nombre y el RUT

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisión 9. El Excel exige nombre y RUT del reportante (AMD-34) sin definir si existe una cuenta ciudadana, quién ve el RUT ni cuánto tiempo se conserva. |
| Tipo | 3 — modelo de datos y permisos (+4) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | INCIDENCIA: `rut_reportante`, `nombre_reportante`, `evidencia_fotografica`, `resultado_revision`; endpoint público; RLS de `incidents`. |
| Versión anterior | AMD-34 / P10–P11: toda incidencia entra por el QR del árbol; nombre y RUT obligatorios; al menos una fotografía. Sin regla de cuenta, visibilidad ni conservación. |
| Versión nueva | PR-022 v1.0. 1. **Formulario público sin cuenta**, al que se accede por el QR del árbol, con nombre, RUT, tipo, descripción y al menos una fotografía. 2. **Límite de solicitudes** y **validación del dígito verificador** del RUT. 3. **El nombre y el RUT solo los ve el Usuario municipal** miembro del proyecto: ni el Administrador ni los demás roles. 4. **El nombre y el RUT se eliminan** cuando la incidencia queda Validada o Descartada (`resultado_revision`). 5. **Con "Requiere antecedentes", el nombre y el RUT se conservan** hasta la resolución final (Validada o Descartada). 6. **No se agrega ningún dato de contacto.** "Requiere antecedentes" no significa pedirle información al reportante: significa que el Inspector va a terreno a confirmar el estado del árbol (ver "Registro de Requiere antecedentes"). |
| Registro de Requiere antecedentes (con el modelo existente, sin campos nuevos) | 1. El Usuario municipal registra `resultado_revision` = Requiere antecedentes (con `fecha_revision`, `revisado_por` y, si quiere, `observaciones_revision`). 2. Crea una OT con `Tipo_ot` = Inspección, `ID_Árbol` = el árbol del QR e `id_incidencia` = la incidencia (campo Condicional "cuando la orden de trabajo se origina en una incidencia"). La `Accion_solicitada` la elige el Usuario municipal entre las de Inspección; no se fija una para este caso (decisión de la autora, 2026-10-20). 3. El Inspector realiza la inspección y la OT se completa según PR-009. 4. Con ese resultado, el Usuario municipal registra `resultado_revision` = Validada (con `prioridad_municipal`) o Descartada; en ese momento se eliminan el nombre y el RUT. 5. Si la incidencia validada requiere mantenimiento, la OT de Mantenimiento también se vincula con `id_incidencia`. Trazabilidad: el resultado intermedio queda reemplazado por el final, pero la OT vinculada por `id_incidencia` conserva el antecedente; el historial de cambios de estado es PA-27. |
| Texto propuesto para el Excel (lo actualiza la autora) | **DICCIONARIO_CAMPOS, `rut_reportante` (fila 179):** E `Mediante el ingreso del RUT de la persona que comunica la incidencia en el formulario ciudadano público, al que se accede por el código QR del árbol.` · F `Identificador tributario de la persona natural que reporta. Es un dato personal: solo lo ve el Usuario municipal y se conserva únicamente mientras se revisa la incidencia.` · I `Obligatorio al reportar` · L `Validar estructura y dígito verificador del RUT. Visible solo para el Usuario municipal. Se elimina junto con nombre_reportante cuando resultado_revision = Validada o Descartada; con Requiere antecedentes se conserva hasta el resultado final.` **`nombre_reportante` (fila 178):** E `Mediante el ingreso del nombre de la persona que comunica la incidencia en el formulario ciudadano público, al que se accede por el código QR del árbol.` · F `Nombre de la persona natural que informa una situación relacionada con el arbolado urbano o su interacción con la infraestructura. Es un dato personal: solo lo ve el Usuario municipal y se conserva únicamente mientras se revisa la incidencia.` · I `Obligatorio al reportar` · L `Aceptar caracteres alfabéticos, espacios y tildes. Limitar a 100 caracteres. Visible solo para el Usuario municipal. Se elimina junto con rut_reportante cuando resultado_revision = Validada o Descartada; con Requiere antecedentes se conserva hasta el resultado final.` **`resultado_revision` (fila 187):** F `Resultado administrativo de la verificación municipal del reporte. Validada: el reporte requiere atención. Descartada: no corresponde atenderlo. Requiere antecedentes: la información disponible no basta para decidir y es necesario que el Inspector confirme en terreno el estado del árbol; no implica pedir información al reportante.` · L `Debe utilizar valores de un catálogo controlado. Requiere antecedentes es un resultado intermedio: el Usuario municipal crea una OT de Inspección del árbol vinculada mediante id_incidencia y, con el resultado de esa inspección, registra Validada o Descartada. Al registrar Validada o Descartada se eliminan nombre_reportante y rut_reportante.` |
| Motivo | Proteger un dato personal: minimizar quién lo ve y cuánto tiempo se guarda. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1, decisión 9. |
| Archivos afectados | Esta ficha; PR-022 v1.0; PR-010 v3.0; PR-018 v3.0 (endpoint público). |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS, filas 178, 179 y 187 (texto propuesto arriba). |
| Impacto en BD | Fase 3: el RUT en una tabla o columna que solo puede leer el Usuario municipal; eliminación al cerrar la revisión; `tree_id` obligatorio. |
| Impacto en backend | Fase 6: endpoint público con límite de solicitudes, validación del RUT y de las fotografías; eliminación del RUT al registrar Validada o Descartada. |
| Impacto en API | Endpoint público de incidencias; el RUT solo aparece en las respuestas al Usuario municipal. |
| Impacto en frontend | Página pública del QR; vista del RUT solo para el Usuario municipal. |
| Pruebas necesarias | RUT con dígito verificador inválido rechazado; límite de solicitudes; el Administrador, el Inspector y el Encargado no reciben el nombre ni el RUT; el nombre y el RUT se eliminan con Validada y con Descartada y se conservan con Requiere antecedentes; una OT de Inspección vinculada por `id_incidencia` queda asociada a la incidencia. |
| Dependencias | CC-026 (AMD-34), CC-033. |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | Resuelto (2026-10-20): el nombre se elimina junto con el RUT; no se agrega un dato de contacto; "Requiere antecedentes" se resuelve con una OT de Inspección vinculada. El nombre, igual que el RUT, solo lo ve el Usuario municipal. |

**Checklist de sincronización**

- [x] PR-022 v1.0, PR-010 v3.0, PR-018 v3.0.
- [ ] Excel (filas 178, 179 y 187) — lo actualiza la autora.
- [ ] Migración + RLS — Fase 3/4.
- [ ] Backend, API y frontend — Fases 6 y 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | PENDIENTE DE DECISIÓN | marybaxmann | Puntos 1 a 4 aprobados; el punto 5 queda por confirmar. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | El nombre se elimina junto con el RUT; con Requiere antecedentes ambos se conservan hasta el resultado final; sin dato de contacto: Requiere antecedentes se resuelve con una OT de Inspección vinculada por `id_incidencia`. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | El nombre del reportante también lo ve solo el Usuario municipal; la `Accion_solicitada` de la OT por Requiere antecedentes la elige el Usuario municipal (no se fija). |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-037 — Recordatorio de próxima inspección y monitoreo en lugar de agenda automática

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, decisión 10. AMD-38 y REGLAS_GENERALES ("Reinspección y monitoreo") decían que la fecha "se envía al calendario del módulo para agendarla", pero no existía ese calendario ni la fuente lo definía. |
| Tipo | 3 — comportamiento funcional (+5) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | REGLAS_GENERALES (fila 25); DICCIONARIO_CAMPOS `fecha_proxima_inspeccion` y `fecha_proximo_monitoreo` (filas 202 y 203, columna L); AMD-38; PR-009. |
| Versión anterior | "Al llegar el inicio de cada rango, la fecha se envía al calendario del módulo para agendarla." |
| Versión nueva | SIVU **no agenda automáticamente**. Cuando llega el inicio del rango sugerido, **avisa**: la fecha aparece como recordatorio en una **lista de próximas inspecciones y monitoreos por proyecto**, con el inicio y el término del rango, y desde esa lista el Usuario municipal crea y programa la OT. El término del rango se obtiene de la misma tabla de plazos; cuando el plazo es un solo valor (por ejemplo, Bajo 24 meses), inicio y término coinciden, y "inmediato y continuo" no tiene término. |
| Texto propuesto para el Excel (lo actualiza la autora) | **REGLAS_GENERALES, fila 25, columna B:** `SIVU sugiere, según nivel_riesgo, el rango de la próxima inspección técnica y del próximo monitoreo: Bajo 24 meses y 12 meses; Moderado 12 meses y 3 a 6 meses; Alto 1 a 3 meses y 2 a 4 semanas; Extremo reevaluación dentro de 1 a 4 semanas y monitoreo inmediato y continuo mientras persista el peligro. SIVU no agenda automáticamente: al llegar el inicio de cada rango, muestra un recordatorio en la lista de próximas inspecciones y monitoreos del proyecto, con el inicio y el término del rango, desde la cual el Usuario municipal crea y programa la OT. El Inspector puede ajustar la fecha registrando justificacion_ajuste_fecha.` **DICCIONARIO_CAMPOS, fila 202, columna L:** `Posterior a fecha_inspeccion. Mostrar el rango sugerido. Al llegar la fecha de inicio, SIVU la muestra como recordatorio en la lista de próximas inspecciones del proyecto, desde la cual el Usuario municipal crea y programa la OT; SIVU no agenda automáticamente. Si el Inspector la modifica, exigir justificacion_ajuste_fecha.` **Fila 203, columna L:** `Igual o posterior a fecha_inspeccion. Mostrar el rango sugerido. Al llegar la fecha de inicio, SIVU la muestra como recordatorio en la lista de próximos monitoreos del proyecto, desde la cual el Usuario municipal crea y programa la OT; SIVU no agenda automáticamente. Si el Inspector la modifica, exigir justificacion_ajuste_fecha.` |
| Motivo | La agenda la decide el municipio; SIVU solo recuerda. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1, decisión 10. |
| Archivos afectados | Esta ficha; PR-009 v4.0; `docs/auditorias/2026-10-18-modelo-datos/decisiones.md` (nota en AMD-38). |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | REGLAS_GENERALES B25; DICCIONARIO_CAMPOS L202 y L203 (texto propuesto arriba). |
| Impacto en BD | Ninguno adicional: se usan `fecha_proxima_inspeccion` y `fecha_proximo_monitoreo` (la fecha ajustada, si existe). |
| Impacto en backend | Fase 6: consulta de próximas inspecciones y monitoreos por proyecto, con su rango. |
| Impacto en API | Endpoint de la lista por proyecto. |
| Impacto en frontend | Fase 7: lista con recordatorio y acción "Crear OT". |
| Pruebas necesarias | Rango correcto por nivel de riesgo; la fecha ajustada reemplaza a la sugerida; el recordatorio aparece desde el inicio del rango. |
| Dependencias | CC-026 (AMD-38). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | — |

**Checklist de sincronización**

- [x] PR-009 v4.0; nota en AMD-38.
- [ ] Excel (B25, L202, L203) — lo actualiza la autora.
- [ ] Backend, API y frontend — Fases 6 y 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisión 10 de la Fase 1. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

---

### CC-038 — Datos simulados fuera de la base de producción: producción nueva y vacía; seed solo para desarrollo

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 1, respuesta 0 de la autora: los datos de la demo son simulados, se descartan y la base de producción debe quedar sin ellos. |
| Tipo | 4 — operación de datos |
| Estado | APROBADO METODOLÓGICAMENTE (técnicamente; tipo 4) |
| Regla / campo afectado | Datos de las tablas `trees`, `tree_measurements`, `tree_risk_assessments`, `tree_infrastructure_assessments`, `maintenance`, `incidents` y relacionadas. |
| Hallazgo | **Las migraciones 008 y 009 no cargan datos.** Solo contienen estructura: la tabla `tree_infrastructure_assessments`, columnas y RLS de `maintenance` (008) y secuencias de códigos `OT-M-` e `INC-` (009). El código vigente las necesita y no hay nada que sacar de ellas. Los datos simulados entraron de dos formas, ninguna en el repositorio: (a) los árboles sintéticos A-000015 a A-000018 (`lugar_referencia LIKE 'Caso de demostración%'`), con sus mediciones y evaluaciones, cargados el 2026-10-06 con un script temporal; (b) registros creados desde la aplicación durante la demo (OT, incidencias, evaluaciones). **A-000013 y A-000014 no son simulados:** son el levantamiento histórico del 10-08-2026 (A004 y A005, `legacy_id`). |
| Entornos (respuesta de la autora, 2026-10-20) | **No existe todavía una base de producción.** `valpo-verde-conecta` (`ytcxswbulsmboucardxa`) es el entorno de desarrollo y pruebas (ADR-013), aunque el panel de Supabase lo muestre como `main / PRODUCTION`; ahí están todos los datos actuales. `valpo-verde-conecta-pruebas` (`gmlbmyreoxgoqrolhyxo`) está inactivo (PA-13). La autora decidió que, por ahora, solo existe el entorno de prueba y que la producción se crea más adelante. |
| Decisión | 1. **No se conserva ningún dato actual:** todo es simulado, incluidos A-000013 y A-000014 y los proyectos y usuarios creados para la demo (aclaración de la autora, 2026-10-20). 2. **No existe todavía una base de producción.** Las bases de Supabase actuales son solo de prueba. La de producción se creará cuando la plataforma esté lista, como un proyecto nuevo y vacío, solo con las migraciones validadas (ADR-013): nace sin datos simulados. 3. **La limpieza aplica solo a las bases de prueba** (`valpo-verde-conecta` y, si se reactiva, `valpo-verde-conecta-pruebas`): primero un inventario de solo lectura, después un script explícito (transacción, orden de claves foráneas, conteos antes y después), y se ejecuta solo con autorización expresa. Conviene hacerla antes de las migraciones de la Fase 4. 4. **Seed solo para desarrollo** en `database/seeds/dev/`, fuera de `database/migrations/`, con datos ficticios marcados como tales y un script que se niega a ejecutarse fuera de las bases de prueba. **No se borra nada sin autorización.** |
| Motivo | La base de producción no debe contener datos simulados. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20, Fase 1, respuesta 0. |
| Archivos afectados | Esta ficha. En la implementación: `database/seeds/dev/` y el script de limpieza. |
| Impacto en diagramas | Ninguno. |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Ninguno ahora. La producción futura se crea solo con migraciones. |
| Impacto en backend | Ninguno. |
| Impacto en API | Ninguno. |
| Impacto en frontend | Ninguno. |
| Pruebas necesarias | Conteos antes y después; cero filas huérfanas; los datos reales intactos. |
| Dependencias | CC-030 (descarte de los resultados del borrador), CC-032; PA-13 (entorno de desarrollo). |
| rule_version | no aplica |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase2-am07-decisiones`. |
| Observaciones | `HANDOFF.md` (2026-10-06) había registrado A-000013 y A-000014 como levantamiento histórico; la autora aclara que también son simulados. |

**Checklist de sincronización**

- [x] Decisión sobre los entornos.
- [ ] Inventario de solo lectura de las bases de prueba.
- [ ] Limpieza de las bases de prueba (con autorización).
- [ ] Seed de desarrollo — Fase 4.
- [ ] Creación de la base de producción (ADR-013 v2.0) — más adelante.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | PENDIENTE DE DECISIÓN | — | Plan propuesto; las migraciones 008 y 009 no contienen datos. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | No existe producción todavía; se creará más adelante, vacía. Ahora no se borra nada. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Todo es simulado, incluidos A-000013/14, proyectos y usuarios de la demo; la limpieza aplica solo a las bases de prueba, con autorización. |

### CC-039 — Catálogo botánico en CATALOGO_ESPECIES y edad estimada del árbol

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Solicitud de la autora: automatizar las características botánicas mediante `especie_cientifica`, sin ingresarlas por ejemplar, y registrar la edad cronológica estimada del árbol. |
| Tipo | 2 — metodológico (+3 modelo de datos) |
| Estado | FUENTE SINCRONIZADA (paquete 2.0.0 publicado el 2026-10-20) |
| Regla / campo afectado | ARBOLES: `rango_edad_estimada_anios` (nuevo) y `origen_biogeografico` (eliminado). CATALOGO_ESPECIES: `origen_biogeografico`, `persistencia_follaje` y `tipo_hoja` (nuevos). INDICES: proporción de árboles nativos e introducidos. REGLAS_GENERALES: rol del Usuario municipal. |
| Versión anterior | `origen_biogeografico` era un campo de ARBOLES, ingresado por ejemplar y opcional para el Usuario municipal en el alta (AMD-41). El catálogo solo tenía `especie_cientifica`, `genero` y `familia`. No existía la edad cronológica estimada. |
| Versión nueva | 1. **`rango_edad_estimada_anios`** (ARBOLES): intervalo de edad cronológica estimada, en tramos de 5 años desde 0–5 hasta 96–100 y "Más de 100 años", sin declarar incertidumbre. Lo estima el Inspector en la inspección de Evaluación inicial o de Levantamiento; Obligatorio (pendiente de validar su factibilidad). No se deriva de `clase_edad` ni únicamente del DAP. No hay IA integrada a la plataforma. 2. **`persistencia_follaje`** (CATALOGO_ESPECIES): Perennifolia / Caducifolia / Semicaducifolia, comportamiento habitual de la especie en el clima de Valparaíso. 3. **`tipo_hoja`** (CATALOGO_ESPECIES): Latifoliada / Acicular / Escuamiforme / Palmera, sin categoría "Otra"; se asigna la más cercana. 4. **`origen_biogeografico`** pasa de ARBOLES a CATALOGO_ESPECIES: se registra una vez por especie, con categorías excluyentes (Nativa = nativa no endémica). 5. Las tres características se recuperan por `especie_cientifica`, no se duplican en ARBOLES y no se muestran si el árbol no tiene especie vigente (origen: "Origen no determinado"). Reemplaza a AMD-41 en lo relativo a `origen_biogeografico`. |
| Motivo | Registrar las características de la especie una sola vez, evitar el ingreso por ejemplar y disponer de las entradas que requieren los índices de transpiración, emisiones biogénicas y energía. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20. Fuentes de consulta: Rodríguez et al. (2018), Catálogo de las plantas vasculares de Chile, Gayana Botánica 75(1); Baldini, Árboles urbanos de Chile (CONAF); Nowak (2024), Understanding i-Tree (GTR NRS-200-2023). No se exige fuente por especie (acuerdo vigente). |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx`; `docs/registro-cambios.md`; `docs/roadmap.md`; `HANDOFF.md`. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS: se elimina la fila de `ARBOLES.origen_biogeografico`; filas nuevas de `rango_edad_estimada_anios` (tras `clase_edad`) y de `origen_biogeografico`, `persistencia_follaje` y `tipo_hoja` (tras `familia`). Cabeceras de ARBOLES y CATALOGO_ESPECIES; validación de `clase_edad` desplazada a la columna X. INDICES D9, D10, F9, F10; REGLAS_GENERALES B16, C16; VERSION E4. |
| Impacto en BD | Pendiente (AM-04): columnas nuevas en el catálogo de especies y en el árbol. `origen_biogeografico` no existía en la base. |
| Impacto en backend | Pendiente (AM-04): validación de los catálogos nuevos y recuperación por especie. |
| Impacto en API | Pendiente (AM-04). |
| Impacto en frontend | Pendiente (AM-04): mostrar las características en la ficha del árbol sin pedirlas en el alta; campo de edad estimada en la inspección. |
| Pruebas necesarias | En implementación: características vacías cuando el árbol no tiene especie; proporción de nativos e introducidos con origen tomado del catálogo. |
| Dependencias | CC-026 (AMD-41), CC-028, AM-08 (2.0.0). |
| rule_version | 2.0 (paquete 2.0.0, publicado el 2026-10-20, tag `metodologia-v2.0.0`) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-039-catalogo-botanico`. |
| Observaciones | **Decisiones del 2026-10-20:** (1) `rango_edad_estimada_anios` es **Opcional** mientras no se valide su factibilidad y no se exige para finalizar una inspección (la autora corrige el Excel en AM-10). (2) Los índices de proporción de árboles nativos e introducidos (INDICES, filas 9 y 10) **no se adoptan en la 2.0.0**: INDICES sigue pendiente de revisión (DM-09). (3) **AM-11 cerrado sin regla nueva:** DICCIONARIO_CAMPOS define `defoliacion_estimada_pct` "respecto de una copa de referencia de la misma especie y condición estacional"; en una caducifolia evaluada en receso la referencia es la copa sin hojas, así que la pérdida estacional no cuenta como defoliación (0 %). La autora lo deja explícito en el Excel en AM-10. (4) CC-039 entra en el diseño de la Fase 3 y en las migraciones de la Fase 4; antes de la Fase 4 son obligatorios el respaldo de la base y la prueba de restauración. No se modificaron código, migraciones, RLS ni Supabase. |

**Checklist de sincronización**

- [x] Excel maestro — DICCIONARIO_CAMPOS, cabeceras, INDICES, REGLAS_GENERALES y VERSION.
- [x] PR / ADR — PR-003 v8.0, PR-006 v10.0, PR-019 v1.2, ADR-016 v4.0; nota en CC-032 (punto 7).
- [ ] Excel: `rango_edad_estimada_anios` como Opcional y referencia estacional de `defoliacion_estimada_pct` — los aplica la autora en AM-10.
- [ ] Migración + schema.sql — pendiente (AM-04).
- [ ] Backend — pendiente (AM-04).
- [ ] API / Zod — pendiente (AM-04).
- [ ] Frontend — pendiente (AM-04).
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial (Valen-j211, PR #25). |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Sincronización documental (PR-003 v8.0, PR-006 v10.0, PR-019 v1.2, ADR-016 v4.0). Edad estimada Opcional; PN y PI no se adoptan en 2.0.0; AM-11 cerrado con la referencia estacional de `defoliacion_estimada_pct`. |
| 2026-10-20 | FUENTE SINCRONIZADA | — | Incluido en el paquete 2.0.0 (VERSION, fila 5). Verificación §14.9 sin hallazgos sobre el Excel de `main` con AM-10 (AM-08). Publicación y tag pendientes de la aprobación de la autora. |

### CC-040 — Alcance de la evaluación según el tipo de inspección y vigencia por dato

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 3, respuesta 3 de la autora al diseño (PR #31). D-209 exigía la evaluación completa para finalizar cualquier inspección. |
| Tipo | 2 — metodológico (+3 modelo de datos) |
| Estado | FUENTE SINCRONIZADA (paquete 2.1.0 publicado el 2026-10-21) |
| Regla / campo afectado | REGLAS_GENERALES (fila nueva); DICCIONARIO_CAMPOS D-209 (`estado_registro`); vigencia de los datos técnicos y de la evaluación. |
| Versión anterior | Toda inspección exigía la evaluación completa (D-209). La vigencia se definía por OT completa. |
| Versión nueva | 1. **Evaluación inicial, Reevaluación y Levantamiento:** evaluación completa (D-209). 2. **Evaluación instrumental:** solo los campos de cavidad basal y de tronco (D-39 a D-49 y D-51 a D-61). 3. **Monitoreo:** solo los campos de su subtipo (Fitosanitario, Estructural o Vitalidad). 4. En una inspección parcial, los campos registrados reemplazan el valor vigente del árbol; los demás conservan su valor vigente anterior. El historial no se sobrescribe: cada valor queda en la inspección que lo registró. 5. La Evaluación instrumental resuelve el "No determinado" de "Requiere evaluación instrumental", y el riesgo se recalcula con los valores vigentes resultantes. 6. **La evaluación vigente se compone campo por campo:** para cada campo, el último valor entre las inspecciones no anuladas de OT completadas; con esa composición se recalculan las clasificaciones al completarse cada OT o al anularse una inspección. 7. **Fotografías:** las cuatro vistas (árbol completo, base, tronco y copa) son parte de los datos dendrométricos del árbol (`fotografias_arbol`, D-27) y se exigen solo en Evaluación inicial, Reevaluación y Levantamiento. La Evaluación instrumental no considera fotografías; en el Monitoreo no son obligatorias. |
| Texto propuesto para el Excel (lo actualiza la autora) | **REGLAS_GENERALES, fila nueva** · A: `Preguardado y finalización` · B: `La evaluación que se exige para finalizar depende de tipo_inspeccion_realizada. Evaluación inicial, Reevaluación y Levantamiento: evaluación completa (todos los campos Obligatorios y los Condicionales activados de ARBOLES y REGISTRO_EVALUACION). Evaluación instrumental: solo los campos de cavidad basal y de tronco; resuelve el No determinado de Requiere evaluación instrumental. Monitoreo: solo los campos de su subtipo (Fitosanitario, Estructural o Vitalidad). En una inspección parcial, los campos registrados reemplazan el valor vigente del árbol al completar la OT; los demás conservan su valor vigente anterior. El historial no se sobrescribe: cada valor queda vinculado a la inspección que lo registró. Las clasificaciones se calculan con los valores vigentes resultantes: para cada campo, el último valor entre las inspecciones no anuladas de OT completadas. Las cuatro vistas fotográficas del árbol se exigen solo en Evaluación inicial, Reevaluación y Levantamiento; la Evaluación instrumental no considera fotografías y en el Monitoreo no son obligatorias.` · C: `tipo_inspeccion_realizada; subtipo_inspeccion; estado_registro; fotografias_arbol; campos de cavidad; campos de cada subtipo de Monitoreo` · D: `INSPECCION; REGISTRO_EVALUACION; ARBOLES`. **DICCIONARIO_CAMPOS, D-209 (`estado_registro`), columna J:** `Finalizado cuando están completos todos los campos obligatorios y los condicionales activados que exige el tipo de inspección (REGLAS_GENERALES, Preguardado y finalización): evaluación completa en Evaluación inicial, Reevaluación y Levantamiento; campos de cavidad en Evaluación instrumental; campos de su subtipo en Monitoreo. En otro caso, Preguardado. Anulado solo desde Finalizado, cuando el Inspector registra motivo_anulacion.` · **columna L:** `No editable manualmente, salvo la anulación por el Inspector. Valor inicial: Preguardado. Una inspección Preguardado o Anulado no modifica la evaluación vigente del árbol. Una inspección parcial solo reemplaza los valores vigentes de los campos que registra. Mientras alguna inspección vinculada esté Preguardado, la OT no puede pasar a estado_ot = Completada. Una medición pendiente no equivale a cero ni a No presenta.` **DICCIONARIO_CAMPOS, D-27 (`fotografias_arbol`):** columna I `Obligatorio para finalizar la Evaluación inicial, la Reevaluación y el Levantamiento` · columna K `En la inspección de Evaluación inicial, Reevaluación o Levantamiento mediante OT. No aplica en la Evaluación instrumental; en el Monitoreo no es obligatoria.` |
| Decisiones de la autora (2026-10-20) | (a) **Campos por subtipo de Monitoreo:** *Fitosanitario* = `defoliacion_estimada_pct` (D-83), `clorosis_pct` (D-84), `necrosis_pct` (D-85), `muerte_regresiva_copa_pct` (D-89) y `presenta_exudaciones` (D-65); *Estructural* = las entradas de R01, R02 y R03 (D-33 a D-82 y D-86); *Vitalidad* = `clasificacion_vitalidad` (D-169). (b) **En la Evaluación instrumental**, `cavidad_basal_interna` y `cavidad_interna_tronco` solo admiten Sí o No (nunca "Requiere evaluación instrumental"). (c) **Si falta un valor vigente** que una clasificación necesita, esa clasificación queda No determinado (criterio de CC-024); la prioridad sigue CC-029. (d) **Ajustes en la evaluación vigente recalculada:** el ajuste del Inspector se mantiene solo si el valor recalculado coincide con el valor calculado sobre el que se hizo el ajuste; si no coincide, el ajuste se descarta y queda una marca de revisión para el Inspector. |
| Texto adicional propuesto para el Excel (lo carga la sesión de auditoría en un PR aparte) | **REGLAS_GENERALES, fila nueva de CC-040, columna B, agregar al final:** `Campos por subtipo de Monitoreo: Fitosanitario = defoliacion_estimada_pct, clorosis_pct, necrosis_pct, muerte_regresiva_copa_pct y presenta_exudaciones; Estructural = las entradas de R01, R02 y R03; Vitalidad = clasificacion_vitalidad. En la Evaluación instrumental, cavidad_basal_interna y cavidad_interna_tronco solo admiten Sí o No. Si falta un valor vigente que una clasificación necesita, esa clasificación queda No determinado. Si al recalcular la evaluación vigente el valor calculado cambia, el ajuste del Inspector se descarta y queda marcado para su revisión.` |
| Motivo | Una evaluación instrumental o un monitoreo no repiten toda la evaluación del árbol. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20. |
| Archivos afectados | Esta ficha; PR-006 v11.0; PR-009 v5.0; PR-010 v4.0; ADR-016 v5.0; `docs/diseno/fase3-modelo-datos-2.0.0.md`. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | REGLAS_GENERALES (fila nueva), D-209 J y L y D-27 I y K (texto propuesto arriba); campos por subtipo de Monitoreo, cuando se decidan. |
| Impacto en BD | Fase 4: versiones de datos y evaluaciones con solo los campos registrados; vigencia por dato (diseño §3.6, §3.9 y §5.1). |
| Impacto en backend | Fase 6: validación por alcance; cálculo con los valores vigentes resultantes. |
| Impacto en API | Alcance según el tipo de inspección. |
| Impacto en frontend | Formulario de inspección con los campos del alcance. |
| Pruebas necesarias | Finalización por tipo; reemplazo parcial de vigentes; historial sin sobrescritura; resolución del No determinado por la Evaluación instrumental; recálculo con los valores vigentes. |
| Dependencias | CC-024, CC-026, CC-031; paquete 2.0.0. Al cambiar la fuente, entra en la siguiente versión del paquete (2.1.0 por §14.10: cambia el conjunto de campos exigidos). |
| rule_version | 2.1 (paquete 2.1.0 en preparación, VERSION fila 6; no publicado) |
| Aprobado por | marybaxmann (regla de alcance y vigencia) |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase3-diseno-modelo-datos` (PR #31). |
| Observaciones | No se modificaron código, migraciones, RLS ni Supabase. |

**Checklist de sincronización**

- [x] PR-006 v11.0, PR-009 v5.0, PR-010 v4.0, ADR-016 v5.0.
- [x] Excel — REGLAS_GENERALES fila 28 (texto propuesto más el texto adicional de (a) a (d)), D-209 J y L, D-27 I y K; VERSION fila 6 (2.1.0); export regenerado (AM-12).
- [x] Campos por subtipo de Monitoreo y puntos (b) a (d) — decididos el 2026-10-20.
- [x] Publicación en el paquete (2.1.0) — 2026-10-21.
- [ ] Migración, backend, API y frontend — Fases 4 a 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | PENDIENTE DE DECISIÓN | marybaxmann | Regla de alcance y vigencia aprobada; faltan los campos por subtipo de Monitoreo. |
| 2026-10-20 | PENDIENTE DE DECISIÓN | marybaxmann | Evaluación vigente compuesta campo por campo; fotografías solo en Evaluación inicial, Reevaluación y Levantamiento (PR-010 v4.0). |
| 2026-10-21 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decididos los puntos (a) a (d): campos por subtipo de Monitoreo, cavidades internas Sí/No en la instrumental, No determinado si falta un valor vigente, ajuste solo si el valor recalculado coincide. Los textos del Excel van en un PR aparte. |
| 2026-10-21 | APROBADO METODOLÓGICAMENTE | marybaxmann | AM-12: textos cargados en el Excel (REGLAS_GENERALES fila 28, D-209 J y L, D-27 I y K). La autora define la versión en preparación como 2.1.0 (MINOR, `rule_version` 2.1) con CC-040 y CC-042. Verificación §14.9 sin hallazgos. |
| 2026-10-21 | FUENTE SINCRONIZADA | marybaxmann | Publicación de 2.1.0 (PR #31 y #33 fusionados en `main`, `34d8e99`). `00-index.md` con la fecha; verificación §14.9 sin hallazgos. VERSION fila 6 (estado, fecha, aprobado_por, tag) y el tag `metodologia-v2.1.0` quedan para el PR aparte de la sesión de auditoría (como el PR #30 de 2.0.0). |

---

### CC-041 — Decisiones de diseño de la Fase 3

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Fase 3, respuestas 1, 2, 4, 5 y 6 de la autora al diseño (PR #31). |
| Tipo | 3 — modelo de datos (+4) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | SECTORES; `public_spaces`; `infrastructure_conflicts`; ajuste de clasificaciones; `motor_commit`; USUARIOS.`id_usuario` (D-247). |
| Versión nueva | 1. **Sector obligatorio al crear el proyecto:** el Administrador carga la delimitación junto con el proyecto; nunca existe un proyecto sin sector, y `trees.sector_id` es obligatorio (D-6, D-252 a D-256). 2. **Todo lo que no está en el Excel se elimina:** `public_spaces` e `infrastructure_conflicts` se retiran en el paso de retiro, aparte y con autorización. Se conservan solo los campos técnicos (identificadores, timestamps, FK, códigos visibles como `A-000000` y `audit_log`). Se eliminan los campos funcionales que no están en el Excel, entre ellos `projects.institution_name` y `responsible_professional` (PR-005 v4.0) y `trees.legacy_id`; `projects.status` no se elimina: lo reemplaza `estado_proyecto` (CC-042); el diseño no agrega `trees.via_registro`. 3. **El Inspector ajusta clasificaciones solo antes de finalizar** la inspección; después, se anula y se registra una nueva (PR-009 v5.0). 4. **`motor_commit`:** cada evaluación guarda el hash del código del motor que calculó sus resultados, junto con `rule_version`, que se valida con el formato `MAJOR.MINOR` (no queda fija en un valor). 5. **`codigo_usuario`** con formato `USR-000` (D-247), además del identificador interno. |
| Motivo | Cerrar las preguntas del diseño de la Fase 3. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20. |
| Archivos afectados | Esta ficha; PR-004 v7.0; PR-005 v4.0; PR-009 v5.0; `docs/diseno/fase3-modelo-datos-2.0.0.md`. |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Fase 4 (diseño §3). |
| Impacto en backend | Fase 6: creación de proyecto con sector; ajuste solo en Preguardado; `motor_commit` en cada cálculo. |
| Impacto en frontend | Fase 7: alta de proyecto con delimitación. |
| Pruebas necesarias | Proyecto sin delimitación rechazado; ajuste rechazado en una inspección finalizada; `motor_commit` presente en cada evaluación; formato de `codigo_usuario`. |
| Dependencias | CC-030, CC-032, CC-033. |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — |
| Commits / PR asociados | Rama `docs/fase3-diseno-modelo-datos` (PR #31). |
| Observaciones | El retiro de tablas sigue requiriendo autorización expresa en la Fase 4. |

**Checklist de sincronización**

- [x] PR-004 v7.0, PR-005 v4.0 y PR-009 v5.0.
- [ ] Migración, backend y frontend — Fases 4 a 7.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Respuestas 1, 2, 4, 5 y 6 al diseño de la Fase 3. |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Se eliminan los campos funcionales que no están en el Excel (PR-005 v4.0; `trees.legacy_id`); `rule_version` con formato `MAJOR.MINOR`. |
| 2026-10-21 | APROBADO METODOLÓGICAMENTE | marybaxmann | `status` ya no se retira: lo reemplaza `estado_proyecto` (CC-042, PR #32). Citas de MIEMBROS_PROYECTO renumeradas a D-266 y D-267. |

---

### CC-042 — Estado del proyecto: `estado_proyecto` (Activo / Cerrado)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-20 |
| Origen | Revisión del diseño de la Fase 3 (PR #31): CC-041 retira `projects.status` porque no está en el Excel, y sin él un proyecto no puede cerrarse. La autora decide incorporar el estado al Excel. |
| Tipo | 3 — modelo de datos |
| Estado | FUENTE SINCRONIZADA (paquete 2.1.0 publicado el 2026-10-21) |
| Regla / campo afectado | PROYECTOS: `estado_proyecto` (nuevo). REGLAS_GENERALES: sección "Proyectos" (fila 27). VERSION: fila 6 (2.1.0, junto con CC-040). |
| Versión anterior | PROYECTOS solo tenía `id_proyecto` y `nombre_proyecto`; un proyecto no tenía estado ni podía cerrarse. |
| Versión nueva | 1. **`estado_proyecto`** (D-265): Activo / Cerrado, Obligatorio. Valor inicial Activo al crear el proyecto. Solo el Administrador cierra o reabre. 2. **Proyecto Cerrado = solo consulta:** se ven árboles, mapa, fichas, indicadores e historial; no se registran árboles ni se crean OT, inspecciones, mantenimientos o incidencias; el formulario QR de sus árboles no recibe incidencias. La delimitación del sector no se modifica; el Administrador puede seguir gestionando los miembros. 3. **Cierre sin condiciones:** puede cerrarse aunque existan OT o incidencias abiertas; mientras el proyecto está Cerrado, esas OT e incidencias se conservan en su estado y no avanzan hasta que se reabra. 4. **Reapertura:** un proyecto Cerrado puede volver a Activo; el cambio no altera `id_proyecto` ni el historial. |
| Motivo | Buena práctica de gestión: permitir cerrar un proyecto terminado sin perder su información y sin que reciba nuevos registros. |
| Fundamento / fuente | Decisión de la autora (marybaxmann), 2026-10-20: valores Activo / Cerrado, solo consulta y reabrible por el Administrador. Ajuste del mismo día: se puede cerrar aunque existan OT abiertas. |
| Archivos afectados | `docs/excel/Base de Datos Valpo Verde.xlsx`; `docs/registro-cambios.md`. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | DICCIONARIO_CAMPOS: fila nueva 265 (`estado_proyecto`); las filas de MIEMBROS_PROYECTO pasan de D-265 y D-266 a **D-266 y D-267**. Cabecera C1 de PROYECTOS. REGLAS_GENERALES fila 27. VERSION fila 6. |
| Impacto en BD | Pendiente (Fase 3 / Fase 4): columna `estado_proyecto` en `projects`, Activo por defecto; reemplaza el `status` que CC-041 retira. |
| Impacto en backend | Pendiente: bloquear escrituras en proyectos Cerrados, incluido el avance de OT e incidencias abiertas; solo el Administrador cambia el estado. |
| Impacto en API | Pendiente: operación de cierre y reapertura; errores de escritura en proyecto Cerrado. |
| Impacto en frontend | Pendiente: indicador del estado, acciones de cierre y reapertura para el Administrador, formularios deshabilitados y mensaje en el formulario QR. |
| Pruebas necesarias | En implementación: cierre con una OT abierta, que queda sin avanzar hasta la reapertura; escrituras rechazadas en un proyecto Cerrado; consulta permitida; reapertura. |
| Dependencias | CC-041 (retiro de `projects.status`), CC-036 (formulario QR), AM-08 (2.0.0). |
| rule_version | 2.0 (sin cambio: PATCH, el campo no participa en ninguna regla de cálculo) |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-20 |
| Fecha de implementación | — (sin implementación) |
| Commits / PR asociados | Rama `docs/cc-042-estado-proyecto`. |
| Observaciones | Versión del paquete: por sí solo sería PATCH (2.0.1; `workflow.md` §14, tipo 3 que no participa en ninguna regla), pero se publica dentro de 2.1.0 junto con CC-040, que es MINOR (decisión de la autora, 2026-10-21; AM-12). Publicado el 2026-10-21. No se modificaron código, migraciones, RLS ni Supabase. |

**Checklist de sincronización**

- [x] Excel maestro — DICCIONARIO_CAMPOS, PROYECTOS, REGLAS_GENERALES y VERSION.
- [x] Diseño de la Fase 3 (PR #31) — `estado_proyecto` en `projects` y referencias D-266/D-267 de MIEMBROS_PROYECTO incorporadas.
- [ ] PR / ADR — roles del Administrador (cierre y reapertura).
- [ ] Migración + schema.sql — pendiente.
- [ ] Backend — pendiente.
- [ ] API / Zod — pendiente.
- [ ] Frontend — pendiente.
- [ ] Revisión final

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial y Excel actualizado (Valen-j211). |
| 2026-10-20 | APROBADO METODOLÓGICAMENTE | marybaxmann | Ajuste: el cierre se permite con OT o incidencias abiertas, que quedan congeladas hasta la reapertura (DICCIONARIO_CAMPOS L265, REGLAS_GENERALES B27). |
| 2026-10-21 | APROBADO METODOLÓGICAMENTE | marybaxmann | La versión en preparación pasa de 2.0.1 a 2.1.0 (`rule_version` 2.1) e incluye CC-040 (AM-12). |
| 2026-10-21 | FUENTE SINCRONIZADA | marybaxmann | Publicación de 2.1.0 (PR #31 y #33 fusionados en `main`, `34d8e99`). VERSION fila 6 y el tag `metodologia-v2.1.0` quedan para el PR aparte de la sesión de auditoría (como el PR #30 de 2.0.0). |

---

### CC-043 — M04: tratamiento de "Función no determinada" en `tipo_red_aerea` (IN-RAE)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-22 |
| Origen | Fase 5 (motor de reglas), implementación de M04 / IN-RAE. El Excel define `tipo_red_aerea` (D-139) como selección múltiple con la opción "Función no determinada", pero las reglas IN-RAE-02 a 06 solo distinguen "incluye Eléctrica" / "no incluye Eléctrica"; no definen qué hacer cuando la selección incluye "Función no determinada" y no incluye "Eléctrica". |
| Tipo | 2 — metodológico (regla de indicador, M04) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | REGLAS_INDICADORES: IN-RAE-02 a 06. DICCIONARIO_CAMPOS: D-139 (`tipo_red_aerea`). |
| Versión anterior | No definida: el Excel no contempla el caso "Función no determinada" sin "Eléctrica" en IN-RAE. |
| Versión nueva (opción B) | Si la selección de `tipo_red_aerea` incluye "Función no determinada" y **no** incluye "Eléctrica", el componente red aérea queda `no_determinado` (se excluye de M04 según D-170): no se puede descartar que la red sea eléctrica. Si la selección incluye "Eléctrica", se aplican IN-RAE-02 a 04 igual, aunque también esté marcada "Función no determinada". Si no incluye ninguna de las dos, se aplican IN-RAE-05/06 como hoy. |
| Motivo | El Excel no define el caso y la regla del proyecto es no suponer datos: no se puede asumir que una red de función desconocida no es eléctrica (lo que subestimaría el riesgo tratándola como IN-RAE-05/06), ni asumir que sí lo es (lo que la sobreestimaría exigiéndole la distancia de seguridad sin que el Inspector la haya evaluado como tal). |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-22. |
| Archivos afectados | `src/services/rules/engine/m04-infraestructura.ts` (implementación); esta ficha. Pendiente: `docs/excel/Base de Datos Valpo Verde.xlsx` (REGLAS_INDICADORES IN-RAE, DICCIONARIO_CAMPOS D-139). |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: agregar el texto de esta decisión a REGLAS_INDICADORES (IN-RAE) y a D-139, en la próxima versión del paquete. |
| Impacto en BD | Ninguno: `tipo_red_aerea` no tiene columna propia todavía (Fase 6). |
| Impacto en backend | Implementado en el motor (Fase 5): `evaluarRedAerea` en `m04-infraestructura.ts`. |
| Impacto en API | Ninguno todavía (Fase 6). |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | Implementadas: solo "Función no determinada"; "Eléctrica" + "Función no determinada"; "Telecomunicaciones" + "Función no determinada"; código desconocido; lista vacía (`tests/services/rules/engine/m04-infraestructura.test.ts`). |
| Dependencias | D-170 (No aplica y No determinado se excluyen de M04). |
| rule_version | 2.1 (sin cambio de versión del paquete: el Excel en sí no se modificó todavía; la sincronización queda pendiente, ver "Impacto en Excel metodológico"). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-22 |
| Fecha de implementación | 2026-10-22 (rama `feature/fase5-motor-reglas`) |
| Commits / PR asociados | Rama `feature/fase5-motor-reglas` (sin PR todavía). |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial; implementado en el motor el mismo día. Pendiente llevar el texto al Excel. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | Claude Code | Citas D-n corregidas a la fila real del Excel (D-149 → D-139); error de numeración mío, no de la responsable (ver `scripts/metodologia/fila_diccionario.py`). |

---

### CC-044 — Ajuste justificado sobre una clasificación calculada como No determinado / No aplica

| Campo | Valor |
|---|---|
| Fecha | 2026-10-22 |
| Origen | Fase 5 (motor de reglas), implementación del ensamblaje (`ensamblaje.ts`, `resolverValorEfectivo`). D-171 y PR-008 v2.0 permiten el ajuste justificado de `clasificacion_riesgo`, `clasificacion_infraestructura` y `clasificacion_prioridad`, pero no dicen si el Inspector puede ajustar cuando el valor calculado es `No determinado` (riesgo/prioridad) o `No aplica` (infraestructura). |
| Tipo | 2 — metodológico (regla de ajuste, PR-008) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | D-171 (`clasificacion_riesgo`), D-170 (`clasificacion_infraestructura`), D-172 (`clasificacion_prioridad`); `classification_adjustments` (diseño §3.10); CC-040 (d). |
| Versión anterior | No definida: el Excel no contempla el caso de ajustar sobre un valor calculado No determinado / No aplica. |
| Versión nueva | El Inspector **sí puede** ajustar una clasificación cuyo valor calculado es `No determinado` (riesgo, prioridad) o `No aplica` (infraestructura), con `justificacion_ajuste_clasificacion` obligatoria (NOT NULL en la base). Se conservan el valor calculado, el valor ajustado, el Inspector y la fecha del ajuste (D-171). El valor ajustado alimenta M05 y las fechas sugeridas (D-202/D-203) igual que cualquier otro ajuste. La regla de descarte de CC-040 (d) aplica sin cambios: en un recálculo posterior, si el valor calculado deja de ser No determinado/No aplica y no coincide con el valor sobre el que se hizo el ajuste, el ajuste se descarta y `requiere_revision_ajuste = true`. Lo único que **nunca** es válido es que el **valor ajustado** (el destino del ajuste, no el valor sobre el que se ajustó) sea él mismo `No determinado`/`No aplica`: un ajuste siempre resuelve a una categoría concreta. |
| Motivo | El Excel permite el ajuste justificado pero no resuelve este caso; dejarlo indefinido bloquearía al Inspector justo en el escenario donde más necesita poder corregir el resultado (datos insuficientes para el cálculo automático, pero con criterio profesional suficiente para clasificar). |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-22. |
| Archivos afectados | `src/services/rules/engine/ensamblaje.ts` (implementación); esta ficha. Pendiente: `docs/excel/Base de Datos Valpo Verde.xlsx` (D-171, D-170, D-172), en la próxima versión del paquete. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: agregar el texto de esta decisión a D-171, D-170 y D-172, en la próxima versión del paquete. |
| Impacto en BD | Ninguno nuevo: `classification_adjustments` (diseño §3.10) ya admite esto sin cambios de esquema — la columna `valor_calculado` ya acepta `No determinado`/`No aplica` porque son valores legítimos de `clasificacion_*_calculada`. |
| Impacto en backend | Implementado en el motor (Fase 5): `resolverValorEfectivo` en `ensamblaje.ts` valida que el valor ajustado sea una categoría determinada antes de aceptarlo, independientemente de cuál sea el valor calculado. |
| Impacto en API | Ninguno todavía (Fase 6). |
| Impacto en frontend | Ninguno todavía (Fase 7): el formulario de ajuste debe permitir ajustar aunque la clasificación muestre "Sin determinar"/"No aplica". |
| Pruebas necesarias | Implementadas: ajuste sobre No determinado se mantiene; recálculo posterior con datos completos y valor distinto → descartado con marca de revisión; recálculo que sigue No determinado → se mantiene; valor ajustado = No determinado/No aplica → siempre se descarta (`tests/services/rules/engine/ensamblaje.test.ts`). |
| Dependencias | CC-024 (No determinado), CC-029 (prioridad No determinado), CC-040 (d) (descarte de ajustes), D-170 (No aplica en infraestructura). |
| rule_version | 2.1 (sin cambio de versión del paquete: el Excel en sí no se modificó todavía; la sincronización queda pendiente, ver "Impacto en Excel metodológico"). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-22 |
| Fecha de implementación | 2026-10-22 (rama `feature/fase5-motor-reglas`) |
| Commits / PR asociados | Rama `feature/fase5-motor-reglas` (sin PR todavía). |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial; implementado en el motor el mismo día. Pendiente llevar el texto al Excel. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | Claude Code | Citas D-n corregidas a la fila real del Excel (D-181 → D-171); error de numeración mío, no de la responsable (ver `scripts/metodologia/fila_diccionario.py`). |

---

### CC-045 — Dos bloqueos del ensamblaje cerrados: ajustes ante una inspección anulada y fechas sugeridas sin riesgo determinado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-22 |
| Origen | Dos bloqueos documentados en el encabezado de `ensamblaje.ts` al cerrar el PR #70 (Fase 5, motor de reglas): (a) CC-040 (d) no decía qué pasa con los ajustes cuando el recálculo de la vigente lo dispara una `inspeccion_anulada` en vez de una OT completada; (b) D-202/D-203 no definían una fecha sugerida cuando `nivel_riesgo` queda `No determinado`, pese a que ambas fechas son Obligatorias. |
| Tipo | 2 — metodológico (dos decisiones, registradas juntas por haberse resuelto en la misma revisión) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | (a) CC-040 (d); `classification_adjustments`; `tree_assessments.evento`. (b) D-200 (`nivel_riesgo`), D-202 (`fecha_proxima_inspeccion`), D-203 (`fecha_proximo_monitoreo`). |
| Versión anterior | (a) No definida: CC-040 (d) solo cubría explícitamente el recálculo por OT completada. (b) No definida: D-200 solo admitía Bajo/Moderado/Alto/Extremo: una inspección con `clasificacion_riesgo` calculada como No determinado (D-171) no podría finalizarse nunca. |
| Versión nueva | **(a)** Principio: al anularse una inspección, la evaluación vigente se recompone como si esa inspección nunca hubiera existido. La regla de descarte de CC-040 (d) se generaliza: aplica a cualquier recálculo de la vigente, no solo al disparado por una OT completada. Los ajustes registrados en la inspección anulada **no se aplican nunca** a la vigente (se conservan en el historial). Los ajustes de inspecciones válidas anteriores se vuelven a evaluar con la regla normal de CC-040 (d): se mantienen si el valor recalculado coincide con el valor sobre el que se ajustaron; si no, se descartan con `requiere_revision_ajuste = true`. Un ajuste anterior que se había descartado solo por culpa de la inspección ahora anulada se vuelve a evaluar con esa misma regla (puede volver a quedar vigente). **(b)** `nivel_riesgo` admite `No determinado` (sigue siendo igual a `clasificacion_riesgo` efectiva, incluido su ajuste — nunca se convierte en Extremo). Si es `No determinado`, las fechas sugeridas usan los rangos de Extremo (próxima inspección: 1 a 4 semanas; próximo monitoreo: inmediato y continuo), con un motivo explícito ("criterio de precaución: nivel_riesgo No determinado (CC-045 b)") para que la interfaz pueda mostrarlo. Si el Inspector ajusta el riesgo (CC-044), las fechas usan el valor ajustado. El Inspector puede modificar las fechas con `justificacion_ajuste_fecha`, sin cambios respecto de hoy (validación de la Fase 6, no del motor). La inspección con riesgo No determinado puede quedar Finalizada. |
| Motivo | (a) Sin esta regla, anular una inspección dejaría la evaluación vigente en un estado indefinido respecto de sus ajustes — ni el Excel ni CC-040 lo resolvían. (b) Dejar sin fecha una inspección con riesgo No determinado bloquearía su finalización, justo cuando más atención requiere: se optó por el criterio más conservador (rango de Extremo) en vez de omitir el campo o inventar un plazo distinto. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-22, tomada junto con su compañera. |
| Archivos afectados | `src/services/rules/engine/ensamblaje.ts` (CC-045 a: `AjusteVigente.inspectionId`, `filtrarPorAnulacion`, `ArgsResultadoVigente.inspeccionAnuladaId`); `src/services/rules/engine/fechas-sugeridas.ts` (CC-045 b: caso `no_determinado` en ambas funciones); esta ficha. Pendiente: `docs/excel/Base de Datos Valpo Verde.xlsx` — (a) REGLAS_GENERALES "Historial y vigencia" y "Preguardado y finalización" (última oración); (b) D-200 (dominio), D-202, D-203 y REGLAS_GENERALES "Reinspección y monitoreo" — en la próxima versión del paquete. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente, ver "Archivos afectados". |
| Impacto en BD | Ninguno nuevo: (a) usa `tree_assessments.evento` y `classification_adjustments`, que ya existen; (b) `inspections.fecha_proxima_inspeccion_sugerida`/`fecha_proximo_monitoreo_sugerida` ya admiten el caso, al no estar restringidas a un dominio distinto de fecha. |
| Impacto en backend | Implementado en el motor (Fase 5): `ensamblaje.ts` y `fechas-sugeridas.ts`. Pendiente (Fase 6): que el recálculo por `inspeccion_anulada` identifique y pase el `inspectionId` de la anulada y, si corresponde, el ajuste de la inspección válida anterior. |
| Impacto en API | Ninguno todavía (Fase 6). |
| Impacto en frontend | Ninguno todavía (Fase 7): mostrar el motivo de precaución (b) cuando corresponda. |
| Pruebas necesarias | Implementadas en `tests/services/rules/engine/ensamblaje.test.ts` y `fechas-sugeridas.test.ts`: (a) se anula la inspección que tenía el ajuste → vuelve al calculado; se anula una inspección sin ajuste y reaparece uno anterior que coincide → se mantiene; el anterior ya no coincide → se descarta con revisión. (b) riesgo No determinado → rango de Extremo con motivo; No determinado ajustado a Bajo → 24 y 12 meses, sin el motivo de precaución. |
| Dependencias | CC-040 (d) (descarte de ajustes); CC-044 (ajuste sobre No determinado/No aplica); CC-024, CC-029 (No determinado); D-171. |
| rule_version | 2.1 (sin cambio de versión del paquete: el Excel en sí no se modificó todavía; la sincronización queda pendiente, ver "Impacto en Excel metodológico"). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-22 |
| Fecha de implementación | 2026-10-22 (rama `feature/fase5-motor-reglas`, PR #70) |
| Commits / PR asociados | PR #70 (`feature/fase5-motor-reglas`), sin fusionar. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial; implementado en el motor el mismo día, actualizando el PR #70. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | Claude Code | Citas D-n corregidas a la fila real del Excel (D-210/D-212/D-213/D-181 → D-200/D-202/D-203/D-171); error de numeración mío, no de la responsable (ver `scripts/metodologia/fila_diccionario.py`). |

---

### CC-046 — El árbol debe quedar dentro del sector de su proyecto (D-255; D-9/D-10)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-22 |
| Origen | Fase 6, issue #56. Al implementar el alta y la edición de PROYECTOS + SECTORES se detectó que el Excel no define si la ubicación del árbol debe quedar dentro de la delimitación (`geometria_sector`) de su proyecto — quedó anotado en el HANDOFF como pendiente, sin implementar, hasta que la responsable decidiera. |
| Tipo | 2 — metodológico (regla espacial; D-255, D-9, D-10) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | D-9 (`utm_este`), D-10 (`utm_norte`), D-255 (`geometria_sector`); REGLAS_GENERALES (sección de ubicación del árbol, a ubicar en la próxima versión del paquete). |
| Versión anterior | No definida: el Excel no exige que la ubicación del árbol esté dentro del sector de su proyecto. |
| Versión nueva | La ubicación del árbol (`trees.ubicacion`, generada desde `utm_este`/`utm_norte` por ADR-010 v3.0) debe quedar dentro de `geometria_sector` (D-255) de su proyecto. Si queda fuera, el registro se rechaza con un mensaje claro — nunca una advertencia. Un árbol exactamente sobre el borde del sector cuenta como dentro: la comparación usa `ST_Covers`, no `ST_Contains`. Si una nueva delimitación del sector (edición de `geometria_sector`) deja fuera a uno o más árboles ya registrados, el cambio se rechaza e informa los `tree_code` afectados. Se valida en el alta del árbol (#57) y en cualquier cambio de su ubicación. La comparación se hace en PostGIS — `trees.ubicacion` es `geography(Point, 4326)`, generada desde UTM 19S/WGS84 (ADR-010); `sectors.geometria_sector` es `geography(MultiPolygon, 4326)` — nunca en Node. La garantiza la base (función de alta o un trigger); el backend traduce el rechazo a 422. |
| Motivo | Un árbol fuera de la delimitación de su sector no tiene sentido territorial para SIVU (el sector es la unidad de gestión); dejarlo sin regla permitiría inconsistencias que ningún cálculo posterior detectaría. `ST_Covers` en vez de `ST_Contains`: un árbol justo en el límite (p. ej. en la vereda que define el borde del sector) es un caso real y no debe rechazarse solo por estar sobre la línea. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-22. |
| Archivos afectados | `database/migrations/018c_arbol_dentro_del_sector.sql` y `.down.sql` (`fn_check_arbol_dentro_sector`/`trg_trees_dentro_sector`, `fn_check_version_dentro_sector`/`trg_tree_data_versions_dentro_sector`, `fn_update_sector_geometria` con `CREATE OR REPLACE`); `database/schema.sql`; `src/repositories/sivu/project.repository.ts` (`SQLSTATE_ARBOL_FUERA_SECTOR`); `src/services/sivu/project.service.ts` (traductor de errores); `database/fase6/pruebas_018c_arbol_sector.sql` (V1–V9); `HANDOFF.md`; esta ficha. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: agregar el texto a D-9, D-10, D-255 y REGLAS_GENERALES, en la próxima versión del paquete (AM-15). |
| Impacto en BD | Implementado y probado en `valpo-verde-conecta-pruebas` (migración 018c): `trg_trees_dentro_sector` (alta y cambio de ubicación en `trees`) y `trg_tree_data_versions_dentro_sector` (alta e inspección en `tree_data_versions` — el error aparece al registrar la coordenada, no al completar la OT; `trees` queda como última barrera). Un sector no encontrado o no visible (RLS) se rechaza con SV046, nunca se salta la validación — mismo criterio en `fn_update_sector_geometria`, verificado explícitamente antes de calcular qué árboles quedarían fuera. |
| Impacto en backend | Implementado: `traducirErrorProyectoOSector` traduce `SQLSTATE_ARBOL_FUERA_SECTOR` (SV046) a 422, igual que `SQLSTATE_GEOMETRIA_SECTOR` (CC-047). |
| Impacto en API | Implementado para la edición del sector (`PATCH /api/sivu/projects/:id` ya rechaza con 422 si la nueva delimitación deja árboles fuera). Pendiente para el alta del árbol (#57, todavía no implementado) — el trigger de `trees` ya protege cualquier forma en que se inserte, incluida la futura función de alta. |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | Implementadas y corridas dos rondas en `valpo-verde-conecta-pruebas` (`database/fase6/pruebas_018c_arbol_sector.sql`, V1–V9): árbol dentro → se acepta (V1); árbol fuera → se rechaza (V2); árbol sobre el borde → se acepta, `ST_Covers` (V3); árbol dentro de un hueco interior → se rechaza (V4); multipolígono, árbol en la segunda superficie → se acepta (V5); cambio de ubicación que lo deja fuera → se rechaza (V6); nueva delimitación que deja árboles fuera → se rechaza con la lista de `tree_code` (V7); coordenada rechazada en `tree_data_versions` al registrarla, no al completar la OT (V8); sector inexistente → se rechaza con SV046, no se salta la validación (V9). |
| Dependencias | CC-047 (detalle de D-255 para la importación de `geometria_sector`); ADR-010 v3.0 (`trees.ubicacion`); migración 018b (`sectors.geometria_sector`). |
| rule_version | 2.1 (sin cambio de versión del paquete todavía; sincronización pendiente, AM-15). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-22 |
| Fecha de implementación | 2026-10-23 (migración 018c, rama `feature/fase6-backend-api`); aplicada y probada en `valpo-verde-conecta-pruebas` el mismo día (dos rondas: aplicar, revertir, reaplicar). |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial. Implementación en la 018c pendiente; se muestra el SQL antes de aplicar. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Implementada en la 018c (con el ajuste de "sector no encontrado = error" y el trigger de `tree_data_versions`, pedidos por la responsable); aplicada, revertida y reaplicada en `valpo-verde-conecta-pruebas`, V1–V9 (9/9) en ambas rondas; asesor de seguridad sin avisos nuevos. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | Claude Code | Citas D-n corregidas a la fila real del Excel (D-265 → D-255; `geometria_sector`); error de numeración mío, no de la responsable (ver `scripts/metodologia/fila_diccionario.py`). |

---

### CC-047 — Detalle de D-255: selección obligatoria con varias superficies y superficies inválidas en el KML/KMZ

| Campo | Valor |
|---|---|
| Fecha | 2026-10-22 |
| Origen | Issue #56 (Fase 6). Al revisar la 018b (correcciones de la responsable sobre `fn_build_sector_geometria`) surgieron dos puntos que D-255 no resuelve: qué hacer cuando el archivo trae varias superficies y no llega una selección explícita, y cómo tratar una superficie que PostGIS no puede leer o que es inválida. |
| Tipo | 2 — metodológico (detalle de D-255) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | D-255 (`geometria_sector`). |
| Versión anterior | D-255 dice "aceptar únicamente superficies válidas y no vacías" y "si existen varias superficies, permitir seleccionar las que integrarán el sector", pero no dice qué pasa sin selección explícita, ni cómo tratar una superficie ilegible o inválida. |
| Versión nueva | **(1) Selección.** Si el archivo trae una sola superficie válida, no es necesario seleccionarla. Si trae más de una (válida o inválida), `indicesSeleccionados` es obligatorio; sin selección se rechaza con 422. Si entre las superficies no seleccionadas hay alguna inválida, el mensaje la nombra (con su índice y motivo) y dice cuál es la superficie válida que debe seleccionarse, en vez de decir solo "varias superficies". Nunca se incluyen todas por defecto. **(2) Superficie inválida o ilegible.** Nunca se cuenta como "excluida" — ese término queda solo para puntos y líneas (lo que D-255 dice excluir). La vista previa lista cada superficie del archivo con su índice y su estado: `valida`, `invalida` (con el motivo: `ST_IsValidReason` o el error de lectura) o `excluida` (punto o línea). Las inválidas no se pueden seleccionar. El guardado (crear o editar el sector) se rechaza con 422 si alguna superficie que se iba a incluir es inválida — porque se seleccionó o porque es la única del archivo —, con un mensaje que dice cuál es y por qué. Si el archivo no tiene ninguna superficie válida, se rechaza. Nunca se usa `ST_MakeValid`. |
| Motivo | Sin esta regla, D-255 dejaría ambigüedad justo en el caso de más riesgo: una superficie inválida podría quedar incluida sin que nadie la elija (si se incluyeran todas por defecto) o excluida en silencio (si se tratara igual que un punto o una línea), contradiciendo "informar su exclusión" y "aceptar únicamente superficies válidas". |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-22, en dos partes: aprobación inicial y, el mismo día, el ajuste del mensaje del punto (1) para que nombre la superficie inválida. |
| Archivos afectados | `database/migrations/018b_proyectos_sector_funciones.sql` (`fn_extraer_superficies_kml`, `fn_build_sector_geometria`); `database/schema.sql`; `src/schemas/sivu/common.schema.ts`; `src/services/sivu/project.service.ts` y `geometriaSector.service.ts`; `src/controllers/sivu/project.controller.ts`; `src/routes/sivu/project.routes.ts`; `src/repositories/sivu/project.repository.ts`; sus tests; `database/fase6/pruebas_018b_sector.sql` (P1–P9) y `pruebas_018b_kml_real.sql` (K1–K7); esta ficha. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: agregar el texto a D-255, en la próxima versión del paquete (AM-15). |
| Impacto en BD | Implementado y probado en `valpo-verde-conecta-pruebas` (migración 018b, commits `3e11e7d` y `9771770` en `feature/fase6-backend-api`): `fn_extraer_superficies_kml` clasifica cada elemento (válida/inválida/excluida, con nombre e índice, tomado del `<name>` de su Placemark); `fn_build_sector_geometria` exige selección si hay más de una superficie y rechaza (SQLSTATE `SV265`) una inválida seleccionada, el caso sin selección con inválidas presentes, y el archivo sin ninguna superficie válida. |
| Impacto en backend | Implementado: `POST /api/sivu/projects/sector-preview` (vista previa, solo Administrador, no guarda nada); todo rechazo con SQLSTATE `SV265` se traduce a 422 (antes algunos casos daban 400). |
| Impacto en API | Implementado: `POST /api/sivu/projects/sector-preview` nuevo; `PATCH /api/sivu/projects/:id` ahora responde 200 con `{ superficiesExcluidas }` (antes 204 sin cuerpo). |
| Impacto en frontend | Ninguno todavía (Fase 7): el formulario de delimitación debe mostrar la vista previa con el estado de cada superficie antes de guardar. |
| Pruebas necesarias | Implementadas y corridas en `valpo-verde-conecta-pruebas`: P1 a P9 y R1 a R3 (`database/fase6/pruebas_018b_sector.sql`) y K1 a K7 con KML reales (`pruebas_018b_kml_real.sql`), incluida la reversión y reaplicación completa de la 018a/018b (2026-10-23) y el asesor de seguridad, sin avisos nuevos. |
| Dependencias | D-255; CC-046 (usa esta clasificación en el #57/018c para exigir que la superficie elegida sea válida antes de comparar con la ubicación del árbol). |
| rule_version | 2.1 (sin cambio de versión del paquete todavía; sincronización pendiente, AM-15). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-22 |
| Fecha de implementación | 2026-10-22 (commit `3e11e7d`; ajuste del mensaje, commit `9771770`); aplicada y probada en `valpo-verde-conecta-pruebas` el 2026-10-23. |
| Commits / PR asociados | `3e11e7d`, `9771770` (`feature/fase6-backend-api`, sin PR todavía). |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial (detalle de D-255: selección y superficies inválidas). |
| 2026-10-22 | APROBADO METODOLÓGICAMENTE | marybaxmann | Ajuste del mensaje del punto (1): nombra la superficie inválida y la válida a seleccionar. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Aplicada y probada en `valpo-verde-conecta-pruebas` (018a/018b; P1–P9, R1–R3, K1–K7; reversión y reaplicación); asesor de seguridad sin avisos nuevos. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | Claude Code | Citas D-n corregidas a la fila real del Excel (D-265 → D-255; `geometria_sector`); error de numeración mío, no de la responsable (ver `scripts/metodologia/fila_diccionario.py`). |

---

### CC-048 — `evaluations` admite una fila en Preguardado

| Campo | Valor |
|---|---|
| Fecha | 2026-10-23 |
| Origen | Planificación del #58 (OT e inspecciones por tipo). Al diseñar dónde se guardan los datos de REGISTRO_EVALUACION mientras una inspección está Preguardado, se encontró que el diseño de la Fase 3 (§3.6, §3.8, §3.9) y REGLAS_GENERALES "Historial y vigencia" ("Mientras una inspección está Preguardado, el Inspector puede modificar todos sus datos") y D-209 (Preguardado/Finalizado se calcula a partir de los datos ya guardados) suponen que esos datos se guardan, pero `evaluations` (migración 014) tenía `variables_calculo`, `rule_version` y `motor_commit` como NOT NULL sin default — ninguno de los tres existe hasta que el motor corre (al finalizar, §3.9), lo que impedía crear la fila antes de ese momento. `calculados` y `calculado_at` ya eran opcionales: el diseño sí previó una fila "antes del cálculo", pero quedó inconsistente con esos tres NOT NULL. |
| Tipo | 3 — modelo de datos (consistencia física; sin impacto en el Excel, igual que CC-041) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | `evaluations.variables_calculo`, `.rule_version`, `.motor_commit` (pasan a ser opcionales); nuevo `CHECK chk_evaluations_calculado_coherente`. |
| Versión anterior | `variables_calculo`, `rule_version` y `motor_commit` NOT NULL sin default — una fila de `evaluations` no podía existir hasta que el motor ya hubiera corrido. |
| Versión nueva | Los tres pasan a ser opcionales. Nuevo CHECK de coherencia: si `calculado_at` es NULL, todas las columnas de resultado (`variables_calculo`, `rule_version`, `motor_commit`, `calculados`, `indicadores`, los puntajes y probabilidades de falla por componente, `probabilidad_impacto`, las clasificaciones calculadas y ajustadas) también son NULL — la fila es un borrador Preguardado. Si `calculado_at` tiene valor, `variables_calculo`, `rule_version` y `motor_commit` son obligatorios — el motor ya corrió. `variables` sigue NOT NULL: es obligatorio desde el primer guardado (es lo que el Inspector ya registró). Flujo del #58: el primer guardado del Inspector crea `inspections` (Preguardado) y `evaluations` solo con `variables`; los campos de ARBOLES van a `tree_data_versions` con el mismo `inspection_id`. Cada guardado siguiente actualiza esas mismas filas (nunca inserta una nueva), solo mientras la inspección siga Preguardado — se rechaza con SV058 si ya está Finalizada o Anulada. **Ajuste por CC-050 punto 3:** además, la OT debe estar **En ejecución** en cada guardado (no solo "distinta de Completada/Cancelada") — se rechaza con SV058 si está Pendiente, Programada, Completada o Cancelada. **Validaciones agregadas (2026-10-23, todas con SV058):** solo el Inspector asignado actual (`responsable_accion_id`), activo y con rol Inspector, puede crear o guardar — cubre la reasignación sin paso adicional (CC-050: el anterior queda bloqueado de inmediato); la OT debe ser `tipo_ot = Inspección`, `tipo_inspeccion_realizada` debe igualar la `Accion_solicitada` de la OT (D-196) y `subtipo_inspeccion` debe pertenecer a ese tipo (D-197); el árbol de la inspección debe ser el de la OT (salvo Levantamiento); si un guardado ya no trae campos de ARBOLES, se borra la fila de `tree_data_versions` de esa inspección. **Ajuste (2026-10-23, D-193):** en Levantamiento (`work_orders.tree_id IS NULL`, D-193/AMD-19), el árbol no se compara contra la OT sino que debe pertenecer al mismo `project_id` de la OT — un árbol de otro proyecto se rechaza con SV058 (D-193: "referencia válida a ARBOLES del mismo proyecto; si el árbol ya existe, reutilizar su id_arbol y no duplicarlo"). Todo en una función `SECURITY DEFINER` (`fn_save_inspection_draft`), mismo patrón sin motor en medio que `fn_create_tree_alta` (018d): una sola invocación ya es atómica. El cálculo real (motor, `variables_calculo`, `calculado_at`) sigue siendo del #59/#72, al finalizar — esta función nunca lo toca. |
| Motivo | Sin esta corrección, el modelo físico no podía representar lo que el Excel exige (que los datos de una inspección Preguardado se guarden) — una inconsistencia entre el diseño (que ya dejó `calculados`/`calculado_at` opcionales) y el NOT NULL de las otras tres columnas, que nadie había resuelto hasta planificar el #58. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-23. |
| Archivos afectados | `database/migrations/018e_evaluations_preguardado.sql` y `.down.sql`; `database/schema.sql`; `database/fase6/pruebas_018e_inspection_draft.sql` (B0–B13); esta ficha. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno: es una corrección del modelo físico, no de la metodología (igual que CC-041). |
| Impacto en BD | Migración 018e (sin aplicar todavía): `ALTER COLUMN ... DROP NOT NULL` ×3, `CHECK chk_evaluations_calculado_coherente`, `CREATE TYPE tree_data_versions_arbol_input`, `fn_save_inspection_draft`. |
| Impacto en backend | Implementado (2026-10-25): `src/repositories/sivu/inspection.repository.ts`, `src/services/sivu/inspection.service.ts`, `src/schemas/sivu/inspeccion.schema.ts` (alcance por tipo/subtipo, CC-040) invocan `fn_save_inspection_draft`. Árbol nuevo en Levantamiento (CC-052/018f) todavía no expuesto desde el repositorio. |
| Impacto en API | Implementado (2026-10-25): `POST /api/sivu/work-orders/:workOrderId/inspections` (crea) y `PATCH /api/sivu/inspections/:inspectionId` (guarda). |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | `database/fase6/pruebas_018e_inspection_draft.sql`: B0 (crear con la OT Pendiente se rechaza, SV058), B1 (primer guardado con la OT En ejecución crea las tres filas), B2 (segundo guardado en Preguardado actualiza, no duplica), B3 (la OT se cancela con la inspección todavía Preguardada — permitido — y el siguiente guardado se rechaza porque ya no está En ejecución), B4 (guardar sobre una inspección Finalizada se rechaza con SV058, sin modificar nada), B5 (violar el CHECK de coherencia con un UPDATE directo se rechaza), B7 (un usuario sin rol Inspector se rechaza), B8 (tipo distinto de la Accion_solicitada de la OT se rechaza), B9 (árbol distinto al de la OT se rechaza), B10 (un guardado sin campos de ARBOLES borra la fila de tree_data_versions), B12 (OT de Levantamiento, árbol de otro proyecto se rechaza con SV058, D-193), B13 (OT de Levantamiento, árbol del mismo proyecto se acepta). B6, B7 y B11 (otro Inspector / rol no Inspector / reasignación) se ejecutaron con usuarios de prueba temporales creados y eliminados dentro del mismo `BEGIN…ROLLBACK` del script (autorizado por la responsable 2026-10-23, condiciones en el encabezado de `pruebas_018e_inspection_draft.sql`) — no existe ningún usuario con rol Inspector real todavía en `valpo-verde-conecta-pruebas`. B0–B13: 14/14 aprobadas contra PostGIS real; verificado tras el ROLLBACK que no queda ningún usuario de prueba en `auth.users` ni `user_profiles`; asesor de seguridad sin hallazgos nuevos (misma base que en 018b–018d). |
| Dependencias | CC-040 (alcance por tipo de inspección); CC-050 (estados de la OT, punto 3); migración 014 (`evaluations`); migración 018d (`fn_create_tree_alta`, mismo patrón); #57; #59/#72 (consumen `variables_calculo`/`calculado_at` al finalizar). |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-23 |
| Fecha de implementación | 2026-10-23 (aplicada en `valpo-verde-conecta-pruebas`, revertida y reaplicada desde el archivo con la validación D-193 incluida). |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | Migración aplicada en `valpo-verde-conecta-pruebas` y revertida/reaplicada dos veces (antes y después de agregar D-193), la segunda vez directamente desde `018e_evaluations_preguardado.sql` para confirmar que el archivo reproduce lo probado. Ver historial de estados. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial. Implementación en la 018e pendiente; se muestra el SQL antes de aplicar. |
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Ajustada por CC-050 punto 3: la OT debe estar En ejecución en cada guardado, no solo distinta de Completada/Cancelada. Casos B0 y B3 agregados a las pruebas. |
| 2026-10-23 | IMPLEMENTADO (pruebas) | marybaxmann | Agregadas las 4 validaciones de responsable/rol/tipo/árbol (SV058) con pruebas B6–B11 (usuarios de prueba temporales en `auth.users`, autorizados y eliminados dentro del mismo ROLLBACK). Aplicada en `valpo-verde-conecta-pruebas`: B0–B11 + regresión completa (A/P/K/V) aprobadas, revertida, reaplicada, asesor de seguridad sin hallazgos nuevos. |
| 2026-10-23 | IMPLEMENTADO (pruebas) | marybaxmann | Agregada la validación D-193 (Levantamiento: el árbol debe pertenecer al mismo proyecto de la OT, no a la OT misma) con los casos B12/B13. Aplicada vía `CREATE OR REPLACE FUNCTION` (sin cambio estructural) en `valpo-verde-conecta-pruebas`: B0–B13 (14/14) aprobadas, cero usuarios de prueba remanentes, asesor de seguridad sin hallazgos nuevos. Confirmado por la responsable que no hace falta repetir la regresión A/P/K/V (no usan esta función), pero sí revertir y reaplicar la 018e **desde el archivo** (`018e_evaluations_preguardado.sql`) para comprobar que el archivo reproduce lo probado — hecho: revertida y reaplicada desde el archivo, B0–B13 (14/14) de nuevo, cero usuarios remanentes, asesor sin hallazgos nuevos. Aprobado el commit + push de todo el bloque. |

---

### CC-049 — Política de Storage para fotos (cierre de AM-14)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-23 |
| Origen | AM-14 (roadmap): el §6 de la Fase 3 no define la política de Storage para el bucket de fotos; la migración 017 (RLS, CC-033) no la tocó porque no existe ningún bucket ni política en `valpo-verde-conecta-pruebas` (verificado). Propuesta de la sesión al planificar el #58/#59 (las 4 vistas fotográficas son requisito de finalización, D-27/REGLAS_GENERALES), con los agregados de la responsable. |
| Tipo | 2 — metodológico/operativo (política de Storage; sin impacto en el Excel más allá de lo ya vigente en PR-010 v4.0) |
| Estado | APROBADO Y PARCIALMENTE IMPLEMENTADO (2026-10-25) — bucket aplicado y probado en `valpo-verde-conecta-pruebas` (migración 019); subida/lectura de fotos de INSPECCIÓN implementada (`POST`/`GET /api/sivu/inspections/:inspectionId/photos`); pendiente: el endpoint ciudadano del formulario público (depende de que exista la creación de incidencias, #62) y la retención tras revisión (punto 10, también #62) |
| Regla / campo afectado | Bucket de Supabase Storage para `photos` (ADR-011); `photos.storage_path`; el formulario público de incidencias (PR-022 v1.0); `incidents.resultado_revision` (punto 10, retención de la foto ciudadana). |
| Versión anterior | Sin política definida (AM-14, PENDIENTE). |
| Versión nueva (completa, 2026-10-25, issue [#74](https://github.com/marybaxmann/valpo-verde-backend/issues/74)) | **(1)** Bucket privado (`tree-photos`), nunca público ni listable. **(2)** Subida siempre a través del backend (nunca el cliente directo a Storage), mismo principio de ADR-014 extendido a Storage. **(3)** Lectura con enlaces firmados, **10 minutos**, generados por el backend solo después de `assertProjectAccess` (miembros del proyecto del árbol) — el formulario público de incidencias solo sube, nunca lee fotos ajenas. **(4)** Máximo **10 MB** por foto — verificado en el backend **y** con `file_size_limit` del bucket (segunda barrera física). **(5)** Solo jpg/png (D-183/D-206/D-224), verificado **por el contenido real** con `sharp` (no por extensión ni `Content-Type`) — **y** `allowed_mime_types` del bucket (segunda barrera). **(6)** Metadatos — **decisión final de la responsable, distinta de la propuesta inicial de la sesión:** el EXIF y el GPS se quitan **solo** de las fotos del formulario ciudadano (PR-022), al re-codificarlas con `sharp`. Las fotos del Inspector se guardan **tal cual, sin recodificar** — su fecha y ubicación son evidencia de que son fotos nuevas de la inspección (D-27); a ellas solo se les verifica el formato real. **(7)** Límite de envíos del formulario público: **10 reportes por hora por IP** (`express-rate-limit`). **(8)** `photos.storage_path` guarda la ruta privada, con ids únicamente (proyecto/árbol/origen/uuid) — **nunca** el nombre o RUT del reportante; el backend resuelve la URL firmada al servir. **(9)** Las 4 vistas obligatorias (D-27) son exactamente el dominio ya vigente de `photos.vista`: `arbol_completo`/`base`/`tronco`/`copa` — sin discrepancia (la sesión había marcado una posible, la responsable la cerró: no hay dos conjuntos de "4 fotos", es uno solo). **(10)** El #59 (todavía no existe) comprueba las 4 vistas con `SELECT array_agg(DISTINCT vista) FROM photos WHERE inspection_id = :id` y exige que las 4 estén presentes antes de permitir finalizar. |
| Retención de la foto ciudadana tras la revisión (decisión nueva, 2026-10-25) | Si la incidencia se valida (`resultado_revision = 'Validada'`), su foto se conserva. Si se descarta (`'Descartada'`), se elimina el archivo de Storage **y** su fila en `photos` — la incidencia conserva constancia de que tenía foto y de que se eliminó por descarte (campo/bandera a definir en el #62, no en esta ficha). Mientras la incidencia esté `'Requiere antecedentes'` o sin resolver, la foto se mantiene. Se implementa junto con el flujo de revisión de incidencias del **#62** (todavía no existe) — puede afectar a AM-15 si cambia el texto vigente de D-183 al redactar esa implementación. |
| Ajustes técnicos aprobados | Bucket configurado con `file_size_limit` (10 MB) y `allowed_mime_types` (`image/jpeg`, `image/png`) como segunda barrera, además de la verificación del backend. Enlaces firmados de 10 minutos, generados solo tras `assertProjectAccess`. Ruta de Storage sin datos personales. Versiones EXACTAS (sin `^`/`~`, a diferencia del resto de `package.json`) de las 3 dependencias nuevas: `sharp@0.35.5`, `multer@2.5.0`, `express-rate-limit@8.7.1` (+ `@types/multer@2.3.0`). |
| Motivo | Sin bucket privado ni subida por el backend, cualquiera con la URL podría ver fotos de árboles de otro proyecto. Sin verificar el contenido real del archivo, la extensión declarada no protege de un archivo ejecutable disfrazado de imagen. Sin quitar EXIF/GPS de las fotos ciudadanas, una foto expone dónde vive o trabaja quien reporta — riesgo de privacidad que el Excel no contempla porque no es metodológico, es de seguridad operativa. Las fotos del Inspector NO se recodifican porque su fecha/ubicación son la evidencia misma de que la inspección se hizo (D-27). |
| Fundamento / fuente | Propuesta de la sesión (2026-10-23), con los agregados y decisiones finales de la responsable (marybaxmann), 2026-10-25. D-27 (4 vistas); D-183/D-206/D-224 (formato); PR-010 v4.0; PR-022 v1.0; ADR-011, ADR-014. |
| Archivos afectados | `database/migrations/019_storage_fotos.sql`/`.down.sql`; `package.json` (versiones exactas de `sharp`/`multer`/`express-rate-limit`); `src/middlewares/{upload,publicFormRateLimit}.middleware.ts`; `src/schemas/sivu/fotos.schema.ts`; `src/repositories/sivu/photo.repository.ts`; `src/services/sivu/photo.service.ts`; `src/controllers/sivu/photo.controller.ts`; `src/routes/sivu/inspection.routes.ts`; `tests/schemas/sivu/fotos.schema.test.ts`; `tests/services/sivu/photo.service.test.ts`. Pendiente: endpoint ciudadano y retención tras revisión (#62). |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno: formato jpg/png y las 4 vistas ya estaban en el Excel; todo lo de esta ficha es operativo (bucket, firmado, tamaño, metadatos, límite de tasa, retención), no metodológico. |
| Impacto en BD | Implementado: bucket `tree-photos` (Supabase Storage, fuera de `schema.sql`) con `file_size_limit`/`allowed_mime_types`, sin ninguna policy de `storage.objects` para `authenticated`/`anon` (todo el acceso pasa por `service_role` desde el backend). `photos` (migración 015) no cambia. |
| Impacto en backend | Implementado para fotos de INSPECCIÓN, con las MISMAS reglas que CC-048/CC-050 (no hay función SQL como `fn_save_inspection_draft` haciendo de autoridad para `photos` — el service las repite completas): solo el Inspector responsable ACTUAL de la OT (`work_orders.responsable_accion_id`, cubre la reasignación sin pasos extra); OT En ejecución e inspección en Preguardado (una Finalizada/Anulada no admite fotos nuevas, para no alterar su evidencia); Evaluación instrumental sin fotos (D-27); vista obligatoria en Evaluación inicial/Reevaluación/Levantamiento, opcional en Monitoreo. Todo se valida ANTES de subir; si falla la inserción en `photos` después de subir el archivo, se borra de Storage (`remove`) antes de propagar el error — nunca queda huérfano. `verificarYProcesarFoto` (decodifica con `sharp`, verifica jpg/png por contenido real, recodifica y quita EXIF/GPS solo si `quitarMetadatos=true` — las de Inspector llegan con `false`, se guardan tal cual); subida con `service_role`; enlace firmado de 10 min generado tras `assertProjectAccess`. `express-rate-limit` (10/hora/IP) escrito y listo (`publicFormRateLimit.middleware.ts`), **sin adjuntar a ninguna ruta todavía** — no existe el endpoint público (#62). Pendiente: ese endpoint ciudadano (con `quitarMetadatos=true`) y la retención tras revisión. |
| Impacto en API | Implementado: `POST /api/sivu/inspections/:inspectionId/photos` (subir, `multipart/form-data`, campo `foto` + `vista`, solo Inspector) y `GET /api/sivu/inspections/:inspectionId/photos` (listar con enlaces firmados, cualquier rol con acceso al proyecto). Pendiente: endpoint del formulario ciudadano (#62); nunca una URL de Storage expuesta directamente al cliente. |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | Bucket (verificadas, migración 019): `file_size_limit`/`allowed_mime_types`/`public=false` correctos; `storage.objects` con RLS habilitada y cero policies. Backend de fotos de inspección (verificadas, Jest — 14 casos, imágenes reales generadas por `sharp`, no mockeado): jpg/png real aceptado por su contenido; archivo que no es imagen real → 400, sin subir nada; otro Inspector (no el responsable de la OT) → 403; OT no En ejecución → 422; inspección Finalizada o Anulada → 422; Evaluación instrumental → 422 (ninguna foto); Evaluación inicial sin `vista` → 422; Monitoreo sin `vista` → aceptado; con `quitarMetadatos=false` (Inspector) el EXIF se conserva; con `quitarMetadatos=true` (ciudadana) el EXIF desaparece; falla la inserción después de subir el archivo → se borra de Storage antes de propagar el error; cualquier rol con acceso lista (`assertProjectAccess`), enlace firmado por foto, nunca una URL fija. Multer (middleware, no cubierto por Jest): archivo > 10 MB → 413. Pendiente al implementar el endpoint ciudadano (#62): envíos excesivos (>10/hora/IP) limitados; foto de una incidencia Descartada → se elimina (archivo + fila). |
| Dependencias | AM-14 (cierra); PR-010 v4.0; PR-022 v1.0; ADR-011, ADR-014; issue [#74](https://github.com/marybaxmann/valpo-verde-backend/issues/74) (esta política); issue #62 (retención tras revisión; límite de tasa del formulario público). |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-23 (inicial); 2026-10-25 (decisiones finales: metadatos solo ciudadanas, límite 10/hora/IP, retención tras revisión, ajustes técnicos) |
| Fecha de implementación | 2026-10-25 (bucket, migración 019; backend de fotos de inspección) |
| Commits / PR asociados | Pendiente (por aprobar) |
| Observaciones | El bucket y la subida/lectura de fotos de inspección ya están implementados y probados en `valpo-verde-conecta-pruebas`. El endpoint ciudadano (con la recodificación/EXIF real en uso) y la retención tras revisión quedan para cuando exista el #62 — no bloquean el resto del orden de trabajo acordado. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial. Cierra AM-14. Implementación (bucket, políticas, servicio de subida) pendiente. |
| 2026-10-25 | APROBADO (decisiones finales) | marybaxmann | Metadatos: EXIF/GPS solo en fotos ciudadanas, las del Inspector sin recodificar. Límite del formulario público: 10/hora/IP. Retención de la foto ciudadana según `resultado_revision` (nueva decisión, implementa el #62). Ajustes técnicos: `file_size_limit`/`allowed_mime_types` en el bucket, enlaces de 10 min, ruta sin datos personales, versiones exactas de `sharp`/`multer`/`express-rate-limit`. Confirmado: las 4 vistas obligatorias son el dominio vigente de `photos.vista` (D-27), sin discrepancia. |
| 2026-10-25 | IMPLEMENTADO (bucket) | marybaxmann | Migración 019 aplicada y probada en `valpo-verde-conecta-pruebas`; revertir por SQL bloqueado por Supabase (`storage.protect_delete()`) — la 019 se reescribió idempotente y se verificó reaplicándola, `list_migrations` sin entradas a medias, asesor de seguridad sin hallazgos nuevos. |
| 2026-10-25 | IMPLEMENTADO (backend, fotos de inspección) | marybaxmann | `POST`/`GET /api/sivu/inspections/:inspectionId/photos` — subida (solo Inspector, sin recodificar) y lectura con enlace firmado (cualquier rol con acceso). Verificado con imágenes reales (`sharp`, sin mockear): formato por contenido, EXIF conservado para Inspector y removido cuando se pide. Pendiente: endpoint ciudadano y retención tras revisión (#62). |

---

### CC-050 — Estados de la orden de trabajo (OT)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-23 |
| Origen | DA-04 (roadmap, PA-07: "matrices y datos por transición, T-01 a T-13") — pendiente de decisión desde la auditoría postdemo. Decisión de la responsable al planificar el #58, para las OT de tipo Inspección. |
| Tipo | 2 — metodológico (transiciones de estado; detalla y en un punto corrige D-239/D-241) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | `work_orders.estado_ot` (D-239), `.fecha_accion_programada` (D-241), `.responsable_accion_id` (D-244); `inspections.estado_registro` (indirectamente, vía `fn_save_inspection_draft`). |
| Versión anterior | D-239 solo definía el dominio (Pendiente/Programada/En ejecución/Completada/Cancelada) y la regla de Mantenimiento; no decía quién hace cada transición de una OT de Inspección, ni qué pasa al cancelar o reasignar. D-241 decía que `fecha_accion_programada` la ingresa el Usuario municipal. |
| Versión nueva | **Pendiente:** valor inicial, al crearla el Usuario municipal. **Pendiente → Programada → En ejecución:** solo las hace el responsable asignado (`responsable_accion_id`): el Inspector si `Tipo_ot = Inspección`, el Encargado de mantención si `Tipo_ot = Mantenimiento`. Al pasar a Programada, el responsable ingresa `fecha_accion_programada` — **cambia el "quién lo ingresa" de D-241** (hoy dice Usuario municipal); va a AM-15. **Registro de la inspección:** el Inspector solo puede crear o guardar una inspección (incluido el Preguardado) cuando la OT está **En ejecución** — implementado en `fn_save_inspection_draft` (018e; CC-048), rechaza con SV058 cualquier otro estado. **Completada (OT de Inspección):** la marca el Usuario municipal. Requisitos: ninguna inspección en Preguardado (D-239, ya vigente) **y al menos una Finalizada** (adición: D-239 no lo exigía — sin esto, una OT sin ninguna inspección registrada podría completarse trivialmente). Al completarla se registra `fecha_completada_ot` y los datos pasan a ser vigentes (#60). Las OT de Mantenimiento siguen como dice el Excel (D-239, REGLAS_GENERALES "Revisión de mantenimiento") — sin cambios. **Cancelada:** la cancela el Usuario municipal desde Pendiente, Programada o En ejecución, con motivo; se notifica al responsable (CC-051). Sus inspecciones en Preguardado se conservan como historial, de solo lectura, y nunca pasan a ser vigentes. Una OT cancelada no se reabre: si hace falta, se crea una nueva. **Cambio de responsable:** el Usuario municipal puede cambiarlo mientras la OT no esté Completada ni Cancelada; se notifica al nuevo y al anterior (CC-051). Los borradores en Preguardado se mantienen y solo el nuevo responsable puede continuarlos; el anterior pierde el acceso. Se conserva quién registró cada dato (autoría histórica, D-207). |
| Motivo | DA-04/PA-07 quedaron pendientes desde la auditoría postdemo; sin estas reglas, el #58 no podía implementarse de forma consistente (¿quién puede guardar una inspección, y cuándo?) ni el #59/#61 (finalización, cierre de Mantenimiento). El requisito de "al menos una Finalizada" para completar cierra un vacío real: D-239 solo prohibía completar con inspecciones en Preguardado, pero no exigía que existiera al menos una — permitiendo completar una OT sin ninguna inspección real. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-23. |
| Archivos afectados | `database/migrations/018e_evaluations_preguardado.sql` (`fn_save_inspection_draft`, punto "Registro de la inspección"); `database/migrations/018g_transicion_estados_ot_inspeccion.sql` y `.down.sql` (`fn_transition_work_order_estado`, SQLSTATE nuevo `SV059`); `database/fase6/pruebas_018g_transicion_estados_ot.sql` (G1–G7); esta ficha. Completada, Cancelada, cambio de responsable y notificaciones siguen en su propio bloque, fuera del #58. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: D-241 columna "¿Quién lo ingresa?" (Usuario municipal → el responsable asignado, al pasar a Programada) y D-239 columna de validación (agregar "y al menos una inspección Finalizada" al requisito de Completada) — en la próxima versión del paquete (AM-15). |
| Impacto en BD | Implementado en 018e: `fn_save_inspection_draft` exige `estado_ot = 'en_ejecucion'`. Implementado en 018g: `fn_transition_work_order_estado` (Pendiente→Programada→En ejecución, solo el responsable Inspector, con la validación de D-241 agregada por la responsable: `fecha_accion_programada` no puede ser anterior a `fecha_creacion_ot`). Pendiente: Completada, Cancelada, cambio de responsable (issue por asignar); Mantenimiento (#61, mismo criterio de CC-050, Encargado de mantención). |
| Impacto en backend | Implementado (2026-10-25) para Pendiente→Programada→En ejecución: `src/repositories/sivu/workOrder.repository.ts`, `src/services/sivu/workOrder.service.ts` invocan `fn_transition_work_order_estado`. El resto — Completada, Cancelada, reasignación, Mantenimiento (#61) — pendiente, issue por asignar. |
| Impacto en API | Implementado (2026-10-25): `PATCH /api/sivu/work-orders/:workOrderId/estado`. |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | Implementadas en `database/fase6/pruebas_018e_inspection_draft.sql`: B0, B3. Implementadas en `database/fase6/pruebas_018g_transicion_estados_ot.sql`: G1 (Programada sin fecha, rechazado), G2 (fecha anterior a la creación de la OT, rechazado, D-241), G3 (Programada con fecha válida, aceptado), G4 (Programada→En ejecución, aceptado), G5 (salto directo Pendiente→En ejecución, rechazado), G6 (otro usuario, rechazado), G7 (OT de Mantenimiento, rechazado — remite al #61). G1–G7: 14/14 en dos rondas (aplicar → probar → revertir → reaplicar → probar), sin usuarios de prueba remanentes, asesor de seguridad sin hallazgos nuevos. Pendientes (issue por asignar): Completada exige al menos una Finalizada; cancelación con motivo y notificación; cambio de responsable con notificación y pérdida/transferencia de acceso al borrador. |
| Dependencias | DA-04, PA-07 (roadmap); D-239, D-241, D-244; CC-048 (018e, punto "Registro de la inspección"); CC-051 (notificaciones de cancelación y reasignación); #58, #59, #61. |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-23 |
| Fecha de implementación | Parcial: 2026-10-23 (018e punto 3; 018g Pendiente→Programada→En ejecución). El resto, pendiente. |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | Decisión completa registrada. 018g aplicada y probada en `valpo-verde-conecta-pruebas`, dos rondas completas. Completada/Cancelada/reasignación y Mantenimiento (#61) necesitan un issue propio — no se mezclan con el #58. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial. Punto 3 (OT En ejecución para guardar una inspección) implementado en la 018e; el resto queda pendiente de un issue propio. |
| 2026-10-23 | IMPLEMENTADO (pruebas) | marybaxmann | Aprobada con ajustes: (1) confirmado sin saltos; (2) corregido el comentario/mensaje de Mantenimiento (CC-050 también aplica, lo hace el Encargado de mantención, se implementa en el #61 — no "sigue el flujo del Excel sin cambios"); (3) agregada la validación de D-241 (fecha_accion_programada no anterior a fecha_creacion_ot) con su prueba (G2). Aplicada 018g en `valpo-verde-conecta-pruebas`: G1–G7 (14/14, dos rondas), cero usuarios de prueba remanentes, asesor de seguridad sin hallazgos nuevos. |

---

### CC-051 — Notificaciones (aviso en SIVU + correo)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-23 |
| Origen | CC-050 (cancelación de una OT, cambio de responsable): ambos eventos requieren notificar a uno o más usuarios. Decisión de la responsable sobre el mecanismo. |
| Tipo | 3 — modelo de datos / arquitectura (nuevo mecanismo transversal; sin impacto en el Excel) |
| Estado | APROBADO — la propuesta técnica (tabla, proveedor, datos mínimos, tolerancia a fallos) aprobada el 2026-10-23 para cuando se implemente; bloque propio, independiente del #58 |
| Regla / campo afectado | Ninguno del Excel. Mecanismo nuevo, transversal a cualquier evento que deba notificarse. |
| Versión anterior | No existía ningún mecanismo de notificación. |
| Versión nueva | Notificación por **dos vías**: un aviso dentro de SIVU (persistente, se puede marcar como leído) y un correo electrónico. Eventos iniciales (solo estos dos, por ahora): cancelación de una OT (al responsable) y cambio de responsable de una OT (al nuevo y al anterior). **Lectura de avisos:** `SELECT` por RLS, cada usuario solo ve los propios; **marcar como leído siempre a través del backend** (CC-033: ninguna escritura directa de `authenticated`/`anon`), nunca un `UPDATE` directo del cliente. **El proveedor de correo es un tercero que trata datos personales** (los correos de los usuarios notificados) — queda anotado como tal; su elección definitiva y el acuerdo/términos correspondientes quedan para cuando se implemente. **Dominio remitente verificado:** hace falta uno (p. ej. `notificaciones@sivu...`) antes de poder enviar correo con cualquier proveedor transaccional — lo consigue la responsable antes de implementar; sin él, este bloque no puede implementarse. Es un bloque propio, independiente del #58 — no se implementa como parte de él. |
| Motivo | CC-050 exige notificar estos dos eventos; sin un mecanismo definido, no se puede implementar esa parte de CC-050. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-23. |
| Archivos afectados | Ninguno todavía — propuesta escrita, sin implementar. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno. |
| Impacto en BD | Pendiente de implementar: tabla `notifications` (`id`, `user_id`, `tipo`, `work_order_id`, `mensaje`, `leido_at` NULL = no leído, `email_enviado`, `email_error`, `created_at`); RLS: `SELECT` solo de filas propias, sin política de escritura para `authenticated`/`anon` (CC-033). |
| Impacto en backend | Pendiente: servicio de notificaciones (aviso + correo), independiente del #58; endpoint para marcar como leído (único camino de escritura, con `service_role`, tras verificar que el aviso es del usuario autenticado). |
| Impacto en API | Pendiente: listar avisos propios; marcar uno como leído (solo a través del backend). |
| Impacto en frontend | Ninguno todavía (Fase 7): bandeja de avisos. |
| Pruebas necesarias | Por definir al implementar: se crea el aviso al cancelar/reasignar; se marca como leído solo a través del backend (un intento directo del cliente se rechaza por RLS); el correo no bloquea el aviso dentro de SIVU si falla; el correo no incluye más datos personales que los mínimos necesarios; un usuario no puede leer avisos de otro. |
| Dependencias | CC-050 (eventos que disparan la notificación); CC-033 (RLS, ninguna escritura directa); dominio remitente verificado (a conseguir por la responsable) y elección del proveedor de correo (tercero que trata datos personales) antes de implementar. |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-23 |
| Fecha de implementación | — |
| Commits / PR asociados | — |
| Observaciones | Proveedor de correo sin elegir todavía (tercero que tratará datos personales — correos de los usuarios). Dominio remitente verificado: pendiente, lo consigue la responsable. Bloque propio: no se mezcla con el #58. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-23 | APROBADO METODOLÓGICAMENTE (el qué) | marybaxmann | Registro inicial. Diseño técnico (el cómo) propuesto por escrito. |
| 2026-10-23 | APROBADO | marybaxmann | Propuesta técnica aprobada para cuando se implemente: tabla `notifications`, RLS de solo lectura propia con escritura (marcar leído) únicamente por el backend, proveedor de correo anotado como tercero que trata datos personales, dominio remitente verificado pendiente (lo consigue la responsable antes de implementar). |

---

### CC-052 — Árbol nuevo durante un Levantamiento: es un alta

| Campo | Valor |
|---|---|
| Fecha | 2026-10-23 |
| Origen | Propuesta de la sesión (sin implementar, al planificar el #58) sobre cómo registra el Inspector un árbol nuevo durante una OT de Levantamiento — la propuesta inicial ("solo identidad en `trees`, sin fila de alta") no funciona: `trees` exige especie o nombre común (`CONSTRAINT chk_trees_especie_o_comun`, migración 013) y sin una fila de alta en `tree_data_versions` (`inspection_id IS NULL`), si la inspección se anula, `fn_refresh_tree_current` deja el árbol con todos los campos en `NULL` — el mismo defecto de fondo que CC-048 encontró y corrigió para el #57 (018d). Decisión de la responsable. |
| Tipo | 2 — metodológico (cómo se aplican D-2/D-193/REGLAS_GENERALES fila 17 cuando el árbol de un Levantamiento es nuevo) |
| Estado | IMPLEMENTADO (pruebas) |
| Regla / campo afectado | `fn_save_inspection_draft` (018e/#58): nueva rama para `p_tree_id IS NULL` en una OT de Levantamiento. `trees`, `tree_data_versions` (fila de alta, `inspection_id IS NULL`). |
| Versión anterior | Sin decidir — la propuesta de la sesión (crear solo la identidad del árbol en el primer guardado, sin datos, vigente solo al completar la OT) quedaba inconsistente con `chk_trees_especie_o_comun` y con el mismo defecto que CC-048/018d ya corrigió para el alta municipal. |
| Versión nueva | La creación de un árbol nuevo por el Inspector durante un Levantamiento **es un alta** (REGLAS_GENERALES fila 17: "puede registrar árboles nuevos... sin un alta municipal previa"; D-2: "permitir el registro... por el Inspector durante una OT de levantamiento"). En el **primer guardado** de la inspección: se crea el árbol en `trees` **y**, en la misma operación atómica, su fila de alta en `tree_data_versions` (`inspection_id IS NULL`) con los datos mínimos del alta (D-7 a D-10: `sector`, `ubicacion_descriptiva`, `utm_este`, `utm_norte`; D-13/D-14: al menos `especie_cientifica` o `nombre_comun`) — mismas validaciones que `fn_create_tree_alta` (018d): dentro del sector del proyecto de la OT (CC-046, `trg_trees_dentro_sector`/`trg_tree_data_versions_dentro_sector`), `chk_trees_especie_o_comun`. **Esos datos mínimos rigen de inmediato**, igual que un alta municipal (vía la fila `inspection_id IS NULL` que usa `fn_refresh_tree_current` como respaldo). **Los datos técnicos de la inspección** (el resto de ARBOLES y REGISTRO_EVALUACION que el Inspector registre en el Levantamiento) **rigen al completar la OT**, igual que cualquier otra inspección (REGLAS_GENERALES fila 17: "las modificaciones posteriores al alta se hacen vigentes al completar la OT"). **Si la OT se cancela**, el árbol queda en el inventario como un árbol normal, con sus datos mínimos vigentes desde el alta y «Evaluación pendiente» (sin ninguna inspección Finalizada todavía) — nunca se borra ni se marca distinto a cualquier otro árbol sin evaluación todavía (D-2: "conservar su identificador... no duplicar el árbol"). **Para evitar duplicados**, el backend debe ofrecer una búsqueda de árboles del mismo proyecto cercanos a una coordenada (`ST_DWithin` sobre la ubicación) antes de que el Inspector decida crear uno nuevo. El radio de búsqueda y la pantalla quedan para la Fase 7 (decisión de UX, no metodológica). |
| Motivo | Sin tratarlo como un alta, no hay dónde respaldar los datos del árbol si la inspección que lo originó se anula — el mismo vacío que CC-048 corrigió para el #57, aplicado aquí al mismo escenario con un árbol sin alta municipal previa. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-23. REGLAS_GENERALES fila 17 (B17); D-2 (ARBOLES.id_arbol); D-193 (INSPECCION.id_arbol); AMD-19. |
| Archivos afectados | `database/migrations/018f_levantamiento_arbol_nuevo.sql` y `.down.sql`; `database/fase6/pruebas_018f_levantamiento.sql` (L1–L7); esta ficha. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno: D-2/D-193/REGLAS_GENERALES fila 17 ya lo permiten; esta ficha decide cómo se implementa, no cambia el Excel. |
| Impacto en BD | Aplicado (018f): `fn_save_inspection_draft` gana 6 parámetros opcionales (datos mínimos del alta); cuando `tree_id` llega NULL en el primer guardado de un Levantamiento, crea `trees` y su fila de alta en `tree_data_versions` (`inspection_id IS NULL`) en la misma transacción. A partir del segundo guardado, `tree_id` es obligatorio (necesidad técnica directa del propio diseño: evita crear un árbol nuevo en cada guardado). La respuesta de la función ahora incluye `tree_id` y `arbol_nuevo`. |
| Impacto en backend | Pendiente (#58): el servicio debe ofrecer la búsqueda de árboles cercanos (`ST_DWithin`) antes de permitir "crear árbol nuevo". |
| Impacto en API | Pendiente: endpoint de búsqueda de árboles cercanos por proyecto y coordenada. |
| Impacto en frontend | Ninguno todavía (Fase 7): radio de búsqueda y pantalla de selección. |
| Pruebas necesarias | `database/fase6/pruebas_018f_levantamiento.sql`: L1 (primer guardado sin tree_id crea árbol + alta + borrador), L2 (segundo guardado sin tree_id se rechaza; con el tree_id de L1, actualiza sin duplicar), L3 (árbol nuevo fuera del sector se rechaza, SV046, sin ninguna fila creada), L4 (alta sin especie ni nombre común se rechaza, SV057), L5 (finalizar la inspección, completar la OT, anular la inspección y correr fn_refresh_tree_current — el árbol conserva sus datos de alta), L6 (OT cancelada — el árbol sigue en el inventario con sus datos de alta), L7 (dos árboles nuevos en la misma OT de Levantamiento, uno por inspección, AMD-19). L1–L7: 14/14 en dos rondas (aplicar → probar → revertir → reaplicar → probar), cero usuarios de prueba remanentes, asesor de seguridad sin hallazgos nuevos. |
| Dependencias | CC-048 (mismo defecto de fondo, corregido antes para el #57); CC-050 (OT de Levantamiento); D-2, D-193, REGLAS_GENERALES fila 17, AMD-19; `fn_create_tree_alta` (018d, mismo patrón de alta). |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-23 |
| Fecha de implementación | 2026-10-23 (aplicada y probada en `valpo-verde-conecta-pruebas`, dos rondas completas). |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | El qué (es un alta) y el cómo (018f) están aprobados y aplicados. La búsqueda de árboles cercanos (backend/API/UX) queda pendiente para el #58/Fase 7. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-23 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial. La propuesta original de la sesión (sin fila de alta) fue rechazada por la responsable por las dos razones técnicas de "Origen". Implementación (018f) pendiente de mostrar y aplicar. |
| 2026-10-23 | IMPLEMENTADO (pruebas) | marybaxmann | Aprobada con el script de pruebas pedido (L1–L7). Aplicada 018f en `valpo-verde-conecta-pruebas`: L1–L7 (14/14, dos rondas: aplicar → probar → revertir → reaplicar → probar), cero usuarios de prueba remanentes, asesor de seguridad sin hallazgos nuevos. Búsqueda de árboles cercanos (backend/API/UX) queda pendiente para el #58/Fase 7. |

---

### CC-053 — Catálogo de especies incorporado por el Inspector

| Campo | Valor |
|---|---|
| Fecha | 2026-10-25 |
| Origen | Decisión de la responsable al planificar el issue "[Fase 6] Catálogo de especies por el Inspector" (posterior al #58). Fuentes: CATALOGO_ESPECIES (D-257 a D-262), D-13 (ARBOLES.especie_cientifica), REGLAS_GENERALES "Roles" filas 16–18. |
| Tipo | 2 — metodológico (+3 modelo de datos, punto 5) |
| Estado | APROBADO METODOLÓGICAMENTE — migración 018i aplicada y probada (E1–E10 y regresión completa A/L/B/G/V, dos rondas apply→revert→reapply, cero diferencias); capa backend (búsqueda, completar, corregir) implementada. Pendiente: la incorporación automática al finalizar una inspección (punto 3) la invoca el #59, que todavía no existe; `fn_resolve_or_create_species` ya está lista para esa llamada. |
| Regla / campo afectado | `species` (CATALOGO_ESPECIES: `especie_cientifica`, `genero`, `familia`, `origen_biogeografico`, `persistencia_follaje`, `tipo_hoja`, D-257 a D-262); `trees`/`tree_data_versions.especie_cientifica` (D-13); `v_species_traits`. |
| Alcance del catálogo | **Global, compartido por todos los proyectos** — `species` no tiene `project_id` ni ninguna columna de alcance (CATALOGO_ESPECIES no depende del proyecto). Corregir el nombre de una especie desde un proyecto actualiza el nombre vigente de los árboles de TODOS los proyectos que la usan, no solo del proyecto desde el que se llamó. Las rutas de la API cuelgan de `/api/sivu/projects/:id/species` únicamente para que `assertProjectAccess`/`assertProjectRole` verifiquen que quien llama tiene acceso a ALGÚN proyecto (y, para completar/corregir, rol Inspector en él) — el `:id` del proyecto no filtra ni acota el catálogo que se busca ni la especie que se completa o renombra. |
| Versión anterior | `species` existe desde la migración 012, pero sin conexión estructural a `trees`/`tree_data_versions`: `v_species_traits` empareja por **texto normalizado** (`lower(trim(especie_cientifica))`), nunca por `id` — D-257 ya decía "la plataforma lo vincula al árbol mediante especie_cientifica", pero el texto nunca se resolvió con un identificador estable. No existía ningún flujo para que el Inspector incorporara o corrigiera una especie desde una inspección. |
| Versión nueva | **(1) Para qué:** el Inspector elige `especie_cientifica` de una lista del catálogo al evaluar, para automatizar el registro. **(2) Selección:** en la evaluación, el Inspector elige de una lista (hace falta un endpoint de búsqueda por nombre); si la especie no está, la escribe — no bloquea el guardado (D-257: "la ausencia de la especie en el catálogo no bloquea el registro del árbol"). **(3) Incorporación automática:** una especie escrita que no existe en el catálogo se agrega **al finalizar la inspección (#59), no al guardar el borrador** — comparada por su forma normalizada (espacios y mayúsculas, D-13: "evitar duplicidades por diferencias de escritura") para no duplicar, con su `created_by` (el Inspector). **(4) Completar la especie:** después, el Inspector completa `genero`, `familia`, `origen_biogeografico`, `persistencia_follaje` y `tipo_hoja` — los cinco opcionales hasta que se conozcan; nunca se inventan ni bloquean nada (D-258 a D-262: "si aún no se conoce, dejar nulo; no inventarlo ni bloquear el registro del árbol"). **Solo el Inspector incorpora y corrige especies** (REGLAS_GENERALES fila 18) — una especie escrita por el Usuario municipal en el alta **no** se agrega al catálogo; queda en el árbol (como texto, sin vínculo al catálogo) hasta que un Inspector la confirme en una inspección (D-13: "el Inspector confirma o corrige la identificación mediante OT; el cambio se hace vigente al completarla"). **(5) Corrección del nombre:** si el Inspector corrige el nombre de una especie ya incorporada, se actualizan todos los árboles que la usaban y el nombre anterior queda en el historial — diseño propuesto más abajo (pendiente de aprobación antes de implementar). |
| Diseño del punto 5 — aprobado (2026-10-25), sin implementar todavía | **Problema de fondo (detectado por la responsable):** `fn_refresh_tree_current` recalcula `trees` leyendo el `especie_cientifica` (texto) de la fila de `tree_data_versions` vigente más reciente. Si una corrección de nombre solo actualizara `trees.especie_cientifica`, la siguiente OT completada volvería a escribir el nombre VIEJO desde esa fila de `tree_data_versions` (que nunca se tocó) — la corrección se perdería en la próxima vigencia. **Propuesta:** agregar `species_id uuid REFERENCES species(id)` (nullable) a `trees` y a `tree_data_versions`, junto al `especie_cientifica` (texto) que ya existe en ambas — no se reemplaza el texto, se agrega el vínculo estable. Cuando el Inspector confirma o incorpora una especie en una inspección, esa fila de `tree_data_versions` lleva tanto el texto ingresado como el `species_id` resuelto (el de la especie existente, o el de la fila nueva que se creó al finalizar, #59). `fn_refresh_tree_current` se ajusta para que el campo vigente de especie se resuelva así: si la fila vigente tiene `species_id`, el nombre vigente es **`species.especie_cientifica` leído en ese momento** (siempre el nombre actual del catálogo, inmune a un renombre posterior); si no tiene `species_id` (especie escrita, todavía sin confirmar por un Inspector), el nombre vigente sigue siendo el texto de esa fila, igual que hoy. Así, corregir `species.especie_cientifica` una sola vez actualiza automáticamente a TODOS los árboles vinculados por `species_id`, sin tocar `trees` ni `tree_data_versions` fila por fila. **Historial de cambios de nombre:** tabla nueva `species_name_history` (`id`, `species_id`, `nombre_anterior`, `nombre_nuevo`, `changed_by`, `changed_at`), de solo inserción, escrita por la función que corrige el nombre — conserva "el nombre anterior" sin necesidad de guardar nada adicional en `trees`/`tree_data_versions` (esas filas ya conservan, en su propio `especie_cientifica` de texto, el nombre tal como se escribió en su momento — un historial implícito, fila por fila, independiente del historial explícito de la especie). **`v_species_traits`:** hoy empareja solo por texto normalizado; se ajusta para preferir `species_id` (unión por `id`, inmune a renombres) cuando `trees.species_id` no es NULL, y mantener el emparejamiento por texto normalizado como respaldo solo para árboles sin `species_id` todavía (especie escrita, sin confirmar). |
| Pruebas exigidas para la migración del punto 5 (issue #73, antes de aplicar) | (a) renombrar una especie actualiza el nombre vigente de todos los árboles vinculados por `species_id`, incluso después de completar una OT y correr `fn_refresh_tree_current` (la prueba de fondo: confirma que no se vuelve a leer el nombre viejo desde `tree_data_versions`); (b) el nombre anterior queda registrado en `species_name_history`; (c) un árbol con una especie escrita que no está en el catálogo (`species_id IS NULL`) conserva su texto sin cambios. |
| Nota para el #59 (finalización) | En el #58, el borrador acepta cualquier `especie_cientifica` no vacía (sin tocar `species`) — correcto, se deja así. Según D-13, el control de catálogo va al finalizar (#59): se exigen `especie_cientifica` y `nombre_comun`, no se admiten "Género sp." ni "No determinado" (mismo `CHECK` que ya tiene `species`, `chk_species_especie_cientifica_valida`, migración 012); si falta alguno, la inspección queda en Preguardado. La incorporación automática al catálogo (punto 3) y la resolución de `species_id` (diseño del punto 5) ocurren en ese mismo paso de finalización. |
| Motivo | Sin un catálogo poblado por el Inspector, cada árbol repite manualmente género/familia/origen/persistencia/tipo de hoja — datos que son de la ESPECIE, no del ejemplar, y que ya existen en `species` sin usarse. Sin vincular por `id`, una corrección de nombre no se propaga de forma confiable (el defecto que la responsable detectó). |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-25. D-13; D-257 a D-262 (CATALOGO_ESPECIES); REGLAS_GENERALES filas 16–18 ("Roles"). |
| Archivos afectados | `database/migrations/018i_catalogo_especies.sql`/`.down.sql`; `database/fase6/pruebas_018i_catalogo_especies.sql`; `src/schemas/sivu/especies.schema.ts`; `src/repositories/sivu/species.repository.ts`; `src/services/sivu/species.service.ts`; `src/controllers/sivu/species.controller.ts`; `src/routes/sivu/project.routes.ts`; `tests/schemas/sivu/especies.schema.test.ts`; `tests/services/sivu/species.service.test.ts`. |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno: D-13 y D-257 a D-262 ya exigían esto; esta ficha decide cómo se implementa. |
| Impacto en BD | Implementado (018i): `trees.species_id` reutilizada tal cual (ya existía desde la migración 001, FK a `species(id)`); `tree_data_versions.species_id` agregada; `species_name_history`; `fn_refresh_tree_current` y `v_species_traits` ajustadas; `fn_rename_species` (SV061), `fn_complete_species` (SV062), `fn_resolve_or_create_species` (SV063, sin llamador todavía — lista para el #59). |
| Impacto en backend | Implementado: búsqueda por nombre (`species.service.ts#buscarEspecies`, cualquier rol con acceso al proyecto); completar campos y corregir nombre (`completarEspecie`/`renombrarEspecie`, solo Inspector). Pendiente: la invocación de `fn_resolve_or_create_species` al finalizar una inspección (#59). |
| Impacto en API | Implementado: `GET /api/sivu/projects/:id/species?nombre=...`; `PATCH /api/sivu/projects/:id/species/:speciesId` (completar); `PATCH /api/sivu/projects/:id/species/:speciesId/nombre` (corregir, 409 si el nombre ya existe). El guardado de la inspección (#58) no cambia. |
| Impacto en frontend | Ninguno todavía (Fase 7): lista de selección de especies, con opción de escribir una nueva. |
| Pruebas necesarias | SQL (`pruebas_018i_catalogo_especies.sql`, E1–E10, corridas dos veces con apply→revert→reapply): renombrar propaga incluso tras completar una OT y correr `fn_refresh_tree_current` (E1); nombre anterior en `species_name_history` (E2); especie sin confirmar conserva su texto aunque otra se renombre (E3); rechazo de rol en las 3 funciones nuevas (E4/E5/E7); `fn_resolve_or_create_species` no duplica por forma normalizada (E6); incorpora con `created_by` (E7); `v_species_traits` no pierde los rasgos tras un renombre (E8); colisión de nombre → 23505 (E9); especie confirmada no vincula `trees.species_id` hasta completar la OT (E10). Jest: `especies.schema.test.ts` (16 casos) y `species.service.test.ts` (12 casos) — autorización, merge de campos no enviados, 404/409/422/400. |
| Dependencias | D-13; D-257 a D-262; REGLAS_GENERALES "Roles" (filas 16–18); `species` (migración 012); `v_species_traits` (migración 016); #58 (sin cambios); #59 (finalización, donde se incorpora/vincula la especie). |
| rule_version | sin cambios |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-25 |
| Fecha de implementación | 2026-10-25 |
| Commits / PR asociados | Pendiente (por aprobar) |
| Observaciones | El qué (puntos 1 a 4) y el cómo del punto 5 (diseño) están aprobados e implementados. La incorporación automática (punto 3) queda para el #59. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial, puntos 1 a 5. Diseño técnico del punto 5 propuesto por la sesión, pendiente de aprobación antes de implementar. |
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Aprobada la dirección del diseño del punto 5 (`species_id` en `trees`/`tree_data_versions`, resolución vigente desde el catálogo, `species_name_history`, `v_species_traits` por `species_id` primero). Se implementa en el #73, después del #58, con la migración mostrada antes de aplicar y las 3 pruebas exigidas (renombrar propaga incluso tras completar una OT; nombre anterior en el historial; especie sin confirmar conserva su texto). |
| 2026-10-25 | IMPLEMENTADO (BD + backend) | marybaxmann | Corrección antes de aplicar: `trees.species_id` ya existía (migración 001) — la 018i solo agrega `tree_data_versions.species_id`, no toca `trees`. Migración 018i aplicada y probada (E1–E10, más E9 colisión→409 y E10 vínculo solo tras completar OT, agregados a pedido). Regresión completa (A/L/B/G/V) corrida dos veces (antes y después de revertir/reaplicar), sin diferencias. Capa backend (búsqueda/completar/corregir) implementada y probada (Jest 28/28, tsc limpio). Todas las llamadas SQL a funciones con varios parámetros del mismo tipo convertidas a notación con nombre (12 archivos de prueba revisados; solo la 018i nueva tenía una inversión real, corregida). |

---

### CC-054 — Finalizar una inspección en dos pasos (calcular y finalizar)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-25 |
| Origen | Planificación del #59 (finalizar una inspección) y #72 (integración del motor de reglas). Al diseñar la finalización se detectó que el Excel asigna `estado_registro` automáticamente al guardar, pero el Inspector necesita ver los valores calculados antes de ajustar clasificaciones o fechas. Decisión de la responsable. |
| Tipo | 2 — metodológico (cómo y cuándo se asigna `estado_registro = Finalizado`) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | D-209 (INSPECCION.`estado_registro`, columnas «Cómo se obtiene» y «Condición de activación»); D-173 (`justificacion_ajuste_clasificacion`); D-204 (`justificacion_ajuste_fecha`); CC-044. |
| Versión anterior | D-209, «Cómo se obtiene»: "Asignación automática según la completitud de los datos obligatorios aplicables de la inspección." «Condición de activación»: "Al guardar la inspección." Leído literalmente, una inspección completa pasaría a Finalizado en el mismo guardado en que se completa el último dato obligatorio. |
| Versión nueva | La finalización ocurre en **dos pasos explícitos del Inspector**. **(1) Calcular:** con el borrador guardado, la plataforma calcula las clasificaciones y las fechas sugeridas con los valores vigentes del árbol y los registrados en la inspección, y las muestra al Inspector, junto con los campos que falten para finalizar. Este paso no escribe nada. **(2) Finalizar:** el Inspector confirma, con los ajustes de clasificación que quiera registrar (D-173, CC-044) y las fechas ajustadas que correspondan (D-204). La plataforma vuelve a verificar la completitud (alcance por tipo de inspección, REGLAS_GENERALES fila 28/CC-040; D-13; las cuatro vistas de D-27), recalcula y guarda el resultado; recién ahí la inspección pasa a Finalizado. **Una inspección completa sigue en Preguardado hasta que el Inspector finaliza de forma explícita.** La regla de completitud de D-209 no cambia — sigue siendo la condición para poder finalizar; lo que cambia es el momento: ya no se aplica al guardar, sino al finalizar. Si al finalizar falta algún dato, la inspección sigue en Preguardado y se informan los campos que faltan (el catálogo de especies tampoco se modifica, CC-053). Si el borrador cambió entre el cálculo y la finalización, la finalización se rechaza y se pide volver a calcular. |
| Riesgo aceptado | Entre la lectura de los valores vigentes del árbol (paso de finalizar) y la escritura del resultado, otra OT del mismo árbol podría completarse y cambiar esos valores vigentes. **Aceptado por la responsable (2026-10-25)** por el bajo volumen esperado y porque, al completar la OT (#60), la evaluación vigente se recalcula de todas formas con los valores vigentes del momento. No se bloquea con una transacción explícita. Esta aprobación es de esta fecha: el HANDOFF anterior lo daba por decidido sin que la responsable lo hubiera confirmado. Es distinto del bloqueo de filas de la propia inspección y su OT dentro de la función de finalización (dos finalizaciones simultáneas, o una finalización junto con un cambio de responsable), que la migración 020 bloquea con `FOR UPDATE` (punto b: inspección, OT y su fila de `evaluations`). **Ese bloqueo no tiene prueba automática:** necesita dos sesiones concurrentes y `pruebas_020` corre en una sola transacción; la responsable lo aceptó así el 2026-10-25. |
| Motivo | El Inspector necesita ver los valores calculados antes de decidir si ajusta una clasificación (D-173, CC-044) o una fecha (D-204). Si la inspección se finalizara sola al guardar el último dato, una inspección Finalizada ya no se puede modificar (REGLAS_GENERALES fila 26): el Inspector tendría que anularla para poder ajustar. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-25. D-209; D-173; D-204; REGLAS_GENERALES filas 2, 26 y 28; CC-040; CC-044; CC-053. |
| Archivos afectados | Esta ficha; `docs/roadmap.md` (AM-15). Implementación: `database/migrations/020_finalizar_inspeccion.sql` y `.down.sql`; `database/fase6/pruebas_020_finalizar_inspeccion.sql`; capa backend de `POST /api/sivu/inspections/:id/calcular` y `POST /api/sivu/inspections/:id/finalizar` (pendiente). |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: D-209, «Cómo se obtiene» y «Condición de activación» — la asignación de Finalizado ocurre cuando el Inspector finaliza de forma explícita, no al guardar; en la próxima versión del paquete (AM-15). |
| Impacto en BD | Migración 020 (`fn_finalizar_inspeccion`, SQLSTATE `SV064`) — escrita, sin aplicar. |
| Impacto en backend | Pendiente: `/calcular` (no escribe) y `/finalizar` (verifica completitud y borrador sin cambios, luego una sola llamada a `fn_finalizar_inspeccion`). |
| Impacto en API | Pendiente: los dos endpoints de arriba. |
| Impacto en frontend | Ninguno todavía (Fase 7): pantalla de resultados calculados, ajustes y confirmación. |
| Pruebas necesarias | SQL (`pruebas_020_finalizar_inspeccion.sql`): persistencia, ajustes, fechas, especie, rechazos de rol/estado. Jest (pendiente): calcular no escribe nada; finalizar con algo faltante deja Preguardado sin tocar el catálogo; borrador cambiado entre calcular y finalizar se rechaza. |
| Dependencias | CC-040; CC-044; CC-045 (b); CC-053; #60 (completar la OT recalcula la vigente). |
| rule_version | 2.1 (sin cambio de versión del paquete todavía; sincronización pendiente, AM-15). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-25 |
| Fecha de implementación | Pendiente |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | — |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial: dos pasos aprobados; riesgo de la OT concurrente del mismo árbol aceptado expresamente en esta fecha. |
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Aceptado que el `FOR UPDATE` de la 020 quede sin prueba automática (necesita dos sesiones). |

---

### CC-055 — Fechas de próxima inspección y próximo monitoreo según el tipo de inspección

| Campo | Valor |
|---|---|
| Fecha | 2026-10-25 |
| Origen | Diseño de la migración 020 (#59, punto d): D-202 y D-203 son Obligatorias para toda inspección, y REGLAS_GENERALES fila 28 hace que toda inspección parcial calcule `nivel_riesgo` con los valores vigentes. Aplicado literalmente, cada Monitoreo sugeriría una próxima inspección técnica contada desde su propia fecha y, como `v_upcoming_inspections` toma las fechas de la inspección Finalizada más reciente, la reinspección completa de un árbol con monitoreos periódicos se postergaría indefinidamente (p. ej. Bajo: monitoreo cada 12 meses, cada uno sugiere reinspección a 24 meses desde su fecha). Decisión de la responsable (opción D). |
| Tipo | 2 — metodológico |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | D-202 (`fecha_proxima_inspeccion`), D-203 (`fecha_proximo_monitoreo`), D-204 (`justificacion_ajuste_fecha`); REGLAS_GENERALES fila 13 (criterio de «la última» inspección) y fila 25 («Reinspección y monitoreo»); `v_upcoming_inspections` (migración 016); `fn_refresh_tree_current` y `v_tree_current_inputs` (orden de «la última»). |
| Versión anterior | D-202 y D-203: Obligatorias, «Fecha sugerida por la plataforma según nivel_riesgo», sin distinguir el tipo de inspección; ambas se renuevan en toda inspección. |
| Versión nueva | **Evaluación inicial, Reevaluación, Levantamiento y Evaluación instrumental:** ambas fechas obligatorias y renovadas, sugeridas según el `nivel_riesgo` nuevo (D-200, incluido su ajuste), como hasta ahora. **Monitoreo (Fitosanitario, Estructural y Vitalidad):** `fecha_proximo_monitoreo` obligatoria y renovada según el `nivel_riesgo` nuevo. Para `fecha_proxima_inspeccion_sugerida`, la plataforma sugiere **la menor** entre la fecha de próxima inspección vigente del árbol y la calculada con el `nivel_riesgo` nuevo, **pero nunca anterior al día siguiente a `fecha_inspeccion`**: **un Monitoreo puede adelantar la reinspección, nunca atrasarla.** Si el árbol no tiene una fecha de próxima inspección vigente, se usa la calculada. **Reinspección atrasada** (decisión de la responsable, 2026-10-25): si la fecha vigente es anterior o igual a la `fecha_inspeccion` del Monitoreo, la sugerida es el día siguiente a `fecha_inspeccion`. El motivo que ve el Inspector distingue los dos casos en que la sugerida no sale del riesgo nuevo: «se conserva la fecha vigente (CC-055)» y «reinspección atrasada: se sugiere de inmediato (CC-055)». **Fecha vigente** (decisión de la responsable, 2026-10-25): la de la última inspección Finalizada de una OT Completada que la registró; una inspección Preguardada, Anulada o de una OT abierta no cuenta. Se define una sola vez, en la vista `v_tree_fechas_vigentes` (migración 020, `security_invoker = true`); por ahora la usa solo el cierre de la inspección (/calcular y /finalizar). **Criterio único de «la última» inspección en todo SIVU** (decisión de la responsable, 2026-10-25; REGLAS_GENERALES fila 13: los valores nuevos rigen al completar la OT): `fecha_completada_ot` DESC, luego `fecha_inspeccion` DESC, luego `inspections.created_at` DESC — siempre el de `inspections`, uniendo con `inspections` donde haga falta, nunca el `created_at` de otra tabla (decisión de la responsable, 2026-10-25: la fila de `tree_data_versions` se borra y se vuelve a crear cuando un guardado quita los campos del árbol, CC-048, así que su `created_at` puede no seguir el orden de las inspecciones). Lo usan `v_tree_fechas_vigentes` (020) y, con la migración aparte 021, `fn_refresh_tree_current` (que hasta ahora ordenaba por `fecha_completada_ot` y `tree_data_versions.created_at`, sin `fecha_inspeccion`) y `v_tree_current_inputs` (que ordenaba solo por `fecha_completada_ot`; se queda en la 021, decisión de la responsable, 2026-10-25). `v_upcoming_inspections` y los recordatorios quedan intactos hasta el #63 (AM-18). **Ajuste del Inspector:** puede ajustar cualquiera de las dos fechas registrando `justificacion_ajuste_fecha` (D-204), sin cambios. En un Monitoreo, el tope («nunca atrasar») es **solo para la fecha sugerida**: la fecha ajustada por el Inspector sí puede ser posterior a la vigente si trae `justificacion_ajuste_fecha` (decisión de la responsable, 2026-10-25). **Justificación sin cambio de fecha** (decisión de la responsable, 2026-10-25): se rechaza — D-204 solo aplica cuando alguna fecha difiere de su sugerida. **Validaciones (en `fn_finalizar_inspeccion`, migración 020, todas con SQLSTATE `SV064`):** las cuatro fechas (sugeridas y finales de D-202 y D-203) son obligatorias, no nulas; `fecha_proxima_inspeccion` posterior a `fecha_inspeccion` (D-202); `fecha_proximo_monitoreo` igual o posterior a `fecha_inspeccion` (D-203); en Monitoreo, `fecha_proxima_inspeccion_sugerida` no posterior a la vigente (ni al día siguiente a `fecha_inspeccion` si la vigente ya pasó); `justificacion_ajuste_fecha` sin ninguna fecha distinta de su sugerida, rechazada. **Respuesta de la función:** devuelve el `species_id` que ya tenía la versión del árbol, si ya lo tenía (aprobado, 2026-10-25). **Fecha sugerida desde la vigente:** se devuelve como un punto (inicio = fin), aprobado hasta el #63. |
| Motivo | Sin esta regla, un Monitoreo (que registra solo los campos de su subtipo) reiniciaría el plazo de la inspección técnica completa, y la reinspección de un árbol monitoreado periódicamente no llegaría nunca. A la vez, un Monitoreo que detecta un empeoramiento debe poder adelantarla. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-25 (opción D; y, el mismo día, reinspección atrasada, criterio de «la última» y `v_tree_fechas_vigentes`). D-200, D-202, D-203, D-204; REGLAS_GENERALES filas 12, 13, 25 y 28; CC-040; CC-045 (b). |
| Archivos afectados | Esta ficha; `docs/roadmap.md` (AM-15, AM-18). Implementación (pendiente de aprobar): `src/services/rules/engine/fechas-sugeridas.ts` (`calcularFechaProximaInspeccionMonitoreo`) y `ensamblaje.ts` (entrada nueva `fechaProximaInspeccionVigenteISO`); lectura de esa fecha desde `v_tree_fechas_vigentes` en la capa backend de `/calcular` y `/finalizar`; `database/migrations/020_finalizar_inspeccion.sql` (vista, validaciones de D-202/D-203 y tope de Monitoreo); `database/migrations/021_orden_ultima_inspeccion.sql` (criterio de «la última»); `database/fase6/pruebas_020_finalizar_inspeccion.sql` y `pruebas_021_orden_ultima_inspeccion.sql`; `v_upcoming_inspections` (#63). |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Pendiente: D-202 y D-203 («Cómo se obtiene», «Fórmula / regla de cálculo») y REGLAS_GENERALES fila 25 — en la próxima versión del paquete (AM-15). |
| Impacto en BD | Pendiente de aplicar: 020 — vista `v_tree_fechas_vigentes`; en `fn_finalizar_inspeccion`, validaciones de D-202/D-203, rechazo de la justificación sin cambio de fecha y, en Monitoreo, `fecha_proxima_inspeccion_sugerida` nunca posterior a la vigente (o al día siguiente a `fecha_inspeccion` si la vigente ya pasó), como defensa en profundidad del cálculo del motor. 021 (aparte, para revertirla por separado) — mismo criterio de «la última», con `inspections.created_at`, en `fn_refresh_tree_current` y `v_tree_current_inputs`. `schema.sql`: la vista se agrega al aplicar la 020, copiando lo aplicado (de acuerdo con la responsable). #63: `v_upcoming_inspections` toma cada fecha de la inspección que la registró. |
| Impacto en backend | Motor (pendiente de aprobar): recibe la fecha de próxima inspección vigente y, en Monitoreo, sugiere la menor entre la vigente y la calculada, nunca antes del día siguiente a `fecha_inspeccion`, con el motivo correspondiente; los demás tipos no cambian. Capa backend de `/calcular` y `/finalizar` (pendiente): leer la vigente de `v_tree_fechas_vigentes` y pasarla al motor. |
| Impacto en API | Ninguno adicional (`/calcular` ya devuelve las fechas sugeridas). |
| Impacto en frontend | Ninguno todavía (Fase 7): indicar cuando la fecha sugerida de reinspección viene de la vigente y no del riesgo nuevo. |
| Pruebas necesarias | Motor (Jest): Monitoreo que adelanta la reinspección; Monitoreo que no la atrasa; reinspección atrasada (día siguiente); árbol sin fecha vigente; los demás tipos dan exactamente el mismo resultado que antes; suite completa. SQL (`pruebas_020`): fecha anterior o igual a `fecha_inspeccion` rechazada; Monitoreo que adelanta y que no atrasa; reinspección atrasada; Monitoreo con fecha ajustada posterior a la vigente, con justificación, aceptado (F22); justificación sin cambio de fecha rechazada (F18); vista: árbol sin fecha vigente, OT abierta y anulada no cuentan, dos OT completadas en fechas distintas, desempate del mismo día. SQL (`pruebas_021` + regresión de `fn_refresh_tree_current`: `pruebas_018d`, `pruebas_018f`, `pruebas_018i`): dos OT completadas el mismo día con distinta `fecha_inspeccion` — gana la más reciente; `tree_data_versions` vuelta a crear después (CC-048) — gana igual la inspección creada más tarde (O4); desempate del mismo día en `v_tree_current_inputs`, campo por campo (O5). |
| Dependencias | CC-040; CC-045 (b); CC-054; #63 (recordatorios). |
| rule_version | 2.1 (sin cambio de versión del paquete todavía; sincronización pendiente, AM-15). |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-25 |
| Fecha de implementación | Pendiente |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | Los puntos abiertos (1) reinspección atrasada y (2) criterio de «última» inspección quedaron decididos por la responsable el 2026-10-25 y se pasaron a «Versión nueva». Sigue abierto, para el #63: (3) cómo se muestra el término del rango (REGLAS_GENERALES fila 25) cuando la fecha sugerida viene de la vigente y no del riesgo nuevo — mientras tanto, el motor la devuelve como un punto (inicio = fin), aprobado por la responsable hasta el #63 y anotado en ese issue. |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Registro inicial (opción D). |
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decididos los puntos abiertos (1) y (2): reinspección atrasada (día siguiente a `fecha_inspeccion`, con motivo propio); criterio único de «la última» (`fecha_completada_ot`, `fecha_inspeccion`, `created_at`; REGLAS_GENERALES fila 13) en `v_tree_fechas_vigentes`, `fn_refresh_tree_current` y `v_tree_current_inputs`; vista `v_tree_fechas_vigentes` en la 020. El (3) queda para el #63. |
| 2026-10-25 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones sobre las preguntas de la sesión anterior: `v_tree_current_inputs` se queda en la 021; tope de Monitoreo solo para la fecha sugerida (la ajustada puede ser posterior a la vigente con justificación); justificación sin cambio de fecha → SV064; cuatro fechas obligatorias; la respuesta devuelve el `species_id` que ya tenía la versión; tercer criterio de «la última» = `inspections.created_at` en todas partes (no `tree_data_versions.created_at`, CC-048); fecha sugerida desde la vigente como un punto hasta el #63; `v_tree_fechas_vigentes` en `schema.sql` al aplicar la 020. |

---

### CC-056 — Completitud para finalizar una inspección (qué campos se exigen y de dónde se toman)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Origen | Plan de la capa backend de #59 + #72 (`POST /calcular`, `POST /finalizar`, CC-054). REGLAS_GENERALES fila 28 («Preguardado y finalización», CC-040) exige «todos los campos Obligatorios y los Condicionales activados de ARBOLES y REGISTRO_EVALUACION» en la evaluación completa y «solo los campos de su subtipo» en las parciales, pero no dice cómo se leen las categorías mixtas de obligatoriedad, las condiciones de activación escritas en prosa ni de dónde sale cada valor (registrado en esta inspección o vigente). Decisiones de la responsable. |
| Tipo | 2 — metodológico (completitud de D-209) |
| Estado | APROBADO METODOLÓGICAMENTE |
| Regla / campo afectado | REGLAS_GENERALES fila 28; D-209 (`estado_registro`, «Cómo se obtiene»: completitud de los datos obligatorios aplicables); D-13 (`especie_cientifica`); D-18 (`dap_cm`); D-27 (`fotografias_arbol`); D-125 (`superficie_alcorque_m2`); D-147 (`observaciones_infraestructura`); D-169 (`clasificacion_vitalidad`); DICCIONARIO_CAMPOS, columnas «¿Quién lo ingresa?» (D), «Tipo de obligatoriedad» (I) y «Condición de activación» (K), hojas ARBOLES y REGISTRO_EVALUACION. |
| Versión anterior | Sin regla operativa: la completitud se enunciaba (CC-040, D-209) pero no estaba definida campo por campo. |
| Versión nueva | **(1) Fuente de la tabla.** La lista de campos exigidos y sus condiciones se genera desde el Excel (columnas D, I y K) con un script versionado (`scripts/metodologia/obligatoriedad_campos.py`), con una prueba que la compara contra el Excel. Las condiciones de la forma `campo = valor` se traducen solas: «Sí»/«No» a verdadero/falso (dominio base, PR-021) y las demás etiquetas al código de su catálogo; la generación falla si una etiqueta no tiene código. Las condiciones en prosa y las categorías mixtas usan la traducción aprobada por la responsable (decisiones f a l). **(2) Inspecciones parciales (Evaluación instrumental y Monitoreo):** se exigen los campos Obligatorios y los Condicionales activados **dentro de su alcance** (CC-040); los Opcionales no se exigen. Los campos exigidos tienen que estar registrados en esta inspección. Las condiciones de activación se evalúan con los valores vigentes del árbol más los registrados en esta inspección (lo registrado reemplaza a lo vigente); p. ej., las cavidades de la Instrumental (D-41, D-53) se activan con `cavidad_pudricion_basal`/`presenta_cavidad_pudricion_tronco` de una evaluación anterior si esta no los registró. **No se exigen campos de ARBOLES ni D-13** (fila 28: solo los campos de su subtipo; los demás conservan su valor vigente). Una Instrumental con `cavidad_pudricion_basal` = No y `presenta_cavidad_pudricion_tronco` = No está completa (decisión j). **(3) Evaluación inicial, Reevaluación y Levantamiento:** se exigen los Obligatorios y los Condicionales activados de ARBOLES y REGISTRO_EVALUACION. El origen del valor sale de la columna «¿Quién lo ingresa?»: los campos que también ingresa el Usuario municipal («Inspector / Usuario Municipal», D-7 a D-14) pueden venir de lo vigente; los que ingresa solo el Inspector o «Sistema / Inspector» (p. ej. D-18 `dap_cm`, D-19 `altura_total_m`) y todo REGISTRO_EVALUACION tienen que estar registrados en esta inspección. Los campos que asigna solo el Sistema no se exigen al Inspector. **(4) D-13:** solo en los tres tipos de evaluación completa (decisión i), `especie_cientifica` y `nombre_comun` presentes, y `especie_cientifica` sin «Género sp.», «Género spp.» ni «No determinado» (decisión r), comparada sin los espacios del principio y del final, sobre el valor que quede: registrado o vigente. **(5) D-27:** las cuatro vistas en Evaluación inicial, Reevaluación y Levantamiento; la Instrumental no considera fotos; en Monitoreo no son obligatorias. **(6) Fechas:** con `nivel_riesgo` No determinado el motor sugiere los rangos de Extremo con el motivo de precaución (CC-045 b) y la inspección se puede finalizar; `noDeterminable` solo ocurre con un riesgo vacío o desconocido o una fecha inválida, y es un error interno (500 con registro en el log), no un campo faltante. **(7)** Lo que falte no es un error: la inspección sigue en Preguardado y se informan los campos faltantes (CC-054). **(8) DAP multifustal (D-18):** con `multifustal` = No, `dap_cm` se ingresa a mano y se exige; con `multifustal` = Sí se exigen `numero_fustes` y `dap_fustes_cm`, y `dap_cm` lo calcula la plataforma, no se le pide al Inspector: con 2 a 5 fustes, `dap_cm` = √(d₁² + … + dₙ²); con más de 5, `dap_cm` = √(d̄² × n), con d̄ el promedio de los diámetros. `presenta_tutorado` (D-149) se activa con el `dap_cm` que quede, también el calculado. **(9) Alcorque Irregular (D-125, «Irregular → ingreso manual»):** `superficie_alcorque_m2_manual` entra en el alcance de las evaluaciones completas y se exige cuando `existe_alcorque` = Sí y `forma_alcorque` = Irregular. **(10) `clasificacion_vitalidad` (D-169):** obligatoria «en cada evaluación de vitalidad»: en Evaluación inicial, Reevaluación, Levantamiento (está en su alcance) y Monitoreo Vitalidad (único campo de su alcance), sin excepción por especie. |
| Decisiones de la responsable (2026-10-26) | (a) Condiciones no automáticas: «existe copa» = `copa_no_presenta` distinto de verdadero; «primera rama» y «copa viva» = su marca `*_no_presenta` distinta de verdadero; comparaciones numéricas tal cual — la traducción de cada una se muestra antes de generar la tabla. (b) Parciales: Obligatorios y Condicionales activados dentro del alcance; Opcionales no; activación con vigente + registrado; si en una Instrumental no queda ningún campo activado, no darla por completa sin mostrar el caso. (c) ARBOLES y D-13: no en parciales; en las completas, según «¿Quién lo ingresa?». (d) `MOTOR_COMMIT`: variable de entorno obligatoria al arrancar (en `.env.example` con un valor de ejemplo, simulada en las pruebas). (e) Corrección sobre las fechas: punto (6). **Segunda ronda:** (f) Las 24 traducciones de las condiciones en prosa, aprobadas. `observaciones_infraestructura` (D-147) se activa con más de un tipo seleccionado en `tipo_infraestructura_vertical`, `tipo_red_aerea` o `tipo_red_subterranea`, o con `compromete_funcionalidad_red_subterranea` = No determinado; el caso «una condición registrada como Sí involucra varios elementos» **no se verifica**, porque no se puede deducir de los datos. (g) `clasificacion_vitalidad`: punto (10). La nota de D-169 («La aplicación a palmeras queda sujeta a revisión metodológica») queda como revisión futura en el roadmap (AM-20), sin efecto en la completitud. Corrección del motivo propuesto: AM-17 ya está resuelto y la vitalidad no se calcula (D-169, «Asignación visual por el Inspector»). (h) Categorías mixtas, aprobadas: «Obligatorio para finalizar EI/R/L» solo en esos tipos; «Obligatorio responder» = valor o marca `*_no_presenta` = verdadero; «Obligatorio cuando existe copa (viva) evaluable» con la traducción de copa; «Calculado / Condicional» no se exige al Inspector (salvo el punto 9); «Condicional / Opcional» (D-70, D-71) se trata como Opcional. (i) ARBOLES por grupo, aprobado. **Interpretación de la responsable:** D-13 se exige solo en Evaluación inicial, Reevaluación y Levantamiento, no en Instrumental ni en Monitoreo — D-13 dice «para finalizar la inspección» sin distinguir tipo, y la fila 28 limita las parciales a su alcance; se lleva a AM-15. (j) Instrumental con las dos cavidades = No: completa; es un resultado válido (D-39; fila 28). (k) DAP multifustal: punto (8); la metodología ya está en D-18 y se implementa en este bloque. (l) Alcorque Irregular: punto (9); corrige un error del borrador (#58). **Tercera ronda:** (m) Catálogos `tipo_infraestructura_vertical` (D-132: `poste`, `luminaria`, `senaletica`, `semaforo`, `muro_o_cierre`, `edificacion`, `otro`) y `tipo_tutorado` (D-150: `simple`, `doble`, `multiple`, `otro`), aprobados tal cual. (n) `dap_cm` multifustal: lo calcula el backend al guardar el borrador (POST y PATCH), antes de llamar a `fn_save_inspection_draft`, y lo registra en el `tree_data_versions` de la inspección, así que queda vigente al completar la OT; sin migración. Se rechaza con 400: número de fustes distinto de la cantidad de diámetros (D-17), `numero_fustes` menor que 2 (D-16), `dap_cm` enviado con `multifustal` = Sí (D-18) y `numero_fustes`/`dap_fustes_cm` sin `multifustal` = Sí en el mismo guardado. (o) El borrador acepta listas de códigos vigentes en los tres campos de selección múltiple (D-132, D-139, D-143), y solo en ellos. (p) Catálogo `tipo_red_subterranea` (D-143), aprobado con 8 códigos en el orden del Excel: `electrica`, `telecomunicaciones`, `agua_potable`, `alcantarillado`, `aguas_lluvias`, `gas`, `otra`, `funcion_no_determinada`. (q) El dominio de `clasificacion_vitalidad` se valida en el borrador también en las evaluaciones completas, no solo en Monitoreo Vitalidad (consecuencia de la decisión g). **Cuarta ronda:** (r) D-13: «spp.» se trata igual que «sp.» (también es una identificación solo a nivel de género); el nombre se compara sin los espacios del principio y del final (antes «Acacia sp. », con un espacio final, pasaba). Se lleva a AM-15 (D-13 y D-257). El CHECK `chk_species_especie_cientifica_valida` (migración 012) todavía no reconoce «spp.»: se corrige con una migración aparte, pendiente de aprobación; mientras tanto la verificación de completitud impide finalizar con esa especie. |
| Motivo | Sin una regla campo por campo, «completo» dependería de quien implementa. |
| Fundamento / fuente | Decisión de la responsable (marybaxmann), 2026-10-26. REGLAS_GENERALES fila 28; D-209; D-13; D-18; D-27; D-39; D-125; D-147; D-169; DICCIONARIO_CAMPOS columnas D, I y K; CC-040; CC-045 (b); CC-053; CC-054; PR-021. |
| Archivos afectados | Esta ficha; `docs/roadmap.md` (AM-15, AM-20). Implementación: `scripts/metodologia/obligatoriedad_campos.py` y la tabla generada `src/schemas/sivu/completitudInspeccion.ts`, con su prueba `tests/schemas/sivu/completitudInspeccion.test.ts`; `scripts/metodologia/campos_evaluacion_completa.py`, `src/schemas/sivu/alcanceInspeccion.ts` y sus pruebas (`superficie_alcorque_m2_manual`); `src/services/rules/engine/catalogs.ts` (catálogos `tipo_infraestructura_vertical` y `tipo_tutorado`, observación iii; `tipo_red_subterranea`, observación iv); `calcularDapEquivalenteCm` en `src/services/rules/engine/variables-calculo.ts`, su uso en `src/services/sivu/inspection.service.ts` y las validaciones del DAP y de las listas en `src/schemas/sivu/inspeccion.schema.ts` (decisiones n y o); `src/services/sivu/completitud.ts` y `tests/services/sivu/completitud.test.ts`. Pendiente: capa de `/calcular` y `/finalizar`; `.env.example` (`MOTOR_COMMIT`). |
| Impacto en diagramas | Ninguno (fuera del paquete, CC-030). |
| Impacto en Excel metodológico | Ninguno obligatorio; en la próxima versión del paquete conviene llevar a la columna K las traducciones de las condiciones en prosa y la interpretación de D-13 (AM-15). |
| Impacto en BD | Ninguno por la completitud. El cálculo de `dap_cm` multifustal se propone por separado. |
| Impacto en backend | Verificación de completitud en `/calcular` y `/finalizar`, antes de llamar a `fn_finalizar_inspeccion`; `superficie_alcorque_m2_manual` en el alcance del borrador; cálculo de `dap_cm` multifustal. |
| Impacto en API | `campos_faltantes` en las respuestas de `/calcular` y `/finalizar` (CC-054). El borrador de las evaluaciones completas acepta `superficie_alcorque_m2_manual`. |
| Impacto en frontend | Ninguno todavía (Fase 7). |
| Pruebas necesarias | Tabla generada vs Excel; parcial con condición activada por un valor vigente; completa con un campo del grupo «solo Inspector» que solo está vigente (falta); D-13 sobre el valor vigente y no exigido en parciales; Instrumental con las dos cavidades = No (completa); alcorque Irregular sin `superficie_alcorque_m2_manual` (falta), en el schema del borrador y en la completitud; `clasificacion_vitalidad` exigida en EI/R/L y Monitoreo Vitalidad; DAP multifustal con 2, 5 y 6 fustes, resultado menor a 10 cm (activa el tutorado) e inconsistencia entre número de fustes y diámetros; riesgo No determinado → fechas de Extremo con su motivo, y se puede finalizar. |
| Dependencias | CC-040; CC-045 (b); CC-053; CC-054; CC-055. |
| rule_version | 2.1 |
| Aprobado por | marybaxmann |
| Fecha de aprobación | 2026-10-26 |
| Fecha de implementación | En curso: tabla generada, alcance del borrador, DAP multifustal, listas de selección múltiple y función de completitud (2026-10-26); capa de `/calcular` y `/finalizar` pendiente. |
| Commits / PR asociados | `feature/fase6-backend-api`, sin PR todavía. |
| Observaciones | Hallazgos de la revisión: (i) D-18 `dap_cm` en un árbol multifustal es el «diámetro equivalente calculado» desde `dap_fustes_cm`, y SIVU todavía no tenía ese cálculo — decisión (k). (ii) D-125 `superficie_alcorque_m2` con forma Irregular es de ingreso manual, pero `superficie_alcorque_m2_manual` no estaba en el alcance del borrador (su «¿Quién lo ingresa?» es Sistema) — decisión (l). (iii) Al generar la tabla, dos condiciones no tenían código: D-133 (`tipo_infraestructura_vertical` = Otro) y D-153 (`tipo_tutorado` = Otro); sus campos no tenían catálogo. Se proponen los catálogos `tipo_infraestructura_vertical` (D-132) y `tipo_tutorado` (D-150) en `catalogs.ts` (PR-021: el backend define el código), con prueba contra el Excel; aprobados (decisión m). (iv) El borrador acepta en `variables` solo valores simples, no listas, así que los campos de selección múltiple (D-132, D-139, D-143) hoy no pueden guardar más de un tipo y la primera condición de D-147 no se activaba — decisión (o). D-143 (`tipo_red_subterranea`) no tenía catálogo — decisión (p). |

**Historial de estados**

| Fecha | Estado | Por | Nota |
|---|---|---|---|
| 2026-10-26 | EN REVISIÓN | marybaxmann | Registro inicial: decisiones (a) a (e); traducciones y listas pendientes de aprobación. |
| 2026-10-26 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones (f) a (l): traducciones, categorías mixtas, ARBOLES por grupo, interpretación de D-13, Instrumental con las dos cavidades = No, DAP multifustal y alcorque Irregular. |
| 2026-10-26 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones (m) a (o): catálogos D-132 y D-150, cálculo de `dap_cm` multifustal al guardar el borrador con rechazo 400 de las inconsistencias, listas en los campos de selección múltiple. |
| 2026-10-26 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisiones (p) y (q): catálogo `tipo_red_subterranea` y validación del dominio de `clasificacion_vitalidad` en las evaluaciones completas. |
| 2026-10-26 | APROBADO METODOLÓGICAMENTE | marybaxmann | Decisión (r): «spp.» como «sp.» en D-13, comparación sin espacios en los extremos. |
