-- =====================================================================
-- Pruebas de la migración 024 — fn_miembros_proyecto (CC-065 punto 6;
-- PR-018 v6.0)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 024.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuarios de prueba temporales
-- en auth.users (%@sivu.example.test), mismo patrón que
-- pruebas_lecturas_jwt.sql. Cada llamada se hace como `authenticated`
-- con los claims del JWT de quien llama.
--
-- M1: un Inspector miembro ve id, nombre y rol de los miembros del
--     proyecto, incluido un miembro inactivo.
-- M2: un Inspector de otro proyecto no ve ninguna fila.
-- M3: el Administrador (sin membresía) ve los miembros.
-- M4: un miembro inactivo que llama no ve ninguna fila.
-- M5: la función devuelve solo (id, nombre, rol): nunca el correo.
-- M6: EXECUTE para authenticated, no para anon.

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

-- Llama a fn_miembros_proyecto como `authenticated` con los claims del
-- JWT de p_usuario; devuelve las filas como jsonb (lista).
CREATE FUNCTION pg_temp.miembros_como(p_usuario uuid, p_project_id uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_usuario::text, true);
  SET LOCAL ROLE authenticated;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.nombre), '[]'::jsonb) INTO v_resultado
  FROM public.fn_miembros_proyecto(p_project_id => p_project_id) AS m;

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
  v_municipal uuid;
  v_inactivo uuid;
  v_inspector_otro uuid;
  v_admin uuid;
  v_project_id uuid;
  v_project_otro uuid;
  v_r jsonb;
  v_resultado text;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(p_email => 'inspector-024@sivu.example.test', p_rol => 'inspector', p_nombre => 'A Inspector (024)');
  v_municipal := pg_temp.crear_usuario_prueba(p_email => 'municipal-024@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'B Municipal (024)');
  v_inactivo := pg_temp.crear_usuario_prueba(p_email => 'inactivo-024@sivu.example.test', p_rol => 'encargado_mantencion', p_nombre => 'C Encargado inactivo (024)');
  v_inspector_otro := pg_temp.crear_usuario_prueba(p_email => 'inspector-otro-024@sivu.example.test', p_rol => 'inspector', p_nombre => 'D Inspector otro (024)');
  v_admin := pg_temp.crear_usuario_prueba(p_email => 'admin-024@sivu.example.test', p_rol => 'admin', p_nombre => 'E Administrador (024)');
  UPDATE public.user_profiles SET activo = false WHERE id = v_inactivo;

  INSERT INTO projects (nombre_proyecto) VALUES ('024 prueba ' || gen_random_uuid()) RETURNING id INTO v_project_id;
  INSERT INTO projects (nombre_proyecto) VALUES ('024 prueba, otro ' || gen_random_uuid()) RETURNING id INTO v_project_otro;
  INSERT INTO project_members (project_id, user_id) VALUES
    (v_project_id, v_inspector), (v_project_id, v_municipal), (v_project_id, v_inactivo),
    (v_project_otro, v_inspector_otro);

  -- M1
  v_r := pg_temp.miembros_como(p_usuario => v_inspector, p_project_id => v_project_id);
  IF v_r <> jsonb_build_array(
       jsonb_build_object('id', v_inspector, 'nombre', 'A Inspector (024)', 'rol', 'inspector'),
       jsonb_build_object('id', v_municipal, 'nombre', 'B Municipal (024)', 'rol', 'usuario_municipal'),
       jsonb_build_object('id', v_inactivo, 'nombre', 'C Encargado inactivo (024)', 'rol', 'encargado_mantencion')
     ) THEN
    RAISE EXCEPTION 'M1 FALLA: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M1 OK: ' || jsonb_array_length(v_r) || ' miembros');

  -- M2
  v_r := pg_temp.miembros_como(p_usuario => v_inspector_otro, p_project_id => v_project_id);
  IF v_r <> '[]'::jsonb THEN
    RAISE EXCEPTION 'M2 FALLA: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M2 OK: ninguna fila');

  -- M3
  v_r := pg_temp.miembros_como(p_usuario => v_admin, p_project_id => v_project_id);
  IF jsonb_array_length(v_r) <> 3 THEN
    RAISE EXCEPTION 'M3 FALLA: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M3 OK: 3 miembros');

  -- M4
  v_r := pg_temp.miembros_como(p_usuario => v_inactivo, p_project_id => v_project_id);
  IF v_r <> '[]'::jsonb THEN
    RAISE EXCEPTION 'M4 FALLA: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M4 OK: ninguna fila');

  -- M5
  SELECT pg_get_function_result('public.fn_miembros_proyecto(uuid)'::regprocedure) INTO v_resultado;
  IF v_resultado IS DISTINCT FROM 'TABLE(id uuid, nombre text, rol text)' THEN
    RAISE EXCEPTION 'M5 FALLA: %', v_resultado;
  END IF;
  v_r := pg_temp.miembros_como(p_usuario => v_inspector, p_project_id => v_project_id);
  IF v_r::text LIKE '%@%' THEN
    RAISE EXCEPTION 'M5 FALLA: la respuesta contiene un correo: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M5 OK: ' || v_resultado);

  -- M6
  IF NOT has_function_privilege('authenticated', 'public.fn_miembros_proyecto(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.fn_miembros_proyecto(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'M6 FALLA: privilegios de EXECUTE inesperados';
  END IF;
  INSERT INTO test_log (msg) VALUES ('M6 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
