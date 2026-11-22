-- =====================================================================
-- Migración 049 — Código público del árbol por lugar (CC-086)
-- =====================================================================
--
-- Decisiones de la responsable (Mari, 2026-11-22) sobre la propuesta
-- `docs/plan/propuestas/codigos-publicos/`:
-- - D1: la fila de árboles de la vereda perimetral es parte de la plaza.
-- - D2: A-000506 y A-000507 van a Plaza Victoria.
-- - D3: en calles, impares en la vereda norte y pares en la sur, de
--   poniente a oriente.
-- - D4: lista de prefijos aprobada (P-NOMBRE para plazas y parques,
--   sigla de la calle para calles).
-- - El código se obtiene de las coordenadas, con los polígonos que ya
--   tiene la plataforma, y de aquí en adelante se asigna solo.
--
-- CC-086, aprobado el 2026-11-22. Falta la fila del campo en el
-- DICCIONARIO_CAMPOS del Excel. Visible solo en la plataforma: la ficha
-- pública y la placa impresa no lo muestran. No reemplaza a `tree_code` (D-2), que
-- sigue siendo la llave del árbol; el QR no cambia.
--
-- Contenido:
-- 1. `public_code_places`: un lugar con prefijo, tipo (plaza o calle),
--    polígono y, en calles, el eje que decide la vereda y el orden.
-- 2. `trees.codigo_publico`: texto único, NULL si el árbol no cae en
--    ningún lugar con prefijo (queda solo con su `tree_code`).
-- 3. `fn_asignar_codigo_publico` + trigger: al registrar o completar
--    la coordenada de un árbol sin código, busca el lugar que lo cubre
--    y le da el número siguiente. Un código emitido no se cambia ni se
--    reutiliza, aunque el árbol se mueva.
-- 4. Lugares iniciales (sector «Plazas y eje Pedro Montt») y códigos de
--    los árboles existentes.

-- ---------------------------------------------------------------------
-- 1. Lugares con prefijo
-- ---------------------------------------------------------------------
CREATE TABLE public.public_code_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefijo text NOT NULL UNIQUE CHECK (prefijo ~ '^[A-Z]+(-[A-Z]+)?$'),
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('plaza', 'calle')),
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  -- Polígono del lugar en UTM 19S (mismo sistema que utm_este/utm_norte).
  geometria geometry(MultiPolygon, 32719) NOT NULL,
  -- Solo calles: eje orientado de poniente a oriente (o de sur a norte).
  eje geometry(LineString, 32719),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (tipo = 'plaza' OR eje IS NOT NULL)
);

CREATE INDEX public_code_places_geometria_idx ON public.public_code_places USING gist (geometria);

ALTER TABLE public.public_code_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_code_places_select ON public.public_code_places
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.public_code_places IS
  'Lugares (plazas y calles) que dan el prefijo del código público del árbol. CC-086 (2026-11-22).';

-- ---------------------------------------------------------------------
-- 2. Columna del código público
-- ---------------------------------------------------------------------
ALTER TABLE public.trees ADD COLUMN codigo_publico text UNIQUE;

COMMENT ON COLUMN public.trees.codigo_publico IS
  'Código público legible por lugar (P-VIC-001, PM-001). Se asigna desde las coordenadas; no reemplaza tree_code (D-2). CC-086 (2026-11-22).';

-- ---------------------------------------------------------------------
-- 3. Asignación
-- ---------------------------------------------------------------------

-- Vereda de un punto respecto del eje: 'norte' a la izquierda del eje
-- (que va de poniente a oriente), 'sur' a la derecha. NULL sin eje.
CREATE FUNCTION public.fn_vereda_respecto_eje(p_eje geometry, p_punto geometry)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  WITH f AS (SELECT ST_LineLocatePoint(p_eje, p_punto) AS t),
  ab AS (
    SELECT ST_LineInterpolatePoint(p_eje, greatest(t - 0.001, 0)) AS a,
           ST_LineInterpolatePoint(p_eje, least(t + 0.001, 1)) AS b
    FROM f
  )
  SELECT CASE WHEN p_eje IS NULL THEN NULL
              WHEN (ST_X(b) - ST_X(a)) * (ST_Y(p_punto) - ST_Y(a))
                 - (ST_Y(b) - ST_Y(a)) * (ST_X(p_punto) - ST_X(a)) >= 0 THEN 'norte'
              ELSE 'sur' END
  FROM ab;
$$;

-- Número mayor ya emitido con ese prefijo (y esa paridad, si se pide).
CREATE FUNCTION public.fn_max_numero_codigo(p_prefijo text, p_paridad int)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT max(substring(codigo_publico FROM length(p_prefijo) + 2)::int)
  FROM public.trees
  WHERE codigo_publico LIKE p_prefijo || '-%'
    AND substring(codigo_publico FROM length(p_prefijo) + 2) ~ '^[0-9]+$'
    AND (p_paridad IS NULL OR substring(codigo_publico FROM length(p_prefijo) + 2)::int % 2 = p_paridad);
$$;

CREATE FUNCTION public.fn_asignar_codigo_publico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_punto geometry;
  v_lugar public.public_code_places%ROWTYPE;
  v_vereda text;
  v_numero int;
BEGIN
  -- Un código emitido no cambia; sin coordenadas no hay lugar.
  IF NEW.codigo_publico IS NOT NULL OR NEW.utm_este IS NULL OR NEW.utm_norte IS NULL THEN
    RETURN NEW;
  END IF;

  v_punto := ST_SetSRID(ST_MakePoint(NEW.utm_este, NEW.utm_norte), 32719);

  -- Solo lugares del sector del árbol (otro proyecto puede ocupar el
  -- mismo espacio físico, p. ej. los árboles de QA en la base de
  -- pruebas). Una plaza gana sobre una calle si los polígonos se tocan.
  SELECT * INTO v_lugar
  FROM public.public_code_places
  WHERE ST_Covers(geometria, v_punto)
    AND (sector_id IS NULL OR sector_id = NEW.sector_id)
  ORDER BY (tipo = 'plaza') DESC, prefijo
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW; -- fuera de todo lugar con prefijo: queda solo con tree_code
  END IF;

  -- Dos altas simultáneas en el mismo lugar no pueden tomar el mismo número.
  PERFORM pg_advisory_xact_lock(hashtext('codigo_publico:' || v_lugar.prefijo));

  IF v_lugar.tipo = 'plaza' THEN
    v_numero := coalesce(public.fn_max_numero_codigo(v_lugar.prefijo, NULL), 0) + 1;
  ELSE
    v_vereda := public.fn_vereda_respecto_eje(v_lugar.eje, v_punto);
    IF v_vereda = 'norte' THEN
      v_numero := coalesce(public.fn_max_numero_codigo(v_lugar.prefijo, 1), -1) + 2;
    ELSE
      v_numero := coalesce(public.fn_max_numero_codigo(v_lugar.prefijo, 0), 0) + 2;
    END IF;
  END IF;

  NEW.codigo_publico := v_lugar.prefijo || '-' || lpad(v_numero::text, 3, '0');
  RETURN NEW;
END;
$$;

-- Nombre con «c» para que corra antes de trg_trees_dentro_sector (los
-- BEFORE se ejecutan por orden alfabético); si ese rechaza, todo se revierte.
CREATE TRIGGER trg_trees_codigo_publico
  BEFORE INSERT OR UPDATE OF utm_este, utm_norte, sector_id ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.fn_asignar_codigo_publico();

-- ---------------------------------------------------------------------
-- 4. Lugares iniciales y códigos de los árboles existentes
-- ---------------------------------------------------------------------
-- Las partes del polígono del sector se identifican por un árbol
-- conocido dentro de cada una (no por su posición en el MultiPolygon).
-- Si el sector o esos árboles no existen en esta base, no se carga nada.
DO $$
DECLARE
  v_sector uuid;
  v_plaza geometry;
  v_calle geometry;
  v_eje geometry;
BEGIN
  SELECT id INTO v_sector FROM public.sectors WHERE nombre_sector = 'Plazas y eje Pedro Montt' LIMIT 1;
  IF v_sector IS NULL THEN
    RAISE NOTICE '049: sector «Plazas y eje Pedro Montt» no existe; no se cargan lugares.';
    RETURN;
  END IF;

  SELECT ST_Multi(ST_Transform(g.geom, 32719)) INTO v_plaza
  FROM public.sectors s, ST_Dump(s.geometria_sector::geometry) g, public.trees t
  WHERE s.id = v_sector AND t.tree_code = 'A-000529' AND ST_Covers(g.geom, t.ubicacion::geometry);

  SELECT ST_Multi(ST_Transform(g.geom, 32719)) INTO v_calle
  FROM public.sectors s, ST_Dump(s.geometria_sector::geometry) g, public.trees t
  WHERE s.id = v_sector AND t.tree_code = 'A-000417' AND ST_Covers(g.geom, t.ubicacion::geometry);

  -- Eje de Av. Pedro Montt, de poniente a oriente (© OpenStreetMap, ODbL).
  v_eje := ST_Transform(ST_GeomFromText('LINESTRING(-71.6193773 -33.0465296, -71.6192439 -33.0465507, -71.6191794 -33.0465593, -71.6183770 -33.0466797, -71.6183313 -33.0466866, -71.6182627 -33.0466969, -71.6181443 -33.0467145, -71.6171968 -33.0468554, -71.6171607 -33.0468607, -71.6170574 -33.0468761, -71.6169599 -33.0468865, -71.6169375 -33.0468893, -71.6162337 -33.0469669, -71.6161915 -33.0469716, -71.6161202 -33.0469790, -71.6160193 -33.0469875, -71.6159817 -33.0469907, -71.6148610 -33.0470855, -71.6148239 -33.0470886)', 4326), 32719);

  IF v_plaza IS NOT NULL THEN
    INSERT INTO public.public_code_places (prefijo, nombre, tipo, sector_id, geometria)
    VALUES ('P-VIC', 'Plaza Victoria', 'plaza', v_sector, v_plaza);
  END IF;
  IF v_calle IS NOT NULL THEN
    INSERT INTO public.public_code_places (prefijo, nombre, tipo, sector_id, geometria, eje)
    VALUES ('PM', 'Avenida Pedro Montt', 'calle', v_sector, v_calle, v_eje);
  END IF;
END;
$$;

-- Árboles existentes. Plazas: filas de 10 m de norte a sur, alternando
-- poniente→oriente y oriente→poniente (regla de la propuesta). Calles:
-- posición a lo largo del eje, impares al norte y pares al sur. El
-- código interno desempata.
WITH punto AS (
  SELECT t.id, t.tree_code, ST_SetSRID(ST_MakePoint(t.utm_este, t.utm_norte), 32719) AS p, l.*
  FROM public.trees t
  CROSS JOIN LATERAL (
    SELECT pl.prefijo, pl.tipo, pl.eje, pl.geometria
    FROM public.public_code_places pl
    WHERE ST_Covers(pl.geometria, ST_SetSRID(ST_MakePoint(t.utm_este, t.utm_norte), 32719))
      AND (pl.sector_id IS NULL OR pl.sector_id = t.sector_id)
    ORDER BY (pl.tipo = 'plaza') DESC, pl.prefijo
    LIMIT 1
  ) l
  WHERE t.codigo_publico IS NULL AND t.utm_este IS NOT NULL AND t.utm_norte IS NOT NULL
),
plazas AS (
  SELECT id, prefijo,
         row_number() OVER (
           PARTITION BY prefijo
           ORDER BY fila,
                    CASE WHEN fila % 2 = 0 THEN ST_X(p) ELSE -ST_X(p) END,
                    tree_code
         ) AS n
  FROM (
    SELECT id, tree_code, prefijo, p,
           floor((ST_YMax(geometria) - ST_Y(p)) / 10)::int AS fila
    FROM punto WHERE tipo = 'plaza'
  ) x
),
calles AS (
  SELECT id, prefijo,
         row_number() OVER (PARTITION BY prefijo, vereda ORDER BY ST_LineLocatePoint(eje, p), tree_code) * 2
           - CASE WHEN vereda = 'norte' THEN 1 ELSE 0 END AS n
  FROM (
    SELECT id, tree_code, prefijo, p, eje, public.fn_vereda_respecto_eje(eje, p) AS vereda
    FROM punto WHERE tipo = 'calle'
  ) x
),
todos AS (
  SELECT * FROM plazas UNION ALL SELECT * FROM calles
)
UPDATE public.trees t
SET codigo_publico = todos.prefijo || '-' || lpad(todos.n::text, 3, '0')
FROM todos
WHERE t.id = todos.id;
