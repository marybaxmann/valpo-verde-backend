-- =====================================================================
-- Reversión de 018b_proyectos_sector_funciones.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_update_sector_geometria(uuid, text, jsonb, text, integer[]);
DROP FUNCTION IF EXISTS public.fn_create_project_with_sector(text, text, text, jsonb, text, integer[], uuid);
DROP FUNCTION IF EXISTS public.fn_build_sector_geometria(text, jsonb, text, integer[]);
DROP FUNCTION IF EXISTS public.fn_unir_y_validar_superficies(geometry[]);
DROP FUNCTION IF EXISTS public.fn_extraer_superficies_kml(text);

-- Se restauran como NULLABLE, no NOT NULL: restablecer exactamente el
-- estado anterior exigiría un valor para institution_name en cualquier
-- proyecto creado mientras la 018b estuvo aplicada, y esta reversión no
-- inventa uno.
ALTER TABLE projects
  ADD COLUMN institution_name TEXT,
  ADD COLUMN responsible_professional TEXT;
