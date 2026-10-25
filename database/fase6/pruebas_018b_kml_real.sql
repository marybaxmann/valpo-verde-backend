-- =====================================================================
-- Pruebas de la migración 018b con KML reales (D-255; CC-047)
-- =====================================================================
--
-- Solo en `valpo-verde-conecta-pruebas`, con la 018b aplicada. Todo
-- corre dentro de BEGIN … ROLLBACK: los proyectos y sectores que crea
-- K3–K5 (para comprobar `superficie_sector_m2`, columna generada) no
-- quedan en la base.
--
-- Corrección de la responsable (2026-10-24): la versión anterior de
-- este script exigía que quien lo ejecutara pegara el contenido de dos
-- archivos fuera del repositorio ("Levantamiento 10 de Agosto (2).kml",
-- "taller4.kml") en una tabla temporal antes de correrlo. Se corrió una
-- vez con esos archivos reales (K1–K7, 7/7 OK: K1 4 válidas/0
-- inválidas/27 excluidas, K3 área 5782 m², K4 área 30422 m² = suma de
-- las tres, K5 2 partes disjuntas área 73031 m² = suma, K6/K7
-- rechazados con el mensaje esperado). A partir de esta versión, el
-- script es autocontenido:
--   - K1–K6 usan `database/fase6/fixtures/sectores_piloto.kml` (los
--     mismos 4 polígonos y nombres del KML real de la responsable —
--     Plaza Victoria, Parque Italia, Plaza O´Higgins, Área de
--     estudio — más 3 puntos de prueba, en vez de los 27 puntos
--     reales del levantamiento). El contenido de abajo es una copia
--     textual de ese fixture; si el fixture cambia, actualizar aquí
--     también.
--   - K7 usa `database/fase6/fixtures/solo_puntos_lineas.kml` (fixture
--     mínimo inventado: 2 puntos + 2 líneas, ninguna superficie), en
--     vez de "taller4.kml" (salida real de Radio Mobile, fuera del
--     repositorio — 453 KB, casi todo coordenadas densas de un perfil
--     de elevación que esta prueba no necesita).
--
-- K1 a K7 son los casos originales; K1 cambia sus conteos esperados al
-- fixture (4 válidas, 0 inválidas, **3** excluidas — antes 27, con el
-- KML real). K6 identifica el punto a seleccionar por su `nombre`
-- (`kml_indices`), no por una posición fija: el orden de los
-- Placemark en el fixture no es el mismo que en el KML real (ahí los
-- puntos venían primero; aquí los polígonos van primero).
--
-- Los índices de los polígonos se toman de la vista previa (K1), por
-- el nombre de su Placemark; no se suponen.

BEGIN;

CREATE TEMP TABLE kml_real (nombre text PRIMARY KEY, contenido text NOT NULL) ON COMMIT DROP;

-- Copia textual de database/fase6/fixtures/sectores_piloto.kml.
INSERT INTO kml_real VALUES ('sectores_piloto', $kml$<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
	<name>SIVU - sectores piloto (fixture de pruebas)</name>
	<description>Fixture de pruebas de la 018b (D-255; CC-047) y del CC-046. Los 4 poligonos provienen de un levantamiento en Google Earth (coordenadas y altitud tal cual). Los 3 puntos son inventados: no corresponden a ningun arbol real.</description>
	<Placemark>
		<name>Plaza Victoria</name>
		<Polygon>
			<outerBoundaryIs>
				<LinearRing>
					<coordinates>
						-71.62005364370856,-33.04591539168755,0 -71.62015253411181,-33.04602572143386,0 -71.62028153786105,-33.04639266853273,0 -71.62026741646719,-33.04649095995709,0 -71.62017788928546,-33.04657608416072,0 -71.61975738814806,-33.04669454449954,0 -71.61963667545268,-33.04669075360331,0 -71.61955534102806,-33.04664640262119,0 -71.61933506315519,-33.04614972813612,0 -71.61936654125,-33.04604924907557,0 -71.61948704728401,-33.04598533471226,0 -71.61989797376903,-33.04589036306548,0 -71.62005364370856,-33.04591539168755,0
					</coordinates>
				</LinearRing>
			</outerBoundaryIs>
		</Polygon>
	</Placemark>
	<Placemark>
		<name>Parque Italia</name>
		<Polygon>
			<outerBoundaryIs>
				<LinearRing>
					<coordinates>
						-71.61474110317711,-33.0472333667342,0 -71.61489799156381,-33.04818055843996,0 -71.61370261971497,-33.04848691667605,0 -71.61351450864498,-33.04757356643001,0 -71.61474110317711,-33.0472333667342,0
					</coordinates>
				</LinearRing>
			</outerBoundaryIs>
		</Polygon>
	</Placemark>
	<Placemark>
		<name>Plaza O´Higgins</name>
		<Polygon>
			<outerBoundaryIs>
				<LinearRing>
					<coordinates>
						-71.60818075212187,-33.04848436893487,0 -71.60673773234871,-33.0485559663211,0 -71.60691349082524,-33.04758414808937,0 -71.60810061938986,-33.04763610696615,0 -71.60818075212187,-33.04848436893487,0
					</coordinates>
				</LinearRing>
			</outerBoundaryIs>
		</Polygon>
	</Placemark>
	<Placemark>
		<name>Área de estudio</name>
		<Polygon>
			<outerBoundaryIs>
				<LinearRing>
					<coordinates>
						-71.61695208342172,-33.04557650224498,0 -71.61886894933303,-33.04531127818015,0 -71.61975134621365,-33.04776638068576,0 -71.61968579791345,-33.04795136110886,0 -71.61953506290378,-33.04806283076223,0 -71.61772183796776,-33.04864995537858,0 -71.61746504997906,-33.04829622954782,0 -71.61727404330313,-33.04762994312249,0 -71.61695208342172,-33.04557650224498,0
					</coordinates>
				</LinearRing>
			</outerBoundaryIs>
		</Polygon>
	</Placemark>
	<Placemark>
		<name>Punto de prueba dentro de Plaza Victoria</name>
		<Point>
			<coordinates>-71.619831,-33.046292,0</coordinates>
		</Point>
	</Placemark>
	<Placemark>
		<name>Punto de prueba dentro de Parque Italia</name>
		<Point>
			<coordinates>-71.614214,-33.047869,0</coordinates>
		</Point>
	</Placemark>
	<Placemark>
		<name>Punto de prueba fuera de todas las superficies</name>
		<Point>
			<coordinates>-71.624282,-33.046292,0</coordinates>
		</Point>
	</Placemark>
</Document>
</kml>
$kml$);

-- Copia textual de database/fase6/fixtures/solo_puntos_lineas.kml.
INSERT INTO kml_real VALUES ('solo_puntos_lineas', $kml$<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
	<name>SIVU - solo puntos y lineas (fixture de pruebas)</name>
	<description>Fixture minimo inventado para la 018b (K7): un archivo sin ninguna superficie, solo puntos y lineas. Reemplaza a taller4.kml (salida real de Radio Mobile, fuera del repositorio) para que la prueba no dependa de un archivo externo. Coordenadas inventadas, no corresponden a ningun punto real.</description>
	<Placemark>
		<name>Punto 1</name>
		<Point>
			<coordinates>-71.620000,-33.050000,0</coordinates>
		</Point>
	</Placemark>
	<Placemark>
		<name>Punto 2</name>
		<Point>
			<coordinates>-71.610000,-33.040000,0</coordinates>
		</Point>
	</Placemark>
	<Placemark>
		<name>Linea 1</name>
		<LineString>
			<coordinates>-71.620000,-33.050000,0 -71.610000,-33.040000,0</coordinates>
		</LineString>
	</Placemark>
	<Placemark>
		<name>Linea 2</name>
		<LineString>
			<coordinates>-71.615000,-33.045000,0 -71.605000,-33.035000,0</coordinates>
		</LineString>
	</Placemark>
</Document>
</kml>
$kml$);

-- Índices de los polígonos y de un punto, según la vista previa, por nombre.
CREATE TEMP TABLE kml_indices (nombre text PRIMARY KEY, indice integer NOT NULL) ON COMMIT DROP;

-- K1 — vista previa: 4 válidas, 0 inválidas, 3 excluidas (los puntos del fixture).
DO $$
DECLARE v jsonb; v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
  v := fn_extraer_superficies_kml(v_kml);

  IF (v->>'validas')::int <> 4 OR (v->>'invalidas')::int <> 0 OR (v->>'excluidas')::int <> 3 THEN
    RAISE EXCEPTION 'K1 FALLA: conteos % (se esperaban 4 válidas, 0 inválidas, 3 excluidas)', v - 'superficies';
  END IF;

  -- Cada superficie/punto se identifica por el `nombre` de su Placemark
  -- (CC-047), no por su posición.
  INSERT INTO kml_indices (nombre, indice)
  SELECT CASE
           WHEN s->>'nombre' = 'Plaza Victoria' THEN 'plaza_victoria'
           WHEN s->>'nombre' = 'Parque Italia' THEN 'parque_italia'
           WHEN s->>'nombre' = 'Plaza O´Higgins' THEN 'plaza_ohiggins'
           WHEN s->>'nombre' = 'Área de estudio' THEN 'area_estudio'
           WHEN s->>'nombre' = 'Punto de prueba dentro de Plaza Victoria' THEN 'punto_dentro_victoria'
         END,
         (s->>'indice')::int
  FROM jsonb_array_elements(v->'superficies') AS s
  WHERE s->>'nombre' IN (
    'Plaza Victoria', 'Parque Italia', 'Plaza O´Higgins', 'Área de estudio',
    'Punto de prueba dentro de Plaza Victoria'
  );

  -- El nombre no ASCII llega sin alterar: acento agudo (´, U+00B4), no apóstrofo.
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v->'superficies') AS s
                 WHERE s->>'nombre' = 'Plaza O' || chr(180) || 'Higgins') THEN
    RAISE EXCEPTION 'K1 FALLA: no aparece «Plaza O´Higgins» (U+00B4) sin alterar';
  END IF;

  IF (SELECT count(*) FROM kml_indices WHERE nombre IN ('plaza_victoria','parque_italia','plaza_ohiggins','area_estudio')) <> 4 THEN
    RAISE EXCEPTION 'K1 FALLA: no se reconocieron los 4 polígonos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM kml_indices WHERE nombre = 'punto_dentro_victoria') THEN
    RAISE EXCEPTION 'K1 FALLA: no se reconoció el punto de prueba';
  END IF;

  RAISE NOTICE 'K1 OK: 4 válidas / 0 inválidas / 3 excluidas; índices %',
    (SELECT jsonb_object_agg(nombre, indice) FROM kml_indices);
END $$;

-- K2 — guardar sin selección → 422 «varias superficies».
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
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
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
  v_res := fn_create_project_with_sector('K3 prueba', 'Plaza Victoria', 'kml', NULL, v_kml,
    ARRAY[(SELECT indice FROM kml_indices WHERE nombre = 'plaza_victoria')], NULL);

  SELECT ST_NDims(geometria_sector::geometry) AS dims,
         ST_NumGeometries(geometria_sector::geometry) AS partes,
         superficie_sector_m2 AS area
  INTO r FROM sectors WHERE id = (v_res->>'sector_id')::uuid;

  IF r.dims <> 2 THEN RAISE EXCEPTION 'K3 FALLA: dimensiones = %', r.dims; END IF;
  IF r.area NOT BETWEEN 5600 AND 6000 THEN RAISE EXCEPTION 'K3 FALLA: área = %', r.area; END IF;
  IF (v_res->>'superficies_excluidas')::int <> 3 THEN
    RAISE EXCEPTION 'K3 FALLA: excluidas = %', v_res->>'superficies_excluidas';
  END IF;
  RAISE NOTICE 'K3 OK: 2D, % parte(s), superficie_sector_m2 = %, excluidas informadas = %',
    r.partes, round(r.area), v_res->>'superficies_excluidas';
END $$;

-- K4 — las tres plazas: MultiPolygon de 3 partes, área ≈ suma.
DO $$
DECLARE v_kml text; v_res jsonb; r record; v_suma numeric;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
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
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
  v_res := fn_create_project_with_sector('K5 prueba', 'Victoria + estudio', 'kml', NULL, v_kml,
    ARRAY(SELECT indice FROM kml_indices WHERE nombre IN ('plaza_victoria', 'area_estudio')), NULL);

  SELECT ST_NumGeometries(geometria_sector::geometry) AS partes, superficie_sector_m2 AS area
  INTO r FROM sectors WHERE id = (v_res->>'sector_id')::uuid;

  SELECT sum(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(fn_extraer_superficies_kml(v_kml)->'superficies'->i.indice->'geometria'), 4326)::geography))
  INTO v_suma FROM kml_indices i WHERE i.nombre IN ('plaza_victoria', 'area_estudio');

  -- Plaza Victoria y Área de estudio NO se superponen (confirmado el
  -- 2026-10-23: análisis geométrico independiente, fuera de PostGIS,
  -- mostró que no se tocan) → 2 partes disjuntas, área ≈ suma.
  IF r.partes <> 2 THEN RAISE EXCEPTION 'K5 FALLA: partes = % (se esperaban 2, disjuntas)', r.partes; END IF;
  IF abs(r.area - v_suma) > 1 THEN RAISE EXCEPTION 'K5 FALLA: área % vs suma % (debían ser iguales, sin solape)', r.area, v_suma; END IF;
  RAISE NOTICE 'K5 OK: % partes disjuntas, área % m² ≈ suma % m²', r.partes, round(r.area), round(v_suma);
END $$;

-- K6 — una plaza + un punto → 422.
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'sectores_piloto';
  PERFORM fn_build_sector_geometria('kml', NULL, v_kml,
    ARRAY[(SELECT indice FROM kml_indices WHERE nombre = 'plaza_victoria'),
          (SELECT indice FROM kml_indices WHERE nombre = 'punto_dentro_victoria')]);
  RAISE EXCEPTION 'K6 FALLA: se aceptó un punto';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE 'La superficie % (Punto de prueba dentro de Plaza Victoria) es un punto o una línea%' THEN
    RAISE EXCEPTION 'K6 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'K6 OK: %', SQLERRM;
END $$;

-- K7 — fixture solo_puntos_lineas.kml (solo puntos y líneas) → 422.
DO $$
DECLARE v_kml text;
BEGIN
  SELECT contenido INTO v_kml FROM kml_real WHERE nombre = 'solo_puntos_lineas';
  PERFORM fn_build_sector_geometria('kml', NULL, v_kml, NULL);
  RAISE EXCEPTION 'K7 FALLA: se aceptó un archivo sin superficies';
EXCEPTION WHEN SQLSTATE 'SV265' THEN
  IF SQLERRM NOT LIKE '%solo puntos o líneas%' THEN
    RAISE EXCEPTION 'K7 FALLA: mensaje inesperado: %', SQLERRM;
  END IF;
  RAISE NOTICE 'K7 OK: %', SQLERRM;
END $$;

ROLLBACK;
