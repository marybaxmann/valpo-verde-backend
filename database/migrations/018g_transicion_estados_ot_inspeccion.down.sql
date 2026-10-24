-- =====================================================================
-- Reversión de 018g_transicion_estados_ot_inspeccion.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_transition_work_order_estado(uuid, text, date, uuid);
