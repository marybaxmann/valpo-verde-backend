import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { fechaEnChile } from "../../utils/fechaChile";
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
import { areaCopaArbol } from "../rules/indicadores/inventario";
import { arbolesConEvaluacionCompletaVigente } from "./habilitacionBiometrica";
import { calcularCarbonoArbol, METODO_CARBONO } from "../rules/carbono/calculo";
import { calcularCarbonoAereoTotalArbol, METODO_CARBONO_AEREO_TOTAL } from "../rules/carbono/carbonoAereoTotal";
import { descriptivosArbol } from "../rules/indicadores/descriptivos";
import { calcularVariacionAereoTotalArbol, METODO_VARIACION_AEREO_TOTAL } from "../rules/carbono/variacionAereoTotal";
import { LIMITACIONES, LIMITACIONES_AEREO_TOTAL } from "../rules/carbono/modelos";
import { calcularSecuestroArbol, METODO_SECUESTRO } from "../rules/carbono/secuestro";
import { listarVariablesCrecimiento } from "../../repositories/sivu/indicadores.repository";

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
  "altura_primera_rama_m", "altura_base_copa_viva_m", "altura_punta_viva_m",
]);

function valorDeCampo(campo: string, v: unknown): unknown {
  if (NUMERICOS.has(campo)) return numero(v);
  if (campo === "dap_fustes_cm") return Array.isArray(v) ? v.map(Number) : null;
  if (campo === "clase_edad") return conEtiqueta("clase_edad", (v as string | null) ?? null);
  if (campo === "rango_edad_estimada_anios") return conEtiqueta("rango_edad_estimada_anios", (v as string | null) ?? null);
  return v ?? null;
}

function arbol(f: ArbolFichaRow, evaluacionCompletaVigente: boolean) {
  const coordenadas = f.ubicacion?.coordinates;
  const ns = numero(f.diametro_copa_ns_m);
  const eo = numero(f.diametro_copa_eo_m);
  return {
    id: f.id,
    tree_code: f.tree_code,
    sector_id: f.sector_id,
    ubicacion: coordenadas ? { lng: coordenadas[0], lat: coordenadas[1] } : null,
    estado_ciclo_vida: conEtiqueta("estado_ciclo_vida", f.estado_ciclo_vida),
    fecha_registro: f.fecha_registro,
    // Valores vigentes de medición e identificación (D-7 a D-29).
    ...Object.fromEntries(CAMPOS_MEDICION.map((c) => [c, valorDeCampo(c, (f as unknown as Record<string, unknown>)[c])])),
    // INDICES fila 13 (CC-016): área proyectada de copa del árbol, en m². «No presenta copa» = 0; sin medición, null.
    // Solo con evaluación completa válida y vigente (universo biométrico, Valej 2026-11-02); si no, null.
    area_proyectada_copa_m2: evaluacionCompletaVigente ? areaCopaArbol(ns, eo, f.copa_no_presenta) : null,
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
      // 039: una versión sin inspección es el alta o una corrección autorizada de ubicación.
      const esCorreccion = v.origen === "correccion_ubicacion";
      const esAlta = v.inspection_id === null && !esCorreccion;
      const campos = esAlta
        ? CAMPOS_MEDICION.filter((c) => v[c] !== null && v[c] !== undefined)
        : (v.campos_registrados ?? []).filter((c): c is (typeof CAMPOS_MEDICION)[number] => (CAMPOS_MEDICION as readonly string[]).includes(c));
      return {
        origen: esCorreccion ? ("correccion_ubicacion" as const) : esAlta ? ("alta" as const) : ("inspeccion" as const),
        // Desde cuándo rigió: el alta, desde su registro; una inspección, desde que se completó su OT;
        // una corrección, desde que se registró (fecha en Chile, igual que la usa fn_refresh_tree_current).
        vigente_desde: esCorreccion
          ? fechaEnChile(v.created_at)
          : esAlta
            ? fechaRegistro
            : v.inspections?.work_orders?.fecha_completada_ot ?? null,
        inspection_id: v.inspection_id,
        codigo_inspeccion: v.inspections?.codigo_inspeccion ?? null,
        fecha_inspeccion: v.inspections?.fecha_inspeccion ?? null,
        ...(esCorreccion ? { motivo: v.motivo } : {}),
        valores: Object.fromEntries(campos.map((c) => [c, valorDeCampo(c, v[c])])),
      };
    })
    .sort((a, b) => (b.vigente_desde ?? "").localeCompare(a.vigente_desde ?? ""));
}

export async function obtenerFichaArbol(user: AuthenticatedUser, projectId: string, treeId: string, token: string) {
  await assertProjectAccess(user, projectId, token);
  const fila = await obtenerArbolFicha(token, projectId, treeId);
  if (!fila) throw new AppError("El árbol no existe en este proyecto", 404);

  const [rasgos, versiones, diagnostico, ordenes, incidencias, presencia, evaluados, crecimiento] = await Promise.all([
    obtenerRasgosEspecie(token, treeId),
    listarVersionesMedicion(token, treeId),
    diagnosticoDeArbol(token, projectId, treeId),
    listarOtsDeArbol(user, projectId, treeId, token),
    listarIncidenciasDeArbol(user, projectId, treeId, token),
    obtenerPresencia(token, treeId),
    arbolesConEvaluacionCompletaVigente(token, projectId, [treeId]),
    listarVariablesCrecimiento(token, [treeId]),
  ]);
  const evaluacionCompletaVigente = evaluados.has(treeId);
  const entradaCarbono = {
    id: treeId,
    presente: presencia?.estado_presencia === "presente",
    evaluacion_completa_vigente: evaluacionCompletaVigente,
    especie_cientifica: fila.especie_cientifica,
    tipo_hoja: rasgos?.tipo_hoja ?? null,
    multifustal: fila.multifustal ?? null,
    dap_fustes_cm: Array.isArray(fila.dap_fustes_cm) ? (fila.dap_fustes_cm as unknown[]).map(Number).filter((x) => Number.isFinite(x)) : null,
    dap_cm: numero(fila.dap_cm),
    altura_total_m: numero(fila.altura_total_m),
  };
  const carbono = calcularCarbonoArbol(entradaCarbono);
  const entradaSecuestro = {
    ...entradaCarbono,
    cle: crecimiento[0]?.cle ?? null,
    muerte_regresiva_pct: crecimiento[0]?.muerte_regresiva_pct ?? null,
    poda_intensa: crecimiento[0]?.poda_intensa ?? null,
    tree_code: (fila.tree_code as string | null | undefined) ?? null,
  };
  const secuestro = calcularSecuestroArbol(entradaSecuestro);
  const sinEspecie = fila.especie_cientifica === null;

  return {
    arbol: arbol(fila, evaluacionCompletaVigente),
    // Universo biométrico de B19: evaluación completa (inicial, reevaluación o levantamiento) finalizada,
    // con OT completada, no anulada y vigente. false = árbol sin evaluación válida (no «sin medición»).
    evaluacion_completa_vigente: evaluacionCompletaVigente,
    // CC-069 v1 (pendiente de sincronización con el Excel): valor (biomasa, carbono y CO₂e por separado, con el modelo)
    // o null con categoría, motivo y detalle.
    estimacion_carbono_aereo_lenoso: { ...carbono, metodo: METODO_CARBONO, limitaciones: [...LIMITACIONES] },
    // Carbono aéreo total con follaje (carbono directo, 2026-11-21): otro componente, exploratorio; no se suma
    // con el leñoso ni alimenta el secuestro anual.
    estimacion_carbono_aereo_total: { ...calcularCarbonoAereoTotalArbol(entradaCarbono), metodo: METODO_CARBONO_AEREO_TOTAL, limitaciones: [...LIMITACIONES_AEREO_TOTAL] },
    // Secuestro anual (decisiones A a C, 2026-11-20): estimación fundamentada, simulación exploratoria (rango
    // con las tres categorías de i-Tree Eco) o no estimable con su motivo.
    secuestro_anual: { ...secuestro, metodo: METODO_SECUESTRO },
    // Propuesta experimental (2026-11-21): variación anual proyectada del carbono aéreo total (con hojas), solo
    // para especies con carbono directo. Siempre simulación; no es secuestro leñoso ni captura fotosintética.
    variacion_anual_carbono_aereo_total: { ...calcularVariacionAereoTotalArbol(entradaSecuestro), metodo: METODO_VARIACION_AEREO_TOTAL },
    // Propuesta experimental: valores descriptivos del árbol (diferencias y cocientes de medidas registradas) y condición de copa registrada.
    descriptivos: descriptivosArbol({
      id: treeId,
      tree_code: (fila.tree_code as string | null | undefined) ?? null,
      sector: (fila.sector as string | null | undefined) ?? null,
      presente: entradaCarbono.presente,
      evaluacion_completa_vigente: evaluacionCompletaVigente,
      especie_cientifica: entradaCarbono.especie_cientifica,
      especie_en_catalogo: !sinEspecie,
      genero: rasgos?.genero ?? null,
      familia: rasgos?.familia ?? null,
      origen_biogeografico: rasgos?.origen_biogeografico ?? null,
      multifustal: entradaCarbono.multifustal,
      dap_fustes_cm: entradaCarbono.dap_fustes_cm,
      dap_cm: entradaCarbono.dap_cm,
      altura_total_m: entradaCarbono.altura_total_m,
      diametro_copa_m: numero(fila.diametro_copa_m),
      altura_primera_rama_m: numero(fila.altura_primera_rama_m),
      altura_base_copa_viva_m: numero(fila.altura_base_copa_viva_m),
      clase_edad: null,
      cle: crecimiento[0]?.cle ?? null,
      muerte_regresiva_pct: crecimiento[0]?.muerte_regresiva_pct ?? null,
      defoliacion_pct: crecimiento[0]?.defoliacion_pct ?? null,
      clorosis_pct: crecimiento[0]?.clorosis_pct ?? null,
      necrosis_pct: crecimiento[0]?.necrosis_pct ?? null,
      copa_faltante_pct: crecimiento[0]?.copa_faltante_pct ?? null,
      vitalidad: conEtiqueta("clasificacion_vitalidad", crecimiento[0]?.vitalidad ?? null),
    }),
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
