-- Catálogo: agrega Washingtonia robusta como palmera (AV_000105 · A-000572).
-- D-13 no permite finalizar una inspección con «Washingtonia sp.».
-- Especie confirmada por la responsable a partir de las fotos (2026-11-23).
BEGIN;

INSERT INTO public.species (especie_cientifica, genero, familia, tipo_hoja, origen_biogeografico, persistencia_follaje)
SELECT 'Washingtonia robusta', 'Washingtonia', 'Arecaceae', 'palmera', 'introducida', 'perennifolia'
WHERE NOT EXISTS (
  SELECT 1 FROM public.species
  WHERE lower(btrim(especie_cientifica)) = 'washingtonia robusta'
);

COMMIT;
