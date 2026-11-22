-- Revierte la migración 049 (código público del árbol por lugar).
DROP TRIGGER IF EXISTS trg_trees_codigo_publico ON public.trees;
DROP FUNCTION IF EXISTS public.fn_asignar_codigo_publico();
DROP FUNCTION IF EXISTS public.fn_max_numero_codigo(text, int);
DROP FUNCTION IF EXISTS public.fn_vereda_respecto_eje(geometry, geometry);
ALTER TABLE public.trees DROP COLUMN IF EXISTS codigo_publico;
DROP TABLE IF EXISTS public.public_code_places;
