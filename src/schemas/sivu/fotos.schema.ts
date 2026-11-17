import { z } from "zod";

/**
 * Esquemas de fotografías (CC-049; D-27: las 4 vistas obligatorias;
 * 039: vista «detalle», fotos de registro del árbol y carga firmada).
 */

/**
 * Dominio de `photos.vista` (039). Las cuatro primeras son las de D-27;
 * «detalle» es una foto complementaria que nunca completa D-27.
 */
export const VISTAS_FOTO = ["arbol_completo", "base", "tronco", "copa", "detalle"] as const;
export const vistaFotoSchema = z.enum(VISTAS_FOTO);

/** Tipos de contenido admitidos (los mismos que el bucket, migración 019). */
export const TIPOS_FOTO = ["image/jpeg", "image/png"] as const;

/**
 * Tope de un original (039). Es el `file_size_limit` del bucket
 * `tree-photos` (10 MiB); el límite de 4,5 MB del cuerpo en Vercel se
 * evita con la carga firmada, no subiendo este tope.
 */
export const MAX_FOTO_ORIGINAL_BYTES = 10 * 1024 * 1024;

export const inspectionIdParamSchema = z.object({
  inspectionId: z.string().uuid("id de inspección inválido"),
});

export type InspectionIdParam = z.infer<typeof inspectionIdParamSchema>;

/**
 * `vista` llega como campo de texto en el `multipart/form-data` (junto
 * al archivo) — D-27, dominio de `photos.vista`. Opcional en la forma:
 * el service exige o prohíbe según `tipo_inspeccion_realizada` de la
 * inspección (D-27: obligatoria en Evaluación inicial/Reevaluación/
 * Levantamiento, opcional en Monitoreo, ninguna foto en Evaluación
 * instrumental) — ese cruce no se puede validar aquí, no se conoce la
 * inspección en este punto. «detalle» cumple «vista obligatoria» (se
 * declara qué es la foto) pero no cuenta para las cuatro de D-27.
 */
export const subirFotoInspeccionSchema = z
  .object({
    vista: vistaFotoSchema.optional(),
  })
  .strict();

export type SubirFotoInspeccionBody = z.infer<typeof subirFotoInspeccionSchema>;

export const fotoInspeccionParamSchema = z.object({
  inspectionId: z.string().uuid("id de inspección inválido"),
  photoId: z.string().uuid("id de foto inválido"),
});

export type FotoInspeccionParam = z.infer<typeof fotoInspeccionParamSchema>;

/** :id (proyecto) y :treeId. */
export const arbolProyectoParamSchema = z.object({
  id: z.string().uuid("id de proyecto inválido"),
  treeId: z.string().uuid("id de árbol inválido"),
});

export type ArbolProyectoParam = z.infer<typeof arbolProyectoParamSchema>;

export const fotoArbolParamSchema = arbolProyectoParamSchema.extend({
  photoId: z.string().uuid("id de foto inválido"),
});

export type FotoArbolParam = z.infer<typeof fotoArbolParamSchema>;

/**
 * Foto de registro del árbol (039): fotografía original asociada al
 * ejemplar sin abrir una inspección. La vista es opcional (puede ser
 * una toma general sin clasificar), pero si se declara debe ser del
 * dominio.
 */
export const subirFotoArbolSchema = z
  .object({
    vista: vistaFotoSchema.optional(),
  })
  .strict();

export type SubirFotoArbolBody = z.infer<typeof subirFotoArbolSchema>;

/** Paso 1 de la carga firmada: lo que el cliente declara (se vuelve a verificar al confirmar). */
export const solicitarSubidaSchema = z
  .object({
    content_type: z.enum(TIPOS_FOTO),
    bytes: z.number().int().positive().max(MAX_FOTO_ORIGINAL_BYTES, "La foto supera el máximo de 10 MB"),
    sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 debe ser hexadecimal en minúsculas (64 caracteres)"),
    vista: vistaFotoSchema.optional(),
  })
  .strict();

export type SolicitarSubidaBody = z.infer<typeof solicitarSubidaSchema>;

/** Paso 2: el cliente solo indica qué carga confirma; la ruta la deriva el servidor. */
export const confirmarSubidaSchema = z
  .object({
    upload_id: z.string().uuid("upload_id inválido"),
    sha256: z.string().regex(/^[0-9a-f]{64}$/, "sha256 debe ser hexadecimal en minúsculas (64 caracteres)"),
    vista: vistaFotoSchema.optional(),
  })
  .strict();

export type ConfirmarSubidaBody = z.infer<typeof confirmarSubidaSchema>;
