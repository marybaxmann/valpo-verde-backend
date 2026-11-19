-- CC-077: usar el mismo bloqueo de inspección que fn_finalizar_inspeccion.
BEGIN;

CREATE FUNCTION public.fn_proteger_retiro_foto_d27() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  estado text;
  tipo text;
BEGIN
  IF OLD.inspection_id IS NOT NULL THEN
    IF TG_OP = 'DELETE' OR OLD.inspection_id IS DISTINCT FROM NEW.inspection_id THEN
      SELECT estado_registro, tipo_inspeccion_realizada INTO estado, tipo
      FROM public.inspections
      WHERE id = OLD.inspection_id
      FOR UPDATE;

      IF estado = 'finalizado' AND tipo IN ('evaluacion_inicial', 'reevaluacion', 'levantamiento') THEN
        RAISE EXCEPTION 'D-27: la inspección ya finalizó y la fotografía sigue asociada'
          USING ERRCODE = 'SV041';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_proteger_retiro_foto_d27() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_proteger_retiro_foto_d27
  BEFORE DELETE OR UPDATE OF inspection_id ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_retiro_foto_d27();

COMMIT;
