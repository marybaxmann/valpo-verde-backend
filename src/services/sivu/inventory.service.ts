import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { etiquetaDe } from "../rules/engine/catalogs";
import {
  ArbolInventarioRow,
  FiltrosInventario,
  RiesgoVigenteRow,
  listarArbolesInventario,
  listarFechasVigencia,
  listarRiesgoVigente,
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
  /** Código; se mantiene por compatibilidad. La etiqueta va en `ciclo_vida`. */
  estado_ciclo_vida: string;
  ciclo_vida: { codigo: string; etiqueta: string };
  fecha_registro: string;
  multifustal: boolean | null;
  numero_fustes: number | null;
  /** En un multifustal, el DAP equivalente que calcula la plataforma (D-18). */
  dap_cm: number | null;
  altura_total_m: number | null;
  /** Riesgo efectivo de la evaluación vigente; `null` = sin evaluación. */
  riesgo: { codigo: string; etiqueta: string; ajustada: boolean } | null;
  /** `fecha_completada_ot` de la OT que aportó los datos vigentes; `null` si solo hay datos del alta. */
  vigente_desde: string | null;
  /**
   * Token de la placa QR (PR-022 v2.0). Solo para el Usuario municipal,
   * que genera las placas; para los demás roles el campo no viene.
   */
  qr_token?: string;
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
    incluirQrToken: user.role === "usuario_municipal",
  };

  // Capa 2 (RLS): la consulta usa el JWT del usuario → la RLS filtra por
  // proyecto y rol. El backend ya verificó el acceso, pero la RLS actúa
  // como segunda barrera independiente.
  const { filas, total } = await listarArbolesInventario(accessToken, filtros);

  // Columnas aprobadas el 2026-10-27 (B1-listado-arboles.md): riesgo de la
  // evaluación vigente y fecha desde la que rigen los datos, por página.
  const inspectionIds = [...new Set(filas.map((f) => f.vigente_desde_inspection_id).filter((id): id is string => id !== null))];
  const [riesgos, fechas] = await Promise.all([
    listarRiesgoVigente(accessToken, filas.map((f) => f.id)),
    listarFechasVigencia(accessToken, inspectionIds),
  ]);
  const riesgoPorArbol = new Map(riesgos.map((r) => [r.tree_id, r]));
  const fechaPorInspeccion = new Map(fechas.map((f) => [f.id, f.fecha_completada_ot]));

  return {
    data: filas.map((f) =>
      aArbolInventario(
        f,
        riesgoPorArbol.get(f.id),
        f.vigente_desde_inspection_id ? fechaPorInspeccion.get(f.vigente_desde_inspection_id) ?? null : null
      )
    ),
    total,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * Riesgo efectivo (decisión de la responsable, 2026-10-27): el ajustado
 * por el Inspector si existe; si no, el calculado. `null` sin evaluación
 * vigente (el frontend muestra «Sin evaluación»).
 */
function riesgoEfectivo(r: RiesgoVigenteRow | undefined): ArbolInventario["riesgo"] {
  const codigo = r?.clasificacion_riesgo_ajustada ?? r?.clasificacion_riesgo_calculada ?? null;
  if (!r || codigo === null) return null;
  return { codigo, etiqueta: etiquetaDe("clasificacion_riesgo", codigo), ajustada: r.clasificacion_riesgo_ajustada !== null };
}

/** Mapea la fila de BD al DTO de respuesta. */
function aArbolInventario(fila: ArbolInventarioRow, riesgo: RiesgoVigenteRow | undefined, vigenteDesde: string | null): ArbolInventario {
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
    ciclo_vida: { codigo: fila.estado_ciclo_vida, etiqueta: etiquetaDe("estado_ciclo_vida", fila.estado_ciclo_vida) },
    fecha_registro: fila.fecha_registro,
    multifustal: fila.multifustal,
    numero_fustes: fila.numero_fustes,
    dap_cm: fila.dap_cm === null ? null : Number(fila.dap_cm),
    altura_total_m: fila.altura_total_m === null ? null : Number(fila.altura_total_m),
    riesgo: riesgoEfectivo(riesgo),
    vigente_desde: vigenteDesde,
    ...(fila.qr_token !== undefined ? { qr_token: fila.qr_token } : {}),
  };
}
