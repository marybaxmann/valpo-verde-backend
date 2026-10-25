import { z } from "zod";
import { textoObligatorio } from "./common.schema";

/**
 * Esquemas de CATALOGO_ESPECIES incorporado por el Inspector (#73;
 * CC-053; D-13, D-257 a D-262, REGLAS_GENERALES fila 18).
 */

/**
 * Query de GET /api/sivu/projects/:id/species — búsqueda por nombre.
 * Cualquier rol con acceso al proyecto (CC-053 no restringe la
 * búsqueda, solo quién incorpora/corrige — eso lo exige el service).
 */
export const buscarEspeciesQuerySchema = z
  .object({
    nombre: textoObligatorio("nombre"),
  })
  .strict();

export type BuscarEspeciesQuery = z.infer<typeof buscarEspeciesQuerySchema>;

export const especieIdParamSchema = z.object({
  id: z.string().uuid("id de especie inválido"),
});

export type EspecieIdParam = z.infer<typeof especieIdParamSchema>;

/**
 * D-259/D-261/D-262 (CATALOGO_ESPECIES): dominios fijos del Excel.
 * `null` explícito permite borrar un campo ya completado (D-258 a
 * D-262: "no inventar, no bloquear" — nunca se exige, pero si el
 * Inspector decide corregirlo a "no determinado" otra vez, no hay
 * forma de expresarlo salvo aceptando `null`).
 */
const origenBiogeografico = z.enum(["nativa", "endemica", "introducida"]).nullable();
const persistenciaFollaje = z.enum(["perennifolia", "caducifolia", "semicaducifolia"]).nullable();
const tipoHoja = z.enum(["latifoliada", "acicular", "escuamiforme", "palmera"]).nullable();

/**
 * Body de PATCH /api/sivu/species/:id — completar genero/familia/
 * origen_biogeografico/persistencia_follaje/tipo_hoja (CC-053 punto 4).
 * Todos opcionales (D-258 a D-262); al menos uno debe venir, si no no
 * hay nada que completar. Solo el Inspector (REGLAS_GENERALES fila 18).
 */
export const completarEspecieSchema = z
  .object({
    genero: textoObligatorio("genero").nullable().optional(),
    familia: textoObligatorio("familia").nullable().optional(),
    origen_biogeografico: origenBiogeografico.optional(),
    persistencia_follaje: persistenciaFollaje.optional(),
    tipo_hoja: tipoHoja.optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.genero !== undefined ||
      body.familia !== undefined ||
      body.origen_biogeografico !== undefined ||
      body.persistencia_follaje !== undefined ||
      body.tipo_hoja !== undefined,
    { message: "debe incluir al menos un campo a completar" }
  );

export type CompletarEspecieBody = z.infer<typeof completarEspecieSchema>;

/**
 * Body de PATCH /api/sivu/species/:id/nombre — corregir
 * especie_cientifica (CC-053 punto 5). Solo el Inspector. El dominio
 * ("Género sp.", "No determinado") y los duplicados por forma
 * normalizada ya los rechaza la base (`chk_species_especie_cientifica_valida`,
 * `uq_species_especie_cientifica_norm`) — este esquema solo exige que
 * no venga vacío.
 */
export const renombrarEspecieSchema = z
  .object({
    especie_cientifica: textoObligatorio("especie_cientifica"),
  })
  .strict();

export type RenombrarEspecieBody = z.infer<typeof renombrarEspecieSchema>;
