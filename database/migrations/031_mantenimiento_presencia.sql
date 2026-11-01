-- =====================================================================
-- Migración 031 — Mantenimiento (#61) y presencia del árbol (AM-22)
-- (D-28, D-29, D-213 a D-230, D-233 a D-246; PR-020 v1.1; CC-050;
-- CC-064 puntos b, c y p)
-- =====================================================================
--
-- Autorizada por Valej el 2026-11-01, solo para la base de pruebas.
--
-- Decisiones de Valej (2026-11-01):
--   AM-22: un solo estado. Rige estado_presencia (D-28, D-29), derivado;
--     trees.estado_ciclo_vida se conserva con sus códigos (PR-021) como
--     copia que el Sistema actualiza al aprobarse una Tala (tocon) o un
--     Retiro_tocón (retirado). activo = Presente, tocon = Talado,
--     retirado = Retirado.
--   Revisor: el Usuario municipal asigna un Inspector revisor al crear la
--     OT cuando requiere revisión (campo nuevo, fuera del Excel).
--   Una ejecución nueva solo cuando no hay otra pendiente de revisión.
--   Aprobar exige resultado = Ejecutado completamente (D-220).
--
-- 1. work_orders.inspector_revisor_id (nuevo) y su CHECK.
-- 2. v_tree_presence según D-28 al pie de la letra: subtipo EJECUTADO
--    (antes tomaba el solicitado), OT Completada, revisión Aprobada. Que
--    el revisor sea Inspector lo garantiza fn_revisar_mantenimiento (la
--    vista es security_invoker y la RLS de user_profiles no deja leer el
--    rol de otros usuarios).
-- 3. fn_create_work_order_mantenimiento (SV072).
-- 4. fn_transition_work_order_estado: también OT de Mantenimiento, por
--    su Encargado de mantención responsable (CC-050; CC-064 p).
-- 5. fn_reassign_inspector_revisor (SV072).
-- 6. fn_registrar_ejecucion_mantenimiento (SV073): registro del
--    Encargado con su evidencia; completa la OT sin revisión (PR-020).
-- 7. fn_revisar_mantenimiento (SV074): revisión del Inspector asignado;
--    al aprobar completa la OT y, con Tala o Retiro_tocón, actualiza
--    estado_ciclo_vida (AM-22).
-- Funciones SECURITY DEFINER con search_path fijo y EXECUTE solo para
-- service_role (PR-018 v6.0). Reasignar el Encargado y cancelar ya
-- funcionan para Mantenimiento (fn_reassign_work_order, fn_cancel_work_order).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Inspector revisor
-- ---------------------------------------------------------------------
ALTER TABLE public.work_orders ADD COLUMN inspector_revisor_id UUID REFERENCES public.user_profiles(id);
ALTER TABLE public.work_orders ADD CONSTRAINT chk_work_orders_inspector_revisor CHECK (
  (inspector_revisor_id IS NULL OR (tipo_ot = 'mantenimiento' AND requiere_revision_inspector IS TRUE))
  AND (tipo_ot <> 'mantenimiento' OR requiere_revision_inspector IS NOT TRUE OR inspector_revisor_id IS NOT NULL)
);
CREATE INDEX idx_work_orders_inspector_revisor ON public.work_orders (inspector_revisor_id) WHERE inspector_revisor_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. Presencia del árbol (D-28, D-29)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_tree_presence WITH (security_invoker = true) AS
WITH aprobadas AS (
  SELECT
    mr.tree_id,
    mr.subtipo_ejecutado,
    mr.fecha_revision,
    ROW_NUMBER() OVER (PARTITION BY mr.tree_id ORDER BY mr.fecha_revision DESC, mr.created_at DESC) AS rn
  FROM public.maintenance_records mr
  JOIN public.work_orders wo ON wo.id = mr.work_order_id AND wo.tree_id = mr.tree_id
  WHERE wo.estado_ot = 'completada'
    AND mr.estado_revision = 'aprobado'
    AND mr.subtipo_ejecutado IN ('tala', 'retiro_tocon')
)
SELECT
  t.id AS tree_id,
  CASE
    WHEN a.subtipo_ejecutado = 'tala' THEN 'talado'
    WHEN a.subtipo_ejecutado = 'retiro_tocon' THEN 'retirado'
    ELSE 'presente'
  END AS estado_presencia,
  COALESCE(a.fecha_revision::date, t.fecha_registro) AS fecha_cambio_estado_presencia
FROM public.trees t
LEFT JOIN aprobadas a ON a.tree_id = t.id AND a.rn = 1;

-- Pares acción/subtipo de Mantenimiento (D-219, D-236). NULL = la acción
-- no tiene subtipos definidos.
CREATE FUNCTION public.fn_subtipos_mantenimiento(p_accion text) RETURNS text[]
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_accion
    WHEN 'poda' THEN ARRAY['sanitaria', 'formacion', 'despeje', 'reduccion']
    WHEN 'riego' THEN ARRAY['programado', 'emergencia']
    WHEN 'descompactacion' THEN ARRAY['manual', 'mecanica']
    WHEN 'manejo_fitosanitario' THEN ARRAY['preventivo', 'correctivo', 'retiro_residuos']
    WHEN 'tala_retiro' THEN ARRAY['tala', 'retiro_tocon']
    ELSE NULL
  END;
$$;

-- Usuario con el rol dado, activo y miembro del proyecto; lanza el SQLSTATE dado si no.
CREATE FUNCTION public.fn_assert_miembro_con_rol(p_usuario uuid, p_project_id uuid, p_rol text, p_que text, p_sqlstate text) RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol text;
  v_activo boolean;
BEGIN
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;
  IF v_rol IS NULL THEN
    RAISE EXCEPTION '% %: el usuario no existe', p_que, p_usuario USING ERRCODE = p_sqlstate;
  END IF;
  IF v_rol <> p_rol THEN
    RAISE EXCEPTION '% debe tener el rol % (rol actual: %)', p_que, p_rol, v_rol USING ERRCODE = p_sqlstate;
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION '% %: el usuario no está activo', p_que, p_usuario USING ERRCODE = p_sqlstate;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_usuario) THEN
    RAISE EXCEPTION '% %: no es miembro del proyecto', p_que, p_usuario USING ERRCODE = p_sqlstate;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. Crear una OT de Mantenimiento (D-233 a D-246; PR-020)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_create_work_order_mantenimiento(
  p_project_id uuid,
  p_tree_id uuid,
  p_incident_id uuid,
  p_accion_solicitada text,
  p_subtipo_accion text,
  p_motivo text,
  p_prioridad text,
  p_observaciones text,
  p_responsable_accion_id uuid,
  p_requiere_revision_inspector boolean,
  p_inspector_revisor_id uuid,
  p_creado_por uuid,
  p_fecha_creacion_ot date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subtipos text[];
  v_tree_project_id uuid;
  v_incident_project_id uuid;
  v_revision boolean;
  v_wo record;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_creado_por THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;
  PERFORM public.fn_assert_miembro_con_rol(p_creado_por, p_project_id, 'usuario_municipal', 'Quien crea la OT', 'SV072');
  -- D-244: en Mantenimiento, el responsable es un Encargado de mantención.
  PERFORM public.fn_assert_miembro_con_rol(p_responsable_accion_id, p_project_id, 'encargado_mantencion', 'El responsable (D-244)', 'SV072');

  IF p_accion_solicitada NOT IN ('poda', 'riego', 'descompactacion', 'manejo_fitosanitario', 'tala_retiro',
                                 'reparacion_alcorque', 'soporte_tutorado', 'otra_intervencion') THEN
    RAISE EXCEPTION 'accion_solicitada (%) no es una acción de Mantenimiento (D-235)', p_accion_solicitada USING ERRCODE = 'SV072';
  END IF;
  v_subtipos := public.fn_subtipos_mantenimiento(p_accion_solicitada);
  IF v_subtipos IS NULL AND p_subtipo_accion IS NOT NULL THEN
    RAISE EXCEPTION 'La acción % no tiene subtipos: subtipo_accion debe quedar vacío (D-236)', p_accion_solicitada USING ERRCODE = 'SV072';
  END IF;
  IF v_subtipos IS NOT NULL AND (p_subtipo_accion IS NULL OR NOT p_subtipo_accion = ANY (v_subtipos)) THEN
    RAISE EXCEPTION 'subtipo_accion es obligatorio y debe ser uno de % para la acción % (D-236)', v_subtipos, p_accion_solicitada USING ERRCODE = 'SV072';
  END IF;

  IF p_tree_id IS NULL THEN
    RAISE EXCEPTION 'tree_id es obligatorio en una OT de Mantenimiento' USING ERRCODE = 'SV072';
  END IF;
  SELECT project_id INTO v_tree_project_id FROM public.trees WHERE id = p_tree_id;
  IF v_tree_project_id IS DISTINCT FROM p_project_id THEN
    RAISE EXCEPTION 'El árbol % no existe en el proyecto de la orden de trabajo', p_tree_id USING ERRCODE = 'SV072';
  END IF;
  IF p_incident_id IS NOT NULL THEN
    SELECT project_id INTO v_incident_project_id FROM public.incidents WHERE id = p_incident_id;
    IF v_incident_project_id IS DISTINCT FROM p_project_id THEN
      RAISE EXCEPTION 'La incidencia % no existe en el proyecto de la orden de trabajo', p_incident_id USING ERRCODE = 'SV072';
    END IF;
  END IF;
  IF p_prioridad IS NULL OR p_prioridad NOT IN ('baja', 'media', 'alta', 'critica') THEN
    RAISE EXCEPTION 'prioridad es obligatoria: baja, media, alta o critica (D-238)' USING ERRCODE = 'SV072';
  END IF;
  IF p_accion_solicitada = 'otra_intervencion' AND btrim(COALESCE(p_observaciones, '')) = '' THEN
    RAISE EXCEPTION 'observaciones es obligatoria para Otra_Intervención (D-246)' USING ERRCODE = 'SV072';
  END IF;

  -- PR-020: Tala y Retiro_tocón exigen revisión; en lo demás, valor inicial No.
  v_revision := p_subtipo_accion IN ('tala', 'retiro_tocon') OR COALESCE(p_requiere_revision_inspector, false);
  IF v_revision THEN
    IF p_inspector_revisor_id IS NULL THEN
      RAISE EXCEPTION 'inspector_revisor_id es obligatorio cuando la OT requiere revisión del Inspector' USING ERRCODE = 'SV072';
    END IF;
    PERFORM public.fn_assert_miembro_con_rol(p_inspector_revisor_id, p_project_id, 'inspector', 'El Inspector revisor', 'SV072');
  ELSIF p_inspector_revisor_id IS NOT NULL THEN
    RAISE EXCEPTION 'inspector_revisor_id solo se asigna cuando la OT requiere revisión del Inspector' USING ERRCODE = 'SV072';
  END IF;

  INSERT INTO public.work_orders (
    project_id, tree_id, incident_id, tipo_ot, accion_solicitada, subtipo_accion, motivo, prioridad, observaciones,
    fecha_creacion_ot, ot_creado_por, responsable_accion_id, requiere_revision_inspector, inspector_revisor_id
  ) VALUES (
    p_project_id, p_tree_id, p_incident_id, 'mantenimiento', p_accion_solicitada, p_subtipo_accion, NULLIF(btrim(p_motivo), ''), p_prioridad,
    NULLIF(btrim(p_observaciones), ''), p_fecha_creacion_ot, p_creado_por, p_responsable_accion_id, v_revision,
    CASE WHEN v_revision THEN p_inspector_revisor_id END
  )
  RETURNING id, codigo_ot, estado_ot, requiere_revision_inspector, inspector_revisor_id INTO v_wo;

  RETURN jsonb_build_object('id', v_wo.id, 'codigo_ot', v_wo.codigo_ot, 'estado_ot', v_wo.estado_ot,
    'requiere_revision_inspector', v_wo.requiere_revision_inspector, 'inspector_revisor_id', v_wo.inspector_revisor_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Transiciones: también Mantenimiento, por su Encargado (CC-050)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transition_work_order_estado(
  p_work_order_id uuid,
  p_nuevo_estado text,
  p_fecha_accion_programada date,
  p_usuario uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_ot text;
  v_tipo_ot text;
  v_responsable_accion_id uuid;
  v_fecha_creacion_ot date;
  v_rol text;
  v_activo boolean;
  v_rol_esperado text;
BEGIN
  SELECT estado_ot, tipo_ot, responsable_accion_id, fecha_creacion_ot
  INTO v_estado_ot, v_tipo_ot, v_responsable_accion_id, v_fecha_creacion_ot
  FROM public.work_orders WHERE id = p_work_order_id;

  IF v_estado_ot IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV059';
  END IF;
  -- D-244: Inspector en Inspección; Encargado de mantención en Mantenimiento.
  v_rol_esperado := CASE v_tipo_ot WHEN 'inspeccion' THEN 'inspector' ELSE 'encargado_mantencion' END;
  IF v_responsable_accion_id IS NULL OR v_responsable_accion_id <> p_usuario THEN
    RAISE EXCEPTION 'El usuario % no es el responsable asignado de la orden de trabajo % (responsable actual: %)',
      p_usuario, p_work_order_id, v_responsable_accion_id
      USING ERRCODE = 'SV059';
  END IF;

  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_usuario;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_usuario USING ERRCODE = 'SV059';
  END IF;
  IF v_rol <> v_rol_esperado THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol % (rol actual: %)', p_usuario, v_rol_esperado, v_rol USING ERRCODE = 'SV059';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_usuario USING ERRCODE = 'SV059';
  END IF;

  IF v_estado_ot = 'pendiente' AND p_nuevo_estado = 'programada' THEN
    IF p_fecha_accion_programada IS NULL THEN
      RAISE EXCEPTION 'fecha_accion_programada es obligatoria al pasar a Programada (D-241, CC-050)' USING ERRCODE = 'SV059';
    END IF;
    IF p_fecha_accion_programada < v_fecha_creacion_ot THEN
      RAISE EXCEPTION 'fecha_accion_programada (%) no puede ser anterior a la fecha de creación de la orden de trabajo (%) (D-241)',
        p_fecha_accion_programada, v_fecha_creacion_ot
        USING ERRCODE = 'SV059';
    END IF;
    UPDATE public.work_orders
      SET estado_ot = 'programada', fecha_accion_programada = p_fecha_accion_programada
      WHERE id = p_work_order_id;
  ELSIF v_estado_ot = 'programada' AND p_nuevo_estado = 'en_ejecucion' THEN
    UPDATE public.work_orders SET estado_ot = 'en_ejecucion' WHERE id = p_work_order_id;
  ELSE
    RAISE EXCEPTION 'Transición % -> % no permitida (CC-050: solo Pendiente->Programada->En ejecución, una a la vez)',
      v_estado_ot, p_nuevo_estado
      USING ERRCODE = 'SV059';
  END IF;

  RETURN jsonb_build_object('work_order_id', p_work_order_id, 'estado_ot', p_nuevo_estado);
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Cambiar el Inspector revisor
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_reassign_inspector_revisor(p_work_order_id uuid, p_nuevo_revisor_id uuid, p_usuario uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo record;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;
  SELECT id, project_id, tipo_ot, estado_ot, requiere_revision_inspector INTO v_wo
  FROM public.work_orders WHERE id = p_work_order_id FOR UPDATE;
  IF v_wo.id IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV072';
  END IF;
  IF v_wo.tipo_ot <> 'mantenimiento' OR v_wo.requiere_revision_inspector IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo una OT de Mantenimiento que requiere revisión tiene Inspector revisor' USING ERRCODE = 'SV072';
  END IF;
  IF v_wo.estado_ot IN ('completada', 'cancelada') THEN
    RAISE EXCEPTION 'No se cambia el revisor de una orden de trabajo % (CC-050)', v_wo.estado_ot USING ERRCODE = 'SV072';
  END IF;
  PERFORM public.fn_assert_miembro_con_rol(p_usuario, v_wo.project_id, 'usuario_municipal', 'Quien cambia el revisor', 'SV072');
  PERFORM public.fn_assert_miembro_con_rol(p_nuevo_revisor_id, v_wo.project_id, 'inspector', 'El Inspector revisor', 'SV072');
  UPDATE public.work_orders SET inspector_revisor_id = p_nuevo_revisor_id WHERE id = p_work_order_id;
  RETURN jsonb_build_object('work_order_id', p_work_order_id, 'inspector_revisor_id', p_nuevo_revisor_id);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Registro de ejecución del Encargado (D-213 a D-224; PR-020)
-- ---------------------------------------------------------------------
-- p_fotos: [{"id": uuid, "storage_path": text}, ...], al menos una (D-224);
-- el backend las sube antes y las borra si esta función falla.
CREATE FUNCTION public.fn_registrar_ejecucion_mantenimiento(
  p_work_order_id uuid,
  p_usuario uuid,
  p_fecha_ejecucion date,
  p_accion_ejecutada text,
  p_subtipo_ejecutado text,
  p_resultado text,
  p_observaciones text,
  p_requiere_seguimiento boolean,
  p_fecha_seguimiento date,
  p_fotos jsonb,
  p_hoy date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wo record;
  v_subtipos text[];
  v_mr record;
  v_foto jsonb;
  v_completa boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;
  SELECT id, project_id, tree_id, tipo_ot, estado_ot, accion_solicitada, responsable_accion_id, requiere_revision_inspector INTO v_wo
  FROM public.work_orders WHERE id = p_work_order_id FOR UPDATE;
  IF v_wo.id IS NULL THEN
    RAISE EXCEPTION 'La orden de trabajo % no existe', p_work_order_id USING ERRCODE = 'SV073';
  END IF;
  IF v_wo.tipo_ot <> 'mantenimiento' THEN
    RAISE EXCEPTION 'La orden de trabajo no es de Mantenimiento' USING ERRCODE = 'SV073';
  END IF;
  IF v_wo.responsable_accion_id IS DISTINCT FROM p_usuario THEN
    RAISE EXCEPTION 'Solo el Encargado de mantención responsable registra la ejecución (D-217)' USING ERRCODE = 'SV073';
  END IF;
  PERFORM public.fn_assert_miembro_con_rol(p_usuario, v_wo.project_id, 'encargado_mantencion', 'Quien ejecuta (D-217)', 'SV073');
  IF v_wo.estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo no está En ejecución (estado actual: %)', v_wo.estado_ot USING ERRCODE = 'SV073';
  END IF;
  IF EXISTS (SELECT 1 FROM public.maintenance_records WHERE work_order_id = p_work_order_id AND estado_revision = 'pendiente_revision') THEN
    RAISE EXCEPTION 'Hay una ejecución pendiente de revisión: se registra otra solo después de la revisión' USING ERRCODE = 'SV073';
  END IF;

  IF p_fecha_ejecucion IS NULL THEN
    RAISE EXCEPTION 'fecha_ejecucion es obligatoria (D-216)' USING ERRCODE = 'SV073';
  END IF;
  IF p_accion_ejecutada IS DISTINCT FROM v_wo.accion_solicitada THEN
    RAISE EXCEPTION 'accion_ejecutada debe corresponder a la acción solicitada de la OT (%) (D-218)', v_wo.accion_solicitada USING ERRCODE = 'SV073';
  END IF;
  v_subtipos := public.fn_subtipos_mantenimiento(p_accion_ejecutada);
  IF v_subtipos IS NULL AND p_subtipo_ejecutado IS NOT NULL THEN
    RAISE EXCEPTION 'La acción % no tiene subtipos: subtipo_ejecutado debe quedar vacío (D-219)', p_accion_ejecutada USING ERRCODE = 'SV073';
  END IF;
  IF v_subtipos IS NOT NULL AND (p_subtipo_ejecutado IS NULL OR NOT p_subtipo_ejecutado = ANY (v_subtipos)) THEN
    RAISE EXCEPTION 'subtipo_ejecutado es obligatorio y debe ser uno de % (D-219)', v_subtipos USING ERRCODE = 'SV073';
  END IF;
  IF p_resultado IS NULL OR p_resultado NOT IN ('ejecutado_completamente', 'ejecutado_parcialmente', 'no_ejecutado') THEN
    RAISE EXCEPTION 'resultado es obligatorio: ejecutado_completamente, ejecutado_parcialmente o no_ejecutado (D-220)' USING ERRCODE = 'SV073';
  END IF;
  IF p_accion_ejecutada = 'otra_intervencion' AND btrim(COALESCE(p_observaciones, '')) = '' THEN
    RAISE EXCEPTION 'observaciones es obligatoria para Otra_Intervención (D-218)' USING ERRCODE = 'SV073';
  END IF;
  IF p_requiere_seguimiento IS NULL THEN
    RAISE EXCEPTION 'requiere_seguimiento es obligatorio (D-222)' USING ERRCODE = 'SV073';
  END IF;
  IF p_requiere_seguimiento AND p_fecha_seguimiento IS NULL THEN
    RAISE EXCEPTION 'fecha_seguimiento es obligatoria con requiere_seguimiento = Sí (D-223)' USING ERRCODE = 'SV073';
  END IF;
  IF NOT p_requiere_seguimiento AND p_fecha_seguimiento IS NOT NULL THEN
    RAISE EXCEPTION 'fecha_seguimiento solo se registra con requiere_seguimiento = Sí (D-223)' USING ERRCODE = 'SV073';
  END IF;
  IF p_fecha_seguimiento IS NOT NULL AND p_fecha_seguimiento <= p_fecha_ejecucion THEN
    RAISE EXCEPTION 'fecha_seguimiento debe ser posterior a fecha_ejecucion (D-223)' USING ERRCODE = 'SV073';
  END IF;
  IF p_fotos IS NULL OR jsonb_typeof(p_fotos) <> 'array' OR jsonb_array_length(p_fotos) = 0 THEN
    RAISE EXCEPTION 'Debe adjuntar al menos una fotografía de la ejecución (D-224)' USING ERRCODE = 'SV073';
  END IF;

  INSERT INTO public.maintenance_records (
    work_order_id, tree_id, fecha_ejecucion, ejecutado_por, accion_ejecutada, subtipo_ejecutado, resultado,
    observaciones, requiere_seguimiento, fecha_seguimiento, estado_revision
  ) VALUES (
    p_work_order_id, v_wo.tree_id, p_fecha_ejecucion, p_usuario, p_accion_ejecutada, p_subtipo_ejecutado, p_resultado,
    NULLIF(btrim(p_observaciones), ''), p_requiere_seguimiento, p_fecha_seguimiento,
    CASE WHEN v_wo.requiere_revision_inspector THEN 'pendiente_revision' END
  )
  RETURNING id, codigo_mantenimiento, estado_revision INTO v_mr;

  FOR v_foto IN SELECT value FROM jsonb_array_elements(p_fotos) LOOP
    INSERT INTO public.photos (id, tree_id, storage_path, vista, inspection_id, maintenance_record_id, incident_id, uploaded_by)
    VALUES ((v_foto->>'id')::uuid, v_wo.tree_id, v_foto->>'storage_path', NULL, NULL, v_mr.id, NULL, p_usuario);
  END LOOP;

  -- PR-020: sin revisión, el Sistema completa la OT con Ejecutado completamente y la evidencia.
  IF v_wo.requiere_revision_inspector IS NOT TRUE AND p_resultado = 'ejecutado_completamente' THEN
    UPDATE public.work_orders SET estado_ot = 'completada', fecha_completada_ot = p_hoy WHERE id = p_work_order_id;
    v_completa := true;
  END IF;

  RETURN jsonb_build_object('id', v_mr.id, 'codigo_mantenimiento', v_mr.codigo_mantenimiento, 'estado_revision', v_mr.estado_revision,
    'estado_ot', CASE WHEN v_completa THEN 'completada' ELSE 'en_ejecucion' END);
END;
$$;

-- ---------------------------------------------------------------------
-- 7. Revisión del Inspector asignado (D-225 a D-230; PR-020; AM-22)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_revisar_mantenimiento(
  p_maintenance_record_id uuid,
  p_usuario uuid,
  p_estado_revision text,
  p_observaciones_revision text,
  p_requiere_correccion boolean,
  p_fecha_limite_correccion date,
  p_hoy date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mr record;
  v_wo record;
  v_obs text := NULLIF(btrim(COALESCE(p_observaciones_revision, '')), '');
  v_presencia text;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_usuario THEN
    RAISE EXCEPTION 'No está autorizado a ejecutar esta acción en nombre de otro usuario' USING ERRCODE = '42501';
  END IF;
  SELECT id, work_order_id, tree_id, fecha_ejecucion, subtipo_ejecutado, resultado, estado_revision INTO v_mr
  FROM public.maintenance_records WHERE id = p_maintenance_record_id FOR UPDATE;
  IF v_mr.id IS NULL THEN
    RAISE EXCEPTION 'El registro de mantenimiento % no existe', p_maintenance_record_id USING ERRCODE = 'SV074';
  END IF;
  SELECT id, project_id, estado_ot, requiere_revision_inspector, inspector_revisor_id INTO v_wo
  FROM public.work_orders WHERE id = v_mr.work_order_id FOR UPDATE;
  IF v_wo.requiere_revision_inspector IS NOT TRUE THEN
    RAISE EXCEPTION 'La OT no requiere revisión del Inspector (D-225)' USING ERRCODE = 'SV074';
  END IF;
  IF v_mr.estado_revision IS DISTINCT FROM 'pendiente_revision' THEN
    RAISE EXCEPTION 'El registro ya fue revisado (estado: %)', v_mr.estado_revision USING ERRCODE = 'SV074';
  END IF;
  IF v_wo.estado_ot <> 'en_ejecucion' THEN
    RAISE EXCEPTION 'La orden de trabajo no está En ejecución (estado actual: %)', v_wo.estado_ot USING ERRCODE = 'SV074';
  END IF;
  IF v_wo.inspector_revisor_id IS DISTINCT FROM p_usuario THEN
    RAISE EXCEPTION 'Solo el Inspector revisor asignado a la OT revisa la ejecución' USING ERRCODE = 'SV074';
  END IF;
  PERFORM public.fn_assert_miembro_con_rol(p_usuario, v_wo.project_id, 'inspector', 'Quien revisa (D-226)', 'SV074');

  IF p_estado_revision NOT IN ('aprobado', 'rechazado') THEN
    RAISE EXCEPTION 'estado_revision debe ser aprobado o rechazado (D-225)' USING ERRCODE = 'SV074';
  END IF;
  IF p_estado_revision = 'aprobado' AND v_mr.resultado <> 'ejecutado_completamente' THEN
    RAISE EXCEPTION 'Solo se aprueba una ejecución con resultado Ejecutado completamente (D-220); rechácela para que se corrija' USING ERRCODE = 'SV074';
  END IF;
  IF p_estado_revision = 'rechazado' AND v_obs IS NULL THEN
    RAISE EXCEPTION 'observaciones_revision es obligatoria al rechazar (D-228)' USING ERRCODE = 'SV074';
  END IF;
  IF p_requiere_correccion IS NULL THEN
    RAISE EXCEPTION 'requiere_correccion es obligatorio al revisar (D-229)' USING ERRCODE = 'SV074';
  END IF;
  IF p_requiere_correccion AND p_fecha_limite_correccion IS NULL THEN
    RAISE EXCEPTION 'fecha_limite_correccion es obligatoria con requiere_correccion = Sí (D-230)' USING ERRCODE = 'SV074';
  END IF;
  IF NOT p_requiere_correccion AND p_fecha_limite_correccion IS NOT NULL THEN
    RAISE EXCEPTION 'fecha_limite_correccion solo se registra con requiere_correccion = Sí (D-230)' USING ERRCODE = 'SV074';
  END IF;
  IF p_fecha_limite_correccion IS NOT NULL AND p_fecha_limite_correccion <= p_hoy THEN
    RAISE EXCEPTION 'fecha_limite_correccion debe ser posterior a la fecha de revisión (D-230)' USING ERRCODE = 'SV074';
  END IF;
  IF p_hoy < v_mr.fecha_ejecucion THEN
    RAISE EXCEPTION 'La fecha de revisión no puede ser anterior a fecha_ejecucion (%) (D-227)', v_mr.fecha_ejecucion USING ERRCODE = 'SV074';
  END IF;

  UPDATE public.maintenance_records SET
    estado_revision = p_estado_revision,
    revisado_por = p_usuario,
    fecha_revision = now(),
    observaciones_revision = v_obs,
    requiere_correccion = p_requiere_correccion,
    fecha_limite_correccion = p_fecha_limite_correccion
  WHERE id = p_maintenance_record_id;

  IF p_estado_revision = 'aprobado' THEN
    -- PR-020: con revisión, el Sistema completa la OT al aprobarse.
    UPDATE public.work_orders SET estado_ot = 'completada', fecha_completada_ot = p_hoy WHERE id = v_wo.id;
    -- AM-22: estado_ciclo_vida, copia de la presencia (D-28).
    IF v_mr.subtipo_ejecutado = 'tala' THEN
      UPDATE public.trees SET estado_ciclo_vida = 'tocon' WHERE id = v_mr.tree_id;
      v_presencia := 'talado';
    ELSIF v_mr.subtipo_ejecutado = 'retiro_tocon' THEN
      UPDATE public.trees SET estado_ciclo_vida = 'retirado' WHERE id = v_mr.tree_id;
      v_presencia := 'retirado';
    END IF;
  END IF;

  RETURN jsonb_build_object('id', p_maintenance_record_id, 'estado_revision', p_estado_revision,
    'estado_ot', CASE WHEN p_estado_revision = 'aprobado' THEN 'completada' ELSE 'en_ejecucion' END,
    'estado_presencia', v_presencia);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_subtipos_mantenimiento(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_assert_miembro_con_rol(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_create_work_order_mantenimiento(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, uuid, uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_transition_work_order_estado(uuid, text, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reassign_inspector_revisor(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_registrar_ejecucion_mantenimiento(uuid, uuid, date, text, text, text, text, boolean, date, jsonb, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_revisar_mantenimiento(uuid, uuid, text, text, boolean, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_subtipos_mantenimiento(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_miembro_con_rol(uuid, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_work_order_mantenimiento(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, uuid, uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_transition_work_order_estado(uuid, text, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_reassign_inspector_revisor(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_registrar_ejecucion_mantenimiento(uuid, uuid, date, text, text, text, text, boolean, date, jsonb, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_revisar_mantenimiento(uuid, uuid, text, text, boolean, date, date) TO service_role;
