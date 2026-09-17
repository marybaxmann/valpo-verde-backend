# Architecture Decisions — Valpo Verde

## Propósito

Registro de decisiones arquitectónicas del proyecto, **versionable y revisable**.
Cada ADR documenta su contexto, la decisión tomada, sus consecuencias y si
puede cambiar. El "qué aplica hoy" a nivel de reglas se mantiene en
`docs/project-rules.md`; el procedimiento para cambiar cualquier decisión, en
`docs/workflow.md`.

Estados permitidos:
- propuesta
- vigente
- pendiente
- reemplazada
- descartada

Si una decisión nueva contradice una ADR vigente, aplicar el procedimiento de
reemplazo de `docs/workflow.md` §4 / `docs/project-rules.md` (Propósito):

1. no borrar la ADR anterior;
2. marcar la versión anterior como `reemplazada`;
3. crear una nueva versión;
4. indicar qué versión reemplaza;
5. documentar el motivo;
6. identificar las capas afectadas.

## Formato ADR simplificado

```
## ADR-XXX — Título
Estado: propuesta | vigente | pendiente | reemplazada | descartada
Versión: X.X
Fecha: 2026-08

### Contexto
...

### Decisión
...

### Consecuencias
...

### Puede cambiar
Sí/No

### Reglas relacionadas
PR-...
```

---

## ADR-001 — Frontend y backend separados
Estado: vigente
Versión: 1.1
Fecha: 2026-08

### Contexto
El proyecto tendrá un frontend navegable independiente y un backend API.

Existen dos artefactos de frontend distintos que no deben confundirse:

- `marybaxmann/Valpo-Verde-Conecta` — prototipo frontend navegable y
  referencia funcional v2 (ver PR-001).
- `valpo-verde-frontend` — nombre previsto para el frontend productivo futuro.

El prototipo actual puede reutilizarse, evolucionar, reemplazarse o servir de
base, pero no debe asumirse que ya constituye necesariamente el repositorio
productivo definitivo.

### Decisión
Mantener dos repositorios/proyectos independientes para el sistema productivo:

- `valpo-verde-frontend` (frontend productivo futuro)
- `valpo-verde-backend`

No utilizar monorepo por ahora.

### Consecuencias
- despliegue independiente;
- responsabilidades separadas;
- comunicación mediante API;
- configuración independiente por entorno.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-017

---

## ADR-002 — Arquitectura backend por capas
Estado: vigente
Versión: 1.0
Fecha: 2026-08

### Contexto
Se requiere separar HTTP, negocio y persistencia.

### Decisión
Usar:

```
routes
→ controllers
→ services
→ repositories
```

La lógica metodológica se mantiene adicionalmente aislada en:

```
services/rules/
```

### Consecuencias
- controllers no contienen reglas metodológicas;
- repositories no contienen lógica de negocio;
- services coordinan casos de uso;
- rules concentra cálculos técnicos.
- Aclaración: el acceso a proveedores externos de datos/identidad —
  incluido Supabase Auth, no solo Postgres— se encapsula mediante
  repositories/adapters. Ningún service accede directamente al SDK de
  Supabase (`supabaseAdmin`); lo hace siempre a través de la capa de
  repositories.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-008
PR-011
PR-017

---

## ADR-003 — PostgreSQL/Supabase como fuente de datos
Estado: vigente
Versión: 1.0
Fecha: 2026-08

### Contexto
La plataforma requiere persistencia relacional, historial, geolocalización y almacenamiento de metadatos.

### Decisión
Utilizar Supabase/PostgreSQL como fuente principal de datos persistentes.

PostgreSQL es fuente de verdad del estado almacenado.
El backend es fuente de verdad de reglas de negocio y cálculos.

### Consecuencias
- evitar lógica metodológica en frontend;
- evitar duplicar estado calculado innecesariamente;
- mantener constraints e integridad en BD cuando corresponda.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-008
PR-017

---

## ADR-004 — Autenticación mediante Supabase Auth
Estado: vigente
Versión: 1.0
Fecha: 2026-08

### Contexto
La plataforma requiere autenticación sin mantener contraseñas propias.

### Decisión
El frontend realiza autenticación con Supabase Auth.

El backend recibe Bearer JWT y valida la identidad.

No implementar endpoint Express `POST /api/auth/login`.

La service role key solo existe en backend.

### Consecuencias
- contraseñas no viven en tablas propias;
- proyectos no almacenan contraseñas;
- backend autoriza solicitudes a partir de identidad validada.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-018

---

## ADR-005 — Modelo multiproyecto (v1.0 — REEMPLAZADA)
Estado: reemplazada
Versión: 1.0
Fecha: 2026-08
Reemplazada por: ADR-005 v2.0
Motivo del reemplazo: el diseño físico del modelo multiproyecto quedó aprobado por la autora; esta versión solo lo adoptaba a nivel conceptual y dejaba la estructura física por diseñar.

### Contexto
La plataforma debe poder gestionar inventarios para distintas instituciones o municipalidades.

El esquema actual aún no implementa esta capa.

### Decisión
Adoptar conceptualmente una arquitectura multiproyecto.

Objetivo:

```
Project
├── Members
├── Trees
├── Inspections
├── Incidents
├── Maintenance
└── ...
```

Entidades a evaluar para una migración futura:

- `projects`;
- `project_members`;
- `trees.project_id`.

La estructura física definitiva todavía debe diseñarse antes de modificar el schema.

### Consecuencias
La autorización futura debe considerar:

```
rol
+
pertenencia al proyecto
```

No basta comprobar solamente `role`.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-003
PR-004
PR-005

---

## ADR-005 — Modelo multiproyecto (v2.0)
Estado: vigente
Versión: 2.1
Fecha: 2026-08
Reemplaza: ADR-005 v1.0
Motivo: diseño físico del modelo multiproyecto aprobado por la autora.
Capas afectadas: base de datos, backend, permisos, documentación (el impacto en frontend queda anotado; es un repositorio separado).

### Contexto
El modelo multiproyecto ya estaba adoptado a nivel conceptual (v1.0). La autora aprobó su diseño físico: tablas, columnas, claves foráneas y ruta de migración por etapas.

### Decisión

**Modelo físico aprobado.**

Tablas nuevas:

- `projects` — un proyecto = gestión/inventario de arbolado de una institución. Sin eliminación física como flujo normal; el cierre se representa con `status = 'cerrado'`.
- `project_members` — representa **solo pertenencia** de un usuario a un proyecto. No lleva rol propio.

El rol (`admin`, `usuario_municipal`) sigue siendo **global** y vive en `user_profiles`.

Columnas de scope:

- `trees.project_id`, `incidents.project_id`, `public_spaces.project_id` — se agregan **NULLABLE** en la migración de estructura (`002`) y su objetivo final es `NOT NULL` (migración `004`).
- `incidents` lleva `project_id` **directo** porque `incidents.tree_id` puede ser `NULL`. Si `tree_id` tiene valor, el árbol debe pertenecer al mismo `project_id` (coherencia forzada por la BD).
- `maintenance`, `infrastructure_conflicts`, `photos` e `inspections` **no** llevan `project_id` propio: derivan el proyecto a través de `tree_id` (todas tienen `tree_id NOT NULL`).

Catálogos:

- `species` es **global**.
- `public_spaces` es **scoped por proyecto**: `UNIQUE(project_id, nombre)`; el mismo nombre de espacio puede existir en proyectos distintos; un árbol no puede apuntar a un `public_space` de otro proyecto.

Identificación:

- `tree_code` mantiene la **secuencia global** (`A-000001`, …).

Autorización (se aplica en backend en esta fase; RLS después):

- `admin` → acceso **transversal** a todos los proyectos; puede crear proyectos y gestionar miembros.
- `usuario_municipal` → accede solo a proyectos donde exista una fila en `project_members`.

Claves foráneas:

- Las FK relevantes usan `ON DELETE RESTRICT` (preservación de historial).
- Las referencias de auditoría nullable (`created_by`, `added_by`) usan `ON DELETE SET NULL`.
- El offboarding de un usuario debe eliminar primero sus membresías; no hay `CASCADE` automático.

CRS/SRID: **no** se agrega columna a `projects` todavía (ADR-010 sigue `propuesta`).

RLS: diseñada e implementada — ver Actualización 2.1 más abajo y ADR-014.

**Despliegue por etapas:**

```
002 estructura multiproyecto (columnas project_id NULLABLE)
→ backend con scoping rol + proyecto
→ 003 backfill (solo si existen datos; mapeo explícito de la autora)
→ 004 SET NOT NULL de los tres project_id
→ RLS (posterior)
```

`002` no crea proyecto legacy ni backfill automático. Si hay filas previas en `trees` / `incidents` / `public_spaces`, `004` queda bloqueada hasta que `003` (mapeo definido por la autora) las resuelva.

Actualización 2.1 (cierre RLS, aclaración menor — no cambia el modelo físico ni el resto de esta decisión): las 5 etapas de este despliegue quedaron completadas y validadas en `valpo-verde-conecta` (desarrollo/pruebas, ADR-013): `002`, `003`, `004` y RLS (migración `005`). El backend además migró de `service_role` a un cliente Supabase alcanzado al JWT del usuario para las operaciones en nombre del usuario autenticado, de modo que RLS actúe como segunda barrera real. Detalle completo de esa decisión (arquitectura de autenticación, principio de dos capas, resultados de validación, contrato de frontend) en ADR-014. Ninguna de estas migraciones se ha aplicado todavía al entorno productivo real (ADR-013).

### Consecuencias
- La autorización en backend deja de comprobar solo `role`: pasa a `role` global + pertenencia (`project_members`) para `usuario_municipal`.
- Toda consulta de árbol y derivados (inspecciones, mantenimiento, incidencias, infraestructura, fotos) debe filtrar por proyecto (directo en `incidents`, derivado vía `tree_id` en el resto).
- Durante la ventana `002 → 004`, filas con `project_id` NULL quedan fuera del scope de `usuario_municipal` hasta el backfill.
- `schema.sql` consolidado se actualiza con cada migración aprobada.

### Puede cambiar
Sí, pero cualquier cambio debe preservar historial y trazabilidad y respetar el despliegue por etapas.

### Reglas relacionadas
PR-003
PR-004
PR-005
PR-006

---

## ADR-006 — Alcance de roles
Estado: vigente
Versión: 1.1
Fecha: 2026-08

### Contexto
El prototipo v2 separa captura municipal de evaluación técnica.

La definición funcional detallada de permisos vive en PR-003 y PR-004; este ADR no la reemplaza.

### Decisión
Identificadores internos:

- `admin`
- `usuario_municipal`

`usuario_municipal`:
- captura básica;
- consulta;
- incidencias según permisos definidos.

`admin`:
- gestión;
- evaluación técnica;
- operaciones técnicas.

El usuario municipal no es inspector técnico.

### Consecuencias
Los permisos deben aplicarse en backend y posteriormente en RLS.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-003
PR-004

---

## ADR-007 — Evaluaciones como inspecciones históricas
Estado: vigente
Versión: 1.1
Fecha: 2026-08

### Contexto
Las evaluaciones técnicas pueden repetirse con el tiempo.

### Decisión
Cada evaluación constituye una nueva inspección.

Estados:

- `borrador`;
- `completada`.

Las inspecciones completadas son inmutables.

No se sobrescribe una inspección histórica para representar una evaluación nueva.

ADR-007 es la decisión específica sobre ciclo de vida e inmutabilidad de inspecciones. La preservación histórica general de árboles y registros vive en ADR-012.

### Consecuencias
- preservación de historial;
- comparación futura entre evaluaciones;
- `rule_version` asociado;
- una nueva evaluación crea una nueva inspección.

### Puede cambiar
Sí, pero cualquier cambio debe preservar trazabilidad histórica.

### Reglas relacionadas
PR-009

---

## ADR-008 — Separación de datos observados y calculados
Estado: vigente
Versión: 1.0
Fecha: 2026-08

### Contexto
La metodología recibe observaciones y mediciones y produce severidades, puntajes y resultados.

### Decisión
Mantener conceptualmente:

```
observación
→ cálculo
→ evaluación agregada
→ decisión
```

Los resultados calculados no se modifican manualmente.

### Consecuencias
La BD y backend deben evitar mezclar observación original con resultado derivado.

Una excepción futura requeriría mecanismo explícito y trazable.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-008
PR-004

---

## ADR-009 — Motor metodológico determinístico
Estado: vigente
Versión: 1.1
Fecha: 2026-08

### Contexto
Los diagramas técnicos definen reglas explícitas de evaluación.

### Decisión
La metodología actualmente definida se implementa mediante un motor determinístico y versionado en `services/rules/`.

La IA no forma parte actualmente del cálculo metodológico.

Cualquier futura incorporación de IA deberá documentarse como una nueva decisión antes de implementarse.

### Consecuencias
- resultados explicables;
- reproducibilidad;
- tests por regla;
- posibilidad de mantener versiones metodológicas.

### Puede cambiar
Sí, pero no sin una nueva decisión metodológica explícita.

### Reglas relacionadas
PR-002
PR-008
PR-011

---

## ADR-010 — Geolocalización canónica
Estado: propuesta
Versión: 1.0
Fecha: 2026-08

### Contexto
La interfaz actual contempla captura de UTM Este/Norte.

PostGIS está preparado para `geography(Point,4326)`.

La plataforma será multiproyecto y no debe asumir una única zona UTM global.

### Decisión propuesta
Mantener como estrategia actual:

```
captura según CRS del proyecto
→ transformación en backend
→ ubicación canónica WGS84
→ geography(Point,4326)
```

El proyecto deberá poder definir posteriormente su CRS/SRID de captura.

No modificar schema todavía.

### Consecuencias
- UI y almacenamiento no tienen que usar el mismo CRS;
- requiere transformación;
- permite interoperabilidad geográfica.

### Puede cambiar
Sí. Esta ADR es deliberadamente propuesta y revisable.

### Reglas relacionadas
PR-005
PR-006
PR-015

---

## ADR-011 — Fotografías en Supabase Storage
Estado: vigente
Versión: 1.0
Fecha: 2026-08

### Contexto
Los árboles requieren evidencia fotográfica sin almacenar binarios directamente en PostgreSQL.

### Decisión
Guardar archivos físicos en Supabase Storage.

PostgreSQL mantiene metadatos.

Relación actual:

```
Tree
→ Photos
```

Máximo actual: 20 fotografías por árbol.

### Consecuencias
- backend debe validar límite;
- frontend muestra contador;
- relaciones adicionales con inspecciones/incidencias quedan pendientes.

### Puede cambiar
Sí.

### Reglas relacionadas
PR-010

---

## ADR-012 — Árboles e inspecciones preservan historial
Estado: vigente
Versión: 1.1
Fecha: 2026-08

### Contexto
El sistema requiere trazabilidad municipal y técnica.

### Decisión
ADR-012 es la decisión general de preservación histórica de árboles y registros.

Evitar eliminación física de árboles como operación normal.

Los cambios de condición deben representarse mediante estado/ciclo de vida.

En lo relativo a inspecciones, esta ADR remite a ADR-007 (ciclo de vida e inmutabilidad) y no duplica su detalle.

### Consecuencias
Las futuras relaciones y foreign keys deben priorizar preservación histórica.

### Puede cambiar
Sí, pero cualquier reemplazo debe mantener trazabilidad.

### Reglas relacionadas
PR-009

---

## ADR-013 — Entornos Supabase: desarrollo/pruebas vs. producción
Estado: vigente
Versión: 1.0
Fecha: 2026-09

### Contexto
El proyecto Supabase usado hasta ahora para todas las migraciones
multiproyecto (`002`-`005`), fixtures, pruebas de RLS y validaciones
manuales Postman/E2E es `valpo-verde-conecta`. Su propio dashboard de
Supabase muestra la etiqueta `main` / `PRODUCTION`, lo que puede inducir
a interpretar erróneamente que es el entorno productivo real del
proyecto.

### Decisión
Se declara formalmente que `valpo-verde-conecta` es el entorno de
**desarrollo/pruebas** de Valpo Verde, independientemente de la etiqueta
que su propio dashboard de Supabase muestre. Esa etiqueta es de la
plataforma Supabase (identifica una rama/branch del proyecto), no una
afirmación sobre el rol que cumple para Valpo Verde.

Ahí se realizan, de forma controlada, migraciones, fixtures, pruebas
RLS, Postman y E2E.

El entorno productivo real de Valpo Verde será un proyecto Supabase
**separado**, creado más adelante. A ese proyecto solo se aplicarán
migraciones que ya hayan sido validadas de punta a punta en el entorno
de desarrollo/pruebas — el mismo criterio de despliegue por etapas que
ya rige `002`-`005` (ADR-005 v2.0): nunca aplicar directo a producción.

No se define aquí ningún nombre, URL ni credencial del futuro entorno
productivo: no existen todavía y no deben inventarse.

### Consecuencias
- Toda referencia, presente o futura, a "Supabase de pruebas" en código,
  migraciones o documentación se refiere a `valpo-verde-conecta`, sin
  importar la etiqueta de su dashboard.
- Ninguna migración ni dato de prueba de este proyecto debe tratarse
  como productivo solo porque el dashboard diga `PRODUCTION`.
- Cuando se cree el proyecto productivo real, esta ADR se actualizará
  (nueva versión) con su identificación, siguiendo el procedimiento de
  reemplazo de `docs/workflow.md` §4.

### Puede cambiar
Sí — se actualizará en cuanto exista el proyecto productivo real.

### Reglas relacionadas
PR-005 v3.0

---

## ADR-014 — RLS como segunda barrera + cutover del backend a JWT de usuario
Estado: vigente
Versión: 1.0
Fecha: 2026-09

### Contexto
ADR-005 v2.0 dejaba RLS como paso "posterior" del despliegue multiproyecto, sin cerrar cómo lograr que aportara protección real. El backend usaba un único cliente Supabase con `service_role` para todas sus consultas (`src/config/supabase.ts`) — y `service_role` tiene el atributo `BYPASSRLS`: cualquier policy de RLS que se creara sería bypassada siempre por esa única vía de acceso. Se evaluaron dos alternativas: (1) mantener el statu quo (RLS documentada pero sin efecto real mientras el backend siga en `service_role`), o (2) que las operaciones realizadas en nombre de un usuario autenticado usen el JWT de ese usuario contra Supabase, para que RLS se evalúe como ese usuario y actúe como una segunda barrera independiente del backend.

### Decisión
Se adopta la alternativa 2. Arquitectura de autenticación resultante:

```
Request
→ Authorization: Bearer <JWT>
→ auth.middleware.ts
→ resolveAuthenticatedUser(token)
→ req.user + req.accessToken
→ controller
→ service (autorización de backend: assertAdmin / assertProjectAccess)
→ repository
→ createUserScopedClient(accessToken)
→ Supabase como rol "authenticated"
→ RLS (policies de la migración 005)
```

`req.accessToken` (JWT crudo, ya validado) se adjunta en `auth.middleware.ts` junto a `req.user`, y se propaga explícitamente controller → service → repository. `createUserScopedClient(accessToken)` (`src/config/supabase.ts`) crea un cliente Supabase **nuevo por llamada** (nunca un singleton) con la `anon key` + `Authorization: Bearer <accessToken>`.

**Excepción, sin cambios:** `auth.repository.ts` (`getAuthUserByToken`) y `userProfile.repository.ts` (`findUserProfileById`) siguen usando `supabaseAdmin`/`service_role`. La primera es la propia validación de identidad, anterior a que exista un "usuario autenticado" sobre el cual aplicar su JWT; la segunda resuelve tanto el propio perfil como el de un usuario destino consultado por un admin, y queda como operación interna privilegiada por ahora.

**Principio de dos capas — RLS NO reemplaza la autorización de backend:**

| Capa | Dónde vive | Qué hace |
|---|---|---|
| 1 — Backend | `authorization.service.ts` (`assertAdmin`, `assertProjectAccess`) y validaciones de rol/membership en cada service | Autorización funcional: qué puede hacer cada rol, mensajes de error propios (403/404/409), primera línea de defensa |
| 2 — Supabase/Postgres | Migración `005`, 4 funciones `SECURITY DEFINER` (`get_user_role`, `is_project_member`, `is_admin`, `is_municipal_member`), RLS en 6 tablas (`user_profiles`, `project_members`, `projects`, `public_spaces`, `trees`, `incidents`), 15 policies `TO authenticated` | Defensa en profundidad a nivel de fila, independiente del backend: protege incluso si un endpoint futuro olvidara invocar la Capa 1 |

Ambas capas coexisten deliberadamente. `service_role` sigue reservado para `auth`/perfil y cualquier operación interna privilegiada que realmente lo requiera — nunca para operaciones ordinarias en nombre de un usuario.

**Contrato para el frontend** (repositorio separado, `valpo-verde-frontend`, ver ADR-001):
- Obtiene su sesión/JWT mediante Supabase Auth directamente (PR-018) — no contra este backend.
- Envía `Authorization: Bearer <JWT>` en cada request a la API.
- NUNCA usa ni contiene `SUPABASE_SERVICE_ROLE_KEY` — puede usar la `anon`/publishable key para su propia sesión de Supabase Auth.
- El backend es quien determina `req.user` (identidad + rol global) y aplica los permisos; el frontend no decide seguridad, solo adapta la UI según el rol que el backend confirme (p. ej. vía `GET /api/auth/me`).

### Consecuencias
- `src/config/env.ts` requiere ahora también `SUPABASE_ANON_KEY` (además de `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`).
- `project.repository.ts` y `projectMember.repository.ts` (las 8 funciones existentes a la fecha) reciben `accessToken` como primer parámetro y usan `createUserScopedClient` en vez de `supabaseAdmin`.
- Todo repository/endpoint futuro que actúe en nombre de un usuario autenticado (árboles, inspecciones, incidencias, etc.) debe seguir este mismo patrón antes o al mismo tiempo que exista su policy RLS correspondiente — cortar a JWT sin la policy vigente en el mismo entorno produce fallos silenciosos (listas vacías / 403 en vez de datos), no errores explícitos.

**Resultados de validación (`valpo-verde-conecta`, desarrollo/pruebas):**
- Tests SQL H1-H7 (admin transversal, municipal miembro, municipal no miembro, usuario sin perfil, usuario inactivo con lectura de su propio perfil pero sin acceso operacional, acceso cruzado entre proyectos bloqueado, control negativo de `service_role`): **7/7 PASS**.
- `service_role` confirmado con `BYPASSRLS`; `authenticated`/`anon` confirmados sin ese atributo.
- Suite automatizada: 5 test suites / 33 tests PASS; `npx tsc --noEmit` y `npx tsc -p tsconfig.jest.json` sin errores.
- Validación E2E real contra `valpo-verde-conecta`, con JWTs reales de un usuario admin y uno municipal (casos E1-E7: alta/listado de proyectos, creación de proyecto y membresía por admin, bloqueo de municipal sin membership, acceso tras agregar membership, 403 en endpoint admin-only con JWT municipal, remoción de membership y pérdida de acceso): **7/7 PASS**, sin ningún error 500 ni de PostgREST.
- Cambios commiteados y en `main` (commit `737ea25`, sobre la documentación de entornos de `263e6ff` y las policies de `131b999`).
- Ninguna migración de esta cadena (`002`-`005`) se ha aplicado todavía al entorno productivo real (ADR-013).

### Puede cambiar
Sí. Un cambio futuro (p. ej. extender el cutover a JWT a otros repositories, o separar `findUserProfileById` en una variante self-lookup por JWT) debe documentarse como nueva actualización de esta ADR, preservando el principio de dos capas.

### Reglas relacionadas
PR-003 v4.0
PR-004 v4.0
PR-018
ADR-002
ADR-005 v2.1
ADR-013
