import { createClient } from "@supabase/supabase-js";
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
