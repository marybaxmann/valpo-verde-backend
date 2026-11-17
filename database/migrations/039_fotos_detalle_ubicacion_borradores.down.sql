-- Reversión de la 039. NO APLICADA.
-- Se detiene (sin cambiar nada) si ya existen datos que el esquema anterior no admite:
-- fotos con vista «detalle», correcciones de ubicación o variables retiradas conservadas. Revertir con
-- esos datos exige decidir antes qué hacer con ellos (no se borran en silencio):
--   - fotos 'detalle' → vista NULL o eliminarlas;
--   - correcciones de ubicación → conservarlas como respaldo fuera de la tabla y, al
--     borrarlas, recalcular cada árbol con fn_refresh_tree_current;
--   - variables retiradas de borradores → exportarlas antes (son valores originales).
BEGIN;

DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM public.photos WHERE vista = 'detalle') THEN
    RAISE EXCEPTION '039 down: hay fotos con vista detalle';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tree_data_versions WHERE origen = 'correccion_ubicacion') THEN
    RAISE EXCEPTION '039 down: hay correcciones de ubicación';
  END IF;
  IF EXISTS (SELECT 1 FROM public.evaluations WHERE variables_retiradas <> '{}'::jsonb) THEN
    RAISE EXCEPTION '039 down: hay variables retiradas conservadas en borradores';
  END IF;
END $mig$;

-- 6. Variables retiradas de borradores.
ALTER TABLE public.evaluations DROP COLUMN variables_retiradas;

-- 4. Corrección de ubicación y fn_refresh_tree_current anterior.
DROP FUNCTION public.fn_corregir_ubicacion_arbol(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID);

DO $mig$
DECLARE
  d text;
  n text;
  campo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_refresh_tree_current' AND p.pronamespace = 'public'::regnamespace;

  FOREACH campo IN ARRAY ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte'] LOOP
    n := replace(d, format($x$FROM ubic v WHERE %L = ANY$x$, campo), format($x$FROM validas v WHERE %L = ANY$x$, campo));
    IF n = d THEN RAISE EXCEPTION '039 down: fn_refresh_tree_current sin el campo %', campo; END IF;
    d := n;
  END LOOP;

  n := replace(d, $x$    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL AND tdv.origen = 'registro'
  ),
  ubic AS (
    SELECT v.sector, v.ubicacion_descriptiva, v.utm_este, v.utm_norte, v.campos_registrados,
           v.ot_fecha_completada, v.insp_fecha_inspeccion, v.insp_created_at
    FROM validas v
    UNION ALL
    SELECT c.sector, c.ubicacion_descriptiva, c.utm_este, c.utm_norte, c.campos_registrados,
           (c.created_at AT TIME ZONE 'America/Santiago')::date,
           (c.created_at AT TIME ZONE 'America/Santiago')::date,
           c.created_at
    FROM tree_data_versions c
    WHERE c.tree_id = p_tree_id AND c.inspection_id IS NULL AND c.origen = 'correccion_ubicacion'
  )
  UPDATE trees t SET$x$, $x$    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL
  )
  UPDATE trees t SET$x$);
  IF n = d THEN RAISE EXCEPTION '039 down: fn_refresh_tree_current sin el CTE ubic'; END IF;

  EXECUTE n;
END $mig$;

ALTER TABLE public.tree_data_versions DROP CONSTRAINT chk_tdv_correccion_ubicacion;
ALTER TABLE public.tree_data_versions DROP CONSTRAINT chk_tdv_origen;
ALTER TABLE public.tree_data_versions DROP COLUMN motivo, DROP COLUMN origen;

-- 1–3. photos
DROP INDEX public.uq_photos_tree_sha256;
ALTER TABLE public.photos DROP CONSTRAINT chk_photos_sha256_formato;
ALTER TABLE public.photos DROP COLUMN sha256;

ALTER TABLE public.photos DROP CONSTRAINT photos_vista_check;
ALTER TABLE public.photos ADD CONSTRAINT photos_vista_check
  CHECK (vista IS NULL OR vista IN ('arbol_completo', 'base', 'tronco', 'copa'));

COMMIT;
