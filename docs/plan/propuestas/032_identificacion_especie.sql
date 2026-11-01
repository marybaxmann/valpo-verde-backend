-- =====================================================================
-- Migración 032 — Identificación de la especie: provisional o confirmada
-- (PROPUESTA; NO APLICADA. Requiere autorización de Valej y un CC con el
-- campo nuevo en DICCIONARIO_CAMPOS.)
-- =====================================================================
--
-- Decisión de Valej (2026-11-01): distinguir por ejemplar si la
-- identificación científica es provisional (p. ej. un nombre común
-- ambiguo del Informe Técnico Experto Final, Riquelme 2026) o confirmada
-- (en terreno). No se cambian ni sustituyen las identificaciones actuales.
--
-- Diseño:
-- 1. tree_data_versions.estado_identificacion_especie: se versiona junto
--    con especie_cientifica, igual que species_id (018i). Cada inspección
--    conserva cómo estaba identificada la especie en ese momento (D-26,
--    historial). Distinto de species_id: species_id = vinculado al
--    catálogo; este campo = qué tan segura es la identificación.
-- 2. trees.estado_identificacion_especie: valor vigente, que compone
--    fn_refresh_tree_current con el mismo criterio que species_id (la
--    versión válida más reciente que registró especie_cientifica; si no
--    hay, el alta).
-- 3. Sin relleno: las filas existentes quedan NULL = «sin dato» (no se
--    asume confirmada ni provisional).
-- 4. Sin cambios de RLS ni GRANT: las columnas heredan las políticas.
--
-- Fuera de esta migración (requieren decisión o CC): cómo se registra el
-- valor (alta municipal, formulario de inspección, carga del informe).

BEGIN;

ALTER TABLE public.tree_data_versions
  ADD COLUMN estado_identificacion_especie TEXT
    CHECK (estado_identificacion_especie IS NULL OR estado_identificacion_especie IN ('confirmada', 'provisional')),
  ADD CONSTRAINT chk_tdv_identificacion_con_especie
    CHECK (estado_identificacion_especie IS NULL OR especie_cientifica IS NOT NULL OR species_id IS NOT NULL);

ALTER TABLE public.trees
  ADD COLUMN estado_identificacion_especie TEXT
    CHECK (estado_identificacion_especie IS NULL OR estado_identificacion_especie IN ('confirmada', 'provisional'));

COMMENT ON COLUMN public.tree_data_versions.estado_identificacion_especie IS
  'Identificación de la especie en esta versión: confirmada o provisional; NULL = sin dato (032).';
COMMENT ON COLUMN public.trees.estado_identificacion_especie IS
  'Valor vigente de tree_data_versions.estado_identificacion_especie (fn_refresh_tree_current; 032).';

-- fn_refresh_tree_current: cuerpo idéntico al de la 025 más la cláusula
-- de estado_identificacion_especie (justo después de species_id).
CREATE OR REPLACE FUNCTION public.fn_refresh_tree_current(p_tree_id UUID) RETURNS void
LANGUAGE plpgsql
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
      AND i.estado_registro = 'finalizado'
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
    -- 032: la identificación (provisional o confirmada) sigue a la versión que aportó la especie.
    estado_identificacion_especie = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.estado_identificacion_especie FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.estado_identificacion_especie FROM alta a) END,
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
    altura_total_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_total_m FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_total_m FROM alta a) END,
    diametro_copa_ns_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_ns_m FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_ns_m FROM alta a) END,
    diametro_copa_eo_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_eo_m FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_eo_m FROM alta a) END,
    copa_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.copa_no_presenta FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.copa_no_presenta FROM alta a) END,
    altura_primera_rama_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_m FROM alta a) END,
    altura_primera_rama_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_no_presenta FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_no_presenta FROM alta a) END,
    altura_base_copa_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_m FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_m FROM alta a) END,
    altura_base_copa_viva_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_no_presenta FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    clase_edad = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados))
      THEN (SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.clase_edad FROM alta a) END,
    rango_edad_estimada_anios = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados))
      THEN (SELECT v.rango_edad_estimada_anios FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.rango_edad_estimada_anios FROM alta a) END,
    vigente_desde_inspection_id = (
      SELECT v.inspection_id FROM validas v
      ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC
      LIMIT 1
    )
  WHERE t.id = p_tree_id;
END;
$$;

COMMIT;
