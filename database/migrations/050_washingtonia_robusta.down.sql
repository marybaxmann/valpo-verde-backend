BEGIN;
DELETE FROM public.species s
WHERE lower(btrim(s.especie_cientifica)) = 'washingtonia robusta'
  AND NOT EXISTS (SELECT 1 FROM public.trees t WHERE t.species_id = s.id);
COMMIT;
