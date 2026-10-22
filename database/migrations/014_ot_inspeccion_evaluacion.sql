-- =====================================================================
-- Migración 014 — Órdenes de trabajo, inspección, evaluación y
-- mantenimiento
-- Diseño Fase 3 §3.6–§3.11, §5.1, §5.2, §7 paso 4; CC-031; CC-040.
-- Issue #40.
--
-- Aditiva sobre `inspections` (se reutiliza, no se recrea). work_orders,
-- evaluations, classification_adjustments, tree_assessments y
-- maintenance_records son nuevas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. work_orders (nueva): ORDENES DE TRABAJO (§3.7; D-231 a D-246)
-- ---------------------------------------------------------------------
CREATE SEQUENCE work_orders_codigo_i_seq START 1;
CREATE SEQUENCE work_orders_codigo_m_seq START 1;

CREATE TABLE work_orders (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ot                     TEXT UNIQUE,  -- lo asigna el trigger según tipo_ot
  project_id                    UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  tree_id                       UUID REFERENCES trees(id),  -- NULL solo si accion_solicitada = levantamiento
  incident_id                   UUID REFERENCES incidents(id),
  tipo_ot                       TEXT NOT NULL CHECK (tipo_ot IN ('inspeccion', 'mantenimiento')),
  accion_solicitada             TEXT NOT NULL,
  subtipo_accion                TEXT,
  motivo                        TEXT,
  prioridad                     TEXT CHECK (prioridad IS NULL OR prioridad IN ('critica', 'alta', 'media', 'baja')),
  estado_ot                     TEXT NOT NULL DEFAULT 'pendiente'
                                   CHECK (estado_ot IN ('pendiente', 'programada', 'en_ejecucion', 'completada', 'cancelada')),
  fecha_creacion_ot             DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_accion_programada       DATE,
  fecha_completada_ot           DATE,
  ot_creado_por                 UUID REFERENCES user_profiles(id),
  responsable_accion_id         UUID REFERENCES user_profiles(id),
  requiere_revision_inspector   BOOLEAN,  -- solo Mantenimiento; el trigger lo fija en Tala/Retiro_tocón
  observaciones                 TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_work_orders_tree_levantamiento
    CHECK ((tree_id IS NULL) = (accion_solicitada = 'levantamiento')),
  CONSTRAINT chk_work_orders_completada_fecha
    CHECK ((estado_ot = 'completada') = (fecha_completada_ot IS NOT NULL))
);

CREATE INDEX idx_work_orders_project ON work_orders (project_id);
CREATE INDEX idx_work_orders_tree ON work_orders (tree_id);
CREATE INDEX idx_work_orders_estado ON work_orders (estado_ot);

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Código por tipo (OT-I-000000 / OT-M-000000, D-231).
CREATE FUNCTION fn_set_work_order_codigo() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo_ot IS NULL THEN
    IF NEW.tipo_ot = 'inspeccion' THEN
      NEW.codigo_ot := 'OT-I-' || LPAD(nextval('work_orders_codigo_i_seq')::text, 6, '0');
    ELSE
      NEW.codigo_ot := 'OT-M-' || LPAD(nextval('work_orders_codigo_m_seq')::text, 6, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_codigo
  BEFORE INSERT ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_work_order_codigo();

-- requiere_revision_inspector fijo para Tala y Retiro_tocón (§5.2; AMD-20).
CREATE FUNCTION fn_fix_requiere_revision_inspector() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subtipo_accion IN ('tala', 'retiro_tocon') THEN
    NEW.requiere_revision_inspector := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_revision_inspector
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_fix_requiere_revision_inspector();

-- ---------------------------------------------------------------------
-- 2. inspections (reutilizada): INSPECCION (§3.8; D-191 a D-212)
-- ---------------------------------------------------------------------
CREATE SEQUENCE inspections_codigo_seq START 1;

ALTER TABLE inspections
  ADD COLUMN codigo_inspeccion TEXT UNIQUE DEFAULT ('INS-' || LPAD(nextval('inspections_codigo_seq')::text, 6, '0')),
  ADD COLUMN work_order_id UUID REFERENCES work_orders(id),
  ADD COLUMN tipo_inspeccion_realizada TEXT,
  ADD COLUMN subtipo_inspeccion TEXT,
  ADD COLUMN metodo_instrumental TEXT,
  ADD COLUMN resultado_general TEXT,
  ADD COLUMN requiere_mantenimiento BOOLEAN,
  ADD COLUMN fecha_proxima_inspeccion_sugerida DATE,
  ADD COLUMN fecha_proxima_inspeccion DATE,
  ADD COLUMN fecha_proximo_monitoreo_sugerida DATE,
  ADD COLUMN fecha_proximo_monitoreo DATE,
  ADD COLUMN justificacion_ajuste_fecha TEXT,
  ADD COLUMN ajuste_fecha_por UUID REFERENCES user_profiles(id),
  ADD COLUMN fecha_ajuste_fecha TIMESTAMPTZ,
  ADD COLUMN observaciones TEXT,
  ADD COLUMN registrado_por UUID REFERENCES user_profiles(id),
  ADD COLUMN fecha_registro DATE,
  ADD COLUMN motivo_anulacion TEXT,
  ADD COLUMN anulado_por UUID REFERENCES user_profiles(id),
  ADD COLUMN fecha_anulacion TIMESTAMPTZ;

-- Tabla vacía (paso 1): fijar NOT NULL en work_order_id ahora.
ALTER TABLE inspections ALTER COLUMN work_order_id SET NOT NULL;

ALTER TABLE inspections RENAME COLUMN fecha TO fecha_inspeccion;
ALTER TABLE inspections RENAME COLUMN inspector_id TO inspector;
ALTER TABLE inspections RENAME COLUMN completed_at TO finalizada_at;

-- estado -> estado_registro, con el vocabulario nuevo (D-209; CC-031).
-- Se retiran los dos CHECK del vocabulario anterior (borrador/completada):
-- el de la columna y el compuesto con completed_at.
ALTER TABLE inspections
  DROP CONSTRAINT inspections_estado_check,
  DROP CONSTRAINT inspections_check;
ALTER TABLE inspections RENAME COLUMN estado TO estado_registro;
ALTER TABLE inspections
  ALTER COLUMN estado_registro SET DEFAULT 'preguardado';
ALTER TABLE inspections
  ADD CONSTRAINT chk_inspections_estado_registro
    CHECK (estado_registro IN ('preguardado', 'finalizado', 'anulado')),
  ADD CONSTRAINT chk_inspections_finalizada_at
    CHECK ((estado_registro = 'finalizado') = (finalizada_at IS NOT NULL) OR estado_registro = 'anulado'),
  ADD CONSTRAINT chk_inspections_anulacion
    CHECK (
      (estado_registro = 'anulado' AND motivo_anulacion IS NOT NULL AND anulado_por IS NOT NULL AND fecha_anulacion IS NOT NULL)
      OR
      (estado_registro <> 'anulado' AND motivo_anulacion IS NULL AND anulado_por IS NULL AND fecha_anulacion IS NULL)
    ),
  ADD CONSTRAINT chk_inspections_justificacion_ajuste_fecha
    CHECK (
      justificacion_ajuste_fecha IS NOT NULL
      OR (fecha_proxima_inspeccion IS NULL OR fecha_proxima_inspeccion_sugerida IS NULL OR fecha_proxima_inspeccion = fecha_proxima_inspeccion_sugerida)
      AND (fecha_proximo_monitoreo IS NULL OR fecha_proximo_monitoreo_sugerida IS NULL OR fecha_proximo_monitoreo = fecha_proximo_monitoreo_sugerida)
    ),
  ADD CONSTRAINT chk_inspections_rule_version_formato
    CHECK (rule_version ~ '^[0-9]+\.[0-9]+$');

-- anulado solo desde finalizado (CC-031): requiere ver el estado anterior.
CREATE FUNCTION fn_check_inspection_anulacion() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_registro = 'anulado' AND OLD.estado_registro <> 'finalizado' THEN
    RAISE EXCEPTION 'Una inspección solo puede anularse desde finalizado (actual: %)', OLD.estado_registro;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inspections_anulacion
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  WHEN (NEW.estado_registro = 'anulado' AND OLD.estado_registro IS DISTINCT FROM NEW.estado_registro)
  EXECUTE FUNCTION fn_check_inspection_anulacion();

CREATE INDEX idx_inspections_work_order ON inspections (work_order_id);
CREATE INDEX idx_inspections_estado_registro ON inspections (estado_registro);

-- OT no completada con inspecciones preguardadas (§5.2; D-239).
CREATE FUNCTION fn_check_ot_completada() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_ot = 'completada' AND EXISTS (
    SELECT 1 FROM inspections WHERE work_order_id = NEW.id AND estado_registro = 'preguardado'
  ) THEN
    RAISE EXCEPTION 'La OT % tiene inspecciones en preguardado: no puede completarse', NEW.codigo_ot;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_completada
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  WHEN (NEW.estado_ot = 'completada' AND OLD.estado_ot IS DISTINCT FROM NEW.estado_ot)
  EXECUTE FUNCTION fn_check_ot_completada();

-- ---------------------------------------------------------------------
-- 3. evaluations (nueva): REGISTRO_EVALUACION y resultados (§3.9)
-- ---------------------------------------------------------------------
CREATE TABLE evaluations (
  id                                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id                           UUID NOT NULL UNIQUE REFERENCES inspections(id) ON DELETE RESTRICT,
  tree_id                                 UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  variables                               JSONB NOT NULL,
  variables_calculo                       JSONB NOT NULL,
  calculados                              JSONB,
  indicadores                             JSONB,
  puntaje_raices_cuello                   INTEGER CHECK (puntaje_raices_cuello IS NULL OR (puntaje_raices_cuello >= 0 AND puntaje_raices_cuello <= 9)),
  probabilidad_falla_raices_cuello        TEXT CHECK (probabilidad_falla_raices_cuello IS NULL OR probabilidad_falla_raices_cuello IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  puntaje_tronco                          INTEGER CHECK (puntaje_tronco IS NULL OR (puntaje_tronco >= 0 AND puntaje_tronco <= 14)),
  probabilidad_falla_tronco                TEXT CHECK (probabilidad_falla_tronco IS NULL OR probabilidad_falla_tronco IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  puntaje_copa_ramas                       INTEGER CHECK (puntaje_copa_ramas IS NULL OR (puntaje_copa_ramas >= 0 AND puntaje_copa_ramas <= 8)),
  probabilidad_falla_copa_ramas            TEXT CHECK (probabilidad_falla_copa_ramas IS NULL OR probabilidad_falla_copa_ramas IN ('Improbable', 'Posible', 'Probable', 'Inminente')),
  probabilidad_impacto                     TEXT,
  clasificacion_raices_cuello              TEXT,
  clasificacion_tronco                     TEXT,
  clasificacion_copa_ramas                 TEXT,
  clasificacion_riesgo_calculada           TEXT,
  puntaje_infraestructura                  NUMERIC,
  pct_infraestructura                      NUMERIC,
  clasificacion_infraestructura_calculada  TEXT,
  clasificacion_prioridad_calculada        TEXT,
  clasificacion_riesgo_ajustada             TEXT,
  clasificacion_infraestructura_ajustada   TEXT,
  clasificacion_prioridad_ajustada         TEXT,
  rule_version                             TEXT NOT NULL CHECK (rule_version ~ '^[0-9]+\.[0-9]+$'),
  motor_commit                             TEXT NOT NULL,
  calculado_at                             TIMESTAMPTZ,
  created_at                               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evaluations_tree ON evaluations (tree_id, created_at DESC);

CREATE TRIGGER trg_evaluations_updated_at
  BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 4. classification_adjustments (nueva): historial de ajustes (§3.10)
-- ---------------------------------------------------------------------
CREATE TABLE classification_adjustments (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id                  UUID NOT NULL REFERENCES evaluations(id) ON DELETE RESTRICT,
  campo                          TEXT NOT NULL CHECK (campo IN ('clasificacion_riesgo', 'clasificacion_infraestructura', 'clasificacion_prioridad')),
  valor_calculado                TEXT,
  valor_ajustado                 TEXT NOT NULL,
  justificacion_ajuste_clasificacion TEXT NOT NULL,
  ajustado_por                   UUID NOT NULL REFERENCES user_profiles(id),
  fecha_ajuste                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_version                   TEXT CHECK (rule_version IS NULL OR rule_version ~ '^[0-9]+\.[0-9]+$')
);

CREATE INDEX idx_classification_adjustments_evaluation ON classification_adjustments (evaluation_id);

-- ---------------------------------------------------------------------
-- 5. tree_assessments (nueva): evaluación vigente recalculada (§3.10 bis)
-- ---------------------------------------------------------------------
CREATE TABLE tree_assessments (
  id                                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                                  UUID NOT NULL REFERENCES trees(id) ON DELETE RESTRICT,
  evento                                   TEXT NOT NULL CHECK (evento IN ('ot_completada', 'inspeccion_anulada')),
  work_order_id                            UUID REFERENCES work_orders(id),
  inspection_id                            UUID REFERENCES inspections(id),
  entradas_vigentes                        JSONB NOT NULL,
  calculados                               JSONB,
  indicadores                              JSONB,
  puntaje_raices_cuello                    INTEGER,
  probabilidad_falla_raices_cuello         TEXT,
  puntaje_tronco                           INTEGER,
  probabilidad_falla_tronco                TEXT,
  puntaje_copa_ramas                       INTEGER,
  probabilidad_falla_copa_ramas            TEXT,
  probabilidad_impacto                     TEXT,
  clasificacion_raices_cuello              TEXT,
  clasificacion_tronco                     TEXT,
  clasificacion_copa_ramas                 TEXT,
  clasificacion_riesgo_calculada           TEXT,
  puntaje_infraestructura                  NUMERIC,
  pct_infraestructura                      NUMERIC,
  clasificacion_infraestructura_calculada  TEXT,
  clasificacion_prioridad_calculada        TEXT,
  clasificacion_riesgo_ajustada            TEXT,
  clasificacion_infraestructura_ajustada   TEXT,
  clasificacion_prioridad_ajustada         TEXT,
  adjustment_ids                           UUID[],
  ajustes_descartados                      JSONB,
  requiere_revision_ajuste                 BOOLEAN NOT NULL DEFAULT false,
  rule_version                             TEXT NOT NULL CHECK (rule_version ~ '^[0-9]+\.[0-9]+$'),
  motor_commit                             TEXT NOT NULL,
  created_at                               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo se agregan filas (§3.10 bis); la más reciente por árbol es la
-- evaluación vigente.
CREATE INDEX idx_tree_assessments_tree ON tree_assessments (tree_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 6. maintenance_records (nueva): MANTENIMIENTO (§3.11; D-213 a D-230)
-- ---------------------------------------------------------------------
CREATE SEQUENCE maintenance_records_codigo_seq START 1;

CREATE TABLE maintenance_records (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_mantenimiento         TEXT UNIQUE DEFAULT ('MAN-' || LPAD(nextval('maintenance_records_codigo_seq')::text, 6, '0')),
  work_order_id                UUID NOT NULL REFERENCES work_orders(id),
  tree_id                      UUID NOT NULL REFERENCES trees(id),
  fecha_ejecucion               DATE NOT NULL,
  ejecutado_por                 UUID REFERENCES user_profiles(id),
  accion_ejecutada               TEXT NOT NULL,
  subtipo_ejecutado                TEXT,
  resultado                        TEXT NOT NULL CHECK (resultado IN ('ejecutado_completamente', 'ejecutado_parcialmente', 'no_ejecutado')),
  observaciones                       TEXT,
  requiere_seguimiento                   BOOLEAN,
  fecha_seguimiento                         DATE,
  estado_revision                              TEXT CHECK (estado_revision IS NULL OR estado_revision IN ('pendiente_revision', 'aprobado', 'rechazado')),
  revisado_por                                    UUID REFERENCES user_profiles(id),
  fecha_revision                                     TIMESTAMPTZ,
  observaciones_revision                                TEXT,
  requiere_correccion                                      BOOLEAN,
  fecha_limite_correccion                                     DATE,
  created_at                                                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_records_work_order ON maintenance_records (work_order_id);
CREATE INDEX idx_maintenance_records_tree ON maintenance_records (tree_id);

-- ---------------------------------------------------------------------
-- 7. fn_refresh_tree_current (§5.1) — única vía de escritura de los
--    valores vigentes de trees. Depende de work_orders e inspections
--    (de aquí), por eso se crea en esta migración y no en la 013.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_refresh_tree_current(p_tree_id UUID) RETURNS void AS $$
BEGIN
  WITH validas AS (
    SELECT tdv.*
    FROM tree_data_versions tdv
    JOIN inspections i ON i.id = tdv.inspection_id
    JOIN work_orders wo ON wo.id = i.work_order_id
    WHERE tdv.tree_id = p_tree_id
      AND i.estado_registro <> 'anulado'
      AND wo.estado_ot = 'completada'
    ORDER BY wo.fecha_completada_ot DESC, tdv.created_at DESC
  ),
  alta AS (
    SELECT * FROM tree_data_versions WHERE tree_id = p_tree_id AND inspection_id IS NULL
  )
  UPDATE trees t SET
    sector = COALESCE((SELECT v.sector FROM validas v WHERE 'sector' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.sector FROM alta a)),
    ubicacion_descriptiva = COALESCE((SELECT v.ubicacion_descriptiva FROM validas v WHERE 'ubicacion_descriptiva' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.ubicacion_descriptiva FROM alta a)),
    utm_este = COALESCE((SELECT v.utm_este FROM validas v WHERE 'utm_este' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.utm_este FROM alta a)),
    utm_norte = COALESCE((SELECT v.utm_norte FROM validas v WHERE 'utm_norte' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.utm_norte FROM alta a)),
    especie_cientifica = COALESCE((SELECT v.especie_cientifica FROM validas v WHERE 'especie_cientifica' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.especie_cientifica FROM alta a)),
    nombre_comun = COALESCE((SELECT v.nombre_comun FROM validas v WHERE 'nombre_comun' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.nombre_comun FROM alta a)),
    multifustal = COALESCE((SELECT v.multifustal FROM validas v WHERE 'multifustal' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.multifustal FROM alta a)),
    numero_fustes = COALESCE((SELECT v.numero_fustes FROM validas v WHERE 'numero_fustes' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.numero_fustes FROM alta a)),
    dap_fustes_cm = COALESCE((SELECT v.dap_fustes_cm FROM validas v WHERE 'dap_fustes_cm' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.dap_fustes_cm FROM alta a)),
    dap_cm = COALESCE((SELECT v.dap_cm FROM validas v WHERE 'dap_cm' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.dap_cm FROM alta a)),
    altura_total_m = COALESCE((SELECT v.altura_total_m FROM validas v WHERE 'altura_total_m' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.altura_total_m FROM alta a)),
    diametro_copa_ns_m = COALESCE((SELECT v.diametro_copa_ns_m FROM validas v WHERE 'diametro_copa_ns_m' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.diametro_copa_ns_m FROM alta a)),
    diametro_copa_eo_m = COALESCE((SELECT v.diametro_copa_eo_m FROM validas v WHERE 'diametro_copa_eo_m' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.diametro_copa_eo_m FROM alta a)),
    copa_no_presenta = COALESCE((SELECT v.copa_no_presenta FROM validas v WHERE 'copa_no_presenta' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.copa_no_presenta FROM alta a)),
    altura_primera_rama_m = COALESCE((SELECT v.altura_primera_rama_m FROM validas v WHERE 'altura_primera_rama_m' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.altura_primera_rama_m FROM alta a)),
    altura_primera_rama_no_presenta = COALESCE((SELECT v.altura_primera_rama_no_presenta FROM validas v WHERE 'altura_primera_rama_no_presenta' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.altura_primera_rama_no_presenta FROM alta a)),
    altura_base_copa_viva_m = COALESCE((SELECT v.altura_base_copa_viva_m FROM validas v WHERE 'altura_base_copa_viva_m' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.altura_base_copa_viva_m FROM alta a)),
    altura_base_copa_viva_no_presenta = COALESCE((SELECT v.altura_base_copa_viva_no_presenta FROM validas v WHERE 'altura_base_copa_viva_no_presenta' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.altura_base_copa_viva_no_presenta FROM alta a)),
    clase_edad = COALESCE((SELECT v.clase_edad FROM validas v WHERE 'clase_edad' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.clase_edad FROM alta a)),
    rango_edad_estimada_anios = COALESCE((SELECT v.rango_edad_estimada_anios FROM validas v WHERE 'rango_edad_estimada_anios' = ANY(v.campos_registrados) LIMIT 1), (SELECT a.rango_edad_estimada_anios FROM alta a)),
    vigente_desde_inspection_id = (SELECT v.inspection_id FROM validas v LIMIT 1)
  WHERE t.id = p_tree_id;
END;
$$ LANGUAGE plpgsql;
