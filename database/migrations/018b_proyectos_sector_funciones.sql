-- =====================================================================
-- Migración 018b — Funciones de PROYECTOS + SECTORES (issue #56)
-- =====================================================================
--
-- Cierra una brecha encontrada entre documentación y esquema físico:
-- PR-005 v4.0 ("vigente") dice textualmente "Se eliminan
-- `institution_name` y `responsible_professional`: no están en el
-- Excel" — pero la migración 012 solo renombró `name`/`status` y nunca
-- llegó a ejecutar ese retiro sobre `projects`. No es una decisión
-- nueva: es la decisión ya aprobada (PR-005 v4.0), ejecutada ahora
-- físicamente sobre `valpo-verde-conecta-pruebas`. No afecta la demo:
-- `valpo-verde-conecta` no tiene esta migración y sigue usando esas
-- columnas sin cambios (issue #45, Fase 8).
--
-- Contenido:
-- 1. DROP de `institution_name`/`responsible_professional` (PR-005 v4.0).
-- 2. `fn_build_sector_geometria`: valida y normaliza una geometría de
--    sector (GeoJSON o KML crudo) contra las reglas de D-265 —
--    superficie válida y no vacía, sin puntos ni líneas, huecos
--    interiores conservados, unión sin duplicar áreas superpuestas,
--    normalizada a MultiPolygon, SRID 4326. Rechaza con excepción si la
--    geometría es inválida (nunca ST_MakeValid, decisión de la
--    responsable). Sin SECURITY DEFINER: no toca ninguna tabla.
-- 3. `fn_create_project_with_sector`: crea PROYECTOS + SECTORES en una
--    sola transacción (diseño §3.3; PR-004 v7.0; PR-005 v4.0). Resuelve
--    la revisión de ADR-017: esta función demuestra que ese flujo NO
--    necesita `node-postgres` — una sola invocación de una función
--    Postgres SECURITY DEFINER ya es una transacción atómica, con la
--    validación geométrica hecha en SQL (sin motor de reglas en medio,
--    a diferencia de completar OT o anular una inspección, que sí lo
--    necesitan). ADR-017 se corrige en el mismo PR para reflejar esto.
-- 4. `fn_update_sector_geometria`: igual validación para PATCH
--    /api/sivu/projects/:id (editar sector). El trigger
--    `trg_sectors_proyecto_cerrado` (migración 017) ya bloquea esta
--    función si el proyecto está cerrado — no se duplica ese control.
--
-- Autorización (ADR-014 v2.0 / CC-033): estas funciones NO repiten el
-- patrón de `fn_create_tree_with_measurement` (que valida auth.uid() y
-- membresía adentro, porque se invoca con el JWT del usuario). Acá la
-- autorización (`assertAdmin`) ya ocurrió en el backend ANTES de
-- invocar la función, que se llama con `service_role` (sin JWT de
-- usuario adjunto, por lo que `auth.uid()` sería NULL de todos modos).
-- Mismo motivo por el que CC-033 revocó EXECUTE de
-- `fn_create_tree_with_measurement` a `authenticated`/`anon`: en el
-- modelo nuevo, ninguna escritura la ejecuta un rol que no sea
-- `service_role`.

-- ---------------------------------------------------------------------
-- 1. Retiro de columnas que no están en el Excel (PR-005 v4.0)
-- ---------------------------------------------------------------------
ALTER TABLE projects
  DROP COLUMN institution_name,
  DROP COLUMN responsible_professional;

-- ---------------------------------------------------------------------
-- 2. fn_build_sector_geometria — validación y normalización (D-265)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_build_sector_geometria(
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text
) RETURNS geography
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geom geometry;
BEGIN
  IF p_formato = 'geojson' THEN
    IF p_geometria_geojson IS NULL THEN
      RAISE EXCEPTION 'geometria_geojson es obligatoria para formato geojson';
    END IF;
    BEGIN
      v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geometria_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'GeoJSON inválido: no se pudo interpretar la geometría';
    END;
  ELSIF p_formato = 'kml' THEN
    IF p_geometria_kml IS NULL OR TRIM(p_geometria_kml) = '' THEN
      RAISE EXCEPTION 'geometria_kml es obligatoria para formato kml';
    END IF;
    BEGIN
      v_geom := ST_SetSRID(ST_GeomFromKML(p_geometria_kml), 4326);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'KML inválido: no se pudo interpretar la geometría';
    END;
  ELSE
    RAISE EXCEPTION 'Formato de geometría no reconocido: %', p_formato;
  END IF;

  IF v_geom IS NULL OR ST_IsEmpty(v_geom) THEN
    RAISE EXCEPTION 'La geometría del sector está vacía o no se pudo construir';
  END IF;

  -- D-265: "Excluir puntos y líneas e informar su exclusión". Un KML
  -- puede traer una GeometryCollection con marcas de varios tipos: se
  -- descartan puntos/líneas y se conservan solo las superficies.
  IF GeometryType(v_geom) = 'GEOMETRYCOLLECTION' THEN
    v_geom := ST_CollectionExtract(v_geom, 3); -- 3 = polígonos
    IF v_geom IS NULL OR ST_IsEmpty(v_geom) THEN
      RAISE EXCEPTION 'El archivo no contiene ninguna superficie poligonal válida (solo puntos o líneas)';
    END IF;
  ELSIF GeometryType(v_geom) NOT IN ('POLYGON', 'MULTIPOLYGON') THEN
    RAISE EXCEPTION 'Tipo de geometría no admitido (%): el sector solo acepta superficies, nunca puntos ni líneas', GeometryType(v_geom);
  END IF;

  -- Rango geográfico genérico WGS84 (lon -180..180, lat -90..90). No es
  -- un límite específico de Chile/Valparaíso: el Excel no fija uno y no
  -- se inventa (CLAUDE.md, "no inventar").
  IF ST_XMin(v_geom) < -180 OR ST_XMax(v_geom) > 180
     OR ST_YMin(v_geom) < -90 OR ST_YMax(v_geom) > 90 THEN
    RAISE EXCEPTION 'Coordenadas fuera de rango geográfico válido (longitud -180..180, latitud -90..90)';
  END IF;

  -- Rechazar si es inválida — nunca ST_MakeValid (decisión de la
  -- responsable, 2026-10-22).
  IF NOT ST_IsValid(v_geom) THEN
    RAISE EXCEPTION 'Geometría inválida: %', ST_IsValidReason(v_geom);
  END IF;

  -- "Unirlas sin duplicar áreas superpuestas" + "conservar los huecos
  -- interiores": ST_Union disuelve los solapes entre las partes de la
  -- misma geometría sin tocar sus huecos; ST_Multi normaliza el
  -- resultado (que ST_Union puede devolver como Polygon simple) a
  -- MultiPolygon, el tipo de la columna.
  v_geom := ST_Multi(ST_Union(v_geom));

  IF NOT ST_IsValid(v_geom) THEN
    RAISE EXCEPTION 'Geometría inválida tras normalizar: %', ST_IsValidReason(v_geom);
  END IF;

  RETURN v_geom::geography;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_build_sector_geometria(text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_build_sector_geometria(text, jsonb, text) TO service_role;

-- ---------------------------------------------------------------------
-- 3. fn_create_project_with_sector — alta atómica (PR-004 v7.0 / PR-005 v4.0)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_create_project_with_sector(
  p_nombre_proyecto text,
  p_nombre_sector text,
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text,
  p_created_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geografia geography;
  v_project_id uuid;
  v_sector_id uuid;
BEGIN
  v_geografia := public.fn_build_sector_geometria(p_formato, p_geometria_geojson, p_geometria_kml);

  INSERT INTO public.projects (nombre_proyecto, created_by)
  VALUES (p_nombre_proyecto, p_created_by)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector)
  VALUES (v_project_id, p_nombre_sector, v_geografia)
  RETURNING id INTO v_sector_id;

  RETURN jsonb_build_object('project_id', v_project_id, 'sector_id', v_sector_id);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_project_with_sector(text, text, text, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_project_with_sector(text, text, text, jsonb, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 4. fn_update_sector_geometria — editar la delimitación del sector
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_update_sector_geometria(
  p_sector_id uuid,
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geografia geography;
BEGIN
  v_geografia := public.fn_build_sector_geometria(p_formato, p_geometria_geojson, p_geometria_kml);

  -- Si el proyecto está cerrado, trg_sectors_proyecto_cerrado (migración
  -- 017, CC-042) rechaza este UPDATE antes de llegar aquí.
  UPDATE public.sectors
  SET geometria_sector = v_geografia
  WHERE id = p_sector_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sector no encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_update_sector_geometria(uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_sector_geometria(uuid, text, jsonb, text) TO service_role;
