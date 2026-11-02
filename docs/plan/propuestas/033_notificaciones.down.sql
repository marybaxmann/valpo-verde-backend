-- Reversión de la migración 033 (PROPUESTA; NO APLICADA).
BEGIN;
DROP TABLE IF EXISTS public.notifications;
COMMIT;
