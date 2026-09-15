/**
 * Configuración de Jest para valpo-verde-backend.
 *
 * - `testEnvironment: "node"`: backend puro, sin DOM.
 * - `setupFiles`: fija variables de entorno dummy ANTES de que Jest cargue
 *   cualquier archivo de test. `src/config/env.ts` valida `process.env`
 *   con Zod al importarse y llama a `process.exit(1)` si falta
 *   SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY; como `src/app.ts` importa
 *   `./config/env` en su primera línea, cualquier test que importe `app`
 *   (vía supertest) dispararía esa validación sin este paso.
 * - `resetMocks: true`: cada test empieza con los mocks limpios (calls e
 *   implementaciones). Evita que un `mockResolvedValue` de un test quede
 *   filtrando al siguiente.
 * - `transform`: usa un tsconfig separado (`tsconfig.jest.json`) porque
 *   `tsconfig.json` fija `rootDir: "src"`, lo que haría fallar la
 *   compilación de los archivos bajo `tests/` (TS6059).
 */

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  resetMocks: true,
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
