-- Revierte 042 (CC-079). El registro de borrados se pierde: respaldar
-- public.incident_deletions antes si tiene filas.
BEGIN;
DROP FUNCTION IF EXISTS public.fn_borrar_incidencia(UUID, UUID, TEXT);
DROP TABLE IF EXISTS public.incident_deletions;
COMMIT;
