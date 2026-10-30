-- =====================================================================
-- Pruebas de RLS de las lecturas de B7, B17 y B18 con el JWT del usuario
-- (PR-018 v6.0; CC-064 a; CC-066; CC-050; ADR-017 v1.2)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, con 025, 026 y 027 aplicadas.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuarios de prueba temporales
-- en auth.users (%@sivu.example.test), mismo patrón que
-- pruebas_lecturas_jwt.sql.
--
-- Jest simula la base: esta prueba comprueba en la base real que la RLS
-- deja leer a los miembros del proyecto lo que B7, B17 y B18 leen con su
-- JWT, y que un usuario de otro proyecto no ve nada.
--
-- Lecturas (src/repositories/sivu/diagnostico.repository.ts e
-- inspection.repository.ts):
--   B7  trees y work_orders del proyecto (más las de B18 para el riesgo).
--   B17 inspections de la OT; evaluations y tree_data_versions de cada
--       inspección.
--   B18 trees con sus inspections finalizadas (embed inspections!tree_id),
--       evaluations de esas inspecciones y tree_assessments del proyecto
--       (embed trees!inner).
--
-- Datos: un árbol con (1) una OT completada con
-- fn_complete_work_order_inspeccion, que deja una fila en
-- tree_assessments, y (2) una OT En ejecución con una inspección en
-- Preguardado (borrador de B17).
--
-- R1: Usuario municipal, Inspector y Encargado de mantención miembros
--     ven todas las lecturas (CC-064 a).
-- R2: un Usuario municipal y un Inspector de otro proyecto no ven
--     ninguna fila.

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

-- Resultado del motor con la forma de evaluations_resultado_input (como
-- resultado_base de pruebas_020).
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
    'motor_commit', 'prueba-rls'
  );
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
    p_motivo                => 'Control RLS',
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

-- Borrador con las cuatro vistas de foto (D-27, guardián de la 026).
CREATE FUNCTION pg_temp.borrador(p_ot uuid, p_tree uuid, p_inspector uuid, p_tipo text, p_variables jsonb) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_insp uuid;
BEGIN
  v_insp := (public.fn_save_inspection_draft(
    p_inspection_id             => NULL,
    p_work_order_id             => p_ot,
    p_tree_id                   => p_tree,
    p_inspector                 => p_inspector,
    p_fecha_inspeccion          => (now() AT TIME ZONE 'America/Santiago')::date,
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
  SELECT gen_random_uuid(), p_tree, 'tree-photos/rls/' || v_insp || '/' || vista || '.jpg', vista, v_insp, NULL, NULL, p_inspector
  FROM unnest(ARRAY['arbol_completo', 'base', 'tronco', 'copa']) AS vista;

  RETURN v_insp;
END;
$$;

-- Lecturas de B7, B17 y B18 como `authenticated` con los claims del JWT
-- de p_usuario. Devuelve cuántas filas vio en cada una; vuelve al rol
-- original antes de salir.
CREATE FUNCTION pg_temp.lecturas_como(p_usuario uuid, p_project uuid, p_tree uuid, p_ot_borrador uuid, p_finalizada uuid, p_borrador uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_resultado jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_usuario::text, true);
  SET LOCAL ROLE authenticated;

  SELECT jsonb_build_object(
    'b7_trees', (SELECT count(*) FROM public.trees WHERE project_id = p_project),
    'b7_work_orders', (SELECT count(*) FROM public.work_orders WHERE project_id = p_project),
    'b18_inspecciones_finalizadas', (SELECT count(*) FROM public.trees t JOIN public.inspections i ON i.tree_id = t.id
                                     WHERE t.project_id = p_project AND i.estado_registro = 'finalizado'),
    'b18_evaluations', (SELECT count(*) FROM public.evaluations WHERE inspection_id = p_finalizada),
    'b18_tree_assessments', (SELECT count(*) FROM public.tree_assessments ta JOIN public.trees t ON t.id = ta.tree_id
                             WHERE t.project_id = p_project),
    'b17_inspections', (SELECT count(*) FROM public.inspections WHERE work_order_id = p_ot_borrador),
    'b17_evaluations', (SELECT count(*) FROM public.evaluations WHERE inspection_id = p_borrador),
    'b17_tree_data_versions', (SELECT count(*) FROM public.tree_data_versions WHERE inspection_id = p_borrador)
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
  v_municipal uuid;
  v_inspector uuid;
  v_encargado uuid;
  v_municipal_otro uuid;
  v_inspector_otro uuid;
  v_project_id uuid;
  v_project_otro uuid;
  v_sector_id uuid;
  v_tree_id uuid;
  v_ot_completada uuid;
  v_ot_borrador uuid;
  v_finalizada uuid;
  v_borrador uuid;
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_r jsonb;
  v_usuario uuid;
  v_rol text;
  v_clave text;
BEGIN
  v_municipal      := pg_temp.crear_usuario_prueba(p_email => 'muni-rls@sivu.example.test',       p_rol => 'usuario_municipal',    p_nombre => 'Municipal RLS');
  v_inspector      := pg_temp.crear_usuario_prueba(p_email => 'insp-rls@sivu.example.test',       p_rol => 'inspector',            p_nombre => 'Inspector RLS');
  v_encargado      := pg_temp.crear_usuario_prueba(p_email => 'manten-rls@sivu.example.test',     p_rol => 'encargado_mantencion', p_nombre => 'Encargado RLS');
  v_municipal_otro := pg_temp.crear_usuario_prueba(p_email => 'muni-otro-rls@sivu.example.test',  p_rol => 'usuario_municipal',    p_nombre => 'Municipal otro proyecto RLS');
  v_inspector_otro := pg_temp.crear_usuario_prueba(p_email => 'insp-otro-rls@sivu.example.test',  p_rol => 'inspector',            p_nombre => 'Inspector otro proyecto RLS');

  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('RLS B7 B17 B18 ' || gen_random_uuid(), v_municipal) RETURNING id INTO v_project_id;
  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('RLS otro ' || gen_random_uuid(), v_municipal_otro) RETURNING id INTO v_project_otro;
  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector RLS', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;

  INSERT INTO public.project_members (project_id, user_id, added_by) VALUES
    (v_project_id, v_municipal, v_municipal),
    (v_project_id, v_inspector, v_municipal),
    (v_project_id, v_encargado, v_municipal),
    (v_project_otro, v_municipal_otro, v_municipal_otro),
    (v_project_otro, v_inspector_otro, v_municipal_otro);

  v_tree_id := (public.fn_create_tree_alta(
    p_project_id            => v_project_id,
    p_sector_id             => v_sector_id,
    p_sector                => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza RLS',
    p_utm_este              => 256000,
    p_utm_norte             => 6341000,
    p_especie_cientifica    => 'Cryptocarya alba',
    p_nombre_comun          => 'Peumo',
    p_fecha_registro        => v_hoy,
    p_registrado_por        => v_municipal
  )->>'id')::uuid;

  -- (1) OT completada con su fila en tree_assessments (025).
  v_ot_completada := pg_temp.ot_en_ejecucion(p_project => v_project_id, p_tree => v_tree_id, p_accion => 'evaluacion_inicial', p_inspector => v_inspector, p_municipal => v_municipal);
  v_finalizada := pg_temp.borrador(p_ot => v_ot_completada, p_tree => v_tree_id, p_inspector => v_inspector, p_tipo => 'evaluacion_inicial', p_variables => '{"dap_cm": 30}'::jsonb);
  PERFORM public.fn_finalizar_inspeccion(
    p_inspection_id                     => v_finalizada,
    p_usuario                           => v_inspector,
    p_resultado                         => pg_temp.resultado_prueba(p_variables => '{"dap_cm": 30}'::jsonb),
    p_ajustes                           => '[]'::jsonb,
    p_fecha_proxima_inspeccion_sugerida => v_hoy + 365,
    p_fecha_proximo_monitoreo_sugerida  => v_hoy + 180,
    p_fecha_proxima_inspeccion          => v_hoy + 365,
    p_fecha_proximo_monitoreo           => v_hoy + 180,
    p_justificacion_ajuste_fecha        => NULL
  );
  PERFORM public.fn_complete_work_order_inspeccion(
    p_work_order_id => v_ot_completada,
    p_usuario       => v_municipal,
    p_evaluaciones  => jsonb_build_array(jsonb_build_object(
      'tree_id', v_tree_id,
      'composicion', public.fn_entradas_vigentes_previas(p_tree_id => v_tree_id, p_work_order_id => v_ot_completada),
      'resultado', jsonb_build_object('rule_version', '2.1', 'motor_commit', 'prueba-rls', 'clasificacion_riesgo_calculada', 'bajo')
    ))
  );

  -- (2) OT En ejecución con un borrador (B17).
  v_ot_borrador := pg_temp.ot_en_ejecucion(p_project => v_project_id, p_tree => v_tree_id, p_accion => 'reevaluacion', p_inspector => v_inspector, p_municipal => v_municipal);
  v_borrador := pg_temp.borrador(p_ot => v_ot_borrador, p_tree => v_tree_id, p_inspector => v_inspector, p_tipo => 'reevaluacion', p_variables => '{"dap_cm": 31}'::jsonb);

  -- Control: con la credencial de servicio (sin RLS) los datos existen.
  IF (SELECT count(*) FROM public.tree_assessments WHERE tree_id = v_tree_id) <> 1
     OR (SELECT count(*) FROM public.inspections WHERE work_order_id = v_ot_borrador) <> 1 THEN
    RAISE EXCEPTION 'R0 FALLA: preparación incompleta';
  END IF;

  -- R1: los miembros ven todas las lecturas (CC-064 a).
  FOR v_usuario, v_rol IN SELECT * FROM (VALUES (v_municipal, 'Usuario municipal'), (v_inspector, 'Inspector'), (v_encargado, 'Encargado')) AS m(u, r) LOOP
    v_r := pg_temp.lecturas_como(p_usuario => v_usuario, p_project => v_project_id, p_tree => v_tree_id,
                                 p_ot_borrador => v_ot_borrador, p_finalizada => v_finalizada, p_borrador => v_borrador);
    FOR v_clave IN SELECT jsonb_object_keys(v_r) LOOP
      IF (v_r->>v_clave)::int = 0 THEN
        RAISE EXCEPTION 'R1 FALLA: el % miembro no ve % (%)', v_rol, v_clave, v_r;
      END IF;
    END LOOP;
    IF (v_r->>'b7_work_orders')::int <> 2 OR (v_r->>'b18_tree_assessments')::int <> 1 OR (v_r->>'b17_inspections')::int <> 1 THEN
      RAISE EXCEPTION 'R1 FALLA: conteos inesperados para el %: %', v_rol, v_r;
    END IF;
    INSERT INTO test_log (msg) VALUES (format('R1 OK (%s): %s', v_rol, v_r));
  END LOOP;

  -- R2: usuarios de otro proyecto no ven nada.
  FOR v_usuario, v_rol IN SELECT * FROM (VALUES (v_municipal_otro, 'Usuario municipal de otro proyecto'), (v_inspector_otro, 'Inspector de otro proyecto')) AS m(u, r) LOOP
    v_r := pg_temp.lecturas_como(p_usuario => v_usuario, p_project => v_project_id, p_tree => v_tree_id,
                                 p_ot_borrador => v_ot_borrador, p_finalizada => v_finalizada, p_borrador => v_borrador);
    FOR v_clave IN SELECT jsonb_object_keys(v_r) LOOP
      IF (v_r->>v_clave)::int <> 0 THEN
        RAISE EXCEPTION 'R2 FALLA: el % ve % (%)', v_rol, v_clave, v_r;
      END IF;
    END LOOP;
    INSERT INTO test_log (msg) VALUES (format('R2 OK (%s): ninguna fila', v_rol));
  END LOOP;
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
