import { findAllSpecies, SpeciesRow } from "../repositories/species.repository";

/** Catálogo de especies (GET /api/species) para registrar y editar árboles. */
export async function listSpecies(accessToken: string): Promise<{ data: SpeciesRow[] }> {
  return { data: await findAllSpecies(accessToken) };
}
