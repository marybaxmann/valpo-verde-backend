-- =====================================================================
-- Reversión de 013_sectores_y_arboles.sql
-- =====================================================================

DROP TABLE IF EXISTS tree_data_versions;

DROP INDEX IF EXISTS idx_trees_ubicacion;
ALTER TABLE trees DROP COLUMN ubicacion;
ALTER TABLE trees
  ADD COLUMN ubicacion geography(Point, 4326);  -- vuelve a ser manual (fn_create_tree_with_measurement)
CREATE INDEX idx_trees_ubicacion ON trees USING GIST (ubicacion);

DROP INDEX IF EXISTS idx_trees_sector_id;

ALTER TABLE trees
  DROP CONSTRAINT IF EXISTS chk_trees_especie_o_comun,
  DROP COLUMN IF EXISTS diametro_copa_m,
  DROP COLUMN IF EXISTS vigente_desde_inspection_id,
  DROP COLUMN IF EXISTS rango_edad_estimada_anios,
  DROP COLUMN IF EXISTS clase_edad,
  DROP COLUMN IF EXISTS altura_base_copa_viva_no_presenta,
  DROP COLUMN IF EXISTS altura_base_copa_viva_m,
  DROP COLUMN IF EXISTS altura_primera_rama_no_presenta,
  DROP COLUMN IF EXISTS altura_primera_rama_m,
  DROP COLUMN IF EXISTS copa_no_presenta,
  DROP COLUMN IF EXISTS diametro_copa_eo_m,
  DROP COLUMN IF EXISTS diametro_copa_ns_m,
  DROP COLUMN IF EXISTS altura_total_m,
  DROP COLUMN IF EXISTS dap_cm,
  DROP COLUMN IF EXISTS dap_fustes_cm,
  DROP COLUMN IF EXISTS numero_fustes,
  DROP COLUMN IF EXISTS multifustal,
  DROP COLUMN IF EXISTS nombre_comun,
  DROP COLUMN IF EXISTS especie_cientifica,
  DROP COLUMN IF EXISTS datum,
  DROP COLUMN IF EXISTS huso,
  DROP COLUMN IF EXISTS utm_norte,
  DROP COLUMN IF EXISTS utm_este,
  DROP COLUMN IF EXISTS ubicacion_descriptiva,
  DROP COLUMN IF EXISTS sector,
  DROP COLUMN IF EXISTS registrado_por,
  DROP COLUMN IF EXISTS fecha_registro,
  DROP COLUMN IF EXISTS sector_id;

DROP TRIGGER IF EXISTS trg_sectors_updated_at ON sectors;
DROP TABLE IF EXISTS sectors;
