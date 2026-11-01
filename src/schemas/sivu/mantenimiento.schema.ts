import { z } from "zod";
import { entradasVigentesDe } from "../../services/rules/engine/catalogs";

/**
 * Esquemas de Mantenimiento (#61; D-213 a D-246; PR-020 v1.1; CC-064 p).
 * Las reglas cruzadas también las aplica la base (031); aquí se repiten
 * para responder antes con un mensaje claro.
 */

const codigos = (catalogo: string) => entradasVigentesDe(catalogo).map((e) => e.codigo) as [string, ...string[]];
const fecha = (campo: string) => z.string().date(`${campo} debe tener formato AAAA-MM-DD`);
const textoOpcional = z.string().trim().max(2000).nullable().optional();
/** «true»/«false» llegan como texto en multipart/form-data. */
const siNo = (campo: string) =>
  z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")], {
    errorMap: () => ({ message: `${campo} debe ser true o false` }),
  });

/** POST /api/sivu/projects/:id/work-orders/mantenimiento (D-233 a D-246). */
export const crearOtMantenimientoSchema = z
  .object({
    tree_id: z.string().uuid("tree_id inválido"),
    incident_id: z.string().uuid("incident_id inválido").optional(),
    accion_solicitada: z.enum(codigos("accion_mantenimiento"), {
      errorMap: () => ({ message: "accion_solicitada no es una acción de Mantenimiento (D-235)" }),
    }),
    subtipo_accion: z.enum(codigos("subtipo_mantenimiento")).nullable().optional(),
    motivo: textoOpcional,
    prioridad: z.enum(["baja", "media", "alta", "critica"], { errorMap: () => ({ message: "prioridad es obligatoria: baja, media, alta o critica (D-238)" }) }),
    observaciones: textoOpcional,
    responsable_accion_id: z.string().uuid("responsable_accion_id inválido"),
    requiere_revision_inspector: z.boolean().optional(),
    inspector_revisor_id: z.string().uuid("inspector_revisor_id inválido").nullable().optional(),
  })
  .strict();
export type CrearOtMantenimientoBody = z.infer<typeof crearOtMantenimientoSchema>;

/** PATCH /api/sivu/work-orders/:workOrderId/revisor */
export const cambiarRevisorSchema = z.object({ inspector_revisor_id: z.string().uuid("inspector_revisor_id inválido") }).strict();

/** POST /api/sivu/work-orders/:workOrderId/ejecuciones (multipart; D-216 a D-224). */
export const registrarEjecucionSchema = z
  .object({
    fecha_ejecucion: fecha("fecha_ejecucion"),
    accion_ejecutada: z.enum(codigos("accion_mantenimiento"), {
      errorMap: () => ({ message: "accion_ejecutada no es una acción de Mantenimiento (D-218)" }),
    }),
    subtipo_ejecutado: z.enum(codigos("subtipo_mantenimiento")).optional(),
    resultado: z.enum(codigos("resultado_mantenimiento"), {
      errorMap: () => ({ message: "resultado debe ser ejecutado_completamente, ejecutado_parcialmente o no_ejecutado (D-220)" }),
    }),
    observaciones: z.string().trim().max(2000).optional(),
    requiere_seguimiento: siNo("requiere_seguimiento"),
    fecha_seguimiento: fecha("fecha_seguimiento").optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.requiere_seguimiento && !b.fecha_seguimiento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fecha_seguimiento es obligatoria con requiere_seguimiento = Sí (D-223)" });
    }
    if (!b.requiere_seguimiento && b.fecha_seguimiento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fecha_seguimiento solo se registra con requiere_seguimiento = Sí (D-223)" });
    }
    if (b.fecha_seguimiento && b.fecha_seguimiento <= b.fecha_ejecucion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fecha_seguimiento debe ser posterior a fecha_ejecucion (D-223)" });
    }
  });
export type RegistrarEjecucionBody = z.infer<typeof registrarEjecucionSchema>;

/** PATCH /api/sivu/work-orders/:workOrderId/ejecuciones/:recordId/revision (D-225 a D-230). */
export const revisarEjecucionSchema = z
  .object({
    estado_revision: z.enum(["aprobado", "rechazado"], { errorMap: () => ({ message: "estado_revision debe ser aprobado o rechazado (D-225)" }) }),
    observaciones_revision: z.string().trim().max(2000).nullable().optional(),
    requiere_correccion: z.boolean({ required_error: "requiere_correccion es obligatorio al revisar (D-229)" }),
    fecha_limite_correccion: fecha("fecha_limite_correccion").nullable().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.estado_revision === "rechazado" && !b.observaciones_revision) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "observaciones_revision es obligatoria al rechazar (D-228)" });
    }
    if (b.requiere_correccion && !b.fecha_limite_correccion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fecha_limite_correccion es obligatoria con requiere_correccion = Sí (D-230)" });
    }
    if (!b.requiere_correccion && b.fecha_limite_correccion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fecha_limite_correccion solo se registra con requiere_correccion = Sí (D-230)" });
    }
  });
export type RevisarEjecucionBody = z.infer<typeof revisarEjecucionSchema>;

export const ejecucionParamsSchema = z.object({
  workOrderId: z.string().uuid("id de orden de trabajo inválido"),
  recordId: z.string().uuid("id de ejecución inválido"),
});

export const revisionesQuerySchema = z
  .object({
    project_id: z.string().uuid("project_id inválido").optional(),
    solo_pendientes: z.enum(["true", "false"]).optional(),
  })
  .strict();
