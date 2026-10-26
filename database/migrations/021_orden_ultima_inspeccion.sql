-- =====================================================================
-- Migración 021 — Un solo criterio de «la última» inspección en SIVU
-- (CC-055, decisión de la responsable 2026-10-25; REGLAS_GENERALES fila 13)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Separada de la 020 a pedido de la responsable, para revertir cada cosa
-- por separado. No depende de la 020 ni la 020 depende de esta: la vista
-- nueva de la 020 (`v_tree_fechas_vigentes`) ya ordena con el mismo
-- criterio.
--
-- Criterio único (CC-055): entre las inspecciones válidas de OT
-- Completadas, «la última» es la de `fecha_completada_ot` más reciente
-- (REGLAS_GENERALES fila 13: los valores nuevos rigen al completar la
-- OT); a igual `fecha_completada_ot`, la de `fecha_inspeccion` más
-- reciente; a igual `fecha_inspeccion`, la de `created_at` más reciente.
-- Hasta ahora `fn_refresh_tree_current` usaba solo la primera y la
-- tercera, y `v_tree_current_inputs` solo la primera (con un empate en
-- el mismo día, el resultado quedaba sin definir).
--
-- `created_at` es el de la fila que aporta el dato: `tree_data_versions`
-- en `fn_refresh_tree_current` (como ya era) e `inspections` en
-- `v_tree_current_inputs` (una `tree_data_versions` y una `evaluations`
-- por inspección).
--
-- Columnas NOT NULL en las tres claves (`fecha_completada_ot` lo exige
-- `chk_work_orders_completada_fecha` en una OT Completada;
-- `fecha_inspeccion` y `created_at`, NOT NULL desde la 001): DESC no
-- necesita NULLS LAST.
--
-- `v_upcoming_inspections` NO se toca (queda para el #63, AM-18).

-- ---------------------------------------------------------------------
-- 1. fn_refresh_tree_current — mismo cuerpo que la 018i; solo cambia el
--    ORDER BY de los 22 «la última» (21 columnas de `trees`, incluida
--    `species_id`, y `vigente_desde_inspection_id`) y la columna nueva del CTE.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_refresh_tree_current(p_tree_id UUID) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  WITH validas AS (
    SELECT tdv.*, wo.fecha_completada_ot AS ot_fecha_completada, i.fecha_inspeccion AS insp_fecha_inspeccion,
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
      THEN (SELECT v.sector FROM validas v WHERE 'sector' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.sector FROM alta a) END,
    ubicacion_descriptiva = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados))
      THEN (SELECT v.ubicacion_descriptiva FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.ubicacion_descriptiva FROM alta a) END,
    utm_este = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_este FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_este FROM alta a) END,
    utm_norte = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_norte FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_norte FROM alta a) END,
    especie_cientifica = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.especie_resuelta FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.especie_resuelta FROM alta a) END,
    species_id = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.species_id FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.species_id FROM alta a) END,
    nombre_comun = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados))
      THEN (SELECT v.nombre_comun FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.nombre_comun FROM alta a) END,
    multifustal = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados))
      THEN (SELECT v.multifustal FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.multifustal FROM alta a) END,
    numero_fustes = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados))
      THEN (SELECT v.numero_fustes FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.numero_fustes FROM alta a) END,
    dap_fustes_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_fustes_cm FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_fustes_cm FROM alta a) END,
    dap_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_cm FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_cm FROM alta a) END,
    altura_total_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_total_m FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_total_m FROM alta a) END,
    diametro_copa_ns_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_ns_m FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_ns_m FROM alta a) END,
    diametro_copa_eo_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_eo_m FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_eo_m FROM alta a) END,
    copa_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.copa_no_presenta FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.copa_no_presenta FROM alta a) END,
    altura_primera_rama_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_m FROM alta a) END,
    altura_primera_rama_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_no_presenta FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_no_presenta FROM alta a) END,
    altura_base_copa_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_m FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_m FROM alta a) END,
    altura_base_copa_viva_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_no_presenta FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    clase_edad = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados))
      THEN (SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.clase_edad FROM alta a) END,
    rango_edad_estimada_anios = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados))
      THEN (SELECT v.rango_edad_estimada_anios FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.rango_edad_estimada_anios FROM alta a) END,
    vigente_desde_inspection_id = (SELECT v.inspection_id FROM validas v ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.created_at DESC LIMIT 1)
  WHERE t.id = p_tree_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. v_tree_current_inputs — mismo cuerpo que la 016; solo cambia el
--    ORDER BY del ROW_NUMBER. Mismas columnas de salida (CREATE OR
--    REPLACE VIEW lo exige); security_invoker se repite explícito.
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW v_tree_current_inputs WITH (security_invoker = true) AS
WITH validas AS (
  SELECT
    e.tree_id,
    e.inspection_id,
    wo.fecha_completada_ot,
    i.fecha_inspeccion,
    i.created_at,
    kv.key,
    kv.value
  FROM evaluations e
  JOIN inspections i ON i.id = e.inspection_id
  JOIN work_orders wo ON wo.id = i.work_order_id
  CROSS JOIN LATERAL jsonb_each(e.variables) AS kv(key, value)
  WHERE i.estado_registro <> 'anulado'
    AND wo.estado_ot = 'completada'
),
ranked AS (
  SELECT
    tree_id, key, value, inspection_id,
    ROW_NUMBER() OVER (PARTITION BY tree_id, key ORDER BY fecha_completada_ot DESC, fecha_inspeccion DESC, created_at DESC) AS rn
  FROM validas
)
SELECT
  tree_id,
  jsonb_object_agg(key, value) AS entradas_vigentes,
  jsonb_object_agg(key, to_jsonb(inspection_id)) AS origen_por_campo
FROM ranked
WHERE rn = 1
GROUP BY tree_id;
