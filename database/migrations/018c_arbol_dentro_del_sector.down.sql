-- =====================================================================
-- Reversión de 018c_arbol_dentro_del_sector.sql
-- =====================================================================

DROP TRIGGER IF EXISTS trg_tree_data_versions_dentro_sector ON tree_data_versions;
DROP FUNCTION IF EXISTS public.fn_check_version_dentro_sector();

DROP TRIGGER IF EXISTS trg_trees_dentro_sector ON trees;
DROP FUNCTION IF EXISTS public.fn_check_arbol_dentro_sector();

-- fn_update_sector_geometria vuelve a la versión de la 018b (sin la
-- comprobación de existencia del sector ni la de árboles que quedarían
-- fuera).
CREATE OR REPLACE FUNCTION public.fn_update_sector_geometria(
  p_sector_id uuid,
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text,
  p_indices_seleccionados integer[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geografia geography;
  v_excluidas integer;
BEGIN
  SELECT geografia, excluidas INTO v_geografia, v_excluidas
  FROM public.fn_build_sector_geometria(p_formato, p_geometria_geojson, p_geometria_kml, p_indices_seleccionados);

  -- Si el proyecto está cerrado, trg_sectors_proyecto_cerrado (migración
  -- 017, CC-042) rechaza este UPDATE antes de llegar aquí.
  UPDATE public.sectors
  SET geometria_sector = v_geografia
  WHERE id = p_sector_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sector no encontrado';
  END IF;

  RETURN jsonb_build_object('superficies_excluidas', v_excluidas);
END;
$$;
