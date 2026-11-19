BEGIN;
DROP TRIGGER trg_proteger_retiro_foto_d27 ON public.photos;
DROP FUNCTION public.fn_proteger_retiro_foto_d27();
COMMIT;
