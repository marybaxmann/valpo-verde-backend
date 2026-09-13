import { z } from "zod";

/**
 * Body de POST /api/projects/:id/members. Solo admin (PR-004 v4.0).
 * `.strict()` rechaza cualquier otro campo (por ejemplo un rol propio de
 * la membresía: `project_members` representa SOLO pertenencia).
 */
export const addProjectMemberSchema = z
  .object({
    user_id: z.string().uuid("user_id debe ser un UUID válido"),
  })
  .strict();

export type AddProjectMemberBody = z.infer<typeof addProjectMemberSchema>;

/**
 * Params de DELETE /api/projects/:id/members/:userId.
 */
export const projectMemberParamsSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  userId: z.string().uuid("userId inválido"),
});

export type ProjectMemberParams = z.infer<typeof projectMemberParamsSchema>;
