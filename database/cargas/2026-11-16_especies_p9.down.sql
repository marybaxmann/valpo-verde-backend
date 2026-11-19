-- Reversión de 2026-11-16_especies_p9.sql: borra las dos especies solo si
-- ningún árbol ni otra tabla las referencia (si alguna lo hace, la clave
-- foránea impide el borrado y la reversión falla sin cambiar nada).
delete from public.species
where especie_cientifica in ('Acer negundo', 'Lagerstroemia indica')
  and created_by is null;
