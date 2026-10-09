import { getAuthUserByToken } from "../repositories/auth.repository";
import {
  findUserProfileById,
  extractRoleName,
} from "../repositories/userProfile.repository";
import { AppError } from "../utils/AppError";
import { AuthenticatedUser } from "../types/auth";
import { TtlCache } from "../utils/ttlCache";

/**
 * Sesiones ya validadas (token → perfil) durante 60 s, para no repetir en
 * cada petición los dos viajes a Supabase (validar token + leer perfil).
 * Contrapartida aceptada: un usuario desactivado o un token revocado puede
 * seguir respondiendo hasta 60 s. Solo se guardan validaciones exitosas.
 */
const sessionCache = new TtlCache<AuthenticatedUser>(60_000);

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
  const cached = sessionCache.get(token);
  if (cached) return cached;

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

  const user: AuthenticatedUser = {
    id: authUser.id,
    email: authUser.email,
    nombre: profile.nombre,
    role: extractRoleName(profile.role),
    activo: profile.activo,
  };
  sessionCache.set(token, user);
  return user;
}
