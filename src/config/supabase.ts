import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Cliente administrativo de Supabase (service role key).
 *
 * Este es el ÚNICO lugar del backend donde se instancia el cliente con
 * privilegios elevados. Toda operación contra Postgres pasa por acá,
 * nunca directamente desde controllers o routes.
 *
 * autoRefreshToken/persistSession se desactivan: este cliente no
 * mantiene sesión de usuario, solo actúa como service role desde el
 * servidor.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Cliente de Supabase alcanzado (scoped) al JWT del usuario autenticado,
 * usando la anon key + `Authorization: Bearer <accessToken>`. Esto hace
 * que las políticas RLS se evalúen como ese usuario, en vez de con
 * privilegios de `service_role`.
 *
 * Se crea un cliente NUEVO en cada llamada, nunca un singleton ni una
 * variable de módulo mutable: si se reutilizara una única instancia,
 * requests concurrentes de distintos usuarios podrían contaminarse entre
 * sí (el header de autorización de un cliente compartido no es seguro de
 * mutar en un servidor con requests concurrentes).
 *
 * `persistSession`/`autoRefreshToken`/`detectSessionInUrl` se desactivan:
 * este es un cliente de servidor de vida corta (una request), no un
 * cliente de navegador con sesión propia.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
