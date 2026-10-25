import { User } from "@supabase/supabase-js";

/**
 * Fixtures mínimas para simular, en los repositories mockeados, las
 * respuestas que en producción vendrían de Supabase Auth / user_profiles.
 * No representan usuarios ni proyectos reales.
 */

export const FAKE_TOKEN = "fake-jwt-token";

export const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
export const MUNICIPAL_ID = "22222222-2222-2222-2222-222222222222";
export const INSPECTOR_ID = "55555555-5555-5555-5555-555555555555";

export function fakeAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: ADMIN_ID,
    email: "user@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

export function adminProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ADMIN_ID,
    nombre: "Admin de prueba",
    activo: true,
    role: { nombre: "admin" },
    ...overrides,
  };
}

export function municipalProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MUNICIPAL_ID,
    nombre: "Municipal de prueba",
    activo: true,
    role: { nombre: "usuario_municipal" },
    ...overrides,
  };
}

export function inspectorProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: INSPECTOR_ID,
    nombre: "Inspector de prueba",
    activo: true,
    role: { nombre: "inspector" },
    ...overrides,
  };
}
