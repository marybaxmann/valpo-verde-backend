import { z } from "zod";
import { INCIDENT_STATES, INFRA_DOMAINS, MAINTENANCE_ACTIONS, MAINTENANCE_STATES } from "../services/rules/moduleCatalogs";

/**
 * Validación de Infraestructura (datos crudos), órdenes de trabajo e
 * incidencias — corte demo. Campos de infraestructura con los nombres de
 * DICCIONARIO_CAMPOS (REGISTRO_EVALUACION); dominios en moduleCatalogs.ts.
 */

const fecha = (campo: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${campo} debe tener formato AAAA-MM-DD`);

const fechaNoFutura = (campo: string) =>
  fecha(campo).refine((val) => val <= new Date().toISOString().slice(0, 10), {
    message: `${campo} no puede ser una fecha futura`,
  });

const siNo = z.enum(INFRA_DOMAINS.si_no);
const siNoOpt = siNo.nullable();
const dom = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).nullable();

// Compuertas por componente: null = "No determinado" (información no
// evaluable en el levantamiento); nunca se convierte en "No".
export const infrastructureVariablesSchema = z
  .object({
    // Acera / vereda
    existe_vereda: siNoOpt,
    materialidad_vereda: dom(INFRA_DOMAINS.materialidad_vereda),
    presenta_levantamiento_vereda: siNoOpt,
    presenta_desplazamiento_horizontal_vereda: siNoOpt,
    presenta_grieta_vereda: siNoOpt,
    presenta_rotura_vereda: siNoOpt,
    presenta_hundimiento_vereda: siNoOpt,
    reduce_circulacion_peatonal: siNoOpt,
    impide_paso_seguro: siNoOpt,

    // Calzada
    existe_calzada: siNoOpt,
    materialidad_calzada: dom(INFRA_DOMAINS.materialidad_calzada),
    dano_interferencia_calzada: siNoOpt,
    levantamiento_calzada: siNoOpt,
    grieta_fisuracion_calzada: siNoOpt,
    hundimiento_calzada: siNoOpt,
    rotura_calzada: siNoOpt,
    afecta_circulacion_vehicular: siNoOpt,

    // Alcorque / superficie de plantación
    existe_alcorque: siNoOpt,
    forma_alcorque: dom(INFRA_DOMAINS.forma_alcorque),

    // Infraestructura vertical
    contacto_interferencia_infraestructura_vertical: siNoOpt,
    tipo_infraestructura_vertical: dom(INFRA_DOMAINS.tipo_infraestructura_vertical),
    dano_fisico_observable_infraestructura_vertical: siNoOpt,
    compromete_estabilidad_funcionalidad: siNoOpt,

    // Redes / servicios
    interferencia_redes_servicios: siNoOpt,
    red_aerea_presente: siNoOpt,
    tipo_red_aerea: dom(INFRA_DOMAINS.tipo_red_aerea),
    red_subterranea_presente: z.enum(INFRA_DOMAINS.si_no_nd).nullable(),
    tipo_red_subterranea: dom(INFRA_DOMAINS.tipo_red_subterranea),
    afectacion_fisica_red_subterranea: siNoOpt,
    compromete_funcionalidad_red_subterranea: siNoOpt,
  })
  .strict();

export const createInfrastructureAssessmentSchema = z
  .object({
    fecha_evaluacion: fechaNoFutura("fecha_evaluacion"),
    variables: infrastructureVariablesSchema,
    observaciones: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type CreateInfrastructureAssessmentBody = z.infer<typeof createInfrastructureAssessmentSchema>;

const ACTION_CODES = MAINTENANCE_ACTIONS.map((a) => a.codigo) as [string, ...string[]];

export const createMaintenanceOrderSchema = z
  .object({
    tree_id: z.string().uuid("tree_id inválido"),
    accion_solicitada: z.enum(ACTION_CODES),
    subtipo_accion: z.string().trim().nullable().optional(),
    fecha_programada: fecha("fecha_programada").nullable().optional(),
    responsable: z.string().trim().max(200).nullable().optional(),
    observacion: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const action = MAINTENANCE_ACTIONS.find((a) => a.codigo === val.accion_solicitada)!;
    const sub = val.subtipo_accion || null;
    if (action.subtipos.length > 0) {
      if (!sub || !action.subtipos.some((s) => s.codigo === sub)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona un subtipo válido para la acción", path: ["subtipo_accion"] });
      }
    } else if (sub) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La acción seleccionada no tiene subtipos", path: ["subtipo_accion"] });
    }
    if (action.requiere_observacion && !val.observacion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "“Otra intervención” requiere especificar la observación", path: ["observacion"] });
    }
  });

export type CreateMaintenanceOrderBody = z.infer<typeof createMaintenanceOrderSchema>;

export const createIncidentSchema = z
  .object({
    tree_id: z.string().uuid("tree_id inválido").nullable().optional(),
    // Sin catálogo vigente para tipo ni origen (schema.sql: texto libre,
    // "categoría de origen aún no cerrada"): se registran tal cual.
    tipo: z.string().trim().min(1, "Indica el tipo de incidencia").max(200),
    descripcion: z.string().trim().min(1, "Describe la incidencia").max(2000),
    origen_reporte: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export type CreateIncidentBody = z.infer<typeof createIncidentSchema>;

const MAINT_STATE_CODES = MAINTENANCE_STATES.map((s) => s.codigo) as [string, ...string[]];
const INCIDENT_STATE_CODES = INCIDENT_STATES.map((s) => s.codigo) as [string, ...string[]];

export const updateMaintenanceStateSchema = z
  .object({
    estado: z.enum(MAINT_STATE_CODES, { errorMap: () => ({ message: "Estado de orden no válido" }) }),
  })
  .strict();

export const updateIncidentStateSchema = z
  .object({
    estado: z.enum(INCIDENT_STATE_CODES, { errorMap: () => ({ message: "Estado de incidencia no válido" }) }),
    observacion: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const recordIdParamSchema = z.object({
  id: z.string().uuid("Identificador de proyecto inválido"),
  recordId: z.string().uuid("Identificador de registro inválido"),
});

export type UpdateMaintenanceStateBody = z.infer<typeof updateMaintenanceStateSchema>;
export type UpdateIncidentStateBody = z.infer<typeof updateIncidentStateSchema>;
