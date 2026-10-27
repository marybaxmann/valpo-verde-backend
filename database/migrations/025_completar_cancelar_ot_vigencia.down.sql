-- =====================================================================
-- Reversión de 025_completar_cancelar_ot_vigencia.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_reassign_work_order(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.fn_cancel_work_order(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.fn_complete_work_order_inspeccion(UUID, UUID, DATE);

-- Restaura v_tree_current_inputs de la migración 021 (<> 'anulado')
CREATE OR REPLACE VIEW public.v_tree_current_inputs
WITH (security_invoker = true)
AS
WITH ranked AS (
  SELECT
    i.tree_id,
    kv.key,
    kv.value,
    i.id AS inspection_id,
    ROW_NUMBER() OVER (
      PARTITION BY i.tree_id, kv.key
      ORDER BY wo.fecha_completada_ot DESC, i.fecha_inspeccion DESC, i.created_at DESC
    ) AS rnk
  FROM evaluations e
  JOIN inspections i ON i.id = e.inspection_id
  JOIN work_orders wo ON wo.id = i.work_order_id
  CROSS JOIN LATERAL jsonb_each(e.variables) AS kv(key, value)
  WHERE i.estado_registro <> 'anulado'
    AND wo.estado_ot = 'completada'
)
SELECT
  tree_id,
  jsonb_object_agg(key, value) AS variables
FROM ranked
WHERE rnk = 1
GROUP BY tree_id;

GRANT SELECT ON public.v_tree_current_inputs TO authenticated;

-- Restaura fn_refresh_tree_current de la migración 021 (<> 'anulado')
CREATE OR REPLACE FUNCTION public.fn_refresh_tree_current(p_tree_id UUID) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  WITH validas AS (
    SELECT tdv.*, wo.fecha_completada_ot AS ot_fecha_completada, i.fecha_inspeccion AS insp_fecha_inspeccion,
           i.created_at AS insp_created_at,
           COALESCE(s.especie_cientifica, tdv.especie_cientifica) AS especie_resuelta
    FROM tree_data_versions tdv
    JOIN inspections i ON i.id = tdv.inspection_id
    JOIN work_orders wo ON wo.id = i.work_order_id
    LEFT JOIN species s ON s.id = tdv.species_id
    WHERE tdv.tree_id = p_tree_id
      AND i.estado_registro <> 'anulado'
      AND wo.estado_ot = 'completada'
  ),
  alta AS (
    SELECT tdv.*, COALESCE(s.especie_cientifica, tdv.especie_cientifica) AS especie_resuelta
    FROM tree_data_versions tdv
    LEFT JOIN species s ON s.id = tdv.species_id
    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL
  )
  UPDATE trees t SET
    sector = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'sector' = ANY(v.campos_registrados))
      THEN (SELECT v.sector FROM validas v WHERE 'sector' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.sector FROM alta a) END,
    ubicacion_descriptiva = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados))
      THEN (SELECT v.ubicacion_descriptiva FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.ubicacion_descriptiva FROM alta a) END,
    utm_este = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_este FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_este FROM alta a) END,
    utm_norte = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_norte FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_norte FROM alta a) END,
    especie_cientifica = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.especie_resuelta FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.especie_resuelta FROM alta a) END,
    species_id = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.species_id FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.species_id FROM alta a) END,
    nombre_comun = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados))
      THEN (SELECT v.nombre_comun FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.nombre_comun FROM alta a) END,
    multifustal = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados))
      THEN (SELECT v.multifustal FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.multifustal FROM alta a) END,
    numero_fustes = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados))
      THEN (SELECT v.numero_fustes FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.numero_fustes FROM alta a) END,
    dap_fustes_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_fustes_cm FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_fustes_cm FROM alta a) END,
    dap_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_cm FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_cm FROM alta a) END,
    altura_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_m FROM validas v WHERE 'altura_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_m FROM alta a) END,
    diametro_copa_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_m FROM validas v WHERE 'diametro_copa_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_m FROM alta a) END,
    altura_primera_rama_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_m FROM alta a) END,
    forma_copa = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'forma_copa' = ANY(v.campos_registrados))
      THEN (SELECT v.forma_copa FROM validas v WHERE 'forma_copa' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.forma_copa FROM alta a) END,
    densidad_follaje = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'densidad_follaje' = ANY(v.campos_registrados))
      THEN (SELECT v.densidad_follaje FROM validas v WHERE 'densidad_follaje' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.densidad_follaje FROM alta a) END,
    clase_edad = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados))
      THEN (SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.clase_edad FROM alta a) END,
    fase_desarrollo = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'fase_desarrollo' = ANY(v.campos_registrados))
      THEN (SELECT v.fase_desarrollo FROM validas v WHERE 'fase_desarrollo' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.fase_desarrollo FROM alta a) END,
    estado_fitosanitario = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'estado_fitosanitario' = ANY(v.campos_registrados))
      THEN (SELECT v.estado_fitosanitario FROM validas v WHERE 'estado_fitosanitario' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.estado_fitosanitario FROM alta a) END,
    sector_id = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'sector_id' = ANY(v.campos_registrados))
      THEN (SELECT v.sector_id FROM validas v WHERE 'sector_id' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.sector_id FROM alta a) END,
    vigente_desde_inspection_id = (
      SELECT v.inspection_id FROM validas v
      ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC
      LIMIT 1
    ),
    updated_at = now()
  WHERE t.id = p_tree_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_refresh_tree_current(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_refresh_tree_current(UUID) TO service_role;

-- Restaura fn_check_ot_completada de la versión previa
CREATE OR REPLACE FUNCTION public.fn_check_ot_completada() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado_ot = 'completada' AND EXISTS (
    SELECT 1 FROM public.inspections WHERE work_order_id = NEW.id AND estado_registro = 'preguardado'
  ) THEN
    RAISE EXCEPTION 'La OT % tiene inspecciones en preguardado: no puede completarse', NEW.codigo_ot;
  END IF;
  RETURN NEW;
END;
$$;

-- Restaura work_orders
ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS chk_work_orders_cancelada;

ALTER TABLE public.work_orders
  DROP COLUMN IF EXISTS fecha_cancelacion,
  DROP COLUMN IF EXISTS cancelado_por,
  DROP COLUMN IF EXISTS motivo_cancelacion;
