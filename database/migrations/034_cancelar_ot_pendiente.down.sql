-- Reversión de la migración 034 (solo base de pruebas, con autorización).
-- Restaura el CHECK original de la 014. No borra ni rellena datos: si ya
-- existe alguna OT cancelada sin fecha programada (cancelada desde
-- Pendiente con la 034 aplicada), la reversión se detiene con un error y
-- no cambia nada. Revertir en ese caso requiere una decisión de Valej.
DO $$
DECLARE
  v_n int;
BEGIN
  SELECT count(*) INTO v_n
  FROM public.work_orders
  WHERE estado_ot = 'cancelada' AND fecha_accion_programada IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'No se revierte la 034: hay % OT canceladas sin fecha programada. Revertir requiere una decisión (no se borran datos).', v_n;
  END IF;
END;
$$;

ALTER TABLE public.work_orders
  DROP CONSTRAINT chk_work_orders_fecha_programada;

-- fecha_accion_programada obligatoria desde programada (D-241).
ALTER TABLE public.work_orders
  ADD CONSTRAINT chk_work_orders_fecha_programada
    CHECK (estado_ot = 'pendiente' OR fecha_accion_programada IS NOT NULL);
