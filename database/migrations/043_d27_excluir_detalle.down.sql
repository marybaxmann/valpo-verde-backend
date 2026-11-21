-- CC-081: conservar la función de cierre y el bloqueo de la migración 041.
BEGIN;
DO $mig$
DECLARE
  definicion text := pg_get_functiondef('public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)'::regprocedure);
  anterior text := $q$        AND tree_id = v_tree_id
        AND vista IS DISTINCT FROM 'detalle'
        AND btrim(storage_path,$q$;
  siguiente text := $q$        AND tree_id = v_tree_id
        AND btrim(storage_path,$q$;
BEGIN
  IF strpos(definicion, anterior) = 0 THEN
    anterior := replace(anterior, chr(10), chr(13) || chr(10));
    siguiente := replace(siguiente, chr(10), chr(13) || chr(10));
  END IF;
  IF length(definicion) - length(replace(definicion, anterior, '')) <> length(anterior) THEN
    RAISE EXCEPTION '043: no coincide el guardián D-27 de fn_finalizar_inspeccion';
  END IF;
  EXECUTE replace(definicion, anterior, siguiente);
END $mig$;
COMMIT;
