-- =====================================================================
-- Reversión de 018d_alta_arbol_con_version.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_create_tree_alta(uuid, uuid, text, text, numeric, numeric, text, text, date, uuid);
