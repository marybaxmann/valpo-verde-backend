BEGIN;

ALTER TABLE public.inspections
  ADD COLUMN alcance_inspeccion text,
  ADD CONSTRAINT inspections_alcance_if25 CHECK (
    alcance_inspeccion IS NULL OR (
      tipo_inspeccion_realizada IS NOT NULL
      AND tipo_inspeccion_realizada IN ('evaluacion_inicial', 'reevaluacion')
      AND alcance_inspeccion IN ('arbol', 'infraestructura', 'ambos')
    )
  );

CREATE FUNCTION public.fn_save_inspection_draft_if25(
  p_inspection_id uuid,
  p_work_order_id uuid,
  p_tree_id uuid,
  p_inspector uuid,
  p_fecha_inspeccion date,
  p_fecha_registro date,
  p_rule_version text,
  p_tipo_inspeccion_realizada text,
  p_subtipo_inspeccion text,
  p_metodo_instrumental text,
  p_resultado_general text,
  p_requiere_mantenimiento boolean,
  p_observaciones text,
  p_registrado_por uuid,
  p_variables jsonb,
  p_campos_arbol jsonb,
  p_campos_registrados_arbol text[],
  p_nuevo_arbol_sector text,
  p_nuevo_arbol_ubicacion_descriptiva text,
  p_nuevo_arbol_utm_este numeric,
  p_nuevo_arbol_utm_norte numeric,
  p_nuevo_arbol_especie_cientifica text,
  p_nuevo_arbol_nombre_comun text,
  p_alcance_inspeccion text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  borrador jsonb;
BEGIN
  borrador := public.fn_save_inspection_draft(
    p_inspection_id,
    p_work_order_id,
    p_tree_id,
    p_inspector,
    p_fecha_inspeccion,
    p_fecha_registro,
    p_rule_version,
    p_tipo_inspeccion_realizada,
    p_subtipo_inspeccion,
    p_metodo_instrumental,
    p_resultado_general,
    p_requiere_mantenimiento,
    p_observaciones,
    p_registrado_por,
    p_variables,
    p_campos_arbol,
    p_campos_registrados_arbol,
    p_nuevo_arbol_sector,
    p_nuevo_arbol_ubicacion_descriptiva,
    p_nuevo_arbol_utm_este,
    p_nuevo_arbol_utm_norte,
    p_nuevo_arbol_especie_cientifica,
    p_nuevo_arbol_nombre_comun
  );
  UPDATE public.inspections SET alcance_inspeccion = p_alcance_inspeccion
  WHERE id = (borrador->>'inspection_id')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'IF-25: no se pudo guardar el alcance del borrador';
  END IF;
  RETURN borrador;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_save_inspection_draft_if25(uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[], text, text, numeric, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_inspection_draft_if25(uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[], text, text, numeric, numeric, text, text, text) TO service_role;

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
    AND i.alcance_inspeccion IS DISTINCT FROM 'infraestructura'
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

COMMIT;
