import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO, ClasificacionRiesgoCodigo } from "../rules/engine/catalogs";
import { calcularFechaProximaInspeccion, calcularFechaProximoMonitoreo } from "../rules/engine/fechas-sugeridas";
import { ProximaRow, listarArbolesPorId, listarProximas } from "../../repositories/sivu/proximasInspecciones.repository";

/**
 * B5 — GET /api/sivu/projects/:id/upcoming-inspections: recordatorios de
 * próxima inspección y monitoreo (CC-037: SIVU no agenda, avisa desde el
 * inicio del rango; el Usuario municipal crea la OT desde la lista).
 * Todos los miembros del proyecto y el Administrador.
 *
 * Rango (CC-037; decisiones de la responsable, 2026-11-01):
 * - Fecha ajustada por el Inspector: inicio y término = la fecha ajustada.
 * - Fecha sugerida: inicio = la fecha vigente; término = el de la tabla de
 *   plazos del motor (D-202/D-203) para el riesgo efectivo y la fecha de
 *   la inspección de origen. Un solo valor (Bajo, Moderado en D-202):
 *   término = inicio. «Inmediato y continuo» (Extremo en D-203): sin
 *   término. Si la fecha vigente no coincide con el inicio que da la
 *   tabla (en Monitoreo, D-202 conserva la fecha anterior, CC-055), se
 *   trata como un solo valor.
 * - `recordatorio_activo`: el inicio ya llegó (fecha de hoy en Chile).
 */

type Valor = { codigo: string; etiqueta: string | null } | null;

function conEtiqueta(catalogo: string, codigo: string | null): Valor {
  if (codigo === null) return null;
  const entrada = CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo);
  return { codigo, etiqueta: entrada?.etiqueta ?? null };
}

/** Fecha de hoy en Chile (AAAA-MM-DD). */
export function hoyEnChile(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export function rangoDe(fila: ProximaRow): { inicio: string; termino: string | null; inmediato_y_continuo: boolean } {
  const unico = { inicio: fila.fecha, termino: fila.fecha, inmediato_y_continuo: false };
  if (fila.ajustada) return unico;
  const nivel = fila.nivel_riesgo as ClasificacionRiesgoCodigo | null;
  const r = fila.tipo === "inspeccion"
    ? calcularFechaProximaInspeccion(nivel, fila.fecha_inspeccion)
    : calcularFechaProximoMonitoreo(nivel, fila.fecha_inspeccion);
  if (r.noDeterminable || r.fechaInicio !== fila.fecha) return unico;
  return { inicio: fila.fecha, termino: r.fechaFin, inmediato_y_continuo: r.inmediatoYContinuo === true };
}

export async function listarProximasInspecciones(
  user: AuthenticatedUser,
  projectId: string,
  token: string,
  opciones: { soloActivos: boolean; hoy?: string }
) {
  await assertProjectAccess(user, projectId, token);
  const filas = await listarProximas(token, projectId);
  const arboles = await listarArbolesPorId(token, [...new Set(filas.map((f) => f.tree_id))]);
  const arbolPorId = new Map(arboles.map((a) => [a.id, a]));
  const hoy = opciones.hoy ?? hoyEnChile();

  return filas
    .map((f) => {
      const a = arbolPorId.get(f.tree_id);
      const rango = rangoDe(f);
      return {
        arbol: {
          id: f.tree_id,
          tree_code: a?.tree_code ?? null,
          especie_cientifica: a?.especie_cientifica ?? null,
          nombre_comun: a?.nombre_comun ?? null,
          ubicacion_descriptiva: a?.ubicacion_descriptiva ?? null,
        },
        tipo: f.tipo,
        ...rango,
        ajustada: f.ajustada,
        nivel_riesgo: conEtiqueta("clasificacion_riesgo", f.nivel_riesgo),
        inspection_id: f.inspection_id,
        recordatorio_activo: rango.inicio <= hoy,
      };
    })
    .filter((p) => !opciones.soloActivos || p.recordatorio_activo)
    .sort((x, y) => x.inicio.localeCompare(y.inicio) || (x.arbol.tree_code ?? "").localeCompare(y.arbol.tree_code ?? "") || x.tipo.localeCompare(y.tipo));
}
