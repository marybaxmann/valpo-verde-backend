-- =====================================================================
-- Migración 018c — El árbol debe quedar dentro del sector (CC-046)
-- =====================================================================
--
-- Decisión de la responsable (2026-10-22, CC-046): la ubicación del
-- árbol debe quedar dentro de `geometria_sector` (D-265) del sector al
-- que pertenece. Un árbol exactamente sobre el borde cuenta como
-- dentro (ST_Covers, no ST_Contains). Se garantiza en la base, con
-- triggers — no en una función de alta específica, porque el #57 (alta
-- municipal del árbol) todavía no está implementado y un trigger
-- protege cualquier forma en que una fila se escriba (directo, o una
-- función futura). Rechazo con SQLSTATE SV046 (mismo patrón que SV265
-- en la 018b); el backend lo traduce a 422.
--
-- Ajustes pedidos por la responsable (2026-10-23) sobre la versión
-- anterior de esta migración:
-- 1. Un sector no encontrado (o invisible por RLS) ya NO se trata como
--    "nada que validar". `geometria_sector` es NOT NULL: si la consulta
--    no devuelve fila, solo puede significar que el sector no existe o
--    que no es visible, y en ningún caso corresponde saltar la
--    validación — se rechaza con SV046 y un mensaje claro. Mismo
--    criterio en `fn_update_sector_geometria`, verificado explícitamente
--    antes de calcular qué árboles quedarían fuera.
-- 2. Nuevo trigger en `tree_data_versions` (alta e inspección), además
--    del de `trees`: el error aparece al registrar la coordenada, no
--    al completar la OT (`fn_refresh_tree_current` copia el valor
--    vigente a `trees` después). El trigger de `trees` se mantiene
--    como última barrera.
--
-- Contenido:
-- 1. `fn_check_arbol_dentro_sector`: trigger BEFORE INSERT/UPDATE en
--    `trees`, dispara solo si cambian `utm_este`, `utm_norte` o
--    `sector_id`. Si falta alguna coordenada, no valida — D-9/D-10 son
--    Obligatorio según el Excel, pero esa exigencia es del formulario
--    (#57, Zod), no de esta columna física (sigue siendo NULLABLE,
--    heredada del modelo 001); esta migración no la cambia a NOT NULL
--    porque eso es decisión de #57, no de CC-046. La geometría del
--    árbol se recalcula con la misma fórmula de `trees.ubicacion`
--    (ADR-010 v3.0: UTM 19S/WGS84 → geography(Point, 4326)) en vez de
--    leer la columna generada, porque una columna GENERATED ALWAYS AS
--    todavía no tiene su valor final dentro de un trigger BEFORE.
-- 2. `fn_check_version_dentro_sector`: mismo criterio, trigger BEFORE
--    INSERT/UPDATE de `utm_este`/`utm_norte` en `tree_data_versions`;
--    el sector se obtiene del árbol (`tree_id` → `trees.sector_id`).
-- 3. `fn_update_sector_geometria` (CREATE OR REPLACE, ya existe desde
--    la 018b): antes de aplicar la nueva geometría, rechaza si deja
--    fuera a algún árbol que ya tenga esa `sector_id`, con la lista de
--    `tree_code`.

-- ---------------------------------------------------------------------
-- 1. fn_check_arbol_dentro_sector — trigger de trees (alta y cambio de ubicación)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_check_arbol_dentro_sector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_punto geography;
  v_geometria_sector geography;
BEGIN
  -- Sin coordenadas todavía no hay nada que validar (D-9/D-10
  -- Obligatorio se exige en el formulario, #57 — no se inventa aquí).
  IF NEW.utm_este IS NULL OR NEW.utm_norte IS NULL THEN
    RETURN NEW;
  END IF;

  -- Misma fórmula que la columna generada `trees.ubicacion` (ADR-010
  -- v3.0): no se puede leer NEW.ubicacion en un trigger BEFORE, porque
  -- una columna GENERATED ALWAYS AS todavía no tiene su valor final
  -- en este punto.
  v_punto := ST_Transform(ST_SetSRID(ST_MakePoint(NEW.utm_este, NEW.utm_norte), 32719), 4326)::geography;

  SELECT geometria_sector INTO v_geometria_sector
  FROM public.sectors
  WHERE id = NEW.sector_id;

  -- geometria_sector es NOT NULL: un resultado NULL solo puede
  -- significar que el sector no existe o que no es visible (RLS) — en
  -- ningún caso se salta la validación (decisión de la responsable,
  -- 2026-10-23). No se confía en que la FK compuesta
  -- trees_project_sector_fkey lo atrape después: para entonces ya
  -- habríamos dejado pasar la validación espacial en silencio.
  IF v_geometria_sector IS NULL THEN
    RAISE EXCEPTION 'No se encontró el sector % del árbol % (o no es visible)', NEW.sector_id, COALESCE(NEW.tree_code, '(nuevo)')
      USING ERRCODE = 'SV046';
  END IF;

  IF NOT ST_Covers(v_geometria_sector, v_punto) THEN
    RAISE EXCEPTION 'El árbol % queda fuera de la delimitación del sector de su proyecto', COALESCE(NEW.tree_code, '(nuevo)')
      USING ERRCODE = 'SV046';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trees_dentro_sector
  BEFORE INSERT OR UPDATE OF utm_este, utm_norte, sector_id ON trees
  FOR EACH ROW EXECUTE FUNCTION fn_check_arbol_dentro_sector();

-- ---------------------------------------------------------------------
-- 2. fn_check_version_dentro_sector — trigger de tree_data_versions
--    (alta e inspección: el error aparece al registrar la coordenada)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_check_version_dentro_sector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_punto geography;
  v_geometria_sector geography;
BEGIN
  IF NEW.utm_este IS NULL OR NEW.utm_norte IS NULL THEN
    RETURN NEW;
  END IF;

  v_punto := ST_Transform(ST_SetSRID(ST_MakePoint(NEW.utm_este, NEW.utm_norte), 32719), 4326)::geography;

  -- El sector es el del árbol de esta versión (tree_id → trees.sector_id).
  SELECT s.geometria_sector INTO v_geometria_sector
  FROM public.trees t
  JOIN public.sectors s ON s.id = t.sector_id
  WHERE t.id = NEW.tree_id;

  -- Mismo criterio que fn_check_arbol_dentro_sector: NULL (árbol o
  -- sector no encontrado, o no visible) nunca se trata como "nada que
  -- validar".
  IF v_geometria_sector IS NULL THEN
    RAISE EXCEPTION 'No se encontró el sector del árbol asociado a esta versión (tree_id %)', NEW.tree_id
      USING ERRCODE = 'SV046';
  END IF;

  IF NOT ST_Covers(v_geometria_sector, v_punto) THEN
    RAISE EXCEPTION 'La coordenada registrada queda fuera de la delimitación del sector del árbol (tree_id %)', NEW.tree_id
      USING ERRCODE = 'SV046';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tree_data_versions_dentro_sector
  BEFORE INSERT OR UPDATE OF utm_este, utm_norte ON tree_data_versions
  FOR EACH ROW EXECUTE FUNCTION fn_check_version_dentro_sector();

-- ---------------------------------------------------------------------
-- 3. fn_update_sector_geometria — rechaza si deja árboles fuera (CC-046)
-- ---------------------------------------------------------------------
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
  v_existe boolean;
  v_fuera text[];
BEGIN
  SELECT geografia, excluidas INTO v_geografia, v_excluidas
  FROM public.fn_build_sector_geometria(p_formato, p_geometria_geojson, p_geometria_kml, p_indices_seleccionados);

  -- Mismo criterio del punto 1: se comprueba la existencia del sector
  -- explícitamente, antes de calcular qué árboles quedarían fuera —
  -- no se confía solo en el NOT FOUND del UPDATE final.
  SELECT TRUE INTO v_existe FROM public.sectors WHERE id = p_sector_id;
  IF v_existe IS NULL THEN
    RAISE EXCEPTION 'Sector no encontrado';
  END IF;

  -- CC-046: si la nueva delimitación deja fuera a algún árbol que ya
  -- pertenece a este sector, se rechaza antes de escribir nada, con la
  -- lista de tree_code. Mismo cálculo que fn_check_arbol_dentro_sector
  -- (no se lee trees.ubicacion por columna generada, se recalcula).
  SELECT array_agg(tree_code ORDER BY tree_code) INTO v_fuera
  FROM public.trees
  WHERE sector_id = p_sector_id
    AND utm_este IS NOT NULL AND utm_norte IS NOT NULL
    AND NOT ST_Covers(
      v_geografia,
      ST_Transform(ST_SetSRID(ST_MakePoint(utm_este, utm_norte), 32719), 4326)::geography
    );

  IF v_fuera IS NOT NULL THEN
    RAISE EXCEPTION 'La nueva delimitación deja fuera a los árboles: %', array_to_string(v_fuera, ', ')
      USING ERRCODE = 'SV046';
  END IF;

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

REVOKE ALL ON FUNCTION public.fn_check_arbol_dentro_sector() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_arbol_dentro_sector() TO service_role;
REVOKE ALL ON FUNCTION public.fn_check_version_dentro_sector() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_version_dentro_sector() TO service_role;
-- fn_update_sector_geometria conserva los GRANT/REVOKE de la 018b (sin cambios de firma).
