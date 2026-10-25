-- =====================================================================
-- Pruebas de la migración 018d — alta con versión (#57; CC-046 §3.6)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018d.
-- Todo corre dentro de BEGIN … ROLLBACK: crea proyecto, sector, árbol,
-- OT e inspección de prueba, pero nada queda en la base.
--
-- A1 a A6 son los casos pedidos por la responsable (A6 agregado tras el
-- defecto real de `array_append` descrito en la 018d). A3 es la prueba de
-- fondo: confirma que, después de que `fn_refresh_tree_current` procesa
-- una OT que solo registró un dato técnico (`dap_cm`), la ubicación, el
-- nombre, la especie y el sector del alta se CONSERVAN (antes de la
-- 018d quedaban en NULL, porque no existía la fila de respaldo). Entre
-- A2 y A3 se conserva un caso del script anterior de pruebas del #57
-- (`pruebas_057_alta_arbol.sql`, ya retirado: probaba un INSERT directo
-- que esta migración reemplazó) — el `CHECK chk_trees_especie_o_comun`
-- sigue defendiendo el alta sin especie ni nombre.

BEGIN;

CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Transform(ST_SetSRID(ST_GeomFromText(
    'POLYGON((255000 6340000, 257000 6340000, 257000 6342000, 255000 6342000, 255000 6340000))'
  ), 32719), 4326))::geography;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_sector_geom geography;
  v_usuario uuid;
  v_res jsonb;
  v_tree_id uuid;
  v_tree record;
  v_wo_id uuid;
  v_inspection_id uuid;
BEGIN
  SELECT id INTO v_usuario FROM user_profiles LIMIT 1;
  v_sector_geom := pg_temp.geom_sector();

  -- Proyecto y sector comunes para A1–A4 (geometría transformada a 4326
  -- primero, para reutilizar las mismas coordenadas UTM en cada caso).
  INSERT INTO projects (nombre_proyecto) VALUES ('#57 018d prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', v_sector_geom) RETURNING id INTO v_sector_id;

  -- ------------------------------------------------------------------
  -- A1 — el alta crea las dos filas (trees y su versión en
  -- tree_data_versions, inspection_id NULL).
  -- ------------------------------------------------------------------
  v_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Frente a la plaza',
    p_utm_este => 256000, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => v_usuario
  );
  v_tree_id := (v_res->>'id')::uuid;

  IF NOT EXISTS (SELECT 1 FROM trees WHERE id = v_tree_id) THEN
    RAISE EXCEPTION 'A1 FALLA: no se creó la fila en trees';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tree_data_versions
    WHERE tree_id = v_tree_id AND inspection_id IS NULL
      AND campos_registrados = ARRAY['sector','ubicacion_descriptiva','utm_este','utm_norte','especie_cientifica','nombre_comun']
  ) THEN
    RAISE EXCEPTION 'A1 FALLA: no se creó (o no coincide) la versión de alta en tree_data_versions';
  END IF;
  -- tree_code/estado_ciclo_vida/fecha_registro generados solos (igual
  -- que verificaba pruebas_057_alta_arbol.sql antes de retirarse).
  IF v_res->>'tree_code' NOT LIKE 'A-%' THEN RAISE EXCEPTION 'A1 FALLA: tree_code = %', v_res->>'tree_code'; END IF;
  IF v_res->>'estado_ciclo_vida' <> 'activo' THEN RAISE EXCEPTION 'A1 FALLA: estado_ciclo_vida = %', v_res->>'estado_ciclo_vida'; END IF;
  INSERT INTO test_log (msg) VALUES (format('A1 OK: trees y tree_data_versions (alta) creadas, campos_registrados completo, tree_code=%s', v_res->>'tree_code'));

  -- ------------------------------------------------------------------
  -- A2 — alta fuera del sector: se rechaza y no deja ninguna fila (ni
  -- en trees ni en tree_data_versions).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_tree_alta(
      p_project_id => v_project_id, p_sector_id => v_sector_id,
      p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Fuera del sector',
      p_utm_este => 365000, p_utm_norte => 6341000,
      p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
      p_fecha_registro => current_date, p_registrado_por => v_usuario
    );
    RAISE EXCEPTION 'A2 FALLA: se aceptó un alta fuera del sector';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM trees WHERE sector = 'Barrio Puerto' AND ubicacion_descriptiva = 'Fuera del sector') THEN
    RAISE EXCEPTION 'A2 FALLA: quedó una fila en trees a pesar del rechazo';
  END IF;
  IF EXISTS (SELECT 1 FROM tree_data_versions WHERE ubicacion_descriptiva = 'Fuera del sector') THEN
    RAISE EXCEPTION 'A2 FALLA: quedó una fila en tree_data_versions a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('A2 OK: alta fuera del sector rechazada, sin fila en ninguna tabla');

  -- ------------------------------------------------------------------
  -- (heredado de pruebas_057_alta_arbol.sql) sin especie_cientifica ni
  -- nombre_comun → rechazado por chk_trees_especie_o_comun (23514), sin
  -- fila en ninguna tabla.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_tree_alta(
      p_project_id => v_project_id, p_sector_id => v_sector_id,
      p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Sin especie ni nombre',
      p_utm_este => 256050, p_utm_norte => 6341000,
      p_especie_cientifica => NULL, p_nombre_comun => NULL,
      p_fecha_registro => current_date, p_registrado_por => v_usuario
    );
    RAISE EXCEPTION 'FALLA: se aceptó un alta sin especie_cientifica ni nombre_comun';
  EXCEPTION WHEN SQLSTATE '23514' THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM trees WHERE ubicacion_descriptiva = 'Sin especie ni nombre') THEN
    RAISE EXCEPTION 'FALLA: quedó una fila en trees a pesar del rechazo (sin especie ni nombre)';
  END IF;
  INSERT INTO test_log (msg) VALUES ('OK: alta sin especie_cientifica ni nombre_comun rechazada por el CHECK, sin fila en ninguna tabla');

  -- ------------------------------------------------------------------
  -- A3 (la importante) — alta → OT e inspección que solo registran
  -- dap_cm → completar la OT → fn_refresh_tree_current → la ubicación,
  -- el nombre, la especie y el sector del alta se CONSERVAN.
  -- ------------------------------------------------------------------
  INSERT INTO work_orders (
    project_id, tree_id, tipo_ot, accion_solicitada, estado_ot,
    fecha_accion_programada, ot_creado_por
  ) VALUES (
    v_project_id, v_tree_id, 'inspeccion', 'evaluacion_tecnica', 'pendiente',
    current_date, v_usuario
  ) RETURNING id INTO v_wo_id;

  INSERT INTO inspections (
    tree_id, inspector, work_order_id, estado_registro, finalizada_at,
    rule_version, fecha_registro, registrado_por
  ) VALUES (
    v_tree_id, v_usuario, v_wo_id, 'finalizado', now(),
    '2.1', current_date, v_usuario
  ) RETURNING id INTO v_inspection_id;

  -- Esta inspección solo registró dap_cm: ninguna coordenada (válido,
  -- el trigger de tree_data_versions no valida sin utm_este/utm_norte).
  INSERT INTO tree_data_versions (tree_id, inspection_id, campos_registrados, dap_cm, created_by)
  VALUES (v_tree_id, v_inspection_id, ARRAY['dap_cm'], 25.5, v_usuario);

  -- "Completar la OT" (D-239; el trigger fn_check_ot_completada exige
  -- que no queden inspecciones en preguardado — la nuestra ya está
  -- finalizada).
  UPDATE work_orders SET estado_ot = 'completada', fecha_completada_ot = current_date WHERE id = v_wo_id;

  PERFORM fn_refresh_tree_current(v_tree_id);

  SELECT sector, ubicacion_descriptiva, utm_este, utm_norte, especie_cientifica, nombre_comun, dap_cm
  INTO v_tree FROM trees WHERE id = v_tree_id;

  IF v_tree.sector IS DISTINCT FROM 'Barrio Puerto' THEN RAISE EXCEPTION 'A3 FALLA: sector = %', v_tree.sector; END IF;
  IF v_tree.ubicacion_descriptiva IS DISTINCT FROM 'Frente a la plaza' THEN RAISE EXCEPTION 'A3 FALLA: ubicacion_descriptiva = %', v_tree.ubicacion_descriptiva; END IF;
  IF v_tree.utm_este IS DISTINCT FROM 256000 THEN RAISE EXCEPTION 'A3 FALLA: utm_este = %', v_tree.utm_este; END IF;
  IF v_tree.utm_norte IS DISTINCT FROM 6341000 THEN RAISE EXCEPTION 'A3 FALLA: utm_norte = %', v_tree.utm_norte; END IF;
  IF v_tree.especie_cientifica IS DISTINCT FROM 'Robinia pseudoacacia' THEN RAISE EXCEPTION 'A3 FALLA: especie_cientifica = %', v_tree.especie_cientifica; END IF;
  IF v_tree.nombre_comun IS DISTINCT FROM 'Falsa acacia' THEN RAISE EXCEPTION 'A3 FALLA: nombre_comun = %', v_tree.nombre_comun; END IF;
  IF v_tree.dap_cm IS DISTINCT FROM 25.5 THEN RAISE EXCEPTION 'A3 FALLA: dap_cm (de la inspección) = %', v_tree.dap_cm; END IF;

  INSERT INTO test_log (msg) VALUES ('A3 OK: tras la OT parcial (solo dap_cm), ubicación/nombre/especie/sector se conservan del alta; dap_cm = 25.5');

  -- ------------------------------------------------------------------
  -- A4 — alta con solo nombre_comun: campos_registrados NO incluye
  -- especie_cientifica.
  -- ------------------------------------------------------------------
  v_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Otro punto',
    p_utm_este => 256100, p_utm_norte => 6341000,
    p_especie_cientifica => NULL, p_nombre_comun => 'Falsa acacia',
    p_fecha_registro => current_date, p_registrado_por => v_usuario
  );

  IF NOT EXISTS (
    SELECT 1 FROM tree_data_versions
    WHERE tree_id = (v_res->>'id')::uuid AND inspection_id IS NULL
      AND campos_registrados = ARRAY['sector','ubicacion_descriptiva','utm_este','utm_norte','nombre_comun']
      AND NOT ('especie_cientifica' = ANY(campos_registrados))
  ) THEN
    RAISE EXCEPTION 'A4 FALLA: campos_registrados no es exactamente el esperado (sin especie_cientifica)';
  END IF;

  INSERT INTO test_log (msg) VALUES ('A4 OK: alta con solo nombre_comun, campos_registrados sin especie_cientifica');

  -- ------------------------------------------------------------------
  -- A5 — alta sin ubicacion_descriptiva → 422 (SV057), sin filas
  -- escritas en ninguna tabla.
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM fn_create_tree_alta(
      p_project_id => v_project_id, p_sector_id => v_sector_id,
      p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => NULL,
      p_utm_este => 256200, p_utm_norte => 6341000,
      p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
      p_fecha_registro => current_date, p_registrado_por => v_usuario
    );
    RAISE EXCEPTION 'A5 FALLA: se aceptó un alta sin ubicacion_descriptiva';
  EXCEPTION WHEN SQLSTATE 'SV057' THEN
    IF SQLERRM <> 'ubicacion_descriptiva es obligatoria' THEN
      RAISE EXCEPTION 'A5 FALLA: mensaje inesperado: %', SQLERRM;
    END IF;
  END;
  IF EXISTS (SELECT 1 FROM trees WHERE utm_este = 256200) THEN
    RAISE EXCEPTION 'A5 FALLA: quedó una fila en trees a pesar del rechazo';
  END IF;
  IF EXISTS (SELECT 1 FROM tree_data_versions WHERE utm_este = 256200) THEN
    RAISE EXCEPTION 'A5 FALLA: quedó una fila en tree_data_versions a pesar del rechazo';
  END IF;
  INSERT INTO test_log (msg) VALUES ('A5 OK: alta sin ubicacion_descriptiva rechazada con SV057, sin fila en ninguna tabla');

  -- ------------------------------------------------------------------
  -- A6 — alta con solo especie_cientifica (inverso de A4): campos_registrados
  -- incluye especie_cientifica y NO incluye nombre_comun. Caso agregado
  -- tras el defecto real encontrado en array_append (v_campos || 'literal'
  -- fallaba con 22P02 siempre que especie_cientifica o nombre_comun
  -- venían presentes).
  -- ------------------------------------------------------------------
  v_res := fn_create_tree_alta(
    p_project_id => v_project_id, p_sector_id => v_sector_id,
    p_sector => 'Barrio Puerto', p_ubicacion_descriptiva => 'Otro punto más',
    p_utm_este => 256300, p_utm_norte => 6341000,
    p_especie_cientifica => 'Robinia pseudoacacia', p_nombre_comun => NULL,
    p_fecha_registro => current_date, p_registrado_por => v_usuario
  );

  IF NOT EXISTS (
    SELECT 1 FROM tree_data_versions
    WHERE tree_id = (v_res->>'id')::uuid AND inspection_id IS NULL
      AND campos_registrados = ARRAY['sector','ubicacion_descriptiva','utm_este','utm_norte','especie_cientifica']
      AND NOT ('nombre_comun' = ANY(campos_registrados))
  ) THEN
    RAISE EXCEPTION 'A6 FALLA: campos_registrados no es exactamente el esperado (sin nombre_comun)';
  END IF;

  INSERT INTO test_log (msg) VALUES ('A6 OK: alta con solo especie_cientifica, campos_registrados sin nombre_comun');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
