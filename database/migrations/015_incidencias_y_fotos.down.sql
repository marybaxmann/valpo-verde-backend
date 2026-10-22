-- =====================================================================
-- Reversión de 015_incidencias_y_fotos.sql
-- =====================================================================

DROP TRIGGER IF EXISTS trg_photos_tree_coherente ON photos;
DROP FUNCTION IF EXISTS fn_check_photo_tree_coherente();

DROP INDEX IF EXISTS idx_photos_incident;
DROP INDEX IF EXISTS idx_photos_maintenance_record;
DROP INDEX IF EXISTS idx_photos_inspection;

ALTER TABLE photos
  DROP CONSTRAINT IF EXISTS chk_photos_un_solo_origen,
  DROP COLUMN IF EXISTS vista,
  DROP COLUMN IF EXISTS incident_id,
  DROP COLUMN IF EXISTS maintenance_record_id,
  DROP COLUMN IF EXISTS inspection_id;

DROP TRIGGER IF EXISTS trg_incidents_clear_reporter ON incidents;
DROP FUNCTION IF EXISTS fn_clear_incident_reporter();

DROP TABLE IF EXISTS incident_reporters;

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS chk_incidents_estado_incidencia;
ALTER TABLE incidents ALTER COLUMN estado_incidencia DROP DEFAULT;
ALTER TABLE incidents RENAME COLUMN estado_incidencia TO estado;
ALTER TABLE incidents ALTER COLUMN estado SET DEFAULT 'pendiente';

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS chk_incidents_origen_reporte;

ALTER TABLE incidents RENAME COLUMN fecha_actualizacion_estado TO fecha_actualizacion;
ALTER TABLE incidents RENAME COLUMN tipo_incidencia TO tipo;

ALTER TABLE incidents ALTER COLUMN tree_id DROP NOT NULL;

ALTER TABLE incidents
  DROP COLUMN IF EXISTS prioridad_municipal,
  DROP COLUMN IF EXISTS observaciones_revision,
  DROP COLUMN IF EXISTS resultado_revision,
  DROP COLUMN IF EXISTS revisado_por,
  DROP COLUMN IF EXISTS fecha_revision,
  DROP COLUMN IF EXISTS ubicacion,
  DROP COLUMN IF EXISTS fecha_reporte;
