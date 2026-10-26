-- =====================================================================
-- Reversión de 020_finalizar_inspeccion.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_finalizar_inspeccion(uuid, uuid, jsonb, jsonb, date, date, date, date, text);
DROP TYPE IF EXISTS public.evaluations_resultado_input;
DROP VIEW IF EXISTS public.v_tree_fechas_vigentes;
