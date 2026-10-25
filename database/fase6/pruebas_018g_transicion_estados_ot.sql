-- =====================================================================
-- Pruebas de la migración 018g — fn_transition_work_order_estado (#58; CC-050)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018g.
-- Todo corre dentro de BEGIN … ROLLBACK: nada de este script queda en
-- la base, incluido el usuario de prueba descrito abajo (mismo patrón
-- autorizado por la responsable que en pruebas_018e_inspection_draft.sql).
--
-- G1: Pendiente -> Programada sin fecha_accion_programada — se rechaza, SV059.
-- G2: Pendiente -> Programada con fecha anterior a fecha_creacion_ot — se
--     rechaza, SV059 (D-241).
-- G3: Pendiente -> Programada con fecha válida — se acepta, fija estado y fecha.
-- G4: Programada -> En ejecución — se acepta.
-- G5: Pendiente -> En ejecución directo (salto) — se rechaza, SV059.
-- G6: otro usuario (no el responsable) intenta transicionar — se rechaza.
-- G7: OT de Mantenimiento — se rechaza (no implementado aquí, mensaje remite al #61).

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
  v_otro_inspector uuid;
  v_no_inspector uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_wo_id uuid;
  v_wo_id_2 uuid;
  v_wo_id_mant uuid;
  v_res jsonb;
  v_fecha_creacion date;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba('inspector-018g@sivu.example.test', 'inspector', 'Inspector de prueba (018g)');
  v_otro_inspector := pg_temp.crear_usuario_prueba('otro-inspector-018g@sivu.example.test', 'inspector', 'Otro inspector de prueba (018g)');
  v_no_inspector := pg_temp.crear_usuario_prueba('municipal-018g@sivu.example.test', 'usuario_municipal', 'Usuario municipal de prueba (018g)');

  INSERT INTO projects (nombre_proyecto) VALUES ('018g prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector) VALUES (
    v_project_id, 'Sector de prueba',
    ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
      'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
    ), 32719), 4326))::geography
  ) RETURNING id INTO v_sector_id;

  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_no_inspector
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'pendiente',
    v_no_inspector, v_inspector
  ) RETURNING id, fecha_creacion_ot INTO v_wo_id, v_fecha_creacion;

  -- ------------------------------------------------------------------
  -- G1 — Pendiente -> Programada sin fecha_accion_programada: SV059.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_transition_work_order_estado(v_wo_id, 'programada', NULL, v_inspector);
    RAISE EXCEPTION 'G1 FALLA: se aceptó pasar a Programada sin fecha_accion_programada';
  EXCEPTION WHEN SQLSTATE 'SV059' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM work_orders WHERE id = v_wo_id AND estado_ot <> 'pendiente') THEN
    RAISE EXCEPTION 'G1 FALLA: el estado cambió a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('G1 OK');

  -- ------------------------------------------------------------------
  -- G2 — fecha_accion_programada anterior a fecha_creacion_ot: SV059 (D-241).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_transition_work_order_estado(v_wo_id, 'programada', v_fecha_creacion - 1, v_inspector);
    RAISE EXCEPTION 'G2 FALLA: se aceptó una fecha_accion_programada anterior a la creación de la OT';
  EXCEPTION WHEN SQLSTATE 'SV059' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM work_orders WHERE id = v_wo_id AND estado_ot <> 'pendiente') THEN
    RAISE EXCEPTION 'G2 FALLA: el estado cambió a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('G2 OK');

  -- ------------------------------------------------------------------
  -- G3 — Pendiente -> Programada con fecha válida: se acepta.
  -- ------------------------------------------------------------------
  v_res := fn_transition_work_order_estado(v_wo_id, 'programada', v_fecha_creacion, v_inspector);
  IF (v_res->>'estado_ot') <> 'programada' THEN
    RAISE EXCEPTION 'G3 FALLA: la respuesta no informa estado_ot = programada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE id = v_wo_id AND estado_ot = 'programada' AND fecha_accion_programada = v_fecha_creacion) THEN
    RAISE EXCEPTION 'G3 FALLA: la OT no quedó Programada con la fecha indicada';
  END IF;
  INSERT INTO test_log (msg) VALUES ('G3 OK');

  -- ------------------------------------------------------------------
  -- G4 — Programada -> En ejecución: se acepta.
  -- ------------------------------------------------------------------
  v_res := fn_transition_work_order_estado(v_wo_id, 'en_ejecucion', NULL, v_inspector);
  IF (v_res->>'estado_ot') <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'G4 FALLA: la respuesta no informa estado_ot = en_ejecucion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE id = v_wo_id AND estado_ot = 'en_ejecucion') THEN
    RAISE EXCEPTION 'G4 FALLA: la OT no quedó En ejecución';
  END IF;
  INSERT INTO test_log (msg) VALUES ('G4 OK');

  -- ------------------------------------------------------------------
  -- G5 — Pendiente -> En ejecución directo (salto): se rechaza, SV059.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'pendiente',
    v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id_2;

  BEGIN
    PERFORM fn_transition_work_order_estado(v_wo_id_2, 'en_ejecucion', NULL, v_inspector);
    RAISE EXCEPTION 'G5 FALLA: se aceptó el salto directo de Pendiente a En ejecución';
  EXCEPTION WHEN SQLSTATE 'SV059' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM work_orders WHERE id = v_wo_id_2 AND estado_ot <> 'pendiente') THEN
    RAISE EXCEPTION 'G5 FALLA: el estado cambió a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('G5 OK');

  -- ------------------------------------------------------------------
  -- G6 — otro usuario (no el responsable) intenta transicionar: SV059.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_transition_work_order_estado(v_wo_id_2, 'programada', current_date, v_otro_inspector);
    RAISE EXCEPTION 'G6 FALLA: otro usuario pudo transicionar sin ser el responsable';
  EXCEPTION WHEN SQLSTATE 'SV059' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('G6 OK');

  -- ------------------------------------------------------------------
  -- G7 — OT de Mantenimiento: se rechaza (no implementado aquí, #61).
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'mantenimiento', 'poda', 'pendiente',
    v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id_mant;

  BEGIN
    PERFORM fn_transition_work_order_estado(v_wo_id_mant, 'programada', current_date, v_inspector);
    RAISE EXCEPTION 'G7 FALLA: se aceptó transicionar una OT de Mantenimiento';
  EXCEPTION WHEN SQLSTATE 'SV059' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('G7 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
