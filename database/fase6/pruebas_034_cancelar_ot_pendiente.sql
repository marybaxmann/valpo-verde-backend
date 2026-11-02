-- =====================================================================
-- Pruebas de la migración 034 (CC-050: cancelar una OT Pendiente).
-- Base de PRUEBAS (gmlbmyreoxgoqrolhyxo), proyecto QA.
--
-- Reversibilidad: el bloque SIEMPRE termina en una excepción, así que
-- toda la transacción se revierte. Si todo pasa, la excepción es
-- «PRUEBAS_034_OK: R1 R9 R10 R2 R3 R4 R5 R6 R7 R8 R11»; si algo falla, es el
-- mensaje de esa prueba.
--
-- No consume la numeración de OT: las OT de prueba se insertan con un
-- codigo_ot propio (OT-I-PRUEBA034-n / OT-M-PRUEBA034-n), y el trigger
-- de código solo usa la secuencia cuando codigo_ot es NULL. No modifica
-- OT ni árboles existentes. No envía correos (los avisos de la 033 se
-- crean dentro de la transacción y se revierten).
--
-- Uso:
--   1. ANTES de aplicar la 034: debe fallar en R1 con
--      chk_work_orders_fecha_programada (reproduce el defecto).
--   2. Después de aplicar: PRUEBAS_034_OK.
--   3. Revertir (down): vuelve a fallar en R1.
--   4. Reaplicar: PRUEBAS_034_OK.
--
--   R1  cancelar OT de Inspección Pendiente → cancelada, sin fecha,
--       auditoría completa, aviso ot_cancelada al responsable (033).
--   R2  cancelar OT de Mantenimiento Pendiente → igual que R1.
--   R3  cancelar desde Programada → conserva su fecha.
--   R4  cancelar desde En ejecución → conserva su fecha.
--   R5  Programada sin fecha → rechazado (CHECK).
--   R6  En ejecución sin fecha → rechazado (CHECK).
--   R7  Completada sin fecha programada → rechazado (CHECK).
--   R8  Cancelada sin motivo → rechazado (chk_work_orders_cancelada, sin cambios).
--   R9  cancelar una OT ya cancelada → SV066 (sin cambios).
--   R10 definición exacta del CHECK nuevo.
--   R11 Inspector intenta cancelar una OT Pendiente → SV066 (sin cambios).
-- =====================================================================
DO $$
DECLARE
  c_project   CONSTANT uuid := 'cddf7c71-6879-4c17-8498-a91d7baaa9b2'; -- QA
  c_tree      CONSTANT uuid := '2d991022-cd7e-4aa5-a90f-2313ed26254c'; -- A-000346 (QA)
  c_municipal CONSTANT uuid := '395decaf-08d4-46d8-9299-d4be55ab8719';
  c_inspector CONSTANT uuid := '141f83df-f609-4399-bf52-5d8721826097';
  c_encargado CONSTANT uuid := '689c6e09-97e3-4d3a-a76d-19c9f4eb3054';
  v_def  text;
  v_ot   uuid;
  v_row  record;
  v_n    int;
  v_con  text;
  v_ok   text := '';
  v_seq_i bigint;
  v_seq_m bigint;
BEGIN
  SELECT last_value INTO v_seq_i FROM public.work_orders_codigo_i_seq;
  SELECT last_value INTO v_seq_m FROM public.work_orders_codigo_m_seq;

  -- R1 Inspección Pendiente
  INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                  ot_creado_por, responsable_accion_id)
  VALUES ('OT-I-PRUEBA034-1', c_project, c_tree, 'inspeccion', 'reevaluacion', 'seguimiento', 'baja', c_municipal, c_inspector)
  RETURNING id INTO v_ot;
  PERFORM public.fn_cancel_work_order(v_ot, 'Prueba 034 R1', c_municipal);
  SELECT * INTO v_row FROM public.work_orders WHERE id = v_ot;
  IF v_row.estado_ot <> 'cancelada' OR v_row.fecha_accion_programada IS NOT NULL
     OR v_row.motivo_cancelacion <> 'Prueba 034 R1' OR v_row.cancelado_por <> c_municipal OR v_row.fecha_cancelacion IS NULL THEN
    RAISE EXCEPTION 'R1 falló: %', row_to_json(v_row);
  END IF;
  SELECT count(*) INTO v_n FROM public.notifications
  WHERE work_order_id = v_ot AND tipo = 'ot_cancelada' AND user_id = c_inspector;
  IF v_n <> 1 THEN RAISE EXCEPTION 'R1 falló: % avisos ot_cancelada', v_n; END IF;
  v_ok := v_ok || 'R1 ';

  -- R9 cancelar de nuevo (sobre la OT de R1)
  BEGIN
    PERFORM public.fn_cancel_work_order(v_ot, 'Repetida', c_municipal);
    RAISE EXCEPTION 'R9 falló: aceptó cancelar una OT cancelada';
  EXCEPTION WHEN SQLSTATE 'SV066' THEN v_ok := v_ok || 'R9 ';
  END;

  -- R10 definición
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
  WHERE conrelid = 'public.work_orders'::regclass AND conname = 'chk_work_orders_fecha_programada';
  IF v_def IS DISTINCT FROM
     'CHECK (((estado_ot = ANY (ARRAY[''pendiente''::text, ''cancelada''::text])) OR (fecha_accion_programada IS NOT NULL)))' THEN
    RAISE EXCEPTION 'R10 falló: definición %', v_def;
  END IF;
  v_ok := v_ok || 'R10 ';

  -- R2 Mantenimiento Pendiente
  INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                  ot_creado_por, responsable_accion_id, requiere_revision_inspector)
  VALUES ('OT-M-PRUEBA034-2', c_project, c_tree, 'mantenimiento', 'poda', 'sanitaria', 'baja', c_municipal, c_encargado, false)
  RETURNING id INTO v_ot;
  PERFORM public.fn_cancel_work_order(v_ot, 'Prueba 034 R2', c_municipal);
  SELECT * INTO v_row FROM public.work_orders WHERE id = v_ot;
  IF v_row.estado_ot <> 'cancelada' OR v_row.fecha_accion_programada IS NOT NULL OR v_row.fecha_cancelacion IS NULL THEN
    RAISE EXCEPTION 'R2 falló: %', row_to_json(v_row);
  END IF;
  SELECT count(*) INTO v_n FROM public.notifications
  WHERE work_order_id = v_ot AND tipo = 'ot_cancelada' AND user_id = c_encargado;
  IF v_n <> 1 THEN RAISE EXCEPTION 'R2 falló: % avisos ot_cancelada', v_n; END IF;
  v_ok := v_ok || 'R2 ';

  -- R3 Programada → conserva la fecha
  INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                  ot_creado_por, responsable_accion_id, estado_ot, fecha_accion_programada)
  VALUES ('OT-I-PRUEBA034-3', c_project, c_tree, 'inspeccion', 'reevaluacion', 'seguimiento', 'baja', c_municipal, c_inspector,
          'programada', DATE '2026-11-20')
  RETURNING id INTO v_ot;
  PERFORM public.fn_cancel_work_order(v_ot, 'Prueba 034 R3', c_municipal);
  SELECT * INTO v_row FROM public.work_orders WHERE id = v_ot;
  IF v_row.estado_ot <> 'cancelada' OR v_row.fecha_accion_programada IS DISTINCT FROM DATE '2026-11-20' THEN
    RAISE EXCEPTION 'R3 falló: %', row_to_json(v_row);
  END IF;
  v_ok := v_ok || 'R3 ';

  -- R4 En ejecución → conserva la fecha
  INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                  ot_creado_por, responsable_accion_id, estado_ot, fecha_accion_programada)
  VALUES ('OT-M-PRUEBA034-4', c_project, c_tree, 'mantenimiento', 'riego', 'programado', 'baja', c_municipal, c_encargado,
          'en_ejecucion', DATE '2026-11-03')
  RETURNING id INTO v_ot;
  PERFORM public.fn_cancel_work_order(v_ot, 'Prueba 034 R4', c_municipal);
  SELECT * INTO v_row FROM public.work_orders WHERE id = v_ot;
  IF v_row.estado_ot <> 'cancelada' OR v_row.fecha_accion_programada IS DISTINCT FROM DATE '2026-11-03' THEN
    RAISE EXCEPTION 'R4 falló: %', row_to_json(v_row);
  END IF;
  v_ok := v_ok || 'R4 ';

  -- R5 Programada sin fecha
  INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                  ot_creado_por, responsable_accion_id)
  VALUES ('OT-I-PRUEBA034-5', c_project, c_tree, 'inspeccion', 'reevaluacion', 'seguimiento', 'baja', c_municipal, c_inspector)
  RETURNING id INTO v_ot;
  BEGIN
    UPDATE public.work_orders SET estado_ot = 'programada' WHERE id = v_ot;
    RAISE EXCEPTION 'R5 falló: aceptó Programada sin fecha';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
    IF v_con <> 'chk_work_orders_fecha_programada' THEN RAISE EXCEPTION 'R5 falló: restricción %', v_con; END IF;
    v_ok := v_ok || 'R5 ';
  END;

  -- R6 En ejecución sin fecha
  BEGIN
    UPDATE public.work_orders SET estado_ot = 'en_ejecucion' WHERE id = v_ot;
    RAISE EXCEPTION 'R6 falló: aceptó En ejecución sin fecha';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
    IF v_con <> 'chk_work_orders_fecha_programada' THEN RAISE EXCEPTION 'R6 falló: restricción %', v_con; END IF;
    v_ok := v_ok || 'R6 ';
  END;

  -- R7 Completada sin fecha programada (INSERT: el trigger de completada solo actúa en UPDATE)
  BEGIN
    INSERT INTO public.work_orders (codigo_ot, project_id, tree_id, tipo_ot, accion_solicitada, subtipo_accion, prioridad,
                                    ot_creado_por, responsable_accion_id, estado_ot, fecha_completada_ot)
    VALUES ('OT-I-PRUEBA034-7', c_project, c_tree, 'inspeccion', 'reevaluacion', 'seguimiento', 'baja', c_municipal, c_inspector,
            'completada', CURRENT_DATE);
    RAISE EXCEPTION 'R7 falló: aceptó Completada sin fecha programada';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
    IF v_con <> 'chk_work_orders_fecha_programada' THEN RAISE EXCEPTION 'R7 falló: restricción %', v_con; END IF;
    v_ok := v_ok || 'R7 ';
  END;

  -- R8 Cancelada sin motivo (sin pasar por la función)
  BEGIN
    UPDATE public.work_orders SET estado_ot = 'cancelada' WHERE id = v_ot;
    RAISE EXCEPTION 'R8 falló: aceptó Cancelada sin motivo';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
    IF v_con <> 'chk_work_orders_cancelada' THEN RAISE EXCEPTION 'R8 falló: restricción %', v_con; END IF;
    v_ok := v_ok || 'R8 ';
  END;

  -- R11 Inspector no puede cancelar (OT de R5, sigue Pendiente)
  BEGIN
    PERFORM public.fn_cancel_work_order(v_ot, 'Prueba 034 R11', c_inspector);
    RAISE EXCEPTION 'R11 falló: un Inspector canceló la OT';
  EXCEPTION WHEN SQLSTATE 'SV066' THEN v_ok := v_ok || 'R11 ';
  END;

  -- Numeración intacta
  SELECT count(*) INTO v_n FROM public.work_orders_codigo_i_seq WHERE last_value <> v_seq_i;
  IF v_n <> 0 THEN RAISE EXCEPTION 'Se consumió la secuencia de Inspección'; END IF;
  SELECT count(*) INTO v_n FROM public.work_orders_codigo_m_seq WHERE last_value <> v_seq_m;
  IF v_n <> 0 THEN RAISE EXCEPTION 'Se consumió la secuencia de Mantenimiento'; END IF;

  RAISE EXCEPTION 'PRUEBAS_034_OK: %', btrim(v_ok);
END;
$$;
