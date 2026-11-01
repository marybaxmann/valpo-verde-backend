import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO } from "../rules/engine/catalogs";
import {
  ArbolFichaRow,
  CAMPOS_MEDICION,
  VersionMedicionRow,
  listarVersionesMedicion,
  obtenerArbolFicha,
  obtenerRasgosEspecie,
} from "../../repositories/sivu/fichaArbol.repository";
import { obtenerPresencia } from "../../repositories/sivu/mantenimiento.repository";
import { diagnosticoDeArbol } from "./diagnostico.service";
import { listarIncidenciasDeArbol } from "./incidencia.service";
import { listarOtsDeArbol } from "./listadoOt.service";

/**
 * B2 — GET /api/sivu/projects/:id/trees/:treeId: ficha del árbol
 * (pendientes-backend.md: «medición vigente e historial, evaluación
 * vigente con componentes, infraestructura, OT e incidencias del árbol»).
 * Todos los miembros del proyecto y el Administrador (CC-064 a).
 *
 * Decisiones de la responsable (2026-10-31): el historial muestra solo
 * las versiones que fueron vigentes (el alta y las inspecciones
 * finalizadas de OT completadas, REGLAS_GENERALES fila 12); todas las OT
 * del árbol para todos los miembros; sin fotos (se piden aparte por
 * inspección). Presencia (D-28, D-29): agregada al resolverse AM-22
 * (2026-11-01, migración 031).
 */

type Valor = { codigo: string; etiqueta: string | null } | null;

function conEtiqueta(catalogo: string, codigo: string | null): Valor {
  if (codigo === null) return null;
  const entrada = CATALOGO.find((c) => c.catalogo === catalogo && c.codigo === codigo);
  return { codigo, etiqueta: entrada?.etiqueta ?? null };
}

const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Campos numéricos (numeric en la base: PostgREST puede devolverlos como texto). */
const NUMERICOS = new Set([
  "utm_este", "utm_norte", "dap_cm", "altura_total_m", "diametro_copa_ns_m", "diametro_copa_eo_m", "diametro_copa_m",
  "altura_primera_rama_m", "altura_base_copa_viva_m",
]);

function valorDeCampo(campo: string, v: unknown): unknown {
  if (NUMERICOS.has(campo)) return numero(v);
  if (campo === "dap_fustes_cm") return Array.isArray(v) ? v.map(Number) : null;
  if (campo === "clase_edad") return conEtiqueta("clase_edad", (v as string | null) ?? null);
  if (campo === "rango_edad_estimada_anios") return conEtiqueta("rango_edad_estimada_anios", (v as string | null) ?? null);
  return v ?? null;
}

function arbol(f: ArbolFichaRow) {
  const coordenadas = f.ubicacion?.coordinates;
  return {
    id: f.id,
    tree_code: f.tree_code,
    sector_id: f.sector_id,
    ubicacion: coordenadas ? { lng: coordenadas[0], lat: coordenadas[1] } : null,
    estado_ciclo_vida: conEtiqueta("estado_ciclo_vida", f.estado_ciclo_vida),
    fecha_registro: f.fecha_registro,
    // Valores vigentes de medición e identificación (D-7 a D-29).
    ...Object.fromEntries(CAMPOS_MEDICION.map((c) => [c, valorDeCampo(c, (f as unknown as Record<string, unknown>)[c])])),
  };
}

/**
 * Historial: el alta (sin inspección) y las inspecciones finalizadas de
 * OT completadas, de la más reciente a la más antigua. Cada versión trae
 * solo los campos que registró.
 */
function historial(versiones: VersionMedicionRow[], fechaRegistro: string) {
  return versiones
    .filter((v) => v.inspection_id === null || (v.inspections?.estado_registro === "finalizado" && v.inspections.work_orders?.estado_ot === "completada"))
    .map((v) => {
      const esAlta = v.inspection_id === null;
      const campos = esAlta
        ? CAMPOS_MEDICION.filter((c) => v[c] !== null && v[c] !== undefined)
        : (v.campos_registrados ?? []).filter((c): c is (typeof CAMPOS_MEDICION)[number] => (CAMPOS_MEDICION as readonly string[]).includes(c));
      return {
        origen: esAlta ? ("alta" as const) : ("inspeccion" as const),
        // Desde cuándo rigió: el alta, desde su registro; una inspección, desde que se completó su OT.
        vigente_desde: esAlta ? fechaRegistro : v.inspections?.work_orders?.fecha_completada_ot ?? null,
        inspection_id: v.inspection_id,
        codigo_inspeccion: v.inspections?.codigo_inspeccion ?? null,
        fecha_inspeccion: v.inspections?.fecha_inspeccion ?? null,
        valores: Object.fromEntries(campos.map((c) => [c, valorDeCampo(c, v[c])])),
      };
    })
    .sort((a, b) => (b.vigente_desde ?? "").localeCompare(a.vigente_desde ?? ""));
}

export async function obtenerFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  const fila = await obtenerArbolFicha(token, projectId, treeId);
  if (!fila) throw new AppError("El árbol no existe en este proyecto", 404);

  const [rasgos, versiones, diagnostico, ordenes, incidencias, presencia] = await Promise.all([
    obtenerRasgosEspecie(token, treeId),
    listarVersionesMedicion(token, treeId),
    diagnosticoDeArbol(token, projectId, treeId),
    listarOtsDeArbol(user, projectId, treeId, token),
    listarIncidenciasDeArbol(user, projectId, treeId, token),
    obtenerPresencia(token, treeId),
  ]);
  const sinEspecie = fila.especie_cientifica === null;

  return {
    arbol: arbol(fila),
    // D-28/D-29 (AM-22): Presente, Talado o Retirado, y desde cuándo.
    presencia: presencia
      ? { ...conEtiqueta("estado_presencia", presencia.estado_presencia)!, desde: presencia.fecha_cambio_estado_presencia }
      : null,
    // D-260 a D-262: sin especie vigente, origen «no determinado» y sin persistencia ni tipo de hoja.
    sobre_la_especie: {
      genero: rasgos?.genero ?? null,
      familia: rasgos?.familia ?? null,
      origen_biogeografico: conEtiqueta("origen_biogeografico", sinEspecie ? "no_determinado" : rasgos?.origen_biogeografico ?? "no_determinado"),
      persistencia_follaje: sinEspecie ? null : conEtiqueta("persistencia_follaje", rasgos?.persistencia_follaje ?? null),
      tipo_hoja: sinEspecie ? null : conEtiqueta("tipo_hoja", rasgos?.tipo_hoja ?? null),
    },
    evaluacion_vigente: diagnostico.vigente,
    ultima_inspeccion_finalizada: diagnostico.ultima_finalizada,
    historial: historial(versiones, fila.fecha_registro),
    ordenes_trabajo: ordenes,
    incidencias,
  };
}
