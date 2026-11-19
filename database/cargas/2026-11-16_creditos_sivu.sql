-- Créditos de las fotos propias de la ficha pública → «SIVU» (CC-073).
-- Indicación de la responsable, 2026-11-16: las fotos propias pertenecen
-- al equipo de SIVU; no se acreditan a personas ni se muestran en la
-- plataforma. El detalle de cada foto queda en docs/conecta-fotos.md.
-- Solo base de pruebas gmlbmyreoxgoqrolhyxo; NO aplicar en la base real.
-- No toca las fotos temporales de terceros (D-293): su crédito lo fija la
-- base y debe seguir diciendo «Foto de terceros, uso referencial temporal».
-- Idempotente. Sin reversión: no se vuelve a acreditar fotos a personas.

-- Fotos referenciales propias.
UPDATE public.species_public_content
SET credito_foto_referencial = 'SIVU'
WHERE foto_referencial_path IS NOT NULL
  AND NOT foto_referencial_temporal
  AND credito_foto_referencial IS DISTINCT FROM 'SIVU';

-- Fotos de los rasgos («Reconóceme»): todas son propias.
UPDATE public.species_public_content c
SET rasgos = (
  SELECT jsonb_agg(CASE WHEN r ? 'foto_path' AND r->>'foto_path' IS NOT NULL
                        THEN r || jsonb_build_object('credito', 'SIVU')
                        ELSE r END
                   ORDER BY o)
  FROM jsonb_array_elements(c.rasgos) WITH ORDINALITY AS x(r, o))
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(c.rasgos) r
              WHERE r->>'foto_path' IS NOT NULL AND r->>'credito' IS DISTINCT FROM 'SIVU');
