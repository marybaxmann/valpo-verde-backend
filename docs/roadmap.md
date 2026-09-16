# Roadmap — Pendientes consolidados

## Propósito

Este archivo es un índice de tareas pendientes. No es una fuente de reglas
ni de decisiones: cada pendiente aquí listado remite a la PR / ADR /
documento metodológico donde vive la decisión (o la ausencia de ella).

Si hay una diferencia entre lo que dice este archivo y `project-rules.md`,
`architecture-decisions.md` o `docs/methodology/`, esos documentos mandan.
Este archivo solo se actualiza tachando o quitando un ítem cuando el
pendiente correspondiente quede resuelto en su documento de origen.

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
  lo tienen. Cutover del backend de `service_role` a JWT de usuario por
  repository: pendiente, es trabajo coordinado y separado (ver sección
  Backend).

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

- Elegir e instalar un framework de tests (aún no elegido; ver
  README.md "Estado actual").
