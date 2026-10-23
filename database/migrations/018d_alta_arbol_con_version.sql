-- =====================================================================
-- Migración 018d — Alta del árbol con su versión en tree_data_versions (#57)
-- =====================================================================
--
-- Corrige un defecto de fondo encontrado por la responsable al revisar
-- el #57: el alta solo escribía `trees`, sin crear la fila de alta en
-- `tree_data_versions` (`inspection_id IS NULL`) que exige el diseño
-- (§3.6; comentario de la tabla en `schema.sql`: "una fila por alta…
-- y una por cada inspección"). `fn_refresh_tree_current` (migración
-- 014, §5.1) usa esa fila como respaldo para todo campo que ninguna
-- inspección válida haya registrado (`ELSE (SELECT a.<campo> FROM
-- alta a)`). Sin ella, completar la primera OT que no toque la
-- ubicación o el nombre deja `utm_este`, `utm_norte`, `nombre_comun`,
-- `especie_cientifica`, `sector` y `ubicacion_descriptiva` en `NULL` —
-- y con las coordenadas en `NULL`, `trg_trees_dentro_sector` (018c) ya
-- no valida nada (se diseñó para saltar la validación solo cuando no
-- hay coordenada que validar).
--
-- `fn_create_tree_alta`: mismo patrón que `fn_create_project_with_sector`
-- (018b) — `SECURITY DEFINER`, `search_path` fijo, `EXECUTE` solo para
-- `service_role`. Una sola invocación ya es una transacción atómica
-- (sin motor de reglas en medio; no entra en ADR-017). `sector_id` lo
-- sigue resolviendo el servidor (nunca el body, PR-006 v11.0);
-- `fecha_registro` la calcula el backend en hora de Chile
-- (`hoyEnChile()`) y la pasa como parámetro — la función no usa
-- `CURRENT_DATE` (sería UTC). `campos_registrados` lista exactamente
-- lo que el Usuario municipal ingresó: siempre `sector`,
-- `ubicacion_descriptiva`, `utm_este` y `utm_norte` (D-7 a D-10,
-- Obligatorio); `especie_cientifica`/`nombre_comun` solo si se
-- ingresaron (D-13/D-14, al menos uno).
--
-- `trg_tree_data_versions_dentro_sector` (018c) también valida esta
-- fila (misma ubicación, mismo sector que ya validó `trg_trees_dentro_sector`
-- al insertar en `trees`) — redundante en este caso pero no un
-- problema: ambas comparten la misma transacción y el mismo resultado.
--
-- Ajuste de la responsable (2026-10-23): `sector`, `ubicacion_descriptiva`,
-- `utm_este` y `utm_norte` son Obligatorio en el Excel (D-7 a D-10),
-- pero ninguno de los cuatro es `NOT NULL` en la columna física de
-- `trees` (son NULLABLE desde el modelo 001). El Zod del API ya los
-- exige, pero esta función es la única puerta de escritura real
-- (`service_role`) — sin este chequeo, cualquier otra forma de
-- invocarla podría crear un árbol sin coordenadas, y
-- `trg_trees_dentro_sector` (018c) está diseñado para NO validar
-- precisamente cuando no hay coordenada que validar. Se rechaza al
-- inicio, con SQLSTATE SV057 (el backend lo traduce a 422), antes de
-- escribir nada.
CREATE FUNCTION public.fn_create_tree_alta(
  p_project_id uuid,
  p_sector_id uuid,
  p_sector text,
  p_ubicacion_descriptiva text,
  p_utm_este numeric,
  p_utm_norte numeric,
  p_especie_cientifica text,
  p_nombre_comun text,
  p_fecha_registro date,
  p_registrado_por uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tree record;
  v_campos text[];
BEGIN
  IF p_sector IS NULL OR btrim(p_sector) = '' THEN
    RAISE EXCEPTION 'sector es obligatorio' USING ERRCODE = 'SV057';
  END IF;
  IF p_ubicacion_descriptiva IS NULL OR btrim(p_ubicacion_descriptiva) = '' THEN
    RAISE EXCEPTION 'ubicacion_descriptiva es obligatoria' USING ERRCODE = 'SV057';
  END IF;
  IF p_utm_este IS NULL THEN
    RAISE EXCEPTION 'utm_este es obligatorio' USING ERRCODE = 'SV057';
  END IF;
  IF p_utm_norte IS NULL THEN
    RAISE EXCEPTION 'utm_norte es obligatorio' USING ERRCODE = 'SV057';
  END IF;

  INSERT INTO public.trees (
    project_id, sector_id, sector, ubicacion_descriptiva,
    utm_este, utm_norte, especie_cientifica, nombre_comun,
    fecha_registro, registrado_por
  )
  VALUES (
    p_project_id, p_sector_id, p_sector, p_ubicacion_descriptiva,
    p_utm_este, p_utm_norte, p_especie_cientifica, p_nombre_comun,
    p_fecha_registro, p_registrado_por
  )
  RETURNING
    id, tree_code, project_id, sector_id, sector, ubicacion_descriptiva,
    utm_este, utm_norte, especie_cientifica, nombre_comun,
    estado_ciclo_vida, fecha_registro, registrado_por, created_at
  INTO v_tree;

  -- Exactamente lo que se ingresó: los cuatro campos obligatorios
  -- siempre; especie/nombre solo si vinieron.
  -- array_append, no ||: con un literal sin tipo a la derecha, Postgres
  -- resuelve la ambigüedad de || probando anyarray||anyarray primero e
  -- intenta parsear el literal como arreglo (22P02: malformed array literal).
  v_campos := ARRAY['sector', 'ubicacion_descriptiva', 'utm_este', 'utm_norte'];
  IF p_especie_cientifica IS NOT NULL THEN
    v_campos := array_append(v_campos, 'especie_cientifica');
  END IF;
  IF p_nombre_comun IS NOT NULL THEN
    v_campos := array_append(v_campos, 'nombre_comun');
  END IF;

  INSERT INTO public.tree_data_versions (
    tree_id, inspection_id, campos_registrados,
    sector, ubicacion_descriptiva, utm_este, utm_norte,
    especie_cientifica, nombre_comun, created_by
  )
  VALUES (
    v_tree.id, NULL, v_campos,
    p_sector, p_ubicacion_descriptiva, p_utm_este, p_utm_norte,
    p_especie_cientifica, p_nombre_comun, p_registrado_por
  );

  RETURN jsonb_build_object(
    'id', v_tree.id,
    'tree_code', v_tree.tree_code,
    'project_id', v_tree.project_id,
    'sector_id', v_tree.sector_id,
    'sector', v_tree.sector,
    'ubicacion_descriptiva', v_tree.ubicacion_descriptiva,
    'utm_este', v_tree.utm_este,
    'utm_norte', v_tree.utm_norte,
    'especie_cientifica', v_tree.especie_cientifica,
    'nombre_comun', v_tree.nombre_comun,
    'estado_ciclo_vida', v_tree.estado_ciclo_vida,
    'fecha_registro', v_tree.fecha_registro,
    'registrado_por', v_tree.registrado_por,
    'created_at', v_tree.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_tree_alta(uuid, uuid, text, text, numeric, numeric, text, text, date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_tree_alta(uuid, uuid, text, text, numeric, numeric, text, text, date, uuid) TO service_role;
