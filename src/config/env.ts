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
  // Commit del motor de reglas desplegado: se guarda en cada evaluación
  // finalizada (evaluations.motor_commit; CC-054/CC-056 decisión d).
  // Se resuelve con `resolverMotorCommit` (abajo): en Vercel manda el commit
  // del despliegue; fuera de Vercel, la variable MOTOR_COMMIT.
  MOTOR_COMMIT: z.string().trim().min(1, "MOTOR_COMMIT es obligatoria (o VERCEL_GIT_COMMIT_SHA en Vercel)"),
  // Dirección pública de la ficha de Conecta en el frontend; cada QR de
  // las placas apunta a `${CONECTA_URL_BASE}/${qr_token}` (CC-062).
  // Opcional: sin ella, solo las placas responden 503.
  CONECTA_URL_BASE: z.string().url({ message: "CONECTA_URL_BASE debe ser una URL válida" }).optional(),
  // Tiempo máximo de cada llamada a Supabase, en milisegundos (PA-29).
  // Al agotarse, la petición responde 504 en vez de quedar colgada.
  SUPABASE_TIEMPO_MAXIMO_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
});

/**
 * Commit que se registra como `motor_commit`. En Vercel, `VERCEL_GIT_COMMIT_SHA`
 * es el commit real de cada despliegue y tiene precedencia: así el valor no
 * queda atrasado tras un merge, como pasó con el MOTOR_COMMIT fijo (`f3a7356`
 * hasta el 2026-11-23). Sin ella (local, pruebas u otro hosting) se usa
 * MOTOR_COMMIT. Si no hay ninguna, la validación falla al arrancar.
 */
export function resolverMotorCommit(entorno: NodeJS.ProcessEnv): string | undefined {
  const vercel = entorno.VERCEL_GIT_COMMIT_SHA?.trim();
  return vercel ? vercel : entorno.MOTOR_COMMIT;
}

const parsed = envSchema.safeParse({ ...process.env, MOTOR_COMMIT: resolverMotorCommit(process.env) });

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas o faltantes:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
