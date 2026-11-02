-- Reversión de la migración 033 (PROPUESTA; NO APLICADA).
-- Quita el trigger, su función y la tabla. No toca ninguna función
-- existente (la 033 no modifica la 025 ni la 031).
BEGIN;
DROP TRIGGER IF EXISTS trg_work_orders_notificar ON public.work_orders;
DROP FUNCTION IF EXISTS public.fn_notificar_cambio_ot();
DROP TABLE IF EXISTS public.notifications;
COMMIT;
