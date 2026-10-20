# Roadmap — Pendientes consolidados

## Propósito

Este archivo es un índice de tareas pendientes. No es una fuente de reglas
ni de decisiones: cada pendiente aquí listado remite a la PR / ADR /
documento metodológico donde vive la decisión (o la ausencia de ella).

Si hay una diferencia entre lo que dice este archivo y `project-rules.md`,
`architecture-decisions.md` o `docs/methodology/`, esos documentos mandan.
Este archivo solo se actualiza tachando o quitando un ítem cuando el
pendiente correspondiente quede resuelto en su documento de origen.

> **Nota de vigencia (2026-10-11).** Las secciones "Base de datos y
> migraciones", "Backend", "Frontend productivo" y "Metodología" no se
> actualizan desde 2026-09-16 y describen como no iniciadas cosas que ya
> existen en `main` (frontend productivo, endpoints de árboles y módulos,
> `services/rules/treeRisk.ts`). No se tachan aquí porque su resolución
> debe confirmarse en el documento de origen (ver contradicciones C1 y C7
> en `docs/auditorias/2026-10-postauditoria/contradicciones.md`). El
> registro vigente de pendientes es la sección **"Postauditoría 2026-10"**,
> al final de este archivo.

---

## Base de datos y migraciones

**Nota de entornos:** el proyecto Supabase usado en todas las
validaciones de esta sección es `valpo-verde-conecta` — su dashboard
muestra `main` / `PRODUCTION`, pero es oficialmente el entorno de
desarrollo/pruebas del proyecto (ver ADR-013), no el productivo real. El
entorno productivo real es un proyecto Supabase separado, todavía no
creado.

- ~~Aplicar `database/migrations/002_multiproject_structure.sql`~~ —
  **hecho y validado en `valpo-verde-conecta` (desarrollo/pruebas,
  ADR-013).** Revisada estáticamente por `qa`, ejecutada y validada de
  punta a punta: escenario limpio `001 → 002` y escenario con datos
  legacy, resultado Escenario B `25 PASS / 0 FAIL`.

  **`002`, `003`, `004` y `005` están validadas en `valpo-verde-conecta`
  (desarrollo/pruebas), pero NINGUNA ha sido aplicada todavía al entorno
  productivo real.** Ese entorno es un proyecto Supabase **separado**,
  que todavía no existe (ADR-013) — no se marca como desplegada en
  producción ninguna migración. Cuando ese proyecto se cree, se le
  aplicarán únicamente migraciones ya validadas en desarrollo/pruebas,
  repitiendo en ese momento los diagnósticos/precondiciones que
  correspondan a cada una (p. ej. el diagnóstico de datos legacy antes de
  `003`, la verificación de ownership/`auth.uid()`/`BYPASSRLS` antes de
  `005`) — no se asume que el resultado vaya a ser automáticamente el
  mismo solo porque ya pasó en desarrollo/pruebas. Ver nota operativa de
  testing local en `docs/workflow.md` §8.
- ~~Migración `003` (backfill)~~ — **hecho y validado en
  `valpo-verde-conecta`** (commit `4ea63fa`). El diagnóstico previo en
  este entorno confirmó 0 filas legacy (`project_id NULL` = 0 en
  `public_spaces`/`trees`/`incidents`; integridad relacional 5a-5d = 0
  filas), por lo que se aplicó con las 3 tablas de mapeo (`TEMP ... ON
  COMMIT DROP`) vacías — no se creó ningún "proyecto legacy" ni se
  infirió mapeo alguno (ADR-005 v2.0 / PR-005 v3.0).
- ~~Migración `004`~~ — **hecho y validado en `valpo-verde-conecta`**
  (commit `1f4da03`): `SET NOT NULL` en las tres `project_id`
  (`public_spaces`, `trees`, `incidents`), retiro de las FK simples
  `trees_public_space_id_fkey_transitoria` /
  `incidents_tree_id_fkey_transitoria`; FK compuestas
  `trees_project_public_space_fkey` / `incidents_tree_project_fkey`
  intactas. `database/schema.sql` ya sincronizado con el estado post-004.
- ~~RLS (Row Level Security)~~ — **diseñada, implementada (`005`) y
  validada en `valpo-verde-conecta`.** RLS como segunda barrera,
  coexistiendo con (no reemplazando) la autorización de backend: 4
  funciones `SECURITY DEFINER` (`get_user_role`, `is_project_member`,
  `is_admin`, `is_municipal_member`), RLS habilitado en las 6 tablas de
  esta primera fase (`user_profiles`, `project_members`, `projects`,
  `public_spaces`, `trees`, `incidents`), 15 policies en total, todas
  con `TO authenticated` explícito (ninguna aplicada a `PUBLIC` por
  omisión). Los 7 tests SQL (H1-H7: admin transversal, municipal
  miembro, municipal no miembro, usuario sin perfil, usuario inactivo
  con acceso de solo lectura a su propio perfil pero sin acceso
  operacional, acceso cruzado entre proyectos bloqueado, control
  negativo de `service_role`) quedaron aprobados. Confirmado en este
  entorno: `service_role` tiene `BYPASSRLS`; `authenticated`/`anon` no
  lo tienen.

  ~~Cutover del backend de `service_role` a JWT de usuario por
  repository~~ — **hecho y validado** (commit `737ea25`, ver ADR-014).
  `project.repository.ts` y `projectMember.repository.ts` migrados a
  `createUserScopedClient(accessToken)`; `auth.repository.ts` y
  `userProfile.repository.ts` sin cambios (`service_role`). Suite
  automatizada: 5 suites / 33 tests PASS, TypeScript limpio. Validación
  E2E real con JWTs de un admin y un municipal reales (casos E1-E7):
  `7/7 PASS`, sin ningún 500 ni error de PostgREST.

## Backend

- ~~Implementar backend con scoping rol + pertenencia a proyecto~~ —
  **hecho y validado.** `/api/projects` y `/api/projects/:id/members`
  implementados (commit `49cdb73`), con `admin` de acceso transversal y
  `usuario_municipal` limitado a proyectos con fila en `project_members`
  — paso intermedio del despliegue por etapas de ADR-005 v2.0. Validación
  manual end-to-end aprobada (Postman, backend local + proyecto Supabase
  de pruebas, no producción): alta y listado de proyectos por rol,
  `usuario_municipal` sin membresía ve lista vacía y con membresía ve
  solo su proyecto, gestión de miembros admin-only (403 para
  `usuario_municipal`), `npx tsc --noEmit` sin errores.

  **Incidencia resuelta durante la validación:** `GET /api/projects/:id/members`
  devolvía 500 por ambigüedad de PostgREST entre las dos FK de
  `project_members` hacia `user_profiles` (`user_id` y `added_by`;
  ver `database/schema.sql`). Corregido en
  `src/repositories/projectMember.repository.ts` desambiguando el embed
  con `user:user_profiles!project_members_user_id_fkey(nombre)`
  (commit `4227c6c`).
- Endpoints de árboles, inspecciones, incidencias, mantenimiento,
  infraestructura, dashboard (ver README.md "Estado actual").
- `services/rules/` — motor de reglas metodológico, no creado todavía.
  Depende de que las secciones metodológicas correspondientes estén
  `vigente` (ver más abajo).

## Frontend productivo (próximo bloque, no iniciado)

`valpo-verde-frontend` (ADR-001) — repositorio separado, todavía no
creado. Nada de esta sección está implementado; se lista aquí solo como
orden de trabajo previsto, no como progreso:

- Autenticación real contra Supabase Auth (login/logout, obtención y
  renovación de sesión) — contrato ya fijado en PR-018 v2.0/ADR-014: el
  frontend nunca usa `service_role`, solo `anon`/publishable key para su
  propia sesión.
- Consumo de `GET /api/auth/me` para resolver identidad + rol y adaptar
  la UI (el frontend no decide permisos, solo los refleja).
- Consumo de `/api/projects` y `/api/projects/:id` (alta, listado,
  detalle) respetando el acceso transversal de `admin` y el scoping por
  membership de `usuario_municipal`.
- Consumo de `/api/projects/:id/members` (admin-only).
- Recién después: consumo de las futuras APIs de árboles/inventario
  (dependen de que esos endpoints existan en el backend — ver sección
  Backend, todavía no implementados).

## Metodología

- **PR-007 (Estado técnico derivado)** — `propuesta`, sin aprobar.
- **PR-012 (Probabilidad de falla)** — `pendiente`: conversión de
  puntaje total a probabilidad de falla sin consolidar para
  raíces/base, tronco y copa/ramas (las tres tablas del diagrama
  difieren entre sí; no asumir rangos comunes).
- **PR-014 (Impacto, consecuencias y riesgo final)** — `pendiente` en su
  totalidad. Los archivos `docs/methodology/06-impact.md`,
  `07-consequences.md` y `08-final-risk.md` aún no existen.
- Cerrar la fórmula exacta de `SL` (paréntesis sin validar en el
  diagrama original) — afecta raíces/base y tronco.
- Cerrar la salida consolidada para `SL < 33 %` (con síntoma externo) en
  raíces/base y tronco.
- Cerrar la fórmula de agregación del puntaje del tronco (no explícita
  en su diagrama, a diferencia de raíces/base, copa/ramas e
  infraestructura, donde la suma simple ya es vigente).
- Decidir la estrategia de `probability_thresholds`: ¿tabla única
  compartida (como hoy en `schema.sql`) o rangos distintos por
  componente? Pendiente hasta consolidar raíces + tronco + copa. No usar
  `schema.sql` como fuente para cerrar esta decisión (PR-002, PR-011).
- Definir el formato definitivo de `rule_version`.

## Infraestructura de desarrollo

- ~~Elegir e instalar un framework de tests~~ — **hecho.** Jest + ts-jest
  + Supertest instalados y configurados (`jest.config.js`,
  `tsconfig.jest.json`); 5 suites / 33 tests PASS (ver README.md "Estado
  actual" y `docs/checkpoint-2026-09-16.md` sección 9).

---

## Postauditoría 2026-10

Registro maestro de pendientes de la auditoría postdemo (2026-10-10 /
2026-10-11). Cada ítem remite al hallazgo o decisión de origen en
`docs/auditorias/2026-10-postauditoria/` (H = `hallazgos.md`,
C = `contradicciones.md`, D = `decisiones.md`). Ningún ítem implica una
decisión aprobada salvo lo indicado en `decisiones.md`.

Estados: `PENDIENTE DE DECISIÓN` (autora) · `PENDIENTE` · `BLOQUEADO`
(por otro ítem) · `EN RAMA` (corregido en `feature/demo-sivu`, fuera de
`main`, sin verificar en navegador).

### Decisiones de la autora

| ID | Pendiente | Origen | Estado | Bloquea |
|---|---|---|---|---|
| PA-01 | Tratamiento del motor implementado con reglas de borrador (excepción controlada, publicación 2.0.0 o resultados provisionales); formato de `rule_version` | C1 | PENDIENTE DE DECISIÓN | PA-19, C4 |
| PA-02 | Tratamiento de ADR-006 frente a CC-022 | C2 | PENDIENTE DE DECISIÓN | — |
| PA-03 | CC-015: modelo de roles (Administrador, Usuario municipal, Inspector, Mantenimiento; varios roles por persona; rol por proyecto; permisos) | D §2, CC-015 | PENDIENTE DE DECISIÓN | PA-02 (definitiva), PA-05, PA-07, PA-08 |
| PA-04 | DA-01: implementación concreta (credencial, permisos, revisión de ADR-014 / PR-018) | D §1, §4; S1, S2 | PENDIENTE DE DECISIÓN (principio aprobado) | PA-25, PA-26, PA-27 |
| PA-05 | DA-02: diseño de INSPECCIONES (Q5 ADR-016, Q6, Q8, Q9) | D §1, §8; X4, X5 | PENDIENTE DE DECISIÓN | PA-26 (inspector) |
| PA-06 | DA-03: esquema de eventos (D1–D5, D9, D12) | D §1, §6; I2 | PENDIENTE DE DECISIÓN (concepto aprobado) | PA-27 |
| PA-07 | DA-04: matrices y datos por transición (T-01 a T-13) | D §1, §7; I3, X3 | PENDIENTE DE DECISIÓN | PA-27 |
| PA-08 | Visibilidad de nombres entre miembros del proyecto (Q7) | I1-b | PENDIENTE DE DECISIÓN | — |
| PA-09 | CC tipo 1 por `INSPECCIONES.nivel_riesgo` (Q10) | X1 | PENDIENTE DE DECISIÓN | PA-05 |
| PA-10 | Etiquetas `demo-2026-10-10` (crear / publicar) | D §2 K3 | PENDIENTE DE DECISIÓN | — |
| PA-11 | Registrar CC-025 y demás candidatos (alcance y estado propuestos) | D §5 | PENDIENTE DE DECISIÓN | — |

### Verificación y entorno

| ID | Pendiente | Origen | Estado | Depende de |
|---|---|---|---|---|
| PA-12 | Verificar en navegador la rama del 2026-10-11 (P1–P7) y decidir su PR a `main` | H §1; D §2 K4 | PENDIENTE | — |
| PA-13 | Reactivar entorno de pruebas aislado y reproducir el esquema (migraciones 001–006 fuera del historial) | E1; D §2 | PENDIENTE DE DECISIÓN (Q3) | — |
| PA-14 | Ejecutar W1–W12 en el entorno aislado | T1; `escenarios-rls.md` | BLOQUEADO | PA-13 + autorización |
| PA-15 | Evidencias de solo lectura E-2, E-3, E-5 para DA-01 | D §4 | PENDIENTE | — |
| PA-16 | Verificar en navegador P3 (pines duplicados), A3 (ancho de teléfono), cascada de peticiones | P3, A3 | PENDIENTE | PA-12 |

### Documentación

| ID | Pendiente | Origen | Estado | Depende de |
|---|---|---|---|---|
| PA-17 | Actualizar `README.md` (estado, pruebas, contrato de API) | C6 | PENDIENTE | PA-12 (endpoints de la rama) |
| PA-18 | Frontend: `docs/frontend-architecture.md` y `.env.example` (rama `docs/` en el repositorio frontend) | C8, C9 | PENDIENTE | — |
| PA-19 | `docs/methodology/01–05` frente al motor | C4 | BLOQUEADO | PA-01 |
| PA-20 | Actualizar ADR-014 (alcance real de RLS) junto con su revisión por DA-01 | C3 | BLOQUEADO | PA-04 |
| PA-21 | Sincronizar el Excel: CC-022 (USUARIOS, "¿Quién lo ingresa?"), CC-024 (DUDAS N13, DICCIONARIO_CAMPOS) | C11 | PENDIENTE | PA-03 (CC-022) |
| PA-22 | Revisar el issue #6 y el tablero (merges #16 y #17 ya realizados; issue #8 resuelto en rama) | C12, P7 | PENDIENTE | — |
| PA-23 | Corregir comentarios de código contradictorios con CC-022 (cambio pequeño, sin cambio de comportamiento) | M2, C10 | PENDIENTE | — |
| PA-24 | Limpieza de ramas `docs/cc-021…024` y del worktree `../valpo-verde-backend-cc024` (destructiva) | Plan de consolidación | PENDIENTE DE DECISIÓN | — |

### Implementación (después de las decisiones)

| ID | Pendiente | Origen | Prior. | Estado | Depende de |
|---|---|---|---|---|---|
| PA-25 | Cerrar la escritura directa según la variante de DA-01 que se apruebe | S1, S2 | Alta | BLOQUEADO | PA-04, PA-14 |
| PA-26 | Registrar el autor (e inspector, si se aprueba) en cada evaluación | I1 | Alta | BLOQUEADO | PA-04, PA-03, PA-05 |
| PA-27 | Historial de eventos y transiciones de incidencias y OT | I2, I3 | Media | BLOQUEADO | PA-04, PA-06, PA-07 |
| PA-28 | Error tras guardar no debe ocultar el mapa | F1 | Media | PENDIENTE | PA-12 |
| PA-29 | Tiempos máximos de petición (frontend y backend) | F2 | Media | PENDIENTE | — |
| PA-30 | Sesión vencida → login; reflejar cambios de rol | F3 | Baja | PENDIENTE | — |
| PA-31 | Idempotencia en altas | F4 | Baja | PENDIENTE | — |
| PA-32 | Accesibilidad: etiquetas asociadas; modales con Escape, foco y `role="dialog"` | A1, A2 | Media | PENDIENTE | — |
| PA-33 | Consultas por proyecto en infraestructura, mantención e índices | R1 | Media | PENDIENTE | — |
| PA-34 | Avisos de rendimiento de Supabase (políticas, índices FK) | R2 | Baja | PENDIENTE | PA-04 (políticas) |
| PA-35 | Errores tipados en lugar de búsqueda por texto | M1 | Media | PENDIENTE | PA-04 |
| PA-36 | Dividir `ModulePage` (Inspección / Infraestructura) | M3, P5 | Media | PENDIENTE | PA-12 |
| PA-37 | Pruebas de rutas faltantes, pruebas de frontend, CI | T2 | Media | PENDIENTE | — |
| PA-38 | Registro de peticiones y diagnóstico sin datos sensibles | T3 | Media | PENDIENTE | — |
| PA-39 | Endurecimiento menor: funciones ejecutables sin sesión, contraseñas filtradas, `search_path`, cabeceras, límite de tasa | S3, S4, S5 | Baja | PENDIENTE | — |
| PA-40 | Tablas y columnas del modelo inicial sin uso (borrar requiere autorización) | I4 | Baja | PENDIENTE DE DECISIÓN | PA-05, PA-06 |
| PA-41 | Validación de fecha en la función de alta con hora de Chile | I5 | Baja | PENDIENTE | PA-04 |
| PA-42 | Caché global y relectura completa tras editar (aceptados por ahora) | P4d, P4e | Baja | PENDIENTE | — |

### Auditoría del modelo de datos 2026-10-18 (CC-026)

Decisiones aprobadas en CC-026 (`docs/auditorias/2026-10-18-modelo-datos/`). Resuelven en parte PA-02 (ADR-006 v2.0), PA-03 (cuatro roles; quedan identificadores, roles múltiples y rol por proyecto) y PA-05 / PA-07 (inspección con `estado_registro`; cierre de OT de Mantenimiento).

| ID | Pendiente | Origen | Estado | Depende de |
|---|---|---|---|---|
| AM-01 | ~~Sincronizar el Excel maestro con la copia auditada~~ Resuelto por CC-028: el Excel maestro (`docs/excel/Base de Datos Valpo Verde.xlsx`) es el Excel auditado, con REGLAS_INDICADORES y VERSION | CC-026 / CC-028 | RESUELTO | — |
| AM-02 | ~~Confirmar los conflictos P1–P9~~ Resuelto por CC-028: prevalece el Excel auditado (la corrección y anulación de mediciones queda sin regla) | CC-026 / CC-028 | RESUELTO | — |
| AM-07 | Actualizar los textos contradichos por CC-028: CC-008, CC-009, CC-020, ADR-010 v2.0, ADR-016 v1.0, PR-006 v7.0, PR-010 v1.0, `docs/methodology/modelo-arbol-medicion.md` y `docs/workflow.md` §14.12 (columna `ambito`) | CC-028 | PENDIENTE | — |
| AM-03 | ~~Responder las preguntas abiertas P10–P14 (INCIDENCIA, SECTORES, proyectos, Hoja4)~~ Resuelto (AMD-31 a AMD-34) | CC-026 `pendientes.md` | RESUELTO | — |
| AM-05 | ~~Auditar MATRICES_CALCULO~~ registrado en CC-027; INDICES pendiente de revisión posterior (P16) | CC-026 / CC-027 | PENDIENTE (INDICES) | Revisión de la autora |
| AM-06 | Implementar CC-027: R03 con defoliación, etiquetas del maestro, cavidades 09 y 10, M04 y M05 | CC-027 | BLOQUEADO | C1 (`rule_version`), AM-01, autorización |
| AM-04 | Implementar CC-026: roles Inspector y Encargado de mantención, alta sin medición, `estado_registro`, `fecha_completada_ot`, `requiere_revision_inspector` | CC-026 | BLOQUEADO | AM-01, AM-02, PA-04 |

### Pendientes previos que siguen abiertos (referencia)

N21 (infraestructura sin componente aplicable) · frontend issue #4
(silueta del diagnóstico) · integración del rediseño según CC-025
(dirección visual aprobada; integración progresiva, módulo por módulo,
pendiente) · CC-016 (INDICES) · CC-014 (duplicación en
DICCIONARIO_CAMPOS) · backlog GitHub #5, #6, #9–#15.
