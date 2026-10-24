-- =====================================================================
-- Pruebas de la migración 018e — evaluations en Preguardado (#58; CC-048/CC-050)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018e.
-- Todo corre dentro de BEGIN … ROLLBACK: nada de este script queda en
-- la base, incluidos los usuarios de prueba descritos abajo.
--
-- Usuarios de prueba temporales en auth.users (autorizado por la
-- responsable, 2026-10-23, solo en valpo-verde-conecta-pruebas, solo
-- dentro de este BEGIN … ROLLBACK): no existía ningún usuario con rol
-- Inspector en esta base (verificado, solo lectura, antes de pedir la
-- autorización) — B0 a B5, B7 a B10 necesitan al menos uno, y B6/B11
-- necesitan un segundo Inspector distinto (para probar "otro
-- Inspector" y la reasignación) más uno sin rol Inspector (B7). Se
-- crean con el mínimo de columnas de auth.users (id, email y las
-- obligatorias) y su fila en user_profiles, con correos ficticios en
-- `sivu.example.test` (dominio reservado para pruebas, RFC 2606 —
-- nunca un correo real). Después del ROLLBACK, quien corra este
-- script debe confirmar con una consulta de solo lectura que no quedó
-- ningún usuario con ese dominio en auth.users ni en user_profiles.
--
-- B0: crear con la OT Pendiente — se rechaza, SV058.
-- B1: primer guardado con la OT En ejecución — crea las tres filas.
-- B2: guardar dos veces en Preguardado — actualiza, no duplica.
-- B3: la OT se cancela con la inspección Preguardada (permitido) — el
--     guardado siguiente se rechaza porque ya no está En ejecución.
-- B4: guardar sobre una inspección Finalizada — se rechaza, SV058.
-- B5: violar el CHECK de coherencia — se rechaza (UPDATE directo).
-- B6: otro Inspector del proyecto (no el responsable de esa OT) intenta
--     guardar — se rechaza.
-- B7: un usuario sin rol Inspector intenta guardar — se rechaza.
-- B8: tipo_inspeccion_realizada no corresponde a la Accion_solicitada
--     de la OT — se rechaza.
-- B9: árbol distinto al de la OT — se rechaza.
-- B10: un guardado sin campos de ARBOLES borra la fila de tree_data_versions.
-- B11: tras reasignar la OT, el Inspector anterior se rechaza; el nuevo
--      continúa el mismo borrador.
-- B12: OT de Levantamiento (D-2; REGLAS_GENERALES fila 17), árbol de
--      OTRO proyecto — se rechaza, SV058 (D-193).
-- B13: OT de Levantamiento, árbol del MISMO proyecto que la OT — se acepta.

BEGIN;

CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
$$;

-- Crea un usuario de prueba temporal (auth.users + user_profiles) con
-- el mínimo de columnas necesario y un correo en el dominio reservado
-- de pruebas. Devuelve su id.
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
  v_project_id_2 uuid;    -- otro proyecto, para B12
  v_sector_id uuid;
  v_sector_id_2 uuid;
  v_inspector uuid;       -- Inspector 1 (responsable_accion_id de la mayoría de las OT de prueba)
  v_inspector_2 uuid;     -- Inspector 2 (B6, B11)
  v_no_inspector uuid;    -- usuario_municipal de prueba (B7)
  v_tree_res jsonb;
  v_tree_id uuid;
  v_tree2_id uuid;
  v_tree3_id uuid;        -- árbol de v_project_id_2, para B12
  v_wo_id uuid;
  v_wo_id_2 uuid;
  v_wo_id_3 uuid;
  v_wo_id_4 uuid;         -- OT de Levantamiento, para B12/B13
  v_res jsonb;
  v_inspection_id uuid;
  v_evaluation_id uuid;
  v_tdv_id uuid;
  v_eval record;
  v_tdv record;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba('inspector1@sivu.example.test', 'inspector', 'Inspector de prueba 1 (temporal, 018e)');
  v_inspector_2 := pg_temp.crear_usuario_prueba('inspector2@sivu.example.test', 'inspector', 'Inspector de prueba 2 (temporal, 018e)');
  v_no_inspector := pg_temp.crear_usuario_prueba('municipal@sivu.example.test', 'usuario_municipal', 'Usuario municipal de prueba (temporal, 018e)');

  INSERT INTO projects (nombre_proyecto) VALUES ('#58 018e prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;

  v_tree_res := fn_create_tree_alta(
    v_project_id, v_sector_id, 'Barrio Puerto', 'Frente a la plaza',
    256000, 6341000, 'Robinia pseudoacacia', 'Falsa acacia', current_date, v_no_inspector
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  v_tree_res := fn_create_tree_alta(
    v_project_id, v_sector_id, 'Barrio Puerto', 'Otro punto del mismo sector',
    256100, 6341000, 'Robinia pseudoacacia', NULL, current_date, v_no_inspector
  );
  v_tree2_id := (v_tree_res->>'id')::uuid;

  -- Segundo proyecto, con su propio árbol — para B12 (Levantamiento,
  -- árbol de otro proyecto).
  INSERT INTO projects (nombre_proyecto) VALUES ('#58 018e prueba (otro proyecto)') RETURNING id INTO v_project_id_2;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id_2, 'Sector de prueba 2', pg_temp.geom_sector()) RETURNING id INTO v_sector_id_2;
  v_tree_res := fn_create_tree_alta(
    v_project_id_2, v_sector_id_2, 'Otro barrio', 'En el otro proyecto',
    256050, 6341000, 'Robinia pseudoacacia', NULL, current_date, v_no_inspector
  );
  v_tree3_id := (v_tree_res->>'id')::uuid;

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'pendiente',
    current_date, v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id;

  -- ------------------------------------------------------------------
  -- B0 — la OT todavía está Pendiente: se rechaza, SV058.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id, v_tree_id, v_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
      '{"raices_expuestas": true}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B0 FALLA: se aceptó crear una inspección con la OT Pendiente';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM inspections WHERE work_order_id = v_wo_id) THEN
    RAISE EXCEPTION 'B0 FALLA: quedó una inspección creada a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B0 OK');

  UPDATE work_orders SET estado_ot = 'en_ejecucion' WHERE id = v_wo_id;

  -- ------------------------------------------------------------------
  -- B1 — primer guardado con la OT En ejecución: crea las tres filas.
  -- ------------------------------------------------------------------
  v_res := fn_save_inspection_draft(
    NULL, v_wo_id, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
    '{"raices_expuestas": true}'::jsonb,
    '{"dap_cm": 25.5}'::jsonb,
    ARRAY['dap_cm']
  );
  v_inspection_id := (v_res->>'inspection_id')::uuid;
  v_evaluation_id := (v_res->>'evaluation_id')::uuid;
  v_tdv_id := (v_res->>'tree_data_version_id')::uuid;

  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro = 'preguardado') THEN
    RAISE EXCEPTION 'B1 FALLA: inspections no quedó en preguardado';
  END IF;
  SELECT * INTO v_eval FROM evaluations WHERE id = v_evaluation_id;
  IF v_eval.variables <> '{"raices_expuestas": true}'::jsonb THEN
    RAISE EXCEPTION 'B1 FALLA: evaluations.variables = %', v_eval.variables;
  END IF;
  IF v_eval.variables_calculo IS NOT NULL OR v_eval.rule_version IS NOT NULL OR v_eval.motor_commit IS NOT NULL OR v_eval.calculado_at IS NOT NULL THEN
    RAISE EXCEPTION 'B1 FALLA: evaluations tiene columnas de resultado antes de calcular';
  END IF;
  SELECT * INTO v_tdv FROM tree_data_versions WHERE id = v_tdv_id;
  IF v_tdv.dap_cm <> 25.5 OR v_tdv.campos_registrados <> ARRAY['dap_cm'] THEN
    RAISE EXCEPTION 'B1 FALLA: tree_data_versions = %', row_to_json(v_tdv);
  END IF;
  INSERT INTO test_log (msg) VALUES ('B1 OK');

  -- ------------------------------------------------------------------
  -- B2 — segundo guardado (mismo inspection_id): actualiza, no duplica.
  -- ------------------------------------------------------------------
  v_res := fn_save_inspection_draft(
    v_inspection_id, v_wo_id, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, 'Resultado preliminar', NULL, NULL, v_inspector,
    '{"raices_expuestas": true, "necrosis_radicular": false}'::jsonb,
    '{"dap_cm": 26.0, "altura_total_m": 8.2}'::jsonb,
    ARRAY['dap_cm', 'altura_total_m']
  );
  IF (v_res->>'inspection_id')::uuid <> v_inspection_id THEN
    RAISE EXCEPTION 'B2 FALLA: inspection_id cambió';
  END IF;
  IF (v_res->>'evaluation_id')::uuid <> v_evaluation_id THEN
    RAISE EXCEPTION 'B2 FALLA: evaluation_id cambió (se duplicó la fila)';
  END IF;
  IF (v_res->>'tree_data_version_id')::uuid <> v_tdv_id THEN
    RAISE EXCEPTION 'B2 FALLA: tree_data_version_id cambió (se duplicó la fila)';
  END IF;
  IF (SELECT count(*) FROM evaluations WHERE inspection_id = v_inspection_id) <> 1 THEN
    RAISE EXCEPTION 'B2 FALLA: hay más de una evaluations para la misma inspección';
  END IF;
  IF (SELECT count(*) FROM tree_data_versions WHERE inspection_id = v_inspection_id) <> 1 THEN
    RAISE EXCEPTION 'B2 FALLA: hay más de una tree_data_versions para la misma inspección';
  END IF;
  SELECT * INTO v_eval FROM evaluations WHERE id = v_evaluation_id;
  IF v_eval.variables <> '{"raices_expuestas": true, "necrosis_radicular": false}'::jsonb THEN
    RAISE EXCEPTION 'B2 FALLA: variables no se actualizó: %', v_eval.variables;
  END IF;
  SELECT * INTO v_tdv FROM tree_data_versions WHERE id = v_tdv_id;
  IF v_tdv.dap_cm <> 26.0 OR v_tdv.altura_total_m <> 8.2 OR v_tdv.campos_registrados <> ARRAY['dap_cm', 'altura_total_m'] THEN
    RAISE EXCEPTION 'B2 FALLA: tree_data_versions no se actualizó: %', row_to_json(v_tdv);
  END IF;
  INSERT INTO test_log (msg) VALUES ('B2 OK');

  -- ------------------------------------------------------------------
  -- B3 — la OT se cancela con la inspección todavía Preguardada
  -- (permitido, CC-050): el siguiente guardado se rechaza con SV058
  -- porque la OT ya no está En ejecución.
  -- ------------------------------------------------------------------
  UPDATE work_orders SET estado_ot = 'cancelada' WHERE id = v_wo_id;

  BEGIN
    PERFORM fn_save_inspection_draft(
      v_inspection_id, v_wo_id, v_tree_id, v_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, 'Intento tras cancelar la OT', NULL, NULL, v_inspector,
      '{"raices_expuestas": false}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B3 FALLA: se aceptó un guardado con la OT cancelada';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  SELECT * INTO v_eval FROM evaluations WHERE id = v_evaluation_id;
  IF v_eval.variables <> '{"raices_expuestas": true, "necrosis_radicular": false}'::jsonb THEN
    RAISE EXCEPTION 'B3 FALLA: variables se modificó a pesar del rechazo: %', v_eval.variables;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM inspections WHERE id = v_inspection_id AND estado_registro = 'preguardado') THEN
    RAISE EXCEPTION 'B3 FALLA: la inspección Preguardada no se conservó tras cancelar la OT';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B3 OK');

  -- ------------------------------------------------------------------
  -- B4 — guardar sobre una inspección Finalizada (con una OT distinta,
  -- En ejecución): se rechaza, SV058.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id_2;

  v_res := fn_save_inspection_draft(
    NULL, v_wo_id_2, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
    '{"raices_expuestas": true}'::jsonb, '{}'::jsonb, NULL
  );
  v_inspection_id := (v_res->>'inspection_id')::uuid;
  v_evaluation_id := (v_res->>'evaluation_id')::uuid;

  UPDATE inspections SET estado_registro = 'finalizado', finalizada_at = now() WHERE id = v_inspection_id;

  BEGIN
    PERFORM fn_save_inspection_draft(
      v_inspection_id, v_wo_id_2, v_tree_id, v_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, 'Intento tras finalizar', NULL, NULL, v_inspector,
      '{"raices_expuestas": false}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B4 FALLA: se aceptó un guardado sobre una inspección finalizada';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  SELECT * INTO v_eval FROM evaluations WHERE id = v_evaluation_id;
  IF v_eval.variables <> '{"raices_expuestas": true}'::jsonb THEN
    RAISE EXCEPTION 'B4 FALLA: variables se modificó a pesar del rechazo: %', v_eval.variables;
  END IF;
  INSERT INTO test_log (msg) VALUES ('B4 OK');

  -- ------------------------------------------------------------------
  -- B5 — violar el CHECK de coherencia: se rechaza. Fuera de la función
  -- (que nunca toca estas columnas), con un UPDATE directo.
  -- ------------------------------------------------------------------
  BEGIN
    UPDATE evaluations SET motor_commit = 'abc1234' WHERE id = v_evaluation_id;
    RAISE EXCEPTION 'B5 FALLA: se aceptó motor_commit sin calculado_at/rule_version/variables_calculo';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('B5 OK');

  -- ------------------------------------------------------------------
  -- B6 — otro Inspector (no el responsable de v_wo_id_2) intenta
  -- guardar: se rechaza, SV058.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id_2, v_tree_id, v_inspector_2, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector_2,
      '{}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B6 FALLA: otro Inspector pudo guardar sin ser el responsable de la OT';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('B6 OK');

  -- ------------------------------------------------------------------
  -- B7 — un usuario_municipal (sin rol Inspector) intenta guardar: se
  -- rechaza, SV058.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id_2, v_tree_id, v_no_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_no_inspector,
      '{}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B7 FALLA: un usuario_municipal pudo guardar una inspección';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('B7 OK');

  -- ------------------------------------------------------------------
  -- B8 — tipo_inspeccion_realizada no corresponde a la Accion_solicitada
  -- de la OT (la OT es evaluacion_inicial, se intenta guardar monitoreo):
  -- se rechaza, SV058.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id_2, v_tree_id, v_inspector, current_date, current_date, '2.1',
      'monitoreo', 'fitosanitario', NULL, NULL, NULL, NULL, v_inspector,
      '{}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B8 FALLA: se aceptó un tipo distinto de la Accion_solicitada de la OT';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('B8 OK');

  -- ------------------------------------------------------------------
  -- B9 — árbol distinto al de la OT: se rechaza, SV058.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id_2, v_tree2_id, v_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
      '{}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B9 FALLA: se aceptó un árbol distinto al de la OT';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('B9 OK');

  -- ------------------------------------------------------------------
  -- B10 — un guardado sin campos de ARBOLES borra la fila de
  -- tree_data_versions que había dejado un guardado anterior.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id_3;

  v_res := fn_save_inspection_draft(
    NULL, v_wo_id_3, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
    '{"raices_expuestas": true}'::jsonb,
    '{"dap_cm": 30.0}'::jsonb,
    ARRAY['dap_cm']
  );
  v_inspection_id := (v_res->>'inspection_id')::uuid;
  v_tdv_id := (v_res->>'tree_data_version_id')::uuid;
  IF v_tdv_id IS NULL OR NOT EXISTS (SELECT 1 FROM tree_data_versions WHERE id = v_tdv_id) THEN
    RAISE EXCEPTION 'B10 FALLA: no se creó la fila inicial de tree_data_versions';
  END IF;

  v_res := fn_save_inspection_draft(
    v_inspection_id, v_wo_id_3, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, NULL, NULL, NULL, v_inspector,
    '{"raices_expuestas": true}'::jsonb,
    '{}'::jsonb,
    NULL
  );
  IF (v_res->>'tree_data_version_id') IS NOT NULL THEN
    RAISE EXCEPTION 'B10 FALLA: la respuesta todavía informa un tree_data_version_id';
  END IF;
  IF EXISTS (SELECT 1 FROM tree_data_versions WHERE id = v_tdv_id) THEN
    RAISE EXCEPTION 'B10 FALLA: la fila de tree_data_versions no se borró';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B10 OK');

  -- ------------------------------------------------------------------
  -- B11 — tras reasignar la OT (v_wo_id_3) del Inspector 1 al Inspector
  -- 2: el anterior se rechaza; el nuevo continúa el mismo borrador.
  -- ------------------------------------------------------------------
  UPDATE work_orders SET responsable_accion_id = v_inspector_2 WHERE id = v_wo_id_3;

  BEGIN
    PERFORM fn_save_inspection_draft(
      v_inspection_id, v_wo_id_3, v_tree_id, v_inspector, current_date, current_date, '2.1',
      'evaluacion_inicial', NULL, NULL, 'Intento del Inspector anterior', NULL, NULL, v_inspector,
      '{"raices_expuestas": true}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B11 FALLA: el Inspector anterior pudo seguir guardando tras la reasignación';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;

  v_res := fn_save_inspection_draft(
    v_inspection_id, v_wo_id_3, v_tree_id, v_inspector_2, current_date, current_date, '2.1',
    'evaluacion_inicial', NULL, NULL, 'Continuado por el nuevo responsable', NULL, NULL, v_inspector_2,
    '{"raices_expuestas": true, "necrosis_radicular": true}'::jsonb, '{}'::jsonb, NULL
  );
  IF (v_res->>'inspection_id')::uuid <> v_inspection_id THEN
    RAISE EXCEPTION 'B11 FALLA: el nuevo responsable no continuó el mismo borrador (inspection_id distinto)';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B11 OK');

  -- ------------------------------------------------------------------
  -- B12 — OT de Levantamiento (tree_id NULL en work_orders), árbol de
  -- OTRO proyecto: se rechaza, SV058 (D-193).
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id, observaciones
  ) VALUES (
    v_project_id, NULL, 'inspeccion', 'levantamiento', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector, 'Levantamiento de prueba'
  ) RETURNING id INTO v_wo_id_4;

  BEGIN
    PERFORM fn_save_inspection_draft(
      NULL, v_wo_id_4, v_tree3_id, v_inspector, current_date, current_date, '2.1',
      'levantamiento', NULL, NULL, NULL, NULL, NULL, v_inspector,
      '{}'::jsonb, '{}'::jsonb, NULL
    );
    RAISE EXCEPTION 'B12 FALLA: se aceptó un árbol de otro proyecto en un Levantamiento';
  EXCEPTION WHEN SQLSTATE 'SV058' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM inspections WHERE work_order_id = v_wo_id_4) THEN
    RAISE EXCEPTION 'B12 FALLA: quedó una inspección creada a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B12 OK');

  -- ------------------------------------------------------------------
  -- B13 — mismo Levantamiento, árbol del MISMO proyecto que la OT: se
  -- acepta.
  -- ------------------------------------------------------------------
  v_res := fn_save_inspection_draft(
    NULL, v_wo_id_4, v_tree_id, v_inspector, current_date, current_date, '2.1',
    'levantamiento', NULL, NULL, NULL, NULL, NULL, v_inspector,
    '{}'::jsonb, '{}'::jsonb, NULL
  );
  IF (v_res->>'inspection_id') IS NULL THEN
    RAISE EXCEPTION 'B13 FALLA: no se creó la inspección con un árbol del mismo proyecto';
  END IF;
  INSERT INTO test_log (msg) VALUES ('B13 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
