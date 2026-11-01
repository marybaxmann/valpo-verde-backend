import { z } from "zod";

/**
 * Body de POST /api/sivu/projects/:id/members (MIEMBROS_PROYECTO).
 * Solo admin. `.strict()` rechaza cualquier otro campo — `project_members`
 * representa SOLO pertenencia (D-266/D-267), nunca un rol propio.
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

/** Query de GET /api/sivu/projects/:id/available-users (B11). */
export const usuariosDisponiblesQuerySchema = z
  .object({
    rol: z.enum(["admin", "usuario_municipal", "inspector", "encargado_mantencion"], {
      errorMap: () => ({ message: "rol debe ser admin, usuario_municipal, inspector o encargado_mantencion" }),
    }).optional(),
  })
  .strict();
