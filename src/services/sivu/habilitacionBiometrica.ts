import { TIPOS_EVALUACION_COMPLETA } from "./completitud";
import { listarArbolesConInspeccionValida } from "../../repositories/sivu/evaluacionValida.repository";
import { EvaluacionVigenteRow, listarEvaluacionesVigentes } from "../../repositories/sivu/diagnostico.repository";

/**
 * Universo biométrico de B19 (decisión de Valej, 2026-11-02; CC-016):
 * árboles con una evaluación COMPLETA (evaluación inicial, reevaluación o
 * levantamiento; CC-056) finalizada, aprobada (OT completada), no anulada
 * y vigente. No es una segunda validación: reutiliza
 * - el filtro de inspección válida de fn_refresh_tree_current, que es el
 *   que compone los valores vigentes (DAP, copa) del árbol, y
 * - la evaluación vigente del árbol (tree_assessments, CC-050), la misma
 *   de B18 y de la ficha.
 * La presencia (D-28) la filtra quien llama.
 */
export async function arbolesConEvaluacionCompletaVigente(
  token: string,
  projectId: string,
  treeIds: string[],
  /** Evaluaciones vigentes ya leídas por quien llama (evita leerlas dos veces). */
  vigentesLeidas?: EvaluacionVigenteRow[]
): Promise<Set<string>> {
  if (treeIds.length === 0) return new Set();
  const [conCompletaValida, vigentes] = await Promise.all([
    listarArbolesConInspeccionValida(token, treeIds, [...TIPOS_EVALUACION_COMPLETA]),
    vigentesLeidas
      ? Promise.resolve(vigentesLeidas)
      : treeIds.length === 1
        ? listarEvaluacionesVigentes(token, projectId, treeIds[0])
        : listarEvaluacionesVigentes(token, projectId),
  ]);
  const conVigente = new Set(vigentes.map((v) => v.tree_id));
  return new Set(treeIds.filter((id) => conCompletaValida.has(id) && conVigente.has(id)));
}
