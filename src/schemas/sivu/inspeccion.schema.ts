import { z } from "zod";
import {
  CATALOGO_SELECCION_MULTIPLE,
  CATALOGO_SELECCION_UNICA,
  CAMPOS_SI_NO,
  camposPermitidosPorTipo,
  tipoSubtipoValido,
} from "./alcanceInspeccion";
import { esCodigoVigente } from "../../services/rules/engine/catalogs";

/**
 * Subconjunto de ARBOLES que el Inspector puede corregir desde una
 * inspección (mismos 20 campos que `tree_data_versions_arbol_input`,
 * 018e/018f — sin `id`/`tree_id`/`inspection_id`/`created_by`/
 * `created_at`, que resuelve el backend, y sin `diametro_copa_m`, que
 * es GENERATED). Cada guardado envía el estado COMPLETO del borrador
 * para este bloque, nunca un delta (018e): las claves ausentes de este
 * objeto son "no registrado todavía", no "sin cambios".
 *
 * `clase_edad`/`rango_edad_estimada_anios`: mismos dominios que el
 * CHECK físico de `trees`/`tree_data_versions` (D-25, D-26; CC-039).
 *
 * DAP (D-16 a D-18; CC-056 decisión n): con `multifustal` = Sí, el
 * backend calcula `dap_cm` desde `numero_fustes` y `dap_fustes_cm` al
 * guardar (`inspection.service.ts`); el Inspector no lo envía. Se
 * rechaza (400) lo que contradice esa regla — ver `validarDap`.
 */
export const camposArbolBaseSchema = z
  .object({
    sector: z.string().trim().min(1).nullable(),
    ubicacion_descriptiva: z.string().trim().min(1).nullable(),
    utm_este: z.number().finite().nullable(),
    utm_norte: z.number().finite().nullable(),
    especie_cientifica: z.string().trim().min(1).nullable(),
    nombre_comun: z.string().trim().min(1).nullable(),
    multifustal: z.boolean().nullable(),
    numero_fustes: z.number().int().min(2, "numero_fustes debe ser un entero ≥ 2 (D-16)").nullable(),
    dap_fustes_cm: z.array(z.number().positive()).nullable(),
    dap_cm: z.number().positive().nullable(),
    altura_total_m: z.number().positive().nullable(),
    diametro_copa_ns_m: z.number().positive().nullable(),
    diametro_copa_eo_m: z.number().positive().nullable(),
    copa_no_presenta: z.boolean().nullable(),
    altura_primera_rama_m: z.number().nonnegative().nullable(),
    altura_primera_rama_no_presenta: z.boolean().nullable(),
    altura_base_copa_viva_m: z.number().nonnegative().nullable(),
    altura_base_copa_viva_no_presenta: z.boolean().nullable(),
    clase_edad: z.enum(["joven", "semimaduro", "tempranamente_maduro", "maduro", "sobremaduro"]).nullable(),
    rango_edad_estimada_anios: z
      .enum([
        "0_5", "6_10", "11_15", "16_20", "21_25", "26_30", "31_35", "36_40",
        "41_45", "46_50", "51_55", "56_60", "61_65", "66_70", "71_75",
        "76_80", "81_85", "86_90", "91_95", "96_100", "mas_de_100",
      ])
      .nullable(),
  })
  .partial()
  .strict();

function validarDap(data: z.infer<typeof camposArbolBaseSchema>, ctx: z.RefinementCtx): void {
  const conFustes =
    (data.numero_fustes !== undefined && data.numero_fustes !== null) ||
    (data.dap_fustes_cm !== undefined && data.dap_fustes_cm !== null);
  if (data.multifustal !== true && conFustes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["multifustal"],
      message: "numero_fustes y dap_fustes_cm solo se registran con multifustal = Sí en el mismo guardado (D-16, D-17)",
    });
  }
  if (data.multifustal === true && data.dap_cm !== undefined && data.dap_cm !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dap_cm"],
      message: "Con multifustal = Sí, dap_cm lo calcula la plataforma desde dap_fustes_cm; no se ingresa (D-18)",
    });
  }
  if (data.dap_fustes_cm !== undefined && data.dap_fustes_cm !== null) {
    const n = data.numero_fustes ?? null;
    if (n === null || data.dap_fustes_cm.length !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dap_fustes_cm"],
        message: `La cantidad de diámetros registrados (${data.dap_fustes_cm.length}) debe coincidir con numero_fustes (${n ?? "sin valor"}) (D-17)`,
      });
    }
  }
}

export const camposArbolSchema = camposArbolBaseSchema.superRefine(validarDap);

export type CamposArbolBody = z.infer<typeof camposArbolSchema>;

/**
 * `variables` (REGISTRO_EVALUACION): el valor de cada campo no se
 * tipa aquí uno por uno todavía (fuera de alcance de este pase, ver
 * `alcanceInspeccion.ts`) — se acepta cualquier valor primitivo o
 * `null` por clave, y una lista de textos solo en los campos de
 * selección múltiple (CC-056 decisión o). Los campos de selección
 * múltiple y de selección única sí se validan contra su catálogo, en
 * `validarAlcanceVariables`. Lo que SÍ se exige, siempre, es que la
 * CLAVE esté dentro del alcance de `tipo`/`subtipo` — `superRefine`
 * del esquema contenedor.
 */
const valorVariable = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]);
const variablesSchema = z.record(z.string(), valorVariable);

const camposComunesInspeccion = {
  tipo_inspeccion_realizada: z.enum([
    "evaluacion_inicial",
    "reevaluacion",
    "evaluacion_instrumental",
    "monitoreo",
    "levantamiento",
  ]),
  subtipo_inspeccion: z
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
  metodo_instrumental: z.string().trim().min(1).nullable().optional(),
  resultado_general: z.string().trim().min(1).nullable().optional(),
  requiere_mantenimiento: z.boolean().nullable().optional(),
  observaciones: z.string().trim().min(1).nullable().optional(),
  variables: variablesSchema,
  campos_arbol: camposArbolSchema.optional(),
};

/**
 * Valida que cada clave de `variables` esté dentro del alcance de
 * `tipo`/`subtipo` (CC-040), cuando ese alcance ya está cerrado. Para
 * Evaluación inicial, Reevaluación y Levantamiento,
 * `camposPermitidosPorTipo` devuelve `null` (lista todavía sin
 * enumerar completa) y este esquema no restringe ninguna clave — ver
 * el aviso en `alcanceInspeccion.ts`.
 */
function validarAlcanceVariables(
  data: { tipo_inspeccion_realizada: string; subtipo_inspeccion?: string | null; variables: Record<string, unknown> },
  ctx: z.RefinementCtx
): void {
  if (!tipoSubtipoValido(data.tipo_inspeccion_realizada, data.subtipo_inspeccion ?? null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subtipo_inspeccion"],
      message: `subtipo_inspeccion no corresponde a tipo_inspeccion_realizada (D-197)`,
    });
    return;
  }

  const permitidos = camposPermitidosPorTipo(data.tipo_inspeccion_realizada, data.subtipo_inspeccion ?? null);
  if (permitidos === null) return;

  const permitidosSet = new Set<string>(permitidos);
  for (const clave of Object.keys(data.variables)) {
    if (!permitidosSet.has(clave)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variables", clave],
        message: `"${clave}" no está en el alcance de ${data.tipo_inspeccion_realizada}${
          data.subtipo_inspeccion ? "/" + data.subtipo_inspeccion : ""
        } (CC-040)`,
      });
    }
  }

  // Campos de selección múltiple (D-132, D-139, D-143; CC-056 decisión
  // o): lista no vacía de códigos vigentes de su catálogo, sin
  // repetidos, o null. Ningún otro campo acepta una lista.
  for (const [clave, valor] of Object.entries(data.variables)) {
    const catalogo = CATALOGO_SELECCION_MULTIPLE[clave];
    if (catalogo === undefined) {
      if (Array.isArray(valor)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variables", clave],
          message: `"${clave}" no es de selección múltiple; no acepta una lista`,
        });
      }
      continue;
    }
    if (valor === null) continue;
    const valida =
      Array.isArray(valor) &&
      valor.length > 0 &&
      new Set(valor).size === valor.length &&
      valor.every((codigo) => esCodigoVigente(catalogo, codigo));
    if (!valida) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variables", clave],
        message: `"${clave}" debe ser una lista no vacía, sin repetidos, de códigos vigentes de ${catalogo}: ${JSON.stringify(valor)}`,
      });
    }
  }

  // Campos de selección única (PR-021; B16), entre ellos
  // clasificacion_vitalidad (D-169; AM-17): un código vigente de su
  // catálogo, o null. Una etiqueta ("Baldosa" en vez de "baldosa"), un
  // número o un booleano se rechazan aquí, no se dejan pasar como texto
  // libre hasta que el motor los rechace al finalizar.
  for (const [clave, valor] of Object.entries(data.variables)) {
    const catalogo = CATALOGO_SELECCION_UNICA[clave];
    if (catalogo === undefined || valor === null || Array.isArray(valor)) continue;
    if (typeof valor !== "string" || !esCodigoVigente(catalogo, valor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variables", clave],
        message: `"${clave}" debe ser un código vigente de ${catalogo}: ${JSON.stringify(valor)}`,
      });
    }
  }

  // Campos "Sí / No" (PR-021): true, false o null; "Sí", "si" o 1 se rechazan.
  for (const [clave, valor] of Object.entries(data.variables)) {
    if (CAMPOS_SI_NO.has(clave) && valor !== null && typeof valor !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variables", clave],
        message: `"${clave}" es Sí / No: debe ser true, false o null: ${JSON.stringify(valor)}`,
      });
    }
  }
}

/**
 * Body de POST /api/sivu/work-orders/:workOrderId/inspections — primer
 * guardado (crea la inspección en Preguardado). `tree_id` solo es
 * obligatorio cuando la OT es de Levantamiento con un árbol EXISTENTE
 * (D-193: el árbol debe ser del mismo proyecto; lo valida la función
 * SQL) — el service lo rechaza si la OT no es de Levantamiento y el
 * body lo incluye igual, y si es de Levantamiento y falta.
 *
 * Fuera de alcance de este esquema (y de este endpoint, por ahora):
 * crear un árbol NUEVO durante un Levantamiento (CC-052/018f) — ese
 * endpoint va después (pendiente de la búsqueda de árboles cercanos).
 */
export const crearBorradorInspeccionSchema = z
  .object({
    ...camposComunesInspeccion,
    tree_id: z.string().uuid("tree_id inválido").optional(),
  })
  .strict()
  .superRefine(validarAlcanceVariables);

export type CrearBorradorInspeccionBody = z.infer<typeof crearBorradorInspeccionSchema>;

/**
 * Body de PATCH /api/sivu/inspections/:inspectionId — guardados
 * siguientes. Sin `tree_id`: una vez creada la inspección, el árbol ya
 * quedó resuelto (D-193) y no se vuelve a enviar. Mismo criterio que
 * `fn_save_inspection_draft`: el body trae el estado COMPLETO del
 * borrador en este guardado, nunca un delta.
 */
export const guardarBorradorInspeccionSchema = z
  .object(camposComunesInspeccion)
  .strict()
  .superRefine(validarAlcanceVariables);

export type GuardarBorradorInspeccionBody = z.infer<typeof guardarBorradorInspeccionSchema>;

export const inspectionIdParamSchema = z.object({
  inspectionId: z.string().uuid("inspectionId inválido"),
});
