-- Migración 036 — altura_punta_viva_m (CC-070; D-04; CR-15).
-- Autorizada por Valej el 2026-11-08, solo para la base de pruebas (gmlbmyreoxgoqrolhyxo).
-- Los árboles existentes quedan sin valor: no se supone que la punta esté viva.
-- La coherencia de alturas se valida en tree_data_versions, donde los datos son de una
-- misma inspección; en trees impediría completar una OT tras corregir la altura total.
BEGIN;

ALTER TABLE public.trees ADD COLUMN altura_punta_viva_m NUMERIC(6,2);
ALTER TABLE public.tree_data_versions ADD COLUMN altura_punta_viva_m NUMERIC(6,2);
ALTER TABLE public.tree_data_versions ADD CONSTRAINT chk_tdv_punta_viva CHECK (
  altura_punta_viva_m IS NULL OR (
    altura_punta_viva_m >= 0
    AND (altura_total_m IS NULL OR altura_punta_viva_m <= altura_total_m)
    AND (altura_base_copa_viva_m IS NULL OR altura_base_copa_viva_m <= altura_punta_viva_m)
  )
);
ALTER TYPE public.tree_data_versions_arbol_input ADD ATTRIBUTE altura_punta_viva_m numeric(6,2);

DO $mig$
DECLARE
  d text;
  n text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_refresh_tree_current' AND p.pronamespace = 'public'::regnamespace;
  n := replace(d, $x$      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
$x$, $x$      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    altura_punta_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_punta_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_punta_viva_m FROM validas v WHERE 'altura_punta_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.insp_fecha_inspeccion DESC, v.insp_created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_punta_viva_m FROM alta a) END,
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
  n := replace(d, $x$      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta,
      clase_edad,$x$, $x$      altura_base_copa_viva_m, altura_base_copa_viva_no_presenta, altura_punta_viva_m,
      clase_edad,$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta,
$x$, $x$      v_arbol.altura_base_copa_viva_m, v_arbol.altura_base_copa_viva_no_presenta, v_arbol.altura_punta_viva_m,
$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  n := replace(d, $x$      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
$x$, $x$      altura_base_copa_viva_no_presenta = EXCLUDED.altura_base_copa_viva_no_presenta,
      altura_punta_viva_m = EXCLUDED.altura_punta_viva_m,
$x$);
  IF n = d THEN RAISE EXCEPTION 'fn_save_inspection_draft: no se encontró el texto esperado'; END IF;
  d := n;
  EXECUTE d;
END $mig$;

COMMIT;
