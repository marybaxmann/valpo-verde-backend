import { AuthenticatedUser } from "../../types/auth";
import { AppError } from "../../utils/AppError";
import { assertProjectAccess } from "../authorization.service";
import { obtenerOrdenTrabajoPorId } from "../../repositories/sivu/workOrder.repository";
import {
  listarInspeccionesDeOt,
  obtenerVariablesBorrador,
  obtenerVersionArbolDeInspeccion,
} from "../../repositories/sivu/inspection.repository";

/**
 * B17 — GET /api/sivu/work-orders/:workOrderId/inspections: las
 * inspecciones de la OT, en orden de creación, cada una con lo que se
 * guardó (`variables` de REGISTRO_EVALUACION y los `campos_arbol`
 * registrados), para retomar un borrador o consultar uno finalizado.
 * Cualquier miembro del proyecto (CC-064 a). `campos_arbol` trae solo
 * los campos registrados en esa inspección: una clave ausente es "no
 * registrado todavía" (018e).
 */
export async function listarInspeccionesDeOrdenTrabajo(user: AuthenticatedUser, workOrderId: string, accessToken: string) {
  const ot = await obtenerOrdenTrabajoPorId(workOrderId);
  if (!ot) throw new AppError("La orden de trabajo no existe", 404);
  await assertProjectAccess(user, ot.project_id, accessToken);

  const inspecciones = await listarInspeccionesDeOt(accessToken, workOrderId);
  return Promise.all(
    inspecciones.map(async (i) => {
      const [variables, version] = await Promise.all([
        obtenerVariablesBorrador(accessToken, i.id),
        obtenerVersionArbolDeInspeccion(accessToken, i.id),
      ]);
      const camposArbol: Record<string, unknown> = {};
      for (const campo of version?.camposRegistrados ?? []) camposArbol[campo] = version!.campos[campo] ?? null;
      return {
        inspection_id: i.id,
        codigo_inspeccion: i.codigo_inspeccion,
        tree_id: i.tree_id,
        estado_registro: i.estado_registro,
        tipo_inspeccion_realizada: i.tipo_inspeccion_realizada,
        subtipo_inspeccion: i.subtipo_inspeccion,
        metodo_instrumental: i.metodo_instrumental,
        fecha_inspeccion: i.fecha_inspeccion,
        observaciones: i.observaciones,
        inspector: i.inspector,
        finalizada_at: i.finalizada_at,
        motivo_anulacion: i.motivo_anulacion,
        fecha_anulacion: i.fecha_anulacion,
        variables: variables ?? {},
        campos_arbol: camposArbol,
      };
    })
  );
}
