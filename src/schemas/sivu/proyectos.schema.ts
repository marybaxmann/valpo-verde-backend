import { z } from "zod";
import { geometriaSectorInput, textoObligatorio } from "./common.schema";

/**
 * Body de POST /api/sivu/projects — crea PROYECTOS + SECTORES en una
 * sola transacción (diseño §3.3; un sector por proyecto). Solo
 * `admin` (PR-004 v7.0).
 *
 * - `nombre_proyecto`: D-274, obligatorio, no vacío.
 * - `sector.nombre_sector`: D-264, obligatorio, no vacío.
 * - `sector.geometria_sector`: D-265, obligatorio.
 */
export const crearProyectoConSectorSchema = z
  .object({
    nombre_proyecto: textoObligatorio("nombre_proyecto"),
    sector: z
      .object({
        nombre_sector: textoObligatorio("nombre_sector"),
        geometria_sector: geometriaSectorInput,
      })
      .strict(),
  })
  .strict();

export type CrearProyectoConSectorBody = z.infer<typeof crearProyectoConSectorSchema>;

/**
 * Body de PATCH /api/sivu/projects/:id — editar nombre y/o sector. Solo
 * `admin`. Al menos un campo debe venir (si no, no hay nada que
 * actualizar — error 400, no se inventa qué hacer con un body vacío).
 */
export const editarProyectoSchema = z
  .object({
    nombre_proyecto: textoObligatorio("nombre_proyecto").optional(),
    sector: z
      .object({
        nombre_sector: textoObligatorio("nombre_sector").optional(),
        geometria_sector: geometriaSectorInput.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((body) => body.nombre_proyecto !== undefined || body.sector !== undefined, {
    message: "debe incluir al menos nombre_proyecto o sector",
  });

export type EditarProyectoBody = z.infer<typeof editarProyectoSchema>;

/**
 * Body de PATCH /api/sivu/projects/:id/estado (D-275; CC-042). Solo
 * `admin`. Códigos snake_case ya fijados en la base (migración 012):
 * `'activo'` / `'cerrado'`.
 */
export const cambiarEstadoProyectoSchema = z
  .object({
    estado_proyecto: z.enum(["activo", "cerrado"]),
  })
  .strict();

export type CambiarEstadoProyectoBody = z.infer<typeof cambiarEstadoProyectoSchema>;

export const proyectoIdParamSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
});

export type ProyectoIdParam = z.infer<typeof proyectoIdParamSchema>;
