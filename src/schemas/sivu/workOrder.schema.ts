import { z } from "zod";
import { tipoSubtipoValido } from "./alcanceInspeccion";

/**
 * Body de POST /api/sivu/projects/:id/work-orders — crear una OT de
 * Inspección (#58; D-238, D-244, CC-036). Solo `usuario_municipal`.
 *
 * `tree_id`: obligatorio salvo Levantamiento (D-232/AMD-19, validado
 * también por `fn_create_work_order_inspeccion`, 018h — nunca confía
 * solo en este esquema). `incident_id`: opcional (CC-036, D-233).
 * `prioridad`: opcional en el body — si no viene, el service propone
 * por defecto la `clasificacion_prioridad` de la evaluación vigente
 * del árbol (D-238); si el árbol no tiene evaluación vigente o es
 * Levantamiento sin árbol todavía, es obligatoria en el body (el
 * service no tiene de dónde proponerla).
 */
export const crearOrdenTrabajoInspeccionSchema = z
  .object({
    tree_id: z.string().uuid("tree_id inválido").optional(),
    incident_id: z.string().uuid("incident_id inválido").optional(),
    accion_solicitada: z.enum([
      "evaluacion_inicial",
      "reevaluacion",
      "evaluacion_instrumental",
      "monitoreo",
      "levantamiento",
    ]),
    subtipo_accion: z
      .enum([
        "seguimiento",
        "post_intervencion",
        "tomografia_sonica",
        "resistografia",
        "otra_instrumental",
        "fitosanitario",
        "estructural",
        "vitalidad",
      ])
      .nullable()
      .optional(),
    motivo: z.string().trim().min(1).nullable().optional(),
    prioridad: z.enum(["baja", "media", "alta", "critica"]).optional(),
    observaciones: z.string().trim().min(1).nullable().optional(),
    responsable_accion_id: z.string().uuid("responsable_accion_id inválido"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!tipoSubtipoValido(data.accion_solicitada, data.subtipo_accion ?? null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subtipo_accion"],
        message: "subtipo_accion no corresponde a accion_solicitada (D-197)",
      });
    }
    if (data.accion_solicitada === "levantamiento" && data.tree_id !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tree_id"],
        message: "en una OT de Levantamiento, tree_id debe quedar vacío (D-232; AMD-19)",
      });
    }
    if (data.accion_solicitada !== "levantamiento" && data.tree_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tree_id"],
        message: "tree_id es obligatorio salvo en una OT de Levantamiento",
      });
    }
    if (
      ["levantamiento", "otra", "otra_intervencion"].includes(data.accion_solicitada) &&
      !data.observaciones
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observaciones"],
        message: `observaciones es obligatoria para accion_solicitada = ${data.accion_solicitada} (D-246)`,
      });
    }
  });

export type CrearOrdenTrabajoInspeccionBody = z.infer<typeof crearOrdenTrabajoInspeccionSchema>;

/**
 * Body de PATCH /api/sivu/work-orders/:workOrderId/estado — transición
 * Pendiente→Programada→En ejecución (018g; CC-050). Solo el
 * responsable asignado (Inspector); `fn_transition_work_order_estado`
 * no confía solo en este esquema. `fecha_accion_programada` solo tiene
 * sentido yendo a "programada" — se ignora yendo a "en_ejecucion" (la
 * función no la usa en esa rama).
 */
export const transicionarOrdenTrabajoSchema = z
  .object({
    estado: z.enum(["programada", "en_ejecucion"]),
    fecha_accion_programada: z.string().date("fecha_accion_programada inválida").nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.estado === "programada" && !data.fecha_accion_programada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fecha_accion_programada"],
        message: "fecha_accion_programada es obligatoria al pasar a Programada (D-241)",
      });
    }
  });

export type TransicionarOrdenTrabajoBody = z.infer<typeof transicionarOrdenTrabajoSchema>;

export const workOrderIdParamSchema = z.object({
  workOrderId: z.string().uuid("workOrderId inválido"),
});

/** POST /api/sivu/work-orders/:workOrderId/cancelar (CC-050): motivo obligatorio. */
export const cancelarOrdenTrabajoSchema = z
  .object({ motivo_cancelacion: z.string().trim().min(1, "motivo_cancelacion es obligatorio (CC-050)").max(2000) })
  .strict();

/** PATCH /api/sivu/work-orders/:workOrderId/responsable (CC-050; D-244). */
export const reasignarOrdenTrabajoSchema = z
  .object({ responsable_accion_id: z.string().uuid("responsable_accion_id inválido") })
  .strict();

/** POST /api/sivu/inspections/:inspectionId/anular (CC-067; D-210): motivo obligatorio. */
export const anularInspeccionSchema = z
  .object({ motivo_anulacion: z.string().trim().min(1, "motivo_anulacion es obligatorio (D-210)").max(2000) })
  .strict();
