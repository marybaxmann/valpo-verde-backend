-- CC-082, PALM-01. Aplicar después de la migración 046 (IF-25).
BEGIN;

-- Conserva el valor previo para revertir solo esta actualización.
CREATE TABLE public.cc082_tipo_hoja_anterior (
  species_id uuid PRIMARY KEY REFERENCES public.species(id) ON DELETE CASCADE,
  tipo_hoja text,
  updated_at_aplicacion timestamptz
);
ALTER TABLE public.cc082_tipo_hoja_anterior ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cc082_tipo_hoja_anterior FROM PUBLIC, anon, authenticated;

INSERT INTO public.cc082_tipo_hoja_anterior (species_id, tipo_hoja)
SELECT id, tipo_hoja
FROM public.species
WHERE tipo_hoja IS DISTINCT FROM 'palmera'
  AND (lower(btrim(familia)) = 'arecaceae'
    OR lower(regexp_replace(btrim(especie_cientifica), '\s+', ' ', 'g')) = 'phoenix canariensis')
FOR UPDATE;

WITH actualizadas AS (
  UPDATE public.species AS s
  SET tipo_hoja = 'palmera'
  FROM public.cc082_tipo_hoja_anterior AS a
  WHERE s.id = a.species_id
  RETURNING s.id, s.updated_at
)
UPDATE public.cc082_tipo_hoja_anterior AS a
SET updated_at_aplicacion = u.updated_at
FROM actualizadas AS u
WHERE a.species_id = u.id;

COMMIT;
