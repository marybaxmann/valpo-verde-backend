import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { findProyectosForMember } from "../../repositories/sivu/project.repository";
import {
  NotificacionRow,
  RecordatorioNuevo,
  insertarRecordatorios,
  listarNotificacionesPropias,
  marcarNotificacionLeida,
  obtenerNotificacionPropia,
} from "../../repositories/sivu/notificaciones.repository";
import { listarProximasInspecciones } from "./proximasInspecciones.service";
import { CATALOGO } from "../rules/engine/catalogs";

/**
 * Avisos dentro de SIVU (CC-051; sin correo en esta etapa) y
 * recordatorios de inspección (#63).
 *
 * Recordatorios — SOLUCIÓN PROVISIONAL (Valej, 2026-11-02): se generan al
 * consultar los avisos, solo para un Usuario municipal y solo en los
 * proyectos donde es miembro, a partir de `recordatorio_activo` de B5 (el
 * inicio del rango de la próxima inspección o monitoreo ya llegó). No se
 * agregan plazos ni se cambia el cálculo de B5. Uno por árbol, tipo y
 * fecha de inicio (clave única en la base).
 */

const TIPO_RECORDATORIO = "recordatorio_inspeccion" as const;

type Proxima = Awaited<ReturnType<typeof listarProximasInspecciones>>[number];

/** Clave de idempotencia de un recordatorio: mismo árbol, tipo e inicio = mismo recordatorio. */
export function claveRecordatorio(p: Pick<Proxima, "arbol" | "tipo" | "inicio">): string {
  return `recordatorio:${p.arbol.id}:${p.tipo}:${p.inicio}`;
}

export function mensajeRecordatorio(p: Pick<Proxima, "arbol" | "tipo" | "inicio" | "termino">): string {
  const que = p.tipo === "inspeccion" ? "la próxima inspección" : "el próximo monitoreo";
  const arbol = p.arbol.tree_code ?? "sin código";
  const rango = p.termino && p.termino !== p.inicio ? `entre el ${p.inicio} y el ${p.termino}` : `desde el ${p.inicio}`;
  return `El árbol ${arbol} tiene ${que} ${rango}.`;
}

/** Genera los recordatorios activos del usuario (solo Usuario municipal). Devuelve cuántos se crearon. */
export async function generarRecordatorios(user: AuthenticatedUser, token: string): Promise<number> {
  if (user.role !== "usuario_municipal") return 0;
  const proyectos = await findProyectosForMember(token, user.id);
  const filas: RecordatorioNuevo[] = [];
  // Un proyecto que falle (p. ej. sin acceso) no impide los recordatorios de los demás.
  const resultados = await Promise.allSettled(
    proyectos.map((proyecto) => listarProximasInspecciones(user, proyecto.id, token, { soloActivos: true }))
  );
  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`No se pudieron leer las próximas inspecciones del proyecto ${proyectos[i].id} (#63):`, r.reason);
      return;
    }
    for (const p of r.value) {
      filas.push({ user_id: user.id, tipo: TIPO_RECORDATORIO, tree_id: p.arbol.id, mensaje: mensajeRecordatorio(p), clave_unica: claveRecordatorio(p) });
    }
  });
  return insertarRecordatorios(filas);
}

function aNotificacion(f: NotificacionRow) {
  return {
    id: f.id,
    tipo: { codigo: f.tipo, etiqueta: CATALOGO.find((c) => c.catalogo === "tipo_notificacion" && c.codigo === f.tipo)?.etiqueta ?? null },
    work_order_id: f.work_order_id,
    tree_id: f.tree_id,
    mensaje: f.mensaje,
    leida: f.leido_at !== null,
    leido_at: f.leido_at,
    created_at: f.created_at,
  };
}

/** GET /api/sivu/notificaciones — avisos propios; antes genera los recordatorios pendientes. */
export async function listarNotificaciones(
  user: AuthenticatedUser,
  query: { solo_no_leidas: boolean; limit: number; offset: number },
  token: string
) {
  // Un fallo al generar recordatorios no impide leer los avisos ya existentes.
  let recordatoriosGenerados: number | null = null;
  try {
    recordatoriosGenerados = await generarRecordatorios(user, token);
  } catch (err) {
    console.error("No se pudieron generar los recordatorios (#63):", err);
  }
  const { filas, total, noLeidas } = await listarNotificacionesPropias(token, {
    soloNoLeidas: query.solo_no_leidas,
    limit: query.limit,
    offset: query.offset,
  });
  return {
    data: filas.map(aNotificacion),
    total,
    no_leidas: noLeidas,
    limit: query.limit,
    offset: query.offset,
    recordatorios_generados: recordatoriosGenerados,
  };
}

/** PATCH /api/sivu/notificaciones/:id/leida — solo el dueño del aviso (único camino de escritura del cliente, CC-051). */
export async function marcarLeida(user: AuthenticatedUser, id: string, token: string) {
  const propia = await obtenerNotificacionPropia(token, id);
  if (!propia) throw new AppError("El aviso no existe", 404);
  if (propia.leido_at !== null) return aNotificacion(propia);
  const actualizada = await marcarNotificacionLeida(id, user.id);
  // null = otra consulta la marcó entre la lectura y la escritura: se relee.
  return aNotificacion(actualizada ?? (await obtenerNotificacionPropia(token, id)) ?? propia);
}
