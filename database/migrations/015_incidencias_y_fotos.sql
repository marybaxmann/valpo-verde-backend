-- =====================================================================
-- Migración 015 — Incidencias y fotos
-- Diseño Fase 3 §3.12, §3.13, §7 paso 5; CC-036; PR-010 v4.0. Issue #41.
--
-- Aditiva: las columnas antiguas de `incidents` que el diseño retira
-- (reportado_por_user_id, observacion, actualizado_por, prioridad) NO
-- se eliminan aquí — eso es la migración 018. `photos.photo_type` y
-- `description` tampoco: el diseño no las lista para retiro explícito;
-- se dejan para una decisión aparte.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. incidents (adaptada; §3.12; D-174 a D-190)
-- ---------------------------------------------------------------------
ALTER TABLE incidents
  ADD COLUMN fecha_reporte DATE,
  ADD COLUMN ubicacion TEXT,  -- D-182: copia de ubicacion_descriptiva del árbol al reportar
  ADD COLUMN fecha_revision TIMESTAMPTZ,
  ADD COLUMN revisado_por UUID REFERENCES user_profiles(id),
  ADD COLUMN resultado_revision TEXT
    CHECK (resultado_revision IS NULL OR resultado_revision IN ('validada', 'descartada', 'requiere_antecedentes')),
  ADD COLUMN observaciones_revision TEXT,
  ADD COLUMN prioridad_municipal TEXT CHECK (prioridad_municipal IS NULL OR prioridad_municipal IN ('critica', 'alta', 'media', 'baja'));

-- tree_id NOT NULL: entrada siempre por QR (D-175; AMD-34). Tabla vacía.
ALTER TABLE incidents ALTER COLUMN tree_id SET NOT NULL;

ALTER TABLE incidents RENAME COLUMN tipo TO tipo_incidencia;
ALTER TABLE incidents RENAME COLUMN fecha_actualizacion TO fecha_actualizacion_estado;

-- origen_reporte: tighten a los 4 códigos del Excel (D-177). Columna
-- existente, sin CHECK hasta ahora.
ALTER TABLE incidents
  ADD CONSTRAINT chk_incidents_origen_reporte
    CHECK (origen_reporte IS NULL OR origen_reporte IN ('comunidad', 'municipalidad', 'bomberos', 'otro_organismo'));

-- estado -> estado_incidencia, con el vocabulario del Excel (D-184).
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_estado_check;
ALTER TABLE incidents RENAME COLUMN estado TO estado_incidencia;
ALTER TABLE incidents
  ALTER COLUMN estado_incidencia SET DEFAULT 'ingresada';
ALTER TABLE incidents
  ADD CONSTRAINT chk_incidents_estado_incidencia
    CHECK (estado_incidencia IN ('ingresada', 'en_revision', 'derivada', 'resuelta', 'descartada'));

-- ---------------------------------------------------------------------
-- 2. incident_reporters (nueva; datos personales, PR-022)
-- ---------------------------------------------------------------------
CREATE TABLE incident_reporters (
  incident_id      UUID PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
  nombre_reportante TEXT NOT NULL CHECK (char_length(nombre_reportante) <= 100),
  -- Formato (NN...N-D o NN...N-K); el dígito verificador se valida en
  -- el backend (Zod), no aquí.
  rut_reportante    TEXT NOT NULL CHECK (rut_reportante ~ '^[0-9]{1,8}-[0-9kK]$')
);

-- Al validar o descartar, se borra la fila (nombre y RUT). Con
-- "requiere_antecedentes" se conserva.
CREATE FUNCTION fn_clear_incident_reporter() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.resultado_revision IN ('validada', 'descartada') THEN
    DELETE FROM incident_reporters WHERE incident_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidents_clear_reporter
  AFTER UPDATE ON incidents
  FOR EACH ROW
  WHEN (NEW.resultado_revision IS DISTINCT FROM OLD.resultado_revision)
  EXECUTE FUNCTION fn_clear_incident_reporter();

-- ---------------------------------------------------------------------
-- 3. photos (adaptada; §3.13; D-27, D-183, D-206, D-224)
-- ---------------------------------------------------------------------
ALTER TABLE photos
  ADD COLUMN inspection_id UUID REFERENCES inspections(id),
  ADD COLUMN maintenance_record_id UUID REFERENCES maintenance_records(id),
  ADD COLUMN incident_id UUID REFERENCES incidents(id),
  ADD COLUMN vista TEXT CHECK (vista IS NULL OR vista IN ('arbol_completo', 'base', 'tronco', 'copa'));

ALTER TABLE photos
  ADD CONSTRAINT chk_photos_un_solo_origen
    CHECK (
      (CASE WHEN inspection_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN maintenance_record_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN incident_id IS NOT NULL THEN 1 ELSE 0 END)
      <= 1
    );

CREATE INDEX idx_photos_inspection ON photos (inspection_id);
CREATE INDEX idx_photos_maintenance_record ON photos (maintenance_record_id);
CREATE INDEX idx_photos_incident ON photos (incident_id);

-- Coherencia: si la foto se vincula a una inspección, mantención o
-- incidencia, debe ser del mismo árbol (photos.tree_id).
CREATE FUNCTION fn_check_photo_tree_coherente() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref_tree_id UUID;
BEGIN
  IF NEW.inspection_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM inspections WHERE id = NEW.inspection_id;
  ELSIF NEW.maintenance_record_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM maintenance_records WHERE id = NEW.maintenance_record_id;
  ELSIF NEW.incident_id IS NOT NULL THEN
    SELECT tree_id INTO v_ref_tree_id FROM incidents WHERE id = NEW.incident_id;
  ELSE
    RETURN NEW;
  END IF;
  IF v_ref_tree_id IS DISTINCT FROM NEW.tree_id THEN
    RAISE EXCEPTION 'photos.tree_id debe coincidir con el árbol de la inspección, mantención o incidencia vinculada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_photos_tree_coherente
  BEFORE INSERT OR UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION fn_check_photo_tree_coherente();
