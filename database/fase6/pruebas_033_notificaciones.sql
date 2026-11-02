-- =====================================================================
-- Pruebas de la migración 033 (CC-051, #63). Correr SOLO después de
-- aplicarla en la base de PRUEBAS (gmlbmyreoxgoqrolhyxo).
--
-- Reversibilidad: el bloque SIEMPRE termina en una excepción, así que
-- toda la transacción se revierte. Si todas las pruebas pasan, la
-- excepción es «PRUEBAS_033_OK: N7 N3 N2 N1 N4 N5 N6 N9 N8» (señal
-- positiva); si una falla, es el mensaje de esa prueba. No consume
-- secuencias (notifications usa gen_random_uuid; no se insertan OT ni
-- árboles), no llama servicios externos y no envía correos. SET LOCAL
-- ROLE y set_config(..., true) son locales a la transacción.
--
-- Resultado (2026-11-02, gmlbmyreoxgoqrolhyxo): PRUEBAS_033_OK en las
-- dos rondas (antes de revertir y después de reaplicar); 0 avisos
-- residuales; md5 de los datos de work_orders sin cambios.
--
-- Usa una OT de Inspección en estado Pendiente, con responsable, de un
-- proyecto no cerrado, y otro usuario cualquiera para la reasignación.
--   N7 programar (cambio de estado no notificado)      → 0 avisos.
--   N3 UPDATE que repite estado y responsable, u otra columna → 0 avisos.
--   N2 reasignar → ot_reasignada_nuevo (nuevo) y ot_reasignada_anterior (anterior).
--   N1 cancelar  → ot_cancelada al responsable, con el motivo.
--   N4 recordatorio repetido (misma user_id + clave_unica) → ignorado.
--   N5 recordatorio sin clave_unica → rechazado (chk_notifications_recordatorio).
--   N6 políticas: solo notifications_select_own (SELECT).
--   N8 RLS: otro usuario (authenticated) ve 0 avisos del destinatario;
--      el destinatario ve los suyos; authenticated no puede insertar.
--   N9 privilegios: anon sin ninguno; authenticated sin INSERT/UPDATE/DELETE.
-- No cubierto en SQL (cubierto en Jest): la traducción de SV075 a 503.
-- =====================================================================
DO $$
DECLARE
  v_ot RECORD;
  v_otro UUID;
  v_n INT;
  v_ok TEXT := '';
BEGIN
  SELECT wo.id, wo.responsable_accion_id INTO v_ot
  FROM public.work_orders wo JOIN public.projects p ON p.id = wo.project_id
  WHERE wo.tipo_ot = 'inspeccion' AND wo.estado_ot = 'pendiente' AND wo.responsable_accion_id IS NOT NULL
    AND p.estado_proyecto <> 'cerrado'
  LIMIT 1;
  IF v_ot.id IS NULL THEN RAISE EXCEPTION 'No hay una OT de Inspección Pendiente con responsable en un proyecto abierto'; END IF;
  SELECT id INTO v_otro FROM public.user_profiles WHERE id <> v_ot.responsable_accion_id LIMIT 1;

  -- N7 programar
  UPDATE public.work_orders SET estado_ot = 'programada', fecha_accion_programada = CURRENT_DATE WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N7 falló: %', v_n; END IF; v_ok := v_ok || 'N7 ';

  -- N3 sin cambios reales / otra columna
  UPDATE public.work_orders SET estado_ot = estado_ot, responsable_accion_id = responsable_accion_id WHERE id = v_ot.id;
  UPDATE public.work_orders SET observaciones = COALESCE(observaciones, '') || ' (prueba 033)' WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N3 falló: %', v_n; END IF; v_ok := v_ok || 'N3 ';

  -- N2 reasignar
  UPDATE public.work_orders SET responsable_accion_id = v_otro WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id
    AND ((tipo = 'ot_reasignada_nuevo' AND user_id = v_otro) OR (tipo = 'ot_reasignada_anterior' AND user_id = v_ot.responsable_accion_id));
  IF v_n <> 2 OR (SELECT count(*) FROM public.notifications WHERE work_order_id = v_ot.id) <> 2 THEN RAISE EXCEPTION 'N2 falló: %', v_n; END IF;
  v_ok := v_ok || 'N2 ';

  -- N1 cancelar
  UPDATE public.work_orders
     SET estado_ot = 'cancelada', motivo_cancelacion = 'Prueba 033', cancelado_por = v_otro, fecha_cancelacion = CURRENT_DATE
   WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications
   WHERE work_order_id = v_ot.id AND tipo = 'ot_cancelada' AND user_id = v_otro AND mensaje LIKE '%Motivo: Prueba 033.%';
  IF v_n <> 1 OR (SELECT count(*) FROM public.notifications WHERE work_order_id = v_ot.id) <> 3 THEN RAISE EXCEPTION 'N1 falló: %', v_n; END IF;
  v_ok := v_ok || 'N1 ';

  -- N4 recordatorio repetido
  INSERT INTO public.notifications (user_id, tipo, mensaje, clave_unica) VALUES (v_otro, 'recordatorio_inspeccion', 'x', 'recordatorio:prueba:inspeccion:2026-11-01') ON CONFLICT (user_id, clave_unica) DO NOTHING;
  INSERT INTO public.notifications (user_id, tipo, mensaje, clave_unica) VALUES (v_otro, 'recordatorio_inspeccion', 'x', 'recordatorio:prueba:inspeccion:2026-11-01') ON CONFLICT (user_id, clave_unica) DO NOTHING;
  SELECT count(*) INTO v_n FROM public.notifications WHERE clave_unica = 'recordatorio:prueba:inspeccion:2026-11-01';
  IF v_n <> 1 THEN RAISE EXCEPTION 'N4 falló: %', v_n; END IF; v_ok := v_ok || 'N4 ';

  -- N5 recordatorio sin clave
  BEGIN
    INSERT INTO public.notifications (user_id, tipo, mensaje) VALUES (v_otro, 'recordatorio_inspeccion', 'x');
    RAISE EXCEPTION 'N5 falló: se aceptó un recordatorio sin clave';
  EXCEPTION WHEN check_violation THEN v_ok := v_ok || 'N5 ';
  END;

  -- N6 políticas
  SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications';
  IF v_n <> 1 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select_own' AND cmd = 'SELECT') THEN
    RAISE EXCEPTION 'N6 falló: %', v_n;
  END IF; v_ok := v_ok || 'N6 ';

  -- N9 privilegios
  IF has_table_privilege('anon', 'public.notifications', 'SELECT') OR has_table_privilege('anon', 'public.notifications', 'INSERT')
     OR has_table_privilege('authenticated', 'public.notifications', 'INSERT') OR has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.notifications', 'DELETE') THEN
    RAISE EXCEPTION 'N9 falló';
  END IF; v_ok := v_ok || 'N9 ';

  -- N8 RLS como authenticated
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_ot.responsable_accion_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_ot.responsable_accion_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.notifications WHERE user_id = v_otro;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N8 falló: ve % avisos de otro', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.notifications;
  IF v_n <> 1 THEN RAISE EXCEPTION 'N8 falló: ve % avisos (esperado 1)', v_n; END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, tipo, work_order_id, mensaje) VALUES (v_ot.responsable_accion_id, 'ot_cancelada', v_ot.id, 'x');
    RAISE EXCEPTION 'N8 falló: authenticated pudo insertar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  v_ok := v_ok || 'N8';

  -- Señal positiva: aborta y revierte todo.
  RAISE EXCEPTION 'PRUEBAS_033_OK: %', v_ok;
END $$;
