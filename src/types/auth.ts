/**
 * Perfil de usuario autenticado, resuelto por auth.middleware.ts a partir
 * del JWT de Supabase Auth + la fila correspondiente en user_profiles.
 */
export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  nombre: string | null;
  role: string | null;
  activo: boolean;
}
