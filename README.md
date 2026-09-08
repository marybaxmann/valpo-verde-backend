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
    └── 001_init.sql     Primera migración (estado aprobado en Etapa 3)
```

## Configuración local

```bash
cp .env.example .env
# completar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

## Estado actual (Etapa 4, primera iteración)

Implementado:
- Conexión a Supabase (`config/supabase.ts`) con service role key.
- Validación de JWT de Supabase Auth (`middlewares/auth.middleware.ts`).
- `GET /api/auth/me` — devuelve el perfil de aplicación del usuario autenticado.
- Manejo de errores centralizado (`middlewares/error.middleware.ts`).

Deliberadamente NO implementado todavía (fuera de alcance de esta iteración):
- `POST /api/auth/login` — el login ocurre en el frontend directamente
  contra Supabase Auth; este backend solo valida el token resultante.
- Endpoints de árboles, inspecciones, incidencias, mantenimiento,
  infraestructura, dashboard.
- Motor de reglas de evaluación (`services/rules/`).
- Lógica de riesgo (probabilidad de impacto, consecuencias, matriz final):
  pendiente de metodología.
- Row Level Security en Supabase: pendiente de cerrar permisos exactos
  de los roles `admin` y `usuario`.
- Cualquier funcionalidad de mapas/geolocalización.

## Variables de entorno

Ver `.env.example`. La `SUPABASE_SERVICE_ROLE_KEY` nunca debe usarse en
el frontend ni subirse a control de versiones.
