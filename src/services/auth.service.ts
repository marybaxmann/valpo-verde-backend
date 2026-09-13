import { getAuthUserByToken } from "../repositories/auth.repository";
import {
  findUserProfileById,
  extractRoleName,
} from "../repositories/userProfile.repository";
import { AppError } from "../utils/AppError";
import { AuthenticatedUser } from "../types/auth";

/**
 * Valida un JWT de Supabase Auth y devuelve el perfil de aplicación
 * (user_profiles + rol) del usuario autenticado.
 *
 * No implementa POST /api/auth/login: el login ocurre en el frontend
 * directamente contra Supabase Auth. Este servicio solo VALIDA el token
 * que el frontend reenvía en cada request protegido.
 */
export async function resolveAuthenticatedUser(
  token: string
): Promise<AuthenticatedUser> {
  const authUser = await getAuthUserByToken(token);

  if (!authUser) {
    throw new AppError("Token inválido o expirado", 401);
  }

  const profile = await findUserProfileById(authUser.id);

  if (!profile) {
    // El usuario existe en Supabase Auth pero no tiene fila en
    // user_profiles todavía (ej. registro recién creado sin perfil
    // asignado). Se trata como no autorizado, no como error de servidor.
    throw new AppError("Perfil de usuario no encontrado", 403);
  }

  if (!profile.activo) {
    throw new AppError("Usuario inactivo", 403);
  }

  return {
    id: authUser.id,
    email: authUser.email,
    nombre: profile.nombre,
    role: extractRoleName(profile.role),
    activo: profile.activo,
  };
}
