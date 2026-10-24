-- =====================================================================
-- Reversión de 018f_levantamiento_arbol_nuevo.sql
-- =====================================================================
--
-- Vuelve a la función de 17 parámetros de 018e (sin el alta de árbol
-- nuevo en Levantamiento). Postgres identifica la función por su firma
-- completa: hay que DROP la de 23 parámetros antes de recrear la de 17.

DROP FUNCTION IF EXISTS public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[],
  text, text, numeric, numeric, text, text
);

CREATE FUNCTION public.fn_save_inspection_draft(
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
  p_campos_registrados_arbol text[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inspection_id uuid := p_inspection_id;
  v_estado_registro text;
  v_estado_ot text;
  v_tipo_ot text;
  v_accion_solicitada text;
  v_responsable_accion_id uuid;
  v_ot_tree_id uuid;
  v_wo_project_id uuid;
  v_tree_project_id uuid;
  v_rol text;
  v_activo boolean;
  v_subtipo_valido boolean;
  v_arbol public.tree_data_versions_arbol_input;
  v_evaluation_id uuid;
  v_tree_data_version_id uuid;
BEGIN
  SELECT estado_ot, tipo_ot, accion_solicitada, responsable_accion_id, tree_id, project_id
  INTO v_estado_ot, v_tipo_ot, v_accion_solicitada, v_responsable_accion_id, v_ot_tree_id, v_wo_project_id
  FROM public.work_orders WHERE id = p_work_order_id;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV058';
  END IF;
  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no es de tipo Inspección (tipo_ot: %)', p_work_order_id, v_tipo_ot
      USING ERRCODE = 'SV058';
  END IF;
  IF v_estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no está en ejecución (estado: %); no se puede crear ni guardar una inspección', p_work_order_id, v_estado_ot
      USING ERRCODE = 'SV058';
  END IF;

  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_registrado_por THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_registrado_por, p_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV058';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_registrado_por;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_registrado_por USING ERRCODE = 'SV058';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %)', p_registrado_por, v_rol USING ERRCODE = 'SV058';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo (D-195, D-244)', p_registrado_por USING ERRCODE = 'SV058';
  END IF;

  IF p_tipo_inspeccion_realizada <> v_accion_solicitada THEN
    RAISE EXCEPTION 'tipo_inspeccion_realizada (%) no corresponde a la acción solicitada de la orden de trabajo (%)',
      p_tipo_inspeccion_realizada, v_accion_solicitada
      USING ERRCODE = 'SV058';
  END IF;

  v_subtipo_valido := CASE p_tipo_inspeccion_realizada
    WHEN 'evaluacion_inicial' THEN p_subtipo_inspeccion IS NULL
    WHEN 'levantamiento'      THEN p_subtipo_inspeccion IS NULL
    WHEN 'reevaluacion'       THEN p_subtipo_inspeccion IS NULL OR p_subtipo_inspeccion IN ('seguimiento', 'post_intervencion')
    WHEN 'evaluacion_instrumental' THEN p_subtipo_inspeccion IS NULL OR p_subtipo_inspeccion IN ('tomografia_sonica', 'resistografia', 'otra_instrumental')
    WHEN 'monitoreo'          THEN p_subtipo_inspeccion IN ('fitosanitario', 'estructural', 'vitalidad')
    ELSE false
  END;
  IF NOT v_subtipo_valido THEN
    RAISE EXCEPTION 'subtipo_inspeccion (%) no es válido para tipo_inspeccion_realizada (%)',
      p_subtipo_inspeccion, p_tipo_inspeccion_realizada
      USING ERRCODE = 'SV058';
  END IF;

  IF v_ot_tree_id IS NOT NULL THEN
    IF v_ot_tree_id <> p_tree_id THEN
      RAISE EXCEPTION 'El árbol de la inspección (%) no coincide con el árbol de la orden de trabajo (%)', p_tree_id, v_ot_tree_id
        USING ERRCODE = 'SV058';
    END IF;
  ELSE
    SELECT project_id INTO v_tree_project_id FROM public.trees WHERE id = p_tree_id;
    IF v_tree_project_id IS NULL THEN
      RAISE EXCEPTION 'El árbol % no existe', p_tree_id USING ERRCODE = 'SV058';
    END IF;
    IF v_tree_project_id <> v_wo_project_id THEN
      RAISE EXCEPTION 'El árbol % no pertenece al proyecto de la orden de trabajo de Levantamiento (D-193)', p_tree_id
        USING ERRCODE = 'SV058';
    END IF;
  END IF;

  IF v_inspection_id IS NULL THEN
    INSERT INTO public.inspections (
      work_order_id, tree_id, inspector, fecha_inspeccion, fecha_registro,
      rule_version, tipo_inspeccion_realizada, subtipo_inspeccion,
      metodo_instrumental, resultado_general, requiere_mantenimiento,
      observaciones, registrado_por
    ) VALUES (
      p_work_order_id, p_tree_id, p_inspector, p_fecha_inspeccion, p_fecha_registro,
      p_rule_version, p_tipo_inspeccion_realizada, p_subtipo_inspeccion,
      p_metodo_instrumental, p_resultado_general, p_requiere_mantenimiento,
      p_observaciones, p_registrado_por
    )
    RETURNING id INTO v_inspection_id;
  ELSE
    SELECT estado_registro INTO v_estado_registro
    FROM public.inspections WHERE id = v_inspection_id;

    IF v_estado_registro IS NULL THEN
      RAISE EXCEPTION 'La inspección % no existe' , v_inspection_id USING ERRCODE = 'SV058';
    END IF;
    IF v_estado_registro <> 'preguardado' THEN
      RAISE EXCEPTION 'La inspección % ya no está en preguardado (estado: %); no se puede modificar', v_inspection_id, v_estado_registro
        USING ERRCODE = 'SV058';
    END IF;

    UPDATE public.inspections SET
      tipo_inspeccion_realizada = p_tipo_inspeccion_realizada,
      subtipo_inspeccion = p_subtipo_inspeccion,
      metodo_instrumental = p_metodo_instrumental,
      resultado_general = p_resultado_general,
      requiere_mantenimiento = p_requiere_mantenimiento,
      observaciones = p_observaciones
    WHERE id = v_inspection_id;
  END IF;

  INSERT INTO public.evaluations (inspection_id, tree_id, variables)
  VALUES (v_inspection_id, p_tree_id, p_variables)
  ON CONFLICT (inspection_id) DO UPDATE SET
    variables = EXCLUDED.variables,
    updated_at = now()
  RETURNING id INTO v_evaluation_id;

  IF p_campos_registrados_arbol IS NOT NULL AND array_length(p_campos_registrados_arbol, 1) > 0 THEN
    v_arbol := jsonb_populate_record(null::public.tree_data_versions_arbol_input, p_campos_arbol);

    INSERT INTO public.tree_data_versions (
      tree_id, inspection_id, campos_registrados,
      sector, ubicacion_descriptiva, utm_este, utm_norte,
      especie_cientifica, nombre_comun, multifustal, numero_fustes,
      dap_fustes_cm, dap_cm, altura_total_m, diametro_copa_ns_m, diametro_copa_eo_m,
      copa_no_presenta, altura_primera_rama_m, altura_primera_rama_no_presenta,
      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta,
      clase_edad, rango_edad_estimada_anios, created_by
    ) VALUES (
      p_tree_id, v_inspection_id, p_campos_registrados_arbol,
      v_arbol.sector, v_arbol.ubicacion_descriptiva, v_arbol.utm_este, v_arbol.utm_norte,
      v_arbol.especie_cientifica, v_arbol.nombre_comun, v_arbol.multifustal, v_arbol.numero_fustes,
      v_arbol.dap_fustes_cm, v_arbol.dap_cm, v_arbol.altura_total_m, v_arbol.diametro_copa_ns_m, v_arbol.diametro_copa_eo_m,
      v_arbol.copa_no_presenta, v_arbol.altura_primera_rama_m, v_arbol.altura_primera_rama_no_presenta,
      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta,
      v_arbol.clase_edad, v_arbol.rango_edad_estimada_anios, p_registrado_por
    )
    ON CONFLICT (inspection_id) DO UPDATE SET
      campos_registrados = EXCLUDED.campos_registrados,
      sector = EXCLUDED.sector, ubicacion_descriptiva = EXCLUDED.ubicacion_descriptiva,
      utm_este = EXCLUDED.utm_este, utm_norte = EXCLUDED.utm_norte,
      especie_cientifica = EXCLUDED.especie_cientifica, nombre_comun = EXCLUDED.nombre_comun,
      multifustal = EXCLUDED.multifustal, numero_fustes = EXCLUDED.numero_fustes,
      dap_fustes_cm = EXCLUDED.dap_fustes_cm, dap_cm = EXCLUDED.dap_cm,
      altura_total_m = EXCLUDED.altura_total_m, diametro_copa_ns_m = EXCLUDED.diametro_copa_ns_m,
      diametro_copa_eo_m = EXCLUDED.diametro_copa_eo_m, copa_no_presenta = EXCLUDED.copa_no_presenta,
      altura_primera_rama_m = EXCLUDED.altura_primera_rama_m,
      altura_primera_rama_no_presenta = EXCLUDED.altura_primera_rama_no_presenta,
      altura_base_copa_viva_m = EXCLUDED.altura_base_copa_viva_m,
      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
      clase_edad = EXCLUDED.clase_edad, rango_edad_estimada_anios = EXCLUDED.rango_edad_estimada_anios
    RETURNING id INTO v_tree_data_version_id;
  ELSE
    DELETE FROM public.tree_data_versions WHERE inspection_id = v_inspection_id;
  END IF;

  RETURN jsonb_build_object(
    'inspection_id', v_inspection_id,
    'evaluation_id', v_evaluation_id,
    'tree_data_version_id', v_tree_data_version_id,
    'estado_registro', 'preguardado'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
) TO service_role;
