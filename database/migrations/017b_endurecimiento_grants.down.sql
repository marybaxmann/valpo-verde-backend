-- =====================================================================
-- Reversión de 017b_endurecimiento_grants.sql
-- =====================================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT REFERENCES, TRIGGER ON TABLES TO anon, authenticated;

GRANT REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- st_estimatedextent: nada que revertir (el REVOKE de la 017b no tuvo
-- efecto — ver el comentario en 017b_endurecimiento_grants.sql).

ALTER FUNCTION public.set_updated_at() RESET search_path;
ALTER FUNCTION public.fn_next_codigo_usuario() RESET search_path;
