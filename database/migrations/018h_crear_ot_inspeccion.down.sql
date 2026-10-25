-- =====================================================================
-- Reversión de 018h_crear_ot_inspeccion.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_create_work_order_inspeccion(
  uuid, uuid, uuid, text, text, text, text, text, uuid, uuid, date
);
