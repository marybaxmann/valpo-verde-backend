-- =====================================================================
-- Pruebas de la migración 033 (CC-051, #63). Correr SOLO después de
-- aplicarla en la base de pruebas, dentro de una transacción que se
-- revierte: no deja datos. Usa una OT existente sin cerrar y su
-- responsable, y un segundo usuario cualquiera para la reasignación.
--   N1 cancelar → 1 aviso ot_cancelada al responsable, con el motivo.
--   N2 reasignar → ot_reasignada_nuevo al nuevo y ot_reasignada_anterior al anterior.
--   N3 actualizar otra columna (observaciones) → ningún aviso.
--   N4 recordatorio repetido (misma user_id + clave_unica) → ignorado (ON CONFLICT DO NOTHING).
--   N5 recordatorio sin clave_unica → rechazado (chk_notifications_recordatorio).
--   N6 RLS: existe solo la política de SELECT propia; ninguna de escritura.
-- =====================================================================
BEGIN;

DO $$
DECLARE
  v_ot RECORD;
  v_otro UUID;
  v_n INT;
BEGIN
  SELECT id, responsable_accion_id INTO v_ot FROM public.work_orders
  WHERE estado_ot IN ('pendiente', 'programada') AND responsable_accion_id IS NOT NULL LIMIT 1;
  IF v_ot.id IS NULL THEN RAISE EXCEPTION 'No hay una OT abierta con responsable para probar'; END IF;
  SELECT id INTO v_otro FROM public.user_profiles WHERE id <> v_ot.responsable_accion_id LIMIT 1;

  -- N2 primero (la OT sigue abierta)
  UPDATE public.work_orders SET responsable_accion_id = v_otro WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id
    AND ((tipo = 'ot_reasignada_nuevo' AND user_id = v_otro) OR (tipo = 'ot_reasignada_anterior' AND user_id = v_ot.responsable_accion_id));
  IF v_n <> 2 THEN RAISE EXCEPTION 'N2 falló: % avisos de reasignación', v_n; END IF;
  RAISE NOTICE 'N2 OK';

  -- N3
  UPDATE public.work_orders SET observaciones = COALESCE(observaciones, '') || ' (prueba 033)' WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications WHERE work_order_id = v_ot.id;
  IF v_n <> 2 THEN RAISE EXCEPTION 'N3 falló: % avisos (esperado 2)', v_n; END IF;
  RAISE NOTICE 'N3 OK';

  -- N1
  UPDATE public.work_orders
     SET estado_ot = 'cancelada', motivo_cancelacion = 'Prueba 033', cancelado_por = v_otro, fecha_cancelacion = CURRENT_DATE
   WHERE id = v_ot.id;
  SELECT count(*) INTO v_n FROM public.notifications
   WHERE work_order_id = v_ot.id AND tipo = 'ot_cancelada' AND user_id = v_otro AND mensaje LIKE '%Motivo: Prueba 033.%';
  IF v_n <> 1 THEN RAISE EXCEPTION 'N1 falló: % avisos de cancelación', v_n; END IF;
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
  SELECT count(*) INTO v_n FROM pg_policies WHERE tablename = 'notifications';
  IF v_n <> 1 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select_own' AND cmd = 'SELECT') THEN
    RAISE EXCEPTION 'N6 falló: políticas inesperadas (%)', v_n;
  END IF;
  RAISE NOTICE 'N6 OK';
END $$;

ROLLBACK;
