-- =====================================================================
-- Reversión de 017_rls_cc033.sql
--
-- ADVERTENCIA: este archivo existe para probar la reversibilidad de la
-- migración (aplicar -> revertir -> reaplicar). Restaura literalmente
-- el estado previo, que era un hueco de seguridad real (RLS desactivada
-- en 8 tablas, anon/authenticated con privilegios por defecto). NUNCA
-- usar este .down.sql en un entorno compartido sin volver a aplicar de
-- inmediato una restricción equivalente a la 017.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vistas: quitar security_invoker y los GRANT/REVOKE explícitos
-- ---------------------------------------------------------------------
ALTER VIEW v_tree_presence           RESET (security_invoker);
ALTER VIEW v_inspections             RESET (security_invoker);
ALTER VIEW v_tree_current_inputs     RESET (security_invoker);
ALTER VIEW v_tree_current_assessment RESET (security_invoker);
ALTER VIEW v_species_traits          RESET (security_invoker);
ALTER VIEW v_upcoming_inspections    RESET (security_invoker);

-- ---------------------------------------------------------------------
-- 2. Triggers y funciones de proyecto cerrado
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_projects_self_closed ON projects;
DROP TRIGGER IF EXISTS trg_incident_reporters_proyecto_cerrado ON incident_reporters;
DROP TRIGGER IF EXISTS trg_classification_adjustments_proyecto_cerrado ON classification_adjustments;
DROP TRIGGER IF EXISTS trg_photos_proyecto_cerrado ON photos;
DROP TRIGGER IF EXISTS trg_maintenance_records_proyecto_cerrado ON maintenance_records;
DROP TRIGGER IF EXISTS trg_tree_assessments_proyecto_cerrado ON tree_assessments;
DROP TRIGGER IF EXISTS trg_evaluations_proyecto_cerrado ON evaluations;
DROP TRIGGER IF EXISTS trg_inspections_proyecto_cerrado ON inspections;
DROP TRIGGER IF EXISTS trg_tree_data_versions_proyecto_cerrado ON tree_data_versions;
DROP TRIGGER IF EXISTS trg_incidents_proyecto_cerrado ON incidents;
DROP TRIGGER IF EXISTS trg_work_orders_proyecto_cerrado ON work_orders;
DROP TRIGGER IF EXISTS trg_sectors_proyecto_cerrado ON sectors;
DROP TRIGGER IF EXISTS trg_trees_proyecto_cerrado ON trees;

DROP FUNCTION IF EXISTS fn_check_project_self_closed();
DROP FUNCTION IF EXISTS fn_check_proyecto_no_cerrado();
DROP FUNCTION IF EXISTS fn_resolve_project_id(jsonb, text);

-- ---------------------------------------------------------------------
-- 3. Policies nuevas: fuera. Policies viejas que esta migración quitó:
--    de vuelta, con su definición original (005/011).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS photos_select_project_roles ON photos;
DROP POLICY IF EXISTS photos_select_admin ON photos;
DROP POLICY IF EXISTS incident_reporters_select_municipal ON incident_reporters;
DROP POLICY IF EXISTS incidents_select_project_roles ON incidents;
DROP POLICY IF EXISTS incidents_select_admin ON incidents;
DROP POLICY IF EXISTS maintenance_records_select_project_roles ON maintenance_records;
DROP POLICY IF EXISTS maintenance_records_select_admin ON maintenance_records;
DROP POLICY IF EXISTS tree_assessments_select_project_roles ON tree_assessments;
DROP POLICY IF EXISTS tree_assessments_select_admin ON tree_assessments;
DROP POLICY IF EXISTS classification_adjustments_select_project_roles ON classification_adjustments;
DROP POLICY IF EXISTS classification_adjustments_select_admin ON classification_adjustments;
DROP POLICY IF EXISTS evaluations_select_project_roles ON evaluations;
DROP POLICY IF EXISTS evaluations_select_admin ON evaluations;
DROP POLICY IF EXISTS inspections_select_project_roles ON inspections;
DROP POLICY IF EXISTS inspections_select_admin ON inspections;
DROP POLICY IF EXISTS work_orders_select_project_roles ON work_orders;
DROP POLICY IF EXISTS work_orders_select_admin ON work_orders;
DROP POLICY IF EXISTS tree_data_versions_select_project_roles ON tree_data_versions;
DROP POLICY IF EXISTS tree_data_versions_select_admin ON tree_data_versions;
DROP POLICY IF EXISTS trees_select_project_roles ON trees;
DROP POLICY IF EXISTS trees_select_admin ON trees;
DROP POLICY IF EXISTS sectors_select_project_roles ON sectors;
DROP POLICY IF EXISTS sectors_select_admin ON sectors;
DROP POLICY IF EXISTS public_spaces_select_admin ON public_spaces;
DROP POLICY IF EXISTS project_members_select_own ON project_members;
DROP POLICY IF EXISTS project_members_select_admin ON project_members;
DROP POLICY IF EXISTS projects_select_project_roles ON projects;
DROP POLICY IF EXISTS projects_select_admin ON projects;

-- Restaurar las políticas que 017 quitó (definición de 005/011).
CREATE POLICY projects_all_admin
  ON projects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY projects_select_municipal
  ON projects FOR SELECT TO authenticated
  USING (public.is_municipal_member(id));

CREATE POLICY project_members_all_admin
  ON project_members FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY project_members_select_own_municipal
  ON project_members FOR SELECT TO authenticated
  USING (public.get_user_role() = 'usuario_municipal' AND user_id = auth.uid());

CREATE POLICY public_spaces_all_admin
  ON public_spaces FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY trees_select_admin
  ON trees FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY trees_select_municipal
  ON trees FOR SELECT TO authenticated
  USING (public.is_municipal_member(project_id));
CREATE POLICY trees_insert_municipal
  ON trees FOR INSERT TO authenticated
  WITH CHECK (public.is_municipal_member(project_id));
CREATE POLICY trees_update_municipal
  ON trees FOR UPDATE TO authenticated
  USING (public.is_municipal_member(project_id)) WITH CHECK (public.is_municipal_member(project_id));

CREATE POLICY incidents_select_admin
  ON incidents FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY incidents_select_municipal
  ON incidents FOR SELECT TO authenticated
  USING (public.is_municipal_member(project_id));
CREATE POLICY incidents_insert_municipal
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (public.is_municipal_member(project_id));
CREATE POLICY incidents_update_municipal
  ON incidents FOR UPDATE TO authenticated
  USING (public.is_municipal_member(project_id)) WITH CHECK (public.is_municipal_member(project_id));

CREATE POLICY maintenance_insert_municipal
  ON maintenance FOR INSERT TO authenticated
  WITH CHECK (
    public.is_municipal_member((SELECT t.project_id FROM trees t WHERE t.id = maintenance.tree_id))
    AND (created_by IS NULL OR created_by = auth.uid())
  );
CREATE POLICY maintenance_update_municipal
  ON maintenance FOR UPDATE TO authenticated
  USING (public.is_municipal_member((SELECT t.project_id FROM trees t WHERE t.id = maintenance.tree_id)))
  WITH CHECK (public.is_municipal_member((SELECT t.project_id FROM trees t WHERE t.id = maintenance.tree_id)));

CREATE POLICY tree_risk_assessments_insert_municipal
  ON tree_risk_assessments FOR INSERT TO authenticated
  WITH CHECK (public.is_municipal_member((SELECT t.project_id FROM trees t WHERE t.id = tree_risk_assessments.tree_id)));

CREATE POLICY tree_infra_assessments_insert_municipal
  ON tree_infrastructure_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_municipal_member((SELECT t.project_id FROM trees t WHERE t.id = tree_infrastructure_assessments.tree_id))
    AND (created_by IS NULL OR created_by = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. RLS: las 8 tablas que esta migración activó, vuelven a OFF
--    (su estado real antes de la 017 — no "on sin políticas").
-- ---------------------------------------------------------------------
ALTER TABLE sectors                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE tree_data_versions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders                DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations                DISABLE ROW LEVEL SECURITY;
ALTER TABLE classification_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tree_assessments            DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records        DISABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reporters         DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. Funciones: restaurar los GRANT previos (anon también, como estaba)
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_municipal_member(uuid) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.has_project_role(uuid, text[]);

GRANT EXECUTE ON FUNCTION public.fn_create_tree_with_measurement(uuid, uuid, uuid, text, text, text, double precision, double precision, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_refresh_tree_current(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_next_codigo_usuario() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_set_work_order_codigo() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fix_requiere_revision_inspector() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_inspection_anulacion() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_inspection_tree_coherente() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_ot_completada() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_maintenance_record_ot() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_clear_incident_reporter() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_photo_tree_coherente() TO PUBLIC;

-- ---------------------------------------------------------------------
-- 6. GRANT de tabla/secuencia/esquema: restaurar lo revocado
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO anon, authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
