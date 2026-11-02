import { AuthenticatedUser } from "../../types/auth";
import { assertProjectAccess } from "../authorization.service";
import { CATALOGO, entradasVigentesDe, etiquetaDe } from "../rules/engine/catalogs";
import { listarArbolesInfraestructura } from "../../repositories/sivu/infraestructura.repository";
import { listarPresencia } from "../../repositories/sivu/indicadores.repository";
import { EvaluacionVigenteRow, listarEvaluacionesVigentes } from "../../repositories/sivu/diagnostico.repository";
import { arbolesConEvaluacionCompletaVigente } from "./habilitacionBiometrica";
import { resultadoConEtiquetas } from "./diagnostico.service";

/**
 * B8 — GET /api/sivu/projects/:id/infraestructura (módulo Infraestructura,
 * CC-059/CC-060). Solo lectura: no calcula nada. Representa lo que ya
 * calculó el motor (M04: componentes IN-* de REGLAS_INDICADORES, puntaje,
 * porcentaje y clasificación D-170; prioridad M05) y quedó en la
 * evaluación vigente del árbol (tree_assessments, CC-050), con el ajuste
 * del Inspector si existe (CC-044).
 *
 * Universo: árboles presentes (D-28) con evaluación completa válida y
 * vigente (el mismo de los biométricos de B19). Los demás se informan en
 * la cobertura, no como «sin afectación».
 */

const COMPONENTES = entradasVigentesDe("componente_infraestructura").map((c) => c.codigo);

/** Clave de cada componente en `tree_assessments.indicadores` (salida de M04, ensamblaje.ts). */
const CLAVE_MOTOR: Record<string, string> = {
  vereda: "vereda",
  calzada: "calzada",
  alcorque: "alcorque",
  infraestructura_vertical: "infraestructuraVertical",
  red_aerea: "redAerea",
  red_subterranea: "redSubterranea",
};

type IndicadorInfra = { categoria?: string | null; puntaje?: number | null; reglaId?: string | null; motivo?: string };

export interface FiltrosInfraestructura {
  barrio?: string;
  clasificacion?: string;
  componente?: string;
  categoria?: string;
}

function componentes(indicadores: Record<string, unknown> | null) {
  return COMPONENTES.map((codigo) => {
    const ind = (indicadores?.[CLAVE_MOTOR[codigo]] ?? null) as IndicadorInfra | null;
    const categoria = ind?.categoria ?? null;
    return {
      componente: { codigo, etiqueta: etiquetaDe("componente_infraestructura", codigo) },
      // Si el motor guardó un código fuera del catálogo, se entrega sin etiqueta en vez de fallar.
      categoria:
        categoria === null
          ? null
          : { codigo: categoria, etiqueta: CATALOGO.find((c) => c.catalogo === "categoria_infraestructura" && c.codigo === categoria)?.etiqueta ?? null },
      puntaje: ind?.puntaje ?? null,
      regla_id: ind?.reglaId ?? null,
      motivo: ind?.motivo ?? null,
    };
  });
}

export async function infraestructuraProyecto(user: AuthenticatedUser, projectId: string, filtros: FiltrosInfraestructura, token: string) {
  await assertProjectAccess(user, projectId, token);
  const fechaConsulta = new Date().toISOString();

  const arboles = await listarArbolesInfraestructura(token, projectId);
  const barrios = [...new Set(arboles.map((a) => a.sector?.trim()).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "es"));
  const delAmbito = filtros.barrio === undefined ? arboles : arboles.filter((a) => a.sector?.trim() === filtros.barrio);
  const ids = delAmbito.map((a) => a.id);

  const [presencias, vigentes] = await Promise.all([listarPresencia(token, ids), listarEvaluacionesVigentes(token, projectId)]);
  const presentes = new Set(presencias.filter((p) => p.estado_presencia === "presente").map((p) => p.tree_id));
  const evaluados = await arbolesConEvaluacionCompletaVigente(token, projectId, [...presentes], vigentes);

  // La primera de cada árbol es su evaluación vigente (listarEvaluacionesVigentes ordena por fecha desc).
  const vigentePorArbol = new Map<string, EvaluacionVigenteRow>();
  for (const v of vigentes) if (!vigentePorArbol.has(v.tree_id)) vigentePorArbol.set(v.tree_id, v);

  const filas = delAmbito
    .filter((a) => evaluados.has(a.id) && vigentePorArbol.has(a.id))
    .map((a) => {
      const vig = vigentePorArbol.get(a.id)!;
      const resultado = resultadoConEtiquetas(vig);
      const coords = a.ubicacion?.coordinates;
      return {
        arbol: {
          id: a.id,
          tree_code: a.tree_code,
          especie_cientifica: a.especie_cientifica,
          nombre_comun: a.nombre_comun,
          sector: a.sector,
          ubicacion: coords ? { lng: coords[0], lat: coords[1] } : null,
        },
        infraestructura: resultado.infraestructura,
        prioridad: resultado.prioridad,
        prioridad_ajustada: resultado.prioridad_ajustada,
        componentes: componentes(vig.indicadores as Record<string, unknown> | null),
        evaluacion_vigente: { evento: vig.evento, work_order_id: vig.work_order_id, desde: vig.created_at, rule_version: vig.rule_version },
      };
    });

  // Resumen sobre todos los evaluados del ámbito (antes de los filtros de clasificación y componente).
  const porClasificacion = entradasVigentesDe("clasificacion_infraestructura").map((c) => ({
    codigo: c.codigo,
    etiqueta: c.etiqueta,
    arboles: filas.filter((f) => f.infraestructura.clasificacion?.codigo === c.codigo).length,
  }));
  const porComponente = COMPONENTES.map((codigo) => ({
    componente: { codigo, etiqueta: etiquetaDe("componente_infraestructura", codigo) },
    categorias: entradasVigentesDe("categoria_infraestructura").map((c) => ({
      codigo: c.codigo,
      etiqueta: c.etiqueta,
      arboles: filas.filter((f) => f.componentes.find((x) => x.componente.codigo === codigo)?.categoria?.codigo === c.codigo).length,
    })),
    sin_dato: filas.filter((f) => f.componentes.find((x) => x.componente.codigo === codigo)?.categoria === null).length,
  }));

  const listadas = filas.filter(
    (f) =>
      (filtros.clasificacion === undefined || f.infraestructura.clasificacion?.codigo === filtros.clasificacion) &&
      (filtros.componente === undefined ||
        filtros.categoria === undefined ||
        f.componentes.find((x) => x.componente.codigo === filtros.componente)?.categoria?.codigo === filtros.categoria)
  );

  return {
    fecha_consulta: fechaConsulta,
    ambito: { tipo: filtros.barrio === undefined ? ("proyecto" as const) : ("barrio" as const), barrio: filtros.barrio ?? null },
    barrios,
    cobertura: {
      arboles_presentes: presentes.size,
      arboles_con_evaluacion_valida: filas.length,
      arboles_sin_evaluacion_valida: presentes.size - filas.length,
    },
    resumen: { por_clasificacion: porClasificacion, por_componente: porComponente },
    filtros: { clasificacion: filtros.clasificacion ?? null, componente: filtros.componente ?? null, categoria: filtros.categoria ?? null },
    total_listados: listadas.length,
    arboles: listadas,
  };
}
