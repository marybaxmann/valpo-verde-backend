-- =====================================================================
-- Pruebas de la migración 018b — geometría del sector (D-265; CC-047)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, DESPUÉS de aplicar la 018b
-- (con autorización de la responsable). No escribe en ninguna tabla:
-- invoca solo `fn_extraer_superficies_kml` y `fn_build_sector_geometria`,
-- y todo corre dentro de BEGIN … ROLLBACK. Cada caso emite
-- `NOTICE 'Pn OK: …'` (P1–P8, R1–R3); cualquier falla aborta con `Pn FALLA: …`.
--
-- Coordenadas genéricas en lon/lat (no corresponden a ningún sector
-- real). A y B: cuadrados disjuntos. X: "moño" autointersectado
-- (inválido según ST_IsValid).

BEGIN;

-- KML mínimo con una lista de Placemark, cada uno con su geometría.
CREATE FUNCTION pg_temp.kml(VARIADIC p_geometrias text[]) RETURNS text
LANGUAGE sql AS $$
  SELECT '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
      || string_agg('<Placemark>' || g || '</Placemark>', '')
      || '</Document></kml>'
  FROM unnest(p_geometrias) AS g;
$$;

CREATE FUNCTION pg_temp.poligono(p_coordenadas text) RETURNS text
LANGUAGE sql AS $$
  SELECT '<Polygon><outerBoundaryIs><LinearRing><coordinates>' || p_coordenadas
      || '</coordinates></LinearRing></outerBoundaryIs></Polygon>';
$$;

CREATE FUNCTION pg_temp.a() RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.poligono('-71.62,-33.05 -71.61,-33.05 -71.61,-33.04 -71.62,-33.04 -71.62,-33.05');
$$;
CREATE FUNCTION pg_temp.b() RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.poligono('-71.60,-33.05 -71.59,-33.05 -71.59,-33.04 -71.60,-33.04 -71.60,-33.05');
$$;
CREATE FUNCTION pg_temp.x() RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.poligono('-71.58,-33.05 -71.57,-33.04 -71.58,-33.04 -71.57,-33.05 -71.58,-33.05');
$$;

-- P1 — una superficie válida, sin selección → se acepta.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.a()), NULL);
  IF r.geografia IS NULL OR ST_Area(r.geografia) <= 0 THEN
    RAISE EXCEPTION 'P1 FALLA: sector vacío';
  END IF;
  RAISE NOTICE 'P1 OK: una superficie, sin selección, área % m²', round(ST_Area(r.geografia)::numeric);
END $$;

-- P2 — dos superficies válidas, sin selección → 422 (SV265).
DO $$
BEGIN
  PERFORM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.a(), pg_temp.b()), NULL);
  RAISE EXCEPTION 'P2 FALLA: se aceptó sin selección';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'El archivo contiene varias superficies%' THEN
    RAISE EXCEPTION 'P2 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'P2 OK: %', SQLERRM;
END $$;

-- P3 — dos superficies, se selecciona una → se acepta solo esa.
DO $$
DECLARE r record; v_area_b double precision;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.a(), pg_temp.b()), ARRAY[1]);
  v_area_b := ST_Area(ST_GeomFromKML(pg_temp.b())::geography);
  IF abs(ST_Area(r.geografia) - v_area_b) > 1 THEN
    RAISE EXCEPTION 'P3 FALLA: el área (%) no es la de la superficie 1 (%)', ST_Area(r.geografia), v_area_b;
  END IF;
  RAISE NOTICE 'P3 OK: se integró solo la superficie 1';
END $$;

-- P4 — un polígono inválido NO seleccionado junto a uno válido
-- seleccionado → se acepta.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.x(), pg_temp.a()), ARRAY[1]);
  IF r.geografia IS NULL THEN
    RAISE EXCEPTION 'P4 FALLA: sector vacío';
  END IF;
  RAISE NOTICE 'P4 OK: inválido no seleccionado, válido seleccionado';
END $$;

-- P5 — un polígono inválido seleccionado → 422, con índice y motivo.
DO $$
BEGIN
  PERFORM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.x(), pg_temp.a()), ARRAY[0]);
  RAISE EXCEPTION 'P5 FALLA: se aceptó una superficie inválida';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'La superficie 0 es inválida%' THEN
    RAISE EXCEPTION 'P5 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'P5 OK: %', SQLERRM;
END $$;

-- P6 — solo superficies inválidas → 422.
DO $$
BEGIN
  PERFORM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.x()), NULL);
  RAISE EXCEPTION 'P6 FALLA: se aceptó un archivo sin superficies válidas';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'El archivo no contiene ninguna superficie válida%' THEN
    RAISE EXCEPTION 'P6 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'P6 OK: %', SQLERRM;
END $$;

-- P7 — puntos y líneas se informan como excluidos (y no como
-- inválidos); no se pueden seleccionar.
DO $$
DECLARE v jsonb; r record;
BEGIN
  v := fn_extraer_superficies_kml(pg_temp.kml(
    pg_temp.a(),
    '<Point><coordinates>-71.615,-33.045,0</coordinates></Point>',
    '<LineString><coordinates>-71.62,-33.05 -71.61,-33.04</coordinates></LineString>'
  ));
  IF (v->>'validas')::int <> 1 OR (v->>'invalidas')::int <> 0 OR (v->>'excluidas')::int <> 2 THEN
    RAISE EXCEPTION 'P7 FALLA: conteos inesperados: %', v - 'superficies';
  END IF;
  IF v->'superficies'->1->>'estado' <> 'excluida' OR v->'superficies'->2->>'estado' <> 'excluida' THEN
    RAISE EXCEPTION 'P7 FALLA: punto/línea no marcados como excluidos';
  END IF;

  -- Una sola superficie poligonal → no hace falta seleccionar, y el
  -- guardado informa los 2 excluidos.
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(
    pg_temp.a(),
    '<Point><coordinates>-71.615,-33.045,0</coordinates></Point>',
    '<LineString><coordinates>-71.62,-33.05 -71.61,-33.04</coordinates></LineString>'
  ), NULL);
  IF r.excluidas <> 2 THEN
    RAISE EXCEPTION 'P7 FALLA: excluidas = % (se esperaban 2)', r.excluidas;
  END IF;

  BEGIN
    PERFORM fn_build_sector_geometria('kml', NULL, pg_temp.kml(
      pg_temp.a(), '<Point><coordinates>-71.615,-33.045,0</coordinates></Point>'
    ), ARRAY[1]);
    RAISE EXCEPTION 'P7 FALLA: se pudo seleccionar un punto';
  EXCEPTION WHEN SQLSTATE 'SV265' THEN
    NULL;
  END;
  RAISE NOTICE 'P7 OK: 2 excluidos informados; un punto no se puede seleccionar';
END $$;

-- P8 — una superficie válida y una inválida, sin selección → 422 que
-- nombra la inválida (índice y motivo) y la válida a seleccionar.
DO $$
BEGIN
  PERFORM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.x(), pg_temp.a()), NULL);
  RAISE EXCEPTION 'P8 FALLA: se aceptó sin selección';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'El archivo contiene superficies inválidas (superficie 0: %selecciona la superficie válida (superficie 1)%' THEN
    RAISE EXCEPTION 'P8 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'P8 OK: %', SQLERRM;
END $$;

-- Regresión de las correcciones anteriores de la 018b.

-- R1 — KML de Google Earth con altitud (Z) → se guarda 2D.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(pg_temp.poligono(
    '-71.62,-33.05,12 -71.61,-33.05,15 -71.61,-33.04,20 -71.62,-33.04,18 -71.62,-33.05,12'
  )), NULL);
  IF ST_NDims(r.geografia::geometry) <> 2 THEN
    RAISE EXCEPTION 'R1 FALLA: la geometría conserva Z';
  END IF;
  RAISE NOTICE 'R1 OK: Z descartada';
END $$;

-- R2 — dos superficies válidas que se superponen, ambas seleccionadas →
-- se unen sin duplicar área.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(
    pg_temp.a(),
    pg_temp.poligono('-71.615,-33.05 -71.605,-33.05 -71.605,-33.04 -71.615,-33.04 -71.615,-33.05')
  ), ARRAY[0, 1]);
  IF ST_NumGeometries(r.geografia::geometry) <> 1 THEN
    RAISE EXCEPTION 'R2 FALLA: se esperaba una sola superficie unida';
  END IF;
  RAISE NOTICE 'R2 OK: superpuestas unidas en una';
END $$;

-- R3 — un hueco interior se conserva.
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM fn_build_sector_geometria('kml', NULL, pg_temp.kml(
    '<Polygon><outerBoundaryIs><LinearRing><coordinates>-71.62,-33.05 -71.61,-33.05 -71.61,-33.04 -71.62,-33.04 -71.62,-33.05</coordinates></LinearRing></outerBoundaryIs>'
    || '<innerBoundaryIs><LinearRing><coordinates>-71.618,-33.048 -71.612,-33.048 -71.612,-33.042 -71.618,-33.042 -71.618,-33.048</coordinates></LinearRing></innerBoundaryIs></Polygon>'
  ), NULL);
  IF ST_NumInteriorRings(ST_GeometryN(r.geografia::geometry, 1)) <> 1 THEN
    RAISE EXCEPTION 'R3 FALLA: se perdió el hueco interior';
  END IF;
  RAISE NOTICE 'R3 OK: hueco interior conservado';
END $$;

ROLLBACK;
