-- =====================================================================
-- Pruebas de la migración 025 — Completar OT, cancelar, reasignar y AM-19
-- (#60; CC-050; D-239, D-241, D-242, D-244; PR-003 v8.0)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 025.
-- Corre íntegramente dentro de BEGIN … ROLLBACK.
--

BEGIN;

CREATE FUNCTION pg_temp.crear_usuario_prueba(p_email text, p_rol text, p_nombre text) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE nombre = p_rol;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol % no existe', p_rol;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    false, false
  );
  INSERT INTO public.user_profiles (id, role_id, nombre, activo) VALUES (v_id, v_role_id, p_nombre, true);

  RETURN v_id;
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_municipal uuid;
  v_inspector uuid;
  v_inspector_2 uuid;
  v_encargado uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_wo_id uuid;
  v_insp_res jsonb;
  v_insp_id uuid;
  v_eval_res jsonb;
  v_error_count int := 0;
BEGIN
  -- 1. Usuarios de prueba
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'muni_025@sivu.example.test',
    p_rol => 'usuario_municipal',
    p_nombre => 'Municipal 025'
  );
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'insp_025@sivu.example.test',
    p_rol => 'inspector',
    p_nombre => 'Inspector 025'
  );
  v_inspector_2 := pg_temp.crear_usuario_prueba(
    p_email => 'insp2_025@sivu.example.test',
    p_rol => 'inspector',
    p_nombre => 'Inspector Dos 025'
  );
  v_encargado := pg_temp.crear_usuario_prueba(
    p_email => 'manten_025@sivu.example.test',
    p_rol => 'encargado_mantencion',
    p_nombre => 'Encargado 025'
  );

  -- 2. Proyecto y sector
  INSERT INTO public.projects (nombre, institution_name, responsible_professional, created_by)
  VALUES ('Proyecto 025', 'Mun 025', 'Prof 025', v_municipal)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre, geometria_sector)
  VALUES (
    v_project_id,
    'Sector 025',
    ST_Multi(ST_GeomFromText('POLYGON((-71.65 -33.05, -71.60 -33.05, -71.60 -33.02, -71.65 -33.02, -71.65 -33.05))', 4326))
  )
  RETURNING id INTO v_sector_id;

  INSERT INTO public.project_members (project_id, user_id, added_by)
  VALUES (v_project_id, v_municipal, v_municipal),
         (v_project_id, v_inspector, v_municipal),
         (v_project_id, v_inspector_2, v_municipal),
         (v_project_id, v_encargado, v_municipal);

  -- 3. Árbol de prueba (alta)
  v_tree_res := public.fn_create_tree_alta(
    p_project_id => v_project_id,
    p_especie_cientifica => 'Cryptocarya alba',
    p_nombre_comun => 'Peumo',
    p_sector_id => v_sector_id,
    p_ubicacion_descriptiva => 'Plaza 025',
    p_coordenadas_utm => '{"este": 254000, "norte": 6340000}'::jsonb,
    p_creado_por => v_municipal,
    p_qr_token => 'qr-025-test'
  );
  v_tree_id := (v_tree_res->>'tree_id')::uuid;

  -- -------------------------------------------------------------------
  -- C1: Completar OT sin ninguna inspección -> rechazo SV065 (CC-050)
  -- -------------------------------------------------------------------
  v_wo_id := (public.fn_create_work_order_inspeccion(
    p_project_id => v_project_id,
    p_tree_id => v_tree_id,
    p_incident_id => NULL,
    p_accion_solicitada => 'evaluacion_inicial',
    p_subtipo_accion => NULL,
    p_motivo => 'Control',
    p_prioridad => 'media',
    p_observaciones => NULL,
    p_responsable_accion_id => v_inspector,
    p_creado_por => v_municipal,
    p_fecha_creacion_ot => CURRENT_DATE
  )->>'id')::uuid;

  -- Pasar a programada y en_ejecucion
  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id => v_wo_id,
    p_nuevo_estado => 'programada',
    p_fecha_accion_programada => CURRENT_DATE + 1,
    p_usuario => v_inspector
  );
  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id => v_wo_id,
    p_nuevo_estado => 'en_ejecucion',
    p_fecha_accion_programada => NULL,
    p_usuario => v_inspector
  );

  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id => v_wo_id,
      p_usuario => v_municipal,
      p_fecha_completada => CURRENT_DATE
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C1: debió rechazar completar sin inspección finalizada');
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C1 OK: rechazó completar sin inspección finalizada');
  END;

  -- -------------------------------------------------------------------
  -- C2: Completar OT con borrador en preguardado -> rechazo SV065 (D-239)
  -- -------------------------------------------------------------------
  v_insp_res := public.fn_save_inspection_draft(
    p_inspection_id => NULL,
    p_work_order_id => v_wo_id,
    p_tree_id => v_tree_id,
    p_tipo_inspeccion_realizada => 'evaluacion_inicial',
    p_subtipo_inspeccion => NULL,
    p_fecha_inspeccion => CURRENT_DATE,
    p_inspector_id => v_inspector,
    p_variables => '{"dap_cm": 25, "altura_m": 8}'::jsonb,
    p_datos_arbol => '{"dap_cm": 25, "altura_m": 8}'::jsonb
  );
  v_insp_id := (v_insp_res->>'inspection_id')::uuid;

  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id => v_wo_id,
      p_usuario => v_municipal,
      p_fecha_completada => CURRENT_DATE
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C2: debió rechazar con inspección en preguardado');
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C2 OK: rechazó con inspección en preguardado');
  END;

  -- -------------------------------------------------------------------
  -- C3: Completar OT con inspección finalizada -> ÉXITO y vigencia
  -- -------------------------------------------------------------------
  -- Finalizar la inspección
  INSERT INTO public.evaluations (
    inspection_id, variables_calculo, rule_version, motor_commit, calculados, indicadores,
    puntaje_raices_cuello, puntaje_tronco, puntaje_copa_ramas, clasificacion_riesgo_calculada,
    calculado_at
  ) VALUES (
    v_insp_id, '{"dap_cm": 25, "altura_m": 8}'::jsonb, '2.1', 'commit025', '{}'::jsonb, '{}'::jsonb,
    2, 3, 1, 'bajo', now()
  );

  PERFORM public.fn_finalizar_inspeccion(
    p_inspection_id => v_insp_id,
    p_usuario => v_inspector,
    p_resultado => '{"entradas_vigentes": {"dap_cm": 25}, "calculados": {}, "indicadores": {}, "puntaje_raices_cuello": 2, "probabilidad_falla_raices_cuello": "improbable", "puntaje_tronco": 3, "probabilidad_falla_tronco": "improbable", "puntaje_copa_ramas": 1, "probabilidad_falla_copa_ramas": "improbable", "probabilidad_impacto": "improbable", "clasificacion_raices_cuello": "bajo", "clasificacion_tronco": "bajo", "clasificacion_copa_ramas": "bajo", "clasificacion_riesgo_calculada": "bajo", "clasificacion_prioridad_calculada": "baja", "fecha_proxima_inspeccion_sugerida": "2028-10-26", "fecha_proximo_monitoreo_sugerida": "2027-10-26", "ajustes_descartados": []}'::jsonb,
    p_ajustes => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo_sugerida => CURRENT_DATE + 180,
    p_fecha_proxima_inspeccion => CURRENT_DATE + 365,
    p_fecha_proximo_monitoreo => CURRENT_DATE + 180,
    p_justificacion_ajuste_fecha => NULL
  );

  -- Ahora completar la OT
  PERFORM public.fn_complete_work_order_inspeccion(
    p_work_order_id => v_wo_id,
    p_usuario => v_municipal,
    p_fecha_completada => CURRENT_DATE
  );

  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = v_wo_id AND estado_ot = 'completada' AND fecha_completada_ot = CURRENT_DATE
  ) AND EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = v_tree_id AND dap_cm = 25 AND altura_m = 8
  ) THEN
    INSERT INTO test_log (msg) VALUES ('C3 OK: OT completada y árbol refrescado con valores vigentes');
  ELSE
    INSERT INTO test_log (msg) VALUES ('FALLA C3: estado o vigencia no coincide');
  END IF;

  -- -------------------------------------------------------------------
  -- C4: Completar OT intentada por Inspector u otro rol -> rechazo SV065
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_complete_work_order_inspeccion(
      p_work_order_id => v_wo_id,
      p_usuario => v_inspector,
      p_fecha_completada => CURRENT_DATE
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C4: debió rechazar a inspector');
  EXCEPTION WHEN SQLSTATE 'SV065' THEN
    INSERT INTO test_log (msg) VALUES ('C4 OK: rechazó completar por inspector');
  END;

  -- -------------------------------------------------------------------
  -- C6: Cancelar OT con motivo válido por Usuario municipal -> ÉXITO
  -- -------------------------------------------------------------------
  v_wo_id := (public.fn_create_work_order_inspeccion(
    p_project_id => v_project_id,
    p_tree_id => v_tree_id,
    p_incident_id => NULL,
    p_accion_solicitada => 'reevaluacion',
    p_subtipo_accion => NULL,
    p_motivo => 'Control 2',
    p_prioridad => 'baja',
    p_observaciones => NULL,
    p_responsable_accion_id => v_inspector,
    p_creado_por => v_municipal,
    p_fecha_creacion_ot => CURRENT_DATE
  )->>'id')::uuid;

  PERFORM public.fn_cancel_work_order(
    p_work_order_id => v_wo_id,
    p_motivo => 'Zona inaccesible por obras municipales',
    p_usuario => v_municipal
  );

  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = v_wo_id
      AND estado_ot = 'cancelada'
      AND motivo_cancelacion = 'Zona inaccesible por obras municipales'
      AND cancelado_por = v_municipal
      AND fecha_cancelacion IS NOT NULL
  ) THEN
    INSERT INTO test_log (msg) VALUES ('C6 OK: OT cancelada con motivo y auditoría guardada');
  ELSE
    INSERT INTO test_log (msg) VALUES ('FALLA C6: datos de cancelación incorrectos');
  END IF;

  -- -------------------------------------------------------------------
  -- C7: Cancelar OT sin motivo -> rechazo SV066
  -- -------------------------------------------------------------------
  v_wo_id := (public.fn_create_work_order_inspeccion(
    p_project_id => v_project_id,
    p_tree_id => v_tree_id,
    p_incident_id => NULL,
    p_accion_solicitada => 'reevaluacion',
    p_subtipo_accion => NULL,
    p_motivo => 'Control 3',
    p_prioridad => 'baja',
    p_observaciones => NULL,
    p_responsable_accion_id => v_inspector,
    p_creado_por => v_municipal,
    p_fecha_creacion_ot => CURRENT_DATE
  )->>'id')::uuid;

  BEGIN
    PERFORM public.fn_cancel_work_order(
      p_work_order_id => v_wo_id,
      p_motivo => '   ',
      p_usuario => v_municipal
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C7: debió rechazar motivo vacío');
  EXCEPTION WHEN SQLSTATE 'SV066' THEN
    INSERT INTO test_log (msg) VALUES ('C7 OK: rechazó cancelación con motivo vacío');
  END;

  -- -------------------------------------------------------------------
  -- C8: Cancelar OT por Inspector -> rechazo SV066
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_cancel_work_order(
      p_work_order_id => v_wo_id,
      p_motivo => 'No puedo ir',
      p_usuario => v_inspector
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C8: debió rechazar cancelar por inspector');
  EXCEPTION WHEN SQLSTATE 'SV066' THEN
    INSERT INTO test_log (msg) VALUES ('C8 OK: rechazó cancelar por inspector');
  END;

  -- -------------------------------------------------------------------
  -- C9: Reasignar responsable en OT de inspección -> ÉXITO
  -- -------------------------------------------------------------------
  PERFORM public.fn_reassign_work_order(
    p_work_order_id => v_wo_id,
    p_nuevo_responsable_id => v_inspector_2,
    p_usuario => v_municipal
  );

  IF EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE id = v_wo_id AND responsable_accion_id = v_inspector_2
  ) THEN
    INSERT INTO test_log (msg) VALUES ('C9 OK: responsable reasignado a Inspector Dos');
  ELSE
    INSERT INTO test_log (msg) VALUES ('FALLA C9: responsable no fue reasignado');
  END IF;

  -- -------------------------------------------------------------------
  -- C10: Reasignar OT de inspección a Encargado de mantención -> rechazo SV067
  -- -------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_reassign_work_order(
      p_work_order_id => v_wo_id,
      p_nuevo_responsable_id => v_encargado,
      p_usuario => v_municipal
    );
    INSERT INTO test_log (msg) VALUES ('FALLA C10: debió rechazar encargado en OT de inspección');
  EXCEPTION WHEN SQLSTATE 'SV067' THEN
    INSERT INTO test_log (msg) VALUES ('C10 OK: rechazó asignar Encargado a OT de Inspección');
  END;

END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
