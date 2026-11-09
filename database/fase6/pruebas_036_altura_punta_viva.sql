-- =====================================================================
-- Pruebas de la migración 036 (CC-071). Base de PRUEBAS.
-- El bloque termina siempre en una excepción: nada se guarda. Si todo
-- pasa, el mensaje es PRUEBAS_036_OK. Antes de aplicar y tras revertir
-- debe fallar en B1. Regresión obligatoria: pruebas_018e_inspection_draft
-- y pruebas_021_orden_ultima_inspeccion.
--   B1 las columnas existen, vacías en los árboles actuales.
--   B2 el tipo de entrada tiene el atributo.
--   B3 el CHECK de tree_data_versions existe y solo está allí.
--   B4 las dos funciones guardan y recalculan el campo.
-- =====================================================================
DO $$
DECLARE
  v_n bigint;
  v_f text;
BEGIN
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_schema = 'public' AND column_name = 'altura_punta_viva_m' AND table_name IN ('trees', 'tree_data_versions');
  IF v_n <> 2 THEN RAISE EXCEPTION 'B1 falló: % columnas', v_n; END IF;
  EXECUTE 'SELECT count(*) FROM public.trees WHERE altura_punta_viva_m IS NOT NULL' INTO v_n;
  IF v_n <> 0 THEN RAISE EXCEPTION 'B1 falló: % árboles con valor', v_n; END IF;

  SELECT count(*) INTO v_n FROM pg_attribute a JOIN pg_type t ON t.typrelid = a.attrelid
   WHERE t.typname = 'tree_data_versions_arbol_input' AND a.attname = 'altura_punta_viva_m' AND NOT a.attisdropped;
  IF v_n <> 1 THEN RAISE EXCEPTION 'B2 falló'; END IF;

  SELECT count(*) INTO v_n FROM pg_constraint WHERE conname = 'chk_tdv_punta_viva';
  IF v_n <> 1 THEN RAISE EXCEPTION 'B3 falló'; END IF;

  SELECT string_agg(pg_get_functiondef(p.oid), ' ') INTO v_f FROM pg_proc p
   WHERE p.proname IN ('fn_refresh_tree_current', 'fn_save_inspection_draft') AND p.pronamespace = 'public'::regnamespace;
  IF position('v.altura_punta_viva_m' IN v_f) = 0 OR position('v_arbol.altura_punta_viva_m' IN v_f) = 0
     OR position('EXCLUDED.altura_punta_viva_m' IN v_f) = 0 THEN
    RAISE EXCEPTION 'B4 falló';
  END IF;

  RAISE EXCEPTION 'PRUEBAS_036_OK';
END $$;
