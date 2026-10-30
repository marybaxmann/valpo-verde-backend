-- =====================================================================
-- Pruebas de la migración 018f — árbol nuevo en Levantamiento (#58; CC-052)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018f.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuario de prueba temporal en
-- auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql.
--
-- L1: primer guardado de un Levantamiento sin tree_id — crea el árbol,
--     su versión de alta (inspection_id NULL) y el borrador, todo junto.
-- L2: segundo guardado sin tree_id — se rechaza; con el tree_id
--     devuelto por L1 — actualiza, sin duplicar.
-- L3: árbol nuevo fuera del sector — se rechaza (SV046) y no queda
--     ninguna fila (ni árbol, ni versión, ni borrador).
-- L4: alta en terreno sin especie ni nombre común — se rechaza (SV057).
-- L5 (la importante): la inspección se finaliza, la OT se completa, la
--     inspección se anula y corre fn_refresh_tree_current — el árbol
--     conserva sus datos de alta (ubicación, sector, nombre).
-- L6: la OT de Levantamiento se cancela — el árbol sigue en trees con
--     sus datos de alta (CC-052).
-- L7: dos árboles nuevos en la misma OT de Levantamiento, uno por
--     inspección — los dos se crean bien (AMD-19).

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
  v_inspector uuid;
  v_no_inspector uuid;
  v_wo_id uuid;
  v_wo_id_2 uuid;
  v_wo_id_4 uuid;
  v_wo_id_5 uuid;
  v_wo_id_6 uuid;
  v_res jsonb;
  v_inspection_id uuid;
  v_tree_id uuid;
  v_tree_id_4 uuid;
  v_tree_id_5 uuid;
  v_tree_id_6a uuid;
  v_tree_id_6b uuid;
  v_inspection_id_4 uuid;
  v_inspection_id_6a uuid;
  v_inspection_id_6b uuid;
  v_trees_antes integer;
  v_trees_despues integer;
  v_tree record;
  v_alta record;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(p_email => 'inspector-018f@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (018f)');
  v_no_inspector := pg_temp.crear_usuario_prueba(p_email => 'municipal-018f@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (018f)');

  INSERT INTO projects (nombre_proyecto) VALUES ('018f prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector) VALUES (
    v_project_id, 'Sector de prueba',
    ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
      'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
    ), 32719), 4326))::geography
  ) RETURNING id INTO v_sector_id;

  -- ------------------------------------------------------------------
  -- L1 — primer guardado de un Levantamiento sin tree_id: crea árbol +
  -- alta + borrador, todo junto.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento L1'
  ) RETURNING id INTO v_wo_id;

  v_res := fn_save_inspection_draft(
    p_inspection_id := NULL, p_work_order_id := v_wo_id, p_tree_id := NULL,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
    p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Junto al poste 12',
    p_nuevo_arbol_utm_este := 256200, p_nuevo_arbol_utm_norte := 6341000,
    p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := 'Árbol nuevo L1'
  );

  v_inspection_id := (v_res->>'inspection_id')::uuid;
  v_tree_id := (v_res->>'tree_id')::uuid;
  IF v_tree_id IS NULL OR v_inspection_id IS NULL OR (v_res->>'evaluation_id') IS NULL THEN
    RAISE EXCEPTION 'L1 FALLA: respuesta incompleta: %', v_res;
  END IF;
  IF (v_res->>'arbol_nuevo')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'L1 FALLA: arbol_nuevo no vino true: %', v_res;
  END IF;

  SELECT * INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.project_id <> v_project_id OR v_tree.sector_id <> v_sector_id
     OR v_tree.sector <> 'Barrio Puerto' OR v_tree.nombre_comun <> 'Árbol nuevo L1' THEN
    RAISE EXCEPTION 'L1 FALLA: trees no quedó con los datos del alta: %', row_to_json(v_tree);
  END IF;

  SELECT * INTO v_alta FROM tree_data_versions WHERE tree_id = v_tree_id AND inspection_id IS NULL;
  IF v_alta.sector <> 'Barrio Puerto' OR v_alta.nombre_comun <> 'Árbol nuevo L1'
     OR v_alta.campos_registrados <> ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte', 'nombre_comun'] THEN
    RAISE EXCEPTION 'L1 FALLA: no se creó la fila de alta correctamente: %', row_to_json(v_alta);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND tree_id = v_tree_id AND estado_registro = 'preguardado') THEN
    RAISE EXCEPTION 'L1 FALLA: la inspección no quedó Preguardado con el árbol nuevo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L1 OK');

  -- ------------------------------------------------------------------
  -- L2 — segundo guardado sin tree_id: se rechaza; con el tree_id de
  -- L1: actualiza, sin duplicar.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      p_inspection_id := v_inspection_id, p_work_order_id := v_wo_id, p_tree_id := NULL,
      p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
      p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
      p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
      p_observaciones := NULL, p_registrado_por := v_inspector,
      p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL
    );
    RAISE EXCEPTION 'L2 FALLA: se aceptó un segundo guardado sin tree_id';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;

  v_res := fn_save_inspection_draft(
    p_inspection_id := v_inspection_id, p_work_order_id := v_wo_id, p_tree_id := v_tree_id,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := 'Continuado', p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{"raices_expuestas": true}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL
  );
  IF (v_res->>'inspection_id')::uuid <> v_inspection_id THEN
    RAISE EXCEPTION 'L2 FALLA: inspection_id cambió';
  END IF;
  IF (v_res->>'arbol_nuevo')::boolean IS TRUE THEN
    RAISE EXCEPTION 'L2 FALLA: el segundo guardado volvió a crear un árbol nuevo';
  END IF;
  IF (SELECT count(*) FROM trees WHERE sector = 'Barrio Puerto' AND nombre_comun = 'Árbol nuevo L1') <> 1 THEN
    RAISE EXCEPTION 'L2 FALLA: se duplicó el árbol';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L2 OK');

  -- ------------------------------------------------------------------
  -- L3 — árbol nuevo fuera del sector: se rechaza (SV046) y no queda
  -- ninguna fila.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento L3'
  ) RETURNING id INTO v_wo_id_2;

  SELECT count(*) INTO v_trees_antes FROM trees;

  BEGIN
    PERFORM fn_save_inspection_draft(
      p_inspection_id := NULL, p_work_order_id := v_wo_id_2, p_tree_id := NULL,
      p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
      p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
      p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
      p_observaciones := NULL, p_registrado_por := v_inspector,
      p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
      p_nuevo_arbol_sector := 'Fuera de sector', p_nuevo_arbol_ubicacion_descriptiva := 'Muy lejos',
      p_nuevo_arbol_utm_este := 100000, p_nuevo_arbol_utm_norte := 6000000,
      p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := 'Árbol fuera de sector'
    );
    RAISE EXCEPTION 'L3 FALLA: se aceptó un árbol nuevo fuera del sector';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    NULL;
  END;

  SELECT count(*) INTO v_trees_despues FROM trees;
  IF v_trees_despues <> v_trees_antes THEN
    RAISE EXCEPTION 'L3 FALLA: quedó un árbol creado a pesar del rechazo (antes %, después %)', v_trees_antes, v_trees_despues;
  END IF;
  IF EXISTS (SELECT 1 FROM inspections WHERE work_order_id = v_wo_id_2) THEN
    RAISE EXCEPTION 'L3 FALLA: quedó una inspección creada a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L3 OK');

  -- ------------------------------------------------------------------
  -- L4 — alta en terreno sin especie ni nombre común: se rechaza (SV057).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      p_inspection_id := NULL, p_work_order_id := v_wo_id_2, p_tree_id := NULL,
      p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
      p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
      p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
      p_observaciones := NULL, p_registrado_por := v_inspector,
      p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
      p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Sin nombre',
      p_nuevo_arbol_utm_este := 256300, p_nuevo_arbol_utm_norte := 6341000,
      p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := NULL
    );
    RAISE EXCEPTION 'L4 FALLA: se aceptó un alta sin especie ni nombre común';
  EXCEPTION WHEN SQLSTATE 'SV057' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM inspections WHERE work_order_id = v_wo_id_2) THEN
    RAISE EXCEPTION 'L4 FALLA: quedó una inspección creada a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L4 OK');

  -- ------------------------------------------------------------------
  -- L5 — finalizar, completar la OT, anular la inspección y refrescar:
  -- el árbol conserva sus datos de alta.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento L5'
  ) RETURNING id INTO v_wo_id_4;

  v_res := fn_save_inspection_draft(
    p_inspection_id := NULL, p_work_order_id := v_wo_id_4, p_tree_id := NULL,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
    p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Frente al kiosco',
    p_nuevo_arbol_utm_este := 256400, p_nuevo_arbol_utm_norte := 6341000,
    p_nuevo_arbol_especie_cientifica := 'Jacaranda mimosifolia', p_nuevo_arbol_nombre_comun := 'Jacarandá L5'
  );
  v_inspection_id_4 := (v_res->>'inspection_id')::uuid;
  v_tree_id_4 := (v_res->>'tree_id')::uuid;

  UPDATE inspections SET estado_registro = 'finalizado', finalizada_at = now() WHERE id = v_inspection_id_4;
  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = current_date WHERE id = v_wo_id_4;
  UPDATE inspections SET
    estado_registro = 'anulado', motivo_anulacion = 'Prueba L5 (anulación posterior)',
    anulado_por = v_inspector, fecha_anulacion = now()
  WHERE id = v_inspection_id_4;

  PERFORM fn_refresh_tree_current(v_tree_id_4);

  SELECT * INTO v_tree FROM trees WHERE id = v_tree_id_4;
  IF v_tree.sector IS DISTINCT FROM 'Barrio Puerto'
     OR v_tree.ubicacion_descriptiva IS DISTINCT FROM 'Frente al kiosco'
     OR v_tree.nombre_comun IS DISTINCT FROM 'Jacarandá L5'
     OR v_tree.especie_cientifica IS DISTINCT FROM 'Jacaranda mimosifolia' THEN
    RAISE EXCEPTION 'L5 FALLA: el árbol perdió sus datos de alta tras anular la única inspección: %', row_to_json(v_tree);
  END IF;
  INSERT INTO test_log (msg) VALUES ('L5 OK');

  -- ------------------------------------------------------------------
  -- L6 — la OT de Levantamiento se cancela: el árbol sigue en trees
  -- con sus datos de alta.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento L6'
  ) RETURNING id INTO v_wo_id_5;

  v_res := fn_save_inspection_draft(
    p_inspection_id := NULL, p_work_order_id := v_wo_id_5, p_tree_id := NULL,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
    p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Plaza chica',
    p_nuevo_arbol_utm_este := 256500, p_nuevo_arbol_utm_norte := 6341000,
    p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := 'Árbol L6'
  );
  v_tree_id_5 := (v_res->>'tree_id')::uuid;

  -- Desde la 025 (CC-050) una OT cancelada exige motivo, quién y cuándo
  -- (chk_work_orders_cancelada).
  UPDATE work_orders SET estado_ot = 'cancelada', motivo_cancelacion = 'Prueba L6',
    cancelado_por = v_no_inspector, fecha_cancelacion = now()
  WHERE id = v_wo_id_5;

  IF NOT EXISTS (
    SELECT 1 FROM trees WHERE id = v_tree_id_5 AND sector = 'Barrio Puerto' AND nombre_comun = 'Árbol L6'
  ) THEN
    RAISE EXCEPTION 'L6 FALLA: el árbol no quedó en el inventario con sus datos de alta tras cancelar la OT';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L6 OK');

  -- ------------------------------------------------------------------
  -- L7 — dos árboles nuevos en la misma OT de Levantamiento, uno por
  -- inspección (AMD-19).
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento L7 (varios árboles)'
  ) RETURNING id INTO v_wo_id_6;

  v_res := fn_save_inspection_draft(
    p_inspection_id := NULL, p_work_order_id := v_wo_id_6, p_tree_id := NULL,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
    p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Árbol A de L7',
    p_nuevo_arbol_utm_este := 256600, p_nuevo_arbol_utm_norte := 6341000,
    p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := 'Árbol L7-A'
  );
  v_inspection_id_6a := (v_res->>'inspection_id')::uuid;
  v_tree_id_6a := (v_res->>'tree_id')::uuid;

  v_res := fn_save_inspection_draft(
    p_inspection_id := NULL, p_work_order_id := v_wo_id_6, p_tree_id := NULL,
    p_inspector := v_inspector, p_fecha_inspeccion := current_date, p_fecha_registro := current_date,
    p_rule_version := '2.1', p_tipo_inspeccion_realizada := 'levantamiento', p_subtipo_inspeccion := NULL,
    p_metodo_instrumental := NULL, p_resultado_general := NULL, p_requiere_mantenimiento := NULL,
    p_observaciones := NULL, p_registrado_por := v_inspector,
    p_variables := '{}'::jsonb, p_campos_arbol := '{}'::jsonb, p_campos_registrados_arbol := NULL,
    p_nuevo_arbol_sector := 'Barrio Puerto', p_nuevo_arbol_ubicacion_descriptiva := 'Árbol B de L7',
    p_nuevo_arbol_utm_este := 256700, p_nuevo_arbol_utm_norte := 6341000,
    p_nuevo_arbol_especie_cientifica := NULL, p_nuevo_arbol_nombre_comun := 'Árbol L7-B'
  );
  v_inspection_id_6b := (v_res->>'inspection_id')::uuid;
  v_tree_id_6b := (v_res->>'tree_id')::uuid;

  IF v_tree_id_6a IS NULL OR v_tree_id_6b IS NULL OR v_tree_id_6a = v_tree_id_6b THEN
    RAISE EXCEPTION 'L7 FALLA: los dos árboles no quedaron distintos (% / %)', v_tree_id_6a, v_tree_id_6b;
  END IF;
  IF v_inspection_id_6a = v_inspection_id_6b THEN
    RAISE EXCEPTION 'L7 FALLA: las dos inspecciones se mezclaron en una sola';
  END IF;
  IF (SELECT count(*) FROM inspections WHERE work_order_id = v_wo_id_6) <> 2 THEN
    RAISE EXCEPTION 'L7 FALLA: no quedaron dos inspecciones en la misma OT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id_6a AND tree_id = v_tree_id_6a) THEN
    RAISE EXCEPTION 'L7 FALLA: la inspección A no quedó con su propio árbol';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id_6b AND tree_id = v_tree_id_6b) THEN
    RAISE EXCEPTION 'L7 FALLA: la inspección B no quedó con su propio árbol';
  END IF;
  INSERT INTO test_log (msg) VALUES ('L7 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
