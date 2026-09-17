import "dotenv/config";
import { z } from "zod";

/**
 * Valida las variables de entorno al arrancar el proceso. Si falta algo
 * crítico (URL o service role key de Supabase), el servidor no debe
 * levantarse silenciosamente con una configuración incompleta.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url({ message: "SUPABASE_URL debe ser una URL válida" }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY es obligatoria"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY es obligatoria"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas o faltantes:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
