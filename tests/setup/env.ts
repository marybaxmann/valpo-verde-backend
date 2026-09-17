/**
 * Se ejecuta antes de que Jest cargue cualquier archivo de test (ver
 * `setupFiles` en jest.config.js). `src/config/env.ts` valida
 * `process.env` con Zod al importarse y llama a `process.exit(1)` si
 * falta `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`; como `src/app.ts`
 * importa `./config/env` en su primera línea, cualquier test que
 * importe `app` (vía supertest) dispararía esa validación.
 *
 * Estos valores son dummy: no se conecta a ningún Supabase real
 * (`createClient` no hace red al construirse) y los repositories que sí
 * llamarían a la red están siempre mockeados en los tests que importan
 * `app`. No son secretos, no representan ningún proyecto Supabase real.
 */
process.env.SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://example-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key";
// Dummy: no es un secreto real, no representa ningún proyecto Supabase real.
process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? "test-anon-key";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
process.env.PORT = process.env.PORT ?? "3000";

export {};
