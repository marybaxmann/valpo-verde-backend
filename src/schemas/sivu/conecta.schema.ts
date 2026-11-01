import { z } from "zod";
import { entradasVigentesDe } from "../../services/rules/engine/catalogs";
import { normalizarRut } from "../../utils/rut";
import { textoObligatorio } from "./common.schema";

/**
 * Esquemas de Valpo Verde Conecta (#62; CC-036, CC-062 / PR-022 v2.0;
 * INCIDENCIA D-174 a D-190).
 */

const codigos = (catalogo: string) => entradasVigentesDe(catalogo).map((e) => e.codigo) as [string, ...string[]];

/** `qr_token` de la placa (UUID aleatorio, 018a). */
export const qrTokenParamSchema = z.object({
  qrToken: z.string().uuid(),
});

/**
 * Formulario ciudadano (PR-022 v2.0, «Ingreso»). Llega como
 * multipart/form-data, así que todo es texto. Las fotos (D-183) las
 * valida el service.
 */
export const reporteCiudadanoSchema = z
  .object({
    // D-178: «caracteres alfabéticos, espacios y tildes»; máximo 100.
    nombre_reportante: textoObligatorio("nombre_reportante")
      .pipe(z.string().max(100, "nombre_reportante admite hasta 100 caracteres"))
      .pipe(z.string().regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/, "nombre_reportante solo admite letras, espacios y tildes")),
    // D-179: estructura y dígito verificador; se guarda sin puntos.
    rut_reportante: textoObligatorio("rut_reportante").transform((valor, ctx) => {
      const rut = normalizarRut(valor);
      if (!rut) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "rut_reportante no es un RUT válido (revise el dígito verificador)" });
        return z.NEVER;
      }
      return rut;
    }),
    // D-180.
    tipo_incidencia: z.enum(codigos("tipo_incidencia"), {
      errorMap: () => ({ message: "tipo_incidencia no es un valor de la lista (D-180)" }),
    }),
    // D-181: obligatoria (y, con Otro, es donde se especifica).
    descripcion: textoObligatorio("descripcion").pipe(z.string().max(2000, "descripcion admite hasta 2000 caracteres")),
  })
  .strict();

export type ReporteCiudadanoBody = z.infer<typeof reporteCiudadanoSchema>;

/** Seguimiento (CC-062 punto 4): el código va en el cuerpo, nunca en la URL. */
export const seguimientoSchema = z.object({
  codigo: z.string(),
});

/** Listado de incidencias del proyecto (B9). */
export const listarIncidenciasQuerySchema = z
  .object({
    estado: z.enum(codigos("estado_incidencia"), {
      errorMap: () => ({ message: "estado no es un valor de la lista (D-184)" }),
    }).optional(),
    origen: z.enum(codigos("origen_reporte"), {
      errorMap: () => ({ message: "origen no es un valor de la lista (D-177)" }),
    }).optional(),
    tipo: z.enum(codigos("tipo_incidencia"), {
      errorMap: () => ({ message: "tipo no es un valor de la lista (D-180)" }),
    }).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export type ListarIncidenciasQuery = z.infer<typeof listarIncidenciasQuerySchema>;

export const incidenciaParamsSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  incidentId: z.string().uuid("id de incidencia inválido"),
});

/**
 * Revisión municipal (D-184 a D-189). Las reglas cruzadas (resultado
 * obligatorio fuera de Ingresada, prioridad solo con Validada) las
 * aplica fn_revisar_incidencia (028) y se repiten aquí para responder
 * antes con un mensaje claro.
 */
export const revisionIncidenciaSchema = z
  .object({
    estado_incidencia: z.enum(codigos("estado_incidencia"), {
      errorMap: () => ({ message: "estado_incidencia no es un valor de la lista (D-184)" }),
    }),
    resultado_revision: z
      .enum(codigos("resultado_revision"), {
        errorMap: () => ({ message: "resultado_revision no es un valor de la lista (D-187)" }),
      })
      .nullable()
      .default(null),
    observaciones_revision: z.string().max(2000, "observaciones_revision admite hasta 2000 caracteres").nullable().default(null),
    prioridad_municipal: z
      .enum(codigos("prioridad_municipal"), {
        errorMap: () => ({ message: "prioridad_municipal no es un valor de la lista (D-189)" }),
      })
      .nullable()
      .default(null),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.estado_incidencia !== "ingresada" && b.resultado_revision === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "resultado_revision es obligatorio cuando el estado no es Ingresada (D-187)" });
    }
    if (b.resultado_revision === "validada" && b.prioridad_municipal === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "prioridad_municipal es obligatoria con resultado Validada (D-189)" });
    }
    if (b.resultado_revision !== "validada" && b.prioridad_municipal !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "prioridad_municipal solo se registra con resultado Validada (D-189)" });
    }
  });

export type RevisionIncidenciaBody = z.infer<typeof revisionIncidenciaSchema>;
