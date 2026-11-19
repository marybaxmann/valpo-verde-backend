-- 040 · Restaurar el guardián anterior; conserva los cierres realizados.
BEGIN;

DO $mig$
DECLARE
  definicion text := pg_get_functiondef('public.fn_finalizar_inspeccion(uuid,uuid,jsonb,jsonb,date,date,date,date,text)'::regprocedure);
  anterior text := $bloque$  -- D-27 / CC-077: las etiquetas de vista son informativas.
  IF v_tipo_inspeccion_realizada IN ('evaluacion_inicial', 'reevaluacion', 'levantamiento') THEN
    SELECT COUNT(DISTINCT (sha256 IS NULL, COALESCE(sha256, storage_path)))
    INTO v_fotos_validas_d27
    FROM (
      SELECT storage_path, MIN(sha256 COLLATE "C") AS sha256
      FROM public.photos
      WHERE inspection_id = p_inspection_id
        AND tree_id = v_tree_id
        AND btrim(storage_path, E' \t\n\r\f\013') <> ''
      GROUP BY storage_path
    ) AS archivos;

    IF v_fotos_validas_d27 < 2 THEN
      RAISE EXCEPTION
        'D-27: se requieren al menos dos fotografías válidas y distintas de esta inspección para finalizar una %. Fotografías válidas: %.',
        v_tipo_inspeccion_realizada, v_fotos_validas_d27
        USING ERRCODE = 'SV064';
    END IF;
  END IF;$bloque$;
  siguiente text := $bloque$  -- ---------------------------------------------------------------
  -- (foto) D-27 / PR-010 v4.0: fotografías obligatorias.
  -- Solo para evaluacion_inicial, reevaluacion y levantamiento.
  -- Monitoreo y evaluacion_instrumental quedan exentos (CC-056 p.2).
  -- ---------------------------------------------------------------
  IF v_tipo_inspeccion_realizada IN ('evaluacion_inicial', 'reevaluacion', 'levantamiento') THEN
    SELECT COUNT(DISTINCT vista)
    INTO v_vistas_presentes
    FROM public.photos
    WHERE inspection_id = p_inspection_id
      AND vista IN ('arbol_completo', 'base', 'tronco', 'copa');

    IF v_vistas_presentes < 4 THEN
      RAISE EXCEPTION
        'Faltan fotografías obligatorias (D-27 / PR-010 v4.0): se requieren las cuatro vistas '
        'arbol_completo, base, tronco y copa para finalizar una %. '
        'Vistas presentes: %.',
        v_tipo_inspeccion_realizada, v_vistas_presentes
        USING ERRCODE = 'SV064';
    END IF;
  END IF;$bloque$;
  declaracion constant text := '  v_fotos_validas_d27 integer;';
BEGIN
  -- pg_get_functiondef conserva los finales de línea del cuerpo instalado.
  IF strpos(definicion, anterior) = 0 THEN
    anterior := replace(anterior, chr(10), chr(13) || chr(10));
    siguiente := replace(siguiente, chr(10), chr(13) || chr(10));
  END IF;

  IF length(definicion) - length(replace(definicion, anterior, '')) <> length(anterior)
     OR length(definicion) - length(replace(definicion, declaracion, '')) <> length(declaracion) THEN
    RAISE EXCEPTION '040 D-27: la definición de fn_finalizar_inspeccion no coincide con la esperada';
  END IF;

  definicion := replace(definicion, anterior, siguiente);
  definicion := replace(definicion, declaracion, '  v_vistas_presentes integer;');
  EXECUTE definicion;
END $mig$;

COMMIT;
