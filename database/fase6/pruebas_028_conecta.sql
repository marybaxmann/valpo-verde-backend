-- =====================================================================
-- Pruebas de la migración 028 (Valpo Verde Conecta; #62; CC-062)
-- =====================================================================
-- Se ejecutan en la base de pruebas, en BEGIN…ROLLBACK: no dejan datos.
--
-- K1: el reporte ciudadano crea la incidencia (Comunidad, Ingresada,
--     ubicación del árbol), el nombre y el RUT y las fotos.
-- K2: sin fotos o con un QR inexistente se rechaza (SV070).
-- K3: la ficha pública trae solo especie, nombre común, ubicación y
--     «Sobre esta especie»; nunca tree_code, coordenadas ni riesgo; un
--     QR inexistente devuelve NULL; sin especie, origen no determinado.
-- K4: el seguimiento devuelve solo el estado; huella desconocida y
--     vencida (más de 90 días desde Resuelta o Descartada) dan NULL; la
--     purga borra la huella vencida y no la vigente.
-- K5: revisión: reglas del Excel (D-187, D-189), solo Usuario municipal
--     miembro; Requiere antecedentes conserva nombre y RUT; Validada los
--     borra; Descartada borra las fotos y devuelve sus rutas.
-- K6: anon y authenticated no pueden ejecutar ninguna función de la 028.
-- =====================================================================

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
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    false, false
  );
  INSERT INTO public.user_profiles (id, role_id, nombre, activo)
  VALUES (v_id, (SELECT id FROM public.roles WHERE nombre = p_rol), p_nombre, true);
  RETURN v_id;
END;
$$;

-- Reporte de prueba; devuelve el id de la incidencia.
CREATE FUNCTION pg_temp.reportar(p_qr uuid, p_huella bytea, p_fotos int) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  PERFORM public.fn_crear_incidencia_ciudadana(
    p_incident_id       => v_id,
    p_qr_token          => p_qr,
    p_tipo_incidencia   => 'rama_caida',
    p_descripcion       => 'Rama sobre la vereda',
    p_nombre_reportante => 'María Pérez',
    p_rut_reportante    => '12345678-5',
    p_huella            => p_huella,
    p_fotos             => COALESCE((SELECT jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'storage_path', 'tree-photos/incidencias/' || v_id || '/' || n || '.jpg'))
                                     FROM generate_series(1, p_fotos) n), '[]'::jsonb)
  );
  RETURN v_id;
END;
$$;

-- Espera un error con el SQLSTATE dado.
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

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_municipal uuid;
  v_inspector uuid;
  v_municipal_otro uuid;
  v_project uuid;
  v_project_otro uuid;
  v_sector uuid;
  v_tree uuid;
  v_tree_sin uuid;
  v_qr uuid;
  v_qr_sin uuid;
  v_inc uuid;
  v_inc2 uuid;
  v_huella bytea := sha256('codigo-de-prueba-1'::bytea);
  v_huella2 bytea := sha256('codigo-de-prueba-2'::bytea);
  v_ficha jsonb;
  v_r jsonb;
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_fn text;
  v_rol text;
  v_purgadas int;
BEGIN
  v_municipal      := pg_temp.crear_usuario_prueba('muni-028@sivu.example.test', 'usuario_municipal', 'Municipal 028');
  v_inspector      := pg_temp.crear_usuario_prueba('insp-028@sivu.example.test', 'inspector', 'Inspector 028');
  v_municipal_otro := pg_temp.crear_usuario_prueba('muni-otro-028@sivu.example.test', 'usuario_municipal', 'Municipal otro 028');

  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('Conecta 028 ' || gen_random_uuid(), v_municipal) RETURNING id INTO v_project;
  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('Conecta 028 otro ' || gen_random_uuid(), v_municipal_otro) RETURNING id INTO v_project_otro;
  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector) VALUES (v_project, 'Sector 028', pg_temp.geom_sector()) RETURNING id INTO v_sector;
  INSERT INTO public.project_members (project_id, user_id, added_by) VALUES
    (v_project, v_municipal, v_municipal), (v_project, v_inspector, v_municipal), (v_project_otro, v_municipal_otro, v_municipal_otro);

  v_tree := (public.fn_create_tree_alta(
    p_project_id => v_project, p_sector_id => v_sector, p_sector => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza Conecta', p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Acer pseudoplatanus', p_nombre_comun => 'Falso plátano',
    p_fecha_registro => v_hoy, p_registrado_por => v_municipal)->>'id')::uuid;
  v_tree_sin := (public.fn_create_tree_alta(
    p_project_id => v_project, p_sector_id => v_sector, p_sector => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Esquina sin especie', p_utm_este => 256100, p_utm_norte => 6341100,
    p_especie_cientifica => NULL, p_nombre_comun => 'Árbol sin identificar',
    p_fecha_registro => v_hoy, p_registrado_por => v_municipal)->>'id')::uuid;
  SELECT qr_token INTO v_qr FROM public.trees WHERE id = v_tree;
  SELECT qr_token INTO v_qr_sin FROM public.trees WHERE id = v_tree_sin;

  -- K1
  v_inc := pg_temp.reportar(v_qr, v_huella, 2);
  IF NOT EXISTS (SELECT 1 FROM public.incidents WHERE id = v_inc AND origen_reporte = 'comunidad' AND estado_incidencia = 'ingresada'
                 AND ubicacion = 'Plaza Conecta' AND tree_id = v_tree AND project_id = v_project AND fecha_reporte = v_hoy
                 AND codigo_incidencia LIKE 'INC-%' AND fecha_actualizacion_estado IS NOT NULL)
     OR (SELECT count(*) FROM public.incident_reporters WHERE incident_id = v_inc) <> 1
     OR (SELECT count(*) FROM public.photos WHERE incident_id = v_inc AND tree_id = v_tree) <> 2 THEN
    RAISE EXCEPTION 'K1 FALLA: el reporte no quedó completo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('K1 OK: incidencia Comunidad/Ingresada con nombre, RUT y 2 fotos');

  -- K2
  PERFORM pg_temp.espera_error(format('SELECT pg_temp.reportar(%L::uuid, sha256(''x''::bytea), 0)', v_qr), 'SV070', 'K2 sin fotos');
  PERFORM pg_temp.espera_error(format('SELECT pg_temp.reportar(%L::uuid, sha256(''y''::bytea), 1)', gen_random_uuid()), 'SV070', 'K2 QR inexistente');
  INSERT INTO test_log (msg) VALUES ('K2 OK: sin fotos y QR inexistente → SV070');

  -- K3
  v_ficha := public.fn_ficha_publica_arbol(v_qr);
  IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v_ficha) k) <> ARRAY['especie_cientifica', 'nombre_comun', 'sobre_la_especie', 'ubicacion_descriptiva']
     OR v_ficha->>'especie_cientifica' <> 'Acer pseudoplatanus'
     OR v_ficha::text ~* '(tree_code|utm|ubicacion"\s*:\s*\{|riesgo|project)' THEN
    RAISE EXCEPTION 'K3 FALLA: la ficha trae otros datos: %', v_ficha;
  END IF;
  IF public.fn_ficha_publica_arbol(gen_random_uuid()) IS NOT NULL THEN
    RAISE EXCEPTION 'K3 FALLA: QR inexistente devolvió una ficha';
  END IF;
  v_ficha := public.fn_ficha_publica_arbol(v_qr_sin);
  IF v_ficha->'sobre_la_especie'->>'origen_biogeografico' <> 'no_determinado'
     OR v_ficha->'sobre_la_especie'->'persistencia_follaje' <> 'null'::jsonb
     OR v_ficha->'sobre_la_especie'->'tipo_hoja' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'K3 FALLA: sin especie no aplica D-260 a D-262: %', v_ficha;
  END IF;
  INSERT INTO test_log (msg) VALUES ('K3 OK: ficha con 4 campos; QR inexistente → NULL; sin especie, origen no determinado');

  -- K4
  IF public.fn_estado_seguimiento(v_huella) IS DISTINCT FROM 'ingresada'
     OR public.fn_estado_seguimiento(sha256('otro'::bytea)) IS NOT NULL THEN
    RAISE EXCEPTION 'K4 FALLA: seguimiento vigente o desconocido';
  END IF;
  v_inc2 := pg_temp.reportar(v_qr, v_huella2, 1);
  UPDATE public.incidents SET estado_incidencia = 'resuelta', fecha_actualizacion_estado = now() - interval '91 days' WHERE id = v_inc2;
  IF public.fn_estado_seguimiento(v_huella2) IS NOT NULL THEN
    RAISE EXCEPTION 'K4 FALLA: el código vencido sigue respondiendo';
  END IF;
  -- En una sentencia aparte: las subconsultas de abajo no verían el
  -- cambio de la purga si fueran parte de la misma sentencia.
  v_purgadas := public.fn_purgar_huellas_vencidas();
  IF v_purgadas < 1
     OR (SELECT codigo_seguimiento_huella FROM public.incidents WHERE id = v_inc2) IS NOT NULL
     OR (SELECT codigo_seguimiento_huella FROM public.incidents WHERE id = v_inc) IS NULL THEN
    RAISE EXCEPTION 'K4 FALLA: la purga no borró solo la huella vencida';
  END IF;
  INSERT INTO test_log (msg) VALUES ('K4 OK: solo el estado; desconocido y vencido → NULL; la purga borra solo la vencida');

  -- K5
  PERFORM pg_temp.espera_error(format('SELECT public.fn_revisar_incidencia(%L, %L, ''en_revision'', NULL, NULL, NULL)', v_inc, v_municipal), 'SV071', 'K5 sin resultado');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_revisar_incidencia(%L, %L, ''en_revision'', ''validada'', NULL, NULL)', v_inc, v_municipal), 'SV071', 'K5 Validada sin prioridad');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_revisar_incidencia(%L, %L, ''en_revision'', ''descartada'', NULL, ''alta'')', v_inc, v_municipal), 'SV071', 'K5 prioridad sin Validada');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_revisar_incidencia(%L, %L, ''en_revision'', ''requiere_antecedentes'', NULL, NULL)', v_inc, v_inspector), 'SV071', 'K5 Inspector');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_revisar_incidencia(%L, %L, ''en_revision'', ''requiere_antecedentes'', NULL, NULL)', v_inc, v_municipal_otro), 'SV071', 'K5 municipal no miembro');

  v_r := public.fn_revisar_incidencia(v_inc, v_municipal, 'en_revision', 'requiere_antecedentes', 'Inspector a terreno', NULL);
  IF (SELECT count(*) FROM public.incident_reporters WHERE incident_id = v_inc) <> 1
     OR v_r->>'revisado_por' <> v_municipal::text OR v_r->>'fecha_revision' IS NULL THEN
    RAISE EXCEPTION 'K5 FALLA: Requiere antecedentes: %', v_r;
  END IF;
  v_r := public.fn_revisar_incidencia(v_inc, v_municipal, 'derivada', 'validada', 'Confirmado en terreno', 'alta');
  IF (SELECT count(*) FROM public.incident_reporters WHERE incident_id = v_inc) <> 0
     OR (SELECT count(*) FROM public.photos WHERE incident_id = v_inc) <> 2 THEN
    RAISE EXCEPTION 'K5 FALLA: Validada debe borrar nombre y RUT y conservar las fotos';
  END IF;
  v_r := public.fn_revisar_incidencia(v_inc2, v_municipal, 'descartada', 'descartada', NULL, NULL);
  IF jsonb_array_length(v_r->'fotos_borradas') <> 1 OR (SELECT count(*) FROM public.photos WHERE incident_id = v_inc2) <> 0 THEN
    RAISE EXCEPTION 'K5 FALLA: Descartada debe borrar las fotos y devolver sus rutas: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('K5 OK: reglas D-187/D-189; solo municipal miembro; Requiere antecedentes conserva, Validada borra nombre y RUT, Descartada borra fotos');

  -- K6
  FOR v_fn IN SELECT unnest(ARRAY[
    'public.fn_crear_incidencia_ciudadana(uuid, uuid, text, text, text, text, bytea, jsonb)',
    'public.fn_ficha_publica_arbol(uuid)', 'public.fn_estado_seguimiento(bytea)',
    'public.fn_purgar_huellas_vencidas()', 'public.fn_revisar_incidencia(uuid, uuid, text, text, text, text)']) LOOP
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(v_rol, v_fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'K6 FALLA: % puede ejecutar %', v_rol, v_fn;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'K6 FALLA: service_role no puede ejecutar %', v_fn;
    END IF;
  END LOOP;
  INSERT INTO test_log (msg) VALUES ('K6 OK: ninguna función de la 028 es ejecutable por anon ni authenticated');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
