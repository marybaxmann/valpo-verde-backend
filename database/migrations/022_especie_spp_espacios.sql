-- =====================================================================
-- Migración 022 — CHECK de especies: «spp.» y espacios en los extremos
-- (D-13, D-257; CC-056 decisión r)
-- =====================================================================
--
-- Aprobada por la responsable (2026-10-26). `chk_species_especie_cientifica_valida`
-- (migración 012) rechaza «Género sp.» y «No determinado», pero:
--   - no reconoce «Género spp.», que también es una identificación solo
--     a nivel de género (decisión r: se trata igual que «sp.»);
--   - compara la expresión regular sin recortar el nombre, así que
--     «Acacia sp. », con un espacio final, pasa.
-- La regla nueva recorta el nombre (btrim) antes de las dos
-- comparaciones. Es el mismo criterio que `especieValidaD13`
-- (src/services/sivu/completitud.ts).
--
-- ADD CONSTRAINT valida las filas existentes: antes de aplicarla se
-- comprobó con una consulta de solo lectura que ninguna fila de
-- `species` rompe la regla nueva.

ALTER TABLE public.species DROP CONSTRAINT chk_species_especie_cientifica_valida;

ALTER TABLE public.species ADD CONSTRAINT chk_species_especie_cientifica_valida
  CHECK (
    btrim(especie_cientifica) !~* '\sspp?\.?$'
    AND lower(btrim(especie_cientifica)) <> 'no determinado'
  );
