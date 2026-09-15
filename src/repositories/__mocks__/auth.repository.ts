/**
 * Mock manual de auth.repository.ts (Jest requiere `jest.mock(...)`
 * explícito en cada test file para módulos propios — no se aplica solo).
 * Ver ADR-002: los services nunca tocan supabaseAdmin directamente, así
 * que mockear el repository completo aísla los tests de Supabase real.
 */
export const getAuthUserByToken = jest.fn();
