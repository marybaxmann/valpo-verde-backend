BEGIN;
DROP FUNCTION public.fn_save_inspection_draft_if25(uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[], text, text, numeric, numeric, text, text, text);
CREATE OR REPLACE VIEW public.v_tree_fechas_vigentes WITH (security_invoker = true) AS
WITH candidatas AS (
  SELECT
    i.tree_id,
    i.id AS inspection_id,
    wo.fecha_completada_ot,
    i.fecha_inspeccion,
    i.created_at,
    COALESCE(i.fecha_proxima_inspeccion, i.fecha_proxima_inspeccion_sugerida) AS fecha_proxima_inspeccion,
    COALESCE(i.fecha_proximo_monitoreo, i.fecha_proximo_monitoreo_sugerida) AS fecha_proximo_monitoreo
  FROM inspections i
  JOIN work_orders wo ON wo.id = i.work_order_id
  WHERE i.estado_registro = 'finalizado'
    AND wo.estado_ot = 'completada'
),
ultima_inspeccion AS (
  SELECT DISTINCT ON (tree_id) tree_id, inspection_id, fecha_proxima_inspeccion
  FROM candidatas
  WHERE fecha_proxima_inspeccion IS NOT NULL
  ORDER BY tree_id, fecha_completada_ot DESC, fecha_inspeccion DESC, created_at DESC
),
ultimo_monitoreo AS (
  SELECT DISTINCT ON (tree_id) tree_id, inspection_id, fecha_proximo_monitoreo
  FROM candidatas
  WHERE fecha_proximo_monitoreo IS NOT NULL
  ORDER BY tree_id, fecha_completada_ot DESC, fecha_inspeccion DESC, created_at DESC
)
SELECT
  tree_id,
  ui.fecha_proxima_inspeccion,
  ui.inspection_id AS origen_fecha_proxima_inspeccion,
  um.fecha_proximo_monitoreo,
  um.inspection_id AS origen_fecha_proximo_monitoreo
FROM ultima_inspeccion ui
FULL JOIN ultimo_monitoreo um USING (tree_id);

ALTER TABLE public.inspections DROP COLUMN alcance_inspeccion;
COMMIT;
