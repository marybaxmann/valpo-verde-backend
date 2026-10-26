-- =====================================================================
-- Pruebas de RLS de las lecturas con el JWT del usuario
-- (PR-018 v5.0; CC-064 decisiones h e i; rama wip/lecturas-jwt)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`. Todo corre dentro de
-- BEGIN … ROLLBACK. Usuarios de prueba temporales en auth.users
-- (%@sivu.example.test), mismo patrón autorizado por la responsable que
-- en pruebas_021_orden_ultima_inspeccion.sql.
--
-- Jest simula la base: esta prueba comprueba en la base real que la RLS
-- de la 017 deja leer al Inspector miembro todo lo que /calcular,
-- /finalizar y GET .../photos leen ahora con su JWT, y que un Inspector
-- de otro proyecto no ve nada.
--
-- Datos: un árbol con (1) una inspección Finalizada de una OT Completada
-- (raices_expuestas = true, fecha de próxima inspección) y (2) una
-- inspección en Preguardado de una OT En ejecución, con su borrador
-- (raices_expuestas = false), su versión del árbol y una foto.
--
-- J1: el Inspector miembro lee evaluations (el borrador), tree_data_versions,
--     trees, v_tree_current_inputs (con el valor de la inspección
--     completada, no el del borrador), v_tree_fechas_vigentes y photos.
-- J2: un Inspector de otro proyecto no ve ninguna fila de esas seis lecturas.

BEGIN;

CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
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

-- Las seis lecturas, como `authenticated` con los claims del JWT de
-- p_usuario. Devuelve lo que vio; vuelve al rol original antes de salir.
CREATE FUNCTION pg_temp.lecturas_como(p_usuario uuid, p_tree_id uuid, p_borrador_id uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_usuario::text, true);
  SET LOCAL ROLE authenticated;

  SELECT jsonb_build_object(
    'evaluations_borrador', (SELECT count(*) FROM public.evaluations WHERE inspection_id = p_borrador_id),
    'variables_borrador', (SELECT variables FROM public.evaluations WHERE inspection_id = p_borrador_id),
    'tree_data_versions', (SELECT count(*) FROM public.tree_data_versions WHERE inspection_id = p_borrador_id),
    'trees', (SELECT count(*) FROM public.trees WHERE id = p_tree_id),
    'entradas_vigentes', (SELECT entradas_vigentes FROM public.v_tree_current_inputs WHERE tree_id = p_tree_id),
    'fecha_vigente', (SELECT fecha_proxima_inspeccion FROM public.v_tree_fechas_vigentes WHERE tree_id = p_tree_id),
    'photos', (SELECT count(*) FROM public.photos WHERE inspection_id = p_borrador_id)
  ) INTO v_resultado;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  RETURN v_resultado;
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_inspector uuid;
  v_inspector_otro uuid;
  v_municipal uuid;
  v_project_id uuid;
  v_project_otro uuid;
  v_sector_id uuid;
  v_tree_id uuid;
  v_wo_completada uuid;
  v_wo_en_ejecucion uuid;
  v_completada uuid;
  v_borrador uuid;
  v_fecha_vigente date := current_date + 365;
  v_r jsonb;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-jwt@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (lecturas JWT)'
  );
  v_inspector_otro := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-otro-jwt@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de otro proyecto (lecturas JWT)'
  );
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'municipal-jwt@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (lecturas JWT)'
  );

  INSERT INTO projects (nombre_proyecto) VALUES ('lecturas JWT ' || gen_random_uuid()) RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;
  INSERT INTO projects (nombre_proyecto) VALUES ('lecturas JWT, otro ' || gen_random_uuid()) RETURNING id INTO v_project_otro;

  INSERT INTO project_members (project_id, user_id) VALUES
    (v_project_id, v_inspector), (v_project_id, v_municipal), (v_project_otro, v_inspector_otro);

  v_tree_id := (fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => v_municipal
  )->>'id')::uuid;

  -- (1) Inspección Finalizada de una OT Completada.
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date - 10, v_municipal, v_inspector
  ) RETURNING id INTO v_wo_completada;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, finalizada_at, tipo_inspeccion_realizada,
    rule_version, fecha_inspeccion, fecha_registro, registrado_por,
    fecha_proxima_inspeccion_sugerida, fecha_proximo_monitoreo_sugerida
  ) VALUES (
    v_tree_id, v_inspector, v_wo_completada, 'finalizado', now(), 'evaluacion_inicial',
    '2.1', current_date - 10, current_date - 10, v_inspector,
    v_fecha_vigente, current_date + 180
  ) RETURNING id INTO v_completada;

  INSERT INTO evaluations (inspection_id, tree_id, variables)
  VALUES (v_completada, v_tree_id, '{"raices_expuestas": true}'::jsonb);
  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, altura_total_m, created_by)
  VALUES (v_tree_id, v_completada, ARRAY['altura_total_m'], 12, v_inspector);

  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = current_date - 9 WHERE id = v_wo_completada;

  -- (2) Inspección en Preguardado de una OT En ejecución, con borrador,
  -- versión del árbol y una foto.
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'reevaluacion', 'en_ejecucion',
    current_date, v_municipal, v_inspector
  ) RETURNING id INTO v_wo_en_ejecucion;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, tipo_inspeccion_realizada,
    rule_version, fecha_inspeccion, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id, v_inspector, v_wo_en_ejecucion, 'preguardado', 'reevaluacion',
    '2.1', current_date, current_date, v_inspector
  ) RETURNING id INTO v_borrador;

  INSERT INTO evaluations (inspection_id, tree_id, variables)
  VALUES (v_borrador, v_tree_id, '{"raices_expuestas": false}'::jsonb);
  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, altura_total_m, created_by)
  VALUES (v_tree_id, v_borrador, ARRAY['altura_total_m'], 13, v_inspector);
  INSERT INTO photos (tree_id, storage_path, vista, inspection_id, uploaded_by)
  VALUES (v_tree_id, 'p/t/inspeccion/prueba-jwt.jpg', 'base', v_borrador, v_inspector);

  -- ------------------------------------------------------------------
  -- J1 — Inspector miembro del proyecto.
  -- ------------------------------------------------------------------
  v_r := pg_temp.lecturas_como(p_usuario => v_inspector, p_tree_id => v_tree_id, p_borrador_id => v_borrador);
  IF (v_r->>'evaluations_borrador')::int <> 1
     OR (v_r->'variables_borrador'->>'raices_expuestas') IS DISTINCT FROM 'false'
     OR (v_r->>'tree_data_versions')::int <> 1
     OR (v_r->>'trees')::int <> 1
     OR (v_r->'entradas_vigentes'->>'raices_expuestas') IS DISTINCT FROM 'true'
     OR (v_r->>'fecha_vigente')::date IS DISTINCT FROM v_fecha_vigente
     OR (v_r->>'photos')::int <> 1 THEN
    RAISE EXCEPTION 'J1 FALLA (Inspector miembro): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('J1 OK (Inspector miembro): ' || v_r::text);

  -- ------------------------------------------------------------------
  -- J2 — Inspector de otro proyecto.
  -- ------------------------------------------------------------------
  v_r := pg_temp.lecturas_como(p_usuario => v_inspector_otro, p_tree_id => v_tree_id, p_borrador_id => v_borrador);
  IF (v_r->>'evaluations_borrador')::int <> 0
     OR v_r->'variables_borrador' <> 'null'::jsonb
     OR (v_r->>'tree_data_versions')::int <> 0
     OR (v_r->>'trees')::int <> 0
     OR v_r->'entradas_vigentes' <> 'null'::jsonb
     OR v_r->'fecha_vigente' <> 'null'::jsonb
     OR (v_r->>'photos')::int <> 0 THEN
    RAISE EXCEPTION 'J2 FALLA (Inspector de otro proyecto): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('J2 OK (Inspector de otro proyecto): ' || v_r::text);
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
