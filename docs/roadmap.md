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

- **Aplicar `database/migrations/002_multiproject_structure.sql` al
  entorno/proyecto Supabase objetivo (producción).** Fue diseñada y
  revisada estáticamente por el subagente `qa`, y luego ejecutada y
  validada de punta a punta en un proyecto Supabase de prueba/desechable
  (no en producción): escenario limpio `001 → 002` y escenario con datos
  legacy, con resultado Escenario B `25 PASS / 0 FAIL`. **Aún no ha sido
  aplicada al entorno/proyecto objetivo real.** Ver nota operativa de
  testing local en `docs/workflow.md` §8.
- **Migración `003` (backfill)** — bloqueada: requiere que la autora del
  proyecto defina explícitamente el/los proyecto(s) de destino para filas
  legacy en `trees`, `incidents`, `public_spaces`. No crear un "proyecto
  legacy" automático (decisión explícita, ver ADR-005 v2.0 / PR-005 v3.0).
- **Migración `004`** — bloqueada por `003`. Debe fijar `NOT NULL` en los
  tres `project_id` y retirar las FK simples `*_transitoria` que hoy
  coexisten con las FK compuestas `MATCH SIMPLE` (ver comentarios en
  `database/schema.sql`).
- **RLS (Row Level Security)** — diferida hasta estabilizar membresía y
  autorización en backend (ADR-005 v2.0). No diseñada todavía.

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
