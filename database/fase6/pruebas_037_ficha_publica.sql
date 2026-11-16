-- =====================================================================
-- Pruebas de la migración 037 (ficha pública editable; CC-073)
-- =====================================================================
-- Se ejecutan en la base de pruebas, en BEGIN…ROLLBACK: no dejan datos.
--
-- F1: quién edita (P4): Administrador o Usuario municipal activos; el
--     municipal, solo en árboles de su proyecto; Inspector, Encargado e
--     inactivo, nunca; nadie actúa en nombre de otro (auth.uid()).
-- F2: CHECK de límites y exclusiones (D-281, D-282, D-283, D-286/D-287,
--     D-303, D-305).
-- F3: guardar la especie conserva las fotos de los rasgos que siguen y
--     devuelve las rutas de los rasgos eliminados.
-- F4: fotos de especie: crédito obligatorio; foto referencial temporal
--     (D-293) con crédito fijo, solo en la ranura referencial; quitar la
--     foto apaga la marca.
-- F5: ficha pública: claves de la 028 iguales; contenido de la especie
--     con textos personalizados encima; foto ejemplar antes que la
--     referencial; medidas solo con interruptor en Sí y valor vigente;
--     nada técnico; árbol sin especie sin contenido de especie.
-- F6: proyecto Cerrado: la ficha del árbol no se puede editar.
-- F7: anon y authenticated no ejecutan ninguna función de la 037 ni
--     escriben en las tablas; el bucket es público, solo WebP, 2 MB.
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
  v_admin uuid;
  v_municipal uuid;
  v_municipal_otro uuid;
  v_inspector uuid;
  v_encargado uuid;
  v_inactivo uuid;
  v_project uuid;
  v_project_cerrado uuid;
  v_sector uuid;
  v_sector_c uuid;
  v_tree uuid;
  v_tree_sin uuid;
  v_tree_c uuid;
  v_qr uuid;
  v_qr_sin uuid;
  v_especie uuid := (SELECT id FROM public.species WHERE especie_cientifica = 'Acer pseudoplatanus');
  v_hoy date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_contenido jsonb;
  v_ficha jsonb;
  v_antes jsonb;
  v_r jsonb;
  v_fn text;
  v_rol text;
BEGIN
  IF v_especie IS NULL THEN
    RAISE EXCEPTION 'Preparación: falta Acer pseudoplatanus en species';
  END IF;

  v_admin          := pg_temp.crear_usuario_prueba('admin-037@sivu.example.test', 'admin', 'Admin 037');
  v_municipal      := pg_temp.crear_usuario_prueba('muni-037@sivu.example.test', 'usuario_municipal', 'Municipal 037');
  v_municipal_otro := pg_temp.crear_usuario_prueba('muni-otro-037@sivu.example.test', 'usuario_municipal', 'Municipal otro 037');
  v_inspector      := pg_temp.crear_usuario_prueba('insp-037@sivu.example.test', 'inspector', 'Inspector 037');
  v_encargado      := pg_temp.crear_usuario_prueba('enc-037@sivu.example.test', 'encargado_mantencion', 'Encargado 037');
  v_inactivo       := pg_temp.crear_usuario_prueba('inact-037@sivu.example.test', 'usuario_municipal', 'Inactivo 037');
  UPDATE public.user_profiles SET activo = false WHERE id = v_inactivo;

  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('Ficha 037 ' || gen_random_uuid(), v_municipal) RETURNING id INTO v_project;
  INSERT INTO public.projects (nombre_proyecto, created_by) VALUES ('Ficha 037 cerrado ' || gen_random_uuid(), v_municipal) RETURNING id INTO v_project_cerrado;
  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector) VALUES (v_project, 'Sector 037', pg_temp.geom_sector()) RETURNING id INTO v_sector;
  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector) VALUES (v_project_cerrado, 'Sector 037 c', pg_temp.geom_sector()) RETURNING id INTO v_sector_c;
  INSERT INTO public.project_members (project_id, user_id, added_by) VALUES
    (v_project, v_municipal, v_municipal), (v_project, v_inspector, v_municipal), (v_project, v_encargado, v_municipal),
    (v_project, v_inactivo, v_municipal), (v_project_cerrado, v_municipal, v_municipal);

  v_tree := (public.fn_create_tree_alta(
    p_project_id => v_project, p_sector_id => v_sector, p_sector => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza 037', p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Acer pseudoplatanus', p_nombre_comun => 'Falso plátano',
    p_fecha_registro => v_hoy, p_registrado_por => v_municipal)->>'id')::uuid;
  v_tree_sin := (public.fn_create_tree_alta(
    p_project_id => v_project, p_sector_id => v_sector, p_sector => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Esquina sin especie', p_utm_este => 256100, p_utm_norte => 6341100,
    p_especie_cientifica => NULL, p_nombre_comun => 'Árbol sin identificar',
    p_fecha_registro => v_hoy, p_registrado_por => v_municipal)->>'id')::uuid;
  v_tree_c := (public.fn_create_tree_alta(
    p_project_id => v_project_cerrado, p_sector_id => v_sector_c, p_sector => 'Barrio Puerto',
    p_ubicacion_descriptiva => 'Plaza cerrada', p_utm_este => 256200, p_utm_norte => 6341200,
    p_especie_cientifica => 'Acer pseudoplatanus', p_nombre_comun => 'Falso plátano',
    p_fecha_registro => v_hoy, p_registrado_por => v_municipal)->>'id')::uuid;
  -- diametro_copa_m es columna generada: queda sin valor, para probar
  -- que un interruptor en Sí sin valor vigente no muestra nada.
  UPDATE public.trees SET altura_total_m = 12.5, dap_cm = 40, clase_edad = NULL WHERE id = v_tree;
  IF (SELECT diametro_copa_m FROM public.trees WHERE id = v_tree) IS NOT NULL THEN
    RAISE EXCEPTION 'Preparación: el árbol de prueba ya tiene diámetro de copa';
  END IF;
  SELECT qr_token INTO v_qr FROM public.trees WHERE id = v_tree;
  SELECT qr_token INTO v_qr_sin FROM public.trees WHERE id = v_tree_sin;

  -- Ficha antes de cualquier contenido: debe conservar las claves de la 028
  v_antes := public.fn_ficha_publica_arbol(v_qr);

  v_contenido := jsonb_build_object(
    'nombre_comun_visualizacion', 'Falso plátano', 'articulo_nombre', 'el',
    'curiosidad', 'No es un plátano: es un arce.',
    'aportes', jsonb_build_array(jsonb_build_object('icono', 'Sombra', 'titulo', 'Sombra', 'texto', 'Da sombra densa.')),
    'quien_soy', 'Vengo de Europa.',
    'rasgos', jsonb_build_array(
      jsonb_build_object('id', 'hoja', 'etiqueta', 'Hoja', 'texto', 'Cinco lóbulos.', 'foto_path', 'inyectada/por-el-cliente.webp'),
      jsonb_build_object('id', 'fruto', 'etiqueta', 'Fruto', 'texto', 'Sámaras en pares.')),
    'anio_estacional', jsonb_build_object('prim', 'Brota', 'ver', 'Sombra', 'oto', 'Amarillo', 'inv', 'Sin hojas'),
    'historia_especie', 'Corteza en placas.',
    'consejo', 'No excaves junto a sus raíces.',
    'fuentes', jsonb_build_array(jsonb_build_object('obra', 'RHS', 'bloques', jsonb_build_array('Curiosidad'))));

  -- F1
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_inspector, v_contenido), 'SV080', 'F1 Inspector especie');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_encargado, v_contenido), 'SV080', 'F1 Encargado especie');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_inactivo, v_contenido), 'SV080', 'F1 inactivo especie');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, ''{}'')', v_tree, v_inspector), 'SV081', 'F1 Inspector árbol');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, ''{}'')', v_tree, v_municipal_otro), 'SV081', 'F1 municipal no miembro');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_ficha_publica(%L, %L, ''arboles/x.webp'')', v_tree, v_municipal_otro), 'SV081', 'F1 foto municipal no miembro');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, ''{}'')', gen_random_uuid(), v_municipal), 'SV081', 'F1 árbol inexistente');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', gen_random_uuid(), v_municipal, v_contenido), 'SV080', 'F1 especie inexistente');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_municipal_otro, 'role', 'authenticated')::text, true);
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal, v_contenido), '42501', 'F1 en nombre de otro');
  PERFORM set_config('request.jwt.claims', '', true);
  -- El Administrador no es miembro del proyecto y edita igual (transversal)
  PERFORM public.fn_guardar_ficha_publica_arbol(v_tree, v_admin, '{"mostrar_dap": true}');
  PERFORM public.fn_guardar_contenido_especie(v_especie, v_municipal, v_contenido);
  INSERT INTO test_log (msg) VALUES ('F1 OK: Inspector, Encargado, inactivo, no miembro y suplantación rechazados; Administrador transversal; municipal edita la especie');

  -- F2
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal,
    v_contenido || jsonb_build_object('curiosidad', repeat('a', 201))), '23514', 'F2 curiosidad > 200');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal,
    v_contenido || jsonb_build_object('aportes', '[{},{},{}]'::jsonb)), '23514', 'F2 tres aportes');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal,
    v_contenido || jsonb_build_object('ciclo', '{"titulo": "Piña", "pasos": []}'::jsonb)), '23514', 'F2 año y ciclo juntos');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal,
    v_contenido - 'articulo_nombre'), '23514', 'F2 nombre sin artículo');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_contenido_especie(%L, %L, %L)', v_especie, v_municipal,
    v_contenido || jsonb_build_object('anio_estacional', '{"prim": "a", "ver": "b", "oto": "c"}'::jsonb)), '23514', 'F2 año incompleto');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, %L)', v_tree, v_municipal,
    '{"textos_personalizados": {"historia": {"texto": "x"}}}'), '23514', 'F2 texto personalizado no permitido');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, %L)', v_tree, v_municipal,
    '{"historia_fuente": "Archivo municipal"}'), 'SV081', 'F2 fuente sin historia');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, %L)', v_tree, v_municipal,
    jsonb_build_object('historia', repeat('h', 1001))), '23514', 'F2 historia > 1000');
  INSERT INTO test_log (msg) VALUES ('F2 OK: límites y exclusiones (D-281, D-282, D-283, D-286/D-287, D-303, D-305)');

  -- F3
  IF (SELECT rasgos->0->'foto_path' FROM public.species_public_content WHERE species_id = v_especie) <> 'null'::jsonb THEN
    RAISE EXCEPTION 'F3 FALLA: el cliente pudo fijar foto_path de un rasgo';
  END IF;
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'hoja', 'especies/hoja.webp', 'Autora, CC BY 4.0');
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'fruto', 'especies/fruto.webp', 'Autora, CC BY 4.0');
  v_r := public.fn_guardar_contenido_especie(v_especie, v_municipal,
    jsonb_set(v_contenido, '{rasgos}', jsonb_build_array(jsonb_build_object('id', 'hoja', 'etiqueta', 'Hoja', 'texto', 'Cinco lóbulos, borde dentado.'))));
  IF v_r->'rutas_a_borrar' <> '["especies/fruto.webp"]'::jsonb
     OR (SELECT rasgos->0->>'foto_path' FROM public.species_public_content WHERE species_id = v_especie) <> 'especies/hoja.webp'
     OR (SELECT rasgos->0->>'texto' FROM public.species_public_content WHERE species_id = v_especie) <> 'Cinco lóbulos, borde dentado.' THEN
    RAISE EXCEPTION 'F3 FALLA: %', v_r;
  END IF;
  INSERT INTO test_log (msg) VALUES ('F3 OK: el cliente no fija fotos; se conserva la del rasgo que sigue y se devuelve la del eliminado');

  -- F4
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_especie(%L, %L, ''referencial'', ''especies/r.webp'', NULL)', v_especie, v_municipal), 'SV080', 'F4 sin crédito');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_especie(%L, %L, ''hoja'', ''especies/h2.webp'', NULL, true)', v_especie, v_municipal), 'SV080', 'F4 temporal en rasgo');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_especie(%L, %L, ''no-existe'', ''especies/h3.webp'', ''A, CC0'')', v_especie, v_municipal), 'SV080', 'F4 rasgo inexistente');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_especie(%L, %L, ''referencial'', ''especies/r.webp'', ''A, CC0'')',
    (SELECT id FROM public.species WHERE especie_cientifica = 'Ginkgo biloba'), v_municipal), 'SV080', 'F4 especie sin contenido');
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'referencial', 'especies/tercero.webp', 'Lo que diga el cliente', true);
  IF NOT EXISTS (SELECT 1 FROM public.species_public_content WHERE species_id = v_especie AND foto_referencial_temporal
                 AND credito_foto_referencial = 'Foto de terceros, uso referencial temporal'
                 AND foto_referencial_path = 'especies/tercero.webp') THEN
    RAISE EXCEPTION 'F4 FALLA: la foto temporal no quedó con su crédito fijo';
  END IF;
  v_r := public.fn_fijar_foto_especie(v_especie, v_municipal, 'referencial', 'especies/oficial.webp', 'SIVU, CC BY 4.0');
  IF v_r->>'ruta_anterior' <> 'especies/tercero.webp'
     OR NOT EXISTS (SELECT 1 FROM public.species_public_content WHERE species_id = v_especie AND NOT foto_referencial_temporal
                    AND credito_foto_referencial = 'SIVU, CC BY 4.0') THEN
    RAISE EXCEPTION 'F4 FALLA: reemplazar por la oficial: %', v_r;
  END IF;
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'referencial', 'especies/tercero.webp', NULL, true);
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'referencial', NULL, NULL, true);
  IF EXISTS (SELECT 1 FROM public.species_public_content WHERE species_id = v_especie
             AND (foto_referencial_temporal OR credito_foto_referencial IS NOT NULL OR foto_referencial_path IS NOT NULL)) THEN
    RAISE EXCEPTION 'F4 FALLA: quitar la foto debe apagar la marca y el crédito';
  END IF;
  PERFORM pg_temp.espera_error(format('UPDATE public.species_public_content SET foto_referencial_temporal = true WHERE species_id = %L', v_especie), '23514', 'F4 marca sin foto');
  PERFORM public.fn_fijar_foto_especie(v_especie, v_municipal, 'referencial', 'especies/oficial.webp', 'SIVU, CC BY 4.0');
  INSERT INTO test_log (msg) VALUES ('F4 OK: crédito obligatorio; temporal solo referencial, con crédito fijo; quitar apaga la marca (D-293)');

  -- F5
  v_ficha := public.fn_ficha_publica_arbol(v_qr);
  IF v_ficha->'especie_cientifica' <> v_antes->'especie_cientifica' OR v_ficha->'nombre_comun' <> v_antes->'nombre_comun'
     OR v_ficha->'ubicacion_descriptiva' <> v_antes->'ubicacion_descriptiva' OR v_ficha->'sobre_la_especie' <> v_antes->'sobre_la_especie' THEN
    RAISE EXCEPTION 'F5 FALLA: cambiaron las claves de la 028: % vs %', v_ficha, v_antes;
  END IF;
  -- Interruptores: dap en Sí (lo guardó el admin); altura en No pese a tener valor
  IF v_ficha->'medidas' <> '{"dap_cm": {"valor": 40, "unidad": "cm", "naturaleza": "medicion_o_estimacion"}}'::jsonb THEN
    RAISE EXCEPTION 'F5 FALLA: medidas: %', v_ficha->'medidas';
  END IF;
  PERFORM public.fn_guardar_ficha_publica_arbol(v_tree, v_municipal, jsonb_build_object(
    'mostrar_altura_total', true, 'mostrar_diametro_copa', true, 'mostrar_clase_edad', true,
    'historia', 'Plantado por los vecinos.', 'historia_fuente', 'Junta de vecinos',
    'textos_personalizados', jsonb_build_object('curiosidad', jsonb_build_object('texto', 'Este falso plátano vio pasar el tranvía.', 'fuente', 'Archivo'))));
  v_ficha := public.fn_ficha_publica_arbol(v_qr);
  IF v_ficha->'medidas' <> '{"altura_total_m": {"valor": 12.5, "unidad": "m", "naturaleza": "medicion_o_estimacion"}}'::jsonb
     OR v_ficha->'contenido_especie'->>'curiosidad' <> 'Este falso plátano vio pasar el tranvía.'
     OR v_ficha->'contenido_especie'->>'consejo' <> 'No excaves junto a sus raíces.'
     OR v_ficha->'contenido_especie'->'rasgos'->0 ? 'id'
     OR v_ficha->>'nombre_visualizacion' <> 'Falso plátano' OR v_ficha->>'articulo' <> 'el'
     OR v_ficha->'ejemplar' <> '{"historia": "Plantado por los vecinos.", "historia_fuente": "Junta de vecinos"}'::jsonb
     OR v_ficha->'foto_principal' <> '{"tipo": "referencial_especie", "ruta": "especies/oficial.webp", "credito": "SIVU, CC BY 4.0"}'::jsonb THEN
    RAISE EXCEPTION 'F5 FALLA: ficha con contenido: %', v_ficha;
  END IF;
  -- Guardar la ficha no toca la foto; fijarla la pone primero
  PERFORM public.fn_fijar_foto_ficha_publica(v_tree, v_municipal, 'arboles/propia.webp');
  PERFORM public.fn_guardar_ficha_publica_arbol(v_tree, v_municipal, '{"mostrar_altura_total": true}');
  v_ficha := public.fn_ficha_publica_arbol(v_qr);
  IF v_ficha->'foto_principal' <> '{"tipo": "ejemplar", "ruta": "arboles/propia.webp"}'::jsonb
     OR v_ficha->'ejemplar' <> '{}'::jsonb
     OR v_ficha->'contenido_especie'->>'curiosidad' <> 'No es un plátano: es un arce.' THEN
    RAISE EXCEPTION 'F5 FALLA: foto del ejemplar o reemplazo completo: %', v_ficha;
  END IF;
  IF v_ficha::text ~* ('(tree_code|tree_id|qr_token|utm|riesgo|project|updated_by|inspecc|incidenc|' || v_tree::text || '|' || v_municipal::text || ')') THEN
    RAISE EXCEPTION 'F5 FALLA: la ficha trae datos técnicos o internos: %', v_ficha;
  END IF;
  v_ficha := public.fn_ficha_publica_arbol(v_qr_sin);
  IF v_ficha->'contenido_especie' <> 'null'::jsonb OR v_ficha->>'nombre_visualizacion' <> 'Árbol sin identificar'
     OR v_ficha->'articulo' <> 'null'::jsonb OR v_ficha->'foto_principal' <> 'null'::jsonb OR v_ficha->'medidas' <> '{}'::jsonb
     OR v_ficha->'sobre_la_especie'->>'origen_biogeografico' <> 'no_determinado' THEN
    RAISE EXCEPTION 'F5 FALLA: árbol sin especie: %', v_ficha;
  END IF;
  IF public.fn_ficha_publica_arbol(gen_random_uuid()) IS NOT NULL THEN
    RAISE EXCEPTION 'F5 FALLA: QR inexistente devolvió una ficha';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F5 OK: claves de la 028 iguales; textos personalizados encima; foto ejemplar > referencial; medidas solo activadas con valor; nada técnico; sin especie sin contenido');

  -- F6
  PERFORM public.fn_guardar_ficha_publica_arbol(v_tree_c, v_municipal, '{"mostrar_dap": true}');
  UPDATE public.projects SET estado_proyecto = 'cerrado' WHERE id = v_project_cerrado;
  PERFORM pg_temp.espera_error(format('SELECT public.fn_guardar_ficha_publica_arbol(%L, %L, ''{}'')', v_tree_c, v_municipal), 'P0001', 'F6 editar ficha de proyecto cerrado');
  PERFORM pg_temp.espera_error(format('SELECT public.fn_fijar_foto_ficha_publica(%L, %L, ''arboles/c.webp'')', v_tree_c, v_municipal), 'P0001', 'F6 foto de proyecto cerrado');
  INSERT INTO test_log (msg) VALUES ('F6 OK: proyecto Cerrado, la ficha del árbol queda solo consulta');

  -- F7
  FOR v_fn IN SELECT unnest(ARRAY[
    'public.fn_ficha_publica_arbol(uuid)', 'public.fn_assert_editor_contenido_publico(uuid, uuid, text)',
    'public.fn_guardar_contenido_especie(uuid, uuid, jsonb)', 'public.fn_fijar_foto_especie(uuid, uuid, text, text, text, boolean)',
    'public.fn_guardar_ficha_publica_arbol(uuid, uuid, jsonb)', 'public.fn_fijar_foto_ficha_publica(uuid, uuid, text)']) LOOP
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(v_rol, v_fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'F7 FALLA: % puede ejecutar %', v_rol, v_fn;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'F7 FALLA: service_role no puede ejecutar %', v_fn;
    END IF;
  END LOOP;
  FOREACH v_fn IN ARRAY ARRAY['public.species_public_content', 'public.tree_public_content'] LOOP
    IF has_table_privilege('authenticated', v_fn, 'INSERT') OR has_table_privilege('authenticated', v_fn, 'UPDATE')
       OR has_table_privilege('authenticated', v_fn, 'DELETE') OR has_table_privilege('anon', v_fn, 'SELECT')
       OR NOT has_table_privilege('authenticated', v_fn, 'SELECT') THEN
      RAISE EXCEPTION 'F7 FALLA: privilegios de %', v_fn;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'conecta-publico' AND public
                 AND file_size_limit = 2097152 AND allowed_mime_types = ARRAY['image/webp']) THEN
    RAISE EXCEPTION 'F7 FALLA: bucket conecta-publico';
  END IF;
  INSERT INTO test_log (msg) VALUES ('F7 OK: funciones solo service_role; tablas sin escritura directa; bucket público solo WebP de 2 MB');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
