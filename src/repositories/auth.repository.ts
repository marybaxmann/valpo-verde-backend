import { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../config/supabase";

/**
 * Resuelve el usuario de Supabase Auth asociado a un JWT.
 * Encapsula la única llamada del backend a `supabaseAdmin.auth.getUser`.
 * Devuelve null si el token es inválido/expirado o si Supabase Auth no
 * devuelve un usuario — la interpretación de ese caso (por ejemplo,
 * responder 401) queda a cargo del service que la invoque, siguiendo el
 * mismo patrón que `userProfile.repository.ts`.
 */
export async function getAuthUserByToken(
  token: string
): Promise<User | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}
