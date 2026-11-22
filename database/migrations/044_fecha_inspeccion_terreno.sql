-- D-194/D-208: corregir la fecha de terreno en el guardado transaccional.
BEGIN;
DO $mig$
DECLARE
  definicion text := pg_get_functiondef(
    'public.fn_save_inspection_draft(uuid,uuid,uuid,uuid,date,date,text,text,text,text,text,boolean,text,uuid,jsonb,jsonb,text[],text,text,numeric,numeric,text,text)'::regprocedure
  );
  anterior text := $sql$    UPDATE public.inspections SET
      tipo_inspeccion_realizada = p_tipo_inspeccion_realizada,$sql$;
  siguiente text := $sql$    UPDATE public.inspections SET
      fecha_inspeccion = p_fecha_inspeccion,
      tipo_inspeccion_realizada = p_tipo_inspeccion_realizada,$sql$;
  cierre text := $sql$    WHERE id = v_inspection_id;
  END IF;

  INSERT INTO public.evaluations$sql$;
  cierre_nuevo text := $sql$    WHERE id = v_inspection_id
      AND estado_registro = 'preguardado'
      AND p_fecha_inspeccion <= COALESCE(fecha_registro, p_fecha_registro)
      AND p_fecha_inspeccion <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La inspección no es editable o su fecha de terreno supera la fecha de registro'
        USING ERRCODE = 'SV058';
    END IF;
  END IF;

  INSERT INTO public.evaluations$sql$;
BEGIN
  IF strpos(definicion, anterior) = 0 THEN
    anterior := replace(anterior, chr(10), chr(13) || chr(10));
    siguiente := replace(siguiente, chr(10), chr(13) || chr(10));
    cierre := replace(cierre, chr(10), chr(13) || chr(10));
    cierre_nuevo := replace(cierre_nuevo, chr(10), chr(13) || chr(10));
  END IF;
  IF length(definicion) - length(replace(definicion, anterior, '')) <> length(anterior)
    OR length(definicion) - length(replace(definicion, cierre, '')) <> length(cierre) THEN
    RAISE EXCEPTION '044: no coincide el guardado vigente de inspecciones';
  END IF;
  EXECUTE replace(replace(definicion, anterior, siguiente), cierre, cierre_nuevo);
END $mig$;
COMMIT;
