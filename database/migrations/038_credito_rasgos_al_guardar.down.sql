-- =====================================================================
-- Reversión de la 038: vuelve fn_guardar_contenido_especie a la versión
-- de la 037 (que descarta el crédito de las fotos de rasgos al guardar).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_guardar_contenido_especie(
  p_species_id UUID,
  p_usuario UUID,
  p_contenido JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actual public.species_public_content%ROWTYPE;
  v_rasgos JSONB := '[]'::jsonb;
  v_rasgo JSONB;
  v_foto TEXT;
  v_rutas_huerfanas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  PERFORM public.fn_assert_editor_contenido_publico(p_usuario, NULL, 'SV080');

  IF NOT EXISTS (SELECT 1 FROM public.species WHERE id = p_species_id) THEN
    RAISE EXCEPTION 'La especie % no existe en el catálogo', p_species_id USING ERRCODE = 'SV080';
  END IF;

  SELECT * INTO v_actual FROM public.species_public_content WHERE species_id = p_species_id FOR UPDATE;

  -- Rasgos: foto_path y credito de la foto salen de la fila actual.
  FOR v_rasgo IN SELECT value FROM jsonb_array_elements(COALESCE(p_contenido->'rasgos', '[]'::jsonb)) LOOP
    SELECT r->>'foto_path' INTO v_foto
    FROM jsonb_array_elements(COALESCE(v_actual.rasgos, '[]'::jsonb)) r
    WHERE r->>'id' = v_rasgo->>'id';
    v_rasgos := v_rasgos || jsonb_build_array(
      (v_rasgo - 'foto_path') || jsonb_build_object('foto_path', v_foto));
  END LOOP;

  SELECT COALESCE(array_agg(r->>'foto_path'), ARRAY[]::TEXT[]) INTO v_rutas_huerfanas
  FROM jsonb_array_elements(COALESCE(v_actual.rasgos, '[]'::jsonb)) r
  WHERE r->>'foto_path' IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_rasgos) n WHERE n->>'id' = r->>'id');

  INSERT INTO public.species_public_content AS c (
    species_id, nombre_comun_visualizacion, articulo_nombre, curiosidad, aportes, quien_soy,
    rasgos, anio_estacional, ciclo, historia_especie, consejo, fuentes,
    foto_referencial_path, credito_foto_referencial, updated_by, updated_at
  ) VALUES (
    p_species_id,
    NULLIF(btrim(p_contenido->>'nombre_comun_visualizacion'), ''),
    p_contenido->>'articulo_nombre',
    NULLIF(btrim(p_contenido->>'curiosidad'), ''),
    COALESCE(p_contenido->'aportes', '[]'::jsonb),
    NULLIF(btrim(p_contenido->>'quien_soy'), ''),
    v_rasgos,
    NULLIF(p_contenido->'anio_estacional', 'null'::jsonb),
    NULLIF(p_contenido->'ciclo', 'null'::jsonb),
    NULLIF(btrim(p_contenido->>'historia_especie'), ''),
    NULLIF(btrim(p_contenido->>'consejo'), ''),
    COALESCE(p_contenido->'fuentes', '[]'::jsonb),
    v_actual.foto_referencial_path,
    v_actual.credito_foto_referencial,
    p_usuario, now()
  )
  ON CONFLICT (species_id) DO UPDATE SET
    nombre_comun_visualizacion = EXCLUDED.nombre_comun_visualizacion,
    articulo_nombre            = EXCLUDED.articulo_nombre,
    curiosidad                 = EXCLUDED.curiosidad,
    aportes                    = EXCLUDED.aportes,
    quien_soy                  = EXCLUDED.quien_soy,
    rasgos                     = EXCLUDED.rasgos,
    anio_estacional            = EXCLUDED.anio_estacional,
    ciclo                      = EXCLUDED.ciclo,
    historia_especie           = EXCLUDED.historia_especie,
    consejo                    = EXCLUDED.consejo,
    fuentes                    = EXCLUDED.fuentes,
    updated_by                 = EXCLUDED.updated_by,
    updated_at                 = EXCLUDED.updated_at;

  RETURN jsonb_build_object('rutas_a_borrar', to_jsonb(v_rutas_huerfanas));
END;
$$;

REVOKE ALL ON FUNCTION public.fn_guardar_contenido_especie(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_guardar_contenido_especie(UUID, UUID, JSONB) TO service_role;
