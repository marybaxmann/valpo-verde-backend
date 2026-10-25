import { createUserScopedClient, supabaseAdmin } from "../../config/supabase";

/**
 * SQLSTATE propio de `fn_rename_species` (migración 018i; #73). El
 * service lo traduce a 422, igual que el resto de SQLSTATE propios de
 * la Fase 6 (rechazo de regla de negocio: rol/actividad del usuario,
 * especie inexistente, nombre igual al actual).
 */
export const SQLSTATE_RENOMBRAR_ESPECIE = "SV061";

/** SQLSTATE propio de `fn_complete_species` (migración 018i; #73). */
export const SQLSTATE_COMPLETAR_ESPECIE = "SV062";

/** SQLSTATE propio de `fn_resolve_or_create_species` (migración 018i; #73). */
export const SQLSTATE_RESOLVER_O_CREAR_ESPECIE = "SV063";

/**
 * Violación de la unicidad por forma normalizada
 * (`uq_species_especie_cientifica_norm`) — solo puede ocurrir en
 * `fn_rename_species` (CC-053 punto 5, caso pedido explícitamente por
 * la responsable). El service la traduce a 409, no a 400: no es un
 * valor mal formado, es un nombre que ya existe.
 */
export const SQLSTATE_UNICIDAD_ESPECIE = "23505";

export interface EspecieRow {
  id: string;
  especie_cientifica: string;
  genero: string | null;
  familia: string | null;
  origen_biogeografico: "nativa" | "endemica" | "introducida" | null;
  persistencia_follaje: "perennifolia" | "caducifolia" | "semicaducifolia" | null;
  tipo_hoja: "latifoliada" | "acicular" | "escuamiforme" | "palmera" | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const ESPECIE_COLUMNS =
  "id, especie_cientifica, genero, familia, origen_biogeografico, persistencia_follaje, tipo_hoja, created_by, created_at, updated_at";

/**
 * Búsqueda por nombre (D-13: el Inspector —o quien complete el
 * árbol— busca antes de incorporar, "evitar duplicidades por
 * diferencias de escritura"). Con el JWT del usuario: `species` ya
 * tiene una policy de lectura que funciona para cualquier
 * `authenticated` (`species_select_authenticated`, migración 012) —
 * a diferencia de la mayoría de las tablas de esta fase, no necesita
 * `service_role` para leer (CC-033).
 *
 * `ilike` sobre un patrón no indexado: aceptable al tamaño actual del
 * catálogo (incorporado a mano por Inspectores, no una importación
 * masiva); si el catálogo crece mucho, un índice trigram es un cambio
 * de rendimiento, no de esta migración.
 */
export async function buscarEspeciesPorNombre(accessToken: string, nombre: string): Promise<EspecieRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("species")
    .select(ESPECIE_COLUMNS)
    .ilike("especie_cientifica", `%${nombre}%`)
    .order("especie_cientifica", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Error al buscar especies: ${error.message}`);
  }

  return (data ?? []) as unknown as EspecieRow[];
}

export interface CompletarEspecieInput {
  speciesId: string;
  genero?: string | null;
  familia?: string | null;
  origenBiogeografico?: "nativa" | "endemica" | "introducida" | null;
  persistenciaFollaje?: "perennifolia" | "caducifolia" | "semicaducifolia" | null;
  tipoHoja?: "latifoliada" | "acicular" | "escuamiforme" | "palmera" | null;
  changedBy: string;
}

/**
 * Invoca `fn_complete_species` (migración 018i) con `service_role`
 * (CC-033: `species` no tiene policy de escritura para `authenticated`
 * — el rol Inspector y la actividad del usuario los verifica la
 * función, no una RLS policy). Un campo no incluido en el body (`undefined`)
 * se envía como su valor ACTUAL (no se pisa con NULL): la función hace
 * un UPDATE de los 5 campos juntos, así que completar solo `genero` no
 * debe borrar `familia` si ya estaba.
 */
export async function completarEspecie(input: CompletarEspecieInput, actual: EspecieRow): Promise<EspecieRow> {
  const { data, error } = await supabaseAdmin.rpc("fn_complete_species", {
    p_species_id: input.speciesId,
    p_genero: input.genero !== undefined ? input.genero : actual.genero,
    p_familia: input.familia !== undefined ? input.familia : actual.familia,
    p_origen_biogeografico:
      input.origenBiogeografico !== undefined ? input.origenBiogeografico : actual.origen_biogeografico,
    p_persistencia_follaje:
      input.persistenciaFollaje !== undefined ? input.persistenciaFollaje : actual.persistencia_follaje,
    p_tipo_hoja: input.tipoHoja !== undefined ? input.tipoHoja : actual.tipo_hoja,
    p_changed_by: input.changedBy,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as EspecieRow;
}

export async function obtenerEspeciePorId(speciesId: string): Promise<EspecieRow | null> {
  const { data, error } = await supabaseAdmin.from("species").select(ESPECIE_COLUMNS).eq("id", speciesId).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as EspecieRow;
}

export interface EspecieRenombradaResultado {
  id: string;
  especie_cientifica: string;
  nombre_anterior: string;
}

/**
 * Invoca `fn_rename_species` (migración 018i; CC-053 punto 5). Mismo
 * patrón `service_role` que `completarEspecie`.
 */
export async function renombrarEspecie(
  speciesId: string,
  especieCientifica: string,
  changedBy: string
): Promise<EspecieRenombradaResultado> {
  const { data, error } = await supabaseAdmin.rpc("fn_rename_species", {
    p_species_id: speciesId,
    p_nombre_nuevo: especieCientifica,
    p_changed_by: changedBy,
  });

  if (error) {
    throw new Error(error.message, { cause: error.code });
  }

  return data as unknown as EspecieRenombradaResultado;
}
