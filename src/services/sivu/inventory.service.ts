import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import {
  ArbolInventarioRow,
  FiltrosInventario,
  listarArbolesInventario,
} from "../../repositories/sivu/inventory.repository";
import { InventarioQuery } from "../../schemas/sivu/inventario.schema";

/**
 * Árbol tal como se devuelve en la respuesta del inventario (B1).
 *
 * La proyección es la del alta municipal + valores vigentes de identidad
 * (D-4 a D-29). Los indicadores biométricos y el resultado de riesgo
 * corresponden a B10 y B2 respectivamente (implementación posterior).
 */
export interface ArbolInventario {
  id: string;
  tree_code: string;
  sector_id: string;
  sector: string | null;
  ubicacion_descriptiva: string | null;
  utm_este: number | null;
  utm_norte: number | null;
  ubicacion: { lng: number; lat: number } | null;
  especie_cientifica: string | null;
  nombre_comun: string | null;
  estado_ciclo_vida: string;
  fecha_registro: string;
}

export interface ListadoInventario {
  data: ArbolInventario[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * B1 — Inventario arbóreo del proyecto.
 *
 * Roles autorizados (CC-064 decisión a; PR-018 v6.0):
 * todos los miembros activos del proyecto pueden consultar el inventario
 * en modo de solo lectura: Administrador, Usuario municipal, Inspector
 * y Encargado de mantención.
 *
 * La autorización se aplica en dos capas:
 * 1. `assertProjectAccess` verifica membresía activa (backend).
 * 2. RLS de la migración 017 filtra las filas al proyecto del usuario
 *    cuando se usa `createUserScopedClient` (segunda capa de BD).
 *
 * @param user        Usuario autenticado (req.user).
 * @param projectId   UUID del proyecto validado por el controller.
 * @param query       Filtros y paginación validados por Zod.
 * @param accessToken JWT del usuario (para el cliente con alcance de usuario).
 */
export async function listarInventario(
  user: AuthenticatedUser,
  projectId: string,
  query: InventarioQuery,
  accessToken: string
): Promise<ListadoInventario> {
  // Capa 1: verificar acceso al proyecto (membresía activa o admin).
  await assertProjectAccess(user, projectId, accessToken);

  const filtros: FiltrosInventario = {
    projectId,
    limit: query.limit,
    offset: query.offset,
    sectorId: query.sector_id,
    estadoCicloVida: query.estado_ciclo_vida,
    busqueda: query.busqueda,
  };

  // Capa 2 (RLS): la consulta usa el JWT del usuario → la RLS filtra por
  // proyecto y rol. El backend ya verificó el acceso, pero la RLS actúa
  // como segunda barrera independiente.
  const { filas, total } = await listarArbolesInventario(accessToken, filtros);

  return {
    data: filas.map(aArbolInventario),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/** Mapea la fila de BD al DTO de respuesta. */
function aArbolInventario(fila: ArbolInventarioRow): ArbolInventario {
  const coordenadas = fila.ubicacion?.coordinates;
  return {
    id: fila.id,
    tree_code: fila.tree_code,
    sector_id: fila.sector_id,
    sector: fila.sector,
    ubicacion_descriptiva: fila.ubicacion_descriptiva,
    utm_este: fila.utm_este,
    utm_norte: fila.utm_norte,
    ubicacion: coordenadas ? { lng: coordenadas[0], lat: coordenadas[1] } : null,
    especie_cientifica: fila.especie_cientifica,
    nombre_comun: fila.nombre_comun,
    estado_ciclo_vida: fila.estado_ciclo_vida,
    fecha_registro: fila.fecha_registro,
  };
}
