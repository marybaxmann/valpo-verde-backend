import { z } from "zod";

/**
 * Body de POST /api/sivu/projects/:id/members (MIEMBROS_PROYECTO).
 * Solo admin. `.strict()` rechaza cualquier otro campo — `project_members`
 * representa SOLO pertenencia (D-278/D-279), nunca un rol propio.
 */
export const agregarMiembroSchema = z
  .object({
    user_id: z.string().uuid("user_id debe ser un UUID válido"),
  })
  .strict();

export type AgregarMiembroBody = z.infer<typeof agregarMiembroSchema>;

export const miembroParamsSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  userId: z.string().uuid("userId inválido"),
});

export type MiembroParams = z.infer<typeof miembroParamsSchema>;
