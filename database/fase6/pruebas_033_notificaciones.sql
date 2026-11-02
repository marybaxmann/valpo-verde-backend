-- =====================================================================
-- Pruebas de la migración 033 (CC-051, #63). Correr SOLO después de
-- aplicarla en la base de PRUEBAS (gmlbmyreoxgoqrolhyxo).
--
-- Reversibilidad: todo corre dentro de BEGIN … ROLLBACK. No consume
-- secuencias (notifications usa gen_random_uuid; no se insertan OT ni
-- árboles), no llama servicios externos y no envía correos. Si una
-- prueba falla, RAISE EXCEPTION aborta la transacción y el ROLLBACK
-- final la descarta igual. SET LOCAL ROLE y set_config(..., true) son
-- locales a la transacción.
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
BEGIN;

DO $$
DECLARE
  v_ot RECORD;
  v_otro UUID;
  v_n INT;
BEGIN
  SELECT wo.id, wo.responsable_accion_id INTO v_ot
  FROM public.work_orders wo JOIN public.projects p ON p.id = wo.project_id
  WHERE wo.tipo_ot = 'inspeccion' AND wo.estado_ot = 'pendiente' AND wo.responsable_accion_id IS NOT NULL
    AND p.estado_proyecto <> 'cerrado'
  LIMIT 1;
  IF v_ot.id IS NULL THEN RAISE EXCEPTION 'No hay una OT de Inspección Pendiente con responsable en un proyecto abierto'; END IF;
  SELECT id INTO v_otro FROM public.user_profiles WHERE id <> v_ot.responsable_accion_id LIMIT 1;

  -- N7
  UPDATE public.work_orders SET estado_ot = 'programada', fecha_accion_programada = CURRENT_DATE WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N7 falló: % avisos al programar', v_n; END IF;
  RAISE NOTICE 'N7 OK';

  -- N3
  UPDATE public.work_orders SET estado_ot = estado_ot, responsable_accion_id = responsable_accion_id WHERE id = v_ot.id;
  UPDATE public.work_orders SET observaciones = COALESCE(observaciones, '') || ' (prueba 033)' WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N3 falló: % avisos', v_n; END IF;
  RAISE NOTICE 'N3 OK';

  -- N2
  UPDATE public.work_orders SET responsable_accion_id = v_otro WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id
    AND ((tipo = 'ot_reasignada_nuevo' AND user_id = v_otro) OR (tipo = 'ot_reasignada_anterior' AND user_id = v_ot.responsable_accion_id));
  IF v_n <> 2 OR (SELECT count(*) FROM public.notifications WHERE work_order_id = v_ot.id) <> 2 THEN
    RAISE EXCEPTION 'N2 falló: % avisos de reasignación', v_n;
  END IF;
  RAISE NOTICE 'N2 OK';

  -- N1
  UPDATE public.work_orders
     SET estado_ot = 'cancelada', motivo_cancelacion = 'Prueba 033', cancelado_por = v_otro, fecha_cancelacion = CURRENT_DATE
   WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications
   WHERE work_order_id = v_ot.id AND tipo = 'ot_cancelada' AND user_id = v_otro AND mensaje LIKE '%Motivo: Prueba 033.%';
  IF v_n <> 1 OR (SELECT count(*) FROM public.notifications WHERE work_order_id = v_ot.id) <> 3 THEN
    RAISE EXCEPTION 'N1 falló: % avisos de cancelación', v_n;
  END IF;
  RAISE NOTICE 'N1 OK';

  -- N4
  INSERT INTO public.notifications (user_id, tipo, mensaje, clave_unica) VALUES (v_otro, 'recordatorio_inspeccion', 'x', 'recordatorio:prueba:inspeccion:2026-11-01')
    ON CONFLICT (user_id, clave_unica) DO NOTHING;
  INSERT INTO public.notifications (user_id, tipo, mensaje, clave_unica) VALUES (v_otro, 'recordatorio_inspeccion', 'x', 'recordatorio:prueba:inspeccion:2026-11-01')
    ON CONFLICT (user_id, clave_unica) DO NOTHING;
  SELECT count(*) INTO v_n FROM public.notifications WHERE clave_unica = 'recordatorio:prueba:inspeccion:2026-11-01';
  IF v_n <> 1 THEN RAISE EXCEPTION 'N4 falló: % recordatorios', v_n; END IF;
  RAISE NOTICE 'N4 OK';

  -- N5
  BEGIN
    INSERT INTO public.notifications (user_id, tipo, mensaje) VALUES (v_otro, 'recordatorio_inspeccion', 'x');
    RAISE EXCEPTION 'N5 falló: se aceptó un recordatorio sin clave';
  EXCEPTION WHEN check_violation THEN RAISE NOTICE 'N5 OK';
  END;

  -- N6
  SELECT count(*) INTO v_n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications';
  IF v_n <> 1 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select_own' AND cmd = 'SELECT') THEN
    RAISE EXCEPTION 'N6 falló: políticas inesperadas (%)', v_n;
  END IF;
  RAISE NOTICE 'N6 OK';

  -- N9
  IF has_table_privilege('anon', 'public.notifications', 'SELECT')
     OR has_table_privilege('anon', 'public.notifications', 'INSERT')
     OR has_table_privilege('authenticated', 'public.notifications', 'INSERT')
     OR has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.notifications', 'DELETE') THEN
    RAISE EXCEPTION 'N9 falló: privilegios de más en notifications';
  END IF;
  RAISE NOTICE 'N9 OK';

  -- N8 (como authenticated, con el JWT simulado de cada usuario)
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_ot.responsable_accion_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_ot.responsable_accion_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM public.notifications WHERE user_id = v_otro;
  IF v_n <> 0 THEN RAISE EXCEPTION 'N8 falló: un usuario ve % avisos de otro', v_n; END IF;
  SELECT count(*) INTO v_n FROM public.notifications;
  IF v_n <> 1 THEN RAISE EXCEPTION 'N8 falló: el responsable anterior ve % avisos (esperado 1, el suyo)', v_n; END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, tipo, work_order_id, mensaje) VALUES (v_ot.responsable_accion_id, 'ot_cancelada', v_ot.id, 'x');
    RAISE EXCEPTION 'N8 falló: authenticated pudo insertar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  RAISE NOTICE 'N8 OK';
END $$;

ROLLBACK;
