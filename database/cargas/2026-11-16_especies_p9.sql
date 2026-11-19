-- Carga autorizada de dos especies en el catálogo (base de pruebas).
-- Autorización: Mari, 2026-11-16 (respuesta 7 de
-- docs/plan/propuestas/ficha-publica-editable/05-preguntas-para-mari.md).
-- Datos: P9 aprobado en el relevo de Mari del 2026-11-15
-- (docs/relevo/RELEVO_2026-11-15_mari.md §1.3).
-- Solo base de pruebas gmlbmyreoxgoqrolhyxo; NO aplicar en la base real.
-- No vincula árboles: los que hoy dicen «Arce negundo» o «Crespón» por texto
-- siguen igual hasta su corrección por la vía del inventario.
-- Idempotente: no inserta una especie que ya exista (mismo nombre científico).
insert into public.species (especie_cientifica, genero, familia, origen_biogeografico, persistencia_follaje, tipo_hoja)
select v.especie_cientifica, v.genero, v.familia, v.origen, v.persistencia, v.tipo_hoja
from (values
  ('Acer negundo',        'Acer',          'Sapindaceae', 'introducida', 'caducifolia', 'latifoliada'),
  ('Lagerstroemia indica','Lagerstroemia', 'Lythraceae',  'introducida', 'caducifolia', 'latifoliada')
) as v(especie_cientifica, genero, familia, origen, persistencia, tipo_hoja)
where not exists (
  select 1 from public.species s
  where lower(btrim(s.especie_cientifica)) = lower(v.especie_cientifica)
);
