-- ============================================================================
-- Migración 008 — Infraestructura (datos crudos), órdenes de trabajo e
-- incidencias: corte mínimo de demo. SOLO operaciones ADITIVAS.
-- ============================================================================
--
-- 1) tree_infrastructure_assessments (NUEVA). Registra las respuestas
--    observadas por componente (acera/vereda, calzada, alcorque,
--    infraestructura vertical, redes) con los nombres de campo de
--    DICCIONARIO_CAMPOS (REGISTRO_EVALUACION). NO guarda severidades ni
--    nivel global: M04 queda fuera de este corte ("Clasificación global
--    pendiente"). Mismo patrón 1:N y RLS que tree_risk_assessments (007).
--    No se reutiliza `infrastructure_conflicts` porque exige `severidad`,
--    que es un resultado de M04.
--
-- 2) maintenance (EXISTENTE, vacía). Se agregan columnas NULLABLE
--    `subtipo_accion` (LISTAS:subtipo_accion, CC-004) y `created_by`, y se
--    habilita RLS (antes estaba DESACTIVADA) con el mismo modelo que
--    tree_risk_assessments. `tipo_intervencion` guarda el código de
--    LISTAS:accion (tipo_ot = mantenimiento).
--
-- 3) incidents (EXISTENTE): sin cambios de estructura ni de RLS (ya tiene
--    políticas desde 005).
--
-- Sin DROP / DELETE / TRUNCATE / UPDATE de datos.
-- ============================================================================

-- ---------------------------------------------------------------------
-- 1. Evaluación de infraestructura (datos crudos)
-- ---------------------------------------------------------------------

CREATE TABLE tree_infrastructure_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id           UUID NOT NULL REFERENCES trees(id),
  fecha_evaluacion  DATE NOT NULL,
  variables         JSONB NOT NULL,
  observaciones     TEXT,
  created_by        UUID REFERENCES user_profiles(id) DEFAULT auth.uid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tree_infra_assessments_tree_id
  ON tree_infrastructure_assessments (tree_id, fecha_evaluacion DESC);

ALTER TABLE tree_infrastructure_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tree_infra_assessments_all_admin
  ON tree_infrastructure_assessments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY tree_infra_assessments_select_municipal
  ON tree_infrastructure_assessments FOR SELECT
  TO authenticated
  USING (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
  );

CREATE POLICY tree_infra_assessments_insert_municipal
  ON tree_infrastructure_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
    AND (created_by IS NULL OR created_by = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 2. Órdenes de trabajo de mantención
-- ---------------------------------------------------------------------

ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS subtipo_accion TEXT;
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id) DEFAULT auth.uid();

ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_all_admin
  ON maintenance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY maintenance_select_municipal
  ON maintenance FOR SELECT
  TO authenticated
  USING (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
  );

CREATE POLICY maintenance_insert_municipal
  ON maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id))
    AND (created_by IS NULL OR created_by = auth.uid())
  );
