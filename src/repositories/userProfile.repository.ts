import { supabaseAdmin } from "../config/supabase";

interface UserProfileRow {
  id: string;
  nombre: string | null;
  activo: boolean;
  role: { nombre: string } | { nombre: string }[] | null;
}

/**
 * Busca el perfil de un usuario por su id (mismo id que auth.users de
 * Supabase), incluyendo el nombre de su rol vía join con `roles`.
 * Devuelve null si no existe fila — la interpretación de ese caso
 * (perfil no encontrado) queda a cargo del service que la invoque.
 */
export async function findUserProfileById(
  userId: string
): Promise<UserProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, nombre, activo, role:roles(nombre)")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as UserProfileRow;
}

/**
 * El join de Supabase puede devolver `role` como objeto o como arreglo
 * de un elemento según el driver; esta función normaliza ambos casos.
 */
export function extractRoleName(
  role: UserProfileRow["role"]
): string | null {
  if (!role) return null;
  if (Array.isArray(role)) return role[0]?.nombre ?? null;
  return role.nombre;
}
