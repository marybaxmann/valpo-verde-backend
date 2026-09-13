import { z } from "zod";

/**
 * Body de POST /api/projects (PR-005 v3.0).
 *
 * Campos permitidos únicamente: `name` (obligatorio), `institution_name`
 * (obligatorio), `responsible_professional` (opcional). `.strict()`
 * rechaza explícitamente cualquier otro campo — en particular
 * `created_by`, `status`, `created_at`, `updated_at`, que el cliente
 * nunca puede fijar: `created_by` se obtiene de `req.user.id` en
 * project.service.ts, y el resto tiene default de base de datos.
 */
export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "name es obligatorio"),
    institution_name: z
      .string()
      .trim()
      .min(1, "institution_name es obligatorio"),
    responsible_professional: z.string().trim().min(1).optional(),
  })
  .strict();

export type CreateProjectBody = z.infer<typeof createProjectSchema>;

/**
 * Param `:id` compartido por todas las rutas de /api/projects/:id
 * (incluidas las de miembros, que anidan bajo el mismo proyecto).
 */
export const projectIdParamSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
