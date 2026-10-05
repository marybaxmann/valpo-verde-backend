# valpo-verde-backend

API REST del sistema de gestión del arbolado urbano de Valparaíso.

## Stack

Node.js + Express + TypeScript + Zod + Supabase (PostgreSQL, Auth, Storage).

## Estructura

```text
src/
├── config/          Variables de entorno y cliente de Supabase
├── routes/          Definición de endpoints
├── controllers/      Reciben request, delegan a services, devuelven response
├── services/          Lógica de negocio y cálculos
├── repositories/       Acceso a datos vía Supabase
├── schemas/             Validación de entrada (Zod) — ver schemas/README.md
├── middlewares/           auth, manejo de errores
├── types/                  Tipos compartidos (incluye extensión de Express.Request)
├── utils/                   AppError y utilidades generales
├── app.ts                    Configuración de Express
└── server.ts                  Punto de entrada

database/
├── schema.sql          Referencia consolidada del esquema
└── migrations/
    ├── 001_init.sql                         Primera migración (estado aprobado en Etapa 3)
    └── 002_multiproject_structure.sql        Estructura multiproyecto — ejecutada y validada en un
                                               proyecto Supabase de prueba/desechable (no en producción):
                                               escenario limpio 001→002 y escenario con datos legacy
                                               (ESCENARIO B: pass=25, fail=0, OK)
```

## Configuración local

```bash
cp .env.example .env
# completar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

`SUPABASE_SERVICE_ROLE_KEY` es la clave `service_role` de Settings → API
en el dashboard de Supabase — **no** la cadena de conexión de PostgreSQL
("Connection string"). Usar esta última ahí rompe toda la autenticación
(`GET /api/auth/me` y cualquier endpoint protegido responden 401 aunque
el JWT del cliente sea válido), sin que el backend lo detecte al arrancar.

## Entornos Supabase

El proyecto Supabase `valpo-verde-conecta` es el entorno de
**desarrollo/pruebas** de Valpo Verde (ADR-013). Su dashboard puede
mostrar `main` / `PRODUCTION` — es una etiqueta de la plataforma
Supabase, no una afirmación de que sea el entorno productivo real. Ahí
se realizan, de forma controlada, migraciones, fixtures, pruebas RLS,
Postman y E2E.

El entorno productivo real será un proyecto Supabase **separado**,
creado más adelante, al que solo se aplicarán migraciones ya validadas
en este entorno de desarrollo/pruebas.

## Estado actual (Etapa 4, primera iteración)

Implementado:
- Conexión a Supabase (`config/supabase.ts`): `supabaseAdmin` (`service_role`,
  operaciones internas privilegiadas) y `createUserScopedClient(accessToken)`
  (cliente por-request con el JWT del usuario, para que RLS se evalúe como
  ese usuario — ver ADR-014).
- Validación de JWT de Supabase Auth (`middlewares/auth.middleware.ts`),
  que adjunta tanto `req.user` como `req.accessToken`.
- `GET /api/auth/me` — devuelve el perfil de aplicación del usuario autenticado.
- Manejo de errores centralizado (`middlewares/error.middleware.ts`).
- Modelo multiproyecto — `GET/POST /api/projects`, `GET /api/projects/:id`,
  `GET/POST /api/projects/:id/members`, `DELETE /api/projects/:id/members/:userId`,
  con autorización por rol + pertenencia (`admin` transversal;
  `usuario_municipal` solo vía `project_members`) **en dos capas**: backend
  (`authorization.service.ts`) y RLS en Supabase/Postgres (migración `005`,
  ver ADR-014) — RLS no reemplaza la autorización de backend, coexisten.
  Validado end-to-end tanto con mocks (Postman/manual) como con JWTs reales
  contra `valpo-verde-conecta` (desarrollo/pruebas, no producción).
- Inventario espacial para el mapa (SIG-1, ADR-015 / ADR-010 v2.0) —
  `GET /api/projects/:id/trees`, solo lectura (ver "Contrato para frontend").
- Framework de tests: Jest + ts-jest + Supertest, configurados
  (`jest.config.js`, `tsconfig.jest.json`). 8 suites / 68 tests PASS.

Deliberadamente NO implementado todavía (fuera de alcance de esta iteración):
- `POST /api/auth/login` — el login ocurre en el frontend directamente
  contra Supabase Auth; este backend solo valida el token resultante.
- Escritura de árboles (alta/edición, incluida la ubicación) y endpoints de
  inspecciones, incidencias, mantenimiento, infraestructura, dashboard — y,
  junto con ellos, extender RLS a las tablas que aún no la tienen (la
  migración `005` cubre `user_profiles`, `projects`, `project_members`,
  `public_spaces`, `trees` e `incidents`).
- Motor de reglas de evaluación (`services/rules/`).
- Lógica de riesgo (probabilidad de impacto, consecuencias, matriz final):
  pendiente de metodología.
- Geolocalización más allá de la lectura del inventario: captura de
  coordenadas, transformación de CRS (pendiente, ADR-010 v2.0) y capas
  temáticas del mapa.

## Contrato para frontend

`valpo-verde-frontend` (repositorio separado, ADR-001) consume esta API
bajo este contrato (PR-018 v2.0 / ADR-014):

- Obtiene su sesión/JWT mediante Supabase Auth directamente (no contra
  este backend).
- Envía `Authorization: Bearer <JWT>` en cada request a la API.
- NUNCA usa ni contiene `SUPABASE_SERVICE_ROLE_KEY` — puede usar la
  `anon`/publishable key para su propia sesión de Supabase Auth.
- El backend determina `req.user` (identidad + rol global) y aplica los
  permisos; el frontend no decide seguridad, solo adapta la UI según el
  rol que el backend confirme (p. ej. vía `GET /api/auth/me`).

### `GET /api/projects/:id/trees` (SIG-1)

Inventario de árboles del proyecto para el mapa (ADR-015). Autorización:
`assertProjectAccess` + RLS de `trees` con el JWT del usuario.

```json
{
  "data": {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "id": "<uuid>",
      "geometry": { "type": "Point", "coordinates": [<lon>, <lat>] },
      "properties": {
        "id": "<uuid>", "tree_code": "A-000001", "legacy_id": null,
        "estado_ciclo_vida": "activo",
        "nombre_cientifico": "…", "nombre_comun": "…",
        "direccion": null, "comuna": null, "lugar_referencia": null
      }
    }]
  },
  "meta": { "total": 1, "con_ubicacion": 1, "sin_ubicacion": 0 }
}
```

- GeoJSON RFC 7946: WGS84, `[longitud, latitud]`, sin miembro `crs`.
  Coordenadas derivadas de `trees.ubicacion` (leída como
  `ubicacion::geometry`), solo lectura.
- Incluye todos los estados de ciclo de vida. Los árboles sin ubicación
  cuentan en `meta.total` y `meta.sin_ubicacion`, pero no van en `features`.
- Devuelve el proyecto completo: lectura interna por cursor (`id > último
  id`, páginas de hasta 1000) hasta recibir una página vacía.
- Errores: 400 id inválido · 401 sin token · 403 sin acceso · 404 proyecto
  inexistente · 500 si una ubicación llega con formato inesperado (nunca se
  descarta un punto en silencio).

## Variables de entorno

Ver `.env.example`. La `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en
el frontend ni subirse a control de versiones.
