-- =====================================================================
-- Pruebas de la migración 018i — catálogo de especies (#73; CC-053)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018i.
-- Todo corre dentro de BEGIN … ROLLBACK. Usuario de prueba temporal en
-- auth.users, mismo patrón autorizado por la responsable que en
-- pruebas_018e_inspection_draft.sql.
--
-- Simula lo que el #59 (finalización, todavía sin construir) hará más
-- adelante: una fila de `tree_data_versions` de inspección con
-- `species_id` ya resuelto. `fn_resolve_or_create_species` se invoca
-- directamente en la prueba para obtener ese id, igual que lo hará el
-- #59 cuando exista.
--
-- E1 (la importante, pedida por la responsable): renombrar una especie
--     actualiza el nombre vigente de TODOS los árboles vinculados por
--     species_id, incluso DESPUÉS de completar una OT y correr
--     fn_refresh_tree_current otra vez (sin ninguna inspección nueva).
-- E2 (pedida): el nombre anterior queda en species_name_history.
-- E3 (pedida): un árbol con una especie escrita que no está en el
--     catálogo (species_id NULL) conserva su texto sin cambios, incluso
--     si OTRA especie se renombra.
-- E4: fn_rename_species rechaza a quien no tiene rol Inspector.
-- E5: fn_complete_species completa los 5 campos; rechaza a quien no
--     tiene rol Inspector.
-- E6: fn_resolve_or_create_species reutiliza una especie existente por
--     forma normalizada (no duplica).
-- E7: fn_resolve_or_create_species incorpora una especie nueva con su
--     created_by; rechaza a quien no tiene rol Inspector.
-- E8: v_species_traits resuelve por species_id (no se pierde tras un
--     renombre, aunque el texto de la fila ya no coincida).
-- E9: renombrar a un nombre que ya existe (forma normalizada) choca
--     con uq_species_especie_cientifica_norm (23505) — el backend
--     deberá traducirlo a 409 (pendiente, no es parte de esta migración).
-- E10: una inspección que confirma una especie del catálogo (species_id
--     en su fila de tree_data_versions) NO cambia trees.species_id
--     mientras la OT no esté completada; al completarla y correr
--     fn_refresh_tree_current, el árbol queda vinculado.

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

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_inspector uuid;
  v_no_inspector uuid;
  v_tree_res jsonb;
  v_tree_id uuid;
  v_tree_id_2 uuid;
  v_species_id uuid;
  v_species_id_2 uuid;
  v_species_id_otro uuid;
  v_wo_id uuid;
  v_inspection_id uuid;
  v_res jsonb;
  v_tree record;
  v_count integer;
  v_species_id_e9 uuid;
  v_tree_id_3 uuid;
  v_wo_id_2 uuid;
  v_inspection_id_2 uuid;
  v_species_id_e10 uuid;
BEGIN
  v_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'inspector-018i@sivu.example.test', p_rol => 'inspector', p_nombre => 'Inspector de prueba (018i)'
  );
  v_no_inspector := pg_temp.crear_usuario_prueba(
    p_email => 'municipal-018i@sivu.example.test', p_rol => 'usuario_municipal', p_nombre => 'Usuario municipal de prueba (018i)'
  );

  INSERT INTO projects (nombre_proyecto) VALUES ('018i prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector()) RETURNING id INTO v_sector_id;

  -- ------------------------------------------------------------------
  -- Preparación de E1/E2: árbol con una inspección Finalizada (OT
  -- Completada) cuya tree_data_versions ya trae species_id resuelto.
  -- ------------------------------------------------------------------
  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Nombre viejo', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_no_inspector
  );
  v_tree_id := (v_tree_res->>'id')::uuid;

  v_species_id := fn_resolve_or_create_species(p_especie_cientifica => 'Nombre viejo', p_created_by => v_inspector);

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, finalizada_at,
    rule_version, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id, v_inspector, v_wo_id, 'finalizado', now(),
    '2.1', current_date, v_inspector
  ) RETURNING id INTO v_inspection_id;

  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, especie_cientifica, species_id, created_by)
  VALUES (v_tree_id, v_inspection_id, ARRAY['especie_cientifica'], 'Nombre viejo', v_species_id, v_inspector);

  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = current_date WHERE id = v_wo_id;

  PERFORM fn_refresh_tree_current(v_tree_id);
  SELECT especie_cientifica, species_id INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Nombre viejo' OR v_tree.species_id IS DISTINCT FROM v_species_id THEN
    RAISE EXCEPTION 'Preparación E1 FALLA: especie vigente antes de renombrar = % / %', v_tree.especie_cientifica, v_tree.species_id;
  END IF;

  -- ------------------------------------------------------------------
  -- E1 — renombrar la especie, correr fn_refresh_tree_current otra vez
  -- (sin ninguna inspección nueva) → el árbol muestra el nombre nuevo.
  -- ------------------------------------------------------------------
  v_res := fn_rename_species(p_species_id => v_species_id, p_nombre_nuevo => 'Nombre nuevo', p_changed_by => v_inspector);
  IF (v_res->>'especie_cientifica') <> 'Nombre nuevo' THEN
    RAISE EXCEPTION 'E1 FALLA: fn_rename_species no devolvió el nombre nuevo: %', v_res;
  END IF;

  PERFORM fn_refresh_tree_current(v_tree_id);
  SELECT especie_cientifica INTO v_tree FROM trees WHERE id = v_tree_id;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Nombre nuevo' THEN
    RAISE EXCEPTION 'E1 FALLA: el árbol sigue mostrando el nombre viejo tras el renombre: %', v_tree.especie_cientifica;
  END IF;
  INSERT INTO test_log (msg) VALUES ('E1 OK');

  -- ------------------------------------------------------------------
  -- E2 — el nombre anterior queda en species_name_history.
  -- ------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM species_name_history
    WHERE species_id = v_species_id AND nombre_anterior = 'Nombre viejo' AND nombre_nuevo = 'Nombre nuevo'
      AND changed_by = v_inspector
  ) THEN
    RAISE EXCEPTION 'E2 FALLA: no quedó el registro esperado en species_name_history';
  END IF;
  INSERT INTO test_log (msg) VALUES ('E2 OK');

  -- ------------------------------------------------------------------
  -- E3 — un árbol con especie escrita sin confirmar (species_id NULL)
  -- conserva su texto, incluso si OTRA especie se renombra.
  -- ------------------------------------------------------------------
  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Otro punto',
    p_utm_este => 256100, p_utm_norte => 6341000,
    p_especie_cientifica => 'Texto sin confirmar', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_no_inspector
  );
  v_tree_id_2 := (v_tree_res->>'id')::uuid;

  v_species_id_otro := fn_resolve_or_create_species(p_especie_cientifica => 'Otra especie cualquiera', p_created_by => v_inspector);
  PERFORM fn_rename_species(p_species_id => v_species_id_otro, p_nombre_nuevo => 'Otra especie renombrada', p_changed_by => v_inspector);

  PERFORM fn_refresh_tree_current(v_tree_id_2);
  SELECT especie_cientifica, species_id INTO v_tree FROM trees WHERE id = v_tree_id_2;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Texto sin confirmar' OR v_tree.species_id IS NOT NULL THEN
    RAISE EXCEPTION 'E3 FALLA: el árbol sin confirmar cambió: % / %', v_tree.especie_cientifica, v_tree.species_id;
  END IF;
  INSERT INTO test_log (msg) VALUES ('E3 OK');

  -- ------------------------------------------------------------------
  -- E4 — fn_rename_species rechaza a quien no es Inspector.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_rename_species(p_species_id => v_species_id, p_nombre_nuevo => 'Otro nombre más', p_changed_by => v_no_inspector);
    RAISE EXCEPTION 'E4 FALLA: un usuario_municipal pudo renombrar una especie';
  EXCEPTION WHEN SQLSTATE 'SV061' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('E4 OK');

  -- ------------------------------------------------------------------
  -- E5 — fn_complete_species completa los 5 campos; rechaza a quien no
  -- es Inspector.
  -- ------------------------------------------------------------------
  v_res := fn_complete_species(
    p_species_id => v_species_id, p_genero => 'Genero test', p_familia => 'Familia test',
    p_origen_biogeografico => 'nativa', p_persistencia_follaje => 'perennifolia', p_tipo_hoja => 'latifoliada',
    p_changed_by => v_inspector
  );
  IF (v_res->>'genero') <> 'Genero test' OR (v_res->>'origen_biogeografico') <> 'nativa' THEN
    RAISE EXCEPTION 'E5 FALLA: fn_complete_species no guardó los campos: %', v_res;
  END IF;

  BEGIN
    PERFORM fn_complete_species(
      p_species_id => v_species_id, p_genero => 'X', p_familia => 'Y',
      p_origen_biogeografico => 'nativa', p_persistencia_follaje => 'perennifolia', p_tipo_hoja => 'latifoliada',
      p_changed_by => v_no_inspector
    );
    RAISE EXCEPTION 'E5 FALLA: un usuario_municipal pudo completar una especie';
  EXCEPTION WHEN SQLSTATE 'SV062' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('E5 OK');

  -- ------------------------------------------------------------------
  -- E6 — fn_resolve_or_create_species reutiliza por forma normalizada
  -- (no duplica).
  -- ------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM species WHERE especie_cientifica = 'Nombre nuevo';
  v_species_id_2 := fn_resolve_or_create_species(p_especie_cientifica => '  nombre   NUEVO  ', p_created_by => v_inspector);
  IF v_species_id_2 <> v_species_id THEN
    RAISE EXCEPTION 'E6 FALLA: no reutilizó la especie existente por forma normalizada (devolvió %, esperaba %)', v_species_id_2, v_species_id;
  END IF;
  IF (SELECT count(*) FROM species WHERE especie_cientifica = 'Nombre nuevo') <> v_count THEN
    RAISE EXCEPTION 'E6 FALLA: se creó una fila duplicada';
  END IF;
  INSERT INTO test_log (msg) VALUES ('E6 OK');

  -- ------------------------------------------------------------------
  -- E7 — fn_resolve_or_create_species incorpora una especie nueva con
  -- su created_by; rechaza a quien no es Inspector.
  -- ------------------------------------------------------------------
  v_species_id_2 := fn_resolve_or_create_species(p_especie_cientifica => 'Especie completamente nueva', p_created_by => v_inspector);
  IF NOT EXISTS (SELECT 1 FROM species WHERE id = v_species_id_2 AND especie_cientifica = 'Especie completamente nueva' AND created_by = v_inspector) THEN
    RAISE EXCEPTION 'E7 FALLA: no se incorporó la especie nueva con su created_by';
  END IF;

  BEGIN
    PERFORM fn_resolve_or_create_species(p_especie_cientifica => 'Otra especie nueva más', p_created_by => v_no_inspector);
    RAISE EXCEPTION 'E7 FALLA: un usuario_municipal pudo incorporar una especie';
  EXCEPTION WHEN SQLSTATE 'SV063' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('E7 OK');

  -- ------------------------------------------------------------------
  -- E8 — v_species_traits resuelve por species_id (no se pierde tras
  -- un renombre, aunque el texto de la fila ya no coincida).
  -- ------------------------------------------------------------------
  PERFORM fn_rename_species(p_species_id => v_species_id, p_nombre_nuevo => 'Nombre nuevo cambiado otra vez', p_changed_by => v_inspector);
  IF NOT EXISTS (
    SELECT 1 FROM v_species_traits WHERE tree_id = v_tree_id AND genero = 'Genero test' AND familia = 'Familia test'
  ) THEN
    RAISE EXCEPTION 'E8 FALLA: v_species_traits perdió los rasgos tras el renombre';
  END IF;
  INSERT INTO test_log (msg) VALUES ('E8 OK');

  -- ------------------------------------------------------------------
  -- E9 — renombrar a un nombre que ya existe (forma normalizada) choca
  -- con la unicidad (23505), no pasa silenciosamente.
  -- ------------------------------------------------------------------
  v_species_id_e9 := fn_resolve_or_create_species(p_especie_cientifica => 'Especie e9 objetivo', p_created_by => v_inspector);
  BEGIN
    PERFORM fn_rename_species(p_species_id => v_species_id_otro, p_nombre_nuevo => 'especie   E9   Objetivo', p_changed_by => v_inspector);
    RAISE EXCEPTION 'E9 FALLA: el renombre debió chocar con la unicidad normalizada';
  EXCEPTION WHEN SQLSTATE '23505' THEN
    NULL;
  END;
  INSERT INTO test_log (msg) VALUES ('E9 OK');

  -- ------------------------------------------------------------------
  -- E10 — una inspección que confirma una especie del catálogo no
  -- cambia trees.species_id mientras la OT no esté completada; al
  -- completarla y correr fn_refresh_tree_current, el árbol queda
  -- vinculado.
  -- ------------------------------------------------------------------
  v_tree_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Punto E10',
    p_utm_este => 256200, p_utm_norte => 6341000,
    p_especie_cientifica => 'Especie e10 original', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_no_inspector
  );
  v_tree_id_3 := (v_tree_res->>'id')::uuid;
  v_species_id_e10 := fn_resolve_or_create_species(p_especie_cientifica => 'Especie e10 confirmada', p_created_by => v_inspector);

  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por, responsable_accion_id
  ) VALUES (
    v_project_id, v_tree_id_3, 'inspeccion', 'evaluacion_inicial', 'en_ejecucion',
    current_date, v_no_inspector, v_inspector
  ) RETURNING id INTO v_wo_id_2;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, finalizada_at,
    rule_version, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id_3, v_inspector, v_wo_id_2, 'finalizado', now(),
    '2.1', current_date, v_inspector
  ) RETURNING id INTO v_inspection_id_2;

  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, especie_cientifica, species_id, created_by)
  VALUES (v_tree_id_3, v_inspection_id_2, ARRAY['especie_cientifica'], 'Especie e10 confirmada', v_species_id_e10, v_inspector);

  -- OT todavía en_ejecucion: fn_refresh_tree_current no debe tomar esta
  -- fila (no cumple wo.estado_ot = 'completada'), el árbol sigue en su
  -- estado del alta.
  PERFORM fn_refresh_tree_current(v_tree_id_3);
  SELECT especie_cientifica, species_id INTO v_tree FROM trees WHERE id = v_tree_id_3;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Especie e10 original' OR v_tree.species_id IS NOT NULL THEN
    RAISE EXCEPTION 'E10 FALLA: el árbol se vinculó antes de completar la OT: % / %', v_tree.especie_cientifica, v_tree.species_id;
  END IF;

  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = current_date WHERE id = v_wo_id_2;
  PERFORM fn_refresh_tree_current(v_tree_id_3);
  SELECT especie_cientifica, species_id INTO v_tree FROM trees WHERE id = v_tree_id_3;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Especie e10 confirmada' OR v_tree.species_id IS DISTINCT FROM v_species_id_e10 THEN
    RAISE EXCEPTION 'E10 FALLA: el árbol no quedó vinculado tras completar la OT: % / %', v_tree.especie_cientifica, v_tree.species_id;
  END IF;
  INSERT INTO test_log (msg) VALUES ('E10 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
