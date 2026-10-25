-- =====================================================================
-- Migración 018i — Catálogo de especies incorporado por el Inspector
-- (CC-053, issue #73; D-13, D-257 a D-262, REGLAS_GENERALES fila 18)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Decisión ya aprobada (CC-053, 2026-10-25), incluido el diseño del
-- punto 5 (problema de fondo detectado por la responsable:
-- `fn_refresh_tree_current` releería el nombre viejo desde
-- `tree_data_versions` si una corrección de nombre solo tocara
-- `trees`). Esta migración construye la base para que el #59
-- (finalización) incorpore y vincule especies — el #58 no cambia: el
-- borrador sigue aceptando cualquier `especie_cientifica` no vacía,
-- sin tocar `species`.
--
-- ---------------------------------------------------------------------
-- 1. species_id: vínculo estable, junto al texto que ya existe
-- ---------------------------------------------------------------------
-- No se reemplaza `especie_cientifica` (texto) en ninguna tabla: se
-- agrega el vínculo. Mientras una especie no esté confirmada por un
-- Inspector (D-13), `species_id` queda NULL y el texto se usa tal
-- cual, igual que hoy.
--
-- `trees.species_id` YA EXISTE (migración 001; `idx_trees_species`) y
-- su FK ya apunta a `species(id)` — se reutiliza tal cual, no se
-- vuelve a crear. Es la columna que escribe `fn_create_tree_with_measurement`
-- (demo vieja, fuera de `sivu/`), no la tocan `fn_create_tree_alta` ni
-- el flujo de inspección/evaluación. En `valpo-verde-conecta-pruebas`
-- la tabla `trees` está vacía (verificado, solo lectura); según indica
-- la responsable, los árboles de la demo en `valpo-verde-conecta` ya
-- la tienen cargada — ver nota en el issue #45. Solo se agrega la
-- columna nueva en `tree_data_versions`.

ALTER TABLE public.tree_data_versions ADD COLUMN species_id uuid REFERENCES public.species(id);

-- ---------------------------------------------------------------------
-- 2. species_name_history: historial de renombres (punto 5)
-- ---------------------------------------------------------------------
-- Solo inserción, escrita por fn_rename_species. No sustituye el
-- historial implícito que ya tiene cada tree_data_versions (el texto
-- tal como se escribió en su momento) — este es el historial EXPLÍCITO
-- de la especie en sí, independiente de qué árboles la usaron.

CREATE TABLE public.species_name_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id    UUID NOT NULL REFERENCES public.species(id) ON DELETE RESTRICT,
  nombre_anterior TEXT NOT NULL,
  nombre_nuevo    TEXT NOT NULL,
  changed_by      UUID REFERENCES public.user_profiles(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_species_name_history_species ON public.species_name_history (species_id);

ALTER TABLE public.species_name_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY species_name_history_select_authenticated ON public.species_name_history
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 3. fn_refresh_tree_current: el nombre vigente se resuelve desde el
--    catálogo cuando hay species_id (siempre el nombre ACTUAL — por
--    eso un renombre se propaga incluso sin ninguna inspección nueva,
--    con solo volver a correr esta función), o desde el texto de la
--    fila cuando no (especie escrita, sin confirmar).
-- ---------------------------------------------------------------------
-- Mismo criterio de vigencia que ya tenía (CASE WHEN EXISTS, última
-- fila válida por campos_registrados); el único cambio es qué valor de
-- especie_cientifica devuelve cada rama, más la nueva columna
-- species_id, resuelta igual.

CREATE OR REPLACE FUNCTION public.fn_refresh_tree_current(p_tree_id UUID) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  WITH validas AS (
    SELECT tdv.*, wo.fecha_completada_ot AS ot_fecha_completada,
           COALESCE(s.especie_cientifica, tdv.especie_cientifica) AS especie_resuelta
    FROM tree_data_versions tdv
    JOIN inspections i ON i.id = tdv.inspection_id
    JOIN work_orders wo ON wo.id = i.work_order_id
    LEFT JOIN species s ON s.id = tdv.species_id
    WHERE tdv.tree_id = p_tree_id
      AND i.estado_registro <> 'anulado'
      AND wo.estado_ot = 'completada'
  ),
  alta AS (
    SELECT tdv.*, COALESCE(s.especie_cientifica, tdv.especie_cientifica) AS especie_resuelta
    FROM tree_data_versions tdv
    LEFT JOIN species s ON s.id = tdv.species_id
    WHERE tdv.tree_id = p_tree_id AND tdv.inspection_id IS NULL
  )
  UPDATE trees t SET
    sector = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'sector' = ANY(v.campos_registrados))
      THEN (SELECT v.sector FROM validas v WHERE 'sector' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.sector FROM alta a) END,
    ubicacion_descriptiva = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados))
      THEN (SELECT v.ubicacion_descriptiva FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.ubicacion_descriptiva FROM alta a) END,
    utm_este = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_este FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_este FROM alta a) END,
    utm_norte = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados))
      THEN (SELECT v.utm_norte FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.utm_norte FROM alta a) END,
    especie_cientifica = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.especie_resuelta FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.especie_resuelta FROM alta a) END,
    species_id = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados))
      THEN (SELECT v.species_id FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.species_id FROM alta a) END,
    nombre_comun = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados))
      THEN (SELECT v.nombre_comun FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.nombre_comun FROM alta a) END,
    multifustal = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados))
      THEN (SELECT v.multifustal FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.multifustal FROM alta a) END,
    numero_fustes = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados))
      THEN (SELECT v.numero_fustes FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.numero_fustes FROM alta a) END,
    dap_fustes_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_fustes_cm FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_fustes_cm FROM alta a) END,
    dap_cm = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados))
      THEN (SELECT v.dap_cm FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.dap_cm FROM alta a) END,
    altura_total_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_total_m FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_total_m FROM alta a) END,
    diametro_copa_ns_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_ns_m FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_ns_m FROM alta a) END,
    diametro_copa_eo_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados))
      THEN (SELECT v.diametro_copa_eo_m FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.diametro_copa_eo_m FROM alta a) END,
    copa_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.copa_no_presenta FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.copa_no_presenta FROM alta a) END,
    altura_primera_rama_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_m FROM alta a) END,
    altura_primera_rama_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_primera_rama_no_presenta FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_primera_rama_no_presenta FROM alta a) END,
    altura_base_copa_viva_m = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_m FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_m FROM alta a) END,
    altura_base_copa_viva_no_presenta = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados))
      THEN (SELECT v.altura_base_copa_viva_no_presenta FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.altura_base_copa_viva_no_presenta FROM alta a) END,
    clase_edad = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados))
      THEN (SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.clase_edad FROM alta a) END,
    rango_edad_estimada_anios = CASE WHEN EXISTS (SELECT 1 FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados))
      THEN (SELECT v.rango_edad_estimada_anios FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados) ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
      ELSE (SELECT a.rango_edad_estimada_anios FROM alta a) END,
    vigente_desde_inspection_id = (SELECT v.inspection_id FROM validas v ORDER BY v.ot_fecha_completada DESC, v.created_at DESC LIMIT 1)
  WHERE t.id = p_tree_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. v_species_traits: unir primero por species_id (inmune a un
--    renombre); el texto normalizado queda de respaldo solo para
--    árboles sin species_id todavía (especie escrita, sin confirmar).
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW v_species_traits WITH (security_invoker = true) AS
SELECT
  t.id AS tree_id,
  COALESCE(s.origen_biogeografico, 'no_determinado') AS origen_biogeografico,
  s.persistencia_follaje,
  s.tipo_hoja,
  s.genero,
  s.familia
FROM trees t
LEFT JOIN species s
  ON s.id = COALESCE(
    t.species_id,
    (SELECT s2.id FROM species s2
     WHERE lower(regexp_replace(trim(s2.especie_cientifica), '\s+', ' ', 'g'))
         = lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
     LIMIT 1)
  );

-- ---------------------------------------------------------------------
-- 5. fn_rename_species — corrige el nombre, con historial (punto 5).
--    Solo el Inspector (REGLAS_GENERALES fila 18). SQLSTATE SV061.
-- ---------------------------------------------------------------------
-- No valida el dominio del nombre nuevo aparte: `species` ya rechaza
-- "Género sp." y "No determinado" con `chk_species_especie_cientifica_valida`
-- (23514) y duplicados por forma normalizada con `uq_species_especie_cientifica_norm`
-- (23505) — esta función no repite esos checks, los deja pasar a la base.
-- PENDIENTE para el endpoint TS de renombrar (parte del #73, capa
-- backend, todavía no construida): capturar 23505 y responder 409 con
-- mensaje claro ("ya existe una especie con ese nombre"), no 500.

CREATE FUNCTION public.fn_rename_species(
  p_species_id uuid,
  p_nombre_nuevo text,
  p_changed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol text;
  v_activo boolean;
  v_nombre_anterior text;
BEGIN
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_changed_by;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_changed_by USING ERRCODE = 'SV061';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %; solo el Inspector corrige especies, REGLAS_GENERALES fila 18)', p_changed_by, v_rol
      USING ERRCODE = 'SV061';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_changed_by USING ERRCODE = 'SV061';
  END IF;

  SELECT especie_cientifica INTO v_nombre_anterior FROM public.species WHERE id = p_species_id;
  IF v_nombre_anterior IS NULL THEN
    RAISE EXCEPTION 'La especie % no existe', p_species_id USING ERRCODE = 'SV061';
  END IF;
  IF v_nombre_anterior = p_nombre_nuevo THEN
    RAISE EXCEPTION 'El nombre nuevo es igual al actual (%)', v_nombre_anterior USING ERRCODE = 'SV061';
  END IF;

  UPDATE public.species SET especie_cientifica = p_nombre_nuevo WHERE id = p_species_id;

  INSERT INTO public.species_name_history (species_id, nombre_anterior, nombre_nuevo, changed_by)
  VALUES (p_species_id, v_nombre_anterior, p_nombre_nuevo, p_changed_by);

  RETURN jsonb_build_object('id', p_species_id, 'especie_cientifica', p_nombre_nuevo, 'nombre_anterior', v_nombre_anterior);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_rename_species(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rename_species(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 6. fn_complete_species — completa genero/familia/origen/persistencia/
--    tipo_hoja (punto 4). Todos opcionales, nunca se inventan (D-258 a
--    D-262). Solo el Inspector. SQLSTATE SV062.
-- ---------------------------------------------------------------------
-- Los CHECK físicos de `species` (origen_biogeografico/persistencia_follaje/
-- tipo_hoja IN (...)) ya validan el dominio de cada campo — esta función
-- no los repite.

CREATE FUNCTION public.fn_complete_species(
  p_species_id uuid,
  p_genero text,
  p_familia text,
  p_origen_biogeografico text,
  p_persistencia_follaje text,
  p_tipo_hoja text,
  p_changed_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol text;
  v_activo boolean;
  v_especie record;
BEGIN
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_changed_by;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_changed_by USING ERRCODE = 'SV062';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %; solo el Inspector completa especies, REGLAS_GENERALES fila 18)', p_changed_by, v_rol
      USING ERRCODE = 'SV062';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_changed_by USING ERRCODE = 'SV062';
  END IF;

  UPDATE public.species SET
    genero = p_genero,
    familia = p_familia,
    origen_biogeografico = p_origen_biogeografico,
    persistencia_follaje = p_persistencia_follaje,
    tipo_hoja = p_tipo_hoja
  WHERE id = p_species_id
  RETURNING id, especie_cientifica, genero, familia, origen_biogeografico, persistencia_follaje, tipo_hoja
  INTO v_especie;

  IF v_especie.id IS NULL THEN
    RAISE EXCEPTION 'La especie % no existe', p_species_id USING ERRCODE = 'SV062';
  END IF;

  RETURN jsonb_build_object(
    'id', v_especie.id, 'especie_cientifica', v_especie.especie_cientifica,
    'genero', v_especie.genero, 'familia', v_especie.familia,
    'origen_biogeografico', v_especie.origen_biogeografico,
    'persistencia_follaje', v_especie.persistencia_follaje, 'tipo_hoja', v_especie.tipo_hoja
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_complete_species(uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_species(uuid, text, text, text, text, text, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 7. fn_resolve_or_create_species — incorporación automática (punto 3).
--    Lista para que el #59 (finalización) la invoque al finalizar una
--    inspección; esta migración no agrega ningún llamador todavía.
--    SQLSTATE SV063.
-- ---------------------------------------------------------------------
-- Busca por forma normalizada (D-13: "evitar duplicidades por
-- diferencias de escritura", mismo criterio que
-- uq_species_especie_cientifica_norm). Si no existe, la incorpora con
-- created_by = el Inspector (D-257: "registro de las especies
-- identificadas... Inspector"). El CHECK físico
-- (chk_species_especie_cientifica_valida) rechaza "Género sp." y
-- "No determinado" si de todos modos llegan hasta aquí.

CREATE FUNCTION public.fn_resolve_or_create_species(
  p_especie_cientifica text,
  p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol text;
  v_activo boolean;
  v_species_id uuid;
BEGIN
  IF p_especie_cientifica IS NULL OR btrim(p_especie_cientifica) = '' THEN
    RAISE EXCEPTION 'especie_cientifica es obligatoria' USING ERRCODE = 'SV063';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_created_by;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_created_by USING ERRCODE = 'SV063';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %; solo el Inspector incorpora especies, REGLAS_GENERALES fila 18)', p_created_by, v_rol
      USING ERRCODE = 'SV063';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_created_by USING ERRCODE = 'SV063';
  END IF;

  SELECT id INTO v_species_id FROM public.species
  WHERE lower(regexp_replace(trim(especie_cientifica), '\s+', ' ', 'g'))
      = lower(regexp_replace(trim(p_especie_cientifica), '\s+', ' ', 'g'));

  IF v_species_id IS NOT NULL THEN
    RETURN v_species_id;
  END IF;

  INSERT INTO public.species (especie_cientifica, created_by)
  VALUES (btrim(p_especie_cientifica), p_created_by)
  RETURNING id INTO v_species_id;

  RETURN v_species_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_resolve_or_create_species(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_or_create_species(text, uuid) TO service_role;
