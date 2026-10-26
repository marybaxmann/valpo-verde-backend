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
- **Fase 6 — cierre de la inspección y listados de OT (orden acordado):**
  - Capa TS de #59 + #72 (`POST /api/sivu/inspections/:id/calcular` y
    `.../finalizar`, CC-054/CC-055/CC-056) — implementada en
    `wip/cc056-completitud`, **en revisión de la responsable**.
  - **B3 — listar las OT del proyecto** (CC-061, EN REVISIÓN): solo
    lectura; filtra por rol y proyecto con `assertProjectRole`/
    `assertProjectAccess` (Inspector: solo las suyas; Usuario municipal y
    Administrador: todas las del proyecto; Encargado de mantención: no,
    en las de Inspección). Pendiente.
  - **B4 — listar las OT asignadas al usuario** (CC-061, EN REVISIÓN):
    solo OT de proyectos con acceso. Pendiente.

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
| PA-01 | Tratamiento del motor implementado con reglas de borrador (excepción controlada, publicación 2.0.0 o resultados provisionales); formato de `rule_version` — decidido en CC-030: publicar 2.0.0 antes de implementar; `rule_version` 2.0 en cada resultado; diagramas y autorización de publicación pendientes | C1 | RESUELTO (decisión; publicación pendiente) | PA-19, C4 |
| PA-02 | Tratamiento de ADR-006 frente a CC-022 | C2 | PENDIENTE DE DECISIÓN | — |
| PA-03 | CC-015: modelo de roles (Administrador, Usuario municipal, Inspector, Mantenimiento; varios roles por persona; rol por proyecto; permisos) — cerrado por CC-026 (cuatro roles) y CC-032 (identificadores `inspector` y `encargado_mantencion`; un rol global por usuario, AMD-31) | D §2, CC-015 | RESUELTO | PA-02 (definitiva), PA-05, PA-07, PA-08 |
| PA-04 | DA-01: implementación concreta (credencial, permisos, revisión de ADR-014 / PR-018) — decidido en CC-033: escrituras solo por el backend con credencial de servicio; RLS sin escritura directa (ADR-014 v2.0, PR-018 v3.0) | D §1, §4; S1, S2 | RESUELTO (decisión) | PA-25, PA-26, PA-27 |
| PA-05 | DA-02: diseño de INSPECCIONES (Q5 ADR-016, Q6, Q8, Q9) | D §1, §8; X4, X5 | PENDIENTE DE DECISIÓN | PA-26 (inspector) |
| PA-06 | DA-03: esquema de eventos (D1–D5, D9, D12) | D §1, §6; I2 | PENDIENTE DE DECISIÓN (concepto aprobado) | PA-27 |
| PA-07 | DA-04: matrices y datos por transición (T-01 a T-13) — parcialmente resuelto por CC-050 (transiciones de la OT: quién hace cada paso, requisitos de Completada, Cancelada, cambio de responsable); quedan sin decidir las transiciones de INCIDENCIA | D §1, §7; I3, X3 | PENDIENTE DE DECISIÓN (OT resuelta por CC-050; INCIDENCIA sigue pendiente) | PA-27 |
| PA-08 | Visibilidad de nombres entre miembros del proyecto (Q7) | I1-b | PENDIENTE DE DECISIÓN | — |
| PA-09 | CC tipo 1 por `INSPECCIONES.nivel_riesgo` (Q10) | X1 | PENDIENTE DE DECISIÓN | PA-05 |
| PA-10 | Etiquetas `demo-2026-10-10` (crear / publicar) | D §2 K3 | PENDIENTE DE DECISIÓN | — |
| PA-11 | Registrar CC-025 y demás candidatos (alcance y estado propuestos) | D §5 | PENDIENTE DE DECISIÓN | — |

### Verificación y entorno

| ID | Pendiente | Origen | Estado | Depende de |
|---|---|---|---|---|
| PA-12 | ~~Verificar en navegador la rama del 2026-10-11 (P1–P7) y decidir su PR a `main`~~ Verificada por la autora el 2026-10-20 (K4): P1–P5 y P7 OK; P6 con falla parcial ya existente en `main` (PA-43); observación de fluidez en P3–P4 (PA-44). PR a `main`: backend #23, frontend #9 | H §1; D §2 K4 | RESUELTO | — |
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
| PA-39 | Endurecimiento menor: funciones ejecutables sin sesión, contraseñas filtradas, `search_path`, cabeceras, límite de tasa. `search_path` resuelto (migración 017b). Contraseñas filtradas (HaveIBeenPwned): **no disponible en el plan gratuito de Supabase** (Supabase rechaza el cambio); limitación aceptada en `valpo-verde-conecta` y `valpo-verde-conecta-pruebas`. Mitigación verificada por la responsable en el panel (2026-10-21), igual en ambas bases: longitud mínima 12 caracteres; letras, dígitos y símbolos con mayúsculas y minúsculas (los cuatro tipos obligatorios); contraseña actual obligatoria para cambiarla. Pendiente para producción (ADR-013): plan Pro con la protección activada | S3, S4, S5 | Baja | PENDIENTE (cabeceras, límite de tasa; contraseñas filtradas BLOQUEADO por el plan) | Plan Pro de Supabase, para producción |
| PA-40 | Tablas y columnas del modelo inicial sin uso (borrar requiere autorización) — decidido en CC-032: `inspections` se reutiliza como INSPECCION; las otras seis tablas de 001 se retiran tras verificar que están vacías, en migración aparte con autorización | I4 | Baja | RESUELTO (decisión) | PA-05, PA-06 |
| PA-41 | Validación de fecha en la función de alta con hora de Chile | I5 | Baja | PENDIENTE | PA-04 |
| PA-42 | Caché global y relectura completa tras editar (aceptados por ahora) | P4d, P4e | Baja | PENDIENTE | — |
| PA-43 | Pantalla del mapa en anchos de 860 px o menos: el menú pasa arriba y la pantalla del mapa (`height: 100vh`, `overflow: hidden`) pierde la parte inferior (`global.css:1297`, frontend). Ya existía en `main`; no la introduce `feature/demo-sivu` | K4 · P6 (2026-10-20) | Por definir | PENDIENTE | — |
| PA-44 | La navegación entre módulos y la apertura de fichas responden bien, pero no del todo fluidas (observación de rendimiento) | K4 · P3–P4 (2026-10-20) | Por definir | PENDIENTE | — |

### Auditoría del modelo de datos 2026-10-18 (CC-026)

Decisiones aprobadas en CC-026 (`docs/auditorias/2026-10-18-modelo-datos/`). Resuelven en parte PA-02 (ADR-006 v2.0), PA-03 (cuatro roles; identificadores y rol único cerrados por CC-032) y PA-05 / PA-07 (inspección con `estado_registro`; cierre de OT de Mantenimiento).

| ID | Pendiente | Origen | Estado | Depende de |
|---|---|---|---|---|
| AM-01 | ~~Sincronizar el Excel maestro con la copia auditada~~ Resuelto por CC-028: el Excel maestro (`docs/excel/Base de Datos Valpo Verde.xlsx`) es el Excel auditado, con REGLAS_INDICADORES y VERSION | CC-026 / CC-028 | RESUELTO | — |
| AM-02 | ~~Confirmar los conflictos P1–P9~~ Resuelto por CC-028: prevalece el Excel auditado (la corrección y anulación de mediciones queda sin regla) | CC-026 / CC-028 | RESUELTO | — |
| AM-07 | ~~Actualizar los textos contradichos por CC-028~~ Resuelto en la Fase 2 (2026-10-20): CC-008, CC-009 y CC-020 reemplazados; PR-002 v3.0, PR-006 v9.0, PR-010 v3.0, ADR-010 v3.0, ADR-016 v3.0; `modelo-arbol-medicion.md` marcado como historial; `workflow.md` §14.12 sin efecto (CC-035) | CC-028 | RESUELTO | — |
| AM-03 | ~~Responder las preguntas abiertas P10–P14 (INCIDENCIA, SECTORES, proyectos, Hoja4)~~ Resuelto (AMD-31 a AMD-34) | CC-026 `pendientes.md` | RESUELTO | — |
| AM-05 | ~~Auditar MATRICES_CALCULO~~ registrado en CC-027; INDICES pendiente de revisión posterior (P16) | CC-026 / CC-027 | PENDIENTE (INDICES) | Revisión de la autora |
| AM-06 | ~~Implementar CC-027 y CC-029: R03 con defoliación, etiquetas del maestro, cavidades 09 y 10, M04 y M05~~ Resuelto por la Fase 5 (motor de reglas, PR #70 fusionado en `main`, `874c938`): `src/services/rules/engine/` — R01–R04, M01–M05, variables derivadas, 62 reglas RC-*/TR-*/CR-* (RC 23 + TR 26 + CR 13), 36 reglas IN-* (juntas, las 98 del paquete), con `reglaId` por indicador | CC-027, CC-029 | RESUELTO | — |
| AM-04 | Implementar CC-026 y CC-031 a CC-037: roles Inspector y Encargado de mantención, alta sin medición, `estado_registro` y anulación, `fecha_completada_ot`, `requiere_revision_inspector`, escrituras por el backend, catálogos, incidencias por QR, recordatorios | CC-026 | BLOQUEADO | AM-08 (publicación de 2.0.0), AM-09, PA-13, autorización |
| AM-08 | ~~Publicar el paquete 2.0.0~~ Publicado el 2026-10-20 con aprobación expresa de la autora: VERSION fila 5 (PR #30), `00-index.md`, `01–05`, PR-011 v3.0, PR-012 v2.0, PR-014 v2.0, export de texto y verificación §14.9 sin hallazgos (PR #27). Tag `metodologia-v2.0.0` sobre el merge del PR #27 | CC-030 | RESUELTO | — |
| AM-09 | Datos simulados (todo es simulado, incluidos A-000013/14 y los proyectos y usuarios de la demo): inventario de solo lectura y limpieza de las bases de prueba con autorización; seed solo para desarrollo en `database/seeds/dev/`. La base de producción se creará vacía cuando la plataforma esté lista (ADR-013) | CC-038 | PENDIENTE | Autorización de la autora |
| AM-10 | ~~Actualizar el Excel maestro con los textos propuestos en CC-031, CC-032, CC-036 y CC-037~~ Resuelto en el PR #28 (2026-10-20), junto con la edad estimada opcional (CC-039), la referencia estacional de la defoliación (AM-11) y la fila 5 de VERSION | CC-031, CC-032, CC-036, CC-037 | RESUELTO | — |
| AM-11 | ~~Definir cómo se evalúan la defoliación y la clorosis en especies caducifolias durante su período sin hojas~~ Cerrado sin regla nueva (2026-10-20): `defoliacion_estimada_pct` se estima respecto de una copa de referencia de la misma especie y condición estacional; en receso, la pérdida estacional no cuenta como defoliación (0 %). La autora lo explicita en el Excel (AM-10) | CC-039 | RESUELTO | — |
| AM-12 | Cargar en el Excel los textos de CC-040 (REGLAS_GENERALES con los campos por subtipo de Monitoreo, D-209 y D-27), en un PR aparte desde la sesión de auditoría; publicar en la siguiente versión del paquete | CC-040 | HECHO (2026-10-21): REGLAS_GENERALES fila 28, D-209 J y L, D-27 I y K; VERSION 2.1.0 en preparación | Rama `docs/am-12-textos-cc-040` |
| AM-13 | Publicar el paquete 2.1.0 antes de la Fase 4. Fase 3 cerrada (PR #31 y #33 fusionados en `main`, `34d8e99`); `00-index.md` con la fecha; verificación §14.9 sin hallazgos; fichas de CC-040 y CC-042 en `FUENTE SINCRONIZADA`. Falta: VERSION fila 6 (estado, fecha, aprobado_por) y el tag `metodologia-v2.1.0`, a cargo de la sesión de auditoría en un PR aparte (como el PR #30 de 2.0.0) | CC-040, CC-042 | RESUELTO (documentación); VERSION/tag pendientes de ese PR aparte | Aprobación expresa de la autora sobre este PR |
| AM-14 | Diseñar la política de Storage para el bucket de fotos (quién sube, quién lee, público o firmado) antes de implementar la subida. El §6 de la Fase 3 no lo define; la migración 017 (RLS, CC-033) no tocó Storage porque hoy no existe ningún bucket ni política en `valpo-verde-conecta-pruebas` (verificado) — no se inventó una regla | PR-010 v4.0 (fotos) | RESUELTO — ver CC-049 (bucket privado, subida solo por el backend, lectura firmada, 10 MB, verificación de contenido real, EXIF/GPS fuera de las fotos ciudadanas, límite de tasa) | Bucket y políticas de Storage todavía sin crear — pendiente de implementar |
| AM-15 | Llevar al Excel los textos de CC-043 (REGLAS_INDICADORES IN-RAE y D-139, "Función no determinada"), CC-044 (D-170, D-172, D-171, ajuste sobre un valor calculado No determinado/No aplica), CC-045 (REGLAS_GENERALES "Historial y vigencia"/"Preguardado y finalización", D-200, D-202, D-203), CC-046 (D-9/D-10, D-255, REGLAS_GENERALES — árbol dentro del sector), CC-047 (D-255 — selección obligatoria con varias superficies y superficies inválidas del KML/KMZ) y CC-050 (D-241 columna "¿Quién lo ingresa?": Usuario municipal → el responsable asignado, al pasar a Programada; D-239 columna de validación: agregar "y al menos una inspección Finalizada" al requisito de Completada), CC-054 (D-209 «Cómo se obtiene» y «Condición de activación»: Finalizado se asigna cuando el Inspector finaliza de forma explícita, después de ver los valores calculados, no al guardar) y CC-055 (D-202, D-203 y REGLAS_GENERALES fila 25, texto final del 2026-10-25: Evaluación inicial, Reevaluación, Levantamiento y Evaluación instrumental renuevan ambas fechas según el `nivel_riesgo` nuevo; en Monitoreo se renueva `fecha_proximo_monitoreo` y `fecha_proxima_inspeccion` sugerida = la menor entre la vigente del árbol y la calculada con el riesgo nuevo, nunca anterior al día siguiente a `fecha_inspeccion` — un Monitoreo adelanta la reinspección, nunca la atrasa; reinspección atrasada: el día siguiente a `fecha_inspeccion`; fecha vigente = la de la última inspección Finalizada de una OT Completada que la registró; «la última» = `fecha_completada_ot`, luego `fecha_inspeccion`, luego `inspections.created_at` (REGLAS_GENERALES fila 13); el tope es solo para la sugerida: el Inspector puede ajustar a una fecha posterior a la vigente con `justificacion_ajuste_fecha`; D-204: la justificación solo se registra si alguna fecha difiere de su sugerida; D-202 posterior y D-203 igual o posterior a `fecha_inspeccion`) y CC-056 (columna K de DICCIONARIO_CAMPOS: las traducciones aprobadas de las condiciones en prosa y de las categorías mixtas; D-13: **interpretación de la responsable**, se exige solo para finalizar Evaluación inicial, Reevaluación y Levantamiento, no Instrumental ni Monitoreo — D-13 dice «para finalizar la inspección» sin distinguir tipo y la fila 28 limita las parciales a su alcance; D-125: `superficie_alcorque_m2_manual` como campo propio del Inspector con forma Irregular; D-13 y D-257: «Género spp.» se trata igual que «Género sp.», decisión de la responsable del 2026-10-26), y publicar el paquete 2.2.0 — mismo procedimiento que AM-12/AM-13 (PR aparte desde la sesión de auditoría). Hasta entonces, el motor de reglas (Fase 5) y la Fase 6 (CC-046/CC-047/CC-050, issues #56/#57/#58) aplican estas decisiones aunque el Excel todavía no las tenga | CC-043, CC-044, CC-045, CC-046, CC-047, CC-050, CC-054, CC-055, CC-056 | PENDIENTE | Rama aparte, como `docs/am-12-textos-cc-040`; aprobación expresa de la autora |
| AM-17 | ~~Catálogo de códigos persistentes (PR-021; `catalogs.ts`) sin entrada para `clasificacion_vitalidad`~~ **Corrección de la responsable (2026-10-25): no era un vacío metodológico, era una falta de implementación — el Excel ya define el dominio en D-169 ("0 Exploración / 1 Degeneración / 2 Estancamiento / 3 Resignación / Muerto").** Agregados los 5 códigos a `catalogs.ts` (catálogo `clasificacion_vitalidad`, snake_case, PR-021) y validado el valor del campo contra ese catálogo en `inspeccion.schema.ts` (antes se aceptaba como texto libre). Prueba que compara las etiquetas vigentes contra el dominio del Excel (`catalogs.test.ts`), mismo patrón que el resto de los catálogos | D-169; CC-040 (a) | RESUELTO (2026-10-25) | — |
| AM-16 | ~~Corregir `docs/diseno/fase3-modelo-datos-2.0.0.md`: cita `fecha_proxima_inspeccion` como D-202 y `justificacion_ajuste_fecha` como D-204. En el export actual de DICCIONARIO_CAMPOS esas filas están en la 212 y la 214 (el Excel se reordenó después de escribirse ese documento, probablemente al incorporar CC-040/AM-12). Detectado al planificar la Fase 6; usar la numeración actual (D-212/D-213) en todo lo nuevo mientras este documento no se corrige~~ **SIN EFECTO (2026-10-23):** el diseño de la Fase 3 citaba bien. D-n es la fila de la hoja DICCIONARIO_CAMPOS en el .xlsx (encabezado en la fila 1), nunca la línea del CSV exportado por `exportar_excel.py` — ese CSV cita, con comillas y saltos de línea dentro de una celda, por lo que una fila de la hoja puede ocupar varias líneas físicas del CSV; la numeración se desfasa a partir de la primera celda con salto de línea (~fila 110). Esta entrada confundió la línea del CSV (212/214) con la fila real del Excel (202/204, que el diseño ya citaba bien) y mandó usar la numeración equivocada "en todo lo nuevo" — de ahí el error que se propagó a CC-043 a CC-047, AM-15, el motor y las migraciones 018b a 018d. Verificado con `scripts/metodologia/fila_diccionario.py` (lee el .xlsx con openpyxl, no el CSV); ver el commit "docs: corrige citas D-n" | Diseño Fase 3 §3, planificación de la Fase 6 | SIN EFECTO | — |
| AM-18 | Corregir `v_upcoming_inspections` (migración 016): hoy toma las fechas de la inspección Finalizada más reciente sin exigir que su OT esté Completada, así que una inspección de una OT todavía abierta ya aparece en los recordatorios aunque sus valores no sean vigentes. **Error de implementación, no metodológico:** REGLAS_GENERALES fila 12 ya exige que los valores nuevos rijan solo al completar la OT. La vista debe considerar solo inspecciones Finalizadas de OT Completadas. Se corrige junto con el cambio de la vista de CC-055 (cada fecha tomada de la inspección que la registró), en el #63 (recordatorios) — salvo que haga falta adelantarlo para la coherencia de la 020 | REGLAS_GENERALES fila 12; CC-055 | PENDIENTE | #63 |
| AM-19 | Unificar el filtro de inspecciones válidas: **`v_tree_fechas_vigentes`** (020) filtra `estado_registro = 'finalizado'`, mientras que `fn_refresh_tree_current` y `v_tree_current_inputs` filtran `estado_registro <> 'anulado'`. Hoy es equivalente, porque una OT no se completa con inspecciones en Preguardado (CC-050), pero al implementar completar la OT hay que unificar el filtro en las tres. No se cambia ahora (pedido de la responsable, 2026-10-25) | CC-050; CC-055 | PENDIENTE | Bloque de estados restantes de la OT (completar la OT) |
| AM-20 | Revisión metodológica de `clasificacion_vitalidad` (D-169) en palmeras: D-169 dice «La aplicación a palmeras queda sujeta a revisión metodológica». Mientras no se revise, no tiene efecto en la completitud: la vitalidad se exige en Evaluación inicial, Reevaluación, Levantamiento y Monitoreo Vitalidad sin excepción por especie (CC-056, decisión g) | CC-056 | PENDIENTE | Revisión metodológica de la responsable |

### Pendientes previos que siguen abiertos (referencia)

N21 (infraestructura sin componente aplicable) · frontend issue #4
(silueta del diagnóstico) · integración del rediseño según CC-025
(dirección visual aprobada; integración progresiva, módulo por módulo,
pendiente) · CC-016 (INDICES) · CC-014 (duplicación en
DICCIONARIO_CAMPOS) · backlog GitHub #5, #6, #9–#15.
