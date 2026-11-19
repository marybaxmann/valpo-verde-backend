-- =====================================================================
-- Pruebas de la migración 038 (crédito de las fotos de rasgos; CC-078)
-- =====================================================================
-- En BEGIN…ROLLBACK: no dejan datos. Requieren la 037 y la 038.
--
-- G1: guardar el contenido de una especie conserva la foto Y el crédito
--     de cada rasgo que sigue (con la 037 sola, el crédito se perdía).
-- G2: el cliente no puede fijar ni cambiar el crédito en ese cuerpo.
-- G3: un rasgo nuevo queda sin foto ni crédito.
-- =====================================================================

BEGIN;

CREATE TEMP TABLE test_log (id serial PRIMARY KEY, msg text);

DO $$
DECLARE
  v_usuario uuid := gen_random_uuid();
  v_especie uuid;
  v_contenido jsonb;
  v_rasgos jsonb;
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
  VALUES ('00000000-0000-0000-0000-000000000000', v_usuario, 'authenticated', 'authenticated', 'muni-038@sivu.example.test', now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), false, false);
  INSERT INTO public.user_profiles (id, role_id, nombre, activo)
  VALUES (v_usuario, (SELECT id FROM public.roles WHERE nombre = 'usuario_municipal'), 'Municipal 038', true);

  -- La primera especie del catálogo; si ya tiene contenido, se pisa y se revierte con el ROLLBACK.
  SELECT s.id INTO v_especie FROM public.species s ORDER BY s.especie_cientifica LIMIT 1;
  v_contenido := jsonb_build_object(
    'rasgos', jsonb_build_array(
      jsonb_build_object('id', 'hoja', 'etiqueta', 'Hoja', 'texto', 'Texto 1'),
      jsonb_build_object('id', 'flor', 'etiqueta', 'Flor', 'texto', 'Texto 2')));
  PERFORM public.fn_guardar_contenido_especie(v_especie, v_usuario, v_contenido);
  PERFORM public.fn_fijar_foto_especie(v_especie, v_usuario, 'hoja', 'especies/hoja-038.webp', 'Autora, CC BY 4.0');

  -- G1 y G2: se vuelve a guardar; el cliente manda otro crédito para «hoja».
  PERFORM public.fn_guardar_contenido_especie(v_especie, v_usuario, jsonb_build_object(
    'rasgos', jsonb_build_array(
      jsonb_build_object('id', 'hoja', 'etiqueta', 'Hoja', 'texto', 'Texto 1 editado', 'credito', 'Inyectado por el cliente'),
      jsonb_build_object('id', 'fruto', 'etiqueta', 'Fruto', 'texto', 'Texto 3', 'credito', 'Otro inyectado'))));
  SELECT rasgos INTO v_rasgos FROM public.species_public_content WHERE species_id = v_especie;

  IF v_rasgos->0->>'foto_path' IS DISTINCT FROM 'especies/hoja-038.webp'
     OR v_rasgos->0->>'credito' IS DISTINCT FROM 'Autora, CC BY 4.0'
     OR v_rasgos->0->>'texto' IS DISTINCT FROM 'Texto 1 editado' THEN
    RAISE EXCEPTION 'G1/G2 FALLA: %', v_rasgos->0;
  END IF;
  INSERT INTO test_log (msg) VALUES ('G1 y G2 OK: la foto y su crédito se conservan; el crédito del cliente se ignora');

  IF v_rasgos->1->>'foto_path' IS NOT NULL OR v_rasgos->1->>'credito' IS NOT NULL THEN
    RAISE EXCEPTION 'G3 FALLA: %', v_rasgos->1;
  END IF;
  INSERT INTO test_log (msg) VALUES ('G3 OK: un rasgo nuevo queda sin foto ni crédito');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
