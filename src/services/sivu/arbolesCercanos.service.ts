import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO } from "../rules/engine/catalogs";
import { listarArbolesEnCuadrado } from "../../repositories/sivu/arbolesCercanos.repository";

/**
 * GET /api/sivu/projects/:id/nearby-trees — árboles del mismo proyecto
 * cercanos a una coordenada, para que el Inspector no duplique un árbol
 * antes de crearlo en un Levantamiento (CC-052: «el backend debe ofrecer
 * una búsqueda de árboles del mismo proyecto cercanos a una coordenada»).
 *
 * El radio lo elige el frontend (CC-052: decisión de UX de la Fase 7).
 * La coordenada es UTM 19S (D-9, D-10), la misma que ingresa el
 * Inspector; como las del árbol están en el mismo huso, la distancia es
 * euclidiana en metros. Todos los miembros del proyecto y el
 * Administrador (lectura del inventario, CC-064 a).
 */

export interface ConsultaCercanos {
  utm_este: number;
  utm_norte: number;
  radio_m: number;
  limit: number;
}

export async function buscarArbolesCercanos(user: AuthenticatedUser, projectId: string, consulta: ConsultaCercanos, token: string) {
  await assertProjectAccess(user, projectId, token);
  const filas = await listarArbolesEnCuadrado(token, projectId, { este: consulta.utm_este, norte: consulta.utm_norte }, consulta.radio_m);

  return filas
    .map((f) => {
      const este = Number(f.utm_este);
      const norte = Number(f.utm_norte);
      const distancia = Math.hypot(este - consulta.utm_este, norte - consulta.utm_norte);
      const etiqueta = CATALOGO.find((c) => c.catalogo === "estado_ciclo_vida" && c.codigo === f.estado_ciclo_vida)?.etiqueta ?? null;
      return {
        id: f.id,
        tree_code: f.tree_code,
        especie_cientifica: f.especie_cientifica,
        nombre_comun: f.nombre_comun,
        ubicacion_descriptiva: f.ubicacion_descriptiva,
        utm_este: este,
        utm_norte: norte,
        estado_ciclo_vida: { codigo: f.estado_ciclo_vida, etiqueta },
        distancia_m: Math.round(distancia * 10) / 10,
      };
    })
    .filter((a) => a.distancia_m <= consulta.radio_m)
    .sort((a, b) => a.distancia_m - b.distancia_m || a.tree_code.localeCompare(b.tree_code))
    .slice(0, consulta.limit);
}
