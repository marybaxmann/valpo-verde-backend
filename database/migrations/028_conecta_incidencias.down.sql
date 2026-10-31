-- Reversión de la 028 (#62; CC-062): borra las funciones de Conecta y la
-- huella del código de seguimiento. Las incidencias, sus reportantes y
-- sus fotos quedan; los códigos ya entregados dejan de funcionar.
DROP FUNCTION IF EXISTS public.fn_revisar_incidencia(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.fn_purgar_huellas_vencidas();
DROP FUNCTION IF EXISTS public.fn_estado_seguimiento(BYTEA);
DROP FUNCTION IF EXISTS public.fn_ficha_publica_arbol(UUID);
DROP FUNCTION IF EXISTS public.fn_crear_incidencia_ciudadana(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BYTEA, JSONB);
DROP INDEX IF EXISTS public.uq_incidents_codigo_seguimiento_huella;
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS chk_incidents_huella_sha256;
ALTER TABLE public.incidents DROP COLUMN IF EXISTS codigo_seguimiento_huella;
