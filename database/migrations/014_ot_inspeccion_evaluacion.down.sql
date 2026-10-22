-- =====================================================================
-- Reversión de 014_ot_inspeccion_evaluacion.sql
-- =====================================================================

DROP FUNCTION IF EXISTS fn_refresh_tree_current(UUID);

DROP TRIGGER IF EXISTS trg_maintenance_records_ot ON maintenance_records;
DROP FUNCTION IF EXISTS fn_check_maintenance_record_ot();
DROP INDEX IF EXISTS idx_maintenance_records_tree;
DROP INDEX IF EXISTS idx_maintenance_records_work_order;
DROP TABLE IF EXISTS maintenance_records;
DROP SEQUENCE IF EXISTS maintenance_records_codigo_seq;

DROP INDEX IF EXISTS idx_tree_assessments_tree;
DROP TABLE IF EXISTS tree_assessments;

DROP INDEX IF EXISTS idx_classification_adjustments_evaluation;
DROP TABLE IF EXISTS classification_adjustments;

DROP TRIGGER IF EXISTS trg_evaluations_updated_at ON evaluations;
DROP INDEX IF EXISTS idx_evaluations_tree;
DROP TABLE IF EXISTS evaluations;

DROP TRIGGER IF EXISTS trg_work_orders_completada ON work_orders;
DROP FUNCTION IF EXISTS fn_check_ot_completada();

DROP INDEX IF EXISTS idx_inspections_estado_registro;
DROP INDEX IF EXISTS idx_inspections_work_order;

DROP TRIGGER IF EXISTS trg_inspections_tree_coherente ON inspections;
DROP FUNCTION IF EXISTS fn_check_inspection_tree_coherente();

DROP TRIGGER IF EXISTS trg_inspections_anulacion ON inspections;
DROP FUNCTION IF EXISTS fn_check_inspection_anulacion();

ALTER TABLE inspections
  DROP CONSTRAINT IF EXISTS inspections_id_tree_id_key,
  DROP CONSTRAINT IF EXISTS chk_inspections_rule_version_formato,
  DROP CONSTRAINT IF EXISTS chk_inspections_justificacion_ajuste_fecha,
  DROP CONSTRAINT IF EXISTS chk_inspections_anulacion,
  DROP CONSTRAINT IF EXISTS chk_inspections_finalizada_at,
  DROP CONSTRAINT IF EXISTS chk_inspections_estado_registro;

ALTER TABLE inspections ALTER COLUMN estado_registro DROP DEFAULT;
ALTER TABLE inspections RENAME COLUMN estado_registro TO estado;
ALTER TABLE inspections
  ALTER COLUMN estado SET DEFAULT 'borrador',
  ADD CONSTRAINT inspections_estado_check CHECK (estado IN ('borrador', 'completada')),
  ADD CONSTRAINT inspections_check CHECK (
    (estado = 'borrador' AND finalizada_at IS NULL) OR (estado = 'completada' AND finalizada_at IS NOT NULL)
  );

ALTER TABLE inspections RENAME COLUMN finalizada_at TO completed_at;
ALTER TABLE inspections RENAME COLUMN inspector TO inspector_id;
ALTER TABLE inspections RENAME COLUMN fecha_inspeccion TO fecha;

ALTER TABLE inspections
  DROP COLUMN IF EXISTS fecha_anulacion,
  DROP COLUMN IF EXISTS anulado_por,
  DROP COLUMN IF EXISTS motivo_anulacion,
  DROP COLUMN IF EXISTS fecha_registro,
  DROP COLUMN IF EXISTS registrado_por,
  DROP COLUMN IF EXISTS observaciones,
  DROP COLUMN IF EXISTS fecha_ajuste_fecha,
  DROP COLUMN IF EXISTS ajuste_fecha_por,
  DROP COLUMN IF EXISTS justificacion_ajuste_fecha,
  DROP COLUMN IF EXISTS fecha_proximo_monitoreo,
  DROP COLUMN IF EXISTS fecha_proximo_monitoreo_sugerida,
  DROP COLUMN IF EXISTS fecha_proxima_inspeccion,
  DROP COLUMN IF EXISTS fecha_proxima_inspeccion_sugerida,
  DROP COLUMN IF EXISTS requiere_mantenimiento,
  DROP COLUMN IF EXISTS resultado_general,
  DROP COLUMN IF EXISTS metodo_instrumental,
  DROP COLUMN IF EXISTS subtipo_inspeccion,
  DROP COLUMN IF EXISTS tipo_inspeccion_realizada,
  DROP COLUMN IF EXISTS work_order_id,
  DROP COLUMN IF EXISTS codigo_inspeccion;

DROP SEQUENCE IF EXISTS inspections_codigo_seq;

DROP TRIGGER IF EXISTS trg_work_orders_revision_inspector ON work_orders;
DROP FUNCTION IF EXISTS fn_fix_requiere_revision_inspector();

DROP TRIGGER IF EXISTS trg_work_orders_codigo ON work_orders;
DROP FUNCTION IF EXISTS fn_set_work_order_codigo();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON work_orders;

DROP INDEX IF EXISTS idx_work_orders_estado;
DROP INDEX IF EXISTS idx_work_orders_tree;
DROP INDEX IF EXISTS idx_work_orders_project;
DROP TABLE IF EXISTS work_orders;

DROP SEQUENCE IF EXISTS work_orders_codigo_m_seq;
DROP SEQUENCE IF EXISTS work_orders_codigo_i_seq;
