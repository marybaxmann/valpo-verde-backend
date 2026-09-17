# Checkpoint Valpo Verde — 2026-09-16

Documento de continuidad. Resume el estado REAL y verificado del
repositorio en el momento de escribirlo (commit `300ce36`). No sustituye
a `CLAUDE.md`/`docs/project-rules.md`/`docs/architecture-decisions.md`
como fuente de verdad — si algo de aquí llegara a diferir de esos
documentos en el futuro, esos documentos mandan (mismo criterio que
`docs/roadmap.md`).

---

## 1. Estado general

- **Objetivo del proyecto:** API REST para la gestión del arbolado urbano
  de Valparaíso (inventario, evaluación técnica, incidencias,
  mantenimiento), con metodología de evaluación basada en diagramas
  técnicos entregados por la autora.
- **Stack:** Node.js + Express + TypeScript + Zod + Supabase (PostgreSQL,
  Auth, Storage).
- **Repositorio backend:** `valpo-verde-backend`
  (`https://github.com/marybaxmann/valpo-verde-backend`).
- **Rama actual:** `main`.
- **Estado del working tree:** limpio (`git status` sin salida) al
  momento de escribir este checkpoint.
- **Último commit relevante:** `300ce36` — "docs: record JWT RLS cutover
  architecture".
- **Entorno Supabase actual:** `valpo-verde-conecta`
  (`ytcxswbulsmboucardxa.supabase.co`), proyecto `ACTIVE_HEALTHY`.
- **Aclaración desarrollo/pruebas vs. producción (ADR-013):**
  `valpo-verde-conecta` es oficialmente el entorno de
  **desarrollo/pruebas**, aunque su propio dashboard de Supabase muestre
  la etiqueta `main` / `PRODUCTION` — esa etiqueta es de la plataforma
  Supabase, no una afirmación sobre su rol para este proyecto. El entorno
  productivo real es un proyecto Supabase **separado**, todavía **no
  creado**. Ninguna migración (`002`-`005`) se ha aplicado a producción.

---

## 2. Arquitectura backend actual

- **Estructura general** (`src/`, capas estrictas, verificado por
  archivos reales presentes):
  ```
  src/
  ├── app.ts, server.ts
  ├── config/        env.ts, supabase.ts
  ├── routes/        index.ts, auth.routes.ts, project.routes.ts
  ├── controllers/   auth.controller.ts, project.controller.ts, projectMember.controller.ts
  ├── services/      auth.service.ts, authorization.service.ts, project.service.ts, projectMember.service.ts
  ├── repositories/  auth.repository.ts, userProfile.repository.ts, project.repository.ts, projectMember.repository.ts
  ├── schemas/       project.schema.ts, projectMember.schema.ts (Zod)
  ├── middlewares/   auth.middleware.ts, error.middleware.ts
  ├── types/         auth.ts, express.d.ts
  └── utils/         AppError.ts
  ```
- **Auth:** Supabase Auth desde el frontend (no implementado en este
  repo); backend valida el JWT recibido. Ver sección 4.
- **Roles:** `admin`, `usuario_municipal` — globales, viven en
  `user_profiles.role_id` → `roles`. Ver sección 3.
- **Projects / project_members:** modelo multiproyecto implementado y
  validado. Ver sección 7.
- **Services:** casos de uso y coordinación; `authorization.service.ts`
  centraliza la autorización (no dispersa en controllers/repositories).
- **Repositories:** único punto de acceso a Supabase. Dos vías de
  cliente: `supabaseAdmin` (`service_role`) y
  `createUserScopedClient(accessToken)` (JWT del usuario). Ver sección 4.
- **Middleware:** `auth.middleware.ts` (valida Bearer, adjunta
  `req.user`/`req.accessToken`), `error.middleware.ts` (único lugar que
  da forma a la respuesta de error; nunca deja pasar mensajes crudos de
  Supabase/Postgres).
- **Autorización:** dos capas — backend (`authorization.service.ts`) +
  RLS en Supabase/Postgres. RLS no reemplaza la de backend. Ver
  sección 5.

---

## 3. Roles y permisos actuales

**Rol global** (`user_profiles.role_id` → `roles.nombre`, uno por
usuario, independiente de cualquier proyecto):

- **`admin`**: acceso transversal a todos los proyectos; crea proyectos;
  gestiona miembros (alta/baja); acceso admin-only a
  `/api/projects/:id/members`.
- **`usuario_municipal`**: NO crea proyectos; NO gestiona miembros; solo
  ve/opera sobre proyectos donde tenga membership.

**Membership por proyecto** (`project_members`, tabla de pertenencia
pura, SIN rol propio — el rol siempre es el global de arriba):

- Una fila `(project_id, user_id)` = "este usuario pertenece a este
  proyecto". `usuario_municipal` solo accede a un proyecto si existe esa
  fila para él. `admin` no depende de esta tabla para su propio acceso
  (es transversal por rol), pero sí la usa para saber a quién puede
  quitar/agregar.

No hay más roles definidos ni previstos en este momento — no inventar
ninguno adicional.

---

## 4. Flujo de autenticación actual

```
Request
→ Authorization: Bearer <JWT>
→ auth.middleware.ts
→ resolveAuthenticatedUser(token)   (auth.service.ts)
→ req.user + req.accessToken
→ controller
→ service (autorización de backend: assertAdmin / assertProjectAccess)
→ repository
→ createUserScopedClient(accessToken)   (src/config/supabase.ts)
→ Supabase como rol "authenticated"
→ RLS (policies de la migración 005)
```

- `req.accessToken` (JWT crudo) se adjunta en `auth.middleware.ts` justo
  después de `req.user`, solo si la validación fue exitosa.
- `createUserScopedClient(accessToken)` crea un cliente Supabase **nuevo
  por llamada** (nunca un singleton) con `SUPABASE_ANON_KEY` +
  `Authorization: Bearer <accessToken>`.

**Operaciones que siguen usando `service_role` (`supabaseAdmin`), sin
cambios, por diseño:**
- `getAuthUserByToken` (`auth.repository.ts`) — valida el JWT contra
  Supabase Auth; ocurre antes de que exista un "usuario autenticado".
- `findUserProfileById` (`userProfile.repository.ts`) — resuelve tanto
  el propio perfil como el de un usuario destino consultado por un
  admin; queda como operación interna privilegiada.

**Migradas a `createUserScopedClient` (JWT del usuario):** las 8
funciones de `project.repository.ts` (`findAllProjects`,
`findProjectsForMember`, `findProjectById`, `createProject`) y
`projectMember.repository.ts` (`findMembership`, `listMembersByProject`,
`createMembership`, `deleteMembership`).

---

## 5. Seguridad / RLS

- **Migración:** `database/migrations/005_rls_policies.sql` — aplicada y
  validada en `valpo-verde-conecta` (commit `131b999`).
- **Funciones `SECURITY DEFINER`** (4): `get_user_role()`,
  `is_project_member(p_project_id uuid)`, `is_admin()`,
  `is_municipal_member(p_project_id uuid)`. Todas con
  `SET search_path = public, pg_temp` (mitigación de search_path
  hijacking) y owner igualado al de las tablas que consultan, para
  bypasear RLS internamente y evitar cadenas de re-evaluación.
- **Tablas con RLS habilitado** (6, primera fase): `user_profiles`,
  `project_members`, `projects`, `public_spaces`, `trees`, `incidents`.
- **Cantidad de policies:** 15 en total, **todas** con `TO authenticated`
  explícito (ninguna aplicada a `PUBLIC` por omisión, verificado también
  por un bloque de la propia migración que aborta si detecta lo
  contrario).
- **`service_role`:** confirmado con `BYPASSRLS` (verificado en el
  entorno real antes de aplicar `005`).
- **`authenticated` / `anon`:** confirmados SIN `BYPASSRLS`.
- **Principio de doble capa (no negociable):** backend
  (`authorization.service.ts`: `assertAdmin`, `assertProjectAccess`,
  validaciones de rol/membership) + RLS (Supabase/Postgres). RLS es
  defensa en profundidad, no un reemplazo — un endpoint futuro que
  omitiera la Capa 1 seguiría protegido a nivel de fila por la Capa 2,
  pero la Capa 1 sigue siendo obligatoria para mensajes de error
  correctos (403/404/409) y no debe eliminarse nunca a cambio de RLS.

Tablas **sin** RLS todavía (fuera de esta primera fase, sin endpoints
propios hoy): `roles`, `species`, `inspections`, `maintenance`,
`infrastructure_conflicts`, `photos`, `defect_observations`,
`defect_results`, `component_assessments`, `probability_thresholds`,
`vitality_assessments`, `risk_evaluations`, `audit_log`.

---

## 6. Migraciones

| # | Propósito | Estado | Aplicada | Validada | Decisiones importantes |
|---|---|---|---|---|---|
| `001_init.sql` | Esquema inicial completo (Etapa 3) | Vigente | Sí (base) | Sí | Principios: árbol nunca se sobrescribe; separación observado→calculado→decisión; no inventar metodología; RLS fuera de este archivo |
| `002_multiproject_structure.sql` | Estructura multiproyecto: tablas `projects`/`project_members`, columnas `project_id` NULLABLE en `trees`/`incidents`/`public_spaces`, FKs compuestas `MATCH SIMPLE` + FKs simples `*_transitoria` | Vigente | Sí, en `valpo-verde-conecta` | Sí — Escenario B `25 PASS / 0 FAIL` | No crea proyecto legacy ni backfill automático |
| `003_multiproject_backfill.sql` | Backfill del `project_id` de filas legacy, con mapeo explícito por entorno (tablas `TEMP` sin FK a permanentes — Postgres no lo permite; validación de existencia + cobertura vía `RAISE EXCEPTION`) | Vigente | Sí (commit `4ea63fa`) | Sí | En este entorno: 0 filas legacy, se aplicó con las 3 tablas de mapeo vacías; no se creó ningún "proyecto legacy" |
| `004_multiproject_finalize.sql` | `SET NOT NULL` en los 3 `project_id`; retiro de las 2 FK `*_transitoria`; FKs compuestas intactas | Vigente | Sí (commit `1f4da03`) | Sí | Precondición aborta si queda algún `project_id NULL`; verificación posterior por catálogo (`pg_attribute`/`pg_constraint`) |
| `005_rls_policies.sql` | RLS como segunda barrera: 4 funciones `SECURITY DEFINER` + 15 policies en 6 tablas | Vigente | Sí (commit `131b999`) | Sí — H1-H7 y luego E1-E7 | `TO authenticated` explícito en todas; `roles` queda fuera de esta fase |

**Ninguna de las 5 se ha aplicado al entorno productivo real** (no
existe todavía).

---

## 7. Modelo multiproyecto

- **`projects`**: `id`, `name`, `institution_name`,
  `responsible_professional` (nullable), `created_by` (FK
  `user_profiles`, `ON DELETE SET NULL`), `status` (`activo`/`cerrado`,
  default `activo`), `created_at`, `updated_at`. Sin `UNIQUE` global en
  `name`. Sin eliminación física — el cierre se representa con `status`.
- **`project_members`**: `id`, `project_id`, `user_id`, `created_at`,
  `added_by` (nullable). `UNIQUE(project_id, user_id)`. Representa
  **solo pertenencia**, sin rol propio.
- **`project_id`** (NOT NULL desde `004`) en `trees`, `incidents`
  (directo, porque `tree_id` es nullable), `public_spaces`.
- **FKs compuestas** (`MATCH SIMPLE`, únicas desde `004`):
  `trees_project_public_space_fkey` (`project_id, public_space_id` →
  `public_spaces(project_id, id)`), `incidents_tree_project_fkey`
  (`tree_id, project_id` → `trees(id, project_id)`).
- **Reglas principales:** `species` es catálogo global; `public_spaces`
  es scoped por proyecto (`UNIQUE(project_id, nombre)`); `tree_code`
  mantiene secuencia global (`A-000001`, …); `admin` transversal,
  `usuario_municipal` solo vía `project_members`.
- **Estado actual de datos de prueba** (verificado en vivo en
  `valpo-verde-conecta` al momento de escribir este checkpoint):
  1 proyecto ("Proyecto Valparaíso"), 1 membership (usuario municipal de
  prueba → ese proyecto), 0 filas en `trees`/`incidents`/`public_spaces`,
  2 `user_profiles` (1 admin, 1 usuario_municipal, ambos `activo=true`).
  Este conteo puede cambiar con el uso normal del entorno de
  pruebas — es una foto del momento, no un invariante.

---

## 8. Endpoints implementados

Confirmado contra `src/routes/index.ts`, `auth.routes.ts` y
`project.routes.ts` reales — **no hay ningún otro endpoint montado** (el
propio `routes/index.ts` deja comentadas, sin implementar, las rutas
futuras de trees/inspections/incidents/maintenance/infrastructure-
conflicts/dashboard).

| Método | Ruta | Rol requerido | Comportamiento relevante |
|---|---|---|---|
| GET | `/api/auth/me` | Cualquier usuario autenticado | Devuelve el perfil de aplicación (`AuthenticatedUser`) resuelto por el middleware |
| GET | `/api/projects` | Cualquier autenticado | `admin` → todos los proyectos; `usuario_municipal` → solo los suyos vía `project_members` |
| POST | `/api/projects` | `admin` | 403 si no es admin; `created_by` siempre del JWT, nunca del body (Zod `.strict()` lo rechaza si viene) |
| GET | `/api/projects/:id` | Cualquier autenticado | `admin` siempre; `usuario_municipal` solo si tiene membership (403 si no, sin distinguir de "no existe") |
| GET | `/api/projects/:id/members` | `admin` | 403 para `usuario_municipal` |
| POST | `/api/projects/:id/members` | `admin` | 404 si el usuario destino no existe; 409 si la membresía ya existe (`UNIQUE(project_id,user_id)`) |
| DELETE | `/api/projects/:id/members/:userId` | `admin` | 204 si existía y se eliminó; 404 si no existía |

No implementar ningún endpoint fuera de esta tabla sin que exista
realmente en el código al momento de leerlo.

---

## 9. Tests

- **TypeScript productivo** (`npx tsc --noEmit`): 0 errores (verificado
  en este checkpoint).
- **TypeScript tests** (`npx tsc -p tsconfig.jest.json`): 0 errores
  (verificado en este checkpoint).
- **Suites:** 5 (`auth.routes`, `project.routes`, `projectMember.routes`,
  `userProfile.repository`, `projectMember.repository`).
- **Tests:** 33/33 PASS (verificado en este checkpoint, no solo
  reportado).
- **H1-H7** (tests SQL de RLS, contra Supabase real): 7/7 PASS — admin
  transversal, municipal miembro, municipal no miembro, usuario sin
  perfil, usuario inactivo (lee su propio perfil pero sin acceso
  operacional), acceso cruzado entre proyectos bloqueado, control
  negativo de `service_role`.
- **E1-E7** (validación E2E manual con JWTs reales): 7/7 PASS. Ver
  sección 10.
- **Qué cubre Jest:** lógica de `authorization.service.ts`,
  `project.service.ts`, `projectMember.service.ts`, controllers, y la
  traducción de errores en los repositories (`23505`→`DuplicateMembershipError`,
  interpretación de resultados) — todo mockeando los repositories/cliente
  Supabase completos.
- **Qué NO cubre Jest:** el comportamiento real de RLS (las policies
  nunca se ejecutan contra Postgres en la suite automatizada), ni que
  `createUserScopedClient` realmente haga que `auth.uid()` resuelva al
  usuario correcto contra Supabase real. Esa cobertura la dan
  exclusivamente H1-H7 y E1-E7.

---

## 10. Validación E2E real (E1-E7)

Ejecutada contra `valpo-verde-conecta` con JWTs reales de un usuario
`admin` y un usuario `usuario_municipal` de prueba (obtenidos vía el
flujo admin de Supabase Auth, sin necesitar sus contraseñas; ambas
sesiones revocadas al terminar).

| Caso | Qué probó | Resultado |
|---|---|---|
| E1 | `admin` → `GET /api/projects` | 200, ve los proyectos existentes |
| E2 | `admin` → `POST /api/projects` | 201, INSERT pasó RLS `projects_all_admin` con el JWT del propio admin (no `service_role`) |
| E3 | `usuario_municipal` sin membership → listado y acceso directo al proyecto nuevo | 200 con lista sin ese proyecto; 403 al acceder directo (`"No tiene acceso a este proyecto"`, backend) |
| E4 | `admin` → `POST /api/projects/:id/members` | 201, membership creada, pasó RLS `project_members_all_admin` |
| E5 | `usuario_municipal` ya con membership → listado y acceso directo | 200 incluyendo el proyecto; 200 en acceso directo |
| E6 | `usuario_municipal` → `GET /api/projects/:id/members` (admin-only) | 403 (`"Requiere rol administrador"`) — confirma que `assertAdmin` sigue cortando en backend, RLS ni llega a evaluarse |
| E7 | `admin` elimina membership → `usuario_municipal` pierde acceso | 204 en el DELETE; 200 con lista sin el proyecto; 403 en acceso directo otra vez |

**No hubo ningún HTTP 500 ni error crudo de PostgREST/Postgres en
ninguno de los 7 casos** — confirmado revisando el log del servidor
completo durante la corrida (sin una sola línea de error).

---

## 11. Supabase

- **Proyecto de desarrollo/pruebas:** `valpo-verde-conecta`
  (`ytcxswbulsmboucardxa`), `ACTIVE_HEALTHY`, región `sa-east-1`,
  Postgres 17.
- **Producción real:** no existe todavía ningún proyecto Supabase
  productivo (ADR-013).
- **Proyecto de pruebas adicional verificado:** existe además
  `valpo-verde-conecta-pruebas` (`gmlbmyreoxgoqrolhyxo`), pero su estado
  real verificado es **`INACTIVE`** — no se ha usado para nada de este
  trabajo. Se deja constancia de su existencia; no se ha decidido qué
  hacer con él.
- **Variables de entorno requeridas por el backend** (`src/config/env.ts`,
  sin valores): `PORT` (default `3000`), `CORS_ORIGIN` (default
  `http://localhost:5173`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_ANON_KEY`.
  **Inconsistencia detectada:** `.env.example` en el repo **todavía no
  incluye `SUPABASE_ANON_KEY`** (se agregó a `env.ts` en el cutover de
  RLS, pero el archivo de ejemplo no se actualizó). Cualquiera que
  clone el repo y siga `.env.example` literalmente tendrá un backend
  que no arranca hasta agregar esa variable manualmente. Ver sección B
  del mensaje que acompaña este checkpoint.
- No se incluye aquí, ni en ningún archivo versionado, ningún valor real
  de estas variables, ni tokens, ni contraseñas.

---

## 12. Decisiones arquitectónicas relevantes

- **ADR-005 v2.1** (`docs/architecture-decisions.md`) — Modelo
  multiproyecto: tablas, columnas de scope, despliegue por etapas
  `002→backend→003→004→RLS`. La Actualización 2.1 cierra ese despliegue
  como completado en desarrollo/pruebas y remite a ADR-014 para el
  detalle del cutover.
- **ADR-013** — Declara `valpo-verde-conecta` como entorno de
  desarrollo/pruebas pese a la etiqueta `PRODUCTION` de su dashboard; el
  entorno productivo real es un proyecto separado aún no creado.
- **ADR-014** — RLS como segunda barrera + cutover del backend a JWT de
  usuario: arquitectura de autenticación (sección 4 de este checkpoint),
  principio de dos capas (sección 5), contrato de frontend (sección 14),
  y los resultados de validación completos (H1-H7, E1-E7, suite
  automatizada).
- **PR-018 v2.0** (`docs/project-rules.md`) — Autenticación: login vía
  Supabase Auth desde frontend, sin `POST /api/auth/login` propio; dos
  capas de autorización; contrato de frontend (nunca `service_role`).
- Otras reglas relevantes sin cambios en esta ronda: **PR-003 v4.0**
  (usuario_municipal), **PR-004 v4.0** (admin), **PR-005 v3.0**
  (proyectos), **ADR-002** (arquitectura por capas, repositories
  encapsulan todo acceso a Supabase incluido Auth).

---

## 13. Reglas que NO deben romperse

- El frontend **nunca** usa ni contiene `SUPABASE_SERVICE_ROLE_KEY`.
- RLS **no reemplaza** la autorización de backend — ambas capas
  coexisten siempre; no eliminar `assertAdmin`/`assertProjectAccess` con
  el argumento de que "ahora RLS ya protege".
- `createUserScopedClient` **nunca** debe convertirse en singleton ni
  reutilizarse entre requests — un cliente nuevo por llamada, siempre.
- **Nunca loguear `req.accessToken`** ni el JWT completo, en ningún
  formato (ni logs, ni mensajes de error, ni archivos).
- **No inventar endpoints** que no existan realmente en
  `src/routes/` — verificar contra el código antes de asumir que algo
  está implementado.
- Mantener separada la noción de **rol global** (`user_profiles.role_id`)
  de **membership por proyecto** (`project_members`) — nunca modelarlos
  como lo mismo ni fusionarlos.
- **No mezclar datos ficticios con datos reales** en el entorno de
  desarrollo/pruebas sin dejarlo explícito (y limpiar los datos de
  prueba creados ad-hoc cuando sea razonable, como se hizo tras E1-E7).
- No aplicar ninguna migración al entorno productivo real hasta que
  exista y se repitan ahí los diagnósticos/precondiciones
  correspondientes (no asumir que el resultado será igual que en
  desarrollo/pruebas).
- No inventar metodología, umbrales, roles ni reglas de negocio no
  documentadas — el principio "no inventar" de `CLAUDE.md` sigue vigente
  para todo lo que no está en este checkpoint ni en los documentos que
  referencia.

---

## 14. Frontend

Documentado únicamente lo que se sabe con certeza hoy:

- El **frontend productivo aún no ha sido iniciado**. No existe todavía
  un repositorio `valpo-verde-frontend` con trabajo real — es solo un
  nombre previsto (ADR-001).
- Existe un **repo prototipo** — `marybaxmann/Valpo-Verde-Conecta` —
  descrito en `docs/project-rules.md` (PR-001) y `docs/workflow.md` como
  referencia funcional/UX v2 (navegación, flujo por roles, pantallas),
  **no** como fuente de metodología, reglas técnicas, ni estructura de
  base de datos, y **no** necesariamente el mismo repositorio que el
  frontend productivo futuro.
- **Qué se pretende auditar** (antes de decidir cómo continuar, ver
  sección 15, paso 1): si ese prototipo es reutilizable como base del
  frontend productivo, o si conviene empezar un repositorio nuevo — esta
  auditoría todavía no se ha hecho.
- **Flujo objetivo** frontend → Supabase Auth → backend, ya fijado como
  contrato (PR-018 v2.0 / ADR-014, sección 4/14 de este checkpoint):
  el frontend obtiene su sesión directamente de Supabase Auth, nunca usa
  `service_role`, y envía `Authorization: Bearer <JWT>` al backend en
  cada request; el backend decide identidad y permisos, el frontend solo
  adapta la UI.
- **No asumir que el prototipo actual (`Valpo-Verde-Conecta`) es válido
  tal cual** para producción — es una referencia, no una decisión
  cerrada de que se reutilizará sin cambios.

---

## 15. Próximos pasos (orden recomendado)

1. Auditar el repo prototipo actual (`Valpo-Verde-Conecta`).
2. Decidir: reutilizar ese prototipo vs. iniciar un repositorio
   productivo nuevo.
3. Implementar autenticación real contra Supabase Auth en el frontend.
4. Construir el cliente API del frontend con envío de `Authorization:
   Bearer <JWT>` en cada request.
5. Consumir `GET /api/auth/me` para resolver identidad/rol en el
   frontend.
6. Definir rutas protegidas del frontend según el rol resuelto.
7. Consumir los endpoints de proyectos/memberships ya existentes
   (sección 8).
8. Dashboard real (depende de que existan datos reales que mostrar).
9. Backend: implementar las APIs de árbol/inventario (`trees`,
   `inspections`, `incidents`, etc. — hoy no existen, ver sección 8).
10. Resto de módulos (mantenimiento, infraestructura, motor de reglas
    metodológico en `services/rules/`, dashboard, geolocalización) —
    cada uno depende de decisiones/metodología todavía pendientes, ver
    `docs/roadmap.md` sección Metodología.

**Nada de esta lista está hecho** — es orden de trabajo previsto, no
progreso. No marcar ningún paso como completado hasta que exista
evidencia verificable en el código (igual criterio que el resto de este
checkpoint).

---

## 16. Commits relevantes recientes

```
300ce36 docs: record JWT RLS cutover architecture
737ea25 feat: enforce RLS with user-scoped Supabase clients
263e6ff docs: define Supabase environments and record RLS validation
131b999 feat: add row level security policies
b6df792 chore: sync schema after multiproject finalize
1f4da03 feat: finalize multiproject schema
4ea63fa feat: add multiproject backfill migration
782b60b test: add project authorization coverage
0aa9c0b docs: record project membership validation
4227c6c fix: disambiguate project member relation
49cdb73 feat: add project membership authorization
1fb27b7 docs: sync roadmap and migration validation status
9d20137 refactor: encapsulate Supabase Auth in repository
60c4bc9 Estado inicial: backend + documentación consolidada + subagentes
```

Específicamente pedidos:
- **RLS `005`:** `131b999` — "feat: add row level security policies".
- **Cutover JWT/RLS:** `737ea25` — "feat: enforce RLS with user-scoped
  Supabase clients".
- **Documentación final del cutover:** `300ce36` — "docs: record JWT RLS
  cutover architecture" (y, previo, `263e6ff` — "docs: define Supabase
  environments and record RLS validation").

---

## 17. Archivos de referencia para la próxima conversación

Orden de lectura recomendado (coincide con el de `CLAUDE.md`, con este
checkpoint agregado justo después como contexto de continuidad):

1. `CLAUDE.md`
2. `docs/checkpoint-2026-09-16.md` (este archivo)
3. `docs/project-rules.md`
4. `docs/architecture-decisions.md`
5. `docs/roadmap.md`
6. `docs/workflow.md`
7. `README.md`
