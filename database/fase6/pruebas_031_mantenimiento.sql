-- =====================================================================
-- Pruebas de la migración 031 (Mantenimiento #61; presencia AM-22).
-- Base de pruebas, en BEGIN…ROLLBACK: no dejan datos.
-- =====================================================================
-- M1 crear OT: Tala exige revisión y revisor; subtipo obligatorio;
--    responsable Encargado; creador Usuario municipal.
-- M2 transiciones por el Encargado responsable; otro usuario no.
-- M3 ejecución: reglas D-216 a D-224 (estado, acción, fotos, seguimiento).
-- M4 sin revisión: completa la OT con resultado completo; con parcial
--    sigue En ejecución y admite otra ejecución.
-- M5 con revisión: pendiente bloquea otra ejecución; solo el revisor
--    asignado revisa; rechazar exige observaciones; el rechazo NO borra el
--    registro y deja registrar una corrección (registro nuevo, misma OT).
-- M6 aprobar exige resultado completo; aprobar completa la OT, actualiza
--    estado_ciclo_vida y la presencia (Talado), con su fecha.
-- M7 D-28: la presencia sigue el subtipo EJECUTADO (Retiro_tocón), no el
--    solicitado (Tala).
-- M8 cambiar revisor (solo Usuario municipal); permisos de las funciones.
-- =====================================================================

BEGIN;

CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
$$;

CREATE FUNCTION pg_temp.usuario(p_email text, p_rol text) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
  VALUES ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false);
  INSERT INTO public.user_profiles (id, role_id, nombre, activo) VALUES (v_id, (SELECT id FROM public.roles WHERE nombre = p_rol), p_email, true);
  RETURN v_id;
END;
$$;

CREATE FUNCTION pg_temp.espera_error(p_sql text, p_estado text, p_caso text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION '% FALLA: no se rechazó', p_caso;
EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE <> p_estado THEN
    RAISE EXCEPTION '% FALLA: SQLSTATE % (%) en vez de %', p_caso, SQLSTATE, SQLERRM, p_estado;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.fotos(n int) RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'storage_path', 'mantenimiento/prueba/' || g || '.jpg')), '[]'::jsonb) FROM generate_series(1, n) g;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);
CREATE TEMP TABLE ctx (k text PRIMARY KEY, v uuid);

DO $$
DECLARE
  v_muni uuid; v_enc uuid; v_insp uuid; v_insp2 uuid; v_project uuid; v_sector uuid; v_tree uuid; v_tree2 uuid;
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_ot uuid; v_ot2 uuid; v_ot3 uuid; v_r jsonb; v_mr1 uuid; v_mr2 uuid;
BEGIN
  v_muni := pg_temp.usuario('muni-031@sivu.example.test', 'usuario_municipal');
  v_enc := pg_temp.usuario('enc-031@sivu.example.test', 'encargado_mantencion');
  v_insp := pg_temp.usuario('insp-031@sivu.example.test', 'inspector');
  v_insp2 := pg_temp.usuario('insp2-031@sivu.example.test', 'inspector');
  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('Mantenimiento 031 ' || gen_random_uuid(), v_muni) RETURNING id INTO v_project;
  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector) VALUES (v_project, 'Sector 031', pg_temp.geom_sector()) RETURNING id INTO v_sector;
  INSERT INTO public.project_members (project_id, user_id, added_by) VALUES
    (v_project, v_muni, v_muni), (v_project, v_enc, v_muni), (v_project, v_insp, v_muni), (v_project, v_insp2, v_muni);
  v_tree := (public.fn_create_tree_alta(v_project, v_sector, 'Barrio Puerto', 'Plaza 031', 256000, 6341000, 'Acer pseudoplatanus', 'Falso plátano', v_hoy, v_muni)->>'id')::uuid;
  v_tree2 := (public.fn_create_tree_alta(v_project, v_sector, 'Barrio Puerto', 'Plaza 031 b', 256010, 6341010, NULL, 'Peumo', v_hoy, v_muni)->>'id')::uuid;
  INSERT INTO ctx VALUES ('muni', v_muni), ('enc', v_enc), ('insp', v_insp), ('insp2', v_insp2), ('project', v_project), ('tree', v_tree);

  -- M1
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_create_work_order_mantenimiento(%L, %L, NULL, 'tala_retiro', 'tala', NULL, 'alta', NULL, %L, false, NULL, %L, %L)$q$, v_project, v_tree, v_enc, v_muni, v_hoy), 'SV072', 'M1 Tala sin revisor');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_create_work_order_mantenimiento(%L, %L, NULL, 'poda', NULL, NULL, 'media', NULL, %L, false, NULL, %L, %L)$q$, v_project, v_tree, v_enc, v_muni, v_hoy), 'SV072', 'M1 Poda sin subtipo');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_create_work_order_mantenimiento(%L, %L, NULL, 'riego', 'programado', NULL, 'media', NULL, %L, false, NULL, %L, %L)$q$, v_project, v_tree, v_insp, v_muni, v_hoy), 'SV072', 'M1 responsable Inspector');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_create_work_order_mantenimiento(%L, %L, NULL, 'riego', 'programado', NULL, 'media', NULL, %L, false, NULL, %L, %L)$q$, v_project, v_tree, v_enc, v_insp, v_hoy), 'SV072', 'M1 creador Inspector');
  v_r := public.fn_create_work_order_mantenimiento(v_project, v_tree, NULL, 'tala_retiro', 'tala', 'Riesgo de caída', 'alta', NULL, v_enc, false, v_insp, v_muni, v_hoy);
  v_ot := (v_r->>'id')::uuid;
  IF (v_r->>'requiere_revision_inspector')::boolean IS NOT TRUE OR v_r->>'codigo_ot' NOT LIKE 'OT-M-%' THEN
    RAISE EXCEPTION 'M1 FALLA: Tala debe exigir revisión y código OT-M: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M1 OK: Tala fuerza revisión y exige revisor; subtipo obligatorio; responsable Encargado; creador Usuario municipal');

  -- M2
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_transition_work_order_estado(%L, 'programada', %L, %L)$q$, v_ot, v_hoy, v_insp), 'SV059', 'M2 Inspector transiciona OT de Mantenimiento');
  PERFORM public.fn_transition_work_order_estado(v_ot, 'programada', v_hoy, v_enc);
  -- M3: todavía Programada
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'tala_retiro', 'tala', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), %L)$q$, v_ot, v_enc, v_hoy, v_hoy), 'SV073', 'M3 OT no En ejecución');
  PERFORM public.fn_transition_work_order_estado(v_ot, 'en_ejecucion', NULL, v_enc);
  INSERT INTO test_log (msg) VALUES ('M2 OK: el Encargado responsable transiciona; el Inspector no');

  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'poda', 'sanitaria', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), %L)$q$, v_ot, v_enc, v_hoy, v_hoy), 'SV073', 'M3 acción distinta');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'tala_retiro', 'tala', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(0), %L)$q$, v_ot, v_enc, v_hoy, v_hoy), 'SV073', 'M3 sin fotos');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'tala_retiro', 'tala', 'ejecutado_completamente', NULL, true, NULL, pg_temp.fotos(1), %L)$q$, v_ot, v_enc, v_hoy, v_hoy), 'SV073', 'M3 seguimiento sin fecha');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'tala_retiro', 'tala', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), %L)$q$, v_ot, v_insp, v_hoy, v_hoy), 'SV073', 'M3 no es el responsable');
  INSERT INTO test_log (msg) VALUES ('M3 OK: estado, acción, fotos, seguimiento y responsable');

  -- M5: primera ejecución (parcial), pendiente de revisión
  v_mr1 := (public.fn_registrar_ejecucion_mantenimiento(v_ot, v_enc, v_hoy, 'tala_retiro', 'tala', 'ejecutado_parcialmente', 'Faltó retirar ramas', false, NULL, pg_temp.fotos(2), v_hoy)->>'id')::uuid;
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_registrar_ejecucion_mantenimiento(%L, %L, %L, 'tala_retiro', 'tala', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), %L)$q$, v_ot, v_enc, v_hoy, v_hoy), 'SV073', 'M5 otra ejecución con una pendiente');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_revisar_mantenimiento(%L, %L, 'rechazado', 'No corresponde', false, NULL, %L)$q$, v_mr1, v_insp2, v_hoy), 'SV074', 'M5 revisor no asignado');
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_revisar_mantenimiento(%L, %L, 'rechazado', NULL, false, NULL, %L)$q$, v_mr1, v_insp, v_hoy), 'SV074', 'M5 rechazo sin observaciones');
  -- M6 (parte): no se aprueba una ejecución parcial
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_revisar_mantenimiento(%L, %L, 'aprobado', NULL, false, NULL, %L)$q$, v_mr1, v_insp, v_hoy), 'SV074', 'M6 aprobar parcial');
  v_r := public.fn_revisar_mantenimiento(v_mr1, v_insp, 'rechazado', 'Faltó completar la tala', true, v_hoy + 7, v_hoy);
  IF v_r->>'estado_ot' <> 'en_ejecucion'
     OR (SELECT estado_revision FROM public.maintenance_records WHERE id = v_mr1) <> 'rechazado'
     OR (SELECT count(*) FROM public.photos WHERE maintenance_record_id = v_mr1) <> 2 THEN
    RAISE EXCEPTION 'M5 FALLA: el rechazo debe conservar el registro y sus fotos y dejar la OT En ejecución: %', v_r;
  END IF;
  -- Corrección: registro nuevo en la misma OT
  v_mr2 := (public.fn_registrar_ejecucion_mantenimiento(v_ot, v_enc, v_hoy, 'tala_retiro', 'tala', 'ejecutado_completamente', 'Corrección', false, NULL, pg_temp.fotos(1), v_hoy)->>'id')::uuid;
  IF (SELECT count(*) FROM public.maintenance_records WHERE work_order_id = v_ot) <> 2 THEN
    RAISE EXCEPTION 'M5 FALLA: la corrección debe ser un registro nuevo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('M5 OK: pendiente bloquea; solo el revisor asignado; rechazo con observaciones conserva el registro y deja corregir con un registro nuevo');

  -- M6: aprobar la corrección
  v_r := public.fn_revisar_mantenimiento(v_mr2, v_insp, 'aprobado', NULL, false, NULL, v_hoy);
  IF v_r->>'estado_ot' <> 'completada' OR v_r->>'estado_presencia' <> 'talado'
     OR (SELECT estado_ot FROM public.work_orders WHERE id = v_ot) <> 'completada'
     OR (SELECT estado_ciclo_vida FROM public.trees WHERE id = v_tree) <> 'tocon'
     OR (SELECT estado_presencia FROM public.v_tree_presence WHERE tree_id = v_tree) <> 'talado'
     OR (SELECT fecha_cambio_estado_presencia FROM public.v_tree_presence WHERE tree_id = v_tree) <> (SELECT fecha_revision::date FROM public.maintenance_records WHERE id = v_mr2) THEN
    RAISE EXCEPTION 'M6 FALLA: aprobar debe completar la OT y dejar el árbol Talado: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M6 OK: no se aprueba una ejecución parcial; aprobar completa la OT, estado_ciclo_vida = tocon y presencia Talado con la fecha de revisión');

  -- M4: sin revisión
  v_ot2 := (public.fn_create_work_order_mantenimiento(v_project, v_tree2, NULL, 'poda', 'sanitaria', NULL, 'media', NULL, v_enc, false, NULL, v_muni, v_hoy)->>'id')::uuid;
  PERFORM public.fn_transition_work_order_estado(v_ot2, 'programada', v_hoy, v_enc);
  PERFORM public.fn_transition_work_order_estado(v_ot2, 'en_ejecucion', NULL, v_enc);
  v_r := public.fn_registrar_ejecucion_mantenimiento(v_ot2, v_enc, v_hoy, 'poda', 'sanitaria', 'ejecutado_parcialmente', NULL, true, v_hoy + 30, pg_temp.fotos(1), v_hoy);
  IF v_r->>'estado_ot' <> 'en_ejecucion' OR v_r->'estado_revision' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'M4 FALLA: parcial sin revisión debe dejar la OT En ejecución: %', v_r;
  END IF;
  v_r := public.fn_registrar_ejecucion_mantenimiento(v_ot2, v_enc, v_hoy, 'poda', 'sanitaria', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), v_hoy);
  IF v_r->>'estado_ot' <> 'completada' OR (SELECT estado_ot FROM public.work_orders WHERE id = v_ot2) <> 'completada' THEN
    RAISE EXCEPTION 'M4 FALLA: completa sin revisión debe completar la OT: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('M4 OK: sin revisión, parcial sigue En ejecución y admite otra; completa cierra la OT');

  -- M7: solicitado Tala, ejecutado Retiro_tocón → Retirado
  v_ot3 := (public.fn_create_work_order_mantenimiento(v_project, v_tree2, NULL, 'tala_retiro', 'tala', NULL, 'alta', NULL, v_enc, true, v_insp2, v_muni, v_hoy)->>'id')::uuid;
  PERFORM public.fn_transition_work_order_estado(v_ot3, 'programada', v_hoy, v_enc);
  PERFORM public.fn_transition_work_order_estado(v_ot3, 'en_ejecucion', NULL, v_enc);
  v_mr1 := (public.fn_registrar_ejecucion_mantenimiento(v_ot3, v_enc, v_hoy, 'tala_retiro', 'retiro_tocon', 'ejecutado_completamente', NULL, false, NULL, pg_temp.fotos(1), v_hoy)->>'id')::uuid;
  PERFORM public.fn_revisar_mantenimiento(v_mr1, v_insp2, 'aprobado', NULL, false, NULL, v_hoy);
  IF (SELECT estado_presencia FROM public.v_tree_presence WHERE tree_id = v_tree2) <> 'retirado'
     OR (SELECT estado_ciclo_vida FROM public.trees WHERE id = v_tree2) <> 'retirado' THEN
    RAISE EXCEPTION 'M7 FALLA: la presencia debe seguir el subtipo ejecutado (retiro_tocon)';
  END IF;
  INSERT INTO test_log (msg) VALUES ('M7 OK: D-28, la presencia sigue el subtipo ejecutado (Retiro_tocón → Retirado), no el solicitado');
  INSERT INTO ctx VALUES ('ot3', v_ot3);
END $$;

-- M8: cambiar revisor y permisos
DO $$
DECLARE
  v_fn text; v_rol text;
  v_project uuid := (SELECT v FROM ctx WHERE k = 'project');
  v_muni uuid := (SELECT v FROM ctx WHERE k = 'muni');
  v_enc uuid := (SELECT v FROM ctx WHERE k = 'enc');
  v_insp uuid := (SELECT v FROM ctx WHERE k = 'insp');
  v_insp2 uuid := (SELECT v FROM ctx WHERE k = 'insp2');
  v_tree uuid := (SELECT v FROM ctx WHERE k = 'tree');
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_ot uuid;
BEGIN
  v_ot := (public.fn_create_work_order_mantenimiento(v_project, v_tree, NULL, 'riego', 'emergencia', NULL, 'media', NULL, v_enc, true, v_insp, v_muni, v_hoy)->>'id')::uuid;
  PERFORM pg_temp.espera_error(format($q$SELECT public.fn_reassign_inspector_revisor(%L, %L, %L)$q$, v_ot, v_insp2, v_insp), 'SV072', 'M8 Inspector cambia revisor');
  PERFORM public.fn_reassign_inspector_revisor(v_ot, v_insp2, v_muni);
  IF (SELECT inspector_revisor_id FROM public.work_orders WHERE id = v_ot) <> v_insp2 THEN
    RAISE EXCEPTION 'M8 FALLA: no cambió el revisor';
  END IF;
  FOR v_fn IN SELECT unnest(ARRAY[
    'public.fn_create_work_order_mantenimiento(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, uuid, uuid, date)',
    'public.fn_transition_work_order_estado(uuid, text, date, uuid)',
    'public.fn_reassign_inspector_revisor(uuid, uuid, uuid)',
    'public.fn_registrar_ejecucion_mantenimiento(uuid, uuid, date, text, text, text, text, boolean, date, jsonb, date)',
    'public.fn_revisar_mantenimiento(uuid, uuid, text, text, boolean, date, date)']) LOOP
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(v_rol, v_fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'M8 FALLA: % puede ejecutar %', v_rol, v_fn;
      END IF;
    END LOOP;
  END LOOP;
  INSERT INTO test_log (msg) VALUES ('M8 OK: solo el Usuario municipal cambia el revisor; anon y authenticated no ejecutan las funciones');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
