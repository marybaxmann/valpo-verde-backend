-- =====================================================================
-- Pruebas de la migración 022 — CHECK de especies con «spp.» y espacios
-- (D-13, D-257; CC-056 decisión r)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 022.
-- Todo corre dentro de BEGIN … ROLLBACK. `species.created_by` admite
-- null, así que no hacen falta usuarios de prueba.
--
-- S1–S6: nombres que la regla nueva rechaza (23514).
-- S7–S8: nombres válidos, incluido uno sintético con un epíteto que
--        termina en «sp» dentro de otra palabra (no se conoce una
--        especie real así).
-- S9: la definición aplicada es la de la 022.

BEGIN;

CREATE TEMP TABLE test_log (id serial, msg text);

CREATE FUNCTION pg_temp.insertar_especie(p_especie text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.species (especie_cientifica) VALUES (p_especie);
  RETURN 'aceptada';
EXCEPTION WHEN check_violation THEN
  RETURN 'rechazada';
END;
$$;

DO $$
DECLARE
  v_caso record;
  v_resultado text;
  v_def text;
BEGIN
  FOR v_caso IN
    SELECT * FROM (VALUES
      ('S1', 'Acacia sp. ', 'rechazada'),
      ('S2', 'Acacia spp.', 'rechazada'),
      ('S3', 'Acacia spp', 'rechazada'),
      ('S4', 'Acacia SPP. ', 'rechazada'),
      ('S5', '  no determinado ', 'rechazada'),
      ('S6', 'Acacia sp.', 'rechazada'),
      ('S7', 'Quillaja saponaria', 'aceptada'),
      ('S8', 'Genero crispp', 'aceptada')
    ) AS t(caso, especie, esperado)
  LOOP
    v_resultado := pg_temp.insertar_especie(p_especie => v_caso.especie);
    IF v_resultado IS DISTINCT FROM v_caso.esperado THEN
      RAISE EXCEPTION '% FALLA: «%» %, se esperaba %', v_caso.caso, v_caso.especie, v_resultado, v_caso.esperado;
    END IF;
    INSERT INTO test_log (msg) VALUES (v_caso.caso || ' OK (' || v_resultado || ': «' || v_caso.especie || '»)');
  END LOOP;

  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  WHERE c.conname = 'chk_species_especie_cientifica_valida' AND c.conrelid = 'public.species'::regclass;
  IF v_def NOT LIKE '%btrim(especie_cientifica) !~* ''\\sspp?\\.?$''%' THEN
    RAISE EXCEPTION 'S9 FALLA: definición inesperada: %', v_def;
  END IF;
  INSERT INTO test_log (msg) VALUES ('S9 OK');
END $$;

SELECT id, msg FROM test_log ORDER BY id;

ROLLBACK;
