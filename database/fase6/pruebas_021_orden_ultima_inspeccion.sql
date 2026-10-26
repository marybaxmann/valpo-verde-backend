-- =====================================================================
-- Pruebas de la migración 021 — criterio único de «la última» inspección
-- (CC-055; REGLAS_GENERALES fila 13)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 021.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuarios de prueba temporales
-- en auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql.
--
-- Regresión obligatoria, además de este archivo (cambia
-- fn_refresh_tree_current): pruebas_018d_alta_version.sql,
-- pruebas_018f_levantamiento.sql y pruebas_018i_catalogo_especies.sql.
--
-- `now()` es el mismo en toda la transacción: donde importa el
-- desempate por `created_at`, se fija a mano para que el criterio
-- anterior (sin `fecha_inspeccion`) eligiera la fila equivocada.
--
-- O1 (pedida por la responsable): dos OT completadas el mismo día con
--     distinta fecha_inspeccion — gana la de fecha_inspeccion más
--     reciente, aunque la otra se haya creado después. En
--     fn_refresh_tree_current (valor y vigente_desde_inspection_id) y
--     en v_tree_current_inputs (valor y origen_por_campo).
-- O2: mismo día y misma fecha_inspeccion — gana created_at más reciente.
-- O3: fecha_completada_ot manda sobre fecha_inspeccion — gana la OT
--     completada más tarde aunque su inspección sea más antigua.

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

CREATE FUNCTION pg_temp.crear_arbol(p_municipal uuid) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
BEGIN
  INSERT INTO projects (nombre_proyecto) VALUES ('021 prueba ' || gen_random_uuid()) RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;
  RETURN (fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => p_municipal
  )->>'id')::uuid;
END;
$$;

-- Inspección Finalizada de una OT Completada que registra altura_total_m
-- (tree_data_versions) y raices_expuestas (evaluations.variables).
-- p_created_at fija el created_at de la inspección y de su
-- tree_data_versions.
CREATE FUNCTION pg_temp.inspeccion_completada(
  p_tree_id uuid, p_inspector uuid, p_municipal uuid,
  p_fecha_inspeccion date, p_fecha_completada date, p_created_at timestamptz,
  p_altura numeric, p_raices_expuestas boolean
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_wo_id uuid;
  v_inspection_id uuid;
BEGIN
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    (SELECT project_id FROM trees WHERE id = p_tree_id), p_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, p_municipal, p_inspector
  ) RETURNING id INTO v_wo_id;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, finalizada_at, tipo_inspeccion_realizada,
    rule_version, fecha_inspeccion, fecha_registro, registrado_por, created_at
  ) VALUES (
    p_tree_id, p_inspector, v_wo_id, 'finalizado', now(), 'evaluacion_inicial',
    '2.1', p_fecha_inspeccion, p_fecha_inspeccion, p_inspector, p_created_at
  ) RETURNING id INTO v_inspection_id;

  INSERT INTO evaluations (inspection_id, tree_id, variables)
  VALUES (v_inspection_id, p_tree_id, jsonb_build_object('raices_expuestas', p_raices_expuestas));

  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, altura_total_m, created_by, created_at)
  VALUES (p_tree_id, v_inspection_id, ARRAY['altura_total_m'], p_altura, p_inspector, p_created_at);

  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = p_fecha_completada WHERE id = v_wo_id;

  RETURN v_inspection_id;
END;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_inspector uuid;
  v_municipal uuid;
  v_tree_id uuid;
  v_a uuid;
  v_b uuid;
  v_tree record;
  v_inputs record;
  v_hoy date := current_date;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-021@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (021)'
  );
  v_municipal := pg_temp.crear_usuario_prueba(
    p_email => 'municipal-021@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (021)'
  );

  -- ------------------------------------------------------------------
  -- O1 — mismo día de completada, distinta fecha_inspeccion. B (la de
  -- fecha_inspeccion más reciente) tiene el created_at MÁS ANTIGUO: con
  -- el criterio anterior (fecha_completada_ot, created_at) ganaba A.
  -- ------------------------------------------------------------------
  v_tree_id := pg_temp.crear_arbol(p_municipal => v_municipal);
  v_b := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 4, p_fecha_completada => v_hoy - 2, p_created_at => now() - interval '1 hour',
    p_altura => 12, p_raices_expuestas => true
  );
  v_a := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 6, p_fecha_completada => v_hoy - 2, p_created_at => now(),
    p_altura => 10, p_raices_expuestas => false
  );

  PERFORM fn_refresh_tree_current(v_tree_id);
  SELECT altura_total_m, vigente_desde_inspection_id INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.altura_total_m IS DISTINCT FROM 12 OR v_tree.vigente_desde_inspection_id IS DISTINCT FROM v_b THEN
    RAISE EXCEPTION 'O1 FALLA (fn_refresh_tree_current): altura % / vigente_desde % (esperado 12 / %)',
      v_tree.altura_total_m, v_tree.vigente_desde_inspection_id, v_b;
  END IF;

  SELECT entradas_vigentes, origen_por_campo INTO v_inputs FROM v_tree_current_inputs WHERE tree_id = v_tree_id;
  IF (v_inputs.entradas_vigentes->>'raices_expuestas') IS DISTINCT FROM 'true'
     OR (v_inputs.origen_por_campo->>'raices_expuestas')::uuid IS DISTINCT FROM v_b THEN
    RAISE EXCEPTION 'O1 FALLA (v_tree_current_inputs): % / % (esperado true / %)',
      v_inputs.entradas_vigentes, v_inputs.origen_por_campo, v_b;
  END IF;
  INSERT INTO test_log (msg) VALUES ('O1 OK');

  -- ------------------------------------------------------------------
  -- O2 — mismo día y misma fecha_inspeccion: gana created_at más reciente (A).
  -- ------------------------------------------------------------------
  v_tree_id := pg_temp.crear_arbol(p_municipal => v_municipal);
  v_b := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 4, p_fecha_completada => v_hoy - 2, p_created_at => now() - interval '1 hour',
    p_altura => 12, p_raices_expuestas => true
  );
  v_a := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 4, p_fecha_completada => v_hoy - 2, p_created_at => now(),
    p_altura => 10, p_raices_expuestas => false
  );

  PERFORM fn_refresh_tree_current(v_tree_id);
  SELECT altura_total_m, vigente_desde_inspection_id INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.altura_total_m IS DISTINCT FROM 10 OR v_tree.vigente_desde_inspection_id IS DISTINCT FROM v_a THEN
    RAISE EXCEPTION 'O2 FALLA (fn_refresh_tree_current): altura % / vigente_desde %', v_tree.altura_total_m, v_tree.vigente_desde_inspection_id;
  END IF;
  SELECT entradas_vigentes, origen_por_campo INTO v_inputs FROM v_tree_current_inputs WHERE tree_id = v_tree_id;
  IF (v_inputs.origen_por_campo->>'raices_expuestas')::uuid IS DISTINCT FROM v_a THEN
    RAISE EXCEPTION 'O2 FALLA (v_tree_current_inputs): %', v_inputs.origen_por_campo;
  END IF;
  INSERT INTO test_log (msg) VALUES ('O2 OK');

  -- ------------------------------------------------------------------
  -- O3 — fecha_completada_ot manda: A se inspeccionó antes pero su OT se
  -- completó después → gana A.
  -- ------------------------------------------------------------------
  v_tree_id := pg_temp.crear_arbol(p_municipal => v_municipal);
  v_a := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 20, p_fecha_completada => v_hoy - 1, p_created_at => now() - interval '1 hour',
    p_altura => 10, p_raices_expuestas => false
  );
  v_b := pg_temp.inspeccion_completada(
    p_tree_id => v_tree_id, p_inspector => v_inspector, p_municipal => v_municipal,
    p_fecha_inspeccion => v_hoy - 5, p_fecha_completada => v_hoy - 3, p_created_at => now(),
    p_altura => 12, p_raices_expuestas => true
  );

  PERFORM fn_refresh_tree_current(v_tree_id);
  SELECT altura_total_m, vigente_desde_inspection_id INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.altura_total_m IS DISTINCT FROM 10 OR v_tree.vigente_desde_inspection_id IS DISTINCT FROM v_a THEN
    RAISE EXCEPTION 'O3 FALLA (fn_refresh_tree_current): altura % / vigente_desde %', v_tree.altura_total_m, v_tree.vigente_desde_inspection_id;
  END IF;
  SELECT entradas_vigentes, origen_por_campo INTO v_inputs FROM v_tree_current_inputs WHERE tree_id = v_tree_id;
  IF (v_inputs.origen_por_campo->>'raices_expuestas')::uuid IS DISTINCT FROM v_a THEN
    RAISE EXCEPTION 'O3 FALLA (v_tree_current_inputs): %', v_inputs.origen_por_campo;
  END IF;
  INSERT INTO test_log (msg) VALUES ('O3 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
