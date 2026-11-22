BEGIN;

ALTER TABLE public.species
  DROP CONSTRAINT chk_species_especie_cientifica_valida,
  ADD CONSTRAINT chk_species_especie_cientifica_valida CHECK (
    (lower(btrim(especie_cientifica)) = 'washingtonia sp.'
      AND genero IS NOT DISTINCT FROM 'Washingtonia'
      AND familia IS NOT DISTINCT FROM 'Arecaceae'
      AND tipo_hoja IS NOT DISTINCT FROM 'palmera')
    OR (btrim(especie_cientifica) !~* '\sspp?\.?$'
      AND lower(btrim(especie_cientifica)) <> 'no determinado')
  );

INSERT INTO public.species (especie_cientifica, genero, familia, tipo_hoja)
SELECT 'Washingtonia sp.', 'Washingtonia', 'Arecaceae', 'palmera'
WHERE NOT EXISTS (
  SELECT 1 FROM public.species
  WHERE lower(btrim(especie_cientifica)) = 'washingtonia sp.'
);

COMMIT;
