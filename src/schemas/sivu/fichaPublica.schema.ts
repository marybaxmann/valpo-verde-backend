import { z } from "zod";
import { entradasVigentesDe } from "../../services/rules/engine/catalogs";

/**
 * Ficha pública editable de Valpo Verde Conecta (CC-078; PR-022 v3.0).
 * CATALOGO_ESPECIES D-280 a D-290 (contenido ciudadano de la especie) y
 * FICHAS_PUBLICAS D-297 a D-305 (personalización por árbol). La base
 * (migración 037) asegura tipos, máximos de elementos y exclusiones;
 * aquí se valida la forma interna de cada bloque.
 */

const codigos = (catalogo: string) => entradasVigentesDe(catalogo).map((e) => e.codigo) as [string, ...string[]];

/** Texto opcional: vacío o solo espacios = sin valor (null). */
function textoOpcional(campo: string, max: number) {
  return z
    .string({ invalid_type_error: `${campo} debe ser texto` })
    .trim()
    .max(max, `${campo} admite hasta ${max} caracteres`)
    .nullish()
    .transform((v) => (v ? v : null));
}

function textoRequerido(campo: string, max: number) {
  return z
    .string({ required_error: `${campo} es obligatorio`, invalid_type_error: `${campo} debe ser texto` })
    .trim()
    .min(1, `${campo} es obligatorio`)
    .max(max, `${campo} admite hasta ${max} caracteres`);
}

const sinRepetidos = <T>(lista: T[]) => new Set(lista).size === lista.length;

// --- Contenido ciudadano de la especie (D-280 a D-290) ---------------------

/** D-283: ícono y título. */
const aporteSchema = z
  .object({
    icono: z.enum(codigos("icono_aporte"), { errorMap: () => ({ message: "icono no es un valor de la lista Icono_aporte (D-283)" }) }),
    titulo: textoRequerido("titulo del aporte", 40),
  })
  .strict();

/**
 * D-285: etiqueta y texto. El `id` es la ranura estable de la foto del
 * rasgo; la foto y su crédito no vienen aquí (los fija el endpoint de
 * fotos, nunca el cliente en este cuerpo).
 */
const rasgoSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/, "id del rasgo: minúsculas, dígitos, «_» o «-», hasta 40 caracteres"),
    etiqueta: textoRequerido("etiqueta del rasgo", 20),
    texto: textoRequerido("texto del rasgo", 120),
  })
  .strict();

/** D-286: las cuatro estaciones (hemisferio sur). */
const anioEstacionalSchema = z
  .object({
    prim: textoRequerido("primavera", 80),
    ver: textoRequerido("verano", 80),
    oto: textoRequerido("otoño", 80),
    inv: textoRequerido("invierno", 80),
  })
  .strict();

/** D-287: título y de 2 a 4 pasos. */
const cicloSchema = z
  .object({
    titulo: textoRequerido("titulo del ciclo", 30),
    pasos: z
      .array(z.object({ etiqueta: textoRequerido("etiqueta del paso", 20), texto: textoRequerido("texto del paso", 60) }).strict())
      .min(2, "El ciclo tiene de 2 a 4 pasos (D-287)")
      .max(4, "El ciclo tiene de 2 a 4 pasos (D-287)"),
  })
  .strict();

/** D-290: bloques, tema, referencia y enlace https opcional. */
const fuenteSchema = z
  .object({
    bloques: z
      .array(z.enum(codigos("bloque_contenido"), { errorMap: () => ({ message: "bloque no es un valor de la lista Bloque_contenido (D-290)" }) }))
      .min(1, "Cada fuente indica al menos un bloque (D-290)")
      .refine(sinRepetidos, "Un bloque no se repite en la misma fuente"),
    tema: textoRequerido("tema de la fuente", 120),
    referencia: textoRequerido("referencia de la fuente", 300),
    enlace: z
      .string()
      .trim()
      .url("enlace debe ser una URL válida")
      .refine((u) => u.startsWith("https://"), "enlace debe ser una URL https (D-290)")
      .nullish()
      .transform((v) => v ?? undefined),
  })
  .strict();

export const contenidoEspecieSchema = z
  .object({
    nombre_comun_visualizacion: textoOpcional("nombre_comun_visualizacion", 60),
    articulo_nombre: z.enum(["el", "la"], { errorMap: () => ({ message: "articulo_nombre debe ser «el» o «la» (D-281)" }) }).nullish().transform((v) => v ?? null),
    curiosidad: textoOpcional("curiosidad", 200),
    aportes: z.array(aporteSchema).max(2, "Hasta 2 aportes (D-283)").default([]),
    quien_soy: textoOpcional("quien_soy", 160),
    rasgos: z.array(rasgoSchema).max(3, "Hasta 3 rasgos (D-285)").default([]),
    anio_estacional: anioEstacionalSchema.nullish().transform((v) => v ?? null),
    ciclo: cicloSchema.nullish().transform((v) => v ?? null),
    historia_especie: textoOpcional("historia_especie", 300),
    consejo: textoOpcional("consejo", 160),
    fuentes: z.array(fuenteSchema).default([]),
  })
  .strict()
  .superRefine((c, ctx) => {
    const problema = (message: string, path: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
    if ((c.nombre_comun_visualizacion === null) !== (c.articulo_nombre === null)) {
      problema("articulo_nombre es obligatorio con nombre_comun_visualizacion, y vacío sin él (D-281)", "articulo_nombre");
    }
    if (!sinRepetidos(c.aportes.map((a) => a.icono))) problema("No se repite el mismo ícono en una especie (D-283)", "aportes");
    if (!sinRepetidos(c.rasgos.map((r) => r.id))) problema("Cada rasgo tiene un id distinto", "rasgos");
    if (c.anio_estacional && c.ciclo) problema("Una especie usa el año estacional o el ciclo, no los dos (D-286, D-287)", "ciclo");
    // D-282 y D-288: la fuente General no cuenta.
    for (const bloque of ["curiosidad", "historia_especie"] as const) {
      if (c[bloque] && !c.fuentes.some((f) => f.bloques.includes(bloque))) {
        problema(`${bloque} requiere al menos una fuente de su bloque (D-290)`, "fuentes");
      }
    }
  });

export type ContenidoEspecieBody = z.infer<typeof contenidoEspecieSchema>;

// --- Fotos -----------------------------------------------------------------

/** `referencial` (D-291) o el id de un rasgo (D-285). */
export const ranuraSchema = z.string().regex(/^[a-z0-9_-]{1,40}$/, "ranura inválida");

/**
 * Multipart: todo llega como texto. No se pide crédito: las fotos propias
 * pertenecen al equipo y el servicio guarda «SIVU» (indicación de la
 * responsable, 2026-11-16). Con `temporal` = true (D-293, solo la
 * referencial) la base guarda «Foto de terceros, uso referencial temporal».
 */
export const fotoEspecieBodySchema = z
  .object({
    temporal: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  })
  .strict();

// --- Ficha pública del árbol (D-297 a D-305) ----------------------------------

/** D-305: «el mismo límite del campo de la especie que reemplaza»; fuente hasta 200. */
const textoPersonalizado = (campo: string, max: number) =>
  z
    .object({
      texto: textoRequerido(`texto de ${campo}`, max),
      fuente: textoOpcional(`fuente de ${campo}`, 200),
    })
    .strict();

export const fichaPublicaArbolSchema = z
  .object({
    mostrar_clase_edad: z.boolean().default(false),
    mostrar_altura_total: z.boolean().default(false),
    mostrar_dap: z.boolean().default(false),
    mostrar_diametro_copa: z.boolean().default(false),
    mostrar_rango_edad: z.boolean().default(false),
    historia: textoOpcional("historia", 1000),
    historia_fuente: textoOpcional("historia_fuente", 300),
    textos_personalizados: z
      .object({
        curiosidad: textoPersonalizado("curiosidad", 200).optional(),
        quien_soy: textoPersonalizado("quien_soy", 160).optional(),
        consejo: textoPersonalizado("consejo", 160).optional(),
      })
      .strict()
      .default({}),
  })
  .strict()
  .superRefine((f, ctx) => {
    if (f.historia_fuente && !f.historia) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "historia_fuente solo admite valor si hay historia (D-303)", path: ["historia_fuente"] });
    }
    if (f.textos_personalizados.curiosidad && !f.textos_personalizados.curiosidad.fuente) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La curiosidad personalizada requiere fuente (D-305)", path: ["textos_personalizados", "curiosidad", "fuente"] });
    }
  });

export type FichaPublicaArbolBody = z.infer<typeof fichaPublicaArbolSchema>;

export const especieContenidoParamsSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  speciesId: z.string().uuid("id de especie inválido"),
});

export const especieFotoParamsSchema = especieContenidoParamsSchema.extend({ ranura: ranuraSchema });

export const arbolFichaParamsSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  treeId: z.string().uuid("id de árbol inválido"),
});
