BEGIN;

-- Respeta ediciones del catálogo posteriores a la migración.
UPDATE public.species AS s
SET tipo_hoja = a.tipo_hoja
FROM public.cc082_tipo_hoja_anterior AS a
WHERE s.id = a.species_id
  AND s.tipo_hoja = 'palmera'
  AND s.updated_at = a.updated_at_aplicacion;

DROP TABLE public.cc082_tipo_hoja_anterior;
COMMIT;
