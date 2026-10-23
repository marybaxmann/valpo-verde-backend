-- =====================================================================
-- Pruebas de la migración 018c — árbol dentro del sector (CC-046)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018c.
-- Todo corre dentro de BEGIN … ROLLBACK: crea un proyecto, un sector y
-- árboles de prueba, pero nada queda en la base. Coordenadas UTM 19S
-- genéricas (no corresponden a ningún sector real). `registrado_por`
-- reutiliza un `user_profiles.id` ya existente en pruebas (no crea
-- usuarios).
--
-- Sector de prueba: un cuadrado de 1 km de lado en UTM 19S, con un
-- hueco interior cuadrado en el centro, más un segundo cuadrado
-- separado (para el caso de multipolígono).
--
-- V1 a V7: casos pedidos originalmente (dentro/fuera/borde/hueco/
-- multipolígono/cambio de ubicación/nueva delimitación). V8: la
-- coordenada se rechaza al registrarse en tree_data_versions (alta o
-- inspección), no solo al completar la OT. V9: un sector inexistente
-- se rechaza con SV046, no se deja pasar la validación en silencio
-- (ajuste del punto 1, 2026-10-23).

BEGIN;

-- Sector: MultiPolygon con un hueco, + una segunda superficie separada.
CREATE FUNCTION pg_temp.geom_sector() RETURNS geography LANGUAGE sql AS $$
  SELECT ST_Multi(ST_Union(ARRAY[
    -- Primera superficie: cuadrado 360000..361000 / 6340000..6341000 (UTM 19S),
    -- con un hueco cuadrado 360400..360600 / 6340400..6340600 en el centro.
    ST_Transform(ST_SetSRID(ST_GeomFromText(
      'POLYGON((360000 6340000, 361000 6340000, 361000 6341000, 360000 6341000, 360000 6340000),'
      || '(360400 6340400, 360600 6340400, 360600 6340600, 360400 6340600, 360400 6340400))'
    ), 32719), 4326),
    -- Segunda superficie, separada: cuadrado 362000..362500 / 6340000..6340500.
    ST_Transform(ST_SetSRID(ST_GeomFromText('POLYGON((362000 6340000, 362500 6340000, 362500 6340500, 362000 6340500, 362000 6340000))'), 32719), 4326)
  ]))::geography;
$$;

CREATE FUNCTION pg_temp.utm_a_4326(p_este double precision, p_norte double precision) RETURNS geography
LANGUAGE sql AS $$
  SELECT ST_Transform(ST_SetSRID(ST_MakePoint(p_este, p_norte), 32719), 4326)::geography;
$$;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_project_id uuid;
  v_sector_id uuid;
  v_tree_id uuid;
  v_registrado_por uuid;
  v_msg text;
  v_geom_chica jsonb;
BEGIN
  SELECT id INTO v_registrado_por FROM user_profiles LIMIT 1;
  IF v_registrado_por IS NULL THEN
    RAISE EXCEPTION 'No hay ningún user_profiles en esta base para usar como registrado_por';
  END IF;

  INSERT INTO projects (nombre_proyecto) VALUES ('CC-046 prueba') RETURNING id INTO v_project_id;
  INSERT INTO sectors (project_id, nombre_sector, geometria_sector)
    VALUES (v_project_id, 'Sector de prueba', pg_temp.geom_sector())
    RETURNING id INTO v_sector_id;

  -- V1 — dentro de la primera superficie → se acepta.
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, v_sector_id, 360500, 6340200, 'Especie de prueba', v_registrado_por, current_date)
      RETURNING id INTO v_tree_id;
    INSERT INTO test_log (msg) VALUES ('V1 OK: árbol dentro, aceptado');
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    RAISE EXCEPTION 'V1 FALLA: se rechazó un árbol que está dentro: %', SQLERRM;
  END;

  -- V2 — fuera de toda superficie → se rechaza.
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, v_sector_id, 365000, 6340500, 'Especie de prueba', v_registrado_por, current_date);
    RAISE EXCEPTION 'V2 FALLA: se aceptó un árbol fuera del sector';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    INSERT INTO test_log (msg) VALUES ('V2 OK: ' || SQLERRM);
  END;

  -- V3 — exactamente sobre el borde (ST_Covers, no ST_Contains) → se acepta.
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, v_sector_id, 360000, 6340500, 'Especie de prueba', v_registrado_por, current_date);
    INSERT INTO test_log (msg) VALUES ('V3 OK: árbol sobre el borde, aceptado (ST_Covers)');
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    RAISE EXCEPTION 'V3 FALLA: se rechazó un árbol sobre el borde: %', SQLERRM;
  END;

  -- V4 — dentro del hueco interior → se rechaza.
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, v_sector_id, 360500, 6340500, 'Especie de prueba', v_registrado_por, current_date);
    RAISE EXCEPTION 'V4 FALLA: se aceptó un árbol dentro de un hueco interior';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    INSERT INTO test_log (msg) VALUES ('V4 OK: ' || SQLERRM);
  END;

  -- V5 — multipolígono, árbol en la segunda superficie → se acepta.
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, v_sector_id, 362250, 6340250, 'Especie de prueba', v_registrado_por, current_date);
    INSERT INTO test_log (msg) VALUES ('V5 OK: árbol en la segunda superficie del multipolígono, aceptado');
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    RAISE EXCEPTION 'V5 FALLA: se rechazó un árbol dentro de la segunda superficie: %', SQLERRM;
  END;

  -- V6 — cambio de ubicación que lo deja fuera → se rechaza (UPDATE, no solo INSERT).
  BEGIN
    UPDATE trees SET utm_este = 365000, utm_norte = 6340500 WHERE id = v_tree_id;
    RAISE EXCEPTION 'V6 FALLA: se aceptó un cambio de ubicación que deja el árbol fuera';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    INSERT INTO test_log (msg) VALUES ('V6 OK: ' || SQLERRM);
  END;
  -- El árbol V1 sigue con su ubicación original (el UPDATE se abortó).
  IF (SELECT utm_este FROM trees WHERE id = v_tree_id) <> 360500 THEN
    RAISE EXCEPTION 'V6 FALLA: la ubicación quedó modificada a pesar del rechazo';
  END IF;

  -- V7 — nueva delimitación que deja árboles fuera → se rechaza con la lista de tree_code.
  -- Una geometría chica (10 m de radio) alrededor de V1, que deja fuera a V3 y V5.
  v_geom_chica := ST_AsGeoJSON(ST_Buffer(pg_temp.utm_a_4326(360500, 6340200), 10)::geometry)::jsonb;

  BEGIN
    PERFORM fn_update_sector_geometria(v_sector_id, 'geojson', v_geom_chica, NULL, NULL);
    RAISE EXCEPTION 'V7 FALLA: se aceptó una delimitación que deja árboles fuera';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    v_msg := SQLERRM;
  END;

  IF v_msg NOT LIKE '%A-%' THEN
    RAISE EXCEPTION 'V7 FALLA: el mensaje no lista tree_code: %', v_msg;
  END IF;
  INSERT INTO test_log (msg) VALUES ('V7 OK: ' || v_msg);

  -- La geometría del sector no cambió (el rechazo fue antes de escribir).
  IF (SELECT ST_Area(geometria_sector) FROM sectors WHERE id = v_sector_id) < 100000 THEN
    RAISE EXCEPTION 'V7 FALLA: la geometría del sector quedó modificada a pesar del rechazo';
  END IF;

  -- V8 — tree_data_versions: la coordenada fuera del sector se rechaza
  -- al registrarla (alta o inspección), no al completar la OT.
  BEGIN
    INSERT INTO tree_data_versions (tree_id, campos_registrados, utm_este, utm_norte, created_by)
      VALUES (v_tree_id, ARRAY['utm_este', 'utm_norte'], 365000, 6340500, v_registrado_por);
    RAISE EXCEPTION 'V8 FALLA: se aceptó una versión con coordenada fuera del sector';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    INSERT INTO test_log (msg) VALUES ('V8 OK: ' || SQLERRM);
  END;
  IF EXISTS (SELECT 1 FROM tree_data_versions WHERE tree_id = v_tree_id) THEN
    RAISE EXCEPTION 'V8 FALLA: quedó una versión registrada a pesar del rechazo';
  END IF;

  -- V9 — sector inexistente: se rechaza con SV046, no se deja pasar la
  -- validación en silencio (punto 1, ajuste del 2026-10-23).
  BEGIN
    INSERT INTO trees (project_id, sector_id, utm_este, utm_norte, especie_cientifica, registrado_por, fecha_registro)
      VALUES (v_project_id, gen_random_uuid(), 360500, 6340200, 'Especie de prueba', v_registrado_por, current_date);
    RAISE EXCEPTION 'V9 FALLA: se aceptó un árbol con un sector inexistente';
  EXCEPTION WHEN SQLSTATE 'SV046' THEN
    INSERT INTO test_log (msg) VALUES ('V9 OK: ' || SQLERRM);
  END;
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
