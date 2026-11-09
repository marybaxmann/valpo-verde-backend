-- Reversión de la 036. Elimina las columnas y sus datos.
BEGIN;

DO $mig$
DECLARE
  d text;
  n text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_refresh_tree_current' AND p.pronamespace = 'public'::regnamespace;
  n := replace(d, $x$      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    altura_punta_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_punta_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_punta_viva_m FROM validas v WHERE 'altura_punta_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_punta_viva_m FROM alta a) END,
$x$, $x$      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_refresh_tree_current: no se encontró el texto esperado'; END IF;
  d := n;
  EXECUTE d;
END $mig$;

DO $mig$
DECLARE
  d text;
  n text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_save_inspection_draft' AND p.pronamespace = 'public'::regnamespace;
  n := replace(d, $x$      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
      altura_punta_viva_m = EXCLUDED.altura_punta_viva_m,
$x$, $x$      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta, v_arbol.altura_punta_viva_m,
$x$, $x$      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta,
$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta, altura_punta_viva_m,
      clase_edad,$x$, $x$      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta,
      clase_edad,$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  EXECUTE d;
END $mig$;

ALTER TYPE public.tree_data_versions_arbol_input DROP ATTRIBUTE altura_punta_viva_m;
ALTER TABLE public.tree_data_versions DROP CONSTRAINT chk_tdv_punta_viva;
ALTER TABLE public.tree_data_versions DROP COLUMN altura_punta_viva_m;
ALTER TABLE public.trees DROP COLUMN altura_punta_viva_m;

COMMIT;
