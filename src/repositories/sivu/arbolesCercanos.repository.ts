import { createUserScopedClient } from "../../config/supabase";

/** Árbol candidato para la búsqueda de cercanos (CC-052). */
export interface ArbolCercanoRow {
  id: string;
  tree_code: string;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  ubicacion_descriptiva: string | null;
  utm_este: number | string;
  utm_norte: number | string;
  estado_ciclo_vida: string;
}

/**
 * Árboles del proyecto dentro del cuadrado de lado 2 × radio centrado en
 * la coordenada (UTM 19S, metros), con el JWT del usuario. La distancia
 * exacta la calcula el service. Los árboles sin UTM no entran.
 */
export async function listarArbolesEnCuadrado(
  accessToken: string,
  projectId: string,
  centro: { este: number; norte: number },
  radio: number
): Promise<ArbolCercanoRow[]> {
  const { data, error } = await createUserScopedClient(accessToken)
    .from("trees")
    .select("id, tree_code, especie_cientifica, nombre_comun, ubicacion_descriptiva, utm_este, utm_norte, estado_ciclo_vida")
    .eq("project_id", projectId)
    .gte("utm_este", centro.este - radio)
    .lte("utm_este", centro.este + radio)
    .gte("utm_norte", centro.norte - radio)
    .lte("utm_norte", centro.norte + radio)
    .limit(1000);
  if (error) {
    throw new Error(error.message, { cause: error.code });
  }
  return (data ?? []) as ArbolCercanoRow[];
}
