-- =====================================================================
-- Migración 017b — Endurecimiento de GRANT detectado por el asesor de
-- seguridad tras la 017 (revisión de la responsable, 2026-10-21)
-- Issue #43.
-- =====================================================================

-- 1. search_path fijo en las dos funciones que no lo tenían (una
--    SECURITY INVOKER de trigger ya existente desde 001, y la nueva de
--    codigo_usuario de la 012).
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_next_codigo_usuario() SET search_path = public, pg_temp;

-- 2. st_estimatedextent (PostGIS): INTENTADO, SIN EFECTO. Las 3
--    funciones pertenecen a `supabase_admin` (como spatial_ref_sys,
--    issue #9) con EXECUTE otorgado a PUBLIC por ese mismo rol. El rol
--    que aplica migraciones (`postgres`) no tiene autoridad para
--    revocar un privilegio otorgado por `supabase_admin`: el REVOKE se
--    ejecuta sin error pero no cambia el proacl (verificado antes y
--    después). Mismo problema de fondo que spatial_ref_sys — ver
--    issue #9. No se repite aquí el REVOKE porque no hace nada; queda
--    como hallazgo aceptado en el asesor de seguridad.

-- 3. REFERENCES y TRIGGER: la 017 revocó INSERT/UPDATE/DELETE/TRUNCATE
--    (y SELECT de anon), pero no estos dos privilegios, que Supabase
--    otorga por defecto a anon/authenticated en todas las tablas
--    (incluidas las vistas, para GRANT/REVOKE). anon queda sin ningún
--    privilegio; authenticated queda solo con SELECT.
REVOKE REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
