-- =====================================================================
-- Migración 028 — Valpo Verde Conecta: reporte ciudadano, ficha pública,
-- seguimiento y revisión municipal (#62; CC-062 / PR-022 v2.0; CC-036;
-- CC-049; PR-018 v6.0; D-174 a D-190, D-257 a D-262)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Lo que ya existe y NO se toca: incidents (015), incident_reporters
-- con nombre y RUT visibles solo para el Usuario municipal miembro
-- (015/017) y su borrado al registrar Validada o Descartada
-- (trg_incidents_clear_reporter), photos.incident_id, trees.qr_token
-- (018a).
--
-- Agrega:
--   1. incidents.codigo_seguimiento_huella: SHA-256 del código de
--      seguimiento (CC-062 punto 4). La base nunca guarda el código en
--      claro: lo genera el backend (≥128 bits, generador criptográfico),
--      lo entrega una sola vez y envía aquí solo su huella.
--   2. fn_crear_incidencia_ciudadana: alta atómica del reporte público
--      (incidencia + nombre y RUT + fotos ya subidas). origen_reporte =
--      Comunidad (D-177); árbol, proyecto y ubicación salen del QR
--      (D-175, D-182); fecha_reporte = hoy en Santiago (D-176).
--   3. fn_ficha_publica_arbol: lectura pública por qr_token (CC-062
--      punto 3): especie_cientifica, nombre_comun, ubicacion_descriptiva
--      y «Sobre esta especie» (D-257 a D-262). Nada más.
--   4. fn_estado_seguimiento: lectura pública por huella: solo
--      estado_incidencia (D-184), y NULL si no existe o venció (90 días
--      después de quedar Resuelta o Descartada).
--   5. fn_purgar_huellas_vencidas: borra las huellas vencidas. La
--      invoca el backend en cada consulta de seguimiento y en cada
--      reporte (pg_cron no está instalado).
--   6. fn_revisar_incidencia: revisión del Usuario municipal miembro
--      (D-184 a D-190). Si la incidencia queda Descartada, borra las
--      filas de sus fotos ciudadanas y devuelve las rutas para que el
--      backend borre los archivos (CC-049 punto 6).
--
-- Todas: SECURITY DEFINER, search_path fijo, EXECUTE solo para
-- service_role (PR-018 v6.0). anon y authenticated siguen sin
-- privilegios.
-- SQLSTATE SV070 (reporte ciudadano) y SV071 (revisión).
-- =====================================================================

ALTER TABLE public.incidents ADD COLUMN codigo_seguimiento_huella BYTEA;
ALTER TABLE public.incidents ADD CONSTRAINT chk_incidents_huella_sha256
  CHECK (codigo_seguimiento_huella IS NULL OR octet_length(codigo_seguimiento_huella) = 32);
CREATE UNIQUE INDEX uq_incidents_codigo_seguimiento_huella
  ON public.incidents (codigo_seguimiento_huella) WHERE codigo_seguimiento_huella IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Reporte ciudadano
-- ---------------------------------------------------------------------
-- p_fotos: [{"id": uuid, "storage_path": text}, ...], al menos una (D-183).
-- El backend las sube a Storage (sin metadatos, CC-049) antes de llamar;
-- si esta función falla, las borra.
CREATE FUNCTION public.fn_crear_incidencia_ciudadana(
  p_incident_id UUID,
  p_qr_token UUID,
  p_tipo_incidencia TEXT,
  p_descripcion TEXT,
  p_nombre_reportante TEXT,
  p_rut_reportante TEXT,
  p_huella BYTEA,
  p_fotos JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tree RECORD;
  v_inc RECORD;
  v_foto JSONB;
BEGIN
  IF p_fotos IS NULL OR jsonb_typeof(p_fotos) <> 'array' OR jsonb_array_length(p_fotos) = 0 THEN
    RAISE EXCEPTION 'Debe adjuntar al menos una fotografía (D-183)' USING ERRCODE = 'SV070';
  END IF;
  IF p_huella IS NULL OR octet_length(p_huella) <> 32 THEN
    RAISE EXCEPTION 'Falta la huella del código de seguimiento' USING ERRCODE = 'SV070';
  END IF;
  IF btrim(COALESCE(p_descripcion, '')) = '' THEN
    RAISE EXCEPTION 'descripcion es obligatoria (D-181)' USING ERRCODE = 'SV070';
  END IF;

  SELECT t.id, t.project_id, t.ubicacion_descriptiva INTO v_tree
  FROM public.trees t
  WHERE t.qr_token = p_qr_token;
  IF v_tree.id IS NULL THEN
    RAISE EXCEPTION 'No existe un árbol con ese código QR' USING ERRCODE = 'SV070';
  END IF;

  INSERT INTO public.incidents (
    id, tree_id, project_id, tipo_incidencia, descripcion, estado_incidencia,
    origen_reporte, fecha_reporte, ubicacion, fecha_actualizacion_estado,
    codigo_seguimiento_huella
  ) VALUES (
    p_incident_id, v_tree.id, v_tree.project_id, p_tipo_incidencia, btrim(p_descripcion), 'ingresada',
    'comunidad', (now() AT TIME ZONE 'America/Santiago')::date, v_tree.ubicacion_descriptiva, now(),
    p_huella
  )
  RETURNING id, codigo_incidencia, fecha_reporte INTO v_inc;

  INSERT INTO public.incident_reporters (incident_id, nombre_reportante, rut_reportante)
  VALUES (v_inc.id, btrim(p_nombre_reportante), p_rut_reportante);

  FOR v_foto IN SELECT value FROM jsonb_array_elements(p_fotos) LOOP
    INSERT INTO public.photos (id, tree_id, storage_path, vista, inspection_id, maintenance_record_id, incident_id, uploaded_by)
    VALUES ((v_foto->>'id')::uuid, v_tree.id, v_foto->>'storage_path', NULL, NULL, NULL, v_inc.id, NULL);
  END LOOP;

  RETURN jsonb_build_object('id', v_inc.id, 'codigo_incidencia', v_inc.codigo_incidencia, 'fecha_reporte', v_inc.fecha_reporte);
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Ficha pública (solo la proyección de CC-062 punto 3)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_ficha_publica_arbol(p_qr_token UUID) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'especie_cientifica', t.especie_cientifica,
    'nombre_comun', t.nombre_comun,
    'ubicacion_descriptiva', t.ubicacion_descriptiva,
    -- D-260 a D-262: sin especie vigente, origen «no determinado» y
    -- persistencia y tipo de hoja sin valor.
    'sobre_la_especie', jsonb_build_object(
      'especie_cientifica', s.especie_cientifica,
      'genero', s.genero,
      'familia', s.familia,
      'origen_biogeografico', CASE WHEN t.especie_cientifica IS NULL THEN 'no_determinado'
                                   ELSE COALESCE(s.origen_biogeografico, 'no_determinado') END,
      'persistencia_follaje', CASE WHEN t.especie_cientifica IS NULL THEN NULL ELSE s.persistencia_follaje END,
      'tipo_hoja', CASE WHEN t.especie_cientifica IS NULL THEN NULL ELSE s.tipo_hoja END
    )
  )
  FROM public.trees t
  LEFT JOIN public.species s
    ON s.id = COALESCE(
      t.species_id,
      (SELECT s2.id FROM public.species s2
       WHERE lower(regexp_replace(trim(s2.especie_cientifica), '\s+', ' ', 'g'))
           = lower(regexp_replace(trim(t.especie_cientifica), '\s+', ' ', 'g'))
       LIMIT 1))
  WHERE t.qr_token = p_qr_token;
$$;

-- ---------------------------------------------------------------------
-- 4 y 5. Seguimiento y purga de huellas vencidas
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_estado_seguimiento(p_huella BYTEA) RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.estado_incidencia
  FROM public.incidents i
  WHERE i.codigo_seguimiento_huella = p_huella
    AND NOT (i.estado_incidencia IN ('resuelta', 'descartada')
             AND i.fecha_actualizacion_estado < now() - interval '90 days');
$$;

CREATE FUNCTION public.fn_purgar_huellas_vencidas() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n INTEGER;
BEGIN
  UPDATE public.incidents
  SET codigo_seguimiento_huella = NULL
  WHERE codigo_seguimiento_huella IS NOT NULL
    AND estado_incidencia IN ('resuelta', 'descartada')
    AND fecha_actualizacion_estado < now() - interval '90 days';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Revisión municipal (D-184 a D-190)
-- ---------------------------------------------------------------------
-- Reglas del Excel: con estado distinto de Ingresada se exigen
-- resultado_revision, fecha_revision y revisado_por (D-185 a D-187,
-- columna K); prioridad_municipal solo con Validada (D-189). El Sistema
-- registra fecha_revision y revisado_por cuando cambia el resultado o
-- las observaciones (una revisión nueva, D-185), y
-- fecha_actualizacion_estado cuando cambia el estado (D-190).
CREATE FUNCTION public.fn_revisar_incidencia(
  p_incident_id UUID,
  p_usuario UUID,
  p_estado_incidencia TEXT,
  p_resultado_revision TEXT,
  p_observaciones_revision TEXT,
  p_prioridad_municipal TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inc public.incidents%ROWTYPE;
  v_rol TEXT;
  v_activo BOOLEAN;
  v_obs TEXT := NULLIF(btrim(COALESCE(p_observaciones_revision, '')), '');
  v_nueva_revision BOOLEAN;
  v_rutas TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inc FROM public.incidents WHERE id = p_incident_id FOR UPDATE;
  IF v_inc.id IS NULL THEN
    RAISE EXCEPTION 'La incidencia % no existe', p_incident_id USING ERRCODE = 'SV071';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;
  IF v_rol IS DISTINCT FROM 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal revisa incidencias (rol actual: %) (D-184, D-186)', v_rol USING ERRCODE = 'SV071';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV071';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = v_inc.project_id AND user_id = p_usuario) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto de la incidencia', p_usuario USING ERRCODE = 'SV071';
  END IF;

  IF p_estado_incidencia <> 'ingresada' AND p_resultado_revision IS NULL THEN
    RAISE EXCEPTION 'resultado_revision es obligatorio cuando el estado no es Ingresada (D-187)' USING ERRCODE = 'SV071';
  END IF;
  IF p_resultado_revision = 'validada' AND p_prioridad_municipal IS NULL THEN
    RAISE EXCEPTION 'prioridad_municipal es obligatoria con resultado Validada (D-189)' USING ERRCODE = 'SV071';
  END IF;
  IF p_resultado_revision IS DISTINCT FROM 'validada' AND p_prioridad_municipal IS NOT NULL THEN
    RAISE EXCEPTION 'prioridad_municipal solo se registra con resultado Validada (D-189)' USING ERRCODE = 'SV071';
  END IF;

  v_nueva_revision := p_resultado_revision IS DISTINCT FROM v_inc.resultado_revision
                      OR v_obs IS DISTINCT FROM v_inc.observaciones_revision;

  UPDATE public.incidents SET
    estado_incidencia          = p_estado_incidencia,
    fecha_actualizacion_estado = CASE WHEN p_estado_incidencia IS DISTINCT FROM v_inc.estado_incidencia
                                      THEN now() ELSE fecha_actualizacion_estado END,
    resultado_revision         = p_resultado_revision,
    observaciones_revision     = v_obs,
    prioridad_municipal        = p_prioridad_municipal,
    fecha_revision             = CASE WHEN v_nueva_revision AND p_resultado_revision IS NOT NULL THEN now() ELSE fecha_revision END,
    revisado_por               = CASE WHEN v_nueva_revision AND p_resultado_revision IS NOT NULL THEN p_usuario ELSE revisado_por END,
    actualizado_por            = p_usuario
  WHERE id = p_incident_id
  RETURNING * INTO v_inc;

  -- CC-049 punto 6: las fotos ciudadanas se eliminan si se descarta.
  IF p_resultado_revision = 'descartada' THEN
    WITH borradas AS (
      DELETE FROM public.photos WHERE incident_id = p_incident_id RETURNING storage_path
    )
    SELECT COALESCE(array_agg(storage_path), ARRAY[]::TEXT[]) INTO v_rutas FROM borradas;
  END IF;

  RETURN jsonb_build_object(
    'id', v_inc.id,
    'codigo_incidencia', v_inc.codigo_incidencia,
    'estado_incidencia', v_inc.estado_incidencia,
    'resultado_revision', v_inc.resultado_revision,
    'observaciones_revision', v_inc.observaciones_revision,
    'prioridad_municipal', v_inc.prioridad_municipal,
    'fecha_revision', v_inc.fecha_revision,
    'revisado_por', v_inc.revisado_por,
    'fecha_actualizacion_estado', v_inc.fecha_actualizacion_estado,
    'fotos_borradas', to_jsonb(v_rutas)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_crear_incidencia_ciudadana(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BYTEA, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_ficha_publica_arbol(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_estado_seguimiento(BYTEA) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_purgar_huellas_vencidas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_revisar_incidencia(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_crear_incidencia_ciudadana(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BYTEA, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_ficha_publica_arbol(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_estado_seguimiento(BYTEA) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purgar_huellas_vencidas() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_revisar_incidencia(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
