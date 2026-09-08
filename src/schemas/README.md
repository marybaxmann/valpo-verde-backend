# schemas/

Carpeta preparada para los schemas de validación (Zod) de cada endpoint
(body/params/query).

Actualmente no contiene archivos porque el único endpoint implementado
(`GET /api/auth/me`) no recibe body ni parámetros que requieran
validación — el token se valida en `auth.middleware.ts`.

Cuando se implementen los siguientes endpoints (trees, inspections,
incidents, maintenance...), cada uno debe agregar aquí su propio archivo,
por ejemplo:

```text
schemas/
├── tree.schema.ts
├── inspection.schema.ts
└── incident.schema.ts
```
