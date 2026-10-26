-- =====================================================================
-- Reversión de 022_especie_spp_espacios.sql
-- =====================================================================
-- Restaura exactamente el CHECK de la migración 012.

ALTER TABLE public.species DROP CONSTRAINT chk_species_especie_cientifica_valida;

ALTER TABLE public.species ADD CONSTRAINT chk_species_especie_cientifica_valida
  CHECK (especie_cientifica !~* '\ssp\.?$' AND lower(trim(especie_cientifica)) <> 'no determinado');
