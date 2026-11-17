-- Migración 039 — Fotos de detalle y de registro, huella SHA-256, corrección autorizada
-- de la ubicación del inventario y conservación de variables retiradas de borradores.
-- Preparada el 2026-11-16 para la integración AV_000001–AV_000012 (decisiones A, F, H y 5
-- de la responsable). NO APLICADA. Reversible con 039_..._down.sql.
--
-- 1. photos.vista admite 'detalle' (decisión A). Las cuatro vistas de D-27 no cambian:
--    fn_finalizar_inspeccion (026) y completitud.ts cuentan solo
--    arbol_completo/base/tronco/copa, así que una foto de detalle nunca completa D-27.
-- 2. photos.sha256: huella del archivo original (fotos del Inspector y de registro, que
--    no se recodifican). Índice único por árbol: el mismo original no se asocia dos
--    veces al mismo ejemplar (idempotencia).
-- 3. Esta migración NO toca la ficha pública de Valpo Verde Conecta (fn_ficha_publica_arbol,
--    tree_public_content, bucket conecta-publico): es responsabilidad de esa línea de trabajo
--    (CC-074 retirado).
-- 4. tree_data_versions.origen/motivo + fn_corregir_ubicacion_arbol (decisión F): una
--    corrección de ubicación es una versión nueva (historial) que fn_refresh_tree_current
--    toma en cuenta por fecha junto a las inspecciones válidas, así que el siguiente
--    recálculo no la revierte; una inspección posterior que registre la ubicación la
--    reemplaza, igual que hoy.
-- 6. evaluations.variables_retiradas: protege los valores de borradores guardados con
--    una metodología anterior (decisión 5).
BEGIN;

-- ---------------------------------------------------------------------------
-- 1–2. photos
-- ---------------------------------------------------------------------------
ALTER TABLE public.photos DROP CONSTRAINT photos_vista_check;
ALTER TABLE public.photos ADD CONSTRAINT photos_vista_check
  CHECK (vista IS NULL OR vista IN ('arbol_completo', 'base', 'tronco', 'copa', 'detalle'));

ALTER TABLE public.photos
  ADD COLUMN sha256 TEXT;

ALTER TABLE public.photos ADD CONSTRAINT chk_photos_sha256_formato
  CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX uq_photos_tree_sha256 ON public.photos (tree_id, sha256) WHERE sha256 IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. tree_data_versions: origen de la versión
-- ---------------------------------------------------------------------------
ALTER TABLE public.tree_data_versions
  ADD COLUMN origen TEXT NOT NULL DEFAULT 'registro',
  ADD COLUMN motivo TEXT;

ALTER TABLE public.tree_data_versions ADD CONSTRAINT chk_tdv_origen
  CHECK (origen IN ('registro', 'correccion_ubicacion'));
ALTER TABLE public.tree_data_versions ADD CONSTRAINT chk_tdv_correccion_ubicacion
  CHECK (
    origen <> 'correccion_ubicacion' OR (
      inspection_id IS NULL
      AND motivo IS NOT NULL AND length(btrim(motivo)) > 0
      AND cardinality(campos_registrados) > 0
      AND campos_registrados <@ ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte']::text[]
    )
  );

-- fn_refresh_tree_current: (a) «alta» = solo la versión de registro sin inspección;
-- (b) los 4 campos de ubicación se toman de «ubic» = inspecciones válidas ∪ correcciones,
-- con el mismo orden (fecha de la OT o de la corrección, fecha de inspección, creación).
DO $mig$
DECLARE
  d text;
  n text;
  campo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p
   WHERE p.proname = 'fn_refresh_tree_current' AND p.pronamespace = 'public'::regnamespace;

  n := replace(d, $x$    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL
  )
  UPDATE trees t SET$x$, $x$    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL AND tdv.origen = 'registro'
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
  UPDATE trees t SET$x$);
  IF n = d THEN RAISE EXCEPTION '039: fn_refresh_tree_current sin el CTE alta esperado'; END IF;
  d := n;

  FOREACH campo IN ARRAY ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte'] LOOP
    n := replace(d, format($x$FROM validas v WHERE %L = ANY$x$, campo), format($x$FROM ubic v WHERE %L = ANY$x$, campo));
    IF n = d THEN RAISE EXCEPTION '039: fn_refresh_tree_current sin el campo %', campo; END IF;
    d := n;
  END LOOP;

  EXECUTE d;
END $mig$;

-- Corrección autorizada de la ubicación (decisión F). Solo service_role: el backend
-- verifica antes el rol (usuario_municipal del proyecto). Idempotente: si los valores
-- pedidos ya son los vigentes, no crea versión y devuelve cambio = false.
CREATE FUNCTION public.fn_corregir_ubicacion_arbol(
  p_tree_id UUID,
  p_sector TEXT,
  p_ubicacion_descriptiva TEXT,
  p_utm_este NUMERIC,
  p_utm_norte NUMERIC,
  p_motivo TEXT,
  p_usuario UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  t public.trees%ROWTYPE;
  v_campos text[] := ARRAY[]::text[];
  v_id uuid;
BEGIN
  IF p_motivo IS NULL OR length(btrim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'El motivo de la corrección es obligatorio' USING ERRCODE = 'SV039';
  END IF;
  IF (p_utm_este IS NULL) <> (p_utm_norte IS NULL) THEN
    RAISE EXCEPTION 'utm_este y utm_norte se corrigen juntas' USING ERRCODE = 'SV039';
  END IF;

  SELECT * INTO t FROM public.trees WHERE id = p_tree_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Árbol no encontrado' USING ERRCODE = 'SV039';
  END IF;

  IF p_sector IS NOT NULL AND p_sector IS DISTINCT FROM t.sector THEN v_campos := v_campos || 'sector'; END IF;
  IF p_ubicacion_descriptiva IS NOT NULL AND p_ubicacion_descriptiva IS DISTINCT FROM t.ubicacion_descriptiva THEN
    v_campos := v_campos || 'ubicacion_descriptiva';
  END IF;
  IF p_utm_este IS NOT NULL AND (p_utm_este IS DISTINCT FROM t.utm_este OR p_utm_norte IS DISTINCT FROM t.utm_norte) THEN
    v_campos := v_campos || ARRAY['utm_este', 'utm_norte'];
  END IF;

  IF cardinality(v_campos) = 0 THEN
    RETURN jsonb_build_object('cambio', false, 'tree_id', p_tree_id);
  END IF;

  INSERT INTO public.tree_data_versions (
    tree_id, inspection_id, origen, motivo, campos_registrados,
    sector, ubicacion_descriptiva, utm_este, utm_norte, created_by
  ) VALUES (
    p_tree_id, NULL, 'correccion_ubicacion', btrim(p_motivo), v_campos,
    CASE WHEN 'sector' = ANY(v_campos) THEN p_sector END,
    CASE WHEN 'ubicacion_descriptiva' = ANY(v_campos) THEN p_ubicacion_descriptiva END,
    CASE WHEN 'utm_este' = ANY(v_campos) THEN p_utm_este END,
    CASE WHEN 'utm_norte' = ANY(v_campos) THEN p_utm_norte END,
    p_usuario
  ) RETURNING id INTO v_id;

  PERFORM public.fn_refresh_tree_current(p_tree_id);

  -- La corrección debe quedar vigente; si una regla de precedencia la tapa, se revierte todo.
  IF EXISTS (
    SELECT 1 FROM public.trees x WHERE x.id = p_tree_id AND (
      ('sector' = ANY(v_campos) AND x.sector IS DISTINCT FROM p_sector)
      OR ('ubicacion_descriptiva' = ANY(v_campos) AND x.ubicacion_descriptiva IS DISTINCT FROM p_ubicacion_descriptiva)
      OR ('utm_este' = ANY(v_campos) AND (x.utm_este IS DISTINCT FROM p_utm_este OR x.utm_norte IS DISTINCT FROM p_utm_norte))
    )
  ) THEN
    RAISE EXCEPTION 'La corrección no quedó vigente tras el recálculo' USING ERRCODE = 'SV039';
  END IF;

  RETURN jsonb_build_object(
    'cambio', true,
    'tree_id', p_tree_id,
    'version_id', v_id,
    'campos', to_jsonb(v_campos),
    'anterior', jsonb_build_object('sector', t.sector, 'ubicacion_descriptiva', t.ubicacion_descriptiva,
                                   'utm_este', t.utm_este, 'utm_norte', t.utm_norte)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_corregir_ubicacion_arbol(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_corregir_ubicacion_arbol(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Borradores: variables de una metodología anterior (decisión 5, CC-076)
-- ---------------------------------------------------------------------------
-- El guardado del borrador reemplaza evaluations.variables completo. Con la 3.0,
-- un borrador 2.1 (p. ej. INS-000333 con condicion_radicular_entorno) perdería al
-- guardarse los valores de campos retirados. El backend los copia aquí antes de
-- guardar: { campo: { valor, rule_version_origen, retirada_el } }. Solo se agrega,
-- nunca se sobrescribe; no participa del cálculo ni de la completitud.
ALTER TABLE public.evaluations ADD COLUMN variables_retiradas JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.evaluations.variables_retiradas IS
  '039: valores de variables retiradas de la metodología, conservados al guardar un borrador con la versión vigente.';

COMMIT;
