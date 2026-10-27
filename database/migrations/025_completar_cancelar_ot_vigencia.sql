-- =====================================================================
-- Migración 025 — Completar OT, cancelar OT, reasignación y vigencia (AM-19)
-- (#60; CC-050; ADR-017; PR-003 v8.0; D-239, D-241, D-242, D-244)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Contenido:
-- 1. work_orders: columnas motivo_cancelacion, cancelado_por, fecha_cancelacion
--    y constraint chk_work_orders_cancelada (CC-050, Opción A aprobada).
-- 2. fn_check_ot_completada: exige además al menos una inspección finalizada
--    en OT de Inspección (CC-050).
-- 3. AM-19: unificación del filtro de inspecciones válidas a
--    `estado_registro = 'finalizado'` en fn_refresh_tree_current y en
--    v_tree_current_inputs (alineadas con v_tree_fechas_vigentes de la 020).
-- 4. fn_complete_work_order_inspeccion: transición a 'completada' por el
--    Usuario municipal activo miembro del proyecto, fija fecha_completada_ot
--    (D-242) y ejecuta fn_refresh_tree_current para cada árbol de la OT
--    (1 en OT estándar; N árboles en Levantamiento, AMD-19). SQLSTATE SV065.
-- 5. fn_cancel_work_order: transición a 'cancelada' por el Usuario municipal
--    activo miembro del proyecto, con motivo obligatorio y no vacío. SQLSTATE SV066.
-- 6. fn_reassign_work_order: reasignación de responsable_accion_id por el
--    Usuario municipal activo miembro del proyecto. SQLSTATE SV067.
--

-- ---------------------------------------------------------------------
-- 1. Columnas y constraint de cancelación en work_orders (CC-050)
-- ---------------------------------------------------------------------

ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ;

ALTER TABLE public.work_orders
  ADD CONSTRAINT chk_work_orders_cancelada
    CHECK (
      (estado_ot = 'cancelada' AND motivo_cancelacion IS NOT NULL AND btrim(motivo_cancelacion) <> '' AND cancelado_por IS NOT NULL AND fecha_cancelacion IS NOT NULL)
      OR
      (estado_ot <> 'cancelada' AND motivo_cancelacion IS NULL AND cancelado_por IS NULL AND fecha_cancelacion IS NULL)
    );

-- ---------------------------------------------------------------------
-- 2. Trigger de validación de OT completada (CC-050)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_check_ot_completada() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado_ot = 'completada' THEN
    -- Ninguna inspección en preguardado (D-239)
    IF EXISTS (
      SELECT 1 FROM public.inspections WHERE work_order_id = NEW.id AND estado_registro = 'preguardado'
    ) THEN
      RAISE EXCEPTION 'La OT % tiene inspecciones en preguardado: no puede completarse', NEW.codigo_ot;
    END IF;

    -- En OT de Inspección, exige al menos una inspección Finalizada (CC-050)
    IF NEW.tipo_ot = 'inspeccion' AND NOT EXISTS (
      SELECT 1 FROM public.inspections WHERE work_order_id = NEW.id AND estado_registro = 'finalizado'
    ) THEN
      RAISE EXCEPTION 'La OT % de Inspección no tiene ninguna inspección finalizada: no puede completarse (CC-050)', NEW.codigo_ot;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. AM-19: Unificación de filtro en fn_refresh_tree_current y v_tree_current_inputs
--    Conserva 100% de las 21 columnas y precedencia exacta de la migración 021.
-- ---------------------------------------------------------------------

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
      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
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

CREATE OR REPLACE VIEW public.v_tree_current_inputs WITH (security_invoker = true) AS
WITH validas AS (
  SELECT
    e.tree_id,
    e.inspection_id,
    wo.fecha_completada_ot,
    i.fecha_inspeccion,
    i.created_at,
    kv.key,
    kv.value
  FROM public.evaluations e
  JOIN public.inspections i ON i.id = e.inspection_id
  JOIN public.work_orders wo ON wo.id = i.work_order_id
  CROSS JOIN LATERAL jsonb_each(e.variables) AS kv(key, value)
  WHERE i.estado_registro = 'finalizado'
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

-- ---------------------------------------------------------------------
-- 4. fn_complete_work_order_inspeccion (CC-050, #60, D-239, D-242)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_complete_work_order_inspeccion(
  p_work_order_id UUID,
  p_usuario UUID,
  p_fecha_completada DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_ot TEXT;
  v_tipo_ot TEXT;
  v_project_id UUID;
  v_tree_id UUID;
  v_rol TEXT;
  v_activo BOOLEAN;
  v_es_miembro BOOLEAN;
  v_tree_ids UUID[];
  v_tid UUID;
BEGIN
  -- Anti-suplantación: en contexto PostgREST/RPC, auth.uid() debe coincidir con p_usuario
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  IF p_usuario IS NULL THEN
    RAISE EXCEPTION 'El identificador de usuario es obligatorio' USING ERRCODE = 'SV065';
  END IF;

  IF p_fecha_completada IS NULL THEN
    RAISE EXCEPTION 'fecha_completada es obligatoria para completar la OT' USING ERRCODE = 'SV065';
  END IF;

  -- Bloqueo FOR UPDATE para garantizar serialización y concurrencia segura
  SELECT estado_ot, tipo_ot, project_id, tree_id
  INTO v_estado_ot, v_tipo_ot, v_project_id, v_tree_id
  FROM public.work_orders
  WHERE id = p_work_order_id
  FOR UPDATE;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV065';
  END IF;

  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'Esta función solo completa OT de tipo Inspección (tipo actual: %)', v_tipo_ot USING ERRCODE = 'SV065';
  END IF;

  IF v_estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo no está En ejecución (estado actual: %) - no se puede completar', v_estado_ot USING ERRCODE = 'SV065';
  END IF;

  -- Verificación del usuario solicitante (Usuario municipal activo miembro del proyecto)
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV065';
  END IF;
  IF v_rol <> 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal puede completar la orden de trabajo (rol actual: %)', v_rol USING ERRCODE = 'SV065';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV065';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = v_project_id AND user_id = p_usuario
  ) INTO v_es_miembro;

  IF NOT v_es_miembro THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto %', p_usuario, v_project_id USING ERRCODE = 'SV065';
  END IF;

  -- Validación de inspecciones (D-239, CC-050)
  IF EXISTS (
    SELECT 1 FROM public.inspections WHERE work_order_id = p_work_order_id AND estado_registro = 'preguardado'
  ) THEN
    RAISE EXCEPTION 'No se puede completar la orden de trabajo: tiene inspecciones en Preguardado (D-239)' USING ERRCODE = 'SV065';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inspections WHERE work_order_id = p_work_order_id AND estado_registro = 'finalizado'
  ) THEN
    RAISE EXCEPTION 'No se puede completar la orden de trabajo: debe tener al menos una inspección Finalizada (CC-050)' USING ERRCODE = 'SV065';
  END IF;

  -- Resolver árboles a actualizar (1 en OT estándar, N en Levantamiento AMD-19)
  IF v_tree_id IS NOT NULL THEN
    v_tree_ids := ARRAY[v_tree_id];
  ELSE
    SELECT COALESCE(ARRAY_AGG(DISTINCT tree_id), '{}')
    INTO v_tree_ids
    FROM public.inspections
    WHERE work_order_id = p_work_order_id AND estado_registro = 'finalizado' AND tree_id IS NOT NULL;
  END IF;

  -- Transicionar estado
  UPDATE public.work_orders
  SET estado_ot = 'completada',
      fecha_completada_ot = p_fecha_completada,
      updated_at = now()
  WHERE id = p_work_order_id;

  -- Refrescar árboles afectados en trees (valores vigentes)
  IF v_tree_ids IS NOT NULL AND array_length(v_tree_ids, 1) > 0 THEN
    FOREACH v_tid IN ARRAY v_tree_ids LOOP
      PERFORM public.fn_refresh_tree_current(v_tid);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'work_order_id', p_work_order_id,
    'estado_ot', 'completada',
    'fecha_completada_ot', p_fecha_completada,
    'tree_ids', COALESCE(to_jsonb(v_tree_ids), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_complete_work_order_inspeccion(UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_work_order_inspeccion(UUID, UUID, DATE) TO service_role;

-- ---------------------------------------------------------------------
-- 5. fn_cancel_work_order (CC-050, PR-003 v8.0)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cancel_work_order(
  p_work_order_id UUID,
  p_motivo TEXT,
  p_usuario UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_ot TEXT;
  v_project_id UUID;
  v_rol TEXT;
  v_activo BOOLEAN;
  v_es_miembro BOOLEAN;
  v_motivo_limpio TEXT;
BEGIN
  -- Anti-suplantación: en contexto PostgREST/RPC, auth.uid() debe coincidir con p_usuario
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  IF p_usuario IS NULL THEN
    RAISE EXCEPTION 'El identificador de usuario es obligatorio' USING ERRCODE = 'SV066';
  END IF;

  v_motivo_limpio := btrim(p_motivo);
  IF v_motivo_limpio IS NULL OR v_motivo_limpio = '' THEN
    RAISE EXCEPTION 'motivo_cancelacion es obligatorio para cancelar la orden de trabajo (CC-050)' USING ERRCODE = 'SV066';
  END IF;

  -- Bloqueo FOR UPDATE
  SELECT estado_ot, project_id INTO v_estado_ot, v_project_id
  FROM public.work_orders
  WHERE id = p_work_order_id
  FOR UPDATE;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV066';
  END IF;

  IF v_estado_ot NOT IN ('pendiente', 'programada', 'en_ejecucion') THEN
    RAISE EXCEPTION 'No se puede cancelar una orden de trabajo en estado % (CC-050: solo Pendiente, Programada o En ejecución)', v_estado_ot USING ERRCODE = 'SV066';
  END IF;

  -- Verificación del usuario solicitante (Usuario municipal activo miembro)
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV066';
  END IF;
  IF v_rol <> 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal puede cancelar la orden de trabajo (rol actual: %)', v_rol USING ERRCODE = 'SV066';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV066';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = v_project_id AND user_id = p_usuario
  ) INTO v_es_miembro;

  IF NOT v_es_miembro THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto %', p_usuario, v_project_id USING ERRCODE = 'SV066';
  END IF;

  UPDATE public.work_orders
  SET estado_ot = 'cancelada',
      motivo_cancelacion = v_motivo_limpio,
      cancelado_por = p_usuario,
      fecha_cancelacion = now(),
      updated_at = now()
  WHERE id = p_work_order_id;

  RETURN jsonb_build_object(
    'work_order_id', p_work_order_id,
    'estado_ot', 'cancelada',
    'motivo_cancelacion', v_motivo_limpio,
    'cancelado_por', p_usuario,
    'fecha_cancelacion', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cancel_work_order(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_work_order(UUID, TEXT, UUID) TO service_role;

-- ---------------------------------------------------------------------
-- 6. fn_reassign_work_order (CC-050, D-244, PR-003 v8.0)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_reassign_work_order(
  p_work_order_id UUID,
  p_nuevo_responsable_id UUID,
  p_usuario UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_ot TEXT;
  v_tipo_ot TEXT;
  v_project_id UUID;
  v_rol_solicitante TEXT;
  v_activo_solicitante BOOLEAN;
  v_es_miembro_solicitante BOOLEAN;
  v_rol_nuevo TEXT;
  v_activo_nuevo BOOLEAN;
  v_es_miembro_nuevo BOOLEAN;
BEGIN
  -- Anti-suplantación: en contexto PostgREST/RPC, auth.uid() debe coincidir con p_usuario
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  IF p_usuario IS NULL THEN
    RAISE EXCEPTION 'El identificador de usuario solicitante es obligatorio' USING ERRCODE = 'SV067';
  END IF;

  IF p_nuevo_responsable_id IS NULL THEN
    RAISE EXCEPTION 'El identificador del nuevo responsable es obligatorio' USING ERRCODE = 'SV067';
  END IF;

  -- Bloqueo FOR UPDATE
  SELECT estado_ot, tipo_ot, project_id INTO v_estado_ot, v_tipo_ot, v_project_id
  FROM public.work_orders
  WHERE id = p_work_order_id
  FOR UPDATE;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV067';
  END IF;

  IF v_estado_ot IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'No se puede reasignar una orden de trabajo en estado % (CC-050: solo mientras no esté Completada ni Cancelada)', v_estado_ot USING ERRCODE = 'SV067';
  END IF;

  -- Verificación del solicitante (Usuario municipal activo miembro)
  SELECT r.nombre, up.activo INTO v_rol_solicitante, v_activo_solicitante
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol_solicitante IS NULL THEN
    RAISE EXCEPTION 'El usuario solicitante % no existe', p_usuario USING ERRCODE = 'SV067';
  END IF;
  IF v_rol_solicitante <> 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal puede reasignar el responsable (rol actual: %)', v_rol_solicitante USING ERRCODE = 'SV067';
  END IF;
  IF NOT v_activo_solicitante THEN
    RAISE EXCEPTION 'El usuario solicitante % no está activo', p_usuario USING ERRCODE = 'SV067';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = v_project_id AND user_id = p_usuario
  ) INTO v_es_miembro_solicitante;

  IF NOT v_es_miembro_solicitante THEN
    RAISE EXCEPTION 'El usuario solicitante % no es miembro del proyecto %', p_usuario, v_project_id USING ERRCODE = 'SV067';
  END IF;

  -- Verificación del nuevo responsable
  SELECT r.nombre, up.activo INTO v_rol_nuevo, v_activo_nuevo
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_nuevo_responsable_id;

  IF v_rol_nuevo IS NULL THEN
    RAISE EXCEPTION 'El nuevo responsable % no existe', p_nuevo_responsable_id USING ERRCODE = 'SV067';
  END IF;
  IF NOT v_activo_nuevo THEN
    RAISE EXCEPTION 'El nuevo responsable % no está activo', p_nuevo_responsable_id USING ERRCODE = 'SV067';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = v_project_id AND user_id = p_nuevo_responsable_id
  ) INTO v_es_miembro_nuevo;

  IF NOT v_es_miembro_nuevo THEN
    RAISE EXCEPTION 'El nuevo responsable % no es miembro del proyecto %', p_nuevo_responsable_id, v_project_id USING ERRCODE = 'SV067';
  END IF;

  IF v_tipo_ot = 'inspeccion' AND v_rol_nuevo <> 'inspector' THEN
    RAISE EXCEPTION 'Para una orden de trabajo de Inspección, el responsable debe tener el rol Inspector (rol actual: %)', v_rol_nuevo USING ERRCODE = 'SV067';
  END IF;

  IF v_tipo_ot = 'mantenimiento' AND v_rol_nuevo <> 'encargado_mantencion' THEN
    RAISE EXCEPTION 'Para una orden de trabajo de Mantenimiento, el responsable debe tener el rol Encargado de mantención (rol actual: %)', v_rol_nuevo USING ERRCODE = 'SV067';
  END IF;

  UPDATE public.work_orders
  SET responsable_accion_id = p_nuevo_responsable_id,
      updated_at = now()
  WHERE id = p_work_order_id;

  RETURN jsonb_build_object(
    'work_order_id', p_work_order_id,
    'responsable_accion_id', p_nuevo_responsable_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_reassign_work_order(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reassign_work_order(UUID, UUID, UUID) TO service_role;
