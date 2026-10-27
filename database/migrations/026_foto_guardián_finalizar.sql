-- =====================================================================
-- Migración 026 — Guardián fotográfico en fn_finalizar_inspeccion
-- (PR-010 v4.0; D-27; CC-056 punto 2)
-- =====================================================================
--
-- Reemplaza fn_finalizar_inspeccion (020) añadiendo una verificación
-- SQL que rechaza finalizar una inspección de tipo evaluacion_inicial,
-- reevaluacion o levantamiento si no existen exactamente las cuatro
-- vistas obligatorias (arbol_completo, base, tronco, copa) en
-- public.photos vinculadas a esa inspección (photos.inspection_id).
--
-- Monitoreo y evaluacion_instrumental no están sujetos a esta regla
-- (PR-010 v4.0; CC-056 punto 2): la verificación solo se activa para
-- los tres tipos con evaluación completa.
--
-- La función conserva:
--   - Firma idéntica a la de la migración 020.
--   - SECURITY DEFINER con SET search_path = public, pg_temp.
--   - Permisos: REVOKE de PUBLIC/anon/authenticated; GRANT a service_role.
--   - Todo el comportamiento existente (bloqueos FOR UPDATE,
--     verificaciones de autorización, ajustes, fechas, species, etc.).
--
-- La verificación fotográfica se inserta entre el chequeo de
-- estado_registro = 'preguardado' (fin) y el SELECT del borrador
-- de evaluations (punto a), para rechazar lo más temprano posible
-- y antes de adquirir el lock sobre evaluations.
--
-- SQLSTATE: SV064 (mismo código de la función; las violaciones de
-- precondición de finalización ya usan SV064 en la 020; el catálogo
-- vigente no define un código más específico para fotografías).
--
-- Reversión: 026_foto_guardián_finalizar.down.sql restaura la versión
-- de la migración 020 exactamente.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_finalizar_inspeccion(
  p_inspection_id uuid,
  p_usuario uuid,
  p_resultado jsonb,
  p_ajustes jsonb,
  p_fecha_proxima_inspeccion_sugerida date,
  p_fecha_proximo_monitoreo_sugerida date,
  p_fecha_proxima_inspeccion date,
  p_fecha_proximo_monitoreo date,
  p_justificacion_ajuste_fecha text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tree_id uuid;
  v_work_order_id uuid;
  v_estado_registro text;
  v_tipo_inspeccion_realizada text;
  v_fecha_inspeccion date;
  v_estado_ot text;
  v_tipo_ot text;
  v_responsable_accion_id uuid;
  v_rol text;
  v_activo boolean;
  v_resultado evaluations_resultado_input;
  v_evaluation_id uuid;
  v_tdv_id uuid;
  v_tdv_especie text;
  v_tdv_species_id uuid;
  v_species_id uuid;
  v_ajuste jsonb;
  v_campo text;
  v_campos_ajustados text[] := ARRAY[]::text[];
  v_calculada text;
  v_ajustada text;
  v_fecha_vigente date;
  v_fecha_ajustada boolean;
  v_vistas_presentes integer;
BEGIN
  -- (b) Bloquea la inspección y su OT hasta el final de la transacción.
  SELECT i.tree_id, i.work_order_id, i.estado_registro, i.tipo_inspeccion_realizada, i.fecha_inspeccion,
         wo.estado_ot, wo.tipo_ot, wo.responsable_accion_id
  INTO v_tree_id, v_work_order_id, v_estado_registro, v_tipo_inspeccion_realizada, v_fecha_inspeccion,
       v_estado_ot, v_tipo_ot, v_responsable_accion_id
  FROM public.inspections i
  JOIN public.work_orders wo ON wo.id = i.work_order_id
  WHERE i.id = p_inspection_id
  FOR UPDATE OF i, wo;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'La inspección % no existe', p_inspection_id USING ERRCODE = 'SV064';
  END IF;
  IF v_tipo_ot <> 'inspeccion' THEN
    RAISE EXCEPTION 'Esta función no finaliza inspecciones de OT de Mantenimiento' USING ERRCODE = 'SV064';
  END IF;
  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_usuario THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_usuario, v_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV064';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV064';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %)', p_usuario, v_rol USING ERRCODE = 'SV064';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV064';
  END IF;

  IF v_estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo % no está En ejecución (estado actual: %)', v_work_order_id, v_estado_ot
      USING ERRCODE = 'SV064';
  END IF;
  IF v_estado_registro <> 'preguardado' THEN
    RAISE EXCEPTION 'La inspección % no está en Preguardado (estado actual: %) — no se puede finalizar de nuevo', p_inspection_id, v_estado_registro
      USING ERRCODE = 'SV064';
  END IF;

  -- ---------------------------------------------------------------
  -- (foto) D-27 / PR-010 v4.0: fotografías obligatorias.
  -- Solo para evaluacion_inicial, reevaluacion y levantamiento.
  -- Monitoreo y evaluacion_instrumental quedan exentos (CC-056 p.2).
  -- ---------------------------------------------------------------
  IF v_tipo_inspeccion_realizada IN ('evaluacion_inicial', 'reevaluacion', 'levantamiento') THEN
    SELECT COUNT(DISTINCT vista)
    INTO v_vistas_presentes
    FROM public.photos
    WHERE inspection_id = p_inspection_id
      AND vista IN ('arbol_completo', 'base', 'tronco', 'copa');

    IF v_vistas_presentes < 4 THEN
      RAISE EXCEPTION
        'Faltan fotografías obligatorias (D-27 / PR-010 v4.0): se requieren las cuatro vistas '
        'arbol_completo, base, tronco y copa para finalizar una %. '
        'Vistas presentes: %.',
        v_tipo_inspeccion_realizada, v_vistas_presentes
        USING ERRCODE = 'SV064';
    END IF;
  END IF;

  -- (a) Sin fila en `evaluations` no hay borrador que finalizar.
  SELECT id INTO v_evaluation_id
  FROM public.evaluations WHERE inspection_id = p_inspection_id
  FOR UPDATE;

  IF v_evaluation_id IS NULL THEN
    RAISE EXCEPTION 'La inspección % no tiene registro de evaluación (borrador) — no se puede finalizar', p_inspection_id
      USING ERRCODE = 'SV064';
  END IF;

  -- (d) Fechas obligatorias (D-202/D-203) y su relación con fecha_inspeccion (CC-055).
  IF p_fecha_proxima_inspeccion_sugerida IS NULL OR p_fecha_proximo_monitoreo_sugerida IS NULL
     OR p_fecha_proxima_inspeccion IS NULL OR p_fecha_proximo_monitoreo IS NULL THEN
    RAISE EXCEPTION 'Las fechas de próxima inspección y de próximo monitoreo (sugeridas y finales) son obligatorias (D-202, D-203)'
      USING ERRCODE = 'SV064';
  END IF;
  IF p_fecha_proxima_inspeccion <= v_fecha_inspeccion THEN
    RAISE EXCEPTION 'fecha_proxima_inspeccion (%) debe ser posterior a fecha_inspeccion (%) (D-202)',
      p_fecha_proxima_inspeccion, v_fecha_inspeccion
      USING ERRCODE = 'SV064';
  END IF;
  IF p_fecha_proximo_monitoreo < v_fecha_inspeccion THEN
    RAISE EXCEPTION 'fecha_proximo_monitoreo (%) debe ser igual o posterior a fecha_inspeccion (%) (D-203)',
      p_fecha_proximo_monitoreo, v_fecha_inspeccion
      USING ERRCODE = 'SV064';
  END IF;

  -- D-204: justificación solo cuando alguna fecha difiere de su sugerida.
  v_fecha_ajustada := p_fecha_proxima_inspeccion <> p_fecha_proxima_inspeccion_sugerida
                   OR p_fecha_proximo_monitoreo <> p_fecha_proximo_monitoreo_sugerida;
  IF p_justificacion_ajuste_fecha IS NOT NULL AND NOT v_fecha_ajustada THEN
    RAISE EXCEPTION 'justificacion_ajuste_fecha solo se registra cuando alguna fecha difiere de su sugerida, y aquí las dos coinciden (D-204)'
      USING ERRCODE = 'SV064';
  END IF;

  -- CC-055: la sugerida de un Monitoreo no atrasa la reinspección vigente
  -- (la fecha final ajustada, con justificación, sí puede).
  IF v_tipo_inspeccion_realizada = 'monitoreo' THEN
    SELECT fv.fecha_proxima_inspeccion INTO v_fecha_vigente
    FROM public.v_tree_fechas_vigentes fv WHERE fv.tree_id = v_tree_id;

    IF v_fecha_vigente IS NOT NULL
       AND p_fecha_proxima_inspeccion_sugerida > GREATEST(v_fecha_vigente, v_fecha_inspeccion + 1) THEN
      RAISE EXCEPTION 'En un Monitoreo, fecha_proxima_inspeccion_sugerida (%) no puede atrasar la vigente del árbol (%; como máximo %) (CC-055)',
        p_fecha_proxima_inspeccion_sugerida, v_fecha_vigente, GREATEST(v_fecha_vigente, v_fecha_inspeccion + 1)
        USING ERRCODE = 'SV064';
    END IF;
  END IF;

  v_resultado := jsonb_populate_record(null::evaluations_resultado_input, p_resultado);

  -- (c) Coherencia de los ajustes con `p_resultado`.
  IF p_ajustes IS NOT NULL AND jsonb_typeof(p_ajustes) <> 'array' THEN
    RAISE EXCEPTION 'p_ajustes debe ser un arreglo jsonb' USING ERRCODE = 'SV064';
  END IF;

  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(COALESCE(p_ajustes, '[]'::jsonb))
  LOOP
    v_campo := v_ajuste->>'campo';
    IF v_campo IS NULL OR v_campo NOT IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad') THEN
      RAISE EXCEPTION 'Ajuste con un campo no ajustable: %', v_campo USING ERRCODE = 'SV064';
    END IF;
    IF v_campo = ANY(v_campos_ajustados) THEN
      RAISE EXCEPTION 'Más de un ajuste para %', v_campo USING ERRCODE = 'SV064';
    END IF;
    v_campos_ajustados := array_append(v_campos_ajustados, v_campo);

    IF (v_ajuste->>'valor_ajustado') IS NULL OR (v_ajuste->>'valor_ajustado') IN ('no_determinado', 'no_aplica') THEN
      RAISE EXCEPTION 'El valor ajustado de % no puede ser %: un ajuste resuelve siempre a una categoría determinada (CC-044)',
        v_campo, COALESCE(v_ajuste->>'valor_ajustado', 'vacío')
        USING ERRCODE = 'SV064';
    END IF;

    v_calculada := CASE v_campo
      WHEN 'clasificacion_riesgo' THEN v_resultado.clasificacion_riesgo_calculada
      WHEN 'clasificacion_infraestructura' THEN v_resultado.clasificacion_infraestructura_calculada
      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_calculada
    END;
    v_ajustada := CASE v_campo
      WHEN 'clasificacion_riesgo' THEN v_resultado.clasificacion_riesgo_ajustada
      WHEN 'clasificacion_infraestructura' THEN v_resultado.clasificacion_infraestructura_ajustada
      WHEN 'clasificacion_prioridad' THEN v_resultado.clasificacion_prioridad_ajustada
    END;

    IF (v_ajuste->>'valor_calculado') IS DISTINCT FROM v_calculada THEN
      RAISE EXCEPTION 'Ajuste de %: valor_calculado (%) distinto del calculado en el resultado (%)',
        v_campo, v_ajuste->>'valor_calculado', v_calculada
        USING ERRCODE = 'SV064';
    END IF;
    IF (v_ajuste->>'valor_ajustado') IS DISTINCT FROM v_ajustada THEN
      RAISE EXCEPTION 'Ajuste de %: valor_ajustado (%) distinto de %_ajustada en el resultado (%)',
        v_campo, v_ajuste->>'valor_ajustado', v_campo, v_ajustada
        USING ERRCODE = 'SV064';
    END IF;
  END LOOP;

  IF (v_resultado.clasificacion_riesgo_ajustada IS NOT NULL AND NOT 'clasificacion_riesgo' = ANY(v_campos_ajustados))
     OR (v_resultado.clasificacion_infraestructura_ajustada IS NOT NULL AND NOT 'clasificacion_infraestructura' = ANY(v_campos_ajustados))
     OR (v_resultado.clasificacion_prioridad_ajustada IS NOT NULL AND NOT 'clasificacion_prioridad' = ANY(v_campos_ajustados)) THEN
    RAISE EXCEPTION 'El resultado trae una clasificación ajustada sin su ajuste en p_ajustes' USING ERRCODE = 'SV064';
  END IF;

  -- CC-053 punto 3: si esta inspección registró una especie como texto
  -- y todavía no tiene species_id, se incorpora o resuelve al catálogo
  -- AHORA, como parte de la misma finalización (nunca si falta algo —
  -- el llamador no invoca esta función hasta que todo esté completo).
  SELECT id, especie_cientifica, species_id INTO v_tdv_id, v_tdv_especie, v_tdv_species_id
  FROM public.tree_data_versions WHERE inspection_id = p_inspection_id;

  IF v_tdv_id IS NOT NULL AND v_tdv_especie IS NOT NULL AND v_tdv_species_id IS NULL THEN
    v_species_id := fn_resolve_or_create_species(p_especie_cientifica => v_tdv_especie, p_created_by => p_usuario);
    UPDATE public.tree_data_versions SET species_id = v_species_id WHERE id = v_tdv_id;
  END IF;

  UPDATE public.evaluations SET
    variables_calculo = v_resultado.variables_calculo,
    calculados = v_resultado.calculados,
    indicadores = v_resultado.indicadores,
    puntaje_raices_cuello = v_resultado.puntaje_raices_cuello,
    probabilidad_falla_raices_cuello = v_resultado.probabilidad_falla_raices_cuello,
    puntaje_tronco = v_resultado.puntaje_tronco,
    probabilidad_falla_tronco = v_resultado.probabilidad_falla_tronco,
    puntaje_copa_ramas = v_resultado.puntaje_copa_ramas,
    probabilidad_falla_copa_ramas = v_resultado.probabilidad_falla_copa_ramas,
    probabilidad_impacto = v_resultado.probabilidad_impacto,
    clasificacion_raices_cuello = v_resultado.clasificacion_raices_cuello,
    clasificacion_tronco = v_resultado.clasificacion_tronco,
    clasificacion_copa_ramas = v_resultado.clasificacion_copa_ramas,
    clasificacion_riesgo_calculada = v_resultado.clasificacion_riesgo_calculada,
    puntaje_infraestructura = v_resultado.puntaje_infraestructura,
    pct_infraestructura = v_resultado.pct_infraestructura,
    clasificacion_infraestructura_calculada = v_resultado.clasificacion_infraestructura_calculada,
    clasificacion_prioridad_calculada = v_resultado.clasificacion_prioridad_calculada,
    clasificacion_riesgo_ajustada = v_resultado.clasificacion_riesgo_ajustada,
    clasificacion_infraestructura_ajustada = v_resultado.clasificacion_infraestructura_ajustada,
    clasificacion_prioridad_ajustada = v_resultado.clasificacion_prioridad_ajustada,
    rule_version = v_resultado.rule_version,
    motor_commit = v_resultado.motor_commit,
    calculado_at = now()
  WHERE id = v_evaluation_id;

  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(COALESCE(p_ajustes, '[]'::jsonb))
  LOOP
    INSERT INTO public.classification_adjustments (
      evaluation_id, campo, valor_calculado, valor_ajustado, justificacion_ajuste_clasificacion, ajustado_por, rule_version
    ) VALUES (
      v_evaluation_id,
      v_ajuste->>'campo',
      v_ajuste->>'valor_calculado',
      v_ajuste->>'valor_ajustado',
      v_ajuste->>'justificacion_ajuste_clasificacion',
      p_usuario,
      v_resultado.rule_version
    );
  END LOOP;

  -- (e) Quién y cuándo ajustó una fecha: solo si alguna difiere de su
  -- sugerida (`v_fecha_ajustada`, calculado arriba).
  UPDATE public.inspections SET
    fecha_proxima_inspeccion_sugerida = p_fecha_proxima_inspeccion_sugerida,
    fecha_proximo_monitoreo_sugerida = p_fecha_proximo_monitoreo_sugerida,
    fecha_proxima_inspeccion = p_fecha_proxima_inspeccion,
    fecha_proximo_monitoreo = p_fecha_proximo_monitoreo,
    justificacion_ajuste_fecha = p_justificacion_ajuste_fecha,
    ajuste_fecha_por = CASE WHEN v_fecha_ajustada THEN p_usuario ELSE NULL END,
    fecha_ajuste_fecha = CASE WHEN v_fecha_ajustada THEN now() ELSE NULL END,
    estado_registro = 'finalizado',
    finalizada_at = now()
  WHERE id = p_inspection_id;

  RETURN jsonb_build_object(
    'inspection_id', p_inspection_id,
    'evaluation_id', v_evaluation_id,
    'estado_registro', 'finalizado',
    'species_id', COALESCE(v_species_id, v_tdv_species_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text) TO service_role;
