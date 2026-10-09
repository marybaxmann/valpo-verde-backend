-- ============================================================================
-- Migración 011 — CC-022: Administrador con acceso de solo lectura a los datos
-- del proyecto; Usuario municipal actualiza estados de órdenes e incidencias.
-- (PR-003 v6.0, PR-004 v5.0, PR-009 v2.0). 2026-10-09.
-- ============================================================================
--
-- 1) El Administrador pasa de acceso total (FOR ALL) a solo lectura (SELECT)
--    en trees, tree_risk_assessments, tree_infrastructure_assessments,
--    maintenance e incidents. Se reemplazan las políticas *_all_admin:
--    se eliminan reglas de acceso, NO datos.
--    Se conservan: projects_all_admin y project_members_all_admin (gestión
--    de proyectos y miembros, PR-004 v5.0) y public_spaces_all_admin
--    (configuración del proyecto; sin uso en la interfaz actual).
-- 2) El Usuario municipal obtiene UPDATE sobre maintenance e incidents de los
--    proyectos donde es miembro (el backend solo actualiza estado y bitácora).
-- 3) fn_create_tree_with_measurement deja de aceptar al Administrador.
-- ============================================================================

-- 1) Administrador: solo lectura --------------------------------------------
DROP POLICY trees_all_admin ON public.trees;
CREATE POLICY trees_select_admin
  ON public.trees FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY tree_risk_assessments_all_admin ON public.tree_risk_assessments;
CREATE POLICY tree_risk_assessments_select_admin
  ON public.tree_risk_assessments FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY tree_infra_assessments_all_admin ON public.tree_infrastructure_assessments;
CREATE POLICY tree_infra_assessments_select_admin
  ON public.tree_infrastructure_assessments FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY maintenance_all_admin ON public.maintenance;
CREATE POLICY maintenance_select_admin
  ON public.maintenance FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY incidents_all_admin ON public.incidents;
CREATE POLICY incidents_select_admin
  ON public.incidents FOR SELECT TO authenticated
  USING (public.is_admin());

-- 2) Usuario municipal: actualización de estados ------------------------------
CREATE POLICY maintenance_update_municipal
  ON public.maintenance FOR UPDATE TO authenticated
  USING (public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id)))
  WITH CHECK (public.is_municipal_member((SELECT t.project_id FROM public.trees t WHERE t.id = tree_id)));

CREATE POLICY incidents_update_municipal
  ON public.incidents FOR UPDATE TO authenticated
  USING (public.is_municipal_member(project_id))
  WITH CHECK (public.is_municipal_member(project_id));

-- 3) Alta de árbol: solo Usuario municipal miembro ----------------------------
-- Se reemplaza únicamente la condición de autorización de la función vigente
-- (definida en 006); si la condición no se encuentra, la migración falla.
DO $$
DECLARE
  v_def text := pg_get_functiondef('public.fn_create_tree_with_measurement'::regproc);
  v_old text := 'IF NOT (public.is_admin() OR public.is_municipal_member(p_project_id)) THEN';
  v_new text := 'IF NOT public.is_municipal_member(p_project_id) THEN';
BEGIN
  IF position(v_old IN v_def) = 0 THEN
    RAISE EXCEPTION 'fn_create_tree_with_measurement: condición de autorización esperada no encontrada';
  END IF;
  EXECUTE replace(v_def, v_old, v_new);
END
$$;
