-- =====================================================================
-- Migración 018h — Crear una OT de Inspección (#58; D-238, D-244, CC-036)
-- =====================================================================
--
-- PROPUESTA — NO APLICAR SIN APROBACIÓN DE LA RESPONSABLE.
--
-- Primer eslabón de la capa backend del #58 que la responsable pidió:
-- "crear OT (Usuario municipal): prioridad propuesta desde la
-- evaluación vigente (D-238), responsable Inspector activo y miembro
-- del proyecto (D-244), id_incidencia opcional (CC-036)".
--
-- Solo OT de tipo Inspección (`tipo_ot = 'inspeccion'`, fijo en esta
-- función) — las de Mantenimiento no son parte del #58 (CC-050: se
-- implementan en el #61, con el Encargado de mantención).
--
-- `fn_create_work_order_inspeccion`: mismo patrón SECURITY DEFINER que
-- el resto de esta fase — una sola invocación atómica, `EXECUTE` solo
-- para `service_role`. Nuevo SQLSTATE `SV060` (crear OT), distinto de
-- `SV058` (borrador de inspección), `SV059` (transición de OT) y
-- `SV046`/`SV057`/`SV265` (alta/sector/superficies) — mismo criterio
-- de un código por función/alcance que ya sigue el resto.
--
-- Validaciones, todas con SV060:
--   (a) `p_creado_por`: debe existir, tener rol `usuario_municipal`,
--       estar activo y ser miembro del proyecto (`project_members`).
--       El backend ya valida esto con `assertProjectRole` antes de
--       invocar la función (igual que el alta municipal, #57); esta
--       función no confía solo en el llamador.
--   (b) `p_responsable_accion_id`: debe existir, tener rol `inspector`,
--       estar activo y ser miembro del proyecto (D-244) — a diferencia
--       de (a), este usuario NO es quien llama a la API (es a quien se
--       asigna la OT), así que `assertProjectRole` (que solo verifica
--       al usuario autenticado) no alcanza: esta función hace el join
--       manual contra `user_profiles`/`roles`/`project_members`, mismo
--       patrón que `fn_save_inspection_draft`/`fn_transition_work_order_estado`.
--   (c) `p_accion_solicitada`/`p_subtipo_accion`: mismos pares
--       tipo/subtipo que `fn_save_inspection_draft` (D-196/D-197,
--       catalogs.ts) — accion_solicitada de la OT es lo que después
--       debe igualar `tipo_inspeccion_realizada` de cada inspección.
--   (d) `p_tree_id`: obligatorio y debe pertenecer al proyecto, salvo
--       Levantamiento (debe ser NULL — D-232/AMD-19; el árbol se
--       vincula después, por inspección, D-193). La coherencia
--       árbol-proyecto no tenía antes ninguna FK ni CHECK a nivel de
--       `work_orders` — se aplica aquí el mismo criterio ya exigido en
--       otras partes del modelo (D-193, AMD-32/CC-041: "el sector de
--       un árbol debe ser del mismo proyecto").
--   (e) `p_incident_id` (CC-036, opcional, D-233): si viene, debe
--       existir y pertenecer al mismo proyecto.
--   (f) `p_prioridad`: uno de los 4 valores del dominio de D-238
--       (`baja`/`media`/`alta`/`critica` — nunca `no_determinado`, que
--       es un resultado de clasificación, no una opción que el Usuario
--       municipal pueda elegir). El valor por defecto propuesto desde
--       la evaluación vigente del árbol (D-238: "si el árbol tiene una
--       evaluación vigente, proponer por defecto su
--       clasificacion_prioridad") lo calcula el backend (TS) antes de
--       llamar a esta función — igual que `sector_id` en el alta
--       municipal: la función solo valida que el valor final (el que
--       el Usuario municipal confirmó, igual a la propuesta o no) sea
--       uno de los 4 válidos.
--   (g) `p_observaciones`: obligatoria para accion_solicitada
--       'otra'/'otra_intervencion' o Levantamiento (D-246) — repetida
--       aquí con mensaje claro; el CHECK físico
--       (`chk_work_orders_observaciones`) ya la exige, pero con un
--       error genérico (23514).
--
-- `fecha_creacion_ot` la calcula el backend en hora de Chile
-- (`hoyEnChile()`) y la pasa como parámetro — la función no usa
-- `CURRENT_DATE` (sería UTC), mismo criterio que `fecha_registro` en
-- el alta municipal y en `fn_save_inspection_draft`.
--
-- `estado_ot` no es parámetro: siempre nace en 'pendiente' (DEFAULT de
-- la columna, D-239). `fecha_accion_programada` tampoco: se fija al
-- transicionar a Programada (`fn_transition_work_order_estado`, 018g).

CREATE FUNCTION public.fn_create_work_order_inspeccion(
  p_project_id uuid,
  p_tree_id uuid,
  p_incident_id uuid,
  p_accion_solicitada text,
  p_subtipo_accion text,
  p_motivo text,
  p_prioridad text,
  p_observaciones text,
  p_responsable_accion_id uuid,
  p_creado_por uuid,
  p_fecha_creacion_ot date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol text;
  v_activo boolean;
  v_subtipo_valido boolean;
  v_tree_project_id uuid;
  v_incident_project_id uuid;
  v_wo record;
BEGIN
  -- (a) creado_por: usuario_municipal, activo, miembro del proyecto.
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_creado_por;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_creado_por USING ERRCODE = 'SV060';
  END IF;
  IF v_rol <> 'usuario_municipal' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Usuario municipal (rol actual: %)', p_creado_por, v_rol USING ERRCODE = 'SV060';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_creado_por USING ERRCODE = 'SV060';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_creado_por) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto %', p_creado_por, p_project_id USING ERRCODE = 'SV060';
  END IF;

  -- (b) responsable_accion_id: inspector, activo, miembro del proyecto (D-244).
  SELECT r.nombre, up.activo INTO v_rol, v_activo
  FROM public.user_profiles up JOIN public.roles r ON r.id = up.role_id
  WHERE up.id = p_responsable_accion_id;

  IF v_rol IS NULL THEN
    RAISE EXCEPTION 'El usuario % no existe', p_responsable_accion_id USING ERRCODE = 'SV060';
  END IF;
  IF v_rol <> 'inspector' THEN
    RAISE EXCEPTION 'El usuario % no tiene el rol Inspector (rol actual: %, D-244)', p_responsable_accion_id, v_rol USING ERRCODE = 'SV060';
  END IF;
  IF NOT v_activo THEN
    RAISE EXCEPTION 'El usuario % no está activo', p_responsable_accion_id USING ERRCODE = 'SV060';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_responsable_accion_id) THEN
    RAISE EXCEPTION 'El usuario % no es miembro del proyecto % (D-244)', p_responsable_accion_id, p_project_id USING ERRCODE = 'SV060';
  END IF;

  -- (c) accion_solicitada / subtipo_accion — mismos pares que fn_save_inspection_draft (D-196/D-197).
  v_subtipo_valido := CASE p_accion_solicitada
    WHEN 'evaluacion_inicial' THEN p_subtipo_accion IS NULL
    WHEN 'levantamiento'      THEN p_subtipo_accion IS NULL
    WHEN 'reevaluacion'       THEN p_subtipo_accion IS NULL OR p_subtipo_accion IN ('seguimiento', 'post_intervencion')
    WHEN 'evaluacion_instrumental' THEN p_subtipo_accion IS NULL OR p_subtipo_accion IN ('tomografia_sonica', 'resistografia', 'otra_instrumental')
    WHEN 'monitoreo'          THEN p_subtipo_accion IN ('fitosanitario', 'estructural', 'vitalidad')
    ELSE false
  END;
  IF NOT v_subtipo_valido THEN
    RAISE EXCEPTION 'subtipo_accion (%) no es válido para accion_solicitada (%)', p_subtipo_accion, p_accion_solicitada
      USING ERRCODE = 'SV060';
  END IF;

  -- (d) tree_id — obligatorio y del mismo proyecto, salvo Levantamiento (NULL, D-232/AMD-19).
  IF p_accion_solicitada = 'levantamiento' THEN
    IF p_tree_id IS NOT NULL THEN
      RAISE EXCEPTION 'En una OT de Levantamiento, tree_id debe quedar vacío (D-232; AMD-19)' USING ERRCODE = 'SV060';
    END IF;
  ELSE
    IF p_tree_id IS NULL THEN
      RAISE EXCEPTION 'tree_id es obligatorio salvo en una OT de Levantamiento' USING ERRCODE = 'SV060';
    END IF;
    SELECT project_id INTO v_tree_project_id FROM public.trees WHERE id = p_tree_id;
    IF v_tree_project_id IS NULL THEN
      RAISE EXCEPTION 'El árbol % no existe', p_tree_id USING ERRCODE = 'SV060';
    END IF;
    IF v_tree_project_id <> p_project_id THEN
      RAISE EXCEPTION 'El árbol % no pertenece al proyecto de la orden de trabajo', p_tree_id USING ERRCODE = 'SV060';
    END IF;
  END IF;

  -- (e) incident_id — opcional (CC-036, D-233); si viene, del mismo proyecto.
  IF p_incident_id IS NOT NULL THEN
    SELECT project_id INTO v_incident_project_id FROM public.incidents WHERE id = p_incident_id;
    IF v_incident_project_id IS NULL THEN
      RAISE EXCEPTION 'La incidencia % no existe', p_incident_id USING ERRCODE = 'SV060';
    END IF;
    IF v_incident_project_id <> p_project_id THEN
      RAISE EXCEPTION 'La incidencia % no pertenece al proyecto de la orden de trabajo', p_incident_id USING ERRCODE = 'SV060';
    END IF;
  END IF;

  -- (f) prioridad — dominio de D-238, nunca no_determinado.
  IF p_prioridad NOT IN ('baja', 'media', 'alta', 'critica') THEN
    RAISE EXCEPTION 'prioridad (%) no es un valor válido (baja/media/alta/critica, D-238)', p_prioridad USING ERRCODE = 'SV060';
  END IF;

  -- (g) observaciones — obligatoria para Otra/Otra_Intervención/Levantamiento (D-246).
  IF p_accion_solicitada IN ('levantamiento', 'otra', 'otra_intervencion')
     AND (p_observaciones IS NULL OR btrim(p_observaciones) = '') THEN
    RAISE EXCEPTION 'observaciones es obligatoria para accion_solicitada = % (D-246)', p_accion_solicitada
      USING ERRCODE = 'SV060';
  END IF;

  INSERT INTO public.work_orders (
    project_id, tree_id, incident_id, tipo_ot, accion_solicitada, subtipo_accion,
    motivo, prioridad, observaciones, fecha_creacion_ot, ot_creado_por, responsable_accion_id
  ) VALUES (
    p_project_id, p_tree_id, p_incident_id, 'inspeccion', p_accion_solicitada, p_subtipo_accion,
    p_motivo, p_prioridad, p_observaciones, p_fecha_creacion_ot, p_creado_por, p_responsable_accion_id
  )
  RETURNING id, codigo_ot, estado_ot, fecha_creacion_ot, project_id, tree_id, incident_id,
    accion_solicitada, subtipo_accion, prioridad, responsable_accion_id
  INTO v_wo;

  RETURN jsonb_build_object(
    'id', v_wo.id,
    'codigo_ot', v_wo.codigo_ot,
    'estado_ot', v_wo.estado_ot,
    'fecha_creacion_ot', v_wo.fecha_creacion_ot,
    'project_id', v_wo.project_id,
    'tree_id', v_wo.tree_id,
    'incident_id', v_wo.incident_id,
    'accion_solicitada', v_wo.accion_solicitada,
    'subtipo_accion', v_wo.subtipo_accion,
    'prioridad', v_wo.prioridad,
    'responsable_accion_id', v_wo.responsable_accion_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_work_order_inspeccion(
  uuid, uuid, uuid, text, text, text, text, text, uuid, uuid, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_work_order_inspeccion(
  uuid, uuid, uuid, text, text, text, text, text, uuid, uuid, date
) TO service_role;
