-- =====================================================================
-- Reversión de 018b_proyectos_sector_funciones.sql
-- =====================================================================

DROP FUNCTION IF EXISTS public.fn_update_sector_geometria(uuid, text, jsonb, text, integer[]);
DROP FUNCTION IF EXISTS public.fn_create_project_with_sector(text, text, text, jsonb, text, integer[], uuid);
DROP FUNCTION IF EXISTS public.fn_build_sector_geometria(text, jsonb, text, integer[]);
DROP FUNCTION IF EXISTS public.fn_unir_y_validar_superficies(geometry[]);
DROP FUNCTION IF EXISTS public.fn_extraer_superficies_kml(text);

-- Diferencias aceptadas por la responsable (2026-10-22) respecto del
-- estado anterior a la 018b — esta reversión NO deja `projects`
-- idéntica:
--   1. `institution_name` vuelve como NULLABLE, no NOT NULL (era NOT
--      NULL desde la migración 002): restablecerlo exigiría un valor
--      para cualquier proyecto creado mientras la 018b estuvo aplicada,
--      y esta reversión no inventa uno.
--   2. Las dos columnas vuelven VACÍAS: los valores que tenían se
--      pierden con el DROP COLUMN de la 018b.
--   3. Las dos columnas quedan al FINAL de la tabla: Postgres no permite
--      reinsertar una columna en su posición original.
ALTER TABLE projects
  ADD COLUMN institution_name TEXT,
  ADD COLUMN responsible_professional TEXT;
