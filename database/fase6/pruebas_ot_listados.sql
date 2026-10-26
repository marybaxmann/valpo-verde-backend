-- =====================================================================
-- Pruebas de RLS de los listados de OT (B3, B4; CC-065; PR-018 v6.0)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`. Todo corre dentro de
-- BEGIN … ROLLBACK. Usuarios de prueba temporales en auth.users
-- (%@sivu.example.test), mismo patrón que pruebas_lecturas_jwt.sql.
--
-- Jest simula la base: esta prueba comprueba en la base real lo que B3 y
-- B4 leen con el JWT del usuario — work_orders, trees, projects y
-- fn_miembros_proyecto — como segunda capa de la autorización del
-- backend. La regla por rol (el Inspector solo sus OT de Inspección, el
-- Encargado ninguna de Inspección) la aplica el backend, no la RLS.
--
-- Datos: un proyecto con una OT de Inspección del Inspector, otra de
-- Inspección de otro Inspector del mismo proyecto y una de Mantenimiento
-- del Encargado; un segundo proyecto con su propio Inspector.
--
-- L1: el Inspector miembro lee las tres OT del proyecto, su árbol, el
--     proyecto y los nombres de los miembros (fn_miembros_proyecto).
-- L2: el filtro de B4 (responsable_accion_id = el usuario) con el JWT del
--     Inspector deja solo su OT, en cualquier proyecto donde es miembro.
-- L3: el Encargado miembro lee las OT del proyecto (la RLS lo permite; el
--     backend le quita las de Inspección) y su OT de Mantenimiento.
-- L4: un Inspector de otro proyecto no ve ninguna OT, árbol, proyecto ni
--     miembro del primero.
-- L5: el Usuario municipal no lee directamente el perfil de otro usuario
--     (RLS de user_profiles, 005), pero sí su nombre por fn_miembros_proyecto.

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

-- Lo que leen B3 y B4, como `authenticated` con los claims del JWT de p_usuario.
CREATE FUNCTION pg_temp.listados_como(p_usuario uuid, p_project_id uuid, p_tree_id uuid, p_otro_usuario uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_usuario::text, true);
  SET LOCAL ROLE authenticated;

  SELECT jsonb_build_object(
    'ots_proyecto', (SELECT count(*) FROM public.work_orders WHERE project_id = p_project_id),
    'ots_mantenimiento', (SELECT count(*) FROM public.work_orders WHERE project_id = p_project_id AND tipo_ot = 'mantenimiento'),
    'mis_ots', (SELECT count(*) FROM public.work_orders WHERE responsable_accion_id = p_usuario),
    'arbol', (SELECT count(*) FROM public.trees WHERE id = p_tree_id AND ubicacion IS NOT NULL),
    'proyecto', (SELECT count(*) FROM public.projects WHERE id = p_project_id),
    'miembros', (SELECT COALESCE(jsonb_agg(m.nombre ORDER BY m.nombre), '[]'::jsonb) FROM public.fn_miembros_proyecto(p_project_id => p_project_id) AS m),
    'perfil_ajeno', (SELECT count(*) FROM public.user_profiles WHERE id = p_otro_usuario)
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
  v_inspector_2 uuid;
  v_encargado uuid;
  v_municipal uuid;
  v_inspector_otro uuid;
  v_project_id uuid;
  v_project_otro uuid;
  v_sector_id uuid;
  v_tree_id uuid;
  v_r jsonb;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(p_email => 'inspector-ot@sivu.example.test', p_rol => 'inspector', p_nombre => 'A Inspector (listados)');
  v_inspector_2 := pg_temp.crear_usuario_prueba(p_email => 'inspector2-ot@sivu.example.test', p_rol => 'inspector', p_nombre => 'B Inspector 2 (listados)');
  v_encargado := pg_temp.crear_usuario_prueba(p_email => 'encargado-ot@sivu.example.test', p_rol => 'encargado_mantencion', p_nombre => 'C Encargado (listados)');
  v_municipal := pg_temp.crear_usuario_prueba(p_email => 'municipal-ot@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'D Municipal (listados)');
  v_inspector_otro := pg_temp.crear_usuario_prueba(p_email => 'inspector-otro-ot@sivu.example.test', p_rol => 'inspector', p_nombre => 'E Inspector otro (listados)');

  INSERT INTO projects (nombre_proyecto) VALUES ('listados OT ' || gen_random_uuid()) RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;
  INSERT INTO projects (nombre_proyecto) VALUES ('listados OT, otro ' || gen_random_uuid()) RETURNING id INTO v_project_otro;

  INSERT INTO project_members (project_id, user_id) VALUES
    (v_project_id, v_inspector), (v_project_id, v_inspector_2), (v_project_id, v_encargado),
    (v_project_id, v_municipal), (v_project_otro, v_inspector_otro);

  v_tree_id := (fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => v_municipal
  )->>'id')::uuid;

  INSERT INTO work_orders (project_id, tree_id, tipo_ot, accion_solicitada, prioridad, estado_ot, ot_creado_por, responsable_accion_id)
  VALUES
    (v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'alta', 'pendiente', v_municipal, v_inspector),
    (v_project_id, v_tree_id, 'inspeccion', 'reevaluacion', 'media', 'pendiente', v_municipal, v_inspector_2),
    (v_project_id, v_tree_id, 'mantenimiento', 'poda', 'baja', 'pendiente', v_municipal, v_encargado);
  UPDATE work_orders SET subtipo_accion = 'sanitaria' WHERE project_id = v_project_id AND tipo_ot = 'mantenimiento';

  -- L1 y L2 — Inspector miembro.
  v_r := pg_temp.listados_como(p_usuario => v_inspector, p_project_id => v_project_id, p_tree_id => v_tree_id, p_otro_usuario => v_inspector_2);
  IF (v_r->>'ots_proyecto')::int <> 3 OR (v_r->>'ots_mantenimiento')::int <> 1
     OR (v_r->>'arbol')::int <> 1 OR (v_r->>'proyecto')::int <> 1
     OR v_r->'miembros' <> '["A Inspector (listados)", "B Inspector 2 (listados)", "C Encargado (listados)", "D Municipal (listados)"]'::jsonb THEN
    RAISE EXCEPTION 'L1 FALLA (Inspector miembro): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('L1 OK (Inspector miembro): ' || v_r::text);
  IF (v_r->>'mis_ots')::int <> 1 THEN
    RAISE EXCEPTION 'L2 FALLA (B4 del Inspector): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('L2 OK (B4 del Inspector): 1 OT');

  -- L3 — Encargado miembro.
  v_r := pg_temp.listados_como(p_usuario => v_encargado, p_project_id => v_project_id, p_tree_id => v_tree_id, p_otro_usuario => v_inspector);
  IF (v_r->>'ots_proyecto')::int <> 3 OR (v_r->>'mis_ots')::int <> 1 OR (v_r->>'ots_mantenimiento')::int <> 1 THEN
    RAISE EXCEPTION 'L3 FALLA (Encargado miembro): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('L3 OK (Encargado miembro): ' || v_r::text);

  -- L4 — Inspector de otro proyecto.
  v_r := pg_temp.listados_como(p_usuario => v_inspector_otro, p_project_id => v_project_id, p_tree_id => v_tree_id, p_otro_usuario => v_inspector);
  IF (v_r->>'ots_proyecto')::int <> 0 OR (v_r->>'ots_mantenimiento')::int <> 0 OR (v_r->>'mis_ots')::int <> 0
     OR (v_r->>'arbol')::int <> 0 OR (v_r->>'proyecto')::int <> 0 OR v_r->'miembros' <> '[]'::jsonb THEN
    RAISE EXCEPTION 'L4 FALLA (Inspector de otro proyecto): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('L4 OK (Inspector de otro proyecto): ' || v_r::text);

  -- L5 — Usuario municipal: el perfil ajeno no, el nombre por la función sí.
  v_r := pg_temp.listados_como(p_usuario => v_municipal, p_project_id => v_project_id, p_tree_id => v_tree_id, p_otro_usuario => v_inspector);
  IF (v_r->>'perfil_ajeno')::int <> 0 OR NOT (v_r->'miembros' ? 'A Inspector (listados)') THEN
    RAISE EXCEPTION 'L5 FALLA (Usuario municipal): %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('L5 OK (Usuario municipal): perfil ajeno 0, nombre por fn_miembros_proyecto');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
