-- =====================================================================
-- Pruebas de la migración 027 — Anular una inspección finalizada
-- (CC-067; CC-045 a; CC-031; ADR-017 v1.2; D-209 a D-212)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar 025, 026 y 027.
-- Corre íntegramente dentro de BEGIN … ROLLBACK.
-- Los mensajes FALLA provocan RAISE EXCEPTION y abortan el bloque.
-- Todas las llamadas con varios parámetros van con nombre.
--
-- Casos cubiertos (CC-067, «Pruebas necesarias», parte SQL):
--   Árbol 1 — OT sin completar:
--   A0: anular una inspección en Preguardado -> SV069
--   A1: OT sin completar con p_evaluacion -> SV069
--   A2: motivo solo espacios / NULL -> SV069
--   A3: Inspector, Administrador, Usuario municipal no miembro -> SV069
--   A4: anular -> ÉXITO, solo cambia el estado (sin tree_assessments,
--       árbol sin refrescar)
--   A5: segunda anulación -> SV069
--   Árbol 2 — OT completada:
--   B1: OT completada sin p_evaluacion -> SV069
--   B2: composición alterada -> SV068, nada escrito
--   B3: composición sin excluir la inspección (la vigente actual) -> SV068
--   B4: anular -> ÉXITO, recalcula la vigente, refresca el árbol e
--       inserta tree_assessments con evento 'inspeccion_anulada'
--   B5: segunda anulación -> SV069
--
-- Fechas: el árbol 2 tiene dos inspecciones en OT completadas el mismo
-- día; la primera con fecha_inspeccion de ayer, para que el orden de
-- vigencia no dependa de empates (created_at es igual en una transacción).

BEGIN;

-- Sector de prueba en UTM 19S (mismo que pruebas_020 y pruebas_021).
CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
$$;

-- Resultado del motor con la forma de evaluations_resultado_input (igual
-- que resultado_base de pruebas_020, que pasa chk_evaluations_calculado_coherente).
CREATE FUNCTION pg_temp.resultado_prueba(p_variables jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'variables_calculo', p_variables,
    'calculados', '{}'::jsonb,
    'indicadores', '{}'::jsonb,
    'puntaje_raices_cuello', 0, 'probabilidad_falla_raices_cuello', 'improbable',
    'puntaje_tronco', 0, 'probabilidad_falla_tronco', 'improbable',
    'puntaje_copa_ramas', 0, 'probabilidad_falla_copa_ramas', 'improbable',
    'probabilidad_impacto', 'baja',
    'clasificacion_raices_cuello', 'bajo', 'clasificacion_tronco', 'bajo', 'clasificacion_copa_ramas', 'bajo',
    'clasificacion_riesgo_calculada', 'bajo',
    'puntaje_infraestructura', 0, 'pct_infraestructura', 0, 'clasificacion_infraestructura_calculada', 'no_aplica',
    'clasificacion_prioridad_calculada', 'baja',
    'clasificacion_riesgo_ajustada', NULL, 'clasificacion_infraestructura_ajustada', NULL, 'clasificacion_prioridad_ajustada', NULL,
    'rule_version', '2.1',
    'motor_commit', 'prueba'
  );
$$;

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

CREATE FUNCTION pg_temp.assert(p_cond boolean, p_msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FALLA: %', p_msg;
  END IF;
END;
$$;

-- Lo que el backend enviaría al completar una OT (igual que en pruebas_025).
CREATE FUNCTION pg_temp.evaluaciones_prueba(p_ot uuid) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tree_id', t.tree_id,
    'composicion', public.fn_entradas_vigentes_previas(p_tree_id => t.tree_id, p_work_order_id => p_ot),
    'resultado', jsonb_build_object('rule_version', '2.1', 'motor_commit', 'prueba-027', 'clasificacion_riesgo_calculada', 'bajo')
  )), '[]'::jsonb)
  FROM (SELECT DISTINCT tree_id FROM public.inspections WHERE work_order_id = p_ot AND estado_registro = 'finalizado') t;
$$;

-- OT de Inspección llevada a En ejecución.
CREATE FUNCTION pg_temp.ot_en_ejecucion(p_project uuid, p_tree uuid, p_accion text, p_inspector uuid, p_municipal uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_ot uuid;
BEGIN
  v_ot := (public.fn_create_work_order_inspeccion(
    p_project_id            => p_project,
    p_tree_id               => p_tree,
    p_incident_id           => NULL,
    p_accion_solicitada     => p_accion,
    p_subtipo_accion        => NULL,
    p_motivo                => 'Control 027',
    p_prioridad             => 'media',
    p_observaciones         => NULL,
    p_responsable_accion_id => p_inspector,
    p_creado_por            => p_municipal,
    p_fecha_creacion_ot     => (now() AT TIME ZONE 'America/Santiago')::date
  )->>'id')::uuid;

  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id           => v_ot,
    p_nuevo_estado            => 'programada',
    p_fecha_accion_programada => (now() AT TIME ZONE 'America/Santiago')::date + 1,
    p_usuario                 => p_inspector
  );
  PERFORM public.fn_transition_work_order_estado(
    p_work_order_id           => v_ot,
    p_nuevo_estado            => 'en_ejecucion',
    p_fecha_accion_programada => NULL,
    p_usuario                 => p_inspector
  );
  RETURN v_ot;
END;
$$;

-- Borrador de inspección con las cuatro vistas de foto (D-27, guardián 026).
CREATE FUNCTION pg_temp.borrador(p_ot uuid, p_tree uuid, p_inspector uuid, p_tipo text, p_fecha date, p_variables jsonb) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_insp uuid;
BEGIN
  v_insp := (public.fn_save_inspection_draft(
    p_inspection_id             => NULL,
    p_work_order_id             => p_ot,
    p_tree_id                   => p_tree,
    p_inspector                 => p_inspector,
    p_fecha_inspeccion          => p_fecha,
    p_fecha_registro            => (now() AT TIME ZONE 'America/Santiago')::date,
    p_rule_version              => '2.1',
    p_tipo_inspeccion_realizada => p_tipo,
    p_subtipo_inspeccion        => NULL,
    p_metodo_instrumental       => NULL,
    p_resultado_general         => NULL,
    p_requiere_mantenimiento    => false,
    p_observaciones             => NULL,
    p_registrado_por            => p_inspector,
    p_variables                 => p_variables,
    p_campos_arbol              => p_variables,
    p_campos_registrados_arbol  => ARRAY(SELECT jsonb_object_keys(p_variables))
  )->>'inspection_id')::uuid;

  INSERT INTO public.photos (id, tree_id, storage_path, vista, inspection_id, maintenance_record_id, incident_id, uploaded_by)
  SELECT gen_random_uuid(), p_tree, 'tree-photos/027/' || v_insp || '/' || vista || '.jpg', vista, v_insp, NULL, NULL, p_inspector
  FROM unnest(ARRAY['arbol_completo', 'base', 'tronco', 'copa']) AS vista;

  RETURN v_insp;
END;
$$;

CREATE FUNCTION pg_temp.finalizar(p_insp uuid, p_inspector uuid, p_variables jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
BEGIN
  PERFORM public.fn_finalizar_inspeccion(
    p_inspection_id                     => p_insp,
    p_usuario                           => p_inspector,
    p_resultado                         => pg_temp.resultado_prueba(p_variables => p_variables),
    p_ajustes                           => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 365,
    p_fecha_proximo_monitoreo_sugerida  => v_hoy + 180,
    p_fecha_proxima_inspeccion          => v_hoy + 365,
    p_fecha_proximo_monitoreo           => v_hoy + 180,
    p_justificacion_ajuste_fecha        => NULL
  );
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_project_id uuid;
  v_sector_id uuid;
  v_municipal uuid;
  v_municipal_otro uuid;
  v_inspector uuid;
  v_admin uuid;
  v_tree1 uuid;
  v_tree2 uuid;
  v_ot1 uuid;
  v_ot2a uuid;
  v_ot2b uuid;
  v_i1 uuid;
  v_i2a uuid;
  v_i2b uuid;
  v_res jsonb;
  v_composicion jsonb;
  v_resultado jsonb := jsonb_build_object('rule_version', '2.1', 'motor_commit', 'prueba-027', 'clasificacion_riesgo_calculada', 'bajo');
  v_assessments_antes int;
BEGIN
  -- 1. Usuarios, proyecto y sector
  v_municipal      := pg_temp.crear_usuario_prueba(p_email => 'muni_027@sivu.example.test',  p_rol => 'usuario_municipal', p_nombre => 'Municipal 027');
  v_municipal_otro := pg_temp.crear_usuario_prueba(p_email => 'muni2_027@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Municipal Otro 027');
  v_inspector      := pg_temp.crear_usuario_prueba(p_email => 'insp_027@sivu.example.test',  p_rol => 'inspector',         p_nombre => 'Inspector 027');
  v_admin          := pg_temp.crear_usuario_prueba(p_email => 'admin_027@sivu.example.test', p_rol => 'admin',             p_nombre => 'Admin 027');

  INSERT INTO public.projects (nombre_proyecto, created_by)
  VALUES ('027 prueba ' || gen_random_uuid(), v_municipal)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector)
  VALUES (v_project_id, 'Sector 027', pg_temp.geom_sector())
  RETURNING id INTO v_sector_id;

  -- municipal_otro NO es miembro; el Administrador tampoco (se rechaza por rol).
  INSERT INTO public.project_members (project_id, user_id, added_by)
  VALUES (v_project_id, v_municipal, v_municipal),
         (v_project_id, v_inspector, v_municipal);

  v_tree1 := (public.fn_create_tree_alta(
    p_project_id            => v_project_id,
    p_sector_id             => v_sector_id,
    p_sector                => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza 027 uno',
    p_utm_este              => 256000,
    p_utm_norte             => 6341000,
    p_especie_cientifica    => 'Cryptocarya alba',
    p_nombre_comun          => 'Peumo',
    p_fecha_registro        => v_hoy,
    p_registrado_por        => v_municipal
  )->>'id')::uuid;

  v_tree2 := (public.fn_create_tree_alta(
    p_project_id            => v_project_id,
    p_sector_id             => v_sector_id,
    p_sector                => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza 027 dos',
    p_utm_este              => 256010,
    p_utm_norte             => 6341010,
    p_especie_cientifica    => 'Cryptocarya alba',
    p_nombre_comun          => 'Peumo',
    p_fecha_registro        => v_hoy,
    p_registrado_por        => v_municipal
  )->>'id')::uuid;

  -- ===================================================================
  -- Árbol 1 — OT sin completar
  -- ===================================================================
  v_ot1 := pg_temp.ot_en_ejecucion(p_project => v_project_id, p_tree => v_tree1, p_accion => 'evaluacion_inicial', p_inspector => v_inspector, p_municipal => v_municipal);
  v_i1 := pg_temp.borrador(p_ot => v_ot1, p_tree => v_tree1, p_inspector => v_inspector, p_tipo => 'evaluacion_inicial', p_fecha => v_hoy, p_variables => '{"dap_cm": 20}'::jsonb);

  -- A0: inspección en Preguardado -> SV069 (D-209)
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => 'Error de registro', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A0: debió rechazar anular una inspección en Preguardado';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A0 OK: rechazó anular una inspección en Preguardado');
  END;

  PERFORM pg_temp.finalizar(p_insp => v_i1, p_inspector => v_inspector, p_variables => '{"dap_cm": 20}'::jsonb);

  -- A1: OT sin completar con evaluación -> SV069
  BEGIN
    PERFORM public.fn_anular_inspeccion(
      p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => 'Error de registro',
      p_evaluacion    => jsonb_build_object('composicion', public.fn_entradas_vigentes_previas(p_tree_id => v_tree1, p_inspeccion_excluida => v_i1), 'resultado', v_resultado)
    );
    RAISE EXCEPTION 'FALLA A1: debió rechazar evaluación en una OT sin completar';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A1 OK: rechazó evaluación en una OT sin completar');
  END;

  -- A2: motivo obligatorio (D-210)
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => '   ', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A2a: debió rechazar motivo solo espacios';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A2a OK: rechazó motivo solo espacios');
  END;
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => NULL, p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A2b: debió rechazar motivo NULL';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A2b OK: rechazó motivo NULL');
  END;

  -- A3: solo el Usuario municipal miembro anula (CC-067)
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_inspector, p_motivo => 'Error de registro', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A3a: debió rechazar al Inspector';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A3a OK: rechazó al Inspector');
  END;
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_admin, p_motivo => 'Error de registro', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A3b: debió rechazar al Administrador';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A3b OK: rechazó al Administrador');
  END;
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal_otro, p_motivo => 'Error de registro', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A3c: debió rechazar al Usuario municipal no miembro';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A3c OK: rechazó al Usuario municipal no miembro');
  END;

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections WHERE id = v_i1 AND estado_registro = 'finalizado'),
    'A3d: la inspección cambió de estado tras intentos rechazados'
  );

  -- A4: anular en OT sin completar -> solo cambia el estado
  v_res := public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => '  Error de registro  ', p_evaluacion => NULL);

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections
            WHERE id = v_i1 AND estado_registro = 'anulado' AND motivo_anulacion = 'Error de registro'
              AND anulado_por = v_municipal AND fecha_anulacion IS NOT NULL),
    'A4a: la inspección no quedó anulada con motivo, anulado_por y fecha_anulacion (D-209 a D-212)'
  );
  PERFORM pg_temp.assert((v_res->>'vigente_recalculada')::boolean = false, 'A4b: vigente_recalculada debió ser false');
  PERFORM pg_temp.assert(
    NOT EXISTS (SELECT 1 FROM public.tree_assessments WHERE tree_id = v_tree1),
    'A4c: anular en OT sin completar no debe insertar en tree_assessments'
  );
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.work_orders WHERE id = v_ot1 AND estado_ot = 'en_ejecucion'),
    'A4d: la OT cambió de estado al anular'
  );
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree1 AND vigente_desde_inspection_id IS NULL),
    'A4e: el árbol quedó con vigencia de una inspección de OT sin completar'
  );
  INSERT INTO test_log (msg) VALUES ('A4 OK: anulación en OT sin completar, solo cambia el estado');

  -- A5: segunda anulación -> SV069
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i1, p_usuario => v_municipal, p_motivo => 'Otra vez', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA A5: debió rechazar la segunda anulación';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('A5 OK: rechazó la segunda anulación');
  END;

  -- ===================================================================
  -- Árbol 2 — OT completada
  -- ===================================================================
  -- OT 2a: dap 30 y altura 9, inspección de ayer.
  v_ot2a := pg_temp.ot_en_ejecucion(p_project => v_project_id, p_tree => v_tree2, p_accion => 'evaluacion_inicial', p_inspector => v_inspector, p_municipal => v_municipal);
  v_i2a := pg_temp.borrador(p_ot => v_ot2a, p_tree => v_tree2, p_inspector => v_inspector, p_tipo => 'evaluacion_inicial', p_fecha => v_hoy - 1, p_variables => '{"dap_cm": 30, "altura_total_m": 9}'::jsonb);
  PERFORM pg_temp.finalizar(p_insp => v_i2a, p_inspector => v_inspector, p_variables => '{"dap_cm": 30, "altura_total_m": 9}'::jsonb);
  PERFORM public.fn_complete_work_order_inspeccion(p_work_order_id => v_ot2a, p_usuario => v_municipal, p_evaluaciones => pg_temp.evaluaciones_prueba(p_ot => v_ot2a));

  -- OT 2b: dap 35, inspección de hoy. Queda vigente dap 35 (2b) y altura 9 (2a).
  v_ot2b := pg_temp.ot_en_ejecucion(p_project => v_project_id, p_tree => v_tree2, p_accion => 'reevaluacion', p_inspector => v_inspector, p_municipal => v_municipal);
  v_i2b := pg_temp.borrador(p_ot => v_ot2b, p_tree => v_tree2, p_inspector => v_inspector, p_tipo => 'reevaluacion', p_fecha => v_hoy, p_variables => '{"dap_cm": 35}'::jsonb);
  PERFORM pg_temp.finalizar(p_insp => v_i2b, p_inspector => v_inspector, p_variables => '{"dap_cm": 35}'::jsonb);
  PERFORM public.fn_complete_work_order_inspeccion(p_work_order_id => v_ot2b, p_usuario => v_municipal, p_evaluaciones => pg_temp.evaluaciones_prueba(p_ot => v_ot2b));

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree2 AND dap_cm = 35 AND altura_total_m = 9 AND vigente_desde_inspection_id = v_i2b),
    'B0: preparación incorrecta, el árbol 2 debió quedar con dap 35 (2b) y altura 9 (2a)'
  );
  SELECT count(*) INTO v_assessments_antes FROM public.tree_assessments WHERE tree_id = v_tree2;

  -- B1: OT completada sin evaluación -> SV069
  BEGIN
    PERFORM public.fn_anular_inspeccion(p_inspection_id => v_i2b, p_usuario => v_municipal, p_motivo => 'DAP mal medido', p_evaluacion => NULL);
    RAISE EXCEPTION 'FALLA B1: debió exigir la evaluación recalculada';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('B1 OK: exigió la evaluación recalculada en OT completada');
  END;

  -- B2: composición alterada -> SV068
  v_composicion := public.fn_entradas_vigentes_previas(p_tree_id => v_tree2, p_inspeccion_excluida => v_i2b);
  BEGIN
    PERFORM public.fn_anular_inspeccion(
      p_inspection_id => v_i2b, p_usuario => v_municipal, p_motivo => 'DAP mal medido',
      p_evaluacion    => jsonb_build_object('composicion', jsonb_set(v_composicion, '{entradas_vigentes,dap_cm}', '99'), 'resultado', v_resultado)
    );
    RAISE EXCEPTION 'FALLA B2: debió rechazar la composición alterada';
  EXCEPTION WHEN SQLSTATE 'SV068' THEN
    INSERT INTO test_log (msg) VALUES ('B2 OK: rechazó la composición alterada (SV068)');
  END;

  -- B3: composición sin excluir la inspección (la vigente de hoy) -> SV068
  BEGIN
    PERFORM public.fn_anular_inspeccion(
      p_inspection_id => v_i2b, p_usuario => v_municipal, p_motivo => 'DAP mal medido',
      p_evaluacion    => jsonb_build_object('composicion', public.fn_entradas_vigentes_previas(p_tree_id => v_tree2), 'resultado', v_resultado)
    );
    RAISE EXCEPTION 'FALLA B3: debió rechazar la composición que aún incluye la inspección';
  EXCEPTION WHEN SQLSTATE 'SV068' THEN
    INSERT INTO test_log (msg) VALUES ('B3 OK: rechazó la composición que aún incluye la inspección (SV068)');
  END;

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections WHERE id = v_i2b AND estado_registro = 'finalizado')
    AND (SELECT count(*) FROM public.tree_assessments WHERE tree_id = v_tree2) = v_assessments_antes
    AND EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree2 AND dap_cm = 35),
    'B3b: tras SV068 quedó algo escrito'
  );

  -- B4: anular en OT completada -> recalcula como si la inspección no existiera (CC-045 a)
  v_res := public.fn_anular_inspeccion(
    p_inspection_id => v_i2b, p_usuario => v_municipal, p_motivo => 'DAP mal medido',
    p_evaluacion    => jsonb_build_object('composicion', v_composicion, 'resultado', v_resultado)
  );

  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.inspections
            WHERE id = v_i2b AND estado_registro = 'anulado' AND anulado_por = v_municipal AND fecha_anulacion IS NOT NULL),
    'B4a: la inspección no quedó anulada'
  );
  PERFORM pg_temp.assert((v_res->>'vigente_recalculada')::boolean = true, 'B4b: vigente_recalculada debió ser true');
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree2 AND dap_cm = 30 AND altura_total_m = 9 AND vigente_desde_inspection_id = v_i2a),
    'B4c: el árbol no volvió a dap 30 y vigencia desde la inspección 2a'
  );
  PERFORM pg_temp.assert(
    EXISTS (SELECT 1 FROM public.v_tree_current_inputs
            WHERE tree_id = v_tree2 AND (entradas_vigentes->>'dap_cm')::numeric = 30
              AND origen_por_campo->>'dap_cm' = v_i2a::text),
    'B4d: v_tree_current_inputs no refleja dap 30 con origen en la inspección 2a'
  );
  PERFORM pg_temp.assert(
    (SELECT count(*) FROM public.tree_assessments
      WHERE tree_id = v_tree2 AND evento = 'inspeccion_anulada' AND inspection_id = v_i2b
        AND work_order_id IS NULL AND rule_version = '2.1' AND motor_commit = 'prueba-027'
        AND (entradas_vigentes->'dap_cm'->>'valor')::numeric = 30
        AND entradas_vigentes->'dap_cm'->>'inspection_id' = v_i2a::text) = 1,
    'B4e: falta la fila inspeccion_anulada en tree_assessments con la composición recalculada'
  );
  PERFORM pg_temp.assert(
    (SELECT count(*) FROM public.tree_assessments WHERE tree_id = v_tree2) = v_assessments_antes + 1,
    'B4f: tree_assessments debió crecer en una sola fila'
  );
  PERFORM pg_temp.assert(
    public.fn_entradas_vigentes_previas(p_tree_id => v_tree2)
      = (SELECT jsonb_build_object('entradas_vigentes', entradas_vigentes, 'origen_por_campo', origen_por_campo)
         FROM public.v_tree_current_inputs WHERE tree_id = v_tree2),
    'B4g: fn_entradas_vigentes_previas difiere de v_tree_current_inputs tras anular'
  );
  INSERT INTO test_log (msg) VALUES ('B4 OK: anulación en OT completada recalculó la vigente, refrescó el árbol e insertó inspeccion_anulada');

  -- B5: segunda anulación -> SV069
  BEGIN
    PERFORM public.fn_anular_inspeccion(
      p_inspection_id => v_i2b, p_usuario => v_municipal, p_motivo => 'Otra vez',
      p_evaluacion    => jsonb_build_object('composicion', v_composicion, 'resultado', v_resultado)
    );
    RAISE EXCEPTION 'FALLA B5: debió rechazar la segunda anulación';
  EXCEPTION WHEN SQLSTATE 'SV069' THEN
    INSERT INTO test_log (msg) VALUES ('B5 OK: rechazó la segunda anulación en OT completada');
  END;

END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
