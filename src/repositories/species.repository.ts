import { createUserScopedClient } from "../config/supabase";

export interface SpeciesRow {
  id: string;
  nombre_cientifico: string;
  nombre_comun: string | null;
}

/**
 * Catálogo de especies ordenado por nombre científico. Lectura con el token
 * del usuario: RLS (migración 010, species_select_authenticated) exige sesión.
 */
export async function findAllSpecies(accessToken: string): Promise<SpeciesRow[]> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase
    .from("species")
    .select("id, nombre_cientifico, nombre_comun")
    .order("nombre_cientifico");

  if (error) {
    throw new Error(`Error al listar especies: ${error.message}`);
  }
  return (data ?? []) as SpeciesRow[];
}
