-- =====================================================================
-- Migración 018b — Funciones de PROYECTOS + SECTORES (issue #56)
-- =====================================================================
--
-- Corrige 3 errores encontrados antes de aplicar la versión anterior:
--
-- 1. (reportado por la responsable, confirmado con SELECT de solo
--    lectura) ST_GeomFromKML no acepta un documento KML completo
--    (<kml><Document><Placemark><Polygon>…), solo el fragmento de
--    geometría (<Polygon>…</Polygon>) solo. Se agrega
--    `fn_extraer_superficies_kml`: usa xpath() (por local-name, sin
--    depender de que el KML declare el namespace de una forma
--    particular) para extraer, de cada Placemark, el nodo de geometría
--    directo (Polygon/MultiGeometry/Point/LineString/LinearRing), y
--    convierte cada uno por separado con ST_GeomFromKML. Verificado
--    contra un KML con Document/Folder/varios Placemark, con un punto
--    y una línea a excluir.
--
-- 2. (reportado por la responsable, confirmado: dos polígonos que se
--    tocan dan ST_IsValid = false ANTES de unir) ST_IsValid se
--    evaluaba sobre el conjunto combinado antes de ST_Union — un
--    MULTIPOLYGON con partes superpuestas es inválido como UN SOLO
--    multipolígono, aunque cada parte sea válida por separado. Se
--    corrige el orden: cada parte se separa con ST_Dump y se valida
--    individualmente (rechazando si alguna es inválida, nunca
--    ST_MakeValid); solo después se unen con ST_Union + ST_Multi.
--
-- 3. (encontrado en esta misma revisión, con SELECT de solo lectura,
--    antes de que la responsable lo probara) un KML real de Google
--    Earth trae altitud en las coordenadas (p. ej. "...,0"), lo que
--    produce una geometría con Z. `sectors.geometria_sector` es
--    geography(MultiPolygon, 4326) — 2D estricto — y el cast falla con
--    "Geometry has Z dimension but column does not". D-266 ya dice que
--    la superficie es horizontal ("no corresponde a la superficie
--    inclinada del terreno"), así que se aplica ST_Force2D de forma
--    sistemática, antes de cualquier validación.
--
-- Además, D-265 pide informar la exclusión de puntos/líneas (no en
-- silencio) y permitir elegir qué superficies integran el sector si el
-- archivo trae varias. Detalle aprobado por la responsable (CC-047):
-- `fn_extraer_superficies_kml` lista cada elemento del archivo con su
-- índice y su estado — válida, inválida (con el motivo) o excluida
-- (solo puntos y líneas) —; el backend expone ese resultado como
-- vista previa (POST /api/sivu/projects/sector-preview, solo
-- Administrador, no guarda nada). Crear/editar reciben
-- `indicesSeleccionados`: obligatorio si el archivo trae más de una
-- superficie (nunca se incluyen todas por defecto); una superficie
-- inválida o excluida nunca se puede seleccionar. Los rechazos de
-- geometría usan SQLSTATE SV265 (el backend los traduce a 422).
--
-- Resto sin cambios respecto de la versión anterior: retiro de
-- `institution_name`/`responsible_professional` (PR-005 v4.0, nunca
-- ejecutado por la 012); `SECURITY DEFINER` solo en las funciones que
-- escriben, `service_role` únicamente (ADR-014 v2.0; ADR-017 v1.1 —
-- este flujo no necesita node-postgres).

-- ---------------------------------------------------------------------
-- 1. Retiro de columnas que no están en el Excel (PR-005 v4.0)
-- ---------------------------------------------------------------------
ALTER TABLE projects
  DROP COLUMN institution_name,
  DROP COLUMN responsible_professional;

-- ---------------------------------------------------------------------
-- 2. fn_extraer_superficies_kml — lectura y clasificación (D-265; CC-047)
-- ---------------------------------------------------------------------
-- Sin SECURITY DEFINER: no toca ninguna tabla, solo XML/geometría. Es
-- también la vista previa (POST /api/sivu/projects/sector-preview): no
-- rechaza un archivo por traer superficies inválidas, las lista con su
-- motivo para que el Administrador las vea antes de guardar.
--
-- Cada elemento recibe un índice correlativo (en orden del documento;
-- cada parte de un Multi* es un elemento aparte), el `nombre` del
-- <name> de su Placemark (null si no tiene) y un estado (CC-047):
--   valida   — superficie poligonal válida, no vacía, dentro de rango;
--   invalida — superficie ilegible o inválida, con el motivo (error de
--              lectura o ST_IsValidReason). Nunca se repara
--              (ST_MakeValid) y nunca se puede seleccionar;
--   excluida — punto o línea (D-265: "excluir puntos y líneas e
--              informar su exclusión"). Solo esto cuenta como excluido.
CREATE FUNCTION public.fn_extraer_superficies_kml(p_kml text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doc xml;
  v_placemarks integer;
  v_nodos xml[];
  v_nodo xml;
  v_total_nodos integer := 0;
  v_nombre text;
  v_nombre_nodo text;
  v_geom geometry;
  v_parte geometry;
  v_error text;
  v_estado text;
  v_motivo text;
  v_superficies jsonb := '[]'::jsonb;
  v_indice integer := 0;
  v_validas integer := 0;
  v_invalidas integer := 0;
  v_excluidas integer := 0;
BEGIN
  BEGIN
    v_doc := xmlparse(document p_kml);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'KML inválido: no es un documento XML bien formado' USING ERRCODE = 'SV265';
  END;

  -- Por local-name(): funciona con o sin namespace declarado, y da
  -- igual qué URI de namespace use el archivo (KML 2.1, 2.2, sin
  -- prefijo…). Se recorre cada Placemark por su posición en el
  -- documento completo, para leer su <name> (CC-047: el nombre se
  -- muestra en la vista previa y en los mensajes) junto con su nodo de
  -- geometría DIRECTO — ST_GeomFromKML no acepta
  -- <kml>/<Document>/<Placemark> alrededor.
  v_placemarks := (xpath('count(//*[local-name()="Placemark"])', v_doc))[1]::text::numeric::integer;

  FOR v_i IN 1 .. v_placemarks LOOP
    -- string() devuelve el texto escapado como XML: se desescapa
    -- (&amp; al final, para no desescapar dos veces). Sin <name> o con
    -- <name> vacío, el nombre queda null.
    v_nombre := (xpath(format('string((//*[local-name()="Placemark"])[%s]/*[local-name()="name"])', v_i), v_doc))[1]::text;
    v_nombre := replace(replace(replace(replace(replace(v_nombre,
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&apos;', ''''), '&amp;', '&');
    v_nombre := NULLIF(btrim(v_nombre), '');

    v_nodos := xpath(
      format('(//*[local-name()="Placemark"])[%s]/*[local-name()="Polygon" or local-name()="MultiGeometry" or local-name()="Point" or local-name()="LineString" or local-name()="LinearRing"]', v_i),
      v_doc
    );

    FOREACH v_nodo IN ARRAY COALESCE(v_nodos, '{}') LOOP
      v_total_nodos := v_total_nodos + 1;

      -- Nombre del elemento (sin prefijo de namespace), para clasificar
      -- un nodo que PostGIS no logra leer.
      v_nombre_nodo := regexp_replace(substring(v_nodo::text from '^\s*<([A-Za-z0-9_.:-]+)'), '^.*:', '');

      v_error := NULL;
      BEGIN
        -- ST_Force2D: un KML real trae altitud en las coordenadas; el
        -- sector es una superficie horizontal (D-266), no se conserva Z.
        v_geom := ST_Force2D(ST_GeomFromKML(v_nodo::text));
      EXCEPTION WHEN OTHERS THEN
        v_geom := NULL;
        v_error := SQLERRM;
      END;

      IF v_geom IS NULL OR ST_IsEmpty(v_geom) THEN
        IF v_nombre_nodo IN ('Point', 'LineString', 'LinearRing') THEN
          v_estado := 'excluida';
          v_motivo := 'Punto o línea: no es una superficie y se excluye del sector';
          v_excluidas := v_excluidas + 1;
        ELSE
          v_estado := 'invalida';
          v_motivo := 'No se pudo leer la geometría: ' || COALESCE(v_error, 'geometría vacía');
          v_invalidas := v_invalidas + 1;
        END IF;

        v_superficies := v_superficies || jsonb_build_array(jsonb_build_object(
          'indice', v_indice, 'nombre', v_nombre, 'estado', v_estado, 'tipo', v_nombre_nodo,
          'motivo', v_motivo, 'geometria', NULL));
        v_indice := v_indice + 1;
        CONTINUE;
      END IF;

      -- ST_Dump devuelve partes atómicas (también dentro de un
      -- MultiGeometry con tipos mezclados): cada una se clasifica sola,
      -- con el nombre de su Placemark.
      FOR v_parte IN SELECT (ST_Dump(v_geom)).geom LOOP
        v_motivo := NULL;

        IF GeometryType(v_parte) <> 'POLYGON' THEN
          v_estado := 'excluida';
          v_motivo := 'Punto o línea: no es una superficie y se excluye del sector';
          v_excluidas := v_excluidas + 1;
        ELSIF ST_IsEmpty(v_parte) THEN
          v_estado := 'invalida';
          v_motivo := 'Superficie vacía';
          v_invalidas := v_invalidas + 1;
        ELSIF NOT ST_IsValid(v_parte) THEN
          v_estado := 'invalida';
          v_motivo := ST_IsValidReason(v_parte);
          v_invalidas := v_invalidas + 1;
        ELSIF ST_XMin(v_parte) < -180 OR ST_XMax(v_parte) > 180
           OR ST_YMin(v_parte) < -90 OR ST_YMax(v_parte) > 90 THEN
          v_estado := 'invalida';
          v_motivo := 'Coordenadas fuera de rango geográfico válido (longitud -180..180, latitud -90..90)';
          v_invalidas := v_invalidas + 1;
        ELSE
          v_estado := 'valida';
          v_validas := v_validas + 1;
        END IF;

        v_superficies := v_superficies || jsonb_build_array(jsonb_build_object(
          'indice', v_indice, 'nombre', v_nombre, 'estado', v_estado, 'tipo', GeometryType(v_parte),
          'motivo', v_motivo,
          'geometria', ST_AsGeoJSON(ST_SetSRID(v_parte, 4326))::jsonb));
        v_indice := v_indice + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  IF v_total_nodos = 0 THEN
    RAISE EXCEPTION 'El archivo KML no contiene ninguna marca (Placemark) con geometría' USING ERRCODE = 'SV265';
  END IF;

  RETURN jsonb_build_object(
    'superficies', v_superficies,
    'validas', v_validas,
    'invalidas', v_invalidas,
    'excluidas', v_excluidas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_extraer_superficies_kml(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_extraer_superficies_kml(text) TO service_role;

-- ---------------------------------------------------------------------
-- 3. fn_unir_y_validar_superficies — validar cada parte y unir (D-265)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_unir_y_validar_superficies(p_geoms geometry[])
RETURNS geography
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parte geometry;
  v_union geometry;
  v_posicion integer := 0;
BEGIN
  IF array_length(p_geoms, 1) IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna superficie para construir el sector' USING ERRCODE = 'SV265';
  END IF;

  -- Cada parte se valida POR SEPARADO antes de unir. Validar el
  -- conjunto combinado (antes de ST_Union) rechazaba partes
  -- individualmente válidas que solo se superponían entre sí —
  -- exactamente lo que D-265 pide unir, no rechazar.
  FOREACH v_parte IN ARRAY p_geoms LOOP
    IF NOT ST_IsValid(v_parte) THEN
      RAISE EXCEPTION 'La superficie % es inválida: %', v_posicion, ST_IsValidReason(v_parte)
        USING ERRCODE = 'SV265';
    END IF;
    IF ST_XMin(v_parte) < -180 OR ST_XMax(v_parte) > 180
       OR ST_YMin(v_parte) < -90 OR ST_YMax(v_parte) > 90 THEN
      RAISE EXCEPTION 'La superficie % tiene coordenadas fuera de rango geográfico válido (longitud -180..180, latitud -90..90)', v_posicion
        USING ERRCODE = 'SV265';
    END IF;
    v_posicion := v_posicion + 1;
  END LOOP;

  -- "Unirlas sin duplicar áreas superpuestas" + "conservar los huecos
  -- interiores": ST_Union disuelve los solapes sin tocar los huecos de
  -- cada parte; ST_Multi normaliza el resultado al tipo de la columna.
  SELECT ST_Union(geom) INTO v_union FROM unnest(p_geoms) AS geom;
  v_union := ST_Multi(v_union);

  IF NOT ST_IsValid(v_union) THEN
    RAISE EXCEPTION 'Geometría inválida tras unir las superficies: %', ST_IsValidReason(v_union)
      USING ERRCODE = 'SV265';
  END IF;
  IF ST_IsEmpty(v_union) THEN
    RAISE EXCEPTION 'La geometría del sector está vacía tras unir las superficies' USING ERRCODE = 'SV265';
  END IF;

  RETURN v_union::geography;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_unir_y_validar_superficies(geometry[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_unir_y_validar_superficies(geometry[]) TO service_role;

-- ---------------------------------------------------------------------
-- 4. fn_build_sector_geometria — dispatcher por formato
-- ---------------------------------------------------------------------
-- Selección de superficies de un archivo KML/KMZ (CC-047):
--   - una sola superficie en el archivo, y válida → no hace falta
--     seleccionar;
--   - más de una superficie → `p_indices_seleccionados` es obligatorio;
--     nunca se incluyen todas por defecto;
--   - un índice seleccionado que es inválido o excluido → rechazo, con
--     el índice y el motivo;
--   - ninguna superficie válida en el archivo → rechazo.
-- Todo rechazo de geometría usa SQLSTATE SV265, que el backend traduce
-- a 422 sin depender del texto del mensaje.
CREATE FUNCTION public.fn_build_sector_geometria(
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text,
  p_indices_seleccionados integer[] DEFAULT NULL,
  OUT geografia geography,
  OUT excluidas integer
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_extraccion jsonb;
  v_superficies jsonb;
  v_superficie jsonb;
  v_geoms geometry[] := '{}';
  v_geom geometry;
  v_idx integer;
  v_detalle text;
  v_validas_txt text;
  v_etiqueta text;
BEGIN
  excluidas := 0;

  IF p_formato = 'geojson' THEN
    IF p_geometria_geojson IS NULL THEN
      RAISE EXCEPTION 'geometria_geojson es obligatoria para formato geojson' USING ERRCODE = 'SV265';
    END IF;

    BEGIN
      v_geom := ST_SetSRID(ST_GeomFromGeoJSON(p_geometria_geojson::text), 4326);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'GeoJSON inválido: no se pudo interpretar la geometría' USING ERRCODE = 'SV265';
    END;

    IF v_geom IS NULL OR ST_IsEmpty(v_geom) THEN
      RAISE EXCEPTION 'La geometría del sector está vacía o no se pudo construir' USING ERRCODE = 'SV265';
    END IF;
    IF GeometryType(v_geom) NOT IN ('POLYGON', 'MULTIPOLYGON') THEN
      RAISE EXCEPTION 'Tipo de geometría no admitido (%): el sector solo acepta superficies, nunca puntos ni líneas', GeometryType(v_geom)
        USING ERRCODE = 'SV265';
    END IF;

    -- Un dibujo en el mapa ya es lo que el usuario quiere: sin
    -- selección. Cada parte se valida en fn_unir_y_validar_superficies.
    SELECT array_agg(ST_Force2D((ST_Dump(v_geom)).geom)) INTO v_geoms;

  ELSIF p_formato = 'kml' THEN
    IF p_geometria_kml IS NULL OR TRIM(p_geometria_kml) = '' THEN
      RAISE EXCEPTION 'geometria_kml es obligatoria para formato kml' USING ERRCODE = 'SV265';
    END IF;

    v_extraccion := public.fn_extraer_superficies_kml(p_geometria_kml);
    v_superficies := v_extraccion->'superficies';
    excluidas := (v_extraccion->>'excluidas')::integer;

    IF (v_extraccion->>'validas')::integer = 0 THEN
      SELECT string_agg(format('%s: %s', format('superficie %s%s', s->>'indice', COALESCE(' (' || (s->>'nombre') || ')', '')), s->>'motivo'), '; ' ORDER BY (s->>'indice')::integer)
      INTO v_detalle
      FROM jsonb_array_elements(v_superficies) AS s
      WHERE s->>'estado' = 'invalida';

      IF v_detalle IS NULL THEN
        RAISE EXCEPTION 'El archivo no contiene ninguna superficie: solo puntos o líneas, que se excluyen del sector'
          USING ERRCODE = 'SV265';
      END IF;
      RAISE EXCEPTION 'El archivo no contiene ninguna superficie válida (%)', v_detalle USING ERRCODE = 'SV265';
    END IF;

    IF p_indices_seleccionados IS NULL THEN
      IF (v_extraccion->>'validas')::integer + (v_extraccion->>'invalidas')::integer > 1 THEN
        IF (v_extraccion->>'invalidas')::integer = 0 THEN
          RAISE EXCEPTION 'El archivo contiene varias superficies: selecciona las que integrarán el sector'
            USING ERRCODE = 'SV265';
        END IF;

        -- Hay inválidas junto a válidas: se rechaza igual (una inválida
        -- nunca queda fuera sin que alguien lo decida), diciendo cuál es
        -- inválida y por qué, y cuál es la válida a seleccionar (CC-047).
        SELECT string_agg(format('%s: %s', format('superficie %s%s', s->>'indice', COALESCE(' (' || (s->>'nombre') || ')', '')), s->>'motivo'), '; ' ORDER BY (s->>'indice')::integer)
        INTO v_detalle
        FROM jsonb_array_elements(v_superficies) AS s
        WHERE s->>'estado' = 'invalida';

        IF (v_extraccion->>'validas')::integer = 1 THEN
          SELECT format('superficie %s%s', s->>'indice', COALESCE(' (' || (s->>'nombre') || ')', '')) INTO v_validas_txt
          FROM jsonb_array_elements(v_superficies) AS s
          WHERE s->>'estado' = 'valida';
          RAISE EXCEPTION 'El archivo contiene superficies inválidas (%): selecciona la superficie válida (%) para integrar el sector', v_detalle, v_validas_txt
            USING ERRCODE = 'SV265';
        END IF;

        SELECT string_agg(format('superficie %s%s', s->>'indice', COALESCE(' (' || (s->>'nombre') || ')', '')), ', ' ORDER BY (s->>'indice')::integer)
        INTO v_validas_txt
        FROM jsonb_array_elements(v_superficies) AS s
        WHERE s->>'estado' = 'valida';
        RAISE EXCEPTION 'El archivo contiene superficies inválidas (%): selecciona entre las superficies válidas (%) las que integrarán el sector', v_detalle, v_validas_txt
          USING ERRCODE = 'SV265';
      END IF;

      -- Exactamente una superficie en el archivo, y es válida (hay al
      -- menos una válida, comprobado arriba).
      SELECT array_agg(ST_SetSRID(ST_GeomFromGeoJSON(s->'geometria'), 4326))
      INTO v_geoms
      FROM jsonb_array_elements(v_superficies) AS s
      WHERE s->>'estado' = 'valida';
    ELSE
      IF array_length(p_indices_seleccionados, 1) IS NULL THEN
        RAISE EXCEPTION 'Debe seleccionar al menos una superficie' USING ERRCODE = 'SV265';
      END IF;

      FOREACH v_idx IN ARRAY p_indices_seleccionados LOOP
        IF v_idx < 0 OR v_idx >= jsonb_array_length(v_superficies) THEN
          RAISE EXCEPTION 'El archivo no tiene una superficie %', v_idx USING ERRCODE = 'SV265';
        END IF;

        -- El índice coincide con la posición en el arreglo: la
        -- extracción asigna uno correlativo a cada elemento que agrega.
        v_superficie := v_superficies->v_idx;
        v_etiqueta := format('superficie %s%s', v_idx, COALESCE(' (' || (v_superficie->>'nombre') || ')', ''));

        IF v_superficie->>'estado' = 'invalida' THEN
          RAISE EXCEPTION 'La % es inválida y no puede integrar el sector: %', v_etiqueta, v_superficie->>'motivo'
            USING ERRCODE = 'SV265';
        ELSIF v_superficie->>'estado' = 'excluida' THEN
          RAISE EXCEPTION 'La % es un punto o una línea y no puede integrar el sector', v_etiqueta
            USING ERRCODE = 'SV265';
        END IF;

        v_geoms := v_geoms || ST_SetSRID(ST_GeomFromGeoJSON(v_superficie->'geometria'), 4326);
      END LOOP;
    END IF;

  ELSE
    RAISE EXCEPTION 'Formato de geometría no reconocido: %', p_formato USING ERRCODE = 'SV265';
  END IF;

  geografia := public.fn_unir_y_validar_superficies(v_geoms);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_build_sector_geometria(text, jsonb, text, integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_build_sector_geometria(text, jsonb, text, integer[]) TO service_role;

-- ---------------------------------------------------------------------
-- 5. fn_create_project_with_sector — alta atómica (PR-004 v7.0 / PR-005 v4.0)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_create_project_with_sector(
  p_nombre_proyecto text,
  p_nombre_sector text,
  p_formato text,
  p_geometria_geojson jsonb,
  p_geometria_kml text,
  p_indices_seleccionados integer[],
  p_created_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_geografia geography;
  v_excluidas integer;
  v_project_id uuid;
  v_sector_id uuid;
BEGIN
  SELECT geografia, excluidas INTO v_geografia, v_excluidas
  FROM public.fn_build_sector_geometria(p_formato, p_geometria_geojson, p_geometria_kml, p_indices_seleccionados);

  INSERT INTO public.projects (nombre_proyecto, created_by)
  VALUES (p_nombre_proyecto, p_created_by)
  RETURNING id INTO v_project_id;

  INSERT INTO public.sectors (project_id, nombre_sector, geometria_sector)
  VALUES (v_project_id, p_nombre_sector, v_geografia)
  RETURNING id INTO v_sector_id;

  RETURN jsonb_build_object('project_id', v_project_id, 'sector_id', v_sector_id, 'superficies_excluidas', v_excluidas);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_project_with_sector(text, text, text, jsonb, text, integer[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_project_with_sector(text, text, text, jsonb, text, integer[], uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 6. fn_update_sector_geometria — editar la delimitación del sector
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_update_sector_geometria(
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

REVOKE ALL ON FUNCTION public.fn_update_sector_geometria(uuid, text, jsonb, text, integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_sector_geometria(uuid, text, jsonb, text, integer[]) TO service_role;
