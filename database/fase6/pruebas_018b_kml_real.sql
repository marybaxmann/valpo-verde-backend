-- =====================================================================
-- Pruebas de la migración 018b con KML reales (D-265; CC-047)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, con la 018b aplicada. Todo
-- corre dentro de BEGIN … ROLLBACK: los proyectos y sectores que crea
-- K3–K5 (para comprobar `superficie_sector_m2`, columna generada) no
-- quedan en la base.
--
-- Los archivos NO están en el repositorio. Antes de correr este script,
-- quien lo ejecuta llena la tabla temporal `kml_real` (justo después
-- del BEGIN) con el contenido de:
--   'levantamiento' — "Levantamiento 10 de Agosto (2).kml", exportado de
--                     Google Earth por la responsable: 31 Placemark, en
--                     orden 27 puntos (A-001 a A-011 + 16 marcadores) y
--                     4 polígonos: Plaza Victoria (~5.800 m²), Parque
--                     Italia (~12.250 m²), Plaza O´Higgins (~12.400 m²) y
--                     Área de estudio (~67.300 m², NO se superpone con
--                     Plaza Victoria — confirmado 2026-10-23, ver K5).
--                     Coordenadas con Z.
--   'taller4'       — "taller4.kml" (salida de Radio Mobile): 7 líneas y
--                     2 puntos, ningún polígono.
--
-- Los índices de los polígonos se toman de la vista previa (K1), por el
-- nombre de su Placemark; no se suponen.
--
-- El BOM inicial de taller4.kml se quita al cargarlo, igual que lo hace
-- el backend antes de enviar cualquier KML a la base.

BEGIN;

CREATE TEMP TABLE kml_real (nombre text PRIMARY KEY, contenido text NOT NULL) ON COMMIT DROP;
-- INSERT INTO kml_real VALUES ('levantamiento', $kml$…$kml$), ('taller4', $kml$…$kml$);

-- Índices de los polígonos según la vista previa, por nombre.
CREATE TEMP TABLE kml_indices (nombre text PRIMARY KEY, indice integer NOT NULL) ON COMMIT DROP;

-- K1 — vista previa: 4 válidas, 0 inválidas, 27 excluidas (los puntos).
DO $$
DECLARE v jsonb; v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  v := fn_extraer_superficies_kml(v_kml);

  IF (v->>'validas')::int <> 4 OR (v->>'invalidas')::int <> 0 OR (v->>'excluidas')::int <> 27 THEN
    RAISE EXCEPTION 'K1 FALLA: conteos % (se esperaban 4 válidas, 0 inválidas, 27 excluidas)', v - 'superficies';
  END IF;

  -- Cada polígono se identifica por el `nombre` de su Placemark
  -- (CC-047), no por su posición.
  INSERT INTO kml_indices (nombre, indice)
  SELECT CASE
           WHEN s->>'nombre' = 'Plaza Victoria' THEN 'plaza_victoria'
           WHEN s->>'nombre' = 'Parque Italia' THEN 'parque_italia'
           WHEN s->>'nombre' = 'Plaza O´Higgins' THEN 'plaza_ohiggins'
           WHEN s->>'nombre' = 'Área de estudio' THEN 'area_estudio'
         END,
         (s->>'indice')::int
  FROM jsonb_array_elements(v->'superficies') AS s
  WHERE s->>'estado' = 'valida';

  -- El nombre no ASCII llega sin alterar: acento agudo (´, U+00B4), no
  -- apóstrofo.
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v->'superficies') AS s
                 WHERE s->>'nombre' = 'Plaza O' || chr(180) || 'Higgins') THEN
    RAISE EXCEPTION 'K1 FALLA: no aparece «Plaza O´Higgins» (U+00B4) sin alterar: %',
      (SELECT jsonb_agg(s->'nombre') FROM jsonb_array_elements(v->'superficies') s WHERE s->>'estado' = 'valida');
  END IF;

  IF (SELECT count(*) FROM kml_indices WHERE nombre IS NOT NULL) <> 4 THEN
    RAISE EXCEPTION 'K1 FALLA: no se reconocieron los 4 nombres: %',
      (SELECT jsonb_agg(s->'nombre') FROM jsonb_array_elements(v->'superficies') s WHERE s->>'estado' = 'valida');
  END IF;

  RAISE NOTICE 'K1 OK: 4 válidas / 0 inválidas / 27 excluidas; índices %',
    (SELECT jsonb_object_agg(nombre, indice) FROM kml_indices);
END $$;

-- Áreas de cada polígono identificado en K1 (para el informe).
DO $$
DECLARE v jsonb; v_kml text; r record;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  v := fn_extraer_superficies_kml(v_kml);
  FOR r IN
    SELECT i.nombre, i.indice,
           ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(v->'superficies'->i.indice->'geometria'), 4326)::geography) AS area
    FROM kml_indices i ORDER BY i.indice
  LOOP
    RAISE NOTICE 'K1 área: % (índice %) = % m²', r.nombre, r.indice, round(r.area::numeric);
  END LOOP;
END $$;

-- K2 — guardar sin selección → 422 «varias superficies».
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  PERFORM fn_build_sector_geometria('kml', NULL, v_kml, NULL);
  RAISE EXCEPTION 'K2 FALLA: se aceptó sin selección';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'El archivo contiene varias superficies%' THEN
    RAISE EXCEPTION 'K2 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'K2 OK: %', SQLERRM;
END $$;

-- K3 — solo Plaza Victoria: se guarda en 2D y superficie_sector_m2 ~5.800.
DO $$
DECLARE v_kml text; v_res jsonb; r record;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  v_res := fn_create_project_with_sector('K3 prueba', 'Plaza Victoria', 'kml', NULL, v_kml,
    ARRAY[(SELECT indice FROM kml_indices WHERE nombre = 'plaza_victoria')], NULL);

  SELECT ST_NDims(geometria_sector::geometry) AS dims,
         ST_NumGeometries(geometria_sector::geometry) AS partes,
         superficie_sector_m2 AS area
  INTO r FROM sectors WHERE id = (v_res->>'sector_id')::uuid;

  IF r.dims <> 2 THEN RAISE EXCEPTION 'K3 FALLA: dimensiones = %', r.dims; END IF;
  IF r.area NOT BETWEEN 5600 AND 6000 THEN RAISE EXCEPTION 'K3 FALLA: área = %', r.area; END IF;
  IF (v_res->>'superficies_excluidas')::int <> 27 THEN
    RAISE EXCEPTION 'K3 FALLA: excluidas = %', v_res->>'superficies_excluidas';
  END IF;
  RAISE NOTICE 'K3 OK: 2D, % parte(s), superficie_sector_m2 = %, excluidas informadas = %',
    r.partes, round(r.area), v_res->>'superficies_excluidas';
END $$;

-- K4 — las tres plazas: MultiPolygon de 3 partes, área ≈ suma.
DO $$
DECLARE v_kml text; v_res jsonb; r record; v_suma numeric;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  v_res := fn_create_project_with_sector('K4 prueba', 'Tres plazas', 'kml', NULL, v_kml,
    ARRAY(SELECT indice FROM kml_indices WHERE nombre IN ('plaza_victoria', 'parque_italia', 'plaza_ohiggins')), NULL);

  SELECT ST_NumGeometries(geometria_sector::geometry) AS partes, superficie_sector_m2 AS area
  INTO r FROM sectors WHERE id = (v_res->>'sector_id')::uuid;

  SELECT sum(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(fn_extraer_superficies_kml(v_kml)->'superficies'->i.indice->'geometria'), 4326)::geography))
  INTO v_suma FROM kml_indices i WHERE i.nombre IN ('plaza_victoria', 'parque_italia', 'plaza_ohiggins');

  IF r.partes <> 3 THEN RAISE EXCEPTION 'K4 FALLA: partes = %', r.partes; END IF;
  IF abs(r.area - v_suma) > 1 THEN RAISE EXCEPTION 'K4 FALLA: área % vs suma %', r.area, v_suma; END IF;
  RAISE NOTICE 'K4 OK: 3 partes, área % m² (suma de las tres: % m²)', round(r.area), round(v_suma);
END $$;

-- K5 — Plaza Victoria + Área de estudio: área < suma (solape una vez).
DO $$
DECLARE v_kml text; v_res jsonb; r record; v_suma numeric;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  v_res := fn_create_project_with_sector('K5 prueba', 'Victoria + estudio', 'kml', NULL, v_kml,
    ARRAY(SELECT indice FROM kml_indices WHERE nombre IN ('plaza_victoria', 'area_estudio')), NULL);

  SELECT ST_NumGeometries(geometria_sector::geometry) AS partes, superficie_sector_m2 AS area
  INTO r FROM sectors WHERE id = (v_res->>'sector_id')::uuid;

  SELECT sum(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(fn_extraer_superficies_kml(v_kml)->'superficies'->i.indice->'geometria'), 4326)::geography))
  INTO v_suma FROM kml_indices i WHERE i.nombre IN ('plaza_victoria', 'area_estudio');

  -- Plaza Victoria y Área de estudio NO se superponen en el KML real
  -- (confirmado el 2026-10-23: análisis geométrico independiente, fuera
  -- de PostGIS, mostró que no se tocan) → 2 partes disjuntas, área ≈ suma.
  IF r.partes <> 2 THEN RAISE EXCEPTION 'K5 FALLA: partes = % (se esperaban 2, disjuntas)', r.partes; END IF;
  IF abs(r.area - v_suma) > 1 THEN RAISE EXCEPTION 'K5 FALLA: área % vs suma % (debían ser iguales, sin solape)', r.area, v_suma; END IF;
  RAISE NOTICE 'K5 OK: % partes disjuntas, área % m² ≈ suma % m²', r.partes, round(r.area), round(v_suma);
END $$;

-- K6 — una plaza + un punto → 422.
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'levantamiento';
  PERFORM fn_build_sector_geometria('kml', NULL, v_kml,
    ARRAY[(SELECT indice FROM kml_indices WHERE nombre = 'plaza_victoria'), 0]);
  RAISE EXCEPTION 'K6 FALLA: se aceptó un punto';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'La superficie 0 (A-001) es un punto o una línea%' THEN
    RAISE EXCEPTION 'K6 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'K6 OK: %', SQLERRM;
END $$;

-- K7 — taller4.kml (solo puntos y líneas) → 422.
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'taller4';
  PERFORM fn_build_sector_geometria('kml', NULL, v_kml, NULL);
  RAISE EXCEPTION 'K7 FALLA: se aceptó un archivo sin superficies';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE '%solo puntos o líneas%' THEN
    RAISE EXCEPTION 'K7 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'K7 OK: %', SQLERRM;
END $$;

ROLLBACK;
