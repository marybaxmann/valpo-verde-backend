-- =====================================================================
-- Reversión de 018e_evaluations_preguardado.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_save_inspection_draft(
  uuid, uuid, uuid, uuid, date, date, text, text, text, text, text, boolean, text, uuid, jsonb, jsonb, text[]
);
DROP TYPE IF EXISTS public.tree_data_versions_arbol_input;

ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS chk_evaluations_calculado_coherente;

-- Solo revierte limpio si no quedó ninguna fila en Preguardado (sin
-- calculado_at). Si la hay, fallará a propósito: hay que decidir qué
-- hacer con esas filas antes de revertir.
ALTER TABLE public.evaluations ALTER COLUMN variables_calculo SET NOT NULL;
ALTER TABLE public.evaluations ALTER COLUMN rule_version SET NOT NULL;
ALTER TABLE public.evaluations ALTER COLUMN motor_commit SET NOT NULL;
