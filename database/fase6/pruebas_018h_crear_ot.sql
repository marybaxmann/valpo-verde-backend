-- =====================================================================
-- Pruebas de la migración 018h — fn_create_work_order_inspeccion (#58)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018h.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuarios de prueba temporales
-- en auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql.
--
-- H1: creación válida (evaluación inicial) — se acepta, estado_ot = pendiente.
-- H2: creado_por sin rol usuario_municipal — se rechaza.
-- H3: creado_por no miembro del proyecto — se rechaza.
-- H4: responsable sin rol Inspector — se rechaza (D-244).
-- H5: responsable no miembro del proyecto — se rechaza (D-244).
-- H6: subtipo_accion no válido para accion_solicitada — se rechaza.
-- H7: tree_id NULL en una OT que no es Levantamiento — se rechaza.
-- H8: tree_id de otro proyecto — se rechaza.
-- H9: Levantamiento con tree_id NOT NULL — se rechaza (D-232/AMD-19).
-- H10: Levantamiento sin observaciones — se rechaza (D-246).
-- H11: incident_id de otro proyecto — se rechaza.
-- H12: prioridad inválida — se rechaza (D-238).
-- H13: Levantamiento válido (tree_id NULL, observaciones presente) — se acepta.

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
  v_project_id_2 uuid;
  v_sector_id uuid;
  v_sector_id_2 uuid;
  v_municipal uuid;
  v_municipal_no_miembro uuid;
  v_inspector uuid;
  v_inspector_no_miembro uuid;
  v_no_inspector uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_tree_id_2 uuid;
  v_incident_id uuid;
  v_incident_id_2 uuid;
  v_res jsonb;
BEGIN
  v_municipal := pg_temp.crear_usuario_prueba('municipal-018h@sivu.example.test', 'usuario_municipal', 'Usuario municipal de prueba (018h)');
  v_municipal_no_miembro := pg_temp.crear_usuario_prueba('municipal-no-miembro-018h@sivu.example.test', 'usuario_municipal', 'Usuario municipal sin membresía (018h)');
  v_inspector := pg_temp.crear_usuario_prueba('inspector-018h@sivu.example.test', 'inspector', 'Inspector de prueba (018h)');
  v_inspector_no_miembro := pg_temp.crear_usuario_prueba('inspector-no-miembro-018h@sivu.example.test', 'inspector', 'Inspector sin membresía (018h)');
  v_no_inspector := pg_temp.crear_usuario_prueba('no-inspector-018h@sivu.example.test', 'usuario_municipal', 'Usuario sin rol Inspector (018h)');

  INSERT INTO projects (nombre_proyecto) VALUES ('018h prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector) VALUES (
    v_project_id, 'Sector de prueba',
    ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
      'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
    ), 32719), 4326))::geography
  ) RETURNING id INTO v_sector_id;

  INSERT INTO project_members (project_id, user_id) VALUES
    (v_project_id, v_municipal),
    (v_project_id, v_inspector),
    (v_project_id, v_no_inspector);

  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_municipal
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  -- Segundo proyecto, con su propio árbol e incidencia — para H8/H11.
  INSERT INTO projects (nombre_proyecto) VALUES ('018h prueba (otro proyecto)') RETURNING id INTO v_project_id_2;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector) VALUES (
    v_project_id_2, 'Sector de prueba 2',
    ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
      'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
    ), 32719), 4326))::geography
  ) RETURNING id INTO v_sector_id_2;
  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id_2, p_sector_id => v_sector_id_2,
    p_sector => 'Otro barrio', p_ubicacion_descriptiva => 'En el otro proyecto',
    p_utm_este => 256050, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_municipal
  );
  v_tree_id_2 := (v_tree_res->>'id')::uuid;

  INSERT INTO incidents (tree_id, project_id, tipo_incidencia) VALUES (v_tree_id, v_project_id, 'otra')
    RETURNING id INTO v_incident_id;
  INSERT INTO incidents (tree_id, project_id, tipo_incidencia) VALUES (v_tree_id_2, v_project_id_2, 'otra')
    RETURNING id INTO v_incident_id_2;

  -- ------------------------------------------------------------------
  -- H1 — creación válida: se acepta, estado_ot = pendiente.
  -- ------------------------------------------------------------------
  v_res := fn_create_work_order_inspeccion(
    v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, 'Motivo de prueba', 'media', NULL,
    v_inspector, v_municipal, current_date
  );
  IF (v_res->>'estado_ot') <> 'pendiente' THEN
    RAISE EXCEPTION 'H1 FALLA: estado_ot = %', v_res->>'estado_ot';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE id = (v_res->>'id')::uuid AND tipo_ot = 'inspeccion') THEN
    RAISE EXCEPTION 'H1 FALLA: no se creó la OT';
  END IF;
  INSERT INTO test_log (msg) VALUES ('H1 OK');

  -- ------------------------------------------------------------------
  -- H2 — creado_por sin rol usuario_municipal.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector, v_inspector, current_date
    );
    RAISE EXCEPTION 'H2 FALLA: se aceptó un creado_por sin rol usuario_municipal';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H2 OK');

  -- ------------------------------------------------------------------
  -- H3 — creado_por no miembro del proyecto.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector, v_municipal_no_miembro, current_date
    );
    RAISE EXCEPTION 'H3 FALLA: se aceptó un creado_por sin membresía';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H3 OK');

  -- ------------------------------------------------------------------
  -- H4 — responsable sin rol Inspector (D-244).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_no_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H4 FALLA: se aceptó un responsable sin rol Inspector';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H4 OK');

  -- ------------------------------------------------------------------
  -- H5 — responsable no miembro del proyecto (D-244).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector_no_miembro, v_municipal, current_date
    );
    RAISE EXCEPTION 'H5 FALLA: se aceptó un responsable sin membresía';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H5 OK');

  -- ------------------------------------------------------------------
  -- H6 — subtipo_accion no válido para accion_solicitada.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'monitoreo', 'tomografia_sonica', NULL, 'media', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H6 FALLA: se aceptó un subtipo que no pertenece al tipo';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H6 OK');

  -- ------------------------------------------------------------------
  -- H7 — tree_id NULL en una OT que no es Levantamiento.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, NULL, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H7 FALLA: se aceptó tree_id NULL fuera de Levantamiento';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H7 OK');

  -- ------------------------------------------------------------------
  -- H8 — tree_id de otro proyecto.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id_2, NULL, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H8 FALLA: se aceptó un árbol de otro proyecto';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H8 OK');

  -- ------------------------------------------------------------------
  -- H9 — Levantamiento con tree_id NOT NULL (D-232/AMD-19).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'levantamiento', NULL, NULL, 'media', 'Área de prueba',
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H9 FALLA: se aceptó un Levantamiento con tree_id';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H9 OK');

  -- ------------------------------------------------------------------
  -- H10 — Levantamiento sin observaciones (D-246).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, NULL, NULL, 'levantamiento', NULL, NULL, 'media', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H10 FALLA: se aceptó un Levantamiento sin observaciones';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H10 OK');

  -- ------------------------------------------------------------------
  -- H11 — incident_id de otro proyecto.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, v_incident_id_2, 'evaluacion_inicial', NULL, NULL, 'media', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H11 FALLA: se aceptó una incidencia de otro proyecto';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H11 OK');

  -- ------------------------------------------------------------------
  -- H12 — prioridad inválida (D-238).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_work_order_inspeccion(
      v_project_id, v_tree_id, NULL, 'evaluacion_inicial', NULL, NULL, 'urgente', NULL,
      v_inspector, v_municipal, current_date
    );
    RAISE EXCEPTION 'H12 FALLA: se aceptó una prioridad inválida';
  EXCEPTION WHEN SQLSTATE 'SV060' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('H12 OK');

  -- ------------------------------------------------------------------
  -- H13 — Levantamiento válido (tree_id NULL, observaciones presente),
  -- con incident_id del mismo proyecto.
  -- ------------------------------------------------------------------
  v_res := fn_create_work_order_inspeccion(
    v_project_id, NULL, v_incident_id, 'levantamiento', NULL, NULL, 'alta', 'Área de prueba de Levantamiento',
    v_inspector, v_municipal, current_date
  );
  IF (v_res->>'tree_id') IS NOT NULL THEN
    RAISE EXCEPTION 'H13 FALLA: tree_id debería ser NULL en Levantamiento: %', v_res->>'tree_id';
  END IF;
  IF (v_res->>'incident_id')::uuid <> v_incident_id THEN
    RAISE EXCEPTION 'H13 FALLA: incident_id no coincide';
  END IF;
  INSERT INTO test_log (msg) VALUES ('H13 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
