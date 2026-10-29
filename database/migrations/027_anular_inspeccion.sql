-- =====================================================================
-- Migración 027 — Anular una inspección finalizada (CC-067; CC-045 a;
-- CC-031; ADR-017 v1.2; D-209 a D-212)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
-- Depende de la 025 (fn_entradas_vigentes_previas).
--
-- fn_anular_inspeccion: el Usuario municipal activo y miembro del
-- proyecto anula una inspección Finalizada, con motivo obligatorio
-- (CC-067). El Sistema registra anulado_por y fecha_anulacion.
--   - OT sin completar: solo cambia el estado (nada de la inspección
--     era vigente). p_evaluacion debe ser NULL.
--   - OT completada: el backend envía la composición que queda sin
--     esta inspección (fn_entradas_vigentes_previas con
--     p_inspeccion_excluida) y el resultado del motor. La función la
--     verifica (SV068 si cambió), anula, refresca el árbol, comprueba
--     v_tree_current_inputs e inserta en tree_assessments con evento
--     'inspeccion_anulada', todo en la misma transacción.
-- SQLSTATE SV069 (precondición) y SV068 (la composición cambió).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_anular_inspeccion(
  p_inspection_id UUID,
  p_usuario UUID,
  p_motivo TEXT,
  p_evaluacion JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_registro TEXT;
  v_tree_id UUID;
  v_work_order_id UUID;
  v_estado_ot TEXT;
  v_project_id UUID;
  v_rol TEXT;
  v_activo BOOLEAN;
  v_motivo TEXT := btrim(COALESCE(p_motivo, ''));
  v_composicion JSONB;
  v_vigente JSONB;
  v_ahora TIMESTAMPTZ := now();
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;
  IF p_usuario IS NULL THEN
    RAISE EXCEPTION 'El identificador de usuario es obligatorio' USING ERRCODE = 'SV069';
  END IF;
  IF v_motivo = '' THEN
    RAISE EXCEPTION 'motivo_anulacion es obligatorio para anular la inspección (D-210)' USING ERRCODE = 'SV069';
  END IF;

  SELECT i.estado_registro, i.tree_id, i.work_order_id
  INTO v_estado_registro, v_tree_id, v_work_order_id
  FROM public.inspections i
  WHERE i.id = p_inspection_id
  FOR UPDATE;

  IF v_estado_registro IS NULL THEN
    RAISE EXCEPTION 'La inspección % no existe', p_inspection_id USING ERRCODE = 'SV069';
  END IF;

  -- La OT también se bloquea: completarla en paralelo cambiaría la vigencia.
  SELECT wo.estado_ot, wo.project_id INTO v_estado_ot, v_project_id
  FROM public.work_orders wo
  WHERE wo.id = v_work_order_id
  FOR UPDATE;

  IF v_estado_registro <> 'finalizado' THEN
    RAISE EXCEPTION 'Solo se anula una inspección Finalizada (estado actual: %) (D-209)', v_estado_registro USING ERRCODE = 'SV069';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up
  JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV069';
  END IF;
  IF v_rol <> 'usuario_municipal' THEN
    RAISE EXCEPTION 'Solo un Usuario municipal puede anular una inspección (rol actual: %) (CC-067)', v_rol USING ERRCODE = 'SV069';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV069';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = v_project_id AND user_id = p_usuario) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto %', p_usuario, v_project_id USING ERRCODE = 'SV069';
  END IF;

  IF v_estado_ot <> 'completada' THEN
    IF p_evaluacion IS NOT NULL THEN
      RAISE EXCEPTION 'La OT no está completada: la anulación no recalcula la vigente y no recibe evaluación' USING ERRCODE = 'SV069';
    END IF;
  ELSE
    IF p_evaluacion IS NULL THEN
      RAISE EXCEPTION 'La OT está completada: falta la evaluación vigente recalculada por el backend (ADR-017 v1.2)' USING ERRCODE = 'SV069';
    END IF;
    v_composicion := p_evaluacion->'composicion';
    IF public.fn_entradas_vigentes_previas(p_tree_id => v_tree_id, p_inspeccion_excluida => p_inspection_id)
       IS DISTINCT FROM v_composicion THEN
      RAISE EXCEPTION 'Los datos vigentes del árbol % cambiaron: vuelva a intentar', v_tree_id USING ERRCODE = 'SV068';
    END IF;
  END IF;

  UPDATE public.inspections
  SET estado_registro = 'anulado',
      motivo_anulacion = v_motivo,
      anulado_por = p_usuario,
      fecha_anulacion = v_ahora
  WHERE id = p_inspection_id;

  IF v_estado_ot = 'completada' THEN
    PERFORM public.fn_refresh_tree_current(v_tree_id);

    SELECT jsonb_build_object(
      'entradas_vigentes', COALESCE(v.entradas_vigentes, '{}'::jsonb),
      'origen_por_campo', COALESCE(v.origen_por_campo, '{}'::jsonb)
    ) INTO v_vigente
    FROM (SELECT 1) uno
    LEFT JOIN public.v_tree_current_inputs v ON v.tree_id = v_tree_id;

    IF v_vigente IS DISTINCT FROM v_composicion THEN
      RAISE EXCEPTION 'La composición vigente del árbol % no coincide con la calculada (fn_entradas_vigentes_previas y v_tree_current_inputs difieren)', v_tree_id;
    END IF;

    INSERT INTO public.tree_assessments (
      tree_id, evento, work_order_id, inspection_id, entradas_vigentes,
      calculados, indicadores,
      puntaje_raices_cuello, probabilidad_falla_raices_cuello,
      puntaje_tronco, probabilidad_falla_tronco,
      puntaje_copa_ramas, probabilidad_falla_copa_ramas,
      probabilidad_impacto,
      clasificacion_raices_cuello, clasificacion_tronco, clasificacion_copa_ramas,
      clasificacion_riesgo_calculada,
      puntaje_infraestructura, pct_infraestructura, clasificacion_infraestructura_calculada,
      clasificacion_prioridad_calculada,
      clasificacion_riesgo_ajustada, clasificacion_infraestructura_ajustada, clasificacion_prioridad_ajustada,
      adjustment_ids, ajustes_descartados, requiere_revision_ajuste,
      rule_version, motor_commit
    )
    SELECT
      v_tree_id, 'inspeccion_anulada', NULL, p_inspection_id,
      COALESCE((
        SELECT jsonb_object_agg(k.key, jsonb_build_object('valor', k.value, 'inspection_id', v_composicion->'origen_por_campo'->k.key))
        FROM jsonb_each(v_composicion->'entradas_vigentes') k
      ), '{}'::jsonb),
      r.calculados, r.indicadores,
      r.puntaje_raices_cuello, r.probabilidad_falla_raices_cuello,
      r.puntaje_tronco, r.probabilidad_falla_tronco,
      r.puntaje_copa_ramas, r.probabilidad_falla_copa_ramas,
      r.probabilidad_impacto,
      r.clasificacion_raices_cuello, r.clasificacion_tronco, r.clasificacion_copa_ramas,
      r.clasificacion_riesgo_calculada,
      r.puntaje_infraestructura, r.pct_infraestructura, r.clasificacion_infraestructura_calculada,
      r.clasificacion_prioridad_calculada,
      r.clasificacion_riesgo_ajustada, r.clasificacion_infraestructura_ajustada, r.clasificacion_prioridad_ajustada,
      COALESCE(r.adjustment_ids, '{}'), r.ajustes_descartados, COALESCE(r.requiere_revision_ajuste, false),
      r.rule_version, r.motor_commit
    FROM jsonb_populate_record(NULL::public.tree_assessments, p_evaluacion->'resultado') r;
  END IF;

  RETURN jsonb_build_object(
    'inspection_id', p_inspection_id,
    'estado_registro', 'anulado',
    'motivo_anulacion', v_motivo,
    'anulado_por', p_usuario,
    'fecha_anulacion', v_ahora,
    'vigente_recalculada', v_estado_ot = 'completada'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_anular_inspeccion(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_anular_inspeccion(UUID, UUID, TEXT, JSONB) TO service_role;
