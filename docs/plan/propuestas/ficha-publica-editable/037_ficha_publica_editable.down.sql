-- =====================================================================
-- Reversión de la 037 — PROPUESTA, NO APLICAR
-- =====================================================================
-- Deja fn_ficha_publica_arbol exactamente como en la 028 y borra todo lo
-- que la 037 crea. El bucket no se borra con SQL: Supabase bloquea el
-- DELETE directo sobre storage.buckets (mismo caso que la 019). Si hay
-- que retirarlo, primero se vacía y se borra desde la API de Storage.
-- ⚠ Borra el contenido ciudadano guardado: antes de revertir con datos
-- reales, exportar species_public_content y tree_public_content.
-- =====================================================================

DROP FUNCTION public.fn_fijar_foto_ficha_publica(UUID, UUID, TEXT);
DROP FUNCTION public.fn_guardar_ficha_publica_arbol(UUID, UUID, JSONB);
DROP FUNCTION public.fn_fijar_foto_especie(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION public.fn_guardar_contenido_especie(UUID, UUID, JSONB);
DROP FUNCTION public.fn_assert_editor_contenido_publico(UUID, UUID, TEXT);

DROP TRIGGER trg_tree_public_content_proyecto_cerrado ON public.tree_public_content;
DROP TABLE public.tree_public_content;
DROP TABLE public.species_public_content;

-- fn_ficha_publica_arbol de la 028, sin cambios
CREATE OR REPLACE FUNCTION public.fn_ficha_publica_arbol(p_qr_token UUID) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'especie_cientifica', t.especie_cientifica,
    'nombre_comun', t.nombre_comun,
    'ubicacion_descriptiva', t.ubicacion_descriptiva,
    -- D-260 a D-262: sin especie vigente, origen «no determinado» y
    -- persistencia y tipo de hoja sin valor.
    'sobre_la_especie', jsonb_build_object(
      'especie_cientifica', s.especie_cientifica,
      'genero', s.genero,
      'familia', s.familia,
      'origen_biogeografico', CASE WHEN t.especie_cientifica IS NULL THEN 'no_determinado'
                                   ELSE COALESCE(s.origen_biogeografico, 'no_determinado') END,
      'persistencia_follaje', CASE WHEN t.especie_cientifica IS NULL THEN NULL ELSE s.persistencia_follaje END,
      'tipo_hoja', CASE WHEN t.especie_cientifica IS NULL THEN NULL ELSE s.tipo_hoja END
    )
  )
  FROM public.trees t
  LEFT JOIN public.species s
    ON s.id = COALESCE(
      t.species_id,
      (SELECT s2.id FROM public.species s2
       WHERE lower(regexp_replace(trim(s2.especie_cientifica), '\s+', ' ', 'g'))
           = lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
       LIMIT 1))
  WHERE t.qr_token = p_qr_token;
$$;

REVOKE ALL ON FUNCTION public.fn_ficha_publica_arbol(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ficha_publica_arbol(UUID) TO service_role;
